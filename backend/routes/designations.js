const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const redisClient = require('../redisClient');
const { authMiddleware } = require('./auth');
const { compareDesignationsByRank } = require('./officers');

router.use(authMiddleware);

// Get all designations (optionally filter by districtId)
router.get('/', async (req, res) => {
  try {
    const { districtId, includeAllDistricts } = req.query;
    const cacheKey = `designations:${districtId || 'ALL'}:${includeAllDistricts || 'true'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    let where = {};
    if (districtId) {
      if (includeAllDistricts === 'false') {
        where.districtId = districtId;
      } else {
        where = {
          OR: [
            { districtId: districtId },
            { districtId: null }
          ]
        };
      }
    }
    const designations = await prisma.designation.findMany({
      where,
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      }
    });

    // Sort by District name, then Rank Hierarchy (SP -> Addl SP -> DySP -> PI -> PSI -> ASI -> HC -> PC -> Other)
    designations.sort((a, b) => {
      const distA = a.district?.name || '';
      const distB = b.district?.name || '';
      const distDiff = distA.localeCompare(distB, undefined, { sensitivity: 'base' });
      if (distDiff !== 0) return distDiff;
      return compareDesignationsByRank(a.name, b.name);
    });

    await redisClient.setEx(cacheKey, 300, JSON.stringify(designations));
    res.json(designations);
  } catch (error) {
    console.error('Fetch designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create designation — supports district-specific OR state-wide (All Districts / Head Office)
router.post('/', async (req, res) => {
  try {
    const { name, districtId, isAllDistricts, isActive } = req.body;
    const cleanName = (name || '').trim();
    const cleanDistrictId = (districtId || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Designation name is required' });
    }

    const isGlobal = isAllDistricts === true || !cleanDistrictId;
    let targetDistrictId = null;

    if (!isGlobal) {
      const district = await prisma.district.findUnique({ where: { id: cleanDistrictId } });
      if (!district) {
        return res.status(400).json({ error: 'Selected district does not exist' });
      }
      targetDistrictId = cleanDistrictId;
    }

    // Check unique designation name (case-insensitive)
    const existing = await prisma.designation.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' }
      }
    });
    if (existing) {
      return res.status(409).json({ error: `Designation "${cleanName}" already exists. Designation name must be unique.` });
    }

    const designation = await prisma.designation.create({
      data: {
        name: cleanName,
        districtId: targetDistrictId,
        isActive: isActive !== false
      },
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      }
    });

    await redisClient.delPattern('designations:');
    res.status(201).json(designation);
  } catch (error) {
    console.error('Create designation error:', error);
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

// Update designation — supports district-specific OR state-wide
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, districtId, isAllDistricts, isActive } = req.body;
    const cleanName = (name || '').trim();
    const cleanDistrictId = (districtId || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Designation name is required' });
    }

    const isGlobal = isAllDistricts === true || !cleanDistrictId;
    let targetDistrictId = null;

    if (!isGlobal) {
      const district = await prisma.district.findUnique({ where: { id: cleanDistrictId } });
      if (!district) {
        return res.status(400).json({ error: 'Selected district does not exist' });
      }
      targetDistrictId = cleanDistrictId;
    }

    // Check unique designation name (case-insensitive, excluding current record)
    const existing = await prisma.designation.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(409).json({ error: `Designation "${cleanName}" already exists. Designation name must be unique.` });
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        name: cleanName,
        districtId: targetDistrictId,
        isActive: isActive !== undefined ? (isActive === true || isActive === '1') : undefined
      },
      include: {
        district: {
          select: { id: true, name: true, shortName: true }
        }
      }
    });

    await redisClient.delPattern('designations:');
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
    await redisClient.delPattern('designations:');
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Designation not found' });
    console.error('Delete designation error:', error);
    res.status(500).json({ error: 'Failed to delete designation' });
  }
});

module.exports = router;
