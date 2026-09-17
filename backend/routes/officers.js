const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authMiddleware, adminMiddleware } = require('./auth');

const MOBILE_REGEX = /^[6-9]\d{9}$/;

// All officer routes require authentication
router.use(authMiddleware);

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
    .filter(p => p && p.place && p.place.trim())
    .map(p => ({
      place: p.place.trim(),
      fromYear: p.fromYear ? String(p.fromYear).trim() : null,
      toYear: p.toYear ? String(p.toYear).trim() : null
    }));

const validateOfficerPayload = (data, { partial = false } = {}) => {
  const required = ['districtId', 'name', 'designation', 'mobile', 'reportingDate', 'presentAddress', 'permanentAddress'];
  if (!partial) {
    for (const field of required) {
      if (!data[field] || !String(data[field]).trim()) {
        return `${field} is required`;
      }
    }
  }
  if (data.mobile && !MOBILE_REGEX.test(data.mobile)) {
    return 'Mobile number must be a valid 10-digit Indian mobile number';
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

    const sortableFields = ['name', 'designation', 'reportingDate', 'createdAt'];
    const sortBy = sortableFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    let allowedCreatorIds = null;
    if (req.user.role !== 'admin') {
      const supervisees = await prisma.user.findMany({
        where: { supervisorUserId: req.user.userId },
        select: { id: true }
      });
      allowedCreatorIds = [req.user.userId, ...supervisees.map(s => s.id)];
    }

    const where = {
      isActive: true,
      ...(districtId ? { districtId } : {}),
      ...(designation ? { designation } : {}),
      ...(allowedCreatorIds ? { createdById: { in: allowedCreatorIds } } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { district: { name: { contains: search, mode: 'insensitive' } } }
        ]
      } : {})
    };

    // Export mode: return matching records without pagination, capped well
    // below "unlimited" so a filtered export can't load the whole table.
    const exportAll = req.query.all === 'true';
    const EXPORT_CAP = 2000;

    const [total, officers] = await Promise.all([
      prisma.officer.count({ where }),
      prisma.officer.findMany({
        where,
        include: officerInclude,
        orderBy: { [sortBy]: sortDir },
        ...(exportAll ? { take: EXPORT_CAP } : { skip: (page - 1) * pageSize, take: pageSize })
      })
    ]);

    res.json({
      data: officers,
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

// Distinct designations for the filter dropdown
router.get('/meta/designations', async (req, res) => {
  try {
    const rows = await prisma.officer.findMany({
      where: { isActive: true },
      select: { designation: true },
      distinct: ['designation'],
      orderBy: { designation: 'asc' }
    });
    res.json(rows.map(r => r.designation));
  } catch (error) {
    console.error('Fetch designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single officer with previous places + audit info
router.get('/:id', async (req, res) => {
  try {
    const officer = await prisma.officer.findFirst({
      where: { id: req.params.id, isActive: true },
      include: {
        ...officerInclude,
        createdBy: { select: { id: true, email: true, fullName: true } },
        updatedBy: { select: { id: true, email: true, fullName: true } }
      }
    });
    if (!officer) return res.status(404).json({ error: 'Officer not found' });
    res.json(officer);
  } catch (error) {
    console.error('Fetch officer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an officer (officer + previous places in one transaction)
router.post('/', canWrite, async (req, res) => {
  try {
    const data = req.body;
    const validationError = validateOfficerPayload(data);
    if (validationError) return res.status(400).json({ error: validationError });

    const officer = await prisma.officer.create({
      data: {
        districtId: data.districtId,
        name: data.name.trim(),
        designation: data.designation.trim(),
        mobile: data.mobile.trim(),
        reportingDate: new Date(data.reportingDate),
        presentAddress: data.presentAddress.trim(),
        permanentAddress: data.permanentAddress.trim(),
        remarks: data.remarks ? data.remarks.trim() : null,
        createdById: req.user.userId,
        updatedById: req.user.userId,
        previousPlaces: { create: sanitizePreviousPlaces(data.previousPlaces) }
      },
      include: officerInclude
    });

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
    const validationError = validateOfficerPayload(data);
    if (validationError) return res.status(400).json({ error: validationError });

    const existingOfficer = await prisma.officer.findUnique({ where: { id } });
    if (!existingOfficer) return res.status(404).json({ error: 'Officer not found' });

    if (req.user.role !== 'admin' && existingOfficer.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You can only edit records you created' });
    }

    const officer = await prisma.$transaction(async (tx) => {
      await tx.officerPreviousPlace.deleteMany({ where: { officerId: id } });

      return tx.officer.update({
        where: { id },
        data: {
          districtId: data.districtId,
          name: data.name.trim(),
          designation: data.designation.trim(),
          mobile: data.mobile.trim(),
          reportingDate: new Date(data.reportingDate),
          presentAddress: data.presentAddress.trim(),
          permanentAddress: data.permanentAddress.trim(),
          remarks: data.remarks ? data.remarks.trim() : null,
          updatedById: req.user.userId,
          previousPlaces: { create: sanitizePreviousPlaces(data.previousPlaces) }
        },
        include: officerInclude
      });
    });

    res.json(officer);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Officer not found' });
    if (error.code === 'P2003') return res.status(400).json({ error: 'Selected district does not exist' });
    console.error('Update officer error:', error);
    res.status(500).json({ error: 'Failed to update officer' });
  }
});

// Soft delete — is_active = false, record is preserved
// Note: Changed from adminMiddleware to canWrite since normal users should be able to delete their own records.
router.delete('/:id', canWrite, async (req, res) => {
  try {
    const existingOfficer = await prisma.officer.findUnique({ where: { id: req.params.id } });
    if (!existingOfficer) return res.status(404).json({ error: 'Officer not found' });

    if (req.user.role !== 'admin' && existingOfficer.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete records you created' });
    }

    await prisma.officer.update({
      where: { id: req.params.id },
      data: { isActive: false, updatedById: req.user.userId }
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Officer not found' });
    console.error('Delete officer error:', error);
    res.status(500).json({ error: 'Failed to delete officer' });
  }
});

module.exports = router;
