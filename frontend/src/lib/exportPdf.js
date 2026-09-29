import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format a date nicely for official government documentation.
 */
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(d);
  }
}

/**
 * Generate and download an individual Case Dossier PDF for a 17-A Petition.
 * Formatted to mirror the EXACT Section I through Section VI flow of the official 17-A Petition Form.
 * 
 * @param {Object} petition - The petition data object
 */
export function exportPetitionToPdf(petition) {
  if (!petition) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Lokayukta Official Theme Palette
  const NAVY = [0, 14, 137];         // #000E89 Deep Lokayukta Navy
  const GOLD = [201, 161, 94];        // #C9A15E Brass Gold
  const DARK_SLATE = [30, 41, 59];    // Primary text
  const MUTED_GRAY = [100, 116, 139]; // Secondary text
  const LIGHT_BG = [248, 250, 252];   // Table label cell bg
  const BORDER_COLOR = [226, 232, 240];

  // Helper to ensure table headers have official Lokayukta style
  const sectionHeaderStyles = {
    fillColor: NAVY,
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: 5
  };

  const defaultTableStyles = {
    fontSize: 8.5,
    cellPadding: 4.5,
    lineColor: BORDER_COLOR,
    lineWidth: 0.5,
    textColor: DARK_SLATE
  };

  // 1. Top Decorative Bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 7, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 7, pageWidth, 3, 'F');

  let y = 28;

  // 2. Official Header Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text('KARNATAKA LOKAYUKTA', pageWidth / 2, y, { align: 'center' });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('POLICE WING · STATUTORY 17-A CASE DOSSIER', pageWidth / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_GRAY);
  doc.text('M.S. Building, Dr. B.R. Ambedkar Veedhi, Bengaluru - 560001', pageWidth / 2, y, { align: 'center' });

  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Case Banner / Identifier
  y += 12;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(213, 204, 168);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text(`PETITION NO: ${petition.petitionNo || '—'}`, margin + 12, y + 18);

  const typeLabel = petition.type ? `TYPE: ${petition.type.toUpperCase()}` : 'TYPE: COMPLAINT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 60, 20);
  doc.text(typeLabel, pageWidth - margin - 12, y + 18, { align: 'right' });

  y += 34;

  // ═══════════════════════════════════════════════════════════════
  // SECTION I. PETITION DETAILS
  // ═══════════════════════════════════════════════════════════════
  const section1Rows = [
    [
      { content: 'District:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.district || '—',
      { content: 'Petition No:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.petitionNo || '—'
    ],
    [
      { content: 'Petition Type:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.type || 'Complaint',
      { content: 'Name of Petitioner:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.petitionerName || '—'
    ],
    [
      { content: 'Address of Petitioner:', styles: { fontStyle: 'bold', textColor: NAVY } },
      { content: petition.petitionerAddress || '—', colSpan: 3 }
    ],
    [
      { content: 'SIR Officer Name:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.sirOfficerName || '—',
      { content: 'Officer Rank:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.officerRank || '—'
    ]
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: 'I. PETITION DETAILS', colSpan: 4, styles: sectionHeaderStyles }]],
    body: section1Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    columnStyles: {
      0: { cellWidth: 120, fillColor: LIGHT_BG },
      1: { cellWidth: 140 },
      2: { cellWidth: 120, fillColor: LIGHT_BG },
      3: { cellWidth: contentWidth - 380 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════════════════════════
  // SECTION II. RESPONDENT DETAILS
  // ═══════════════════════════════════════════════════════════════
  const respondents = Array.isArray(petition.respondents) && petition.respondents.length > 0
    ? petition.respondents
    : [];

  const section2Rows = respondents.length > 0
    ? respondents.map((r, i) => [
        String(i + 1),
        r.name || '—',
        r.designation || '—',
        r.office || '—',
        r.department || '—',
        r.subDepartment || '—'
      ])
    : [[{ content: 'No respondents added.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: MUTED_GRAY } }]];

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: 'II. RESPONDENT DETAILS', colSpan: 6, styles: sectionHeaderStyles }],
      ['#', 'Respondent Name', 'Designation', 'Office', 'Department', 'Sub Department']
    ],
    body: section2Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    headStyles: {
      fillColor: [238, 242, 250],
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 105, fontStyle: 'bold' },
      2: { cellWidth: 95 },
      3: { cellWidth: 95 },
      4: { cellWidth: 105 },
      5: { cellWidth: contentWidth - (24 + 105 + 95 + 95 + 105) }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════════════════════════
  // SECTION III. 17-A PROPOSAL
  // ═══════════════════════════════════════════════════════════════
  const section3Rows = [
    [
      { content: 'Proposal Status:', styles: { fontStyle: 'bold', textColor: NAVY } },
      (petition.proposalStatus || '—').toUpperCase(),
      { content: 'Date Sent to CA:', styles: { fontStyle: 'bold', textColor: NAVY } },
      formatDate(petition.proposalSentDate)
    ]
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: 'III. 17-A PROPOSAL', colSpan: 4, styles: sectionHeaderStyles }]],
    body: section3Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    columnStyles: {
      0: { cellWidth: 120, fillColor: LIGHT_BG },
      1: { cellWidth: 140 },
      2: { cellWidth: 120, fillColor: LIGHT_BG },
      3: { cellWidth: contentWidth - 380 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // Check page height before Section IV
  if (y + 120 > pageHeight - margin) {
    doc.addPage();
    y = margin + 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION IV. COMPETENT AUTHORITY (PER RESPONDENT)
  // ═══════════════════════════════════════════════════════════════
  const section4Rows = respondents.length > 0
    ? respondents.map((r, i) => [
        String(i + 1),
        `${r.name || '—'}${r.designation ? `\n(${r.designation})` : ''}`,
        r.caDesignation || '—',
        r.caDepartment || '—',
        r.caSubDepartment || '—',
        r.caPlace || '—'
      ])
    : [[{ content: 'No Competent Authority records found.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: MUTED_GRAY } }]];

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: 'IV. COMPETENT AUTHORITY (PER RESPONDENT)', colSpan: 6, styles: sectionHeaderStyles }],
      ['#', 'Respondent', 'CA Designation', 'CA Department', 'CA Sub Department', 'CA Office / Place']
    ],
    body: section4Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    headStyles: {
      fillColor: [238, 242, 250],
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 110, fontStyle: 'bold' },
      2: { cellWidth: 100 },
      3: { cellWidth: 100 },
      4: { cellWidth: 95 },
      5: { cellWidth: contentWidth - (24 + 110 + 100 + 100 + 95) }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // Check page height before Section V
  if (y + 120 > pageHeight - margin) {
    doc.addPage();
    y = margin + 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION V. 17-A PERMISSION (PER RESPONDENT)
  // ═══════════════════════════════════════════════════════════════
  const section5Rows = respondents.length > 0
    ? respondents.map((r, i) => [
        String(i + 1),
        `${r.name || '—'}${r.designation ? `\n(${r.designation})` : ''}`,
        (r.permissionStatus || 'PENDING').toUpperCase(),
        formatDate(r.permissionSentDate),
        formatDate(r.permissionReceivedFromCA),
        formatDate(r.caSentToUnit)
      ])
    : [[{ content: 'No 17-A Permission records found.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: MUTED_GRAY } }]];

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: 'V. 17-A PERMISSION (PER RESPONDENT)', colSpan: 6, styles: sectionHeaderStyles }],
      ['#', 'Respondent', 'Status', 'Sent Date', 'Received from CA', 'CA Sent to Unit']
    ],
    body: section5Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    headStyles: {
      fillColor: [238, 242, 250],
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 115, fontStyle: 'bold' },
      2: { cellWidth: 85, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 100, halign: 'center' },
      4: { cellWidth: 100, halign: 'center' },
      5: { cellWidth: contentWidth - (24 + 115 + 85 + 100 + 100), halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // Check page height before Section VI
  if (y + 110 > pageHeight - margin) {
    doc.addPage();
    y = margin + 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION VI. PRELIMINARY ENQUIRY (PE)
  // ═══════════════════════════════════════════════════════════════
  const section6Rows = [
    [
      { content: 'PE No:', styles: { fontStyle: 'bold', textColor: NAVY } },
      petition.peNo ? `PE #${petition.peNo}` : '—',
      { content: 'PE Status:', styles: { fontStyle: 'bold', textColor: NAVY } },
      (petition.peStatus || '—').toUpperCase()
    ],
    [
      { content: 'Date of PE Registration:', styles: { fontStyle: 'bold', textColor: NAVY } },
      formatDate(petition.peRegDate),
      { content: 'Date of PE Report to HQ:', styles: { fontStyle: 'bold', textColor: NAVY } },
      formatDate(petition.peReportSentDate)
    ],
    [
      { content: 'PE Enquery Officer:', styles: { fontStyle: 'bold', textColor: NAVY } },
      { content: petition.sirEo || '—', colSpan: 3 }
    ]
  ];

  autoTable(doc, {
    startY: y,
    head: [[{ content: 'VI. PRELIMINARY ENQUIRY', colSpan: 4, styles: sectionHeaderStyles }]],
    body: section6Rows,
    theme: 'grid',
    styles: defaultTableStyles,
    columnStyles: {
      0: { cellWidth: 140, fillColor: LIGHT_BG },
      1: { cellWidth: 120 },
      2: { cellWidth: 140, fillColor: LIGHT_BG },
      3: { cellWidth: contentWidth - 400 }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 14;

  // Check page height before Official Record Verification box
  if (y + 60 > pageHeight - margin) {
    doc.addPage();
    y = margin + 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFICIAL RECORD VERIFICATION BOX & SEAL
  // ═══════════════════════════════════════════════════════════════
  doc.setDrawColor(213, 204, 168);
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, contentWidth, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('OFFICIAL RECORD VERIFICATION', margin + 10, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_GRAY);
  const printTimestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  doc.text(`Official Docket generated directly from Karnataka Lokayukta 17-A Statutory Register Portal.`, margin + 10, y + 24);
  doc.text(`Generated on: ${printTimestamp} IST | Digital Docket ID: ${petition.id || 'KL-17A-REF'}`, margin + 10, y + 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Registrar / Competent Officer Signature', pageWidth - margin - 12, y + 35, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════
  // PAGE NUMBERS ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Karnataka Lokayukta · Section 17-A Case Dossier · Petition ${petition.petitionNo || 'Record'} · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
  }

  // Clean filename and trigger direct download
  const cleanNo = (petition.petitionNo || 'case').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`Lokayukta_17A_Case_${cleanNo}.pdf`);
}
