const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// Get all designations (optionally filter by districtId)
router.get('/', async (req, res) => {
  try {
    const { districtId } = req.query;
    const designations = await prisma.designation.findMany({
      where: {
        ...(districtId ? { districtId } : {})
      },
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(designations);
  } catch (error) {
    console.error('Fetch designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create designation — district selection is mandatory
router.post('/', async (req, res) => {
  try {
    const { name, districtId, isActive } = req.body;
    const cleanName = (name || '').trim();
    const cleanDistrictId = (districtId || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Designation name is required' });
    }
    if (!cleanDistrictId) {
      return res.status(400).json({ error: 'District is mandatory for creating a designation' });
    }

    const district = await prisma.district.findUnique({ where: { id: cleanDistrictId } });
    if (!district) {
      return res.status(400).json({ error: 'Selected district does not exist' });
    }

    const existing = await prisma.designation.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        districtId: cleanDistrictId
      }
    });
    if (existing) {
      return res.status(409).json({ error: `Designation "${cleanName}" already exists in ${district.name}` });
    }

    const designation = await prisma.designation.create({
      data: {
        name: cleanName,
        districtId: cleanDistrictId,
        isActive: isActive !== false
      },
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      }
    });
    res.status(201).json(designation);
  } catch (error) {
    console.error('Create designation error:', error);
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

// Update designation — district selection is mandatory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, districtId, isActive } = req.body;
    const cleanName = (name || '').trim();
    const cleanDistrictId = (districtId || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Designation name is required' });
    }
    if (!cleanDistrictId) {
      return res.status(400).json({ error: 'District is mandatory for designation' });
    }

    const district = await prisma.district.findUnique({ where: { id: cleanDistrictId } });
    if (!district) {
      return res.status(400).json({ error: 'Selected district does not exist' });
    }

    const existing = await prisma.designation.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        districtId: cleanDistrictId,
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(409).json({ error: `Designation "${cleanName}" already exists in ${district.name}` });
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        name: cleanName,
        districtId: cleanDistrictId,
        isActive: isActive !== undefined ? (isActive === true || isActive === '1') : undefined
      },
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      }
    });
    res.json(designation);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Designation not found' });
    console.error('Update designation error:', error);
    res.status(500).json({ error: 'Failed to update designation' });
  }
});

// Delete designation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCount = await prisma.user.count({
      where: {
        OR: [
          { designationId: id },
          { supervisorDesignationId: id }
        ]
      }
    });
    if (usersCount > 0) {
      return res.status(400).json({ error: `Cannot delete designation because it is assigned to ${usersCount} user(s).` });
    }

    await prisma.designation.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Designation not found' });
    console.error('Delete designation error:', error);
    res.status(500).json({ error: 'Failed to delete designation' });
  }
});

module.exports = router;
