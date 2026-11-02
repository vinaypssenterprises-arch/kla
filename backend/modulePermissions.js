const prisma = require('./prismaClient');
const redisClient = require('./redisClient');

// The three workspaces of the portal. Admins always get all of them; every other user
// gets the modules an admin enabled on their account (User.modules).
const MODULE_KEYS = ['petitions', 'officers', 'courtCases'];
const MODULE_LABELS = { petitions: 'Petitions', officers: 'Officers', courtCases: 'Court Cases' };
// Keep in sync with the User.modules default in prisma/schema.prisma
const DEFAULT_USER_MODULES = ['petitions', 'officers'];

const ACCESS_CACHE_TTL_SECONDS = 60;
const accessCacheKey = (userId) => `user-access:${userId}`;

const sanitizeModules = (modules) =>
  MODULE_KEYS.filter(key => Array.isArray(modules) && modules.includes(key));

const modulesForRole = (role, modules) => (role === 'admin' ? [...MODULE_KEYS] : sanitizeModules(modules));

// Current role / active flag / modules straight from the database (briefly cached), so an admin's
// change applies within a minute instead of waiting for the user's 12h token to expire.
async function getUserAccess(userId) {
  const cached = await redisClient.get(accessCacheKey(userId));
  if (cached) return JSON.parse(cached);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, modules: true }
  });
  const access = user
    ? { role: user.role, isActive: user.isActive, modules: modulesForRole(user.role, user.modules) }
    : null;

  await redisClient.setEx(accessCacheKey(userId), ACCESS_CACHE_TTL_SECONDS, JSON.stringify(access));
  return access;
}

async function invalidateUserAccess(userId) {
  try {
    if (userId) await redisClient.del(accessCacheKey(userId));
    else await redisClient.delPattern('user-access:');
  } catch (e) {
    // ignore
  }
}

// Express middleware (after authMiddleware): the user needs at least one of `keys`.
const requireModule = (...keys) => async (req, res, next) => {
  try {
    const access = await getUserAccess(req.user.userId);
    if (!access || !access.isActive) {
      return res.status(403).json({ error: 'Your account is inactive. Please contact the administrator.', code: 'ACCOUNT_INACTIVE' });
    }
    if (access.role === 'admin' || keys.some(k => access.modules.includes(k))) {
      req.userModules = access.modules;
      return next();
    }
    return res.status(403).json({
      error: `You do not have access to the ${MODULE_LABELS[keys[0]]} module. Please contact the administrator.`,
      code: 'MODULE_FORBIDDEN',
      module: keys[0]
    });
  } catch (error) {
    console.error('Module permission check failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  MODULE_KEYS,
  MODULE_LABELS,
  DEFAULT_USER_MODULES,
  sanitizeModules,
  modulesForRole,
  getUserAccess,
  invalidateUserAccess,
  requireModule
};
