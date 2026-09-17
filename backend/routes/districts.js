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
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'District name is required' });
    }

    const existing = await prisma.district.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ error: 'District already exists' });
    }

    const district = await prisma.district.create({
      data: { name: name.trim() }
    });

    res.status(201).json(district);
  } catch (error) {
    console.error('Create district error:', error);
    res.status(500).json({ error: 'Failed to create district' });
  }
});

// Update a district (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'District name is required' });
    }

    const district = await prisma.district.update({
      where: { id },
      data: { name: name.trim(), isActive: isActive !== false }
    });

    res.json(district);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'District already exists' });
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
