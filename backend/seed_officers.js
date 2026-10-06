const prisma = require('./prismaClient');

const rawTable = `
| Bangalore   city-1 | Superintendent   of Police Bangalore City 1           | Mahanteshwara S   Jiddi         |
| ------------------ | ----------------------------------------------------- | ------------------------------- |
| Bangalore City 1   | Deputy   Superintendent of Police-1 Bangalore City 1  | Sunil   Y Naik                  |
| Bangalore City 1   | Deputy   Superintendent of Police-2 Bangalore City 1  | Pradeep   Kumar P M             |
| Bangalore City 1   | Deputy   Superintendent of Police-5 Bangalore City 1  | Putta   Obalareddy K O          |
| Bangalore City 1   | Deputy   Superintendent of Police-6 Bangalore City 1  | Vinayak   N Shetageri           |
| Bangalore City 1   | Deputy   Superintendent of Police-9 Bangalore City 1  | Praveen   M                     |
| Bangalore City 1   | Deputy   Superintendent of Police-10 Bangalore City 1 | Vasanth   C                     |
| Bangalore City 1   | Deputy   Superintendent of Police-14 Bangalore City 1 | Brijesh   Mathew                |
| Bangalore City 1   | Deputy   Superintendent of Police-13 Bangalore City 1 | Mallikarjun   Chukki S          |
| Bangalore City 1   | Police   Inspector-1 Bangalore City 1                 | Srikanth   S                    |
| Bangalore City 1   | Police   Inspector-4 Bangalore City 1                 | Raju   B                        |
| Bangalore City 1   | Police   Inspector-5 Bangalore City 1                 | Bhaskar   C R                   |
| Bangalore City 1   | Police   Inspector-6 Bangalore City 1                 | Shivalingappagoud   B Patil     |
| Bangalore City 1   | Police   Inspector-7 Bangalore City 1                 | Ramappa   V Savalagi            |
| Bangalore City 1   | Police   Inspector-9 Bangalore City 1                 | Vacant                          |
| Bangalore City 1   | Police   Inspector-10 Bangalore City 1                | Krishna   Kumar P S             |
| Bangalore City 1   | Police   Inspector-20 Bangalore City 1                | Palaksha   Prabhu KN            |
| Bangalore City 1   | Police   Inspector-19 Bangalore City 1                | Govindaraju   M                 |
| Bangalore City 1   | Police   Inspector-20 Bangalore City 1                | Kumarswamy   B G                |
| Bangalore City 1   | Police   Inspector-24 Bangalore City 1                | Babu   S (OOD- SP-4)            |
| Bangalore City 1   | Police   Inspector-26 Bangalore City 1                | Keshava   Murthy R              |
| Bangalore City 1   | Police   Inspector-27 Bangalore City 1                | Rajashekharaiah   B C           |
| Bangalore City 1   | Police   Inspector-28 Bangalore City 1                | Adivappa   S Gudiguppa          |
| Bangalore City 1   | Police   Inspector-29 Bangalore City 1                |                                 |
| Bangalore   City 1 | Police   Inspector-30 Bangalore City 1                | Mahadev Shirahatti              |
| Bengaluru City-2   | Superintendent   of Police, Bangalore City-2          | Mahanteshwara   S Jiddi         |
| Bengaluru City-2   | Deputy   Superintendent of Police-8 Bangalore City-2  | Anilkumar   H R                 |
| Bangalore City 2   | Deputy   Superintendent of Police-3 Bangalore City-2  | Satish   M H                    |
| Bangalore City 2   | Deputy   Superintendent of Police-4 Bangalore City 2  | H   J Thippeswamy               |
| Bangalore City 2   | Deputy   Superintendent of Police-7 Bangalore City 2  | K   C Poovaiah                  |
| Bengaluru City-2   | Deputy   Superintendent of Police-11 Bangalore City 2 | Nagesh   S Haslar               |
| Bengaluru City-2   | Deputy   Superintendent of Police-12 Bangalore City 2 | Srinivas   M S                  |
| Bengaluru City-2   | Deputy   Superintendent of Police-19 Bangalore City 2 | Bharath   S Reddy               |
| Bengaluru City-2   | Police   Inspector-2, Bangalore City 2                | Gajendra   V                    |
| Bengaluru City-2   | Police   Inspector-3, Bangalore City 2                | Chidananda   Murthy T B         |
| Bengaluru City-2   | Police   Inspector-8, Bangalore City 2                | Vacant                          |
| Bengaluru City-2   | Police   Inspector-11, Bangalore City 2               | Vijaya   Krishna N              |
| Bengaluru City-2   | Police   Inspector-13, Bangalore City 2               | Shankarappa   M                 |
| Bengaluru City-2   | Police   Inspector-15, Bangalore City 2               | Ashok   Kumar H                 |
| Bengaluru City-2   | Police   Inspector-16, Bangalore City 2               | Maruti   G Nayak                |
| Bengaluru City-2   | Police   Inspector-23, Bangalore City 2               | Mallappa   Siddappa Bolettin    |
| Bengaluru City-2   | Police   Inspector-25, Bangalore City 2               | Pradeep   Poojary K             |
| Bengaluru City-2   | Police   Inspector-14, Blr City-2                     | Vacant                          |
| Bengaluru City-2   | Police   Inspector-12, Blr City-2                     | Vacant                          |
| Bengaluru City-2   | Police   Inspector-17, Blr City-2                     | Vacant                          |
| Bangalore Rural    | Superintendent   of Police Bangalore Rural            | Mahanteshwara   S Jiddi         |
| Bangalore Rural    | Deputy   Superintendent of Police-2 Bangalore Rural   | Girish   Pandu Rodkar           |
| Bangalore Rural    | Deputy   Superintendent of Police-1 Bangalore Rural   | Gowhtam   J                     |
| Bangalore Rural    | Police   Inspector-2 Bangalore Rural                  | Nandakumar   B S                |
| Bangalore Rural    | Police   Inspector-3 Bangalore Rural                  | Manjunath.D                     |
| Bangalore Rural    | Police   Inspector-4 Bangalore Rural                  |  Ramesh J                       |
| Bangalore Rural    | Police   Inspector-5 Bangalore Rural                  | M.S   Bolettin                  |
| Bangalore Rural    | Police   Inspector-1 Bangalore Rural                  |  Chandrakanth L.T (OOD)         |
| Bangalore Rural    | Police   Inspector-6 Bangalore Rural                  | Ninganagowda   Patil            |
| Bagalkot           | Superintendent   of Police Bagalkot                   | M   B Nandaganvi                |
| Bagalkot           | Deputy   Superintendent of Police Bagalkot            | Suresh   Reddy  M S             |
| Bagalkot           | Police   Inspector-1 Bagalkot                         | V.   N. Kadi                    |
| Bagalkot           | Police   Inspector-2 Bagalkot                         | Mallikarjun   B Biradar         |
| Bagalkot           | Police   Inspector-3 Bagalkot                         | Nagappa   Ramappa Khilare       |
| Belagavi           | Superintendent   of Police Belagavi                   | Prasanna   Desai                |
| Belagavi           | I/C   Deputy Superintendent of Police-2 Belagavi      | Niranjan   M Patil              |
| Belagavi           | Deputy   Superintendent of Police-1 Belagavi          | B   S Patil                     |
| Belagavi           | Deputy   Superintendent of Police-3 Belagavi          | Bharath   S Reddy               |
| Belagavi           | Police   Inspector-3 Belagavi                         | Govindagouda   S Patil          |
| Belagavi           | Police   Inspector-1 Belagavi                         | Bhalachandra   Lakkam           |
| Belagavi           | Police   Inspector-2 Belagavi                         | Venkatesh   K Yadahalli         |
| Belagavi           | Police   Inspector-4 Belagavi                         | Niranjan   M Patil              |
| Belagavi           | Police   Inspector-5 Belagavi                         | Sangamanath   H Hosamani        |
| Belagavi           | Police   Inspector-6 Belagavi                         | Gururaj   N Mailar              |
| Bellary            |  Superintendent of Police Bellary                     | M   S KOULAPURE                 |
| Bellary            | Deputy   Superintendent of Police.Bellary             | S   S Belagi                    |
| Bellary            | Police   Inspector-1 Bellary                          | Suresh   M Bhavimani            |
| Bellary            | Police   Inspector-2 Bellary                          | Guranna   S Hebbal              |
| Bidar              | Superintendent   of Police Kalaburagi                 | Siddaraju.C   (sp kalburgi)     |
| Bidar              | Deputy   Superintendent of Police Bidar               | Hanamanthray                    |
| Bidar              | Police   Inspector-1 Bidar                            | Santosh   S Rathod              |
| Bidar              | Police   Inspector-2 Bidar                            | Udandappa                       |
| Bidar              | Police   Inspector-3 Bidar                            | Babasaheb   Patil               |
| Bidar              | Police   Inspector-4 Bidar                            | Arjunappa                       |
| Chamarajanagara    | Superintendent   of Police Chamrajnagar               | Udesha   T J                    |
| Chamarajanagara    | Deputy   Superintendent of Police Chamarajanagara     | Gajendraprasad   G S            |
| Chamarajanagara    | Police   Inspector-1 Chamarajanagara                  | Sudhakara   K N                 |
| Chamarajanagara    | Police   Inspector-2 Chamarajanagara                  | Lohith   Kumar M K              |
| Chikkaballapur     | Superintendent   of Police Chikkaballapur             | Antony   John J K               |
| Chikkaballapur     | Deputy   Superintendent of Police-1 Chikkaballapur    | Veerendrakumar   P              |
| Chikkaballapur     | Police   Inspector-1 Chikkaballapur                   | Nirmala   V                     |
| Chikkaballapur     | Police   Inspector-2 Chikkaballapur                   | Shivaraj   Kumar                |
| Chitradurga        | Superintendent   of Police Chitradurga                | M   S KOULAPURE                 |
| Chitradurg         | Deputy   Superintendent of Police Chitradurga         | KALAVATHI   K                   |
| Chitradurga        | Police   Inspector-1 Chitradurga                      | Basavaraj M Patil               |
| Chitradurga        | Police   Inspector-2 Chitradurga                      | Suma M Gorabala                 |
| Chitradurga        | Police   Inspector-3 Chitradurga                      | Basavaraja   Bhojappa Lamani    |
| Davanagere         | Superintendent   of Police Davanagere                 | Antony   John J K               |
| Davanagere         | Deputy   Superintendent of Police-1 Davanagere        | N.   Mruthyunjaya.              |
| Davanagere         | Police   Inspector-1 Davanagere                       | Sarala   P                      |
| Davanagere         | Police   Inspector-2 Davanagere                       | Gurubasavaraja   H              |
| Davanagere         | Police   Inspector-3 Davanagere                       | Prabhu   B Surin                |
| Dharwad            | Superintendent   of Police Dharwad                    | S   T Siddalingappa             |
| Dharwad            | Deputy   Superintendent of Police-1 Dharwad           | Venkanagouda   N Patil          |
| Dharwad            | Deputy   Superintendent of Police-2 Dharwad           | Raveendra   M Kurubagatti       |
| Dharwad            | Police   Inspector-1 Dharwad                          | Prasad K Fanekar                |
| Dharwad            | Police   Inspector-2 Dharwad                          | Karuneshagowda   J              |
| Dharwad            | Police   Inspector-3 Dharwad                          | Basavaraj  Thimmanna Budni      |
| Dharwad            | Police   Inspector-4 Dharwad                          | Prabulingayya S Hiremath        |
| Gadag              | Superintendent   of Police Dharwad                    | S   T Siddalingappa             |
| Gadag              | Deputy   Superintendent of Police-1 Gadag             | Vijay   Biradar                 |
| Gadag              | Police   Inspector-1 Gadag                            | Parameshwar   G kawatagi        |
| Gadag              | Police   Inspector-2 Gadag                            | Shavoobai   Siddappa Teli       |
| Hassan             | Superintendent   of Police Hassan                     | Nandini   B N                   |
| Hassan             | Deputy   Superintendent of Police Hassan              | Suresh   H S                    |
| Hassan             | Police   Inspector-1 Hassan                           |  Shilpa K                       |
| Hassan             | Police   Inspector-2 Hassan                           | Chandrasheakar   C L            |
| Haveri             | Superintendent   of Police Haveri                     | M   S KAULAPURE (SP Davanagere) |
| Haveri             | Deputy   Superintendent of Police Haveri              | Madhusudan   C                  |
| Haveri             | Police   Inspector-1 Haveri                           | Dadavali   K H                  |
| Haveri             | Police   Inspector-2 Haveri                           | Shridevi   A Patil              |
| Haveri             | Police   Inspector-3 Haveri                           | Vishwanath   D Kabburi          |
| Vijayanagara       | Superintendent   of Police Vijayanagara               | (SP   Ballary) Vasudevarama.N   |
| Vijayanagara       | Deputy   Superintendent of Police, Vijayanagara       | Sachin   S Chalawadi            |
| Vijayanagara       | Police   Inspector-1 Vijayanagara                     | Rajesh   Seethappa Lamani       |
| Vijayanagara       | Police   Inspector-2 Vijayanagara                     | Amaresh   Hubballi              |
| Vijayanagara       | Police   Inspector-3 Vijayanagara                     | Vacant                          |
| Kalaburagi         | Superintendent   of Police Kalaburgi                  | Siddaraju   C                   |
| Kalaburagi         | Deputy   Superintendent of Police-1 Kalaburgi         | Basavaraj   Yaligar             |
| Kalaburagi         | <br>     Deputy Superintendent of Police-2 Kalaburgi  | Sheelavantha  S Hosamani        |
| Kalaburagi         | Police   Inspector-1 Kalaburgi                        | Arun   muragundi                |
| Kalaburagi         | Police   Inspector-2 Kalburgi                         | Rajshekar   S Badadesar         |
| Kalaburagi         | Police   Inspector-3 Kalaburgi                        | Ravi   Pavar                    |
| Karwar             | Superintendent   of Police Karwar                     |  Kumar Chandra                  |
| Karwar             | Deputy   Superintendent of Police, Karwar             | Dhanya   Nayak                  |
| Karwar             | Police   Inspector-1 Karwar                           | Vinayak   Billav                |
| Karwar             | Police   Inspector-2 Karwar                           | Ravi   N N                      |
| Karwar             | Police   Inspector-3 Karwar                           | VACANT                          |
| Kolar              | I/c   Superintendent of Police Kolar                  | Vivekananda   G Tulasigeri      |
| Kolar              | Deputy Superintendent of   Police-1 Kolar             | T C Venkatesha                  |
| Kolar              | Deputy Superintendent of   Police-2 Kolar             | Sunilkumar B                    |
| Kolar              | Incharge Police Inspector-1   Kolar                   | Anjanappa K S                   |
| Kolar              | Police Inspector-2 Kolar                              | Anjanappa K S                   |
| Kolar              | Police Inspector-3 Kolar                              | Renuka A V                      |
| Kolar              | Police Inspector Kolar                                | Pradeep   Poojary K             |
| Koppal             | Superintendent   of Police Koppal                     | Siddaraju   C (incharge)        |
| Koppal             |  Deputy Superintendent of Police, Koppal              | Lokesh                          |
| Koppal             | Police   Inspector-1 Koppal                           | Chandrappa   Eti                |
| Koppal             | Police   Inspector-2 Koppal                           | Sunil   Megalamani              |
| Koppal             | Police   Inspector-3 Koppal                           | Shaila   S Pyatishettar         |
| Kodagu             | Superintendent   of Police Mysore                     | (SP   Mysuru) Udesha T J        |
| Kodagu             | Deputy   Superintendent of Police Kodagu              | Dinakar   Shetty                |
| Kodagu             | Police   Inspector-1 Kodagu                           | Vacant                          |
| Kodagu             | Police   Inspector-2 Kodagu                           | Veena   Naik                    |
| Mandya             | Superintendent   of Police Mandya                     | Sureshbabu   S                  |
| Mandya             | Deputy   Superintendent of Police-1 Mandya            | Sunil   Kumar H T               |
| Mandya             | Police   Inspector-1 Mandya                           | Ravi   Kumar M                  |
| Mandya             | Police   Inspector-2 Mandya                           | Lepakshamurty   R G             |
| Mandya             | Police   Inspector-3 Mandya                           | Byatarayagowda   B P            |
| Mangalore          | Superintendent   of Police Mangalore                  | B   P Dinesh Kumar              |
| Mangalore          | Deputy   Superintendent of Police-1 Mangalore         | Dr   Gana P Kumar               |
| Mangalore          | Deputy   Superintendent of Police-2 Mangalore         | Suresh   Kumar P                |
| Mangalore          | Police   Inspector-1 Mangalore                        | Bharathi   G                    |
| Mangalore          | Police   Inspector-2 Mangalore                        | Chandrashekar   KN              |
| Mangalore          | Police   Inspector-3 Mangalore                        | Vacant                          |
| Mangalore          | Police   Inspector-4 Mangalore                        | Vacant                          |
| Mysore             | Superintendent   of Police Mysore                     | Udesha   T J                    |
| Mysore             | Deputy   Superintendent of Police-1 Mysore            | Shailendra   H M                |
| Mysore             | Deputy   Superintendent of Police-2 Mysore            | Venkatesh   P V                 |
| Mysore             | Police   Inspector-1 Mysore                           | Girish   K N                    |
| Mysore             | Police   Inspector-2 Mysore                           | Vijaykumar   G R                |
| Mysore             | Police   Inspector-3 Mysore                           | Venkatesh   P V                 |
| Mysore             | Police   Inspector-4 Mysore                           | Vijaykumar   G R                |
| Raichur            | Superintendent   of Police Raichur                    | Satish   S Chitagubbi           |
| Raichur            | Deputy   Superintendent of Police-1 Raichur           | Shivananda                      |
| Raichur            | Police   Inspector-1 Raichur                          | Kalappa  M Badiger              |
| Raichur            | Police   Inspector-2 Raichur                          | Ravi   Purushottama             |
| Bengaluru South    | Superintendent   of Police Bengaluru South            | Sneha   P V                     |
| Bengaluru South    | Deputy   Superintendent of Police-1 Bengaluru South   | Shivaprasad   G                 |
| Bengaluru South    | Deputy   Superintendent of Police-2 Bengaluru South   | Rajesh   K                      |
| Bengaluru South    | police   Inspector-1 Bengaluru South                  | Sandeepkumar   BN               |
| Bengaluru South    | Police   Inspector-2 Bengaluru South                  | Kumar   m                       |
| Bengaluru South    | Police   Inspector-3 Bengaluru South                  | Vijaykumar                      |
| Shivamogga         | Superintendent   of Police Shivamogga                 | M   S KOULAPURE                 |
| Shivamogga         | Deputy   Superintendent of Police-1 Shivamogga        | Chandrasheaker   B P            |
| Shivamogga         | Police   Inspector-1 Shivamogga                       | Rudresh   K P                   |
| Shivamogga         | Police   Inspector-2 Shivamogga                       | Gururaj   N Mailar              |
| Shivamogga         | Police   Inspector-3 Shivamogga                       | Veerabasappa   L Kuslapur       |
| Tumkur             | Superintendent   of Police Tumkur                     | T Mallesh                       |
| Tumkur             | Deputy Superintendent of   Police-1 Tumkur            | Santhosh K M                    |
| Tumkur             | Deputy Superintendent of   Police-2 Tumkur            | Manjunatha M                    |
| Tumkur             |  Police Inspector-1 Tumkur                            | Raghavendra G K                 |
| Tumkur             | Police Inspector-2 Tumkur                             | Raju T                          |
| Tumkur             | Police Inspector-3 Tumkur                             | Shanthinath J Vannur            |
| Tumkur             | Police Inspector-4 Tumkur                             | Nirmala V                       |
| Udupi              | Superintendent   of Police Mangalore                  | B   P Dinesh Kumar              |
| Udupi              | Deputy   Superintendent of Police-1 Udupi             | V   S Halamurthy Rao            |
| Udupi              | Police   Inspector-1 Udupi                            | Manjunatha                      |
| Udupi              | Police   Inspector-2 Udupi                            | Rajendra   Naik M N             |
| Vijayapura         | Superintendent   of Police Vijayapura                 | M   B Nandagavi                 |
| Vijayapura         | Deputy   Superintendent of Police-1 Vijayapura        | M   S Tulasigeri                |
| Vijayapura         | Police   Inspector-1 Vijayapura                       | Ananda   V Takkannanavar        |
| Vijayapura         | Police   Inspector-2 Vijayapura                       | Anand   A Doni                  |
| Vijayapura         | Police   Inspector-3 Vijayapura                       | Ningappa   H Pujeri             |
| Yadagiri           | Superintendent   of Police Yadagiri                   | Siddaraju   C                   |
| Yadagiri           | Deputy   Superintendent of Police Yadagiri            | J   H Inamdar                   |
| Yadagiri           | Police   Inspector-1 Yadagiri                         | Sangamesh                       |
| Yadagiri           | Police   Inspector-2 Yadagiri                         | Sidaraya   Baloorgi             |
| CHIKKAMAGALURU     | Superintendent   of Police Hassan                     | SP   HASSAN (Nandini B.N )      |
| CHIKKAMAGALURU (F) | Deputy   Superintendent of Police-1 Chikkamagaluru    | JJ   THIRUMALESH                |
| CHIKKAMAGALURU     | POLICE   INSPECTOR 3                                  | Vecant                          |
| CHIKKAMAGALURU     | POLICE   INSPECTOR 2                                  | Vecant                          |
| CHIKKAMAGALURU     | POLICE   INSPECTOR 1                                  | Malikarjuna   B                 |
`;

function normalizeDistrictName(raw) {
  const s = raw.toLowerCase().replace(/[\u00a0\r\n\t]/g, ' ').replace(/\s+/g, ' ').replace(/\(f\)/g, '').trim();
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

function cleanText(raw) {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '')
    .replace(/[\u00a0\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function cleanOfficerName(raw) {
  const cleaned = cleanText(raw);
  if (!cleaned || cleaned.toLowerCase() === 'vacant' || cleaned.toLowerCase() === 'vecant') {
    return 'Vacant';
  }
  return cleaned;
}

async function seedOfficers() {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  if (!adminUser) {
    throw new Error('Admin user not found!');
  }
  console.log(`Using admin user: ${adminUser.id} (${adminUser.email})`);

  const allDistricts = await prisma.district.findMany({
    include: { designations: true }
  });
  const districtMap = new Map();
  for (const d of allDistricts) {
    districtMap.set(d.name.toLowerCase(), d);
    if (d.shortName) districtMap.set(d.shortName.toLowerCase(), d);
  }

  const lines = rawTable.trim().split('\n');
  const parsedRows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('---')) continue;
    const parts = trimmed.split('|').map(p => p.trim());
    if (parts.length >= 4) {
      const rawDist = parts[1];
      const rawDesig = parts[2];
      const rawName = parts[3];
      parsedRows.push({
        rawDist,
        rawDesig,
        rawName,
        district: normalizeDistrictName(rawDist),
        designation: cleanDesignationName(rawDesig),
        officerName: cleanOfficerName(rawName)
      });
    }
  }

  console.log(`Parsed ${parsedRows.length} officer rows from input.`);

  // Clean up any old test officer records
  const existingCount = await prisma.officer.count();
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing officers. Cleaning up before fresh seed...`);
    await prisma.officerPreviousPlace.deleteMany({});
    await prisma.officer.deleteMany({});
    console.log('Cleared existing officers.');
  }

  let createdCount = 0;
  const createdOfficers = [];

  for (const row of parsedRows) {
    const dist = districtMap.get(row.district.toLowerCase());
    if (!dist) {
      throw new Error(`District not found for "${row.rawDist}" -> "${row.district}"`);
    }

    // Match designation with district's designations
    let matchedDesig = dist.designations.find(d =>
      d.name.toLowerCase() === row.designation.toLowerCase()
    );

    if (!matchedDesig) {
      matchedDesig = dist.designations.find(d =>
        d.name.toLowerCase().includes(row.designation.toLowerCase()) ||
        row.designation.toLowerCase().includes(d.name.toLowerCase())
      );
    }

    const finalDesignationName = matchedDesig ? matchedDesig.name : row.designation;

    const officer = await prisma.officer.create({
      data: {
        districtId: dist.id,
        name: row.officerName,
        designation: finalDesignationName,
        mobile: null,
        reportingDate: null,
        presentAddress: null,
        permanentAddress: null,
        remarks: null,
        isActive: true,
        createdById: adminUser.id,
        updatedById: adminUser.id
      }
    });

    createdOfficers.push(officer);
    createdCount++;
  }

  console.log(`\n🎉 Successfully created ${createdCount} officer records in the database!`);
  const finalTotal = await prisma.officer.count();
  console.log(`Total officers now in DB: ${finalTotal}`);
}

seedOfficers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error seeding officers:', e);
    process.exit(1);
  });
