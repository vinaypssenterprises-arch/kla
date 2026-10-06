const prisma = require('./prismaClient');

// Raw data provided by user: [DistrictInput, DesignationInput]
const rawData = [
  ['Bangalore city-1', 'Superintendent of Police Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-1 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-2 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-5 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-6 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-9 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-10 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-14 Bangalore City 1'],
  ['Bangalore City 1', 'Deputy Superintendent of Police-13 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-1 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-4 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-5 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-6 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-7 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-9 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-10 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-19 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-20 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-24 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-26 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-27 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-28 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-29 Bangalore City 1'],
  ['Bangalore City 1', 'Police Inspector-30 Bangalore City 1'],

  ['Bengaluru City-2', 'Superintendent of Police Bangalore City-2'],
  ['Bengaluru City-2', 'Deputy Superintendent of Police-8 Bangalore City-2'],
  ['Bangalore City 2', 'Deputy Superintendent of Police-3 Bangalore City-2'],
  ['Bangalore City 2', 'Deputy Superintendent of Police-4 Bangalore City 2'],
  ['Bangalore City 2', 'Deputy Superintendent of Police-7 Bangalore City 2'],
  ['Bengaluru City-2', 'Deputy Superintendent of Police-11 Bangalore City 2'],
  ['Bengaluru City-2', 'Deputy Superintendent of Police-12 Bangalore City 2'],
  ['Bengaluru City-2', 'Deputy Superintendent of Police-19 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-2 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-3 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-8 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-11 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-13 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-15 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-16 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-23 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-25 Bangalore City 2'],
  ['Bengaluru City-2', 'Police Inspector-14 Blr City-2'],
  ['Bengaluru City-2', 'Police Inspector-12 Blr City-2'],
  ['Bengaluru City-2', 'Police Inspector-17 Blr City-2'],

  ['Bangalore Rural', 'Superintendent of Police Bangalore Rural'],
  ['Bangalore Rural', 'Deputy Superintendent of Police-2 Bangalore Rural'],
  ['Bangalore Rural', 'Deputy Superintendent of Police-1 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-2 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-3 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-4 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-5 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-1 Bangalore Rural'],
  ['Bangalore Rural', 'Police Inspector-6 Bangalore Rural'],

  ['Bagalkot', 'Superintendent of Police Bagalkot'],
  ['Bagalkot', 'Deputy Superintendent of Police Bagalkot'],
  ['Bagalkot', 'Police Inspector-1 Bagalkot'],
  ['Bagalkot', 'Police Inspector-2 Bagalkot'],
  ['Bagalkot', 'Police Inspector-3 Bagalkot'],

  ['Belagavi', 'Superintendent of Police Belagavi'],
  ['Belagavi', 'I/C Deputy Superintendent of Police-2 Belagavi'],
  ['Belagavi', 'Deputy Superintendent of Police-1 Belagavi'],
  ['Belagavi', 'Deputy Superintendent of Police-3 Belagavi'],
  ['Belagavi', 'Police Inspector-3 Belagavi'],
  ['Belagavi', 'Police Inspector-1 Belagavi'],
  ['Belagavi', 'Police Inspector-2 Belagavi'],
  ['Belagavi', 'Police Inspector-4 Belagavi'],
  ['Belagavi', 'Police Inspector-5 Belagavi'],
  ['Belagavi', 'Police Inspector-6 Belagavi'],

  ['Bellary', 'Superintendent of Police Bellary'],
  ['Bellary', 'Deputy Superintendent of Police Bellary'],
  ['Bellary', 'Police Inspector-1 Bellary'],
  ['Bellary', 'Police Inspector-2 Bellary'],

  ['Bidar', 'Superintendent of Police Kalaburagi'],
  ['Bidar', 'Deputy Superintendent of Police Bidar'],
  ['Bidar', 'Police Inspector-1 Bidar'],
  ['Bidar', 'Police Inspector-2 Bidar'],
  ['Bidar', 'Police Inspector-3 Bidar'],
  ['Bidar', 'Police Inspector-4 Bidar'],

  ['Chamarajanagara', 'Superintendent of Police Chamrajnagar'],
  ['Chamarajanagara', 'Deputy Superintendent of Police Chamarajanagara'],
  ['Chamarajanagara', 'Police Inspector-1 Chamarajanagara'],
  ['Chamarajanagara', 'Police Inspector-2 Chamarajanagara'],

  ['Chikkaballapur', 'Superintendent of Police Chikkaballapur'],
  ['Chikkaballapur', 'Deputy Superintendent of Police-1 Chikkaballapur'],
  ['Chikkaballapur', 'Police Inspector-1 Chikkaballapur'],
  ['Chikkaballapur', 'Police Inspector-2 Chikkaballapur'],

  ['Chitradurga', 'Superintendent of Police Chitradurga'],
  ['Chitradurga', 'Deputy Superintendent of Police Chitradurga'],
  ['Chitradurga', 'Police Inspector-1 Chitradurga'],
  ['Chitradurga', 'Police Inspector-2 Chitradurga'],
  ['Chitradurga', 'Police Inspector-3 Chitradurga'],

  ['Davanagere', 'Superintendent of Police Davanagere'],
  ['Davanagere', 'Deputy Superintendent of Police-1 Davanagere'],
  ['Davanagere', 'Police Inspector-1 Davanagere'],
  ['Davanagere', 'Police Inspector-2 Davanagere'],
  ['Davanagere', 'Police Inspector-3 Davanagere'],

  ['Dharwad', 'Superintendent of Police Dharwad'],
  ['Dharwad', 'Deputy Superintendent of Police-1 Dharwad'],
  ['Dharwad', 'Deputy Superintendent of Police-2 Dharwad'],
  ['Dharwad', 'Police Inspector-1 Dharwad'],
  ['Dharwad', 'Police Inspector-2 Dharwad'],
  ['Dharwad', 'Police Inspector-3 Dharwad'],
  ['Dharwad', 'Police Inspector-4 Dharwad'],

  ['Gadag', 'Superintendent of Police Dharwad'],
  ['Gadag', 'Deputy Superintendent of Police-1 Gadag'],
  ['Gadag', 'Police Inspector-1 Gadag'],
  ['Gadag', 'Police Inspector-2 Gadag'],

  ['Hassan', 'Superintendent of Police Hassan'],
  ['Hassan', 'Deputy Superintendent of Police Hassan'],
  ['Hassan', 'Police Inspector-1 Hassan'],
  ['Hassan', 'Police Inspector-2 Hassan'],

  ['Haveri', 'Superintendent of Police Haveri'],
  ['Haveri', 'Deputy Superintendent of Police Haveri'],
  ['Haveri', 'Police Inspector-1 Haveri'],
  ['Haveri', 'Police Inspector-2 Haveri'],
  ['Haveri', 'Police Inspector-3 Haveri'],

  ['Vijayanagara', 'Superintendent of Police Vijayanagara'],
  ['Vijayanagara', 'Deputy Superintendent of Police Vijayanagara'],
  ['Vijayanagara', 'Police Inspector-1 Vijayanagara'],
  ['Vijayanagara', 'Police Inspector-2 Vijayanagara'],
  ['Vijayanagara', 'Police Inspector-3 Vijayanagara'],

  ['Kalaburagi', 'Superintendent of Police Kalaburgi'],
  ['Kalaburagi', 'Deputy Superintendent of Police-1 Kalaburgi'],
  ['Kalaburagi', 'Deputy Superintendent of Police-2 Kalaburgi'],
  ['Kalaburagi', 'Police Inspector-1 Kalaburgi'],
  ['Kalaburagi', 'Police Inspector-2 Kalburgi'],
  ['Kalaburagi', 'Police Inspector-3 Kalaburgi'],

  ['Karwar', 'Superintendent of Police Karwar'],
  ['Karwar', 'Deputy Superintendent of Police Karwar'],
  ['Karwar', 'Police Inspector-1 Karwar'],
  ['Karwar', 'Police Inspector-2 Karwar'],
  ['Karwar', 'Police Inspector-3 Karwar'],

  ['Kolar', 'I/c Superintendent of Police Kolar'],
  ['Kolar', 'Deputy Superintendent of Police-1 Kolar'],
  ['Kolar', 'Deputy Superintendent of Police-2 Kolar'],
  ['Kolar', 'Incharge Police Inspector-1 Kolar'],
  ['Kolar', 'Police Inspector-2 Kolar'],
  ['Kolar', 'Police Inspector-3 Kolar'],
  ['Kolar', 'Police Inspector Kolar'],

  ['Koppal', 'Superintendent of Police Koppal'],
  ['Koppal', 'Deputy Superintendent of Police Koppal'],
  ['Koppal', 'Police Inspector-1 Koppal'],
  ['Koppal', 'Police Inspector-2 Koppal'],
  ['Koppal', 'Police Inspector-3 Koppal'],

  ['Kodagu', 'Superintendent of Police Mysore'],
  ['Kodagu', 'Deputy Superintendent of Police Kodagu'],
  ['Kodagu', 'Police Inspector-1 Kodagu'],
  ['Kodagu', 'Police Inspector-2 Kodagu'],

  ['Mandya', 'Superintendent of Police Mandya'],
  ['Mandya', 'Deputy Superintendent of Police-1 Mandya'],
  ['Mandya', 'Police Inspector-1 Mandya'],
  ['Mandya', 'Police Inspector-2 Mandya'],
  ['Mandya', 'Police Inspector-3 Mandya'],

  ['Mangalore', 'Superintendent of Police Mangalore'],
  ['Mangalore', 'Deputy Superintendent of Police-1 Mangalore'],
  ['Mangalore', 'Deputy Superintendent of Police-2 Mangalore'],
  ['Mangalore', 'Police Inspector-1 Mangalore'],
  ['Mangalore', 'Police Inspector-2 Mangalore'],
  ['Mangalore', 'Police Inspector-3 Mangalore'],
  ['Mangalore', 'Police Inspector-4 Mangalore'],

  ['Mysore', 'Superintendent of Police Mysore'],
  ['Mysore', 'Deputy Superintendent of Police-1 Mysore'],
  ['Mysore', 'Deputy Superintendent of Police-2 Mysore'],
  ['Mysore', 'Police Inspector-1 Mysore'],
  ['Mysore', 'Police Inspector-2 Mysore'],
  ['Mysore', 'Police Inspector-3 Mysore'],
  ['Mysore', 'Police Inspector-4 Mysore'],

  ['Raichur', 'Superintendent of Police Raichur'],
  ['Raichur', 'Deputy Superintendent of Police-1 Raichur'],
  ['Raichur', 'Police Inspector-1 Raichur'],
  ['Raichur', 'Police Inspector-2 Raichur'],

  ['Bengaluru South', 'Superintendent of Police Bengaluru South'],
  ['Bengaluru South', 'Deputy Superintendent of Police-1 Bengaluru South'],
  ['Bengaluru South', 'Deputy Superintendent of Police-2 Bengaluru South'],
  ['Bengaluru South', 'Police Inspector-1 Bengaluru South'],
  ['Bengaluru South', 'Police Inspector-2 Bengaluru South'],
  ['Bengaluru South', 'Police Inspector-3 Bengaluru South'],

  ['Shivamogga', 'Superintendent of Police Shivamogga'],
  ['Shivamogga', 'Deputy Superintendent of Police-1 Shivamogga'],
  ['Shivamogga', 'Police Inspector-1 Shivamogga'],
  ['Shivamogga', 'Police Inspector-2 Shivamogga'],
  ['Shivamogga', 'Police Inspector-3 Shivamogga'],

  ['Tumkur', 'Superintendent of Police Tumkur'],
  ['Tumkur', 'Deputy Superintendent of Police-1 Tumkur'],
  ['Tumkur', 'Deputy Superintendent of Police-2 Tumkur'],
  ['Tumkur', 'Police Inspector-1 Tumkur'],
  ['Tumkur', 'Police Inspector-2 Tumkur'],
  ['Tumkur', 'Police Inspector-3 Tumkur'],
  ['Tumkur', 'Police Inspector-4 Tumkur'],

  ['Udupi', 'Superintendent of Police Mangalore'],
  ['Udupi', 'Deputy Superintendent of Police-1 Udupi'],
  ['Udupi', 'Police Inspector-1 Udupi'],
  ['Udupi', 'Police Inspector-2 Udupi'],

  ['Vijayapura', 'Superintendent of Police Vijayapura'],
  ['Vijayapura', 'Deputy Superintendent of Police-1 Vijayapura'],
  ['Vijayapura', 'Police Inspector-1 Vijayapura'],
  ['Vijayapura', 'Police Inspector-2 Vijayapura'],
  ['Vijayapura', 'Police Inspector-3 Vijayapura'],

  ['Yadagiri', 'Superintendent of Police Yadagiri'],
  ['Yadagiri', 'Deputy Superintendent of Police Yadagiri'],
  ['Yadagiri', 'Police Inspector-1 Yadagiri'],
  ['Yadagiri', 'Police Inspector-2 Yadagiri'],

  ['CHIKKAMAGALURU', 'Superintendent of Police Hassan'],
  ['CHIKKAMAGALURU', 'Deputy Superintendent of Police-1 Chikkamagaluru'],
  ['CHIKKAMAGALURU', 'Police Inspector 3 Chikkamagaluru'],
  ['CHIKKAMAGALURU', 'Police Inspector 2 Chikkamagaluru'],
  ['CHIKKAMAGALURU', 'Police Inspector 1 Chikkamagaluru']
];

function normalizeDistrictName(raw) {
  const s = raw.toLowerCase().replace(/[\u00a0\r\n\t]/g, ' ').replace(/\(f\)/g, '').trim();
  if (s.includes('bangalore city-1') || s.includes('bangalore city 1') || s.includes('bengaluru city 1')) return 'Bengaluru City 1';
  if (s.includes('bengaluru city-2') || s.includes('bangalore city 2') || s.includes('bangalore city-2') || s.includes('bengaluru city 2')) return 'Bengaluru City 2';
  if (s.includes('bangalore rural') || s.includes('bengaluru rural')) return 'Bengaluru Rural';
  if (s.includes('bengaluru south') || s.includes('bangalore south')) return 'Bengaluru South';
  if (s.includes('bagalkot')) return 'Bagalkote';
  if (s.includes('belagavi')) return 'Belagavi';
  if (s.includes('bellary') || s.includes('ballari')) return 'Ballari';
  if (s.includes('bidar')) return 'Bidar';
  if (s.includes('chamarajanagar')) return 'Chamarajanagar';
  if (s.includes('chikkaballapur')) return 'Chikkaballapura';
  if (s.includes('chikkamagalur')) return 'Chikkamagaluru';
  if (s.includes('chitradurg')) return 'Chitradurga';
  if (s.includes('davanagere')) return 'Davanagere';
  if (s.includes('dharwad')) return 'Dharwad';
  if (s.includes('gadag')) return 'Gadag';
  if (s.includes('hassan')) return 'Hassan';
  if (s.includes('haveri')) return 'Haveri';
  if (s.includes('kalaburagi') || s.includes('kalburgi')) return 'Kalaburagi';
  if (s.includes('karwar')) return 'Karwar';
  if (s.includes('kolar')) return 'Kolar';
  if (s.includes('koppal')) return 'Koppal';
  if (s.includes('kodagu')) return 'Kodagu';
  if (s.includes('mandya')) return 'Mandya';
  if (s.includes('mangalore')) return 'Mangalore';
  if (s.includes('mysore') || s.includes('mysuru')) return 'Mysuru';
  if (s.includes('raichur')) return 'Raichur';
  if (s.includes('shivamogga')) return 'Shivamogga';
  if (s.includes('tumkur') || s.includes('tumakuru')) return 'Tumakuru';
  if (s.includes('udupi')) return 'Udupi';
  if (s.includes('vijayapura')) return 'Vijayapura';
  if (s.includes('vijayanagara')) return 'Vijayanagara';
  if (s.includes('yadgir') || s.includes('yadagiri')) return 'Yadgir';
  return raw.trim();
}

function cleanDesignationName(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, '')
    .replace(/[\u00a0\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ' ')
    .replace(/\.\s*/g, ' ')
    .trim();
}

async function main() {
  const allDistricts = await prisma.district.findMany();
  const districtMap = new Map();
  for (const d of allDistricts) {
    districtMap.set(d.name.toLowerCase(), d);
    if (d.shortName) districtMap.set(d.shortName.toLowerCase(), d);
  }

  console.log(`Loaded ${allDistricts.length} districts from DB.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  // Track unique (districtId, cleanName) seen in this batch
  const seen = new Set();

  for (const [rawDist, rawDesig] of rawData) {
    const targetDistName = normalizeDistrictName(rawDist);
    const dist = districtMap.get(targetDistName.toLowerCase());

    if (!dist) {
      errors.push(`Could not find district for raw: "${rawDist}" (normalized: "${targetDistName}")`);
      continue;
    }

    const cleanDesig = cleanDesignationName(rawDesig);
    const key = `${dist.id}:::${cleanDesig.toLowerCase()}`;
    if (seen.has(key)) {
      console.log(`Skipping duplicate in input: [${dist.name}] ${cleanDesig}`);
      skippedCount++;
      continue;
    }
    seen.add(key);

    // Check if exists in DB
    const existing = await prisma.designation.findFirst({
      where: {
        districtId: dist.id,
        name: { equals: cleanDesig, mode: 'insensitive' }
      }
    });

    if (existing) {
      if (existing.name !== cleanDesig || !existing.isActive) {
        await prisma.designation.update({
          where: { id: existing.id },
          data: { name: cleanDesig, isActive: true }
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      await prisma.designation.create({
        data: {
          name: cleanDesig,
          districtId: dist.id,
          isActive: true
        }
      });
      createdCount++;
    }
  }

  console.log('\n--- SEED SUMMARY ---');
  console.log(`Total processed from input: ${rawData.length}`);
  console.log(`Unique created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already exists): ${skippedCount}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  const totalInDb = await prisma.designation.count();
  console.log(`Total designations in database now: ${totalInDb}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
