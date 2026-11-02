const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware } = require('./auth');
const { requireModule } = require('../modulePermissions');

// The three benches of the Hon'ble High Court of Karnataka
const HC_BENCHES = ['Bengaluru', 'Kalaburagi', 'Dharwad'];
// Outcome of the stay; null means the matter is still pending (stay in force)
const CASE_STATUSES = ['Vacated', 'Quash'];
const PENDING = 'Pending';

const DIGITS_REGEX = /^\d+$/;
// "Number and alphabetic" fields — case numbers and law sections like "Crl.P 1234/2023", "7(a), 13(1)(b)"
const CASE_REF_REGEX = /^[A-Za-z0-9\s().,/&:-]+$/;
// "Alphabetic" — person names, allowing initials and Kannada script
const NAME_REGEX = /^[\p{L}\p{M}\s.'-]+$/u;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STAY_AGING_BUCKETS = [
  { key: 'lt6m', label: 'Under 6 months', maxDays: 182 },
  { key: '6to12m', label: '6–12 months', maxDays: 365 },
  { key: '1to2y', label: '1–2 years', maxDays: 730 },
  { key: '2plus', label: '2+ years', maxDays: Infinity },
  { key: 'na', label: 'Stay date not recorded' }
];

router.use(authMiddleware);
router.use(requireModule('courtCases'));

// Admin and regular "user" roles can create/edit; "viewer" is read-only
const canWrite = (req, res, next) => {
  if (!['admin', 'user'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to modify court case records' });
  }
  next();
};

const isGlobalUser = (user) => user.role === 'admin' || user.isHeadOffice === true;

const invalidateCourtCaseCaches = async () => {
  try {
    await redisClient.delPattern('courtcases:');
  } catch (e) {
    // ignore
  }
};

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const validatePayload = (data) => {
  if (!clean(data.districtId)) return 'District is required';
  const crimeNo = clean(data.crimeNo);
  if (!crimeNo) return 'Crime No is required';

  const ioName = clean(data.ioName);
  if (ioName && !NAME_REGEX.test(ioName)) return 'Name of the I.O must contain letters only';

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const dateFields = [
    ['firRegDate', 'Date of Registration FIR'],
    ['hcPetitionDate', 'Date of Petition (High Court)'],
    ['hcStayDate', 'Date of Stay'],
    ['hcCounselInformedDate', 'Date of information given to IO by Counsel'],
    ['hcParawiseRemarksDate', 'Date of Parawise remarks by IO'],
    ['hcClcIntimationDate', 'Date of intimation to CLC by Counsel'],
    ['hcClcOpinionDate', 'Opinion Date of CLC'],
    ['scPetitionDate', 'Date of Petition (Supreme Court)']
  ];

  for (const [field, label] of dateFields) {
    const val = data[field];
    if (val) {
      const d = parseDate(val);
      if (d === undefined) return `${label} is not a valid date`;
    }
  }

  return null;
};

const buildData = (data) => {
  const stayDateVal = parseDate(data.hcStayDate || data.stayDate) || null;
  const stayTypeVal = clean(data.hcStayType || data.stayType);
  const wpNoVal = clean(data.hcPetitionNo || data.wpCrlpNo);
  const slpNoVal = clean(data.scPetitionNo || data.slpNo);
  const hcStatusVal = clean(data.hcCourtOrders || data.hcCaseStatus);
  const scStatusVal = clean(data.scCourtOrders || data.scCaseStatus);
  const sppInformedVal = parseDate(data.hcCounselInformedDate || data.sppInformedDate) || null;
  const sectionVal = clean(data.section || data.sectionOfLaw);

  return {
    crimeNo: clean(data.crimeNo),
    complainantName: clean(data.complainantName),
    firRegDate: parseDate(data.firRegDate) || null,
    act: clean(data.act),
    section: sectionVal,
    caseType: clean(data.caseType),
    courtName: clean(data.courtName),
    sppName: clean(data.sppName),
    caseStage: clean(data.caseStage),
    ccNo: clean(data.ccNo),
    ioName: clean(data.ioName),

    // High Court
    hcBench: clean(data.hcBench),
    hcCourtHall: clean(data.hcCourtHall),
    hcPetitionType: clean(data.hcPetitionType),
    hcPetitionNo: wpNoVal,
    hcPetitionDate: parseDate(data.hcPetitionDate) || null,
    hcStayDate: stayDateVal,
    hcStayType: stayTypeVal,
    hcCounselInformedDate: sppInformedVal,
    hcPetitionerName: clean(data.hcPetitionerName),
    hcRespondents: clean(data.hcRespondents),
    hcParawiseRemarksDate: parseDate(data.hcParawiseRemarksDate) || null,
    hcNextHearingDate: parseDate(data.hcNextHearingDate) || null,
    hcCourtOrders: hcStatusVal,
    hcCounselName: clean(data.hcCounselName),
    hcClcIntimationDate: parseDate(data.hcClcIntimationDate) || null,
    hcClcOpinion: clean(data.hcClcOpinion),
    hcClcOpinionDate: parseDate(data.hcClcOpinionDate) || null,

    // Supreme Court
    scPetitionType: clean(data.scPetitionType),
    scPetitionNo: slpNoVal,
    scPetitionDate: parseDate(data.scPetitionDate) || null,
    scPetitionerName: clean(data.scPetitionerName),
    scRespondents: clean(data.scRespondents),
    scHearingDate: parseDate(data.scHearingDate) || null,
    scCourtOrders: scStatusVal,
    scCounselName: clean(data.scCounselName),

    // Backward compatibility
    sectionOfLaw: sectionVal,
    wpCrlpNo: wpNoVal,
    stayDate: stayDateVal,
    stayType: stayTypeVal,
    sppInformedDate: sppInformedVal,
    hcCaseStatus: hcStatusVal,
    slpNo: slpNoVal,
    scCaseStatus: scStatusVal
  };
};

// A WP/Crl.P number is unique within a High Court bench
const findDuplicate = async ({ hcBench, wpCrlpNo }, excludeId) => {
  if (!hcBench || !wpCrlpNo) return null;
  return prisma.courtCase.findFirst({
    where: {
      isActive: true,
      hcBench,
      OR: [
        { wpCrlpNo: { equals: wpCrlpNo, mode: 'insensitive' } },
        { hcPetitionNo: { equals: wpCrlpNo, mode: 'insensitive' } }
      ],
      ...(excludeId ? { NOT: { id: excludeId } } : {})
    },
    select: { id: true, crimeNo: true, district: { select: { name: true } } }
  });
};

const caseInclude = {
  district: { select: { id: true, name: true, shortName: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  agos: { orderBy: { createdAt: 'asc' } },
  actSections: { orderBy: { createdAt: 'asc' } }
};

// List — search, filters, server-side pagination; ?all=true returns every match for export
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 10, 1), 100);
    const search = (req.query.search || '').trim();

    let districtId = req.query.districtId || undefined;
    if (!isGlobalUser(req.user)) {
      if (!req.user.districtId) {
        return res.status(403).json({ error: 'Access denied: User is not assigned to any district or Head Office' });
      }
      districtId = req.user.districtId;
    }

    const hcStatus = req.query.hcStatus || undefined;
    const stage = req.query.caseStage || undefined;
    const caseType = req.query.caseType || undefined;

    const where = {
      isActive: true,
      ...(districtId ? { districtId } : {}),
      ...(stage ? { caseStage: stage } : {}),
      ...(caseType ? { caseType } : {}),
      ...(req.query.act ? { act: req.query.act } : {}),
      ...(req.query.courtName ? { courtName: req.query.courtName } : {}),
      ...(req.query.hcBench ? { hcBench: req.query.hcBench } : {}),
      ...(hcStatus === PENDING ? { OR: [{ hcCourtOrders: null }, { hcCaseStatus: null }] } : hcStatus ? { OR: [{ hcCourtOrders: hcStatus }, { hcCaseStatus: hcStatus }] } : {}),
      ...(req.query.scStatus === 'filed' ? { OR: [{ scPetitionNo: { not: null } }, { slpNo: { not: null } }] } : req.query.scStatus ? { OR: [{ scCourtOrders: req.query.scStatus }, { scCaseStatus: req.query.scStatus }] } : {}),
      ...(req.query.sppName === '__none' ? { sppName: null } : req.query.sppName ? { sppName: req.query.sppName } : {}),
      ...(req.query.stayType ? { OR: [{ hcStayType: req.query.stayType }, { stayType: req.query.stayType }] } : {}),
      ...(req.query.attention === 'sppNotInformed' ? { hcCaseStatus: null, sppInformedDate: null } : {}),
      ...(search ? {
        OR: [
          { crimeNo: { contains: search, mode: 'insensitive' } },
          { complainantName: { contains: search, mode: 'insensitive' } },
          { act: { contains: search, mode: 'insensitive' } },
          { section: { contains: search, mode: 'insensitive' } },
          { sectionOfLaw: { contains: search, mode: 'insensitive' } },
          { caseType: { contains: search, mode: 'insensitive' } },
          { courtName: { contains: search, mode: 'insensitive' } },
          { caseStage: { contains: search, mode: 'insensitive' } },
          { ccNo: { contains: search, mode: 'insensitive' } },
          { wpCrlpNo: { contains: search, mode: 'insensitive' } },
          { hcPetitionNo: { contains: search, mode: 'insensitive' } },
          { hcPetitionerName: { contains: search, mode: 'insensitive' } },
          { hcRespondents: { contains: search, mode: 'insensitive' } },
          { hcCounselName: { contains: search, mode: 'insensitive' } },
          { slpNo: { contains: search, mode: 'insensitive' } },
          { scPetitionNo: { contains: search, mode: 'insensitive' } },
          { scPetitionerName: { contains: search, mode: 'insensitive' } },
          { scRespondents: { contains: search, mode: 'insensitive' } },
          { sppName: { contains: search, mode: 'insensitive' } },
          { ioName: { contains: search, mode: 'insensitive' } },
          { district: { name: { contains: search, mode: 'insensitive' } } },
          { actSections: { some: { OR: [
            { act: { contains: search, mode: 'insensitive' } },
            { section: { contains: search, mode: 'insensitive' } }
          ] } } },
          { agos: { some: { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { designation: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { subDepartment: { contains: search, mode: 'insensitive' } }
          ] } } }
        ]
      } : {})
    };

    const sortable = ['createdAt', 'stayDate', 'crimeNo'];
    const sortBy = sortable.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    const exportAll = req.query.all === 'true';
    const EXPORT_CAP = 5000;

    const [total, cases] = await Promise.all([
      prisma.courtCase.count({ where }),
      prisma.courtCase.findMany({
        where,
        include: caseInclude,
        orderBy: { [sortBy]: sortDir },
        ...(exportAll ? { take: EXPORT_CAP } : { skip: (page - 1) * pageSize, take: pageSize })
      })
    ]);

    res.json({ data: cases, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) });
  } catch (error) {
    console.error('Fetch court cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard / reports analytics
router.get('/meta/analytics', async (req, res) => {
  try {
    let scopeDistrictId = req.query.districtId || null;
    if (!isGlobalUser(req.user)) {
      if (!req.user.districtId) {
        return res.status(403).json({ error: 'Access denied: User is not assigned to any district or Head Office' });
      }
      scopeDistrictId = req.user.districtId;
    }

    const cacheKey = `courtcases:analytics:${scopeDistrictId || 'ALL'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [cases, districts] = await Promise.all([
      prisma.courtCase.findMany({
        where: { isActive: true, ...(scopeDistrictId ? { districtId: scopeDistrictId } : {}) },
        include: { district: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.district.findMany({
        where: { isActive: true, ...(scopeDistrictId ? { id: scopeDistrictId } : {}) },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const nowMs = Date.now();
    const emptyStatus = () => ({ total: 0, pending: 0, vacated: 0, quash: 0 });
    const emptyAging = () => Object.fromEntries(STAY_AGING_BUCKETS.map(b => [b.key, 0]));
    const statusKey = (c) => (c.hcCaseStatus === 'Vacated' ? 'vacated' : c.hcCaseStatus === 'Quash' ? 'quash' : 'pending');

    const districtMap = new Map();
    const ensureDistrict = (id, name) => {
      if (!districtMap.has(id)) {
        districtMap.set(id, { districtId: id, district: name || 'Unassigned', ...emptyStatus(), slp: 0, sppNotInformed: 0, aging: emptyAging() });
      }
      return districtMap.get(id);
    };
    districts.forEach(d => ensureDistrict(d.id, d.name));

    const benchMap = Object.fromEntries(HC_BENCHES.map(b => [b, { bench: b, ...emptyStatus() }]));
    const benchUnset = { bench: 'Not recorded', ...emptyStatus() };
    const sppMap = new Map();
    const stayTypeCounts = {};
    const agingTotals = emptyAging();
    const totals = { ...emptyStatus(), slpFiled: 0, scPending: 0, scVacated: 0, scQuash: 0, sppNotInformed: 0 };
    const lagDays = [];
    const watchlist = [];
    const sppNotInformedList = [];

    // Stays granted per month, last 12 calendar months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date(nowMs);
    const monthly = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, count: 0 });
    }
    const monthIndex = Object.fromEntries(monthly.map((m, i) => [m.key, i]));

    const summarize = (c, extra = {}) => ({
      id: c.id,
      crimeNo: c.crimeNo,
      wpCrlpNo: c.wpCrlpNo,
      hcBench: c.hcBench,
      district: c.district?.name || '—',
      sppName: c.sppName,
      stayDate: c.stayDate,
      stayType: c.stayType,
      ...extra
    });

    cases.forEach(c => {
      const key = statusKey(c);
      const row = ensureDistrict(c.districtId, c.district?.name);
      row.total++; row[key]++;
      totals.total++; totals[key]++;

      const bench = benchMap[c.hcBench] || benchUnset;
      bench.total++; bench[key]++;

      const sppLabel = c.sppName || 'Not assigned';
      if (!sppMap.has(sppLabel)) sppMap.set(sppLabel, { spp: sppLabel, assigned: !!c.sppName, ...emptyStatus(), notInformed: 0, lagTotal: 0, lagCount: 0 });
      const spp = sppMap.get(sppLabel);
      spp.total++; spp[key]++;

      if (c.stayType) stayTypeCounts[c.stayType] = (stayTypeCounts[c.stayType] || 0) + 1;

      if (c.slpNo) {
        totals.slpFiled++; row.slp++;
        if (c.scCaseStatus === 'Vacated') totals.scVacated++;
        else if (c.scCaseStatus === 'Quash') totals.scQuash++;
        else totals.scPending++;
      }

      const stayMs = c.stayDate ? new Date(c.stayDate).getTime() : null;
      if (stayMs !== null && c.sppInformedDate) {
        const lag = Math.round((new Date(c.sppInformedDate).getTime() - stayMs) / MS_PER_DAY);
        lagDays.push(lag);
        spp.lagTotal += lag; spp.lagCount++;
      }
      if (stayMs !== null) {
        const d = new Date(stayMs);
        const idx = monthIndex[`${d.getFullYear()}-${d.getMonth()}`];
        if (idx !== undefined) monthly[idx].count++;
      }

      if (key === 'pending') {
        const days = stayMs !== null ? Math.max(0, Math.floor((nowMs - stayMs) / MS_PER_DAY)) : null;
        const bucket = days === null ? 'na' : STAY_AGING_BUCKETS.find(b => b.maxDays && days < b.maxDays).key;
        row.aging[bucket]++; agingTotals[bucket]++;
        if (days !== null) watchlist.push(summarize(c, { days }));
        if (!c.sppInformedDate) {
          totals.sppNotInformed++; row.sppNotInformed++; spp.notInformed++;
          sppNotInformedList.push(summarize(c, { days }));
        }
      }
    });

    watchlist.sort((a, b) => b.days - a.days);
    sppNotInformedList.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

    const byDistrict = Array.from(districtMap.values()).sort((a, b) => a.district.localeCompare(b.district));
    const bySpp = Array.from(sppMap.values())
      .map(({ lagTotal, lagCount, ...s }) => ({ ...s, avgLagDays: lagCount ? Math.round(lagTotal / lagCount) : null }))
      .sort((a, b) => (a.assigned === b.assigned ? b.total - a.total : a.assigned ? -1 : 1));

    const result = {
      generatedAt: new Date(nowMs).toISOString(),
      benches: HC_BENCHES,
      caseStatuses: CASE_STATUSES,
      agingBuckets: STAY_AGING_BUCKETS.map(({ key, label }) => ({ key, label })),
      totals: {
        ...totals,
        totalDistricts: districts.length,
        districtsWithCases: byDistrict.filter(d => d.total > 0).length,
        longPending: agingTotals['1to2y'] + agingTotals['2plus'],
        avgSppLagDays: lagDays.length ? Math.round(lagDays.reduce((s, v) => s + v, 0) / lagDays.length) : null
      },
      byDistrict,
      byBench: [...HC_BENCHES.map(b => benchMap[b]), ...(benchUnset.total ? [benchUnset] : [])],
      bySpp,
      byStayType: Object.entries(stayTypeCounts).map(([stayType, count]) => ({ stayType, count })).sort((a, b) => b.count - a.count),
      aging: STAY_AGING_BUCKETS.map(b => ({ key: b.key, label: b.label, count: agingTotals[b.key] })),
      monthlyStays: monthly.map(({ month, count }) => ({ month, count })),
      watchlist,
      sppNotInformed: sppNotInformedList,
      recentCases: cases.slice(0, 6).map(c => summarize(c, { hcCaseStatus: c.hcCaseStatus, createdAt: c.createdAt }))
    };

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.error('Court case analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const courtCase = await prisma.courtCase.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        ...(!isGlobalUser(req.user) && req.user.districtId ? { districtId: req.user.districtId } : {})
      },
      include: {
        ...caseInclude,
        updatedBy: { select: { id: true, fullName: true, email: true } }
      }
    });
    if (!courtCase) return res.status(404).json({ error: 'Court case not found' });
    res.json(courtCase);
  } catch (error) {
    console.error('Fetch court case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const parseAgos = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 50)
    .map(a => ({
      name: clean(a?.name) || '',
      designation: clean(a?.designation),
      department: clean(a?.department),
      subDepartment: clean(a?.subDepartment)
    }))
    .filter(a => a.name || a.designation || a.department || a.subDepartment);
};

const parseActSections = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map(a => ({
      act: clean(a?.act) || '',
      section: clean(a?.section)
    }))
    .filter(a => a.act || a.section);
};

router.post('/', canWrite, async (req, res) => {
  try {
    const validationError = validatePayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    // Admin & Head Office can file for any district; district users stay locked to theirs
    const districtId = isGlobalUser(req.user) ? req.body.districtId : (req.user.districtId || req.body.districtId);
    const data = buildData(req.body);

    const duplicate = await findDuplicate(data);
    if (duplicate) {
      return res.status(409).json({ error: `WP/Crl.P No ${data.wpCrlpNo} (${data.hcBench} bench) is already registered against Crime No ${duplicate.crimeNo}, ${duplicate.district?.name}` });
    }

    const agosList = parseAgos(req.body.agos);
    const actSectionsList = parseActSections(req.body.actSections);

    if (actSectionsList.length > 0) {
      if (!data.act) data.act = actSectionsList.map(a => a.act).filter(Boolean).join(', ');
      if (!data.section) data.section = actSectionsList.map(a => a.section).filter(Boolean).join(', ');
      data.sectionOfLaw = data.section;
    }

    const courtCase = await prisma.courtCase.create({
      data: {
        ...data,
        districtId,
        createdById: req.user.userId,
        updatedById: req.user.userId,
        ...(agosList.length > 0 ? { agos: { create: agosList } } : {}),
        ...(actSectionsList.length > 0 ? { actSections: { create: actSectionsList } } : {})
      },
      include: caseInclude
    });
    await invalidateCourtCaseCaches();
    res.status(201).json(courtCase);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Selected district does not exist' });
    console.error('Create court case error:', error);
    res.status(500).json({ error: 'Failed to create court case' });
  }
});

router.put('/:id', canWrite, async (req, res) => {
  try {
    const existing = await prisma.courtCase.findFirst({ where: { id: req.params.id, isActive: true } });
    if (!existing) return res.status(404).json({ error: 'Court case not found' });
    if (!isGlobalUser(req.user) && req.user.districtId && existing.districtId !== req.user.districtId) {
      return res.status(403).json({ error: 'Access denied: You can only edit court cases in your assigned district' });
    }

    const validationError = validatePayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const districtId = isGlobalUser(req.user) ? req.body.districtId : existing.districtId;
    const data = buildData(req.body);

    const duplicate = await findDuplicate(data, existing.id);
    if (duplicate) {
      return res.status(409).json({ error: `WP/Crl.P No ${data.wpCrlpNo} (${data.hcBench} bench) is already registered against Crime No ${duplicate.crimeNo}, ${duplicate.district?.name}` });
    }

    const shouldUpdateAgos = req.body.agos !== undefined;
    const agosList = shouldUpdateAgos ? parseAgos(req.body.agos) : [];

    const shouldUpdateActSections = req.body.actSections !== undefined;
    const actSectionsList = shouldUpdateActSections ? parseActSections(req.body.actSections) : [];

    if (shouldUpdateActSections && actSectionsList.length > 0) {
      data.act = actSectionsList.map(a => a.act).filter(Boolean).join(', ');
      data.section = actSectionsList.map(a => a.section).filter(Boolean).join(', ');
      data.sectionOfLaw = data.section;
    }

    const courtCase = await prisma.$transaction(async (tx) => {
      if (shouldUpdateAgos) {
        await tx.courtCaseAgo.deleteMany({ where: { caseId: existing.id } });
        if (agosList.length > 0) {
          await tx.courtCaseAgo.createMany({
            data: agosList.map(a => ({ ...a, caseId: existing.id }))
          });
        }
      }
      if (shouldUpdateActSections) {
        await tx.courtCaseActSection.deleteMany({ where: { caseId: existing.id } });
        if (actSectionsList.length > 0) {
          await tx.courtCaseActSection.createMany({
            data: actSectionsList.map(a => ({ ...a, caseId: existing.id }))
          });
        }
      }
      return tx.courtCase.update({
        where: { id: existing.id },
        data: { ...data, districtId, updatedById: req.user.userId },
        include: caseInclude
      });
    });

    await invalidateCourtCaseCaches();
    res.json(courtCase);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Selected district does not exist' });
    console.error('Update court case error:', error);
    res.status(500).json({ error: 'Failed to update court case' });
  }
});

// Soft delete — record is preserved with isActive = false
router.delete('/:id', canWrite, async (req, res) => {
  try {
    const existing = await prisma.courtCase.findFirst({ where: { id: req.params.id, isActive: true } });
    if (!existing) return res.status(404).json({ error: 'Court case not found' });
    if (!isGlobalUser(req.user) && req.user.districtId && existing.districtId !== req.user.districtId) {
      return res.status(403).json({ error: 'Access denied: You can only delete court cases in your assigned district' });
    }

    await prisma.courtCase.update({
      where: { id: existing.id },
      data: { isActive: false, updatedById: req.user.userId }
    });
    await invalidateCourtCaseCaches();
    res.status(204).send();
  } catch (error) {
    console.error('Delete court case error:', error);
    res.status(500).json({ error: 'Failed to delete court case' });
  }
});

module.exports = router;
