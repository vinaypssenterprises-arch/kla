const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.district.findMany().then(d => console.log('Districts count:', d.length)).finally(() => prisma.$disconnect());
