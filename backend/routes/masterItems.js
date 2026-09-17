const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authMiddleware, adminMiddleware } = require('./auth');

const CATEGORIES = ['taluk', 'policeStation', 'department', 'subDepartment', 'peStatus', 'proposalStatus'];

router.use(authMiddleware);

const checkCategory = (req, res, next) => {
  if (!CATEGORIES.includes(req.params.category)) {
    return res.status(404).json({ error: `Unknown master category. Expected one of: ${CATEGORIES.join(', ')}` });
  }
  next();
};

// List items for a category
router.get('/:category', checkCategory, async (req, res) => {
  try {
    const items = await prisma.masterItem.findMany({
      where: { category: req.params.category },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Fetch master items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an item (admin only)
router.post('/:category', checkCategory, adminMiddleware, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.masterItem.findUnique({
      where: { category_name: { category: req.params.category, name: name.trim() } }
    });
    if (existing) return res.status(409).json({ error: 'This entry already exists' });

    const item = await prisma.masterItem.create({
      data: { category: req.params.category, name: name.trim(), parentId: parentId || null }
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Create master item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update an item (admin only)
router.put('/:category/:id', checkCategory, adminMiddleware, async (req, res) => {
  try {
    const { name, isActive, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const item = await prisma.masterItem.update({
      where: { id: req.params.id },
      data: { name: name.trim(), isActive: isActive !== false, parentId: parentId !== undefined ? parentId : undefined }
    });
    res.json(item);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
    if (error.code === 'P2002') return res.status(409).json({ error: 'This entry already exists' });
    console.error('Update master item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item (admin only)
router.delete('/:category/:id', checkCategory, adminMiddleware, async (req, res) => {
  try {
    await prisma.masterItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
    console.error('Delete master item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
