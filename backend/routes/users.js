const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authMiddleware, adminMiddleware } = require('./auth');

// All user management routes require an authenticated admin (except by-designation if needed for non-admins, but let's keep it admin for now, or just authMiddleware if normal users need it. I'll make by-designation require auth, but move it before the adminMiddleware if necessary. Actually, the prompt doesn't specify. I will keep it under adminMiddleware since it's for user management form, but wait, normal users might need to create users? No, user management is admin. I'll put it all under authMiddleware, and check admin inside routes where needed, or just keep it as is.)

router.use(authMiddleware);

// Get users by designation (must be before /:id)
router.get('/by-designation/:designationId', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        designationId: req.params.designationId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        designation: {
          select: { id: true, name: true }
        }
      },
      orderBy: { fullName: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users by designation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(adminMiddleware);

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  kgidNumber: true,
  role: true,
  isActive: true,
  designationId: true,
  supervisorDesignationId: true,
  supervisorUserId: true,
  districtId: true,
  isHeadOffice: true,
  createdAt: true,
  updatedAt: true,
  designation: { select: { id: true, name: true } },
  supervisorDesignation: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
  supervisorUser: { select: { id: true, fullName: true, email: true } }
};

const VALID_ROLES = ['admin', 'user', 'viewer'];
const normalizeRole = (role) => (VALID_ROLES.includes(role) ? role : 'user');

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a user
router.post('/', async (req, res) => {
  try {
    const { 
      email, password, fullName, kgidNumber, 
      designationId, supervisorDesignationId, supervisorUserId, districtId,
      role, isActive, isHeadOffice 
    } = req.body;

    if (!email || !password || !fullName || !kgidNumber || !designationId || !supervisorDesignationId) {
      return res.status(400).json({ error: 'Missing mandatory fields' });
    }
    if (!isHeadOffice && !districtId) {
      return res.status(400).json({ error: 'District is required for non-head office users' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid Email ID format' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    if (!/^\d{1,10}$/.test(kgidNumber)) {
      return res.status(400).json({ error: 'KGID Number must be numeric and up to 10 digits' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email ID already exists' });
    }

    // Since kgidNumber can be null in DB, but here we require it, check uniqueness if needed
    const existingKgid = await prisma.user.findFirst({ where: { kgidNumber } });
    if (existingKgid) {
      return res.status(409).json({ error: 'KGID Number already exists' });
    }

    if (isActive !== false) {
      const activeDesignation = await prisma.user.findFirst({ where: { designationId, isActive: true } });
      if (activeDesignation) {
        return res.status(409).json({ error: 'An active user already exists with this designation' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName.trim(),
        kgidNumber,
        designationId,
        supervisorDesignationId,
        supervisorUserId: supervisorUserId || null,
        districtId: isHeadOffice ? null : districtId,
        role: normalizeRole(role),
        isActive: isActive !== false,
        isHeadOffice: !!isHeadOffice
      },
      select: userSelect
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      email, password, fullName, kgidNumber, 
      designationId, supervisorDesignationId, supervisorUserId, districtId,
      role, isActive, isHeadOffice
    } = req.body;

    if (!email || !fullName || !kgidNumber || !designationId || !supervisorDesignationId) {
      return res.status(400).json({ error: 'Missing mandatory fields' });
    }
    if (!isHeadOffice && !districtId) {
      return res.status(400).json({ error: 'District is required for non-head office users' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid Email ID format' });
    }

    if (!/^\d{1,10}$/.test(kgidNumber)) {
      return res.status(400).json({ error: 'KGID Number must be numeric and up to 10 digits' });
    }

    if (isActive !== false) {
      const activeDesignation = await prisma.user.findFirst({ where: { designationId, isActive: true, id: { not: id } } });
      if (activeDesignation) {
        return res.status(409).json({ error: 'An active user already exists with this designation' });
      }
    }

    const data = {
      email,
      fullName: fullName.trim(),
      kgidNumber,
      designationId,
      supervisorDesignationId,
      supervisorUserId: supervisorUserId || null,
      districtId: isHeadOffice ? null : districtId,
      role: normalizeRole(role),
      isActive: isActive !== false,
      isHeadOffice: !!isHeadOffice
    };

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('email') || target.includes('username')) {
        return res.status(409).json({ error: 'Email ID already exists' });
      }
      return res.status(409).json({ error: 'A field already exists (KGID/Email)' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
