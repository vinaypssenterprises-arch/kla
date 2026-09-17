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
  const admin = await prisma.user.findUnique({ where: { email: 'admin' } });

  if (!admin) {
    await prisma.user.create({
      data: {
        email: 'admin',
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
      where: { email: 'admin' },
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
// Taluk / Police Station are left empty for the admin to populate via
// Masters — no invented data. Department / Sub Department are seeded from
// the standard Karnataka government department directory below.
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

// Standard Karnataka government departments and their sub-departments/offices,
// used to populate the Department / Sub Department dropdowns on the petition
// and officer forms.
const DEPARTMENTS = {
  "Department of Commerce and Industries": [
    "Industrial Development Commissioner and Director, Department of Commerce and Industries,Bengaluru",
    "Director, Department of Mines and Geology, Bengaluru",
    "Commissioner for Textile Development and Director Department of Handlooms and Textiles, Bengaluru",
    "Commissioner for Cane Development and Director, Sugar Department, Bengaluru",
    "Managing Director, Mysore Sugar Company Limited",
    "Karnataka Sugar Institute, Belagavi",
    "Karnataka Handloom Development Corporation Limited",
    "Karnataka State Power loom Development Corporation Limited",
    "Hatti Gold Mines Company Limited",
    "Mysore Minerals Corporation",
    "K.A.I.A.D.B",
    "Karnataka Coir Development Corporation",
    "N.G.E.F (Hubballi) Limited",
    "Karnataka Power Company",
    "Karnataka State Small Industries Development Corporation Limited",
    "Government Tool Room and Training Centre",
    "Marketing Consultants and Agencies",
    "Mysore Sales International Limited",
    "Karnataka State Industrial Investment and Development Corporation Limited",
    "Mysore Electrical Limited",
    "Karnataka Soaps and Detergents Corporation",
    "Mysore Paper Mills Corporation",
    "Mysore Dyes and Colour Corporation",
    "Karnataka State Khadi and Village Industries Board",
    "Karnataka State Handicrafts Development Corporation Limited"
  ],
  "Backward Classes Welfare Department": [
    "Commissioner, Backward Classes Welfare Department, Bengaluru",
    "Managing Director, D.DevarajUrs Backward Classes  Development Corporation, Bengaluru",
    "Secretary, Karnataka State Commission for Backward Classes, Bengaluru",
    "Director, D. DevarajUrs  Research Institute, Bengaluru",
    "Executive Director, Karnataka Residential Educational Institutions Society, Bengaluru"
  ],
  "Social Welfare Department": [
    "Commissioner, Social Welfare Department, 5th Floor, M.S Building, Bengaluru",
    "Director, Scheduled Tribes Welfare Department, KrishiBhavan, Hudson Circle, Bengaluru",
    "Managing Director, Dr. B. R. Ambedkar Development Corporation, 9th and 10th Floor, V.V. Towers, Bengaluru",
    "Managing Director, Karnataka MaharshiValmiki Scheduled Tribes Development Corporation, VasantaNagara,  Bengaluru",
    "Managing Director, Karnataka Thanda Development Corporation, Tuscar Town,Shivaji Nagar,  Bengaluru",
    "Executive Director, Karnataka Residential Educational Institutions Society, Sheshadripuram, Bengaluru",
    "Managing Director, Dr. BabuJagjivan Ram Leather Industries  Development Corporation Limited (LIDKAR), Town Hall Circle,Bengaluru",
    "Secretary, Central Relief Committee, Magadi Road, Bengaluru",
    "Director, Ambedkar Research Institute, AmbedkarBhavan, VasantaNagara,  Bengaluru",
    "Secretary, Karnataka State, Commission for Scheduled Classes and Scheduled Tribes, Nrupatunga Road, Opposite of R.B.I, Bengaluru",
    "Secretary, Karnataka State SafaiKarmachari  Commission, SampangiRamanagar, Bengaluru",
    "D.I.G, Directorate of Civil Rights Enforcement, Bengaluru",
    "Director, Tribal Research Institute, Mysore",
    "Principal P.E.T.C, AmbedkarBhavan, Bengaluru"
  ],
  "Housing Department": [
    "Commissioner, Housing Department",
    "Karnataka Housing Board",
    "Karnataka Slum Development Board",
    "Rajiv Gandhi Housing Corporation Limited"
  ],
  "Medical Education Department": [
    "Director and Dean, Bengaluru Medical Colleges and Research Institute, Bengaluru",
    "Director,Institute of Nephro –Urology, Victoria Hospital Campus, Bengaluru",
    "Director, Sri Jayadeva Institute of Cardiovascular Sciences  and Research, Bannerghatta Road, Bengaluru",
    "Director, S.D.S Rajiv Gandhi Institute of Chest Diseases  and Research, Bengaluru",
    "Director, Indira Gandhi Institute of Child Health, Bengaluru",
    "Director, Karnataka Institute of Diabetes, Bengaluru",
    "Director, Kidwai Memorial institute of Oncology, Bengaluru",
    "Director and Dean, Mysore Medical Colleges and Research Institute, Mysore",
    "Director, Karnataka Institute of Medical Sciences, Hubballi",
    "Director,Vijaya Nagara Institute of Medical Sciences,Ballary",
    "Director, Mandya Institute of Medical Sciences, Mandya",
    "Director, Hassan Institute of Medical Sciences, Hassan",
    "Director, Shivamogga Institute of Medical Sciences, shivamogga",
    "Director, Belgaum Institute of Medical Sciences, Belgaum",
    "Director,Bidar Institute of Medical Sciences, Bidar",
    "Director,Raichuru Institute of Medical Sciences, Raichuru",
    "Director,Dharwad Institute of Mental Health and Neuro Sciences, Dharwad",
    "Director,Kodagu Institute of Medical Sciences, Madikeri",
    "Director,Karwar Institute of Medical Sciences, Karwar",
    "Director,Koppala Institute of Medical Sciences, Koppala",
    "Director,  Gadaga Institute of Medical Sciences, Gadaga",
    "Director, Gulbarga Institute of Medical Sciences, Gulbarga",
    "Director, Chamaraj Nagar Institute of Medical Sciences, Chamaraj Nagar",
    "Director, Government Dental College, Victoria Hospital Campus, Bengaluru",
    "Special Officer, Raichuru Super SpecialityHospital"
  ],
  "Minority  Welfare, Haj and Wakf Department": [
    "Chief Executive Officer, Karnataka State Wakf Board, Cunningham Road, Bengaluru",
    "Director, Directorate of Minority Welfare, V.V. Tower, Bengaluru",
    "Managing Director, Minorities Development Corporation, Bengaluru",
    "Registrar, Karnataka Urdu Academy, Bengaluru",
    "Executive Officer, Karnataka Haj Committee, Bengaluru",
    "Secretary, Karnataka State Commission for Minorities, Bengaluru"
  ],
  "Tourism Department": [
    "Directorate of Tourism, KhanijaBhavan, Bengaluru",
    "Karnataka State Tourism Development Corporation, KhanijaBhavan, Bengaluru",
    "Jungle Lodges and Resorts Limited,  KhanijaBhavan, Bengaluru"
  ],
  "Labour Department": [
    "Labour Commissioner, KarmikaBhavan, Bannerghatta Road, Bengaluru",
    "Commissioner,Employmentand Training Department, KoushalyaBhavan, Bannerghatta Road, Bengaluru",
    "Director, Institute of Employees State Insurance Scheme  Medical Service, Rajaji Nagar, Bengaluru",
    "Director, Department of  Factories, Boilers, Industrial Safety and Health, Bengaluru"
  ],
  "Department of Animal Husbandry and Fisheries": [
    "Commissioner,  Department of Animal Husbandry and Veterinary  Services, Bengaluru",
    "Director, Department of Fisheries, V.V. Tower, Bengaluru",
    "Managing Director, Karnataka Milk Producers’ Federation, Hosur Road,  Bengaluru",
    "Director,Institute of Animal Health and VeterinaryBiologicals,  Hebbala,  Bengaluru",
    "Managing Director, Karnataka Co-Operative Poultry Federation, Bengaluru",
    "Managing Director, Karnataka Co-Operative Fisheries Federation,  ThyagaMarga, SiddarthaNagar, Mysore",
    "Managing Director, Karnataka Fisheries Development Corporation (Limited), Hryage Bazar, Mangaluru",
    "General Manager, Dakshina Kannada Fish Marketing Federation, Mangaluru",
    "Uttara Kannada District Co-operative Fish Marketing Federation Limited, N. H. 17, SagarDarshanHall Near, Kodibag, Karwar",
    "Chancellor, Karnataka Veterinary, Animal and Fisheries Sciences University, Nandi Nagar, Bidar"
  ],
  "Energy Department": [
    "Managing Director, Bengaluru Electricity  Supply Company Limited, K.R. Circle, Bengaluru",
    "Managing Director, Gulbarga Electricity  Supply Company Limited, Gulbarga",
    "Managing Director,Karnataka Power Transmission Corporation Limited, KaveryBhavan, Bengaluru",
    "Managing Director, Karnataka Renewable Energy Development Corporation Limited, Queens Road, Bengaluru",
    "Managing Director, Karnataka Power Corporation Limited, Shakti Bhavna, Race Course Road, Bengaluru"
  ],
  "Agriculture Department": [
    "Commissioner, Agriculture Department, Bengaluru",
    "Registrar, Agricultural University, Bengaluru",
    "Registrar, Agricultural University, Dharwad",
    "Registrar, Agricultural University, Raichuru",
    "Registrar, University of Agriculture and  Horticulture, Shivamogga",
    "Karnataka State Agricultural Produce Processing and Export Corporation Limited (KAPPEC)",
    "Karnataka State Seeds Corporation Limited, Bengaluru",
    "Karnataka State seed Certification Agency, Bengaluru",
    "Karnataka State Compost Development Corporation, Bengaluru",
    "Karnataka Tur Development Corporation Limited, Gulbarga",
    "The Mysore Tobacco Company",
    "Karnataka Agro Industries Corporation Limited",
    "Karnataka Agro Corn Product Limited",
    "Karnataka Food Limited, Bengaluru"
  ],
  "Department Of Women and Child Development, Empowerment of Differently abled and Senior Citizens": [
    "Director, Department Of Women and Child Development, Bengaluru",
    "Director, Department Of Empowerment of Differently abled and Senior Citizens, Bengaluru",
    "Managing Director, Karnataka State Women Development Corporation, Bengaluru",
    "Secretary,  Karnataka State Commission for Women, Bengaluru",
    "Secretary, JawaharBalaBhavan Society,  Bengaluru",
    "Secretary,  Karnataka State Social Welfare Board, Bengaluru",
    "Secretary, Karnataka State Commission for Protection of Child RightsBengaluru",
    "Commissioner for Persons with Disabilities, Bengaluru",
    "Planning Officer Karnataka BalaVikas Academy, Bengaluru"
  ],
  "Department of Horticulture": [
    "Directorate of Horticulture, Bengaluru",
    "Karnataka Horticulture Federation, Bengaluru",
    "Mysore Horticulture Association",
    "Hopcoms, Bengaluru",
    "Karnataka Horticulture Mission",
    "Karnataka Wine Board",
    "Karnataka Spice Board",
    "Karnataka Mango Development Board",
    "Horticulture Mission Agency",
    "BiologicalsSociety",
    "Bengaluru Nursery Men Co-Operative Society",
    "Karnataka SuvarnaUdyanavanaPratisthana, Bengaluru",
    "University of Horticultural Sciences, Bagalkote"
  ],
  "Department of Sericulture": [
    "Commissioner of Sericulture Development and Director of Sericulture, Bengaluru",
    "Director, Karnataka State Sericulture Research and Development Institute, Bengaluru",
    "Managing Director,  Karnataka State Silk Industries Corporation Limited, Bengaluru",
    "Managing Director,  Karnataka Silk Marketing Board Limited, Bengaluru"
  ],
  "Department of Law, Justice and Women Rights": [
    "Registrar General, Karnataka High Court, Bengaluru",
    "Advocate General, Karnataka High Court, Bengaluru",
    "Vice Chancellor, Law University, Hubballi",
    "Director, Karnataka Judicial Academy, Bengaluru",
    "Member Secretary, Karnataka Law Commission, VidhanaSoudha, Bengaluru",
    "Director, institute for Law and Parliamentary Reform, Bengaluru",
    "Secretary, Karnataka State Human Rights Commission, M.S. Building, Bengaluru",
    "Member Secretary, Karnataka State Legal Service Authority, Bengaluru"
  ],
  "Department of Parliamentary Affairs and legislation": [
    "Directorate of Translations, Bengaluru"
  ],
  "Education Department Higher": [
    "Executive Director, Karnataka Higher Education Council, Bengaluru",
    "Commissioner, Department of Collegiate Education, Bengaluru",
    "Registrar, Bengaluru University, Bengaluru",
    "Registrar, Mysore University, Mysore",
    "Registrar, Kannada University, Hampi",
    "Registrar, Karnataka University, Dharwad",
    "Registrar, Gulbarga University, Gulbarga",
    "Registrar, Mangaluru University, Mangaluru",
    "Registrar, kuvempu University, Shivamogga",
    "Registrar, Karnataka State Open University, Mysore",
    "Registrar, Women University, Bijapura",
    "Registrar, Tumkuru University, Tumkuru",
    "Registrar, Davanagere University, Davanagere",
    "Registrar, Rani Channamma University, Belagavi",
    "Registrar, VijayaNagara  Sri Krishna Devaraya University, Ballary",
    "Registrar, VisvesvarayaTechnological University, Belagavi",
    "Registrar, Karnataka Sanskrit University, Bengaluru",
    "Registrar, Karnataka State Dr. GangubhaiHangal Music and Performing Arts University, Mysore",
    "Registrar, Folklore University, Gotagodi, Haveri"
  ],
  "Education Department Of Primary and Secondary": [
    "Commissioner, Department of Public Instruction, Bengaluru",
    "Additional Commissioner, Department of Public Instruction, Dharwad",
    "Additional Commissioner, Department of Public Instruction, Gulbarga",
    "Director, Department of Pre-University Education, Bengaluru",
    "Directorate of Mass Educations, Malleshwaram, Bengaluru",
    "Director, State Council of Educational Research and Training, Bengaluru",
    "Director, Vocational Educational Department, Bengaluru",
    "Director, Department of Public Libraries, Bengaluru",
    "Director, Department of Printing, Stationery and Publications, Bengaluru"
  ],
  "Department of Water Resources": [
    "Karnataka Neeravari Nigam Ltd, Bengaluru",
    "Krishna BhagyaJala Nigam Ltd, Bengaluru",
    "Cauvery Neeravari Nigam Ltd, Bengaluru",
    "Directorate, CADA, Bengaluru",
    "Chief Engineer, Water Resources Development Department, Bengaluru"
  ],
  "Transport Department": [
    "Commissioner for Transport and Road Safety, Bengaluru",
    "Karnataka State Road Transport Corporation, Bengaluru",
    "Bengaluru Metropolitan Transport Corporation, Bengaluru",
    "North Western Karnataka Road Transport Corporation, Hubballi",
    "North Eastern Road Transport Corporation, Gulbarga",
    "D DevarajaUrs Truck Terminals Ltd (DDUTTL), Bengaluru"
  ],
  "Revenue Department": [
    "Regional Commissioner, Bengaluru, Mysore, Gulbarga and Belagavi",
    "Commissioner, Department of Survey, Settlement and Land Records, Bengaluru",
    "Commissioner, Religious Endowment Department, Chamarajpet, Bengaluru",
    "Inspector General of Registration and Commissioner of Stamps, KandayaBhavan, Bengaluru",
    "Director, Directorate of Social Security and Pensions, Bengaluru",
    "Director, (Bhoomi and UPOR), Bengaluru",
    "Director, AtaljiJanasnehiKendras, Bengaluru",
    "Manager, Public Lands Corporation, KandayaBhavan, Bengaluru"
  ],
  "Home Department": [
    "Director General of Police and Commandant General, Karnataka Fire and Emergency Services, Bengaluru",
    "Director, Department of Sainik Welfare and Resettlement, Bengaluru",
    "Additional Director General of Police and Karnataka Inspector General of Prisons, Bengaluru",
    "Director, Directorate of Prosecutions and Government Litigations, Bengaluru",
    "Director General and Inspector General of Police, Police Department, Bengaluru",
    "Director General of Police and Commandant General, Home Guards and Civil Defence, Bengaluru",
    "Chairman and Managing Director, Karnataka State Police Housing Corporation Ltd,  Bengaluru"
  ],
  "Finance Department": [
    "Commissioner of Commercial Taxes, Bengaluru",
    "Excise Commissioner, Bengaluru",
    "Director of Treasuries, V.V.Tower, Bengaluru",
    "Director, Pension, Small Savings and Asset Liability Monitoring Department, Bengaluru",
    "Director, Karnataka Government Insurance Department, Bengaluru",
    "Controller, State Accounts Department, TTMC, Shanti Nagar, Bengaluru",
    "Managing Director, Karnataka State Financial Corporation, Bengaluru",
    "Managing Director, Karnataka State Beverages Corporation Ltd, Bengaluru"
  ],
  "Department of Co-operation": [
    "Registrar of Co-operative Societies, Bengaluru",
    "Director, Agricultural Marketing Department, Bengaluru",
    "Managing Director, Karnataka State Warehouse Corporation, Bengaluru",
    "Director of Co-operative Audit, Bengaluru",
    "Karnataka State Co-operative Marketing Federation Ltd"
  ],
  "Rural Development and Panchayat Raj Department": [
    "Special Commissioner, MGNREGA Scheme",
    "Commissioner, Karnataka Rural Drinking Water and Sanitation Department",
    "Chief Engineer, Rural Water Supply and Sanitation Agency",
    "Chief Executive Officer, MGNREGA Department",
    "Mission Director, NRLM",
    "Director, Panchayat Raj-1",
    "Director, Panchayat Raj-2",
    "Director, Abdul Nazeer Sab State Institute of Rural Training, Mysore",
    "Director, SuvarnaGramodaya",
    "Head, Gram SwarajaYojane",
    "Chief Engineer, Panchayat Raj Engineering Department, Bengaluru",
    "Chief Executive Officer, Karnataka Rural Road Development Agency",
    "Managing Director, Karnataka Rural Infrastructure Development Corporation",
    "Deputy Director, WGDP",
    "Deputy Director, Roads and Bridges"
  ],
  "Department of Health and Family Welfare": [
    "Commissioner, Commissionerate of Health and Family Welfare and Ayush Services, Bengaluru",
    "Mission Director, National Health Mission, Bengaluru",
    "Drugs Controller, Drugs Control Department, Bengaluru",
    "Project Director, Karnataka Health System Development and Reform Project, Bengaluru",
    "Director, Ayush Department, Bengaluru",
    "Project Director, Karnataka State AIDS Prevention Society, Bengaluru",
    "Director, Karnataka State Drugs and Logistics Warehousing Society, Bengaluru",
    "Director, Karnataka State Institute of Health and Family Welfare, Magadi Road, Bengaluru",
    "Director, Sanjay Gandhi Institute of Trauma and Orthopaedics",
    "Executive Director, SuvarnaSuraksha Trust, Bengaluru"
  ],
  "Department of Food, Civil Supplies and Consumer Affairs": [
    "Food Commissioner, Cunnigham Road, Bengaluru",
    "Controller, Department of Legal Metrology, Bengaluru",
    "Karnataka State Consumer Disputes Redressal Commission, Bengaluru",
    "Karnataka Food and Civil Supplies Corporation Ltd"
  ],
  "Department of Public Works, Ports and Inland Water Transport": [
    "Chief Architect, Department of Architecture, Bengaluru",
    "Chief Engineer, Communication and Building (South), Bengaluru",
    "Chief Engineer, Communication and Building (North), Dharwad",
    "Chief Engineer, National Highways, Bengaluru",
    "Director, Department of Ports and Inland Water Transport, Karwar",
    "Chief Project Officer, Karnataka State Development Project, Bengaluru",
    "Managing Director, Karnataka State Development Corporation Ltd",
    "Managing Director, Karnataka State Construction Corporation Ltd, Bengaluru"
  ],
  "Urban Development Department": [
    "Commissioner, Bengaluru Metropolitan Region Development Authority, Office of the Metropolitan Commissioner, Bengaluru",
    "Managing Director, Bengaluru Metro Rail Corporation Ltd, Bengaluru",
    "Commissioner, Bruhat Bengaluru MahanagarPalike, Bengaluru",
    "Chairman, Bengaluru Water Supply and Sewage Board, Bengaluru",
    "Managing Director, Karnataka Urban Water Supply and Drainage Board, Bengaluru",
    "Commissioner, Bengaluru Development Authority, Bengaluru",
    "Managing Director, KUIDFC, Bengaluru",
    "Commissioner, Directorate of Municipal Administration, Bengaluru",
    "Director, Department of Town and Country Planning, Bengaluru",
    "Commissioner, Urban Land Transport Department, Bengaluru"
  ],
  "Department of Kannada and Culture": [
    "Director, Department of Kannada and Culture, Kannada Bhavan, Bengaluru",
    "Commissioner, Department of Archaeology and Museums, Mysore",
    "Director, Department of Information and Public Relations, VarthaBhavan, Bengaluru",
    "Chief Editor, Gazetteer Department, Bengaluru",
    "Director, Karnataka State Archives Department, VikasSoudha, Bengaluru",
    "Secretary, Kannada Development Authority, VidhanaSoudha, Bengaluru",
    "Commissioner, Hampi World Heritage Area Management Authority, Hospete",
    "D Chamarajedra Academy of Visual Arts, Sayyajirao Road, Mysore",
    "Secretary, Karnataka State Temperance Board, Vishveshwaraih Tower, Bengaluru",
    "Secretary, Karnataka Boarder Area Development Authority, M.S.Building, Bengaluru",
    "Managing Director, Sri Kanthirava Studio Corporation, Bengaluru"
  ],
  "Department of Information Technology, Biotechnology and Science and Technology": [
    "Managing Director, Karnataka Science and Technology Promotion Society (KSTePS), Bengaluru",
    "Member Secretary, Karnataka Science and Technology Academy, Bengaluru",
    "Director, Karnataka State Natural Disaster Monitoring Centre, Bengaluru",
    "Honorary Secretary, Karnataka State Council for Science and Technology",
    "Honorary Secretary, Karnataka State Science Council, Bengaluru",
    "Director, Jawaharlal Nehru Planetarium, Bengaluru",
    "Consultant, Vision Group on Science and Technology, Bengaluru",
    "Director, Directorate of Information Technology and Biotechnology",
    "Managing Director, KBITS",
    "Managing Director, KEONICS",
    "Karnataka State Remote Sensing Application Centre"
  ],
  "Department of Forest, Ecology and Environment": [
    "Principal Chief Conservator of Forest (Head of Forest Force), AranyaBhavan, Bengaluru",
    "Member Secretary, Karnataka Zoo Authority, Mysore",
    "Managing Director, Karnataka State Forest Industries Corporation Ltd, Vanavikasa, Bengaluru",
    "Managing Director, Karnataka Forest Development Corporation Ltd, Vanavikasa, Bengaluru",
    "Managing Director, Karnataka Cashew Development Corporation Ltd, Bengaluru",
    "Member Secretary, Karnataka State Pollution Control Board, Bengaluru",
    "Member Secretary, Karnataka Bio Diversity Board, Bengaluru",
    "Office of the Regional Director (Environment), Mangaluru",
    "Office of the Regional Director (Environment), Udupi",
    "Office of the Regional Director (Environment), Karwar",
    "Office of the Regional Director (Environment), Ballary",
    "Office of the Regional Director (Environment), Gulbarga",
    "Office of the Regional Director (Environment), Belgaum",
    "Principal Director, Environmental Management and Policy Research Institute (EMPRI), Bengaluru",
    "Chief Executive Officer, Lake Development Authority, Bengaluru"
  ],
  "Planning, Programme Monitoring and Statistic Department": [
    "Directorate of Planning, Economics and Statistics, Bengaluru",
    "Hyderabad- Karnataka Area Development Board, Gulbarga",
    "Malnad Area Development Board, Shivamogga",
    "Bayaluseeme Area Development Board, Chitradurga",
    "Coastal Area Development Board, Mangaluru"
  ],
  "Department of Youth Empowerment and Sports": [],
  "Infrastructure Development Department": [],
  "Department of Public Enterprises": [],
  "DPAR": [
    "Karnataka Public Service Commission",
    "Karnataka Lokayuktha",
    "E-governance",
    "Kumara Krupa Guest House, Bengaluru",
    "Office of the Resident Commissioner, New Delhi",
    "Karnataka Bhavan, New Delhi"
  ],
  "Karnataka Governor Secretariat": [],
  "Karnataka Vidhana Parishat Secretariat": [],
  "Karnataka Vidhan Sabha Secretariat": [],
  "Karnataka Government Secretariat": []
};

async function seedDepartments() {
  let deptCount = 0;
  let subDeptCount = 0;

  for (const [deptName, subDepts] of Object.entries(DEPARTMENTS)) {
    const department = await prisma.masterItem.upsert({
      where: { category_name: { category: 'department', name: deptName } },
      update: {},
      create: { category: 'department', name: deptName }
    });
    deptCount++;

    for (const subDeptName of subDepts) {
      await prisma.masterItem.upsert({
        where: { category_name: { category: 'subDepartment', name: subDeptName } },
        update: {},
        create: { category: 'subDepartment', name: subDeptName, parentId: department.id }
      });
      subDeptCount++;
    }
  }

  console.log(`Seeded ${deptCount} departments and ${subDeptCount} sub-departments`);
}

async function main() {
  await seedAdmin();
  await seedDistricts();
  await seedMasterItems();
  await seedDepartments();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
