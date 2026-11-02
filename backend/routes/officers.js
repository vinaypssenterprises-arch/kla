const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware, adminMiddleware } = require('./auth');
const { requireModule } = require('../modulePermissions');

const invalidateOfficerCaches = async () => {
  try {
    await Promise.all([
      redisClient.delPattern('officers:'),
      redisClient.delPattern('analytics:')
    ]);
  } catch (e) {
    // ignore
  }
};

// Tenure = time since the officer's reporting date at the current posting
const TENURE_BUCKETS = [
  { key: 'lt1', label: 'Under 1 yr' },
  { key: '1to2', label: '1–2 yrs' },
  { key: '2to3', label: '2–3 yrs' },
  { key: '3plus', label: '3+ yrs' },
  { key: 'na', label: 'Not recorded' }
];
const LONG_TENURE_YEARS = 3;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const getTenureYears = (reportingDate, nowMs) => {
  if (!reportingDate) return null;
  const t = new Date(reportingDate).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, (nowMs - t) / MS_PER_YEAR);
};

const getTenureBucket = (years) => {
  if (years === null) return 'na';
  if (years < 1) return 'lt1';
  if (years < 2) return '1to2';
  if (years < LONG_TENURE_YEARS) return '2to3';
  return '3plus';
};

// Designations are recorded as post names ("Police Inspector-2 Mysore", "I/C Deputy Superintendent of Police-2 Belagavi"),
// so the rank/cadre is derived from the text. Listed in seniority order; first match wins.
const OFFICER_RANKS = [
  { key: 'SP', weight: 1, label: 'Superintendent of Police', short: 'SP', test: d => (/\bsuperintendent of police\b/.test(d) || /\bsp\b/.test(d)) && !/\b(deputy|additional|addl\.?|assistant|asst\.?)\s*(superintendent|sp)/.test(d) },
  { key: 'ADDL_SP', weight: 2, label: 'Additional Superintendent of Police', short: 'Addl. SP', test: d => /\b(additional|addl\.?)\s*(superintendent|sp)\b/.test(d) },
  { key: 'DYSP', weight: 3, label: 'Deputy Superintendent of Police', short: 'DySP', test: d => /\bdeputy superintendent\b|\bdysp\b|\bdy\.?\s*sp\b/.test(d) },
  { key: 'PI', weight: 4, label: 'Police Inspector', short: 'PI', test: d => (/\bpolice inspector\b|\binspector of police\b|\bpi\b/.test(d)) && !/\bsub/.test(d) },
  { key: 'PSI', weight: 5, label: 'Police Sub-Inspector', short: 'PSI', test: d => /\bsub[- ]?inspector\b|\bpsi\b/.test(d) && !/\bassistant\b/.test(d) },
  { key: 'ASI', weight: 6, label: 'Assistant Sub-Inspector', short: 'ASI', test: d => /\bassistant sub[- ]?inspector\b|\basi\b/.test(d) },
  { key: 'HC', weight: 7, label: 'Head Constable', short: 'HC', test: d => /\bhead constable\b|\bhc\b/.test(d) },
  { key: 'PC', weight: 8, label: 'Police Constable', short: 'PC', test: d => /\bconstable\b|\bpc\b/.test(d) }
];
const OTHER_RANK = { key: 'OTHER', weight: 9, label: 'Other Designations', short: 'Other' };
const IN_CHARGE_REGEX = /^\s*(i\/c|incharge|in-charge|in charge)\b/i;

const getOfficerRank = (designation) => {
  const d = (designation || '').toLowerCase();
  return OFFICER_RANKS.find(r => r.test(d)) || OTHER_RANK;
};

const compareDesignationsByRank = (desigA, desigB) => {
  const rankA = getOfficerRank(desigA).weight;
  const rankB = getOfficerRank(desigB).weight;
  if (rankA !== rankB) return rankA - rankB;
  return (desigA || '').localeCompare(desigB || '', undefined, { numeric: true, sensitivity: 'base' });
};

const compareOfficersByRank = (a, b) => {
  const distA = a.district?.name || '';
  const distB = b.district?.name || '';
  const distDiff = distA.localeCompare(distB, undefined, { sensitivity: 'base' });
  if (distDiff !== 0) return distDiff;

  const rankA = getOfficerRank(a.designation).weight;
  const rankB = getOfficerRank(b.designation).weight;
  if (rankA !== rankB) return rankA - rankB;

  const desigDiff = (a.designation || '').localeCompare(b.designation || '', undefined, { numeric: true, sensitivity: 'base' });
  if (desigDiff !== 0) return desigDiff;

  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
};

// Unfilled posts are entered with empty name or "Vacant"
const VACANT_NAME_PREFIX = 'vacant';
const isVacantPost = (o) =>
  o.workingStatus === 'Vacant' ||
  !(o.name || '').trim() ||
  (o.name || '').trim().toLowerCase().startsWith(VACANT_NAME_PREFIX);

const COMPLETENESS_FIELDS = ['mobile', 'reportingDate', 'presentAddress', 'permanentAddress', 'previousPlaces'];

const getMissingFields = (o) => {
  const missing = [];
  if (!o.mobile) missing.push('mobile');
  if (!o.reportingDate) missing.push('reportingDate');
  if (!o.presentAddress) missing.push('presentAddress');
  if (!o.permanentAddress) missing.push('permanentAddress');
  if (!o._count?.previousPlaces) missing.push('previousPlaces');
  return missing;
};

const MOBILE_REGEX = /^[6-9]\d{9}$/;

// All officer routes require authentication
router.use(authMiddleware);

// Officers module access. The petition form also lists officers for its SIR / PE officer
// pickers, so Petitions users may read that list in select mode (minimal fields only).
const isSelectList = (req) => req.method === 'GET' && req.path === '/' && req.query.forSelect === 'true';
router.use((req, res, next) =>
  requireModule(...(isSelectList(req) ? ['officers', 'petitions'] : ['officers']))(req, res, next)
);
const officerSelectFields = {
  id: true,
  name: true,
  designation: true,
  workingStatus: true,
  districtId: true,
  isActive: true,
  district: { select: { id: true, name: true } }
};

// Admin and regular "user" roles can create/edit; "viewer" is read-only
const canWrite = (req, res, next) => {
  if (!['admin', 'user'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to modify officer records' });
  }
  next();
};

const officerInclude = {
  district: true,
  previousPlaces: { orderBy: { createdAt: 'asc' } }
};

const sanitizePreviousPlaces = (previousPlaces) =>
  (previousPlaces || [])
    .filter(p => p && (
      (p.designation && String(p.designation).trim()) ||
      (p.policeStation && String(p.policeStation).trim()) ||
      (p.district && String(p.district).trim()) ||
      (p.place && String(p.place).trim()) ||
      p.fromDate || p.toDate
    ))
    .map(p => {
      const desig = p.designation && String(p.designation).trim() ? String(p.designation).trim() : null;
      const ps = p.policeStation && String(p.policeStation).trim() ? String(p.policeStation).trim() : null;
      const dist = p.district && String(p.district).trim() ? String(p.district).trim() : null;
      const placeText = p.place && String(p.place).trim()
        ? String(p.place).trim()
        : [desig, ps, dist].filter(Boolean).join(', ');

      const fromD = p.fromDate ? new Date(p.fromDate) : null;
      const toD = p.toDate ? new Date(p.toDate) : null;
      const fromY = p.fromYear ? String(p.fromYear).trim() : (fromD && !isNaN(fromD.getTime()) ? String(fromD.getFullYear()) : null);
      const toY = p.toYear ? String(p.toYear).trim() : (toD && !isNaN(toD.getTime()) ? String(toD.getFullYear()) : null);

      return {
        designation: desig,
        policeStation: ps,
        district: dist,
        fromDate: fromD && !isNaN(fromD.getTime()) ? fromD : null,
        toDate: toD && !isNaN(toD.getTime()) ? toD : null,
        place: placeText || '—',
        fromYear: fromY,
        toYear: toY
      };
    });

const validateOfficerPayload = (data, { partial = false } = {}) => {
  const isVacant = data.workingStatus === 'Vacant';
  if (isVacant) {
    if (data.name && String(data.name).trim() && String(data.name).trim().toLowerCase() !== 'vacant') {
      return 'Officer name must be empty when status is Vacant.';
    }
  } else {
    if (!data.name || !String(data.name).trim() || String(data.name).trim().toLowerCase() === 'vacant') {
      return 'Officer name is required when status is Working.';
    }
  }

  const required = ['districtId', 'designation'];
  if (!partial) {
    for (const field of required) {
      if (!data[field] || !String(data[field]).trim()) {
        return `${field} is required`;
      }
    }
  }
  if (data.mobile && data.mobile.trim() && !MOBILE_REGEX.test(data.mobile.trim())) {
    return 'Mobile number must be a valid 10-digit Indian mobile number';
  }
  if (data.personalMobile && data.personalMobile.trim() && !MOBILE_REGEX.test(data.personalMobile.trim())) {
    return 'Personal mobile number must be a valid 10-digit Indian mobile number';
  }
  return null;
};

// List officers — search, district/designation filters, sorting, server-side pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 10, 1), 100);
    const search = (req.query.search || '').trim();
    const districtId = req.query.districtId || undefined;
    const designation = req.query.designation || undefined;
    const rank = req.query.rank || undefined;

    const sortableFields = ['name', 'designation', 'reportingDate', 'createdAt'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictId = req.user.districtId;

    let effectiveDistrictId = districtId;
    if (!isGlobalUser) {
      if (!userDistrictId) {
        return res.status(403).json({ error: 'Access denied: User is not assigned to any district or Head Office' });
      }
      effectiveDistrictId = userDistrictId;
    }

    const where = {
      isActive: true,
      ...(effectiveDistrictId ? { districtId: effectiveDistrictId } : {}),
      ...(designation ? { designation } : {}),
      ...(req.query.postStatus === 'vacant' ? {
        OR: [
          { workingStatus: 'Vacant' },
          { name: '' },
          { name: { startsWith: VACANT_NAME_PREFIX, mode: 'insensitive' } }
        ]
      } : {}),
      ...(req.query.postStatus === 'filled' ? {
        AND: [
          { workingStatus: { not: 'Vacant' } },
          { NOT: { name: '' } },
          { NOT: { name: { startsWith: VACANT_NAME_PREFIX, mode: 'insensitive' } } }
        ]
      } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { workingStatus: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { personalMobile: { contains: search, mode: 'insensitive' } },
          { kgidNumber: { contains: search, mode: 'insensitive' } },
          { nativePlace: { contains: search, mode: 'insensitive' } },
          { district: { name: { contains: search, mode: 'insensitive' } } }
        ]
      } : {})
    };

    // Rank is derived from the designation text, so resolve it to matching ids
    if (rank) {
      const candidates = await prisma.officer.findMany({
        where: { isActive: true, ...(effectiveDistrictId ? { districtId: effectiveDistrictId } : {}) },
        select: { id: true, designation: true }
      });
      where.id = { in: candidates.filter(o => getOfficerRank(o.designation).key === rank).map(o => o.id) };
    }

    // Export mode: return matching records without pagination, capped well
    // below "unlimited" so a filtered export can't load the whole table.
    const exportAll = req.query.all === 'true';
    const EXPORT_CAP = 2000;

    let officers = await prisma.officer.findMany({
      where,
      ...(isSelectList(req) ? { select: officerSelectFields } : { include: officerInclude })
    });
    const total = officers.length;

    // Default to Rank Hierarchy sort: SP -> Addl SP -> DySP -> PI -> PSI -> ASI -> HC -> PC -> Other
    if (!req.query.sortBy || req.query.sortBy === 'rank' || req.query.sortBy === 'designation') {
      officers.sort(compareOfficersByRank);
      if (req.query.sortDir === 'desc') {
        officers.reverse();
      }
    } else {
      const field = req.query.sortBy;
      const dir = req.query.sortDir === 'asc' ? 1 : -1;
      officers.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return compareOfficersByRank(a, b);
      });
    }

    const paginated = exportAll ? officers.slice(0, EXPORT_CAP) : officers.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1)
    });
  } catch (error) {
    console.error('Fetch officers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Distinct designations for the filter dropdown (sorted by Rank Hierarchy: SP -> DySP -> PI...)
router.get('/meta/designations', async (req, res) => {
  try {
    const rows = await prisma.officer.findMany({
      where: { isActive: true },
      select: { designation: true },
      distinct: ['designation']
    });
    const desigs = rows.map(r => r.designation).filter(Boolean);
    desigs.sort(compareDesignationsByRank);
    res.json(desigs);
  } catch (error) {
    console.error('Fetch designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Officers module analytics — district / designation / tenure / data-completeness breakdowns
// for the Officers dashboard, reports, and module hub.
router.get('/meta/analytics', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    let scopeDistrictId = req.query.districtId || null;
    if (!isGlobalUser) {
      if (!req.user.districtId) {
        return res.status(403).json({ error: 'Access denied: User is not assigned to any district or Head Office' });
      }
      scopeDistrictId = req.user.districtId;
    }

    const cacheKey = `officers:analytics:${scopeDistrictId || 'ALL'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [officers, districts] = await Promise.all([
      prisma.officer.findMany({
        where: { isActive: true, ...(scopeDistrictId ? { districtId: scopeDistrictId } : {}) },
        select: {
          id: true,
          name: true,
          designation: true,
          mobile: true,
          reportingDate: true,
          presentAddress: true,
          permanentAddress: true,
          districtId: true,
          createdById: true,
          createdAt: true,
          district: { select: { id: true, name: true } },
          _count: { select: { previousPlaces: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.district.findMany({
        where: { isActive: true, ...(scopeDistrictId ? { id: scopeDistrictId } : {}) },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const nowMs = Date.now();
    const emptyTenure = () => Object.fromEntries(TENURE_BUCKETS.map(b => [b.key, 0]));
    const emptyCompleteness = () => Object.fromEntries(COMPLETENESS_FIELDS.map(f => [f, 0]));

    const districtMap = new Map();
    const ensureDistrict = (id, name) => {
      if (!districtMap.has(id)) {
        districtMap.set(id, {
          districtId: id,
          district: name || 'Unassigned',
          count: 0,
          filled: 0,
          vacant: 0,
          designations: {},
          ranks: {},
          tenure: emptyTenure(),
          completeness: emptyCompleteness(),
          completeProfiles: 0
        });
      }
      return districtMap.get(id);
    };
    districts.forEach(d => ensureDistrict(d.id, d.name));

    const designationCounts = {};
    const rankCounts = {};
    const rankVacant = {};
    const vacantList = [];
    let inChargeCount = 0;
    const tenureTotals = emptyTenure();
    const completenessTotals = emptyCompleteness();
    const reportingYearCounts = {};
    const longTenure = [];
    const incomplete = [];
    let completeProfiles = 0;
    let addedLast30Days = 0;
    let reportedLast90Days = 0;
    let totalPreviousPlaces = 0;

    officers.forEach(o => {
      const row = ensureDistrict(o.districtId, o.district?.name);
      const designation = (o.designation || 'Unspecified').trim() || 'Unspecified';
      const rank = getOfficerRank(designation);

      row.count++;
      row.designations[designation] = (row.designations[designation] || 0) + 1;
      row.ranks[rank.key] = (row.ranks[rank.key] || 0) + 1;
      rankCounts[rank.key] = (rankCounts[rank.key] || 0) + 1;
      designationCounts[designation] = (designationCounts[designation] || 0) + 1;
      if (IN_CHARGE_REGEX.test(designation)) inChargeCount++;
      if (nowMs - new Date(o.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000) addedLast30Days++;

      // A vacant post has no officer to profile — keep it out of tenure & completeness
      if (isVacantPost(o)) {
        row.vacant++;
        rankVacant[rank.key] = (rankVacant[rank.key] || 0) + 1;
        vacantList.push({ id: o.id, designation, rank: rank.short, district: o.district?.name || '—', districtId: o.districtId, createdById: o.createdById });
        return;
      }

      row.filled++;
      const years = getTenureYears(o.reportingDate, nowMs);
      const bucket = getTenureBucket(years);
      const missing = getMissingFields(o);
      row.tenure[bucket]++;
      tenureTotals[bucket]++;

      COMPLETENESS_FIELDS.forEach(f => {
        if (!missing.includes(f)) {
          row.completeness[f]++;
          completenessTotals[f]++;
        }
      });
      if (missing.length === 0) {
        row.completeProfiles++;
        completeProfiles++;
      } else {
        incomplete.push({ id: o.id, name: o.name, designation, district: o.district?.name || '—', createdById: o.createdById, missing });
      }

      totalPreviousPlaces += o._count?.previousPlaces || 0;

      if (o.reportingDate) {
        const reportedMs = new Date(o.reportingDate).getTime();
        if (!isNaN(reportedMs)) {
          if (nowMs - reportedMs <= 90 * 24 * 60 * 60 * 1000 && reportedMs <= nowMs) reportedLast90Days++;
          const y = new Date(reportedMs).getFullYear();
          reportingYearCounts[y] = (reportingYearCounts[y] || 0) + 1;
        }
      }

      if (years !== null && years >= LONG_TENURE_YEARS) {
        longTenure.push({
          id: o.id,
          name: o.name,
          designation,
          district: o.district?.name || '—',
          reportingDate: o.reportingDate,
          years: Math.round(years * 10) / 10
        });
      }
    });

    longTenure.sort((a, b) => b.years - a.years);
    incomplete.sort((a, b) => b.missing.length - a.missing.length);
    vacantList.sort(compareOfficersByRank);

    const byDesignation = Object.entries(designationCounts)
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => compareDesignationsByRank(a.designation, b.designation));

    const byRank = [...OFFICER_RANKS, OTHER_RANK]
      .filter(r => rankCounts[r.key])
      .map(r => ({ key: r.key, label: r.label, short: r.short, count: rankCounts[r.key], vacant: rankVacant[r.key] || 0 }));

    const byDistrict = Array.from(districtMap.values())
      .sort((a, b) => a.district.localeCompare(b.district));

    // Reporting-year trend: last 8 calendar years, oldest first
    const currentYear = new Date(nowMs).getFullYear();
    const reportingTrend = [];
    for (let y = currentYear - 7; y <= currentYear; y++) {
      reportingTrend.push({ year: String(y), count: reportingYearCounts[y] || 0 });
    }
    const earlierReported = Object.entries(reportingYearCounts)
      .filter(([y]) => Number(y) < currentYear - 7)
      .reduce((sum, [, c]) => sum + c, 0);

    // totalOfficers counts every post on the roster; filled/vacant split it
    const totalOfficers = officers.length;
    const vacantPosts = vacantList.length;
    const filledPosts = totalOfficers - vacantPosts;
    const result = {
      scopeDistrictId,
      generatedAt: new Date(nowMs).toISOString(),
      longTenureYears: LONG_TENURE_YEARS,
      tenureBuckets: TENURE_BUCKETS,
      totals: {
        totalOfficers,
        filledPosts,
        vacantPosts,
        vacancyRate: totalOfficers ? Math.round((vacantPosts / totalOfficers) * 100) : 0,
        districtsWithVacancies: byDistrict.filter(d => d.vacant > 0).length,
        totalDistricts: districts.length,
        districtsCovered: byDistrict.filter(d => d.count > 0).length,
        designationsCount: byDesignation.length,
        ranksCount: byRank.length,
        inChargeCount,
        addedLast30Days,
        reportedLast90Days,
        longTenureCount: longTenure.length,
        tenureNotRecorded: tenureTotals.na,
        completeProfiles,
        completenessRate: filledPosts ? Math.round((completeProfiles / filledPosts) * 100) : 0,
        avgPreviousPlaces: filledPosts ? Math.round((totalPreviousPlaces / filledPosts) * 10) / 10 : 0
      },
      tenure: TENURE_BUCKETS.map(b => ({ ...b, count: tenureTotals[b.key] })),
      completeness: COMPLETENESS_FIELDS.map(f => ({ field: f, count: completenessTotals[f] })),
      byDistrict,
      byRank,
      byDesignation,
      reportingTrend,
      earlierReported,
      recentOfficers: officers.filter(o => !isVacantPost(o)).slice(0, 6).map(o => ({
        id: o.id,
        name: o.name,
        designation: o.designation,
        district: o.district?.name || '—',
        createdAt: o.createdAt
      })),
      vacantList: vacantList.sort((a, b) => a.district.localeCompare(b.district) || a.designation.localeCompare(b.designation)),
      longTenure,
      incompleteProfiles: incomplete,
      incompleteTotal: incomplete.length
    };

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.error('Officer analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to execute lifecycle actions (Transfer, Mutual Swap, Retire, Relieve)
const executeLifecycleAction = async (tx, {
  type,
  sourceOfficerId,
  targetDistrictId,
  targetOfficerId,
  isSwap,
  orderNumber,
  orderDate,
  effectiveDate,
  reportingDate,
  transferredToDepartment,
  retirementType,
  remarks,
  userId
}) => {
  const effDate = effectiveDate ? new Date(effectiveDate) : new Date();
  const targetRepDate = reportingDate ? new Date(reportingDate) : null;

  if (type === 'TRANSFER') {
    const sourceOfficer = await tx.officer.findUnique({
      where: { id: sourceOfficerId },
      include: { district: true }
    });
    if (!sourceOfficer) throw new Error('Source officer not found');

    const targetOfficer = await tx.officer.findUnique({
      where: { id: targetOfficerId },
      include: { district: true }
    });
    if (!targetOfficer) throw new Error('Target post not found');

    if (isSwap) {
      // MUTUAL SWAP between Source Officer (Post A) and Target Officer (Post B)
      const sourcePlaces = await tx.officerPreviousPlace.findMany({ where: { officerId: sourceOfficer.id } });
      const targetPlaces = await tx.officerPreviousPlace.findMany({ where: { officerId: targetOfficer.id } });

      await tx.officerPreviousPlace.deleteMany({
        where: { officerId: { in: [sourceOfficer.id, targetOfficer.id] } }
      });

      // Move sourceOfficer places + their posting in Post A -> targetOfficer.id (Post B)
      for (const p of sourcePlaces) {
        await tx.officerPreviousPlace.create({
          data: {
            officerId: targetOfficer.id,
            designation: p.designation,
            policeStation: p.policeStation,
            district: p.district,
            fromDate: p.fromDate,
            toDate: p.toDate,
            place: p.place,
            fromYear: p.fromYear,
            toYear: p.toYear
          }
        });
      }
      await tx.officerPreviousPlace.create({
        data: {
          officerId: targetOfficer.id,
          designation: sourceOfficer.designation,
          district: sourceOfficer.district?.name || null,
          fromDate: sourceOfficer.reportingDate ? new Date(sourceOfficer.reportingDate) : null,
          toDate: effDate,
          place: `${sourceOfficer.designation}, Lokayukta ${sourceOfficer.district?.name || ''}`.trim()
        }
      });

      // Move targetOfficer places + their posting in Post B -> sourceOfficer.id (Post A)
      for (const p of targetPlaces) {
        await tx.officerPreviousPlace.create({
          data: {
            officerId: sourceOfficer.id,
            designation: p.designation,
            policeStation: p.policeStation,
            district: p.district,
            fromDate: p.fromDate,
            toDate: p.toDate,
            place: p.place,
            fromYear: p.fromYear,
            toYear: p.toYear
          }
        });
      }
      await tx.officerPreviousPlace.create({
        data: {
          officerId: sourceOfficer.id,
          designation: targetOfficer.designation,
          district: targetOfficer.district?.name || null,
          fromDate: targetOfficer.reportingDate ? new Date(targetOfficer.reportingDate) : null,
          toDate: effDate,
          place: `${targetOfficer.designation}, Lokayukta ${targetOfficer.district?.name || ''}`.trim()
        }
      });

      // Post A gets Target Officer's profile
      await tx.officer.update({
        where: { id: sourceOfficer.id },
        data: {
          name: targetOfficer.name,
          workingStatus: 'Working',
          mobile: targetOfficer.mobile,
          kgidNumber: targetOfficer.kgidNumber,
          dateOfJoiningDept: targetOfficer.dateOfJoiningDept,
          trainingPlace: targetOfficer.trainingPlace,
          trainingFromDate: targetOfficer.trainingFromDate,
          trainingToDate: targetOfficer.trainingToDate,
          nativePlace: targetOfficer.nativePlace,
          educationQualification: targetOfficer.educationQualification,
          reportingDate: effDate,
          personalMobile: targetOfficer.personalMobile,
          presentAddress: targetOfficer.presentAddress,
          permanentAddress: targetOfficer.permanentAddress,
          remarks: `Mutual transfer with ${sourceOfficer.name} from ${targetOfficer.district?.name || ''} vide Order ${orderNumber || '—'}. ${remarks || ''}`.trim(),
          updatedById: userId
        }
      });

      // Post B gets Source Officer's profile
      await tx.officer.update({
        where: { id: targetOfficer.id },
        data: {
          name: sourceOfficer.name,
          workingStatus: 'Working',
          mobile: sourceOfficer.mobile,
          kgidNumber: sourceOfficer.kgidNumber,
          dateOfJoiningDept: sourceOfficer.dateOfJoiningDept,
          trainingPlace: sourceOfficer.trainingPlace,
          trainingFromDate: sourceOfficer.trainingFromDate,
          trainingToDate: sourceOfficer.trainingToDate,
          nativePlace: sourceOfficer.nativePlace,
          educationQualification: sourceOfficer.educationQualification,
          reportingDate: targetRepDate || effDate,
          personalMobile: sourceOfficer.personalMobile,
          presentAddress: sourceOfficer.presentAddress,
          permanentAddress: sourceOfficer.permanentAddress,
          remarks: `Mutual transfer with ${targetOfficer.name} from ${sourceOfficer.district?.name || ''} vide Order ${orderNumber || '—'}. ${remarks || ''}`.trim(),
          updatedById: userId
        }
      });
    } else {
      // NORMAL TRANSFER TO VACANT POST
      // 1. Add posting history record for sourceOfficer:
      await tx.officerPreviousPlace.create({
        data: {
          officerId: targetOfficer.id,
          designation: sourceOfficer.designation,
          district: sourceOfficer.district?.name || null,
          fromDate: sourceOfficer.reportingDate ? new Date(sourceOfficer.reportingDate) : null,
          toDate: effDate,
          place: `${sourceOfficer.designation}, Lokayukta ${sourceOfficer.district?.name || ''}`.trim()
        }
      });

      // 2. Move existing previous places from sourceOfficer to targetOfficer:
      await tx.officerPreviousPlace.updateMany({
        where: { officerId: sourceOfficer.id },
        data: { officerId: targetOfficer.id }
      });

      // 3. Update target post with sourceOfficer's profile:
      await tx.officer.update({
        where: { id: targetOfficer.id },
        data: {
          name: sourceOfficer.name,
          workingStatus: 'Working',
          mobile: sourceOfficer.mobile,
          kgidNumber: sourceOfficer.kgidNumber,
          dateOfJoiningDept: sourceOfficer.dateOfJoiningDept,
          trainingPlace: sourceOfficer.trainingPlace,
          trainingFromDate: sourceOfficer.trainingFromDate,
          trainingToDate: sourceOfficer.trainingToDate,
          nativePlace: sourceOfficer.nativePlace,
          educationQualification: sourceOfficer.educationQualification,
          reportingDate: targetRepDate,
          personalMobile: sourceOfficer.personalMobile,
          presentAddress: sourceOfficer.presentAddress,
          permanentAddress: sourceOfficer.permanentAddress,
          remarks: `Transferred from ${sourceOfficer.district?.name || ''} (${sourceOfficer.designation}) vide Order ${orderNumber || '—'}. ${remarks || ''}`.trim(),
          updatedById: userId
        }
      });

      // 4. Vacate source post:
      await tx.officer.update({
        where: { id: sourceOfficer.id },
        data: {
          name: '',
          workingStatus: 'Vacant',
          mobile: null,
          kgidNumber: null,
          dateOfJoiningDept: null,
          trainingPlace: null,
          trainingFromDate: null,
          trainingToDate: null,
          nativePlace: null,
          educationQualification: null,
          personalMobile: null,
          presentAddress: null,
          permanentAddress: null,
          reportingDate: null,
          remarks: `Post vacated: ${sourceOfficer.name} transferred to ${targetOfficer.district?.name || ''} (${targetOfficer.designation}) vide Order ${orderNumber || '—'} on ${effDate.toLocaleDateString('en-IN')}.`,
          updatedById: userId
        }
      });
    }
  } else if (type === 'RETIREMENT') {
    const sourceOfficer = await tx.officer.findUnique({
      where: { id: sourceOfficerId },
      include: { district: true }
    });
    if (!sourceOfficer) throw new Error('Officer not found');

    // Add service history entry before clearing
    await tx.officerPreviousPlace.create({
      data: {
        officerId: sourceOfficer.id,
        designation: sourceOfficer.designation,
        district: sourceOfficer.district?.name || null,
        fromDate: sourceOfficer.reportingDate ? new Date(sourceOfficer.reportingDate) : null,
        toDate: effDate,
        place: `${sourceOfficer.designation}, Lokayukta ${sourceOfficer.district?.name || ''}`.trim()
      }
    });

    // Vacate post
    await tx.officer.update({
      where: { id: sourceOfficer.id },
      data: {
        name: '',
        workingStatus: 'Vacant',
        mobile: null,
        kgidNumber: null,
        dateOfJoiningDept: null,
        trainingPlace: null,
        trainingFromDate: null,
        trainingToDate: null,
        nativePlace: null,
        educationQualification: null,
        personalMobile: null,
        presentAddress: null,
        permanentAddress: null,
        reportingDate: null,
        remarks: `Officer ${sourceOfficer.name} retired on ${effDate.toLocaleDateString('en-IN')} (${retirementType || 'Superannuation'}) vide Order ${orderNumber || '—'}. ${remarks || ''}`.trim(),
        updatedById: userId
      }
    });
  } else if (type === 'OUT_FROM_LOKAYUKTA') {
    const sourceOfficer = await tx.officer.findUnique({
      where: { id: sourceOfficerId },
      include: { district: true }
    });
    if (!sourceOfficer) throw new Error('Officer not found');

    // Add service history entry before clearing
    await tx.officerPreviousPlace.create({
      data: {
        officerId: sourceOfficer.id,
        designation: sourceOfficer.designation,
        district: sourceOfficer.district?.name || null,
        fromDate: sourceOfficer.reportingDate ? new Date(sourceOfficer.reportingDate) : null,
        toDate: effDate,
        place: `${sourceOfficer.designation}, Lokayukta ${sourceOfficer.district?.name || ''}`.trim()
      }
    });

    // Vacate post
    await tx.officer.update({
      where: { id: sourceOfficer.id },
      data: {
        name: '',
        workingStatus: 'Vacant',
        mobile: null,
        kgidNumber: null,
        dateOfJoiningDept: null,
        trainingPlace: null,
        trainingFromDate: null,
        trainingToDate: null,
        nativePlace: null,
        educationQualification: null,
        personalMobile: null,
        presentAddress: null,
        permanentAddress: null,
        reportingDate: null,
        remarks: `Officer ${sourceOfficer.name} relieved from Lokayukta to ${transferredToDepartment || 'Parent Department'} on ${effDate.toLocaleDateString('en-IN')} vide Order ${orderNumber || '—'}. ${remarks || ''}`.trim(),
        updatedById: userId
      }
    });
  }
};

// Target posts for transfer (separated into vacant and occupied)
router.get('/lifecycle/target-posts', async (req, res) => {
  try {
    const { districtId, excludeOfficerId } = req.query;
    if (!districtId) return res.status(400).json({ error: 'districtId is required' });

    const posts = await prisma.officer.findMany({
      where: {
        districtId,
        isActive: true,
        ...(excludeOfficerId ? { id: { not: excludeOfficerId } } : {})
      },
      include: {
        district: { select: { id: true, name: true } }
      },
      orderBy: { designation: 'asc' }
    });

    const formatted = posts.map(p => {
      const isVacant = p.workingStatus === 'Vacant' || !p.name || p.name.trim().toLowerCase().startsWith('vacant');
      return {
        id: p.id,
        designation: p.designation,
        districtId: p.districtId,
        districtName: p.district?.name || '',
        workingStatus: isVacant ? 'Vacant' : 'Working',
        isVacant,
        officerName: isVacant ? '' : p.name,
        kgidNumber: p.kgidNumber || '',
        mobile: p.mobile || ''
      };
    });

    const vacantPosts = formatted.filter(p => p.isVacant);
    const occupiedPosts = formatted.filter(p => !p.isVacant);

    res.json({
      all: formatted,
      vacantPosts,
      occupiedPosts
    });
  } catch (error) {
    console.error('Target posts error:', error);
    res.status(500).json({ error: 'Failed to fetch target posts' });
  }
});

// List lifecycle requests (Pending, Approved, Rejected)
router.get('/lifecycle/requests', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictId = req.user.districtId;
    const { status, type } = req.query;

    const where = {
      type: type ? type : { in: ['OFFICER_TRANSFER', 'OFFICER_RETIREMENT', 'OFFICER_OUT'] },
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(!isGlobalUser && userDistrictId ? { districtId: userDistrictId } : {})
    };

    const requests = await prisma.editRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const parsed = requests.map(r => {
      let details = {};
      try {
        details = JSON.parse(r.reason);
      } catch (e) {
        details = { rawReason: r.reason };
      }
      return {
        id: r.id,
        type: r.type,
        recordId: r.recordId,
        recordTitle: r.recordTitle,
        districtId: r.districtId,
        districtName: r.districtName,
        requestedById: r.requestedById,
        requestedByName: r.requestedByName,
        status: r.status,
        adminRemarks: r.adminRemarks,
        reviewedById: r.reviewedById,
        reviewedByName: r.reviewedByName,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        details
      };
    });

    res.json(parsed);
  } catch (error) {
    console.error('Lifecycle requests error:', error);
    res.status(500).json({ error: 'Failed to fetch lifecycle requests' });
  }
});

// Count of pending requests
router.get('/lifecycle/pending-count', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictId = req.user.districtId;

    const count = await prisma.editRequest.count({
      where: {
        type: { in: ['OFFICER_TRANSFER', 'OFFICER_RETIREMENT', 'OFFICER_OUT'] },
        status: 'PENDING',
        ...(!isGlobalUser && userDistrictId ? { districtId: userDistrictId } : {})
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Pending count error:', error);
    res.status(500).json({ error: 'Failed to fetch pending count' });
  }
});

// Approve lifecycle request (Admin only)
router.post('/lifecycle/requests/:requestId/approve', adminMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminRemarks } = req.body || {};

    const request = await prisma.editRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve request with status '${request.status}'` });
    }

    let payload = {};
    try {
      payload = JSON.parse(request.reason);
    } catch (e) {
      return res.status(400).json({ error: 'Corrupt request data' });
    }

    const reviewer = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const reviewedByName = reviewer?.fullName || reviewer?.email || 'Admin';

    await prisma.$transaction(async (tx) => {
      await executeLifecycleAction(tx, {
        type: payload.lifecycleType,
        sourceOfficerId: payload.sourceOfficerId || request.recordId,
        targetDistrictId: payload.targetDistrictId,
        targetOfficerId: payload.targetOfficerId,
        isSwap: Boolean(payload.isSwap),
        orderNumber: payload.orderNumber,
        orderDate: payload.orderDate,
        effectiveDate: payload.effectiveDate,
        reportingDate: payload.reportingDate,
        transferredToDepartment: payload.transferredToDepartment,
        retirementType: payload.retirementType,
        remarks: payload.remarks,
        userId: req.user.userId
      });

      await tx.editRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          adminRemarks: adminRemarks ? String(adminRemarks).trim() : 'Approved by administrator',
          reviewedById: req.user.userId,
          reviewedByName,
          reviewedAt: new Date()
        }
      });
    });

    await invalidateOfficerCaches();
    res.json({ success: true, message: 'Request approved and executed successfully' });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve request' });
  }
});

// Reject lifecycle request (Admin only)
router.post('/lifecycle/requests/:requestId/reject', adminMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminRemarks } = req.body || {};

    const request = await prisma.editRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject request with status '${request.status}'` });
    }

    const reviewer = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const reviewedByName = reviewer?.fullName || reviewer?.email || 'Admin';

    await prisma.editRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        adminRemarks: adminRemarks ? String(adminRemarks).trim() : 'Rejected by administrator',
        reviewedById: req.user.userId,
        reviewedByName,
        reviewedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Cancel lifecycle request (Owner or Admin)
router.delete('/lifecycle/requests/:requestId', canWrite, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await prisma.editRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    if (!isGlobalUser && request.requestedById !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied: You can only cancel your own pending requests' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    await prisma.editRequest.delete({ where: { id: requestId } });
    res.json({ success: true, message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// Submit a lifecycle request (or execute directly if admin)
router.post('/:id/lifecycle-request', canWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type, // 'TRANSFER', 'RETIREMENT', 'OUT_FROM_LOKAYUKTA'
      targetDistrictId,
      targetOfficerId,
      isSwap,
      orderNumber,
      orderDate,
      effectiveDate,
      reportingDate,
      transferredToDepartment,
      retirementType,
      remarks,
      directExecute
    } = req.body;

    if (!['TRANSFER', 'RETIREMENT', 'OUT_FROM_LOKAYUKTA'].includes(type)) {
      return res.status(400).json({ error: 'Invalid lifecycle request type' });
    }
    if (!orderNumber || !String(orderNumber).trim()) {
      return res.status(400).json({ error: 'Official Order Number is required' });
    }
    if (!effectiveDate) {
      return res.status(400).json({ error: 'Effective / Relieving Date is required' });
    }
    if (type === 'TRANSFER' && (!targetDistrictId || !targetOfficerId)) {
      return res.status(400).json({ error: 'Target district and target post are required for transfer' });
    }

    const sourceOfficer = await prisma.officer.findUnique({
      where: { id },
      include: { district: true, previousPlaces: true }
    });
    if (!sourceOfficer) return res.status(404).json({ error: 'Officer not found' });

    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    if (!isGlobalUser && req.user.districtId && sourceOfficer.districtId !== req.user.districtId) {
      return res.status(403).json({ error: 'Access denied: You can only initiate requests for officers in your assigned district' });
    }

    // Check if there is already a pending request for this officer
    const existingPending = await prisma.editRequest.findFirst({
      where: {
        recordId: id,
        type: { in: ['OFFICER_TRANSFER', 'OFFICER_RETIREMENT', 'OFFICER_OUT'] },
        status: 'PENDING'
      }
    });
    if (existingPending) {
      return res.status(400).json({ error: 'A lifecycle request is already pending approval for this officer' });
    }

    let targetOfficer = null;
    if (type === 'TRANSFER') {
      targetOfficer = await prisma.officer.findUnique({
        where: { id: targetOfficerId },
        include: { district: true }
      });
      if (!targetOfficer) return res.status(404).json({ error: 'Target post not found' });

      // Check if target officer has pending request
      const targetPending = await prisma.editRequest.findFirst({
        where: {
          recordId: targetOfficerId,
          type: { in: ['OFFICER_TRANSFER', 'OFFICER_RETIREMENT', 'OFFICER_OUT'] },
          status: 'PENDING'
        }
      });
      if (targetPending) {
        return res.status(400).json({ error: 'The selected target post already has a pending lifecycle request' });
      }
    }

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const requestedByName = currentUser?.fullName || currentUser?.email || 'User';

    const dbType = type === 'TRANSFER' ? 'OFFICER_TRANSFER' : (type === 'RETIREMENT' ? 'OFFICER_RETIREMENT' : 'OFFICER_OUT');
    const reasonPayload = {
      lifecycleType: type,
      sourceOfficerId: id,
      sourceDistrictId: sourceOfficer.districtId,
      sourceDistrictName: sourceOfficer.district?.name,
      sourceDesignation: sourceOfficer.designation,
      sourceOfficerName: sourceOfficer.name,
      sourceKgid: sourceOfficer.kgidNumber,
      sourceMobile: sourceOfficer.mobile,
      sourceReportingDate: sourceOfficer.reportingDate,
      targetDistrictId: targetDistrictId || null,
      targetDistrictName: targetOfficer?.district?.name || null,
      targetOfficerId: targetOfficerId || null,
      targetDesignation: targetOfficer?.designation || null,
      targetOfficerName: targetOfficer?.name || null,
      isSwap: Boolean(isSwap),
      orderNumber: String(orderNumber).trim(),
      orderDate: orderDate || null,
      effectiveDate,
      reportingDate: reportingDate || null,
      transferredToDepartment: transferredToDepartment ? String(transferredToDepartment).trim() : null,
      retirementType: retirementType ? String(retirementType).trim() : null,
      remarks: remarks ? String(remarks).trim() : null
    };

    const shouldDirectExecute = Boolean(directExecute && req.user.role === 'admin');

    if (shouldDirectExecute) {
      await prisma.$transaction(async (tx) => {
        await executeLifecycleAction(tx, {
          type,
          sourceOfficerId: id,
          targetDistrictId,
          targetOfficerId,
          isSwap: Boolean(isSwap),
          orderNumber: String(orderNumber).trim(),
          orderDate,
          effectiveDate,
          reportingDate,
          transferredToDepartment,
          retirementType,
          remarks,
          userId: req.user.userId
        });

        await tx.editRequest.create({
          data: {
            type: dbType,
            recordId: id,
            recordTitle: `${sourceOfficer.name} (${sourceOfficer.designation} - ${sourceOfficer.district?.name})`,
            districtId: sourceOfficer.districtId,
            districtName: sourceOfficer.district?.name,
            requestedById: req.user.userId,
            requestedByName,
            reason: JSON.stringify(reasonPayload),
            status: 'APPROVED',
            adminRemarks: 'Direct execution by administrator',
            reviewedById: req.user.userId,
            reviewedByName: requestedByName,
            reviewedAt: new Date()
          }
        });
      });

      await invalidateOfficerCaches();
      return res.json({
        success: true,
        executed: true,
        message: type === 'TRANSFER'
          ? (isSwap ? 'Mutual transfer executed successfully.' : 'Transfer executed successfully.')
          : (type === 'RETIREMENT' ? 'Retirement recorded successfully.' : 'Officer relieved successfully.')
      });
    } else {
      const newRequest = await prisma.editRequest.create({
        data: {
          type: dbType,
          recordId: id,
          recordTitle: `${sourceOfficer.name} (${sourceOfficer.designation} - ${sourceOfficer.district?.name})`,
          districtId: sourceOfficer.districtId,
          districtName: sourceOfficer.district?.name,
          requestedById: req.user.userId,
          requestedByName,
          reason: JSON.stringify(reasonPayload),
          status: 'PENDING'
        }
      });

      return res.json({
        success: true,
        executed: false,
        requestId: newRequest.id,
        message: 'Request submitted successfully. Waiting for Administrator approval.'
      });
    }
  } catch (error) {
    console.error('Lifecycle request submission error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit lifecycle request' });
  }
});

// Get a single officer with previous places + audit info
router.get('/:id', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictId = req.user.districtId;

    const officer = await prisma.officer.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        ...((!isGlobalUser && userDistrictId) ? { districtId: userDistrictId } : {})
      },
      include: {
        ...officerInclude,
        createdBy: { select: { id: true, email: true, fullName: true } },
        updatedBy: { select: { id: true, email: true, fullName: true } }
      }
    });
    if (!officer) return res.status(404).json({ error: 'Officer not found' });

    // Check for pending lifecycle request
    const pendingReq = await prisma.editRequest.findFirst({
      where: {
        recordId: officer.id,
        type: { in: ['OFFICER_TRANSFER', 'OFFICER_RETIREMENT', 'OFFICER_OUT'] },
        status: 'PENDING'
      }
    });

    let pendingLifecycleRequest = null;
    if (pendingReq) {
      let details = {};
      try {
        details = JSON.parse(pendingReq.reason);
      } catch (e) {
        details = {};
      }
      pendingLifecycleRequest = {
        id: pendingReq.id,
        type: pendingReq.type,
        status: pendingReq.status,
        requestedById: pendingReq.requestedById,
        requestedByName: pendingReq.requestedByName,
        createdAt: pendingReq.createdAt,
        details
      };
    }

    res.json({
      ...officer,
      pendingLifecycleRequest
    });
  } catch (error) {
    console.error('Fetch officer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an officer (officer + previous places in one transaction)
// Only administrators can create officers
router.post('/', canWrite, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Only administrators can create officer records.' });
    }

    const data = req.body;
    const validationError = validateOfficerPayload(data);
    if (validationError) return res.status(400).json({ error: validationError });

    // Admin & Head Office can assign to any district; regular district users stay locked to their district
    let targetDistrictId = data.districtId;
    if (req.user.role !== 'admin' && !req.user.isHeadOffice && req.user.districtId) {
      targetDistrictId = req.user.districtId;
    }

    const isVacant = data.workingStatus === 'Vacant';
    const reportingDateVal = (data.reportingPresentOfficeDate || data.reportingDate);
    const officer = await prisma.officer.create({
      data: {
        districtId: targetDistrictId,
        name: isVacant ? '' : (data.name ? data.name.trim() : ''),
        designation: data.designation.trim(),
        workingStatus: isVacant ? 'Vacant' : 'Working',
        mobile: data.mobile && data.mobile.trim() ? data.mobile.trim() : null,
        kgidNumber: data.kgidNumber && data.kgidNumber.trim() ? data.kgidNumber.trim() : null,
        dateOfJoiningDept: data.dateOfJoiningDept ? new Date(data.dateOfJoiningDept) : null,
        trainingPlace: data.trainingPlace && data.trainingPlace.trim() ? data.trainingPlace.trim() : null,
        trainingFromDate: data.trainingFromDate ? new Date(data.trainingFromDate) : null,
        trainingToDate: data.trainingToDate ? new Date(data.trainingToDate) : null,
        nativePlace: data.nativePlace && data.nativePlace.trim() ? data.nativePlace.trim() : null,
        educationQualification: data.educationQualification && data.educationQualification.trim() ? data.educationQualification.trim() : null,
        reportingDate: reportingDateVal ? new Date(reportingDateVal) : null,
        personalMobile: data.personalMobile && data.personalMobile.trim() ? data.personalMobile.trim() : null,
        presentAddress: data.presentAddress && data.presentAddress.trim() ? data.presentAddress.trim() : null,
        permanentAddress: data.permanentAddress && data.permanentAddress.trim() ? data.permanentAddress.trim() : null,
        remarks: data.remarks && data.remarks.trim() ? data.remarks.trim() : null,
        createdById: req.user.userId,
        updatedById: req.user.userId,
        previousPlaces: { create: sanitizePreviousPlaces(data.previousPlaces) }
      },
      include: officerInclude
    });

    await invalidateOfficerCaches();
    res.status(201).json(officer);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Selected district does not exist' });
    console.error('Create officer error:', error);
    res.status(500).json({ error: 'Failed to create officer' });
  }
});

// Update an officer — reconciles previous places by replacing them inside a transaction
router.put('/:id', canWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existingOfficer = await prisma.officer.findUnique({ where: { id } });
    if (!existingOfficer) return res.status(404).json({ error: 'Officer not found' });

    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    if (!isGlobalUser && req.user.districtId && existingOfficer.districtId !== req.user.districtId) {
      return res.status(403).json({ error: 'Access denied: You can only edit officers in your assigned district' });
    }

    // Security: Only admin can change workingStatus. Regular user preserves existing working status.
    const workingStatusVal = req.user.role === 'admin' && data.workingStatus
      ? (['Working', 'Vacant'].includes(data.workingStatus) ? data.workingStatus : existingOfficer.workingStatus)
      : existingOfficer.workingStatus;

    const isVacant = workingStatusVal === 'Vacant';

    // If user is not admin, officer name cannot be modified; keep existing name
    if (req.user.role !== 'admin') {
      data.name = existingOfficer.name;
    }

    const validationError = validateOfficerPayload({
      ...data,
      workingStatus: workingStatusVal
    });
    if (validationError) return res.status(400).json({ error: validationError });

    // Admin & Head Office can reassign to any district; regular district users stay locked to their district
    let targetDistrictId = data.districtId;
    if (!isGlobalUser && req.user.districtId) {
      targetDistrictId = req.user.districtId;
    }

    // Security: Only admin can change officer name. If Vacant, name is empty.
    const officerName = isVacant
      ? ''
      : (req.user.role === 'admin'
          ? (data.name ? data.name.trim() : '')
          : existingOfficer.name);

    const reportingDateVal = (data.reportingPresentOfficeDate || data.reportingDate);
    const officer = await prisma.$transaction(async (tx) => {
      await tx.officerPreviousPlace.deleteMany({ where: { officerId: id } });

      return tx.officer.update({
        where: { id },
        data: {
          districtId: targetDistrictId,
          name: officerName,
          designation: data.designation.trim(),
          workingStatus: workingStatusVal,
          mobile: data.mobile && data.mobile.trim() ? data.mobile.trim() : null,
          kgidNumber: data.kgidNumber && data.kgidNumber.trim() ? data.kgidNumber.trim() : null,
          dateOfJoiningDept: data.dateOfJoiningDept ? new Date(data.dateOfJoiningDept) : null,
          trainingPlace: data.trainingPlace && data.trainingPlace.trim() ? data.trainingPlace.trim() : null,
          trainingFromDate: data.trainingFromDate ? new Date(data.trainingFromDate) : null,
          trainingToDate: data.trainingToDate ? new Date(data.trainingToDate) : null,
          nativePlace: data.nativePlace && data.nativePlace.trim() ? data.nativePlace.trim() : null,
          educationQualification: data.educationQualification && data.educationQualification.trim() ? data.educationQualification.trim() : null,
          reportingDate: reportingDateVal ? new Date(reportingDateVal) : null,
          personalMobile: data.personalMobile && data.personalMobile.trim() ? data.personalMobile.trim() : null,
          presentAddress: data.presentAddress && data.presentAddress.trim() ? data.presentAddress.trim() : null,
          permanentAddress: data.permanentAddress && data.permanentAddress.trim() ? data.permanentAddress.trim() : null,
          remarks: data.remarks && data.remarks.trim() ? data.remarks.trim() : null,
          updatedById: req.user.userId,
          previousPlaces: { create: sanitizePreviousPlaces(data.previousPlaces) }
        },
        include: officerInclude
      });
    });

    await invalidateOfficerCaches();
    res.json(officer);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Officer not found' });
    if (error.code === 'P2003') return res.status(400).json({ error: 'Selected district does not exist' });
    console.error('Update officer error:', error);
    res.status(500).json({ error: 'Failed to update officer' });
  }
});

// Admin-only toggle/update officer working status (Working / Vacant) directly from officers table
router.patch('/:id/working-status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Only administrators can change officer working status.' });
    }

    const { id } = req.params;
    const existingOfficer = await prisma.officer.findUnique({ where: { id } });
    if (!existingOfficer) return res.status(404).json({ error: 'Officer not found' });

    const requested = req.body && req.body.workingStatus ? String(req.body.workingStatus).trim() : '';
    const nextStatus = requested && ['Working', 'Vacant'].includes(requested)
      ? requested
      : (existingOfficer.workingStatus === 'Vacant' ? 'Working' : 'Vacant');

    // User requirement: "officer name idhre adhu vacant agbardhu error barbeku officer name empty idhre mathra vacant agbeku"
    if (nextStatus === 'Vacant') {
      const currentName = (existingOfficer.name || '').trim();
      if (currentName !== '' && currentName.toLowerCase() !== 'vacant') {
        return res.status(400).json({
          error: `Cannot mark as Vacant when Officer Name ("${currentName}") is present. Officer name must be empty to mark as Vacant.`
        });
      }
    }

    let nextName = '';
    if (nextStatus === 'Working') {
      const incomingName = req.body && req.body.name ? String(req.body.name).trim() : '';
      const currentName = (existingOfficer.name || '').trim();
      nextName = incomingName || (currentName.toLowerCase() !== 'vacant' ? currentName : '');
      if (!nextName) {
        return res.status(400).json({
          error: 'Officer name is required to mark this post as Working.'
        });
      }
    } else {
      nextName = '';
    }

    const updatedOfficer = await prisma.officer.update({
      where: { id },
      data: {
        workingStatus: nextStatus,
        name: nextName,
        updatedById: req.user.userId
      },
      include: officerInclude
    });

    await invalidateOfficerCaches();
    res.json(updatedOfficer);
  } catch (error) {
    console.error('Update officer working status error:', error);
    res.status(500).json({ error: 'Failed to update working status' });
  }
});

// Soft delete — is_active = false, record is preserved
// Note: Changed from adminMiddleware to canWrite since normal users should be able to delete their own records.
router.delete('/:id', canWrite, async (req, res) => {
  try {
    const existingOfficer = await prisma.officer.findUnique({ where: { id: req.params.id } });
    if (!existingOfficer) return res.status(404).json({ error: 'Officer not found' });

    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    if (!isGlobalUser && req.user.districtId && existingOfficer.districtId !== req.user.districtId) {
      return res.status(403).json({ error: 'Access denied: You can only delete officers in your assigned district' });
    }

    await prisma.officer.update({
      where: { id: req.params.id },
      data: { isActive: false, updatedById: req.user.userId }
    });
    await invalidateOfficerCaches();
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Officer not found' });
    console.error('Delete officer error:', error);
    res.status(500).json({ error: 'Failed to delete officer' });
  }
});

module.exports = router;
module.exports.compareDesignationsByRank = compareDesignationsByRank;
module.exports.compareOfficersByRank = compareOfficersByRank;
module.exports.getOfficerRank = getOfficerRank;
module.exports.OFFICER_RANKS = OFFICER_RANKS;
