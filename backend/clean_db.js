const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('Starting database cleanup...');
  
  try {
    // Delete in correct order to respect foreign key constraints
    const respondents = await prisma.respondent.deleteMany({});
    console.log(`Deleted ${respondents.count} respondents.`);
    
    const remarks = await prisma.remark.deleteMany({});
    console.log(`Deleted ${remarks.count} remarks.`);
    
    const petitions = await prisma.petition.deleteMany({});
    console.log(`Deleted ${petitions.count} petitions.`);
    
    console.log('✅ Database cleaned successfully! Only master data (Districts, Master Items, Users) remains.');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
