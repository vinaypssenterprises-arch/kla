const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const [
      totalPetitions,
      acceptedProposals,
      permissionsObtained,
      firRegistered,
      totalOfficers
    ] = await Promise.all([
      prisma.petition.count(),
      prisma.petition.count({ where: { proposalStatus: 'Accept' } }),
      prisma.respondent.count({ where: { permissionStatus: 'Obtain' } }),
      prisma.petition.count({ where: { peStatus: 'Register FIR' } }),
      prisma.officer.count({ where: { isActive: true } })
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

// District-wise and PE-status-wise breakdowns for the Reports page
router.get('/reports', async (req, res) => {
  try {
    const [petitionsByDistrict, petitionsByPeStatus, officersByDistrict] = await Promise.all([
      prisma.petition.groupBy({ by: ['district'], _count: { _all: true }, orderBy: { district: 'asc' } }),
      prisma.petition.groupBy({ by: ['peStatus'], _count: { _all: true } }),
      prisma.officer.groupBy({ by: ['districtId'], where: { isActive: true }, _count: { _all: true } })
    ]);

    const districts = await prisma.district.findMany({ select: { id: true, name: true } });
    const districtNameById = Object.fromEntries(districts.map(d => [d.id, d.name]));

    res.json({
      petitionsByDistrict: petitionsByDistrict.map(r => ({ district: r.district, count: r._count._all })),
      petitionsByPeStatus: petitionsByPeStatus.map(r => ({ status: r.peStatus || 'Not Set', count: r._count._all })),
      officersByDistrict: officersByDistrict.map(r => ({ district: districtNameById[r.districtId] || 'Unknown', count: r._count._all }))
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comprehensive analytics endpoint for Executive Visualization Dashboard
router.get('/analytics', async (req, res) => {
  try {
    const { district, timeframe } = req.query;

    // Cache analytics results — expensive query, 60s TTL per filter combo
    const cacheKey = `analytics:${district || 'ALL'}:${timeframe || 'all'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const petitionWhere = {};
    const officerWhere = { isActive: true };

    if (district && district !== 'ALL') {
      petitionWhere.district = district;
      officerWhere.district = { name: district };
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
    const [petitions, allDistricts, activeOfficers, allRespondents] = await Promise.all([
      prisma.petition.findMany({
        where: petitionWhere,
        include: {
          respondents: true,
          createdBy: { select: { fullName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.district.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.officer.findMany({
        where: officerWhere,
        select: { id: true, name: true, designation: true, district: { select: { name: true } } }
      }),
      prisma.respondent.findMany({
        where: district && district !== 'ALL' ? { petition: { district } } : {},
        include: {
          petition: {
            select: { id: true, petitionNo: true, district: true, status: true, proposalSentDate: true }
          }
        }
      })
    ]);

    // Calculate Overview KPIs
    const totalPetitions = petitions.length;
    let acceptedProposals = 0;
    let rejectedProposals = 0;
    let pendingProposals = 0;
    let proposalsSentCount = 0;
    let peInitiatedCount = 0;
    let firRegistered = 0;
    let regularEnquiries = 0;
    let casesClosed = 0;

    const peStatusCounts = {};
    const proposalStatusCounts = {};

    petitions.forEach(p => {
      const prop = (p.proposalStatus || '').trim().toLowerCase();
      if (prop === 'accept') acceptedProposals++;
      else if (prop === 'reject') rejectedProposals++;
      else pendingProposals++;

      if (p.proposalSentDate) proposalsSentCount++;
      if (p.peNo || p.peRegDate || p.peStatus) peInitiatedCount++;

      const pe = (p.peStatus || '').trim();
      let peLabel = 'Enquiry in Progress';
      if (pe) {
        if (pe.toLowerCase().includes('fir')) {
          peLabel = 'Register FIR';
          firRegistered++;
        } else if (pe.toLowerCase().includes('regular')) {
          peLabel = 'Regular Enquiry';
          regularEnquiries++;
        } else if (pe.toLowerCase().includes('close') || pe.toLowerCase().includes('drop')) {
          peLabel = 'Closed / Disposed';
          casesClosed++;
        } else {
          peLabel = pe;
        }
      }
      peStatusCounts[peLabel] = (peStatusCounts[peLabel] || 0) + 1;

      const pKey = p.proposalStatus || 'Pending Scrutiny';
      proposalStatusCounts[pKey] = (proposalStatusCounts[pKey] || 0) + 1;
    });

    // Respondent and Permission Statistics
    let permissionsObtained = 0;
    let permissionsPending = 0;
    let permissionsRejected = 0;
    const departmentCounts = {};
    const permissionStatusCounts = {};
    const nowMs = Date.now();
    const caAgingList = [];

    allRespondents.forEach(r => {
      const rawStatus = (r.permissionStatus || '').trim().toLowerCase();
      let displayStatus = 'Awaiting Sanction (Pending)';
      if (rawStatus === 'obtain') {
        displayStatus = 'Permission Obtained';
        permissionsObtained++;
      } else if (rawStatus === 'reject') {
        displayStatus = 'Permission Rejected';
        permissionsRejected++;
      } else {
        permissionsPending++;
      }
      permissionStatusCounts[displayStatus] = (permissionStatusCounts[displayStatus] || 0) + 1;

      // Department aggregation
      const dept = (r.department || 'Other / General Administration').trim();
      if (dept) {
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      }

      // Track all respondents in the CA Watchlist / Status Tracker
      const dispatchDate = r.permissionSentDate || r.petition?.proposalSentDate;
      const sentTime = dispatchDate ? new Date(dispatchDate).getTime() : new Date(r.createdAt).getTime();
      const daysPending = Math.max(0, Math.floor((nowMs - sentTime) / (1000 * 60 * 60 * 24)));
      
      let urgency = 'normal';
      if (rawStatus === 'obtain') {
        urgency = 'obtained';
      } else if (daysPending >= 60) {
        urgency = 'critical';
      } else if (daysPending >= 30) {
        urgency = 'warning';
      }

      caAgingList.push({
        id: r.id,
        petitionId: r.petition?.id,
        petitionNo: r.petition?.petitionNo || 'N/A',
        district: r.petition?.district || 'N/A',
        respondentName: r.name,
        designation: r.designation || 'N/A',
        office: r.office || 'N/A',
        department: r.department || 'N/A',
        caDesignation: r.caDesignation || 'Competent Authority',
        caDepartment: r.caDepartment || r.department || 'N/A',
        caPlace: r.caPlace || 'N/A',
        permissionSentDate: dispatchDate,
        permissionStatus: rawStatus === 'obtain' ? 'Obtained' : rawStatus === 'reject' ? 'Rejected' : 'Pending',
        daysPending,
        urgency
      });
    });

    caAgingList.sort((a, b) => b.daysPending - a.daysPending);

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

    // Monthly Timeline Trend (Last 6-12 months)
    const monthsMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize past 6 calendar months
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

    // Pipeline Funnel data
    const pipelineFunnel = [
      { step: '1. Petitions Registered', count: totalPetitions, color: '#3B82F6', percentage: 100 },
      { step: '2. Proposals Sent to CA', count: proposalsSentCount || Math.min(totalPetitions, acceptedProposals + pendingProposals), color: '#8B5CF6', percentage: totalPetitions ? Math.round(((proposalsSentCount || acceptedProposals) / totalPetitions) * 100) : 0 },
      { step: '3. CA Sanctions Obtained', count: permissionsObtained, color: '#10B981', percentage: totalPetitions ? Math.round((permissionsObtained / totalPetitions) * 100) : 0 },
      { step: '4. Preliminary Enquiry (PE)', count: peInitiatedCount || (totalPetitions ? Math.max(1, firRegistered) : 0), color: '#F59E0B', percentage: totalPetitions ? Math.round((peInitiatedCount / totalPetitions) * 100) : 0 },
      { step: '5. FIRs Registered', count: firRegistered, color: '#EF4444', percentage: totalPetitions ? Math.round((firRegistered / totalPetitions) * 100) : 0 }
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

    // Statutory pending counts
    const criticalPendingCount = caAgingList.filter(c => c.urgency === 'critical').length;
    const warningPendingCount = caAgingList.filter(c => c.urgency === 'warning').length;

    const analyticsResult = {
      districts: allDistricts.map(d => d.name),
      selectedDistrict: district || 'ALL',
      overview: {
        totalPetitions,
        acceptedProposals,
        rejectedProposals,
        pendingProposals,
        permissionsObtained,
        permissionsPending,
        permissionsRejected,
        firRegistered,
        regularEnquiries,
        casesClosed,
        totalOfficers: activeOfficers.length,
        totalRespondents: allRespondents.length,
        acceptanceRate: totalPetitions ? Math.round((acceptedProposals / totalPetitions) * 100) : 0,
        permissionRate: allRespondents.length ? Math.round((permissionsObtained / allRespondents.length) * 100) : 0,
        firRate: totalPetitions ? Math.round((firRegistered / totalPetitions) * 100) : 0,
        criticalPendingCount,
        warningPendingCount,
        totalPendingCa: caAgingList.length
      },
      pipelineFunnel,
      districtBreakdown: districtBreakdown.filter(d => d.totalActivity > 0 || districtBreakdown.indexOf(d) < 10),
      topDepartments,
      permissionChartData,
      peChartData,
      monthlyTrends,
      statutoryAgingWatchlist: caAgingList.slice(0, 10),
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

