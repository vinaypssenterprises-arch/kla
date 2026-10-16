const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictName = req.user.districtName;
    const userDistrictId = req.user.districtId;

    const petitionFilter = !isGlobalUser && userDistrictName
      ? { district: { equals: userDistrictName, mode: 'insensitive' } }
      : {};
    const officerFilter = !isGlobalUser && userDistrictId
      ? { districtId: userDistrictId, isActive: true }
      : { isActive: true };

    const [
      totalPetitions,
      acceptedProposals,
      permissionsObtained,
      firRegistered,
      totalOfficers
    ] = await Promise.all([
      prisma.petition.count({ where: petitionFilter }),
      prisma.petition.count({ where: { ...petitionFilter, proposalStatus: 'Accept' } }),
      prisma.respondent.count({ where: { ...(petitionFilter.district ? { petition: petitionFilter } : {}), permissionStatus: 'Obtain' } }),
      prisma.petition.count({ where: { ...petitionFilter, peStatus: 'Register FIR' } }),
      prisma.officer.count({ where: officerFilter })
    ]);

    res.json({
      totalPetitions,
      acceptedProposals,
      permissionsObtained,
      firRegistered,
      totalOfficers
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Standard Karnataka Lokayukta SP Police Division Units / Districts in order
// Standard Karnataka Lokayukta SP Police Division Units / Districts in preferred order
const PREFERRED_DISTRICT_ORDER = [
  'Bengaluru City 1', 'Bengaluru City 2', 'Bengaluru Rural', 'Bengaluru South',
  'Bagalkote', 'Ballari', 'Belagavi', 'Bidar', 'Chamarajanagar',
  'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Davanagere', 'Dharwad',
  'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Karwar', 'Kodagu', 'Kolar',
  'Koppal', 'Mandya', 'Mangalore', 'Mysuru', 'Raichur', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Vijayanagara', 'Vijayapura', 'Yadgir'
];

function normalizeDistrictName(rawName) {
  if (!rawName) return 'OTHER';
  const clean = rawName.trim().toUpperCase();
  if (clean.includes('SP-1') || clean.includes('SP 1') || clean === 'SP1 BNG CITY' || clean === 'BENGALURU CITY 1' || clean === 'BANGALORE CITY 1') return 'Bengaluru City 1';
  if (clean.includes('SP-2') || clean.includes('SP 2') || clean === 'SP2 BNG CITY' || clean === 'BENGALURU CITY 2' || clean === 'BANGALORE CITY 2') return 'Bengaluru City 2';
  if (clean === 'BENGALURU URBAN' || clean === 'BANGALORE URBAN') return 'Bengaluru City 1';
  if (clean === 'BENGALURU RURAL' || clean === 'BANGALORE RURAL') return 'Bengaluru Rural';
  if (clean === 'BENGALURU SOUTH' || clean === 'BANGALORE SOUTH') return 'Bengaluru South';
  if (clean === 'BAGALKOTE' || clean === 'BAGALKOT') return 'Bagalkote';
  if (clean === 'BELAGAVI' || clean === 'BELGAVI') return 'Belagavi';
  if (clean === 'BALLARI' || clean === 'BELLARY') return 'Ballari';
  if (clean === 'BIDAR') return 'Bidar';
  if (clean === 'CHAMARAJANAGAR' || clean === 'CHAMRAJNAGAR') return 'Chamarajanagar';
  if (clean === 'CHIKKABALLAPURA' || clean === 'CHIKKABALLAPUR') return 'Chikkaballapura';
  if (clean === 'CHIKKAMAGALURU' || clean === 'CHIKKAMAGALUR') return 'Chikkamagaluru';
  if (clean === 'CHITRADURGA') return 'Chitradurga';
  if (clean === 'DAVANAGERE' || clean === 'DAVANGERE') return 'Davanagere';
  if (clean === 'DHARWAD') return 'Dharwad';
  if (clean === 'GADAG') return 'Gadag';
  if (clean === 'HASSAN') return 'Hassan';
  if (clean === 'HAVERI') return 'Haveri';
  if (clean === 'HOSPET' || clean === 'VIJAYANAGARA') return 'Vijayanagara';
  if (clean === 'KALABURAGI' || clean === 'KALBURGI') return 'Kalaburagi';
  if (clean === 'KARWAR' || clean === 'UTTARA KANNADA') return 'Karwar';
  if (clean === 'KODAGU') return 'Kodagu';
  if (clean === 'KOLAR') return 'Kolar';
  if (clean === 'KOPPAL') return 'Koppal';
  if (clean === 'MANDYA') return 'Mandya';
  if (clean === 'MANGALORE' || clean === 'DAKSHINA KANNADA') return 'Mangalore';
  if (clean === 'MYSURU' || clean === 'MYSORE') return 'Mysuru';
  if (clean === 'RAICHUR') return 'Raichur';
  if (clean === 'RAMANAGARA') return 'Ramanagara';
  if (clean === 'SHIVAMOGGA') return 'Shivamogga';
  if (clean === 'TUMAKURU' || clean === 'TUMKUR') return 'Tumakuru';
  if (clean === 'UDUPI') return 'Udupi';
  if (clean === 'VIJAYAPURA' || clean === 'BIJAPUR') return 'Vijayapura';
  if (clean === 'YADGIR') return 'Yadgir';
  if (clean === 'HEAD OFFICE') return 'Head Office';
  return rawName.trim();
}

function getPetitionYear(p) {
  if (p.petitionNo && typeof p.petitionNo === 'string') {
    const m = p.petitionNo.match(/\/(\d{4})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 2000 && y <= 2099) return y;
    }
  }
  if (p.proposalSentDate) {
    const d = new Date(p.proposalSentDate);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  if (p.createdAt) {
    const d = new Date(p.createdAt);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return new Date().getFullYear();
}

function getPetitionDate(p) {
  if (p.proposalSentDate) {
    const d = new Date(p.proposalSentDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (p.createdAt) {
    const d = new Date(p.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function normalizePeStatus(raw) {
  if (!raw) return '';
  const s = raw.trim().toLowerCase();
  if (s === 'registered fir' || s === 'registeredfir') return 'Registered FIR';
  if (s === 'register fir' || s === 'registerfir' || s === 'fir') return 'Register FIR';
  if (s === 'pe pending' || s === 'pepending' || s === 'pending') return 'PE Pending';
  if (s === 'recommended to de' || s.includes('de') || s.includes('departmental')) return 'Recommended to DE';
  if (s === 'close' || s === 'closed' || s === 'drop' || s === 'disposed') return 'Close';
  if (s.includes('stay') || s.includes('high court')) return 'High Court Stay';
  return raw.trim();
}

// District-wise and PE-status-wise breakdowns for the Reports page
router.get('/reports', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictName = req.user.districtName;
    const userDistrictId = req.user.districtId;

    const fromDateStr = req.query.fromDate ? req.query.fromDate.trim() : null;
    const toDateStr = req.query.toDate ? req.query.toDate.trim() : null;
    let filterDistrict = req.query.district ? req.query.district.trim() : null;
    if (!isGlobalUser && userDistrictName) {
      filterDistrict = userDistrictName;
    }

    let fromDate = fromDateStr ? new Date(`${fromDateStr}T00:00:00.000Z`) : null;
    let toDate = toDateStr ? new Date(`${toDateStr}T23:59:59.999Z`) : null;
    const currentYear = new Date().getFullYear();
    const isAllYears = req.query.year === 'ALL';
    const focusYear = isAllYears ? 'ALL' : (fromDate ? fromDate.getFullYear() : (parseInt(req.query.year) || currentYear));

    const [allDbDistricts, petitions, peGroups, officersByDistrict] = await Promise.all([
      prisma.district.findMany({
        where: {
          isActive: true,
          ...((!isGlobalUser && userDistrictId) ? { id: userDistrictId } : {})
        },
        select: { id: true, name: true }
      }),
      prisma.petition.findMany({
        where: (!isGlobalUser && userDistrictName) ? { district: { equals: userDistrictName, mode: 'insensitive' } } : {},
        select: {
          id: true,
          district: true,
          petitionNo: true,
          proposalStatus: true,
          status: true,
          proposalSentDate: true,
          createdAt: true,
          peStatus: true,
          respondents: {
            select: {
              permissionStatus: true,
              permissionSentDate: true,
              caDesignation: true
            }
          }
        }
      }),
      prisma.petition.groupBy({
        by: ['peStatus'],
        where: (!isGlobalUser && userDistrictName) ? { district: { equals: userDistrictName, mode: 'insensitive' } } : {},
        _count: { _all: true }
      }),
      prisma.officer.groupBy({
        by: ['districtId'],
        where: { isActive: true },
        _count: { _all: true }
      })
    ]);

    // Calculate dynamic start year (earliest recorded year from petitions, e.g. 2016)
    let minYear = 2016;
    petitions.forEach(p => {
      const y = getPetitionYear(p);
      if (y && y >= 2000 && y < minYear) minYear = y;
    });
    const startYear = minYear;

    const historicalYears = [];
    if (isAllYears) {
      for (let y = startYear; y <= currentYear; y++) {
        historicalYears.push(y);
      }
    } else {
      for (let y = startYear; y < focusYear; y++) {
        historicalYears.push(y);
      }
    }

    const districtNameById = Object.fromEntries(allDbDistricts.map(d => [d.id, d.name]));

    const activeDbList = allDbDistricts.map(d => normalizeDistrictName(d.name));
    const orderedDistricts = (!isGlobalUser && userDistrictName)
      ? [normalizeDistrictName(userDistrictName)]
      : [...activeDbList].sort((a, b) => {
          const idxA = PREFERRED_DISTRICT_ORDER.indexOf(a);
          const idxB = PREFERRED_DISTRICT_ORDER.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });

    const PE_KEYS = [
      'Registered FIR',
      'Register FIR',
      'PE Pending',
      'Recommended to DE',
      'Close',
      'High Court Stay'
    ];

    const districtStatsMap = {};
    orderedDistricts.forEach(dist => {
      districtStatsMap[dist] = {
        district: dist,
        historical: {},
        totalReceivedAtHq: 0,
        notSentToCA: 0,
        proposalsSentToCA: 0,
        proposalsSentBackToDist: 0,
        pendingWithCA: 0,
        peBreakdown: {
          'Registered FIR': 0,
          'Register FIR': 0,
          'PE Pending': 0,
          'Recommended to DE': 0,
          'Close': 0,
          'High Court Stay': 0
        }
      };
      historicalYears.forEach(y => {
        districtStatsMap[dist].historical[y] = 0;
      });
    });

    petitions.forEach(p => {
      const normDist = normalizeDistrictName(p.district);
      if (!districtStatsMap[normDist]) {
        districtStatsMap[normDist] = {
          district: normDist,
          historical: {},
          totalReceivedAtHq: 0,
          notSentToCA: 0,
          proposalsSentToCA: 0,
          proposalsSentBackToDist: 0,
          pendingWithCA: 0,
          peBreakdown: {
            'Registered FIR': 0,
            'Register FIR': 0,
            'PE Pending': 0,
            'Recommended to DE': 0,
            'Close': 0,
            'High Court Stay': 0
          }
        };
        historicalYears.forEach(y => {
          districtStatsMap[normDist].historical[y] = 0;
        });
      }

      const pYear = getPetitionYear(p);
      const pDate = getPetitionDate(p);
      const row = districtStatsMap[normDist];

      if (isAllYears) {
        if (row.historical[pYear] !== undefined) {
          row.historical[pYear]++;
        }
        if (fromDate && pDate < fromDate) return;
        if (toDate && pDate > toDate) return;

        row.totalReceivedAtHq++;

        const propStatus = (p.proposalStatus || '').trim().toLowerCase();
        const pStatus = (p.status || '').trim();

        const isSentBackToDist = 
          propStatus.includes('returned') ||
          pStatus === '17A_RETURNED';

        const hasDateSentToCA = Boolean(
          (p.proposalSentDate != null && String(p.proposalSentDate).trim() !== '') ||
          (p.respondents && p.respondents.some(r => r.permissionSentDate != null && String(r.permissionSentDate).trim() !== ''))
        );

        // Not Sent to CA: Date Sent to CA is not updated and not returned back to dist
        const isNotSentToCA = !hasDateSentToCA && !isSentBackToDist;

        // Proposals Sent to CA: only if Date Sent to CA is updated and not returned
        const isSentToCA = !isSentBackToDist && hasDateSentToCA;

        // Pending with CA: until PE Status is updated
        const peStat = (p.peStatus || '').trim();
        const isPendingWithCA = isSentToCA && peStat === '';

        if (isNotSentToCA) row.notSentToCA++;
        if (isSentToCA) row.proposalsSentToCA++;
        if (isSentBackToDist) row.proposalsSentBackToDist++;
        if (isPendingWithCA) row.pendingWithCA++;

        if (peStat !== '') {
          PE_KEYS.forEach(k => {
            if (peStat.toLowerCase() === k.toLowerCase()) {
              row.peBreakdown[k] = (row.peBreakdown[k] || 0) + 1;
            }
          });
        }
      } else {
        if (pYear < focusYear) {
          if (row.historical[pYear] !== undefined) {
            row.historical[pYear]++;
          }
        } else if (pYear === focusYear) {
          if (fromDate && pDate < fromDate) return;
          if (toDate && pDate > toDate) return;

          row.totalReceivedAtHq++;

          const propStatus = (p.proposalStatus || '').trim().toLowerCase();
          const pStatus = (p.status || '').trim();

          const isSentBackToDist = 
            propStatus.includes('returned') ||
            pStatus === '17A_RETURNED';

          const hasDateSentToCA = Boolean(
            (p.proposalSentDate != null && String(p.proposalSentDate).trim() !== '') ||
            (p.respondents && p.respondents.some(r => r.permissionSentDate != null && String(r.permissionSentDate).trim() !== ''))
          );

          // Not Sent to CA: Date Sent to CA is not updated and not returned back to dist
          const isNotSentToCA = !hasDateSentToCA && !isSentBackToDist;

          // Proposals Sent to CA: only if Date Sent to CA is updated and not returned
          const isSentToCA = !isSentBackToDist && hasDateSentToCA;

          // Pending with CA: until PE Status is updated
          const peStat = (p.peStatus || '').trim();
          const isPendingWithCA = isSentToCA && peStat === '';

          if (isNotSentToCA) row.notSentToCA++;
          if (isSentToCA) row.proposalsSentToCA++;
          if (isSentBackToDist) row.proposalsSentBackToDist++;
          if (isPendingWithCA) row.pendingWithCA++;

          if (peStat !== '') {
            PE_KEYS.forEach(k => {
              if (peStat.toLowerCase() === k.toLowerCase()) {
                row.peBreakdown[k] = (row.peBreakdown[k] || 0) + 1;
              }
            });
          }
        }
      }
    });

    let districtStats = orderedDistricts.map((dist, idx) => ({
      slNo: idx + 1,
      ...districtStatsMap[dist]
    }));

    if (filterDistrict && filterDistrict !== 'ALL') {
      const normFilter = normalizeDistrictName(filterDistrict);
      districtStats = districtStats.filter(d => d.district === normFilter);
    }

    const totals = {
      historical: {},
      totalReceivedAtHq: 0,
      notSentToCA: 0,
      proposalsSentToCA: 0,
      proposalsSentBackToDist: 0,
      pendingWithCA: 0,
      peBreakdown: {
        'Registered FIR': 0,
        'Register FIR': 0,
        'PE Pending': 0,
        'Recommended to DE': 0,
        'Close': 0,
        'High Court Stay': 0
      }
    };
    historicalYears.forEach(y => {
      totals.historical[y] = 0;
    });

    districtStats.forEach(row => {
      historicalYears.forEach(y => {
        totals.historical[y] += (row.historical[y] || 0);
      });
      totals.totalReceivedAtHq += row.totalReceivedAtHq;
      totals.notSentToCA += row.notSentToCA;
      totals.proposalsSentToCA += row.proposalsSentToCA;
      totals.proposalsSentBackToDist += row.proposalsSentBackToDist;
      totals.pendingWithCA += row.pendingWithCA;
      PE_KEYS.forEach(k => {
        totals.peBreakdown[k] = (totals.peBreakdown[k] || 0) + (row.peBreakdown[k] || 0);
      });
    });

    const petitionsByDistrict = districtStats.map(d => ({
      district: d.district,
      count: isAllYears ? d.totalReceivedAtHq : (d.totalReceivedAtHq + Object.values(d.historical).reduce((a, b) => a + b, 0))
    }));

    res.json({
      focusYear,
      fromDate: fromDateStr,
      toDate: toDateStr,
      selectedDistrict: filterDistrict || 'ALL',
      historicalYears,
      districtStats,
      totals,
      petitionsByDistrict,
      petitionsByPeStatus: peGroups.map(r => ({ status: r.peStatus || 'Not Set', count: r._count._all })),
      officersByDistrict: (officersByDistrict || []).map(r => ({ district: districtNameById[r.districtId] || 'Unknown', count: r._count?._all || 0 }))
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comprehensive analytics endpoint for Executive Visualization Dashboard
router.get('/analytics', async (req, res) => {
  try {
    const isGlobalUser = req.user.role === 'admin' || req.user.isHeadOffice === true;
    const userDistrictName = req.user.districtName;
    const userDistrictId = req.user.districtId;

    let targetDistrict = req.query.district;
    if (!isGlobalUser && userDistrictName) {
      targetDistrict = userDistrictName;
    }

    const { timeframe } = req.query;

    // Cache analytics results — expensive query, 60s TTL per filter combo
    const cacheKey = `analytics:${targetDistrict || 'ALL'}:${timeframe || 'all'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const petitionWhere = {};
    const officerWhere = { isActive: true };

    if (targetDistrict && targetDistrict !== 'ALL') {
      petitionWhere.district = { equals: targetDistrict, mode: 'insensitive' };
      officerWhere.district = { name: { equals: targetDistrict, mode: 'insensitive' } };
    }

    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let days = 30;
      if (timeframe === '90d') days = 90;
      if (timeframe === '1y') days = 365;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      petitionWhere.createdAt = { gte: cutoff };
    }

    // Fetch all petitions matching criteria with respondents
    const [petitions, allDistricts, activeOfficers] = await Promise.all([
      prisma.petition.findMany({
        where: petitionWhere,
        include: {
          respondents: true,
          createdBy: { select: { fullName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.district.findMany({
        where: {
          isActive: true,
          ...((!isGlobalUser && userDistrictId) ? { id: userDistrictId } : {})
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.officer.findMany({
        where: officerWhere,
        select: { id: true, name: true, designation: true, district: { select: { name: true } } }
      })
    ]);

    // Derive respondents directly from petitions to avoid expensive duplicate DB query
    const allRespondents = petitions.flatMap(p => (p.respondents || []).map(r => ({ ...r, petition: p })));

    // Calculate Overview KPIs (Proposals & Respondents unified with Reports)
    const totalPetitions = petitions.length;
    let proposalsSentToCA = 0;
    let proposalsNotSentToCA = 0;
    let proposalsBackToDist = 0;
    let proposalsPendingWithCA = 0;
    let proposalsPeActionTaken = 0;
    let proposalsSanctionsObtained = 0;
    let proposalsSanctionsRejected = 0;
    let proposalsFirRegistered = 0;
    let proposalsRegisterFir = 0;
    let proposalsPePending = 0;
    let proposalsClosed = 0;
    let proposalsRecommendedDE = 0;
    let proposalsHCStay = 0;

    let respondentsTotal = 0;
    let respondentsSentToCA = 0;
    let respondentsNotSentToCA = 0;
    let respondentsBackToDist = 0;
    let respondentsPendingWithCA = 0;
    let respondentsObtained = 0;
    let respondentsRejected = 0;
    let respondentsFirRegistered = 0;
    let respondentsRegisterFir = 0;
    let respondentsPePending = 0;
    let respondentsRecommendedDE = 0;
    let respondentsClosed = 0;
    let respondentsHCStay = 0;

    const departmentCounts = {};
    const permissionStatusCounts = {
      'Permission Obtained': 0,
      'Awaiting Sanction (Pending)': 0,
      'Permission Rejected': 0
    };
    const peStatusCounts = {};
    const proposalStatusCounts = {};
    const nowMs = Date.now();
    const caAgingList = []; // Only cases/respondents awaiting decision from CA
    const pendingPetitionsAging = [];

    petitions.forEach(p => {
      const propStatus = (p.proposalStatus || '').trim().toLowerCase();
      const pStatus = (p.status || '').trim();
      const isReturned = propStatus.includes('returned') || pStatus === '17A_RETURNED';
      const hasDateSentToCA = Boolean(
        (p.proposalSentDate != null && String(p.proposalSentDate).trim() !== '') ||
        (p.respondents && p.respondents.some(r => r.permissionSentDate != null && String(r.permissionSentDate).trim() !== ''))
      );

      const isSentToCA = !isReturned && hasDateSentToCA;
      const isNotSentToCA = !isReturned && !hasDateSentToCA;
      const peStat = (p.peStatus || '').trim();
      const isPendingWithCA = isSentToCA && peStat === '';
      const isPeAction = isSentToCA && peStat !== '';
      const peNorm = normalizePeStatus(p.peStatus);

      if (isSentToCA) proposalsSentToCA++;
      if (isNotSentToCA) proposalsNotSentToCA++;
      if (isReturned) proposalsBackToDist++;
      if (isPendingWithCA) {
        proposalsPendingWithCA++;
        const pDispatchDate = p.proposalSentDate || p.createdAt;
        const sentTime = pDispatchDate ? new Date(pDispatchDate).getTime() : nowMs;
        const days = isNaN(sentTime) ? 0 : Math.max(0, Math.floor((nowMs - sentTime) / (1000 * 60 * 60 * 24)));
        pendingPetitionsAging.push(days);
      }
      if (isPeAction) proposalsPeActionTaken++;

      if (isSentToCA) {
        if (peNorm === 'Registered FIR') proposalsFirRegistered++;
        else if (peNorm === 'Register FIR') proposalsRegisterFir++;
        else if (peNorm === 'PE Pending') proposalsPePending++;
        else if (peNorm === 'Close') proposalsClosed++;
        else if (peNorm === 'Recommended to DE') proposalsRecommendedDE++;
        else if (peNorm === 'High Court Stay') proposalsHCStay++;
      }

      if (peNorm) {
        peStatusCounts[peNorm] = (peStatusCounts[peNorm] || 0) + 1;
      }

      const pKey = isReturned ? 'Returned to District' : (isSentToCA ? 'Sent to CA' : 'Pending at HQ');
      proposalStatusCounts[pKey] = (proposalStatusCounts[pKey] || 0) + 1;

      const resps = p.respondents || [];
      const hasObtain = resps.some(r => (r.permissionStatus || '').toLowerCase() === 'obtain');
      const hasReject = resps.some(r => (r.permissionStatus || '').toLowerCase() === 'reject');
      if (isSentToCA && hasObtain) proposalsSanctionsObtained++;
      if (isSentToCA && hasReject) proposalsSanctionsRejected++;

      // Department aggregation: count at most once per petition for each department
      const uniqueDepts = new Set(resps.map(r => (r.department || '').trim()).filter(Boolean));
      uniqueDepts.forEach(dept => {
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });

      // Process Respondents
      resps.forEach(r => {
        respondentsTotal++;
        const rSentDate = r.permissionSentDate || p.proposalSentDate;
        const rHasDate = Boolean(rSentDate && String(rSentDate).trim() !== '');
        const rStat = (r.permissionStatus || 'Pending').toLowerCase();

        if (isReturned) {
          respondentsBackToDist++;
        } else if (!rHasDate) {
          respondentsNotSentToCA++;
        } else {
          respondentsSentToCA++;
          if (rStat === 'obtain') {
            respondentsObtained++;
            permissionStatusCounts['Permission Obtained']++;
          } else if (rStat === 'reject') {
            respondentsRejected++;
            permissionStatusCounts['Permission Rejected']++;
          } else {
            respondentsPendingWithCA++;
            permissionStatusCounts['Awaiting Sanction (Pending)']++;
          }

          if (peNorm === 'Registered FIR') respondentsFirRegistered++;
          else if (peNorm === 'Register FIR') respondentsRegisterFir++;
          else if (peNorm === 'PE Pending') respondentsPePending++;
          else if (peNorm === 'Recommended to DE') respondentsRecommendedDE++;
          else if (peNorm === 'Close') respondentsClosed++;
          else if (peNorm === 'High Court Stay') respondentsHCStay++;
        }

        // Add to CA Watchlist if sent to CA and pending decision
        if (isSentToCA && rHasDate && rStat !== 'obtain' && rStat !== 'reject') {
          const sentTime = rSentDate ? new Date(rSentDate).getTime() : nowMs;
          const daysPending = isNaN(sentTime) ? 0 : Math.max(0, Math.floor((nowMs - sentTime) / (1000 * 60 * 60 * 24)));
          let urgency = 'normal';
          if (daysPending >= 60) urgency = 'critical';
          else if (daysPending >= 30) urgency = 'warning';

          caAgingList.push({
            id: r.id,
            petitionId: p.id,
            petitionNo: p.petitionNo || 'N/A',
            district: p.district || 'N/A',
            respondentName: r.name,
            designation: r.designation || 'N/A',
            office: r.office || 'N/A',
            department: r.department || 'N/A',
            caDesignation: r.caDesignation || 'Competent Authority',
            caDepartment: r.caDepartment || r.department || 'N/A',
            caPlace: r.caPlace || 'N/A',
            permissionSentDate: rSentDate,
            permissionStatus: 'Pending',
            daysPending,
            urgency
          });
        }
      });
    });

    caAgingList.sort((a, b) => b.daysPending - a.daysPending);

    // Aging Counts
    const criticalPetitionCount = pendingPetitionsAging.filter(d => d >= 60).length;
    const warningPetitionCount = pendingPetitionsAging.filter(d => d >= 30 && d < 60).length;
    const criticalRespondentCount = caAgingList.filter(c => c.daysPending >= 60).length;
    const warningRespondentCount = caAgingList.filter(c => c.daysPending >= 30 && c.daysPending < 60).length;

    // District-wise comparative breakdown
    const districtPetitionsMap = {};
    const districtOfficersMap = {};
    const districtRespondentsMap = {};

    petitions.forEach(p => {
      districtPetitionsMap[p.district] = (districtPetitionsMap[p.district] || 0) + 1;
      p.respondents?.forEach(r => {
        districtRespondentsMap[p.district] = (districtRespondentsMap[p.district] || 0) + 1;
      });
    });

    activeOfficers.forEach(o => {
      const dName = o.district?.name || 'Unassigned';
      districtOfficersMap[dName] = (districtOfficersMap[dName] || 0) + 1;
    });

    const allDistrictStats = allDistricts.map(d => ({
      name: d.name,
      petitions: districtPetitionsMap[d.name] || 0,
      officers: districtOfficersMap[d.name] || 0,
      respondents: districtRespondentsMap[d.name] || 0,
      totalActivity: (districtPetitionsMap[d.name] || 0) + (districtOfficersMap[d.name] || 0)
    })).sort((a, b) => b.petitions - a.petitions || b.officers - a.officers);

    // Only active districts to keep it completely neat and avoid empty rotated columns
    const activeDistricts = allDistrictStats.filter(d => d.totalActivity > 0);
    const districtBreakdown = activeDistricts.length > 0 ? activeDistricts : allDistrictStats.slice(0, 5);

    // Top Departments Scrutiny
    const topDepartments = Object.entries(departmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Permission Breakdown Array for Charts
    const permissionChartData = Object.entries(permissionStatusCounts).map(([name, value]) => ({
      name,
      value
    }));

    // PE Status Breakdown Array for Charts
    const peChartData = Object.entries(peStatusCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Monthly Timeline Trend (Last 6 calendar months)
    const monthsMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthsMap[key] = { month: key, petitions: 0, sanctions: 0, firs: 0 };
    }

    petitions.forEach(p => {
      const d = new Date(p.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthsMap[key]) {
        monthsMap[key].petitions++;
        if (p.peStatus && p.peStatus.toLowerCase().includes('fir')) {
          monthsMap[key].firs++;
        }
      }
    });

    allRespondents.forEach(r => {
      if (r.permissionReceivedFromCA) {
        const d = new Date(r.permissionReceivedFromCA);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (monthsMap[key]) {
          monthsMap[key].sanctions++;
        }
      }
    });

    const monthlyTrends = Object.values(monthsMap);

    // Pipeline Funnel data for Proposals
    const pipelineFunnel = [
      { step: '1. Petitions Registered', count: totalPetitions, color: '#3B82F6', percentage: 100 },
      { step: '2. Proposals Sent to CA', count: proposalsSentToCA, color: '#8B5CF6', percentage: totalPetitions ? Math.round((proposalsSentToCA / totalPetitions) * 100) : 0 },
      { step: '3. Sanctions Obtained', count: proposalsSanctionsObtained, color: '#10B981', percentage: totalPetitions ? Math.round((proposalsSanctionsObtained / totalPetitions) * 100) : 0 },
      { step: '4. PE Action Taken', count: proposalsPeActionTaken, color: '#F59E0B', percentage: totalPetitions ? Math.round((proposalsPeActionTaken / totalPetitions) * 100) : 0 },
      { step: '5. FIRs Registered', count: (proposalsFirRegistered + proposalsRegisterFir), color: '#EF4444', percentage: totalPetitions ? Math.round(((proposalsFirRegistered + proposalsRegisterFir) / totalPetitions) * 100) : 0 }
    ];

    // Pipeline Funnel data for Respondents
    const respondentsPipelineFunnel = [
      { step: '1. Accused Registered', count: respondentsTotal, color: '#3B82F6', percentage: 100 },
      { step: '2. Accused Sent to CA', count: respondentsSentToCA, color: '#8B5CF6', percentage: respondentsTotal ? Math.round((respondentsSentToCA / respondentsTotal) * 100) : 0 },
      { step: '3. CA Sanctions Obtained', count: respondentsObtained, color: '#10B981', percentage: respondentsTotal ? Math.round((respondentsObtained / respondentsTotal) * 100) : 0 },
      { step: '4. PE Outcome Decided', count: (respondentsFirRegistered + respondentsRegisterFir + respondentsPePending + respondentsClosed + respondentsHCStay), color: '#F59E0B', percentage: respondentsTotal ? Math.round(((respondentsFirRegistered + respondentsRegisterFir + respondentsPePending + respondentsClosed + respondentsHCStay) / respondentsTotal) * 100) : 0 },
      { step: '5. FIRs Registered', count: (respondentsFirRegistered + respondentsRegisterFir), color: '#EF4444', percentage: respondentsTotal ? Math.round(((respondentsFirRegistered + respondentsRegisterFir) / respondentsTotal) * 100) : 0 }
    ];

    // Recent Petitions list
    const recentPetitions = petitions.slice(0, 7).map(p => ({
      id: p.id,
      petitionNo: p.petitionNo,
      petitionerName: p.petitionerName,
      district: p.district,
      proposalStatus: p.proposalStatus || 'Pending',
      peStatus: p.peStatus || 'Pending',
      status: p.status,
      respondentCount: p.respondents?.length || 0,
      createdAt: p.createdAt
    }));

    const totalFir = proposalsFirRegistered + proposalsRegisterFir;

    const analyticsResult = {
      districts: allDistricts.map(d => d.name),
      selectedDistrict: targetDistrict || 'ALL',
      overview: {
        // Proposals / Petitions (Primary)
        totalPetitions,
        proposalsSentToCA,
        proposalsNotSentToCA,
        proposalsBackToDist,
        acceptedProposals: proposalsSentToCA, // backwards-compatible mapping
        pendingProposals: proposalsPendingWithCA,
        proposalsPendingWithCA,
        peActionTaken: proposalsPeActionTaken,
        firRegistered: totalFir,
        proposalsSanctionsObtained,
        proposalsSanctionsRejected,
        totalOfficers: activeOfficers.length,
        criticalPendingCount: criticalPetitionCount,
        warningPendingCount: warningPetitionCount,
        totalPendingCa: proposalsPendingWithCA, // Exact 181 proposals!
        
        // Respondents / Accused
        totalRespondents: respondentsTotal, // 1,005
        respondentsSentToCA, // 906
        respondentsNotSentToCA, // 21
        respondentsBackToDist, // 78
        respondentsPendingWithCA, // 610
        permissionsObtained: respondentsObtained, // 259
        permissionsPending: respondentsPendingWithCA, // 610
        permissionsRejected: respondentsRejected, // 37
        respondentsFirRegistered: (respondentsFirRegistered + respondentsRegisterFir),
        respondentsCriticalPendingCount: criticalRespondentCount, // 565
        respondentsWarningPendingCount: warningRespondentCount, // 35
        totalPendingRespondents: respondentsPendingWithCA, // 610
        
        // Rates
        acceptanceRate: totalPetitions ? Math.round((proposalsSentToCA / totalPetitions) * 100) : 0,
        sanctionRate: proposalsSentToCA ? Math.round((proposalsSanctionsObtained / proposalsSentToCA) * 100) : 0,
        firRate: totalPetitions ? Math.round((totalFir / totalPetitions) * 100) : 0,
        permissionRate: respondentsSentToCA ? Math.round((respondentsObtained / respondentsSentToCA) * 100) : 0
      },
      pipelineFunnel,
      respondentsPipelineFunnel,
      districtBreakdown: districtBreakdown.filter(d => d.totalActivity > 0 || districtBreakdown.indexOf(d) < 10),
      topDepartments,
      permissionChartData,
      peChartData,
      monthlyTrends,
      statutoryAgingWatchlist: caAgingList.slice(0, 30),
      recentPetitions
    };

    // Cache for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(analyticsResult));
    res.json(analyticsResult);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

