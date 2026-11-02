const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authMiddleware, adminMiddleware } = require('./auth');
const {
  MODULE_KEYS, DEFAULT_USER_MODULES, sanitizeModules, invalidateUserAccess
} = require('../modulePermissions');

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
  modules: true,
  createdAt: true,
  updatedAt: true,
  designation: { select: { id: true, name: true } },
  supervisorDesignation: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
  supervisorUser: { select: { id: true, fullName: true, email: true } }
};

const VALID_ROLES = ['admin', 'user', 'viewer'];
const normalizeRole = (role) => (VALID_ROLES.includes(role) ? role : 'user');

// Admins always get every module. Others need at least one; `undefined` means the client did not
// send module access (older UI), in which case create falls back to the default and update keeps it.
const resolveModules = (role, modules, fallback) => {
  if (normalizeRole(role) === 'admin') return { modules: [...MODULE_KEYS] };
  if (modules === undefined) return { modules: fallback };
  const clean = sanitizeModules(modules);
  if (clean.length === 0) {
    return { error: 'Select at least one module for this user. To block all access, set the account to Inactive.' };
  }
  return { modules: clean };
};

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
      role, isActive, isHeadOffice, modules
    } = req.body;

    const moduleAccess = resolveModules(role, modules, [...DEFAULT_USER_MODULES]);
    if (moduleAccess.error) return res.status(400).json({ error: moduleAccess.error });

    if (!email || !password || !fullName || !kgidNumber || !designationId || !supervisorDesignationId) {
      return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    let finalDistrictId = districtId;
    let finalIsHeadOffice = !!isHeadOffice;
    if (designationId) {
      const desig = await prisma.designation.findUnique({ where: { id: designationId } });
      if (desig) {
        if (desig.districtId) {
          finalDistrictId = desig.districtId;
          finalIsHeadOffice = false;
        } else {
          finalDistrictId = null;
          finalIsHeadOffice = true;
        }
      }
    }

    if (!finalIsHeadOffice && !finalDistrictId) {
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
        districtId: finalIsHeadOffice ? null : finalDistrictId,
        role: normalizeRole(role),
        modules: moduleAccess.modules,
        isActive: isActive !== false,
        isHeadOffice: finalIsHeadOffice
      },
      select: userSelect
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Grant or revoke one module for many users at once. Admin accounts are skipped (they always
// have every module). Responds with how many users changed and how many are left with no module.
router.patch('/modules', async (req, res) => {
  try {
    const { userIds, module, enabled } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one user' });
    }
    if (!MODULE_KEYS.includes(module)) {
      return res.status(400).json({ error: `Module must be one of: ${MODULE_KEYS.join(', ')}` });
    }

    const targets = await prisma.user.findMany({
      where: { id: { in: userIds.map(String) }, role: { not: 'admin' } },
      select: { id: true, modules: true }
    });
    const changes = targets
      .map(u => {
        const current = sanitizeModules(u.modules);
        const next = enabled ? sanitizeModules([...current, module]) : current.filter(m => m !== module);
        return { id: u.id, next, changed: next.length !== current.length };
      })
      .filter(c => c.changed);

    await prisma.$transaction(changes.map(c => prisma.user.update({ where: { id: c.id }, data: { modules: c.next } })));
    await invalidateUserAccess();

    res.json({
      updated: changes.length,
      skippedAdmins: userIds.length - targets.length,
      withoutModules: changes.filter(c => c.next.length === 0).length
    });
  } catch (error) {
    console.error('Bulk module update error:', error);
    res.status(500).json({ error: 'Failed to update module access' });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      email, password, fullName, kgidNumber, 
      designationId, supervisorDesignationId, supervisorUserId, districtId,
      role, isActive, isHeadOffice, modules
    } = req.body;

    const moduleAccess = resolveModules(role, modules, undefined);
    if (moduleAccess.error) return res.status(400).json({ error: moduleAccess.error });

    if (!email || !fullName || !kgidNumber || !designationId || !supervisorDesignationId) {
      return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    let finalDistrictId = districtId;
    let finalIsHeadOffice = !!isHeadOffice;
    if (designationId) {
      const desig = await prisma.designation.findUnique({ where: { id: designationId } });
      if (desig) {
        if (desig.districtId) {
          finalDistrictId = desig.districtId;
          finalIsHeadOffice = false;
        } else {
          finalDistrictId = null;
          finalIsHeadOffice = true;
        }
      }
    }

    if (!finalIsHeadOffice && !finalDistrictId) {
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
      districtId: finalIsHeadOffice ? null : finalDistrictId,
      role: normalizeRole(role),
      ...(moduleAccess.modules ? { modules: moduleAccess.modules } : {}),
      isActive: isActive !== false,
      isHeadOffice: finalIsHeadOffice
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

    // Role, status and module changes take effect on the user's next request
    await invalidateUserAccess(id);
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
    await invalidateUserAccess(id);
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
