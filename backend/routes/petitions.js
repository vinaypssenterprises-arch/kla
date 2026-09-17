const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware } = require('./auth');

// Middleware to apply auth to all petition routes
router.use(authMiddleware);

const getIncludeOpts = () => ({
  respondents: true,
  remarks: true,
  history: {
    include: { actionBy: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  },
  createdBy: { select: { id: true, supervisorUserId: true } }
});

// Get all petitions — server-side pagination + search for 1200-officer scale
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 25, 1), 100);
    const search = (req.query.search || '').trim();
    const districtFilter = req.query.district || '';
    const statusFilter = req.query.status || '';

    let allowedCreatorIds = null;
    if (req.user.role !== 'admin') {
      const supervisees = await prisma.user.findMany({
        where: { supervisorUserId: req.user.userId },
        select: { id: true }
      });
      allowedCreatorIds = [req.user.userId, ...supervisees.map(s => s.id)];
    }

    const where = {
      ...(allowedCreatorIds ? { createdById: { in: allowedCreatorIds } } : {}),
      ...(districtFilter ? { district: districtFilter } : {}),
      ...(statusFilter ? { peStatus: statusFilter } : {}),
      ...(search ? {
        OR: [
          { petitionNo: { contains: search, mode: 'insensitive' } },
          { petitionerName: { contains: search, mode: 'insensitive' } },
          { district: { contains: search, mode: 'insensitive' } },
          { respondents: { some: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      } : {})
    };

    // Try cache only for admin with no filters (most expensive query)
    const isUnfiltered = req.user.role === 'admin' && !search && !districtFilter && !statusFilter && page === 1;
    const cacheKey = `petitions:p${page}:ps${pageSize}`;
    if (isUnfiltered) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const [petitions, total] = await Promise.all([
      prisma.petition.findMany({
        where,
        include: getIncludeOpts(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.petition.count({ where })
    ]);

    const result = { data: petitions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };

    if (isUnfiltered) {
      await redisClient.setEx(cacheKey, 30, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    console.error('Fetch petitions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new petition
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const respondentsData = data.respondents || [];

    const newPetition = await prisma.petition.create({
      data: {
        district: data.district,
        petitionNo: data.petitionNo,
        petitionerName: data.petitionerName,
        petitionerAddress: data.petitionerAddress,
        status: 'SUBMITTED_TO_SUPERVISOR',
        createdById: req.user.userId,
        updatedById: req.user.userId,
        respondents: {
          create: respondentsData.map(r => ({
            name: r.name,
            designation: r.designation,
            office: r.office,
            department: r.department,
            subDepartment: r.subDepartment
          }))
        },
        history: {
          create: {
            fromStatus: 'DRAFT',
            toStatus: 'SUBMITTED_TO_SUPERVISOR',
            action: 'CREATE_SUBMIT',
            actionById: req.user.userId,
            remarks: 'Petition initially submitted to supervisor'
          }
        }
      },
      include: getIncludeOpts()
    });

    await redisClient.del('petitions:all');
    await redisClient.del('petitions:stats');

    res.status(201).json(newPetition);
  } catch (error) {
    console.error('Create petition error:', error);
    res.status(500).json({ error: 'Failed to create petition' });
  }
});

// Get a single petition
router.get('/:id', async (req, res) => {
  try {
    const petition = await prisma.petition.findUnique({
      where: { id: req.params.id },
      include: getIncludeOpts()
    });

    if (!petition) return res.status(404).json({ error: 'Petition not found' });
    res.json(petition);
  } catch (error) {
    console.error('Fetch petition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// State Transition Action Endpoint
router.post('/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, payload, remarks } = req.body;
    
    const petition = await prisma.petition.findUnique({ 
      where: { id },
      include: getIncludeOpts()
    });
    
    if (!petition) return res.status(404).json({ error: 'Petition not found' });

    const isCreator = petition.createdById === req.user.userId;
    const isSupervisor = petition.createdBy?.supervisorUserId === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    let nextStatus = petition.status;
    let updateData = { updatedById: req.user.userId };

    // Transaction array for executing updates
    let txOperations = [];

    if (action === 'RETURN_17A') {
      if (!isSupervisor && !isAdmin) return res.status(403).json({ error: 'Only supervisor can return' });
      if (petition.status !== 'SUBMITTED_TO_SUPERVISOR') return res.status(400).json({ error: 'Invalid state for RETURN_17A' });
      if (!remarks) return res.status(400).json({ error: 'Remarks are required to return' });

      nextStatus = '17A_RETURNED';
      updateData.proposalStatus = 'Returned with remarks';
      
      txOperations.push(prisma.petition.update({
        where: { id },
        data: { ...updateData, status: nextStatus }
      }));

    } else if (action === 'RESUBMIT') {
      if (!isCreator && !isAdmin) return res.status(403).json({ error: 'Only creator can resubmit' });
      if (petition.status !== '17A_RETURNED') return res.status(400).json({ error: 'Invalid state for RESUBMIT' });
      
      nextStatus = 'SUBMITTED_TO_SUPERVISOR';
      const respondentsData = payload.respondents || [];
      
      txOperations.push(prisma.respondent.deleteMany({ where: { petitionId: id } }));
      txOperations.push(prisma.petition.update({
        where: { id },
        data: {
          district: payload.district,
          petitionNo: payload.petitionNo,
          petitionerName: payload.petitionerName,
          petitionerAddress: payload.petitionerAddress,
          status: nextStatus,
          updatedById: req.user.userId,
          proposalStatus: null, // clear previous return status
          respondents: {
            create: respondentsData.map(r => ({
              name: r.name,
              designation: r.designation,
              office: r.office,
              department: r.department,
              subDepartment: r.subDepartment
            }))
          }
        }
      }));

    } else if (action === 'ACCEPT_17A') {
      if (!isSupervisor && !isAdmin) return res.status(403).json({ error: 'Only supervisor can accept 17-A' });
      if (petition.status !== 'SUBMITTED_TO_SUPERVISOR') return res.status(400).json({ error: 'Invalid state for ACCEPT_17A' });

      nextStatus = '17A_ACCEPTED';
      txOperations.push(prisma.petition.update({
        where: { id },
        data: {
          proposalStatus: 'Accept',
          proposalSentDate: payload.proposalSentDate ? new Date(payload.proposalSentDate) : new Date(),
          status: nextStatus,
          updatedById: req.user.userId
        }
      }));

    } else if (action === 'SUBMIT_CA') {
      if (!isSupervisor && !isAdmin) return res.status(403).json({ error: 'Only supervisor can submit CA' });
      if (petition.status !== '17A_ACCEPTED') return res.status(400).json({ error: 'Invalid state for SUBMIT_CA' });

      const respondentsData = payload.respondents || [];
      if (respondentsData.length !== petition.respondents.length) {
        return res.status(400).json({ error: 'Mismatch in respondents count' });
      }

      // Check required fields
      for (const r of respondentsData) {
        if (!r.caDesignation || !r.caDepartment || !r.caSubDepartment || !r.caPlace) {
          return res.status(400).json({ error: 'All CA fields must be filled for all respondents' });
        }
      }

      nextStatus = 'CA_SUBMITTED';

      // Update each respondent
      for (const r of respondentsData) {
        if (r.id) {
          txOperations.push(prisma.respondent.update({
            where: { id: r.id },
            data: { caDesignation: r.caDesignation, caDepartment: r.caDepartment, caSubDepartment: r.caSubDepartment, caPlace: r.caPlace }
          }));
        }
      }
      txOperations.push(prisma.petition.update({
        where: { id },
        data: { status: nextStatus, updatedById: req.user.userId }
      }));

    } else if (action === 'SUBMIT_PERMISSION') {
      if (!isSupervisor && !isAdmin) return res.status(403).json({ error: 'Only supervisor can submit permissions' });
      if (petition.status !== 'CA_SUBMITTED' && petition.status !== '17A_PERMISSION_PENDING') {
        return res.status(400).json({ error: 'Invalid state for SUBMIT_PERMISSION' });
      }

      const respondentsData = payload.respondents || [];
      let allResolved = true;

      for (const r of respondentsData) {
        if (!r.permissionStatus || r.permissionStatus === 'Pending') {
          allResolved = false;
        }
        if (r.id) {
          txOperations.push(prisma.respondent.update({
            where: { id: r.id },
            data: { 
              permissionStatus: r.permissionStatus,
              permissionSentDate: r.permissionSentDate ? new Date(r.permissionSentDate) : null,
              permissionReceivedFromCA: r.permissionReceivedFromCA ? new Date(r.permissionReceivedFromCA) : null,
              caSentToUnit: r.caSentToUnit ? new Date(r.caSentToUnit) : null
            }
          }));
        }
      }

      nextStatus = allResolved ? '17A_PERMISSION_COMPLETED' : '17A_PERMISSION_PENDING';
      
      txOperations.push(prisma.petition.update({
        where: { id },
        data: { status: nextStatus, updatedById: req.user.userId }
      }));

    } else if (action === 'SUBMIT_PE') {
      if (!isCreator && !isAdmin) return res.status(403).json({ error: 'Only creator can submit PE' });
      if (petition.status !== '17A_PERMISSION_COMPLETED') return res.status(400).json({ error: 'Invalid state for SUBMIT_PE' });

      nextStatus = 'PRELIMINARY_ENQUIRY_SUBMITTED';
      txOperations.push(prisma.petition.update({
        where: { id },
        data: {
          peNo: payload.peNo,
          peStatus: payload.peStatus,
          peRegDate: payload.peRegDate ? new Date(payload.peRegDate) : null,
          peReportSentDate: payload.peReportSentDate ? new Date(payload.peReportSentDate) : null,
          sirEo: payload.sirEo,
          status: nextStatus,
          updatedById: req.user.userId
        }
      }));

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Add History record
    txOperations.push(prisma.petitionHistory.create({
      data: {
        petitionId: id,
        fromStatus: petition.status,
        toStatus: nextStatus,
        action: action,
        actionById: req.user.userId,
        remarks: remarks || null
      }
    }));

    await prisma.$transaction(txOperations);

    const updatedPetition = await prisma.petition.findUnique({
      where: { id },
      include: getIncludeOpts()
    });

    await redisClient.del('petitions:all');
    await redisClient.del('petitions:stats');

    res.json(updatedPetition);
  } catch (error) {
    console.error('Petition action error:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// Delete a petition
router.delete('/:id', async (req, res) => {
  try {
    const existingPetition = await prisma.petition.findUnique({ where: { id: req.params.id } });
    if (!existingPetition) {
      return res.status(404).json({ error: 'Petition not found' });
    }
    if (req.user.role !== 'admin' && existingPetition.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete petitions you created' });
    }

    await prisma.petition.delete({ where: { id: req.params.id } });

    await redisClient.del('petitions:all');
    await redisClient.del('petitions:stats');

    res.status(204).send();
  } catch (error) {
    console.error('Delete petition error:', error);
    res.status(500).json({ error: 'Failed to delete petition' });
  }
});

// Get stats for the dashboard
router.get('/stats', async (req, res) => {
  try {
    let allowedCreatorIds = null;
    if (req.user.role !== 'admin') {
      const supervisees = await prisma.user.findMany({
        where: { supervisorUserId: req.user.userId },
        select: { id: true }
      });
      allowedCreatorIds = [req.user.userId, ...supervisees.map(s => s.id)];
    }

    if (req.user.role === 'admin') {
      const cachedStats = await redisClient.get('petitions:stats');
      if (cachedStats) return res.json(JSON.parse(cachedStats));
    }

    const where = allowedCreatorIds ? { createdById: { in: allowedCreatorIds } } : {};

    const totalPetitions = await prisma.petition.count({ where });
    const acceptedProposals = await prisma.petition.count({
      where: { ...where, proposalStatus: 'Accept' }
    });
    
    const permissionsObtained = await prisma.respondent.count({
      where: { 
        permissionStatus: 'Obtain',
        ...(allowedCreatorIds ? { petition: { createdById: { in: allowedCreatorIds } } } : {})
      }
    });
    
    const firRegistered = await prisma.petition.count({
      where: { ...where, peStatus: 'Register FIR' }
    });

    const stats = { totalPetitions, acceptedProposals, permissionsObtained, firRegistered };

    if (req.user.role === 'admin') {
      await redisClient.setEx('petitions:stats', 60, JSON.stringify(stats));
    }

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
