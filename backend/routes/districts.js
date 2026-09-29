const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authMiddleware, adminMiddleware } = require('./auth');

// Any authenticated user can read the district master (needed for the petition form)
router.use(authMiddleware);

// List all districts
router.get('/', async (req, res) => {
  try {
    const districts = await prisma.district.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(districts);
  } catch (error) {
    console.error('Fetch districts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a district (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, shortName } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'District name is required' });
    }

    const trimmedName = name.trim();
    const cleanShortName = shortName && shortName.trim() ? shortName.trim().toUpperCase() : null;

    if (cleanShortName && !/^[A-Za-z0-9]{1,4}$/.test(cleanShortName)) {
      return res.status(400).json({ error: 'Short name must be 1 to 4 letters and numbers only' });
    }

    const existing = await prisma.district.findUnique({ where: { name: trimmedName } });
    if (existing) {
      return res.status(409).json({ error: 'District already exists' });
    }

    if (cleanShortName) {
      const existingShort = await prisma.district.findUnique({ where: { shortName: cleanShortName } });
      if (existingShort) {
        return res.status(409).json({ error: 'District with this short name already exists' });
      }
    }

    const district = await prisma.district.create({
      data: {
        name: trimmedName,
        shortName: cleanShortName
      }
    });

    res.status(201).json(district);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'District name or short name already exists' });
    }
    console.error('Create district error:', error);
    res.status(500).json({ error: 'Failed to create district' });
  }
});

// Update a district (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'District name is required' });
    }

    const trimmedName = name.trim();
    const cleanShortName = shortName && shortName.trim() ? shortName.trim().toUpperCase() : null;

    if (cleanShortName && !/^[A-Za-z0-9]{1,4}$/.test(cleanShortName)) {
      return res.status(400).json({ error: 'Short name must be 1 to 4 letters and numbers only' });
    }

    const district = await prisma.district.update({
      where: { id },
      data: {
        name: trimmedName,
        shortName: cleanShortName,
        isActive: isActive !== false
      }
    });

    res.json(district);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'District name or short name already exists' });
    }
    console.error('Update district error:', error);
    res.status(500).json({ error: 'Failed to update district' });
  }
});

// Delete a district (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await prisma.district.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    console.error('Delete district error:', error);
    res.status(500).json({ error: 'Failed to delete district' });
  }
});

module.exports = router;
