const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient();
}

globalThis.prismaGlobal = globalThis.prismaGlobal ?? prismaClientSingleton()
const prisma = globalThis.prismaGlobal

module.exports = prisma;
