const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.petition.findMany().then(d => console.log('Petitions count:', d.length)).finally(() => prisma.$disconnect());
