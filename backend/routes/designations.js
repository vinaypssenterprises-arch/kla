const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// Get all designations
router.get('/', async (req, res) => {
  try {
    const designations = await prisma.designation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(designations);
  } catch (error) {
    console.error('Fetch designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create designation
router.post('/', async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Designation name is required' });

    const existing = await prisma.designation.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Designation already exists' });

    const designation = await prisma.designation.create({
      data: { name, isActive: isActive !== false }
    });
    res.status(201).json(designation);
  } catch (error) {
    console.error('Create designation error:', error);
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

// Update designation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!name) return res.status(400).json({ error: 'Designation name is required' });

    const existing = await prisma.designation.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Designation name already exists' });
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: { name, isActive }
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
    await prisma.designation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Designation not found' });
    console.error('Delete designation error:', error);
    res.status(500).json({ error: 'Failed to delete designation' });
  }
});

module.exports = router;
