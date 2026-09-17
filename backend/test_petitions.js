const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const petitions = await prisma.petition.findMany({
    take: 2,
    include: {
      respondents: true,
      remarks: true,
      history: true,
    }
  });
  console.log(JSON.stringify(petitions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
