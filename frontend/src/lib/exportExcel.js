import { apiFetch } from '../lib/api';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

/* ===========================================================================
 *  Petition register export
 *
 *  Workbook layout
 *   1. Petition Register      – printable report. One block per petition; the petition-level
 *                               cells are merged down across that petition's respondents so every
 *                               respondent / CA / permission line sits on its own aligned row.
 *   2. Respondents (Filterable) – same columns, flat (every petition value repeated on each row)
 *                               with Excel filters, for sorting / filtering / pivot tables.
 *   3. Workflow History       – the full audit trail (stage-by-stage) of every petition.
 *   4. Summary                – KPI cards, stage-wise and district-wise counts.
 * ======================================================================== */

const PX = {
  font: 'Calibri',
  ink: 'FF1F2937',
  soft: 'FF4B5563',
  muted: 'FF9CA3AF',
  navy: 'FF1F4E78',
  grid: 'FFD6DCE5',
  edge: 'FF8497B0',
  zebra: 'FFF5F8FC',
  white: 'FFFFFFFF'
};

// One colour family per stage of the petition workflow (I–VI), matching the order of the form.
const PX_SECTIONS = {
  petition:   { label: 'I.  PETITION DETAILS',     solid: 'FF1F4E78', tint: 'FFD9E5F3' },
  respondent: { label: 'II.  RESPONDENT',          solid: 'FF2E6F8E', tint: 'FFD8EAF2' },
  proposal:   { label: 'III.  17-A PROPOSAL',      solid: 'FF3B7D4F', tint: 'FFDDEDE2' },
  authority:  { label: 'IV.  COMPETENT AUTHORITY', solid: 'FF8A6D1D', tint: 'FFF3EAD0' },
  permission: { label: 'V.  17-A PERMISSION',      solid: 'FFB35C1E', tint: 'FFF8E3D3' },
  enquiry:    { label: 'VI.  PRELIMINARY ENQUIRY', solid: 'FF6B4A9A', tint: 'FFE6DEF1' }
};

const PX_TONES = {
  success: { bg: 'FFE2EFDA', fg: 'FF2F5E1E' },
  warning: { bg: 'FFFFF2CC', fg: 'FF7A4B00' },
  danger:  { bg: 'FFFCE4D6', fg: 'FFA61B1B' },
  info:    { bg: 'FFDDEBF7', fg: 'FF1F4E78' },
  neutral: { bg: 'FFEDEDED', fg: 'FF4B5563' }
};

const PX_STAGES = [
  { code: 'DRAFT',                        label: 'Draft',                       tone: 'neutral' },
  { code: 'SUBMITTED_TO_SUPERVISOR',      label: 'Submitted to Supervisor',     tone: 'warning' },
  { code: '17A_RETURNED',                 label: 'Returned with Remarks',       tone: 'danger'  },
  { code: '17A_ACCEPTED',                 label: '17-A Accepted',               tone: 'info'    },
  { code: 'CA_SUBMITTED',                 label: 'Competent Authority Submitted', tone: 'info'  },
  { code: '17A_PERMISSION_PENDING',       label: 'Permission Pending',          tone: 'warning' },
  { code: '17A_PERMISSION_COMPLETED',     label: 'Permission Completed',        tone: 'success' },
  { code: 'PRELIMINARY_ENQUIRY_SUBMITTED', label: 'Preliminary Enquiry Submitted', tone: 'success' }
];

const PX_ACTIONS = {
  CREATE_SUBMIT: 'Petition Created & Submitted',
  RETURN_17A: 'Returned with Remarks',
  RESUBMIT: 'Resubmitted',
  ACCEPT_17A: '17-A Proposal Accepted',
  SUBMIT_CA: 'Competent Authority Submitted',
  SUBMIT_PERMISSION: 'Permission Updated',
  SUBMIT_PE: 'Preliminary Enquiry Submitted',
  ADMIN_UPDATE: 'Updated by Admin'
};

const pxFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const pxEdge = (style, argb) => ({ style, color: { argb } });
const pxTxt = (v) => (v === null || v === undefined ? '' : String(v).trim());
const pxLower = (v) => pxTxt(v).toLowerCase();

const pxHumanize = (code) =>
  pxTxt(code).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const pxStage = (code) => PX_STAGES.find((s) => s.code === code);
const pxStageLabel = (code) => (pxStage(code) ? pxStage(code).label : pxHumanize(code));
const pxStageTone = (code) => (pxStage(code) ? pxStage(code).tone : 'neutral');
const pxActionLabel = (code) => PX_ACTIONS[code] || pxHumanize(code);

// Date-only values are stored as UTC midnight (the app reads them with toISOString().slice(0,10)),
// so keep the UTC calendar date – otherwise Excel would show the previous day in IST.
const pxDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
// Timestamps are shown in the user's local time.
const pxDateTime = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
};

const pxPermission = (v) => {
  const s = pxLower(v);
  if (!s) return '';
  if (s.includes('obtain')) return 'Obtained';
  if (s.includes('reject')) return 'Rejected';
  if (s.includes('pend')) return 'Pending';
  return pxTxt(v);
};
const pxPermissionTone = (v) => {
  const s = pxLower(v);
  if (s.includes('obtain')) return 'success';
  if (s.includes('reject')) return 'danger';
  return 'warning';
};
const pxProposalTone = (v) => {
  const s = pxLower(v);
  if (s.includes('accept')) return 'success';
  if (s.includes('reject') || s.includes('return')) return 'danger';
  return 'warning';
};
const pxPeTone = (v) => {
  const s = pxLower(v);
  if (s.includes('fir')) return 'danger';
  if (s.includes('recommend')) return 'info';
  if (s.includes('close')) return 'neutral';
  return 'warning';
};

// Estimate how many lines a wrapped cell needs so row heights fit the text (Excel can't
// auto-fit merged cells, and ExcelJS doesn't auto-fit at all).
const PX_LINE = 13;
const pxLines = (text, width) => {
  const cap = Math.max(4, Math.floor((width - 2) * 1.1));
  let lines = 0;
  for (const para of String(text ?? '').split('\n')) {
    let cur = 0;
    let n = 1;
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const w = word.length;
      if (cur === 0 && w <= cap) { cur = w; continue; }
      if (cur > 0 && cur + 1 + w <= cap) { cur += 1 + w; continue; }
      if (cur > 0) n += 1;
      if (w > cap) { n += Math.floor((w - 1) / cap); cur = w % cap || cap; } else { cur = w; }
    }
    lines += n;
  }
  return Math.max(1, lines);
};

/* ----- column definitions: ordered to follow the petition workflow I → VI ----- */
const pxR = (fn) => (p, r) => (r ? fn(r) : '');

const PX_COLUMNS = [
  // I. Petition details (petition level)
  { header: 'Sl No', width: 6, section: 'petition', level: 'petition', align: 'center', get: (p, r, c) => c.index },
  { header: 'District', width: 16, section: 'petition', level: 'petition', get: (p) => pxTxt(p.district) },
  { header: 'Petition No', width: 22, section: 'petition', level: 'petition', align: 'center', bold: true, get: (p) => pxTxt(p.petitionNo) },
  { header: 'Type', width: 12, section: 'petition', level: 'petition', align: 'center', get: (p) => pxTxt(p.type) || 'Complaint' },
  { header: 'Petitioner', width: 24, section: 'petition', level: 'petition', get: (p) => pxTxt(p.petitionerName) },
  { header: 'Petitioner Address', width: 30, section: 'petition', level: 'petition', get: (p) => pxTxt(p.petitionerAddress) },
  { header: 'Investigating (SIR) Officer', width: 24, section: 'petition', level: 'petition', get: (p) => pxTxt(p.sirOfficerName) },
  { header: 'Officer Rank', width: 16, section: 'petition', level: 'petition', get: (p) => pxTxt(p.officerRank) },
  { header: 'Current Stage', width: 24, section: 'petition', level: 'petition', align: 'center', bold: true,
    get: (p) => pxStageLabel(p.status), tone: (p) => pxStageTone(p.status) },
  { header: 'Registered On', width: 13, section: 'petition', level: 'petition', align: 'center', kind: 'date', get: (p) => pxDate(p.createdAt) },

  // II. Respondent (respondent level)
  { header: '#', width: 5, section: 'respondent', level: 'respondent', align: 'center', get: (p, r, c) => (r ? c.respIndex + 1 : '') },
  { header: 'Respondent Name', width: 26, section: 'respondent', level: 'respondent', bold: true,
    get: (p, r, c) => (r ? pxTxt(r.name) : (c.blankDash ? 'No respondents added' : '')) },
  { header: 'Designation', width: 22, section: 'respondent', level: 'respondent', get: pxR((r) => pxTxt(r.designation)) },
  { header: 'Office', width: 24, section: 'respondent', level: 'respondent', get: pxR((r) => pxTxt(r.office)) },
  { header: 'Department', width: 28, section: 'respondent', level: 'respondent', get: pxR((r) => pxTxt(r.department)) },
  { header: 'Sub Department', width: 42, section: 'respondent', level: 'respondent', get: pxR((r) => pxTxt(r.subDepartment)) },

  // III. 17-A proposal (petition level)
  { header: 'Proposal Status', width: 16, section: 'proposal', level: 'petition', align: 'center', bold: true,
    get: (p) => pxTxt(p.proposalStatus), tone: (p) => pxProposalTone(p.proposalStatus) },
  { header: 'Sent to CA On', width: 13, section: 'proposal', level: 'petition', align: 'center', kind: 'date', get: (p) => pxDate(p.proposalSentDate) },

  // IV. Competent authority (respondent level)
  { header: 'CA Designation', width: 24, section: 'authority', level: 'respondent', get: pxR((r) => pxTxt(r.caDesignation)) },
  { header: 'CA Department', width: 28, section: 'authority', level: 'respondent', get: pxR((r) => pxTxt(r.caDepartment)) },
  { header: 'CA Sub Department', width: 42, section: 'authority', level: 'respondent', get: pxR((r) => pxTxt(r.caSubDepartment)) },
  { header: 'CA Office', width: 24, section: 'authority', level: 'respondent', get: pxR((r) => pxTxt(r.caPlace)) },

  // V. 17-A permission (respondent level)
  { header: 'Permission Status', width: 14, section: 'permission', level: 'respondent', align: 'center', bold: true,
    get: pxR((r) => pxPermission(r.permissionStatus)), tone: (p, r) => pxPermissionTone(r && r.permissionStatus) },
  { header: 'Sent Date', width: 13, section: 'permission', level: 'respondent', align: 'center', kind: 'date', get: pxR((r) => pxDate(r.permissionSentDate)) },
  { header: 'Received from CA', width: 14, section: 'permission', level: 'respondent', align: 'center', kind: 'date', get: pxR((r) => pxDate(r.permissionReceivedFromCA)) },
  { header: 'CA Sent to Unit', width: 14, section: 'permission', level: 'respondent', align: 'center', kind: 'date', get: pxR((r) => pxDate(r.caSentToUnit)) },

  // VI. Preliminary enquiry (petition level)
  { header: 'PE No', width: 16, section: 'enquiry', level: 'petition', align: 'center', bold: true, get: (p) => pxTxt(p.peNo) },
  { header: 'PE Status', width: 20, section: 'enquiry', level: 'petition', align: 'center', bold: true,
    get: (p) => pxTxt(p.peStatus), tone: (p) => pxPeTone(p.peStatus) },
  { header: 'PE Reg. Date', width: 13, section: 'enquiry', level: 'petition', align: 'center', kind: 'date', get: (p) => pxDate(p.peRegDate) },
  { header: 'PE Report Sent to HQ', width: 15, section: 'enquiry', level: 'petition', align: 'center', kind: 'date', get: (p) => pxDate(p.peReportSentDate) },
  { header: 'PE EO', width: 26, section: 'enquiry', level: 'petition',
    get: (p) => (p.sirEo ? (p.sirEoDesignation ? `${pxTxt(p.sirEo)} (${pxTxt(p.sirEoDesignation)})` : pxTxt(p.sirEo)) : '') }
];
PX_COLUMNS.forEach((c, i) => {
  c.index = i + 1;
  c.sectionStart = i === 0 || PX_COLUMNS[i - 1].section !== c.section;
});

const pxFilterText = (f) => {
  const parts = [];
  const dateLabels = { createdAt: 'Registered On', proposalSentDate: 'Proposal Sent', peRegDate: 'PE Reg. Date' };
  if (f.search) parts.push(`Search "${f.search}"`);
  if (f.district) parts.push(`District: ${f.district}`);
  if (f.status) parts.push(`PE Status: ${f.status}`);
  if (f.proposalStatus) parts.push(`Proposal: ${f.proposalStatus}`);
  if (f.permissionStatus) parts.push(`Permission: ${f.permissionStatus}`);
  if (f.type) parts.push(`Type: ${f.type}`);
  if (f.dateFrom || f.dateTo) {
    parts.push(`${dateLabels[f.dateField] || 'Registered On'}: ${f.dateFrom || '…'} to ${f.dateTo || '…'}`);
  }
  if (f.officer) parts.push(`Officer (${f.officerRole || 'all'}): ${f.officer}`);
  return parts.length ? `Filters: ${parts.join('  |  ')}` : 'All petitions (no filters applied)';
};

/* ----- shared sheet pieces ----- */
function pxApplyWidths(ws, columns) {
  columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
}

function pxBanner(ws, row, lastCol, text, { size, height, solid, color, bold = true, italic = false, wrap = false }) {
  ws.mergeCells(row, 1, row, lastCol);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: PX.font, size, bold, italic, color: { argb: color } };
  cell.fill = pxFill(solid);
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: wrap };
  ws.getRow(row).height = height;
}

// Coloured stage bands (I – VI) above the column headers.
function pxSectionBand(ws, row) {
  let start = 1;
  PX_COLUMNS.forEach((c, i) => {
    const next = PX_COLUMNS[i + 1];
    if (next && next.section === c.section) return;
    if (i + 1 > start) ws.mergeCells(row, start, row, i + 1);
    const cell = ws.getCell(row, start);
    const sec = PX_SECTIONS[c.section];
    cell.value = sec.label;
    cell.font = { name: PX.font, size: 10, bold: true, color: { argb: PX.white } };
    cell.fill = pxFill(sec.solid);
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = { left: pxEdge('medium', PX.white), right: pxEdge('medium', PX.white) };
    start = i + 2;
  });
  ws.getRow(row).height = 20;
}

function pxColumnHeaders(ws, row) {
  PX_COLUMNS.forEach((c) => {
    const cell = ws.getCell(row, c.index);
    cell.value = c.header;
    cell.font = { name: PX.font, size: 10, bold: true, color: { argb: PX.ink } };
    cell.fill = pxFill(PX_SECTIONS[c.section].tint);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      left: pxEdge('thin', c.sectionStart ? PX.edge : PX.grid),
      right: pxEdge('thin', PX.grid),
      top: pxEdge('thin', PX.edge),
      bottom: pxEdge('medium', PX.edge)
    };
  });
  ws.getRow(row).height = 36;
}

// ExcelJS re-checks every existing merge for overlap on each mergeCells() call, which makes a long
// register quadratic. Our merged ranges are disjoint by construction, so check against a scratch
// set instead and fold it back afterwards (falls back to plain merging if the internals change).
function pxMergeBatch(ws, fn) {
  const real = ws._merges;
  if (!real || typeof real !== 'object') { fn(); return; }
  ws._merges = {};
  try { fn(); } finally { Object.assign(real, ws._merges); ws._merges = real; }
}

/* Writes one petition (1 row per respondent). With `merge`, petition-level cells are merged
 * down the respondent rows; without it they are repeated on every row (filterable sheet). */
function pxWritePetition(ws, startRow, p, petIndex, { merge, blankDash }) {
  const respondents = p.respondents && p.respondents.length ? p.respondents : [null];
  const n = respondents.length;
  const endRow = startRow + n - 1;
  const zebra = petIndex % 2 === 1 ? PX.zebra : PX.white;
  const heights = respondents.map(() => 22);
  let petitionNeed = 0;

  if (merge && n > 1) {
    pxMergeBatch(ws, () => {
      PX_COLUMNS.forEach((c) => {
        if (c.level === 'petition') ws.mergeCells(startRow, c.index, endRow, c.index);
      });
    });
  }

  respondents.forEach((r, j) => {
    const rowNo = startRow + j;
    const ctx = { index: petIndex + 1, respIndex: j, blankDash };
    const isFirst = j === 0;
    const isLast = j === n - 1;

    PX_COLUMNS.forEach((c) => {
      const cell = ws.getCell(rowNo, c.index);
      const petLevel = c.level === 'petition';
      const raw = c.get(p, r, ctx);
      const empty = raw === null || raw === undefined || raw === '';
      const toneKey = !empty && c.tone ? c.tone(p, r) : null;
      const tone = toneKey ? PX_TONES[toneKey] : null;
      const masterOnly = petLevel && merge && n > 1;

      if (!masterOnly || isFirst) {
        if (empty) cell.value = blankDash ? '—' : null;
        else cell.value = raw;
        if (c.kind === 'date' && !empty) cell.numFmt = 'dd-mmm-yyyy';
      }

      cell.font = {
        name: PX.font,
        size: 10,
        bold: !!c.bold && !empty,
        italic: empty && blankDash,
        color: { argb: tone ? tone.fg : (empty ? PX.muted : PX.ink) }
      };
      cell.fill = pxFill(tone ? tone.bg : zebra);
      cell.alignment = {
        vertical: 'middle',
        horizontal: c.align || 'left',
        wrapText: true,
        ...((c.align || 'left') === 'left' ? { indent: 1 } : {})
      };
      cell.border = {
        left: pxEdge('thin', c.sectionStart ? PX.edge : PX.grid),
        right: pxEdge('thin', PX.grid),
        top: isFirst ? pxEdge('medium', PX.edge) : (masterOnly ? undefined : pxEdge('hair', PX.grid)),
        bottom: isLast ? pxEdge('medium', PX.edge) : (masterOnly ? undefined : pxEdge('hair', PX.grid))
      };

      if (!masterOnly || isFirst) {
        const text = empty ? '' : (c.kind === 'date' ? '00-Mmm-0000' : String(raw));
        const need = pxLines(text, c.width) * PX_LINE + 9;
        if (masterOnly) petitionNeed = Math.max(petitionNeed, need);
        else heights[j] = Math.max(heights[j], need);
      }
    });
  });

  // A merged cell can't auto-fit: if its text needs more room than the respondent rows give
  // it, share the extra height across the rows.
  const total = heights.reduce((a, b) => a + b, 0);
  if (petitionNeed > total) {
    const extra = (petitionNeed - total) / n;
    for (let j = 0; j < n; j += 1) heights[j] += extra;
  }
  heights.forEach((h, j) => { ws.getRow(startRow + j).height = Math.min(409, Math.round(h * 4) / 4); });

  return endRow + 1;
}

function pxPageSetup(paperSize, orientation, extra = {}) {
  return {
    paperSize,
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.25, footer: 0.25 },
    horizontalCentered: true,
    ...extra
  };
}
const PX_FOOTER = {
  oddFooter: '&L&8 17-A Proposals && Status Register&C&8 Page &P of &N&R&8 Printed &D'
};

/* ----- Sheet 1: Petition Register ----- */
function pxBuildRegisterSheet(workbook, petitions, info) {
  const lastCol = PX_COLUMNS.length;
  const ws = workbook.addWorksheet('Petition Register', {
    properties: { tabColor: { argb: PX.navy } },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 4, topLeftCell: 'D5', activeCell: 'A1' }],
    pageSetup: pxPageSetup(8, 'landscape', { printTitlesRow: '3:4' }),
    headerFooter: PX_FOOTER
  });
  pxApplyWidths(ws, PX_COLUMNS);

  pxBanner(ws, 1, lastCol, '17-A PROPOSALS & STATUS REGISTER', { size: 18, height: 34, solid: PX.navy, color: PX.white });
  pxBanner(ws, 2, lastCol, info.subtitle, { size: 10, height: 22, solid: 'FFE8EEF7', color: PX.navy, bold: false });
  pxSectionBand(ws, 3);
  pxColumnHeaders(ws, 4);

  if (petitions.length === 0) {
    ws.mergeCells(5, 1, 5, lastCol);
    const cell = ws.getCell(5, 1);
    cell.value = 'No petition records match the selected filters.';
    cell.font = { name: PX.font, size: 12, italic: true, color: { argb: PX.soft } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(5).height = 40;
    return ws;
  }

  let row = 5;
  petitions.forEach((p, i) => { row = pxWritePetition(ws, row, p, i, { merge: true, blankDash: true }); });
  return ws;
}

/* ----- Sheet 2: Respondents (flat, filterable) ----- */
function pxBuildFlatSheet(workbook, petitions) {
  const lastCol = PX_COLUMNS.length;
  const ws = workbook.addWorksheet('Respondents (Filterable)', {
    properties: { tabColor: { argb: 'FF2E6F8E' } },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 2, topLeftCell: 'D3', activeCell: 'A3' }],
    pageSetup: pxPageSetup(8, 'landscape', { printTitlesRow: '1:2' }),
    headerFooter: PX_FOOTER
  });
  pxApplyWidths(ws, PX_COLUMNS);
  pxSectionBand(ws, 1);
  pxColumnHeaders(ws, 2);

  let row = 3;
  petitions.forEach((p, i) => { row = pxWritePetition(ws, row, p, i, { merge: false, blankDash: false }); });
  if (petitions.length > 0) {
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: lastCol } };
  }
  return ws;
}

/* ----- Sheet 3: Workflow History ----- */
const PX_HISTORY_COLUMNS = [
  { header: 'Sl No', width: 6, align: 'center' },
  { header: 'Petition No', width: 22, align: 'center', bold: true },
  { header: 'District', width: 16 },
  { header: 'Petitioner', width: 26 },
  { header: 'Step', width: 6, align: 'center' },
  { header: 'Date & Time', width: 21, align: 'center', kind: 'datetime' },
  { header: 'Action', width: 30, bold: true },
  { header: 'From Stage', width: 28, align: 'center' },
  { header: 'To Stage', width: 28, align: 'center', bold: true },
  { header: 'Action By', width: 24 },
  { header: 'Designation', width: 24 },
  { header: 'Remarks', width: 56 }
];

function pxBuildHistorySheet(workbook, petitions) {
  const cols = PX_HISTORY_COLUMNS;
  const ws = workbook.addWorksheet('Workflow History', {
    properties: { tabColor: { argb: 'FF8A6D1D' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3', activeCell: 'A3' }],
    pageSetup: pxPageSetup(8, 'landscape', { printTitlesRow: '1:2' }),
    headerFooter: PX_FOOTER
  });
  pxApplyWidths(ws, cols);
  pxBanner(ws, 1, cols.length, 'PETITION WORKFLOW HISTORY — every step, in order', { size: 14, height: 28, solid: PX.navy, color: PX.white });

  cols.forEach((c, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = c.header;
    cell.font = { name: PX.font, size: 10, bold: true, color: { argb: PX.ink } };
    cell.fill = pxFill('FFD9E5F3');
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { left: pxEdge('thin', PX.grid), right: pxEdge('thin', PX.grid), top: pxEdge('thin', PX.edge), bottom: pxEdge('medium', PX.edge) };
  });
  ws.getRow(2).height = 28;

  let row = 3;
  let petNo = 0;
  petitions.forEach((p) => {
    const history = (p.history || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (history.length === 0) return;
    const zebra = petNo % 2 === 1 ? PX.zebra : PX.white;
    petNo += 1;

    history.forEach((h, k) => {
      const isLast = k === history.length - 1;
      const values = [
        petNo,
        pxTxt(p.petitionNo),
        pxTxt(p.district),
        pxTxt(p.petitionerName),
        k + 1,
        pxDateTime(h.createdAt),
        pxActionLabel(h.action),
        h.fromStatus ? pxStageLabel(h.fromStatus) : '—',
        pxStageLabel(h.toStatus),
        pxTxt(h.actionBy && (h.actionBy.fullName || h.actionBy.email)) || 'System',
        pxTxt(h.actionByDesignation),
        pxTxt(h.remarks)
      ];
      let height = 22;
      values.forEach((v, i) => {
        const c = cols[i];
        const cell = ws.getCell(row, i + 1);
        const empty = v === '' || v === null || v === undefined;
        cell.value = empty ? null : v;
        if (c.kind === 'datetime' && !empty) cell.numFmt = 'dd-mmm-yyyy hh:mm AM/PM';
        const isToStage = i === 8;
        const tone = isToStage ? PX_TONES[pxStageTone(h.toStatus)] : null;
        cell.font = { name: PX.font, size: 10, bold: !!c.bold, color: { argb: tone ? tone.fg : PX.ink } };
        cell.fill = pxFill(tone ? tone.bg : zebra);
        cell.alignment = {
          vertical: 'middle',
          horizontal: c.align || 'left',
          wrapText: true,
          ...((c.align || 'left') === 'left' ? { indent: 1 } : {})
        };
        cell.border = {
          left: pxEdge('thin', PX.grid),
          right: pxEdge('thin', PX.grid),
          top: k === 0 ? pxEdge('medium', PX.edge) : pxEdge('hair', PX.grid),
          bottom: isLast ? pxEdge('medium', PX.edge) : pxEdge('hair', PX.grid)
        };
        const text = empty ? '' : (c.kind === 'datetime' ? '00-Mmm-0000 00:00 AM' : String(v));
        height = Math.max(height, pxLines(text, c.width) * PX_LINE + 9);
      });
      ws.getRow(row).height = Math.min(409, height);
      row += 1;
    });
  });

  if (row === 3) {
    ws.mergeCells(3, 1, 3, cols.length);
    const cell = ws.getCell(3, 1);
    cell.value = 'No workflow history recorded for the selected petitions.';
    cell.font = { name: PX.font, size: 12, italic: true, color: { argb: PX.soft } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 36;
  } else {
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: cols.length } };
  }
  return ws;
}

/* ----- Sheet 4: Summary ----- */
function pxBuildSummarySheet(workbook, petitions, info) {
  const ws = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF3B7D4F' } },
    views: [{ showGridLines: false }],
    pageSetup: pxPageSetup(9, 'portrait', { horizontalCentered: true }),
    headerFooter: PX_FOOTER
  });
  const widths = [2, 30, 15, 15, 15, 15, 15, 15];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const LAST = 8;

  pxBanner(ws, 1, LAST, '17-A PROPOSALS & STATUS REGISTER — SUMMARY', { size: 16, height: 32, solid: PX.navy, color: PX.white });
  pxBanner(ws, 2, LAST, info.subtitle, { size: 10, height: 44, solid: 'FFE8EEF7', color: PX.navy, bold: false, wrap: true });

  const respondents = petitions.flatMap((p) => p.respondents || []);
  const count = (list, fn) => list.filter(fn).length;
  const kpis = [
    { label: 'TOTAL PETITIONS', value: petitions.length, tone: 'info' },
    { label: 'TOTAL RESPONDENTS', value: respondents.length, tone: 'info' },
    { label: 'PROPOSALS ACCEPTED', value: count(petitions, (p) => pxLower(p.proposalStatus).includes('accept')), tone: 'success' },
    { label: 'AWAITING SUPERVISOR', value: count(petitions, (p) => p.status === 'SUBMITTED_TO_SUPERVISOR'), tone: 'warning' },
    { label: 'PERMISSIONS OBTAINED', value: count(respondents, (r) => pxLower(r.permissionStatus).includes('obtain')), tone: 'success' },
    { label: 'PERMISSIONS PENDING', value: count(respondents, (r) => pxLower(r.permissionStatus).includes('pend')), tone: 'warning' },
    { label: 'FIR REGISTERED', value: count(petitions, (p) => pxLower(p.peStatus).includes('fir')), tone: 'danger' },
    { label: 'PE CLOSED', value: count(petitions, (p) => pxLower(p.peStatus).includes('close')), tone: 'neutral' }
  ];

  const sectionTitle = (row, text) => {
    ws.mergeCells(row, 2, row, LAST);
    const cell = ws.getCell(row, 2);
    cell.value = text;
    cell.font = { name: PX.font, size: 11, bold: true, color: { argb: PX.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: pxEdge('medium', PX.navy) };
    ws.getRow(row).height = 24;
  };

  sectionTitle(4, 'OVERVIEW');
  const cardCols = [[2, 2], [3, 4], [5, 6], [7, 8]];
  kpis.forEach((k, i) => {
    const labelRow = i < 4 ? 5 : 8;
    const [c1, c2] = cardCols[i % 4];
    const tone = PX_TONES[k.tone];
    if (c2 > c1) { ws.mergeCells(labelRow, c1, labelRow, c2); ws.mergeCells(labelRow + 1, c1, labelRow + 1, c2); }
    const label = ws.getCell(labelRow, c1);
    label.value = k.label;
    label.font = { name: PX.font, size: 9, bold: true, color: { argb: tone.fg } };
    label.fill = pxFill(tone.bg);
    label.alignment = { vertical: 'middle', horizontal: 'center' };
    const value = ws.getCell(labelRow + 1, c1);
    value.value = k.value;
    value.numFmt = '#,##0';
    value.font = { name: PX.font, size: 24, bold: true, color: { argb: tone.fg } };
    value.fill = pxFill(tone.bg);
    value.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = c1; c <= c2; c += 1) {
      ws.getCell(labelRow, c).border = { top: pxEdge('medium', PX.white), left: pxEdge('medium', PX.white), right: pxEdge('medium', PX.white) };
      ws.getCell(labelRow + 1, c).border = { bottom: pxEdge('medium', PX.white), left: pxEdge('medium', PX.white), right: pxEdge('medium', PX.white) };
    }
    ws.getRow(labelRow).height = 22;
    ws.getRow(labelRow + 1).height = 40;
  });

  const tableHeader = (row, headers) => {
    headers.forEach((h, i) => {
      const cell = ws.getCell(row, 2 + i);
      cell.value = h;
      cell.font = { name: PX.font, size: 10, bold: true, color: { argb: PX.white } };
      cell.fill = pxFill(PX.navy);
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center', wrapText: true, ...(i === 0 ? { indent: 1 } : {}) };
    });
    ws.getRow(row).height = 30;
  };
  const bodyStyle = (cell, { align = 'center', bold = false, fillArgb = PX.white, fg = PX.ink, numFmt } = {}) => {
    cell.font = { name: PX.font, size: 10, bold, color: { argb: fg } };
    cell.fill = pxFill(fillArgb);
    cell.alignment = { vertical: 'middle', horizontal: align, ...(align === 'left' ? { indent: 1 } : {}) };
    cell.border = { left: pxEdge('thin', PX.grid), right: pxEdge('thin', PX.grid), top: pxEdge('hair', PX.grid), bottom: pxEdge('hair', PX.grid) };
    if (numFmt) cell.numFmt = numFmt;
  };

  // Petitions by current stage (in workflow order)
  let r = 11;
  sectionTitle(r, 'PETITIONS BY CURRENT STAGE');
  r += 1;
  tableHeader(r, ['Stage', 'Petitions', 'Share', 'Distribution']);
  ws.mergeCells(r, 5, r, LAST);
  r += 1;
  const stageCounts = new Map(PX_STAGES.map((s) => [s.code, 0]));
  petitions.forEach((p) => stageCounts.set(p.status, (stageCounts.get(p.status) || 0) + 1));
  const stageStart = r;
  const stageEnd = stageStart + stageCounts.size - 1;
  [...stageCounts.entries()].forEach(([code, n], i) => {
    const tone = PX_TONES[pxStageTone(code)];
    const fillArgb = i % 2 === 1 ? PX.zebra : PX.white;
    ws.mergeCells(r, 5, r, LAST);
    bodyStyle(ws.getCell(r, 2), { align: 'left', bold: true, fillArgb }); ws.getCell(r, 2).value = pxStageLabel(code);
    bodyStyle(ws.getCell(r, 3), { fillArgb, numFmt: '#,##0' }); ws.getCell(r, 3).value = n;
    bodyStyle(ws.getCell(r, 4), { fillArgb, numFmt: '0.0%' });
    ws.getCell(r, 4).value = { formula: `IF($C$${stageEnd + 1}=0,0,C${r}/$C$${stageEnd + 1})`, result: petitions.length ? n / petitions.length : 0 };
    bodyStyle(ws.getCell(r, 5), { align: 'left', fillArgb, fg: tone.fg });
    ws.getCell(r, 5).value = { formula: `REPT("█",ROUND(D${r}*40,0))`, result: '█'.repeat(Math.round((petitions.length ? n / petitions.length : 0) * 40)) };
    for (let c = 6; c <= LAST; c += 1) bodyStyle(ws.getCell(r, c), { fillArgb });
    ws.getRow(r).height = 20;
    r += 1;
  });
  ws.mergeCells(r, 5, r, LAST);
  bodyStyle(ws.getCell(r, 2), { align: 'left', bold: true, fillArgb: 'FFD9E5F3' }); ws.getCell(r, 2).value = 'Total';
  bodyStyle(ws.getCell(r, 3), { bold: true, fillArgb: 'FFD9E5F3', numFmt: '#,##0' });
  ws.getCell(r, 3).value = { formula: `SUM(C${stageStart}:C${stageEnd})`, result: petitions.length };
  for (let c = 4; c <= LAST; c += 1) bodyStyle(ws.getCell(r, c), { bold: true, fillArgb: 'FFD9E5F3' });
  ws.getRow(r).height = 22;

  // Petitions by district
  r += 3;
  sectionTitle(r, 'PETITIONS BY DISTRICT');
  r += 1;
  tableHeader(r, ['District', 'Petitions', 'Respondents', 'Proposals Accepted', 'Permissions Obtained', 'FIR Registered', 'PE Closed']);
  r += 1;
  const byDistrict = new Map();
  petitions.forEach((p) => {
    const key = pxTxt(p.district) || '—';
    if (!byDistrict.has(key)) byDistrict.set(key, { petitions: 0, respondents: 0, accepted: 0, obtained: 0, fir: 0, closed: 0 });
    const d = byDistrict.get(key);
    d.petitions += 1;
    d.respondents += (p.respondents || []).length;
    if (pxLower(p.proposalStatus).includes('accept')) d.accepted += 1;
    d.obtained += (p.respondents || []).filter((x) => pxLower(x.permissionStatus).includes('obtain')).length;
    if (pxLower(p.peStatus).includes('fir')) d.fir += 1;
    if (pxLower(p.peStatus).includes('close')) d.closed += 1;
  });
  const districts = [...byDistrict.entries()].sort((a, b) => b[1].petitions - a[1].petitions || a[0].localeCompare(b[0]));
  const dStart = r;
  districts.forEach(([name, d], i) => {
    const fillArgb = i % 2 === 1 ? PX.zebra : PX.white;
    bodyStyle(ws.getCell(r, 2), { align: 'left', bold: true, fillArgb }); ws.getCell(r, 2).value = name;
    [d.petitions, d.respondents, d.accepted, d.obtained, d.fir, d.closed].forEach((v, k) => {
      bodyStyle(ws.getCell(r, 3 + k), { fillArgb, numFmt: '#,##0' });
      ws.getCell(r, 3 + k).value = v;
    });
    ws.getRow(r).height = 20;
    r += 1;
  });
  if (districts.length > 0) {
    const dEnd = r - 1;
    bodyStyle(ws.getCell(r, 2), { align: 'left', bold: true, fillArgb: 'FFD9E5F3' }); ws.getCell(r, 2).value = 'Total';
    const sums = [0, 0, 0, 0, 0, 0];
    districts.forEach(([, d]) => { sums[0] += d.petitions; sums[1] += d.respondents; sums[2] += d.accepted; sums[3] += d.obtained; sums[4] += d.fir; sums[5] += d.closed; });
    sums.forEach((total, k) => {
      const col = 3 + k;
      const letter = String.fromCharCode(64 + col);
      bodyStyle(ws.getCell(r, col), { bold: true, fillArgb: 'FFD9E5F3', numFmt: '#,##0' });
      ws.getCell(r, col).value = { formula: `SUM(${letter}${dStart}:${letter}${dEnd})`, result: total };
    });
    ws.getRow(r).height = 22;
  }
  return ws;
}

/* ----- public builders ----- */
export function buildPetitionWorkbook(ExcelJSLib, petitions, filters = {}, generatedBy = '') {
  const now = new Date();
  const stamp = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  const respondentCount = petitions.reduce((n, p) => n + (p.respondents || []).length, 0);
  const subtitle =
    `Complete petition workflow report   •   ${petitions.length} petition${petitions.length === 1 ? '' : 's'}, ` +
    `${respondentCount} respondent${respondentCount === 1 ? '' : 's'}   •   ${pxFilterText(filters)}   •   ` +
    `Generated ${stamp}${generatedBy ? ` by ${generatedBy}` : ''}`;
  const info = { subtitle };

  const workbook = new ExcelJSLib.Workbook();
  workbook.creator = generatedBy || '17-A Proposals & Status Register';
  workbook.lastModifiedBy = workbook.creator;
  workbook.created = now;
  workbook.modified = now;
  workbook.title = '17-A Proposals & Status Register';

  pxBuildRegisterSheet(workbook, petitions, info);
  pxBuildFlatSheet(workbook, petitions);
  pxBuildHistorySheet(workbook, petitions);
  pxBuildSummarySheet(workbook, petitions, info);
  workbook.views = [{ activeTab: 0 }];
  return workbook;
}

export async function exportPetitionsToExcel({
  search = '',
  district = '',
  status = '',
  proposalStatus = '',
  permissionStatus = '',
  type = '',
  sortBy = '',
  sortOrder = '',
  dateFrom = '',
  dateTo = '',
  dateField = '',
  officer = '',
  officerRole = ''
} = {}) {
  const params = new URLSearchParams({ all: 'true' });
  if (search) params.set('search', search);
  if (district) params.set('district', district);
  if (status) params.set('status', status);
  if (proposalStatus) params.set('proposalStatus', proposalStatus);
  if (permissionStatus) params.set('permissionStatus', permissionStatus);
  if (type) params.set('type', type);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (dateField) params.set('dateField', dateField);
  if (officer) params.set('officer', officer);
  if (officerRole) params.set('officerRole', officerRole);

  const res = await apiFetch(`/petitions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch petitions');
  const resData = await res.json();
  const petitions = Array.isArray(resData) ? resData : (resData.data || []);

  const workbook = buildPetitionWorkbook(
    ExcelJS,
    petitions,
    { search, district, status, proposalStatus, permissionStatus, type, dateFrom, dateTo, dateField, officer, officerRole },
    localStorage.getItem('fullName') || ''
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `17-A_Proposals_Status_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportOfficersToExcel({ search = '', districtId = '', designation = '' } = {}) {
  const params = new URLSearchParams({ all: 'true' });
  if (search) params.set('search', search);
  if (districtId) params.set('districtId', districtId);
  if (designation) params.set('designation', designation);

  const res = await apiFetch(`/officers?${params.toString()}`, {  });
  if (!res.ok) throw new Error('Failed to fetch officers');
  const { data: officers } = await res.json();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'System Admin';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Officers', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      horizontalCentered: true
    },
    headerFooter: {
      firstFooter: '&L17-A Officers Register&RPage &P of &N',
      evenFooter: '&L17-A Officers Register&RPage &P of &N',
      oddFooter: '&L17-A Officers Register&RPage &P of &N'
    }
  });

  // TITLE ROWS
  sheet.mergeCells('A1:J1');
  const title1 = sheet.getCell('A1');
  title1.value = '17-A OFFICERS REGISTER';
  title1.font = { name: 'Aptos', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; 

  sheet.mergeCells('A2:J2');
  const title2 = sheet.getCell('A2');
  title2.value = 'Officers Report';
  title2.font = { name: 'Aptos', size: 14, bold: true, color: { argb: 'FF1F4E78' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  sheet.mergeCells('A3:J3');
  const title3 = sheet.getCell('A3');
  title3.value = `Generated Date: ${dateStr} ${timeStr}`;
  title3.font = { name: 'Aptos', size: 11, italic: true };
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  // SUMMARY SECTION
  sheet.mergeCells('B5:C5');
  sheet.getCell('B5').value = 'Total Officers';
  sheet.getCell('B5').font = { name: 'Aptos', size: 11, bold: true };
  sheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('B5').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
  sheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

  sheet.mergeCells('B6:C6');
  sheet.getCell('B6').value = officers.length;
  sheet.getCell('B6').font = { name: 'Aptos', size: 14, bold: true };
  sheet.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('B6').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };

  // TABLE HEADERS
  const columns = [
    { header: 'Sl No', key: 'sl', width: 8 },
    { header: 'District', key: 'district', width: 18 },
    { header: 'Officer Name', key: 'officerName', width: 25 },
    { header: 'Designation', key: 'designation', width: 25 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Reporting Date', key: 'reportingDate', width: 18 },
    { header: 'Present Address', key: 'presentAddress', width: 30 },
    { header: 'Permanent Address', key: 'permanentAddress', width: 30 },
    { header: 'Previous Working Places', key: 'previousPlaces', width: 35 },
    { header: 'Remarks', key: 'remarks', width: 25 }
  ];

  columns.forEach((col, idx) => {
    const column = sheet.getColumn(idx + 1);
    column.key = col.key;
    column.width = col.width;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  const rows = [];
  if (officers.length === 0) {
    sheet.mergeCells('A8:J8');
    sheet.getCell('A8').value = 'No officer records available.';
    sheet.getCell('A8').font = { name: 'Aptos', size: 12, italic: true };
    sheet.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    const headerRow = sheet.getRow(8);
    headerRow.values = columns.map(c => c.header);
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    officers.forEach((o, idx) => {
      rows.push({
        sl: idx + 1,
        district: o.district?.name || '',
        officerName: o.name,
        designation: o.designation || '',
        mobile: o.mobile || '',
        reportingDate: formatDate(o.reportingDate),
        presentAddress: o.presentAddress || '',
        permanentAddress: o.permanentAddress || '',
        previousPlaces: (o.previousPlaces || [])
          .map(p => `${p.place}${p.fromYear || p.toYear ? ` (${p.fromYear || ''}${p.toYear ? ' - ' + p.toYear : ''})` : ''}`)
          .join('\n'),
        remarks: o.remarks || ''
      });
    });

    const addedRows = sheet.addRows(rows);

    addedRows.forEach((row, index) => {
      row.height = 25;
      const isEven = index % 2 === 0;
      const rowFill = isEven ? 'FFFFFFFF' : 'FFF2F2F2';

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Aptos', size: 11 };
        
        let alignHoriz = 'center';
        if ([2, 3, 4, 7, 8, 9, 10].includes(colNumber)) {
          alignHoriz = 'left';
        }
        
        let wrap = false;
        if ([7, 8, 9, 10].includes(colNumber)) {
          wrap = true;
        }

        cell.alignment = { horizontal: alignHoriz, vertical: 'middle', wrapText: wrap };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
        };

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      });
    });

    sheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: 10 }
    };
  }

  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 8, topLeftCell: 'A9' }
  ];

  if (officers.length > 0) {
    columns.forEach((col, i) => {
      const colNum = i + 1;
      let maxLen = col.width;
      sheet.getColumn(colNum).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 8 && cell.value) {
          const valLen = cell.value.toString().length;
          if (valLen > maxLen) {
            maxLen = Math.min(valLen + 2, 40); 
          }
        }
      });
      sheet.getColumn(colNum).width = maxLen;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `17-A_Officers_Register_${now.toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}

export async function exportDistrictProposalsStatisticsExcel({
  districtStats = [],
  totals = {},
  historicalYears = [],
  focusYear = 2026,
  isAllYears = false
} = {}) {
  const isAll = Boolean(isAllYears || focusYear === 'ALL' || String(focusYear).toLowerCase().includes('all'));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Karnataka Lokayukta Police';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('17-A Statistics', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
    }
  });

  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAECEF' } };

  const numHist = historicalYears.length;
  const startHistCol = 3; // Column C
  const endHistCol = startHistCol + numHist - 1;
  const startFocusCol = endHistCol + 1;
  const endFocusCol = startFocusCol + 5;
  const totalCols = endFocusCol;

  // Set Column Widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 24;
  for (let i = 0; i < numHist; i++) {
    sheet.getColumn(startHistCol + i).width = 8;
  }
  sheet.getColumn(startFocusCol).width = 16;
  sheet.getColumn(startFocusCol + 1).width = 15;
  sheet.getColumn(startFocusCol + 2).width = 17;
  sheet.getColumn(startFocusCol + 3).width = 11;
  sheet.getColumn(startFocusCol + 4).width = 11;
  sheet.getColumn(startFocusCol + 5).width = 15;

  // Row 1: Merged Group Headers
  // Merge Sl. No (A1:A2)
  sheet.mergeCells(1, 1, 2, 1);
  const cellA1 = sheet.getCell(1, 1);
  cellA1.value = 'Sl. No';
  cellA1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cellA1.font = { name: 'Arial', size: 10, bold: true };
  cellA1.fill = headerFill;

  // Merge Dist (B1:B2)
  sheet.mergeCells(1, 2, 2, 2);
  const cellB1 = sheet.getCell(1, 2);
  cellB1.value = 'Dist';
  cellB1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cellB1.font = { name: 'Arial', size: 10, bold: true };
  cellB1.fill = headerFill;

  // Merge "17-A Proposals" (C1 to endHistCol)
  sheet.mergeCells(1, startHistCol, 1, endHistCol);
  const cellHistGroup = sheet.getCell(1, startHistCol);
  cellHistGroup.value = isAll
    ? (historicalYears.length > 0 ? `17-A Proposals by Year (${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]})` : '17-A Proposals by Year')
    : (historicalYears.length > 0 ? `17-A Proposals (${historicalYears[0]} - ${historicalYears[historicalYears.length - 1]})` : '17-A Proposals');
  cellHistGroup.alignment = { horizontal: 'center', vertical: 'middle' };
  cellHistGroup.font = { name: 'Arial', size: 10, bold: true };
  cellHistGroup.fill = headerFill;

  // Merge Focus Year (e.g. 2026) (startFocusCol to endFocusCol)
  sheet.mergeCells(1, startFocusCol, 1, endFocusCol);
  const cellFocusGroup = sheet.getCell(1, startFocusCol);
  cellFocusGroup.value = isAll ? 'Cumulative Status & Action (All Years)' : `${focusYear} Status & Action`;
  cellFocusGroup.alignment = { horizontal: 'center', vertical: 'middle' };
  cellFocusGroup.font = { name: 'Arial', size: 10, bold: true };
  cellFocusGroup.fill = headerFill;

  // Row 2: Sub-headers
  historicalYears.forEach((y, i) => {
    const cell = sheet.getCell(2, startHistCol + i);
    cell.value = y;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = headerFill;
  });

  const focusHeaders = [
    'Total Proposals Received at HQ',
    'Proposals Sent to CA',
    'Proposals sent back to Dist',
    'Obtained',
    'Rejected',
    'Pending with CA'
  ];

  focusHeaders.forEach((title, i) => {
    const cell = sheet.getCell(2, startFocusCol + i);
    cell.value = title;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = headerFill;
  });

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 42;

  // Apply borders to header cells
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= totalCols; c++) {
      sheet.getCell(r, c).border = borderStyle;
    }
  }

  // Row 3 onwards: Data rows
  let curRow = 3;
  districtStats.forEach(d => {
    sheet.getCell(curRow, 1).value = d.slNo;
    sheet.getCell(curRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.getCell(curRow, 2).value = d.district;
    sheet.getCell(curRow, 2).alignment = { horizontal: 'left', vertical: 'middle' };

    historicalYears.forEach((y, i) => {
      const val = d.historical ? (d.historical[y] || 0) : 0;
      const cell = sheet.getCell(curRow, startHistCol + i);
      cell.value = val === 0 ? '' : val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const fVals = [
      d.totalReceivedAtHq,
      d.proposalsSentToCA,
      d.proposalsSentBackToDist,
      d.obtained,
      d.rejected,
      d.pendingWithCA
    ];

    fVals.forEach((val, i) => {
      const cell = sheet.getCell(curRow, startFocusCol + i);
      cell.value = (val === 0 || val == null) ? '' : val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(curRow, c);
      cell.border = borderStyle;
      cell.font = { name: 'Arial', size: 9.5 };
    }

    sheet.getRow(curRow).height = 20;
    curRow++;
  });

  // Total Row
  sheet.mergeCells(curRow, 1, curRow, 2);
  const totalLabel = sheet.getCell(curRow, 1);
  totalLabel.value = 'TOTAL';
  totalLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  totalLabel.font = { name: 'Arial', size: 10, bold: true };
  totalLabel.fill = totalFill;

  historicalYears.forEach((y, i) => {
    const cell = sheet.getCell(curRow, startHistCol + i);
    const val = totals.historical ? (totals.historical[y] || 0) : 0;
    cell.value = val;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = totalFill;
  });

  const totFocusVals = [
    totals.totalReceivedAtHq || 0,
    totals.proposalsSentToCA || 0,
    totals.proposalsSentBackToDist || 0,
    totals.obtained || 0,
    totals.rejected || 0,
    totals.pendingWithCA || 0
  ];

  totFocusVals.forEach((val, i) => {
    const cell = sheet.getCell(curRow, startFocusCol + i);
    cell.value = val;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = totalFill;
  });

  for (let c = 1; c <= totalCols; c++) {
    sheet.getCell(curRow, c).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  }
  sheet.getRow(curRow).height = 22;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const cleanYear = isAll ? 'All_Years' : String(focusYear).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `17-A_District_Proposals_Statistics_${cleanYear}.xlsx`;
  saveAs(blob, fileName);
}
