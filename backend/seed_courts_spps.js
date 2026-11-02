const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RAW_DATA = [
  // Bengaluru City (linked to both Bengaluru City 1 and Bengaluru City 2)
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'XXIII Additional City Civil and Sessions Judge (Special Court for cases filed by Karnataka Lokayukta, SIT) MS Building, Bengaluru',
    spps: ['Manjunath Honnaiah Naik']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'LXXVI Addl City Civil and Sessions Judge (Special Court for cases filed by Karnataka Lokayukta, SIT) - City Civil Court Complex',
    spps: ['Srikanth Dayannavar']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'LXXVII Addl City Civil and Sessions Judge (Special Court for cases filed by Karnataka Lokayukta, SIT) - City Civil Court Complex',
    spps: ['Sunitha']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'LXXVIII Addl City Civil and Sessions Judge, City Civil Court Complex (Lokayukta)',
    spps: ['Badrinath']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'LXXXI Addl City Civil and Sessions Judge (Special Court for cases filed against People’s Representatives), City Civil Court Complex',
    spps: ['S.S. Hiremath']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: 'CCH 91 Designated Special Court handling Criminal trials and corruption cases specifically involving MPs & MLAs in Karnataka',
    spps: ['S.S. Hiremath']
  },
  {
    districts: ['Bengaluru City 1', 'Bengaluru City 2'],
    court: '9th Additional District and Session Court, Bangalore',
    spps: ['Nagappa']
  },

  // Bagalkote
  {
    districts: ['Bagalkote'],
    court: 'The Principal District and Sessions Court, Bagalkot',
    spps: ['K. T Abbigeri']
  },

  // Ballari
  {
    districts: ['Ballari'],
    court: 'The Principal District and Sessions Court, Ballari',
    spps: ['B.V. Basavaraj']
  },

  // Belagavi
  {
    districts: ['Belagavi'],
    court: 'Special & 4th Addl District Sessions Court, Belagavi',
    spps: ['Praveen Agasagi']
  },

  // Bengaluru Rural
  {
    districts: ['Bengaluru Rural'],
    court: 'IX Additional District and Session Court, Bengaluru Rural District',
    spps: ['Manjunath Byrareddy']
  },

  // Bidar
  {
    districts: ['Bidar'],
    court: 'The Principal District and Sessions Court, Bidar',
    spps: ['Keshav Rao Srimale']
  },

  // Chamarajanagar
  {
    districts: ['Chamarajanagar'],
    court: 'The Principal District and Sessions Court, Chamarajanagar',
    spps: ['Mallikarjunaswamy']
  },

  // Chikkaballapura
  {
    districts: ['Chikkaballapura'],
    court: '3rd Additional District & Session Court, Chikkaballapura',
    spps: ['K M Govinda Reddy']
  },

  // Chikkamagaluru
  {
    districts: ['Chikkamagaluru'],
    court: 'The Principal District and Sessions Judge, Chikkamagaluru',
    spps: ['V T Thomas']
  },

  // Chitradurga
  {
    districts: ['Chitradurga'],
    court: 'The Principal District and Sessions Court, Chitradurga',
    spps: ['B. Malleshappa']
  },

  // Davanagere
  {
    districts: ['Davanagere'],
    court: 'The Principal District Sessions Judge & Special Court, Davanagere',
    spps: ['Thimmalapurada Ravi Shankar']
  },

  // Dharwad
  {
    districts: ['Dharwad'],
    court: '3rd Additional District and Sessions Court Dharwad & Special Court for Lokayukta',
    spps: ['S.S. Shivalli']
  },

  // Gadag
  {
    districts: ['Gadag'],
    court: 'The Principal District and Session Court, Gadag',
    spps: ['Virupakshappa V. Byalihal']
  },

  // Hassan
  {
    districts: ['Hassan'],
    court: 'The Principal District and Sessions Court, Hassan',
    spps: ['Parashurama']
  },

  // Haveri
  {
    districts: ['Haveri'],
    court: 'The Principal District and Sessions Court, Haveri',
    spps: ['Raviraj K. Kalal']
  },

  // Kalaburagi
  {
    districts: ['Kalaburagi'],
    court: 'The Principal District and Sessions Court, Kalburgi',
    spps: ['Ashok Chand Kavate']
  },

  // Karwar (Uttara Kannada)
  {
    districts: ['Karwar'],
    court: 'The Special and Principal District & Session Court, Uttara Kannada, Karwar',
    spps: ['Lakshmikant M Prabhu']
  },

  // Kodagu
  {
    districts: ['Kodagu'],
    court: 'The Principal District and Sessions Court, Madikeri',
    spps: ['M.M. Cariappa']
  },
  {
    districts: ['Kodagu'],
    court: '2nd Addl District and Sessions Court Kodagu, Madikeri (Sitting At Virajpete)',
    spps: ['M.M. Cariappa']
  },

  // Kolar
  {
    districts: ['Kolar'],
    court: 'The Principal District and Sessions Court, Kolar',
    spps: ['T. Amarendra']
  },

  // Koppal
  {
    districts: ['Koppal'],
    court: 'The Principal District and Sessions Court, Koppal',
    spps: ['D Narayan']
  },
  {
    districts: ['Koppal'],
    court: '1st Additional District and Sessions Court, at Gangavathi',
    spps: ['D Narayan']
  },

  // Mandya
  {
    districts: ['Mandya'],
    court: 'The Principal District and Sessions Court, Mandya',
    spps: ['T.S. Sathyananda']
  },
  {
    districts: ['Mandya'],
    court: 'The 3rd Additional District and Session Court Mandya (Sitting at Sri Rangapatna)',
    spps: ['T.S. Sathyananda']
  },

  // Mangalore (Dakshina Kannada)
  {
    districts: ['Mangalore'],
    court: '3rd Additional District and Sessions Special Court, Dakshina Kannada, Mangaluru',
    spps: ['Ravindra Munnipady']
  },

  // Mysuru (Mysore)
  {
    districts: ['Mysuru'],
    court: '3rd Additional District and Sessions Court, Mysore',
    spps: ['P.S. Muthamma']
  },

  // Raichur
  {
    districts: ['Raichur'],
    court: '2nd Additional District and Special Court, Raichur',
    spps: ['Mallinath S. Hiremath']
  },
  {
    districts: ['Raichur'],
    court: '3rd Additional District and Sessions Court, Raichur',
    spps: ['Basavaraj']
  },
  {
    districts: ['Raichur'],
    court: '3rd Additional District and Sessions Court, Circuit Bench Lingasagur',
    spps: ['Basavaraj']
  },

  // Bengaluru South (Bangalore South)
  {
    districts: ['Bengaluru South'],
    court: '2nd Additional District and Session Court, Kanakapura',
    spps: ['Purushotam K']
  },
  {
    districts: ['Bengaluru South'],
    court: 'The Principal District and Sessions Court, Bengaluru South',
    spps: ['Venkatesh B.C']
  },

  // Shivamogga
  {
    districts: ['Shivamogga'],
    court: '1st Additional District And Sessions Court, Shivamogga',
    spps: ['Sundar Raj M D']
  },

  // Tumakuru (Court with 2 SPPs)
  {
    districts: ['Tumakuru'],
    court: '7th Addl District and Session Judge, Tumakuru',
    spps: ['R Prakash', 'N Basavaraju']
  },

  // Udupi
  {
    districts: ['Udupi'],
    court: 'District Sessions Court, Udupi',
    spps: ['Harishchandra Udiawar']
  },

  // Vijayanagara (Vijayanagar)
  {
    districts: ['Vijayanagara'],
    court: 'Prl District & Sessions Court, Vijanagara, Hosapete',
    spps: ['Y. Ayyappa']
  },

  // Vijayapura (Court with 2 SPPs)
  {
    districts: ['Vijayapura'],
    court: 'Principal Sessions And District Court, Vijayapur',
    spps: ['Arjun A Misale', 'B S Soragaoan']
  },

  // Yadgir (Yadgiri)
  {
    districts: ['Yadgir'],
    court: 'The Principal District and Sessions Court, Yadgiri',
    spps: ['Vishwanath Ubhalev']
  }
];

async function seedCourtsAndSpps(prismaClient = prisma, force = false) {
  console.log('--- Seeding Courts & SPPs ---');

  const existing = await prismaClient.masterItem.count({ where: { category: 'courtName' } });
  if (existing > 0 && !force) {
    console.log(`Courts & SPPs already seeded (${existing} courts found), skipping.`);
    return;
  }

  // 1. Fetch all districts
  const districts = await prismaClient.district.findMany();
  const districtMap = new Map();
  districts.forEach(d => {
    districtMap.set(d.name.toLowerCase().trim(), d.id);
  });

  if (force) {
    // 2. Clear old courtName and spp records
    const delSpps = await prismaClient.masterItem.deleteMany({ where: { category: 'spp' } });
    console.log(`Deleted ${delSpps.count} existing SPP items.`);
    const delCourts = await prismaClient.masterItem.deleteMany({ where: { category: 'courtName' } });
    console.log(`Deleted ${delCourts.count} existing Court items.`);
  }

  let courtCount = 0;
  let sppCount = 0;

  for (const entry of RAW_DATA) {
    for (const distName of entry.districts) {
      const distId = districtMap.get(distName.toLowerCase().trim());
      if (!distId) {
        console.warn(`District not found: ${distName}`);
        continue;
      }

      // Create Court
      const courtItem = await prismaClient.masterItem.create({
        data: {
          category: 'courtName',
          name: entry.court,
          parentId: distId,
          isActive: true
        }
      });
      courtCount++;

      // Create SPPs under this Court
      for (const sppName of entry.spps) {
        await prismaClient.masterItem.create({
          data: {
            category: 'spp',
            name: sppName,
            parentId: courtItem.id,
            isActive: true
          }
        });
        sppCount++;
      }
    }
  }

  // Clear Redis Cache if available
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.del('master-items:courtName');
      await redisClient.del('master-items:spp');
      console.log('Cleared redis cache for courtName and spp');
    } catch (e) {
      // ignore
    }
  }

  console.log(`✅ Successfully seeded ${courtCount} Court records and ${sppCount} SPP records across districts!`);
}

module.exports = { seedCourtsAndSpps };

if (require.main === module) {
  seedCourtsAndSpps(prisma, true)
    .catch(err => {
      console.error('Error during seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

