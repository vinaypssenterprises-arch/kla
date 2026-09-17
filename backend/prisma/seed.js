const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const DISTRICTS = [
  "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
  "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere",
  "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru",
  "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Vijayanagara",
  "Yadgir"
];

async function seedAdmin() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (!admin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await bcrypt.hash('admin', 10),
        fullName: 'Administrator',
        role: 'admin',
        isActive: true
      },
    });
    console.log('Seeded default admin user');
    return;
  }

  // Backfill role for a pre-existing admin row created before roles/hashing existed
  if (admin.role !== 'admin' || !admin.password.startsWith('$2')) {
    await prisma.user.update({
      where: { username: 'admin' },
      data: {
        role: 'admin',
        password: admin.password.startsWith('$2') ? admin.password : await bcrypt.hash(admin.password, 10)
      }
    });
    console.log('Upgraded existing admin user (role + password hash)');
  } else {
    console.log('Admin user already exists');
  }
}

async function seedDistricts() {
  for (const name of DISTRICTS) {
    await prisma.district.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log(`Seeded ${DISTRICTS.length} districts`);
}

// Only seed master categories with values that are already real/canonical in
// this application (the options already hardcoded in the Petition form).
// Taluk / Police Station / Department are left empty for the admin to
// populate via Masters — no invented data.
const MASTER_ITEMS = {
  peStatus: ["Register FIR", "Recommended to DE", "Close"],
  proposalStatus: ["Returned with remarks", "Accept"]
};

async function seedMasterItems() {
  let count = 0;
  for (const [category, names] of Object.entries(MASTER_ITEMS)) {
    for (const name of names) {
      await prisma.masterItem.upsert({
        where: { category_name: { category, name } },
        update: {},
        create: { category, name }
      });
      count++;
    }
  }
  console.log(`Seeded ${count} master items (peStatus, proposalStatus)`);
}

async function main() {
  await seedAdmin();
  await seedDistricts();
  await seedMasterItems();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
