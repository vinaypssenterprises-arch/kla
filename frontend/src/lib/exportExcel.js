import { apiFetch } from '../lib/api';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export async function exportPetitionsToExcel({ search = '', district = '', status = '' } = {}) {
  const params = new URLSearchParams({ all: 'true' });
  if (search) params.set('search', search);
  if (district) params.set('district', district);
  if (status) params.set('status', status);

  const res = await apiFetch(`/petitions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch petitions');
  const resData = await res.json();
  const petitions = Array.isArray(resData) ? resData : (resData.data || []);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'System Admin';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Petitions', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      },
      horizontalCentered: true
    },
    headerFooter: {
      firstFooter: '&L17-A Proposals & Status Register&RPage &P of &N',
      evenFooter: '&L17-A Proposals & Status Register&RPage &P of &N',
      oddFooter: '&L17-A Proposals & Status Register&RPage &P of &N'
    }
  });

  // Calculate Summary
  const total = petitions.length;
  let accepted = 0;
  let pending = 0;
  let rejected = 0;

  petitions.forEach(p => {
    const s = (p.proposalStatus || '').toLowerCase();
    if (s.includes('accept') || s.includes('approve') || s.includes('register')) {
      accepted++;
    } else if (s.includes('reject') || s.includes('error')) {
      rejected++;
    } else {
      pending++;
    }
  });

  // TITLE ROWS (Across A-S, 19 columns)
  sheet.mergeCells('A1:S1');
  const title1 = sheet.getCell('A1');
  title1.value = '17-A PROPOSALS & STATUS REGISTER';
  title1.font = { name: 'Aptos', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Dark blue

  sheet.mergeCells('A2:S2');
  const title2 = sheet.getCell('A2');
  title2.value = 'Petitions Report';
  title2.font = { name: 'Aptos', size: 14, bold: true, color: { argb: 'FF1F4E78' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  sheet.mergeCells('A3:S3');
  const title3 = sheet.getCell('A3');
  title3.value = `Generated Date: ${dateStr} ${timeStr}`;
  title3.font = { name: 'Aptos', size: 11, italic: true };
  title3.alignment = { horizontal: 'center', vertical: 'middle' };
  title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  // SUMMARY SECTION
  sheet.mergeCells('B5:C5');
  sheet.getCell('B5').value = 'Total Petitions';
  sheet.getCell('B5').font = { name: 'Aptos', size: 11, bold: true };
  sheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('B5').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
  sheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

  sheet.mergeCells('D5:E5');
  sheet.getCell('D5').value = 'Accepted';
  sheet.getCell('D5').font = { name: 'Aptos', size: 11, bold: true };
  sheet.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('D5').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
  sheet.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

  sheet.mergeCells('F5:G5');
  sheet.getCell('F5').value = 'Pending';
  sheet.getCell('F5').font = { name: 'Aptos', size: 11, bold: true };
  sheet.getCell('F5').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('F5').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
  sheet.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

  sheet.mergeCells('H5:I5');
  sheet.getCell('H5').value = 'Rejected';
  sheet.getCell('H5').font = { name: 'Aptos', size: 11, bold: true };
  sheet.getCell('H5').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('H5').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };
  sheet.getCell('H5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

  sheet.mergeCells('B6:C6');
  sheet.getCell('B6').value = total;
  sheet.getCell('B6').font = { name: 'Aptos', size: 14, bold: true };
  sheet.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('B6').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };

  sheet.mergeCells('D6:E6');
  sheet.getCell('D6').value = accepted;
  sheet.getCell('D6').font = { name: 'Aptos', size: 14, bold: true, color: { argb: 'FF375623' } };
  sheet.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('D6').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };

  sheet.mergeCells('F6:G6');
  sheet.getCell('F6').value = pending;
  sheet.getCell('F6').font = { name: 'Aptos', size: 14, bold: true, color: { argb: 'FF833C0C' } };
  sheet.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('F6').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };

  sheet.mergeCells('H6:I6');
  sheet.getCell('H6').value = rejected;
  sheet.getCell('H6').font = { name: 'Aptos', size: 14, bold: true, color: { argb: 'FFC00000' } };
  sheet.getCell('H6').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('H6').border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'}, bottom: {style:'thin'} };

  // TABLE HEADERS
  const columns = [
    { header: 'Sl No', key: 'sl', width: 8 },
    { header: 'District', key: 'district', width: 18 },
    { header: 'Petition No', key: 'petitionNo', width: 15 },
    { header: 'Petitioner', key: 'petitioner', width: 25 },
    { header: 'Petitioner Address', key: 'petitionerAddress', width: 28 },
    { header: 'SIR Officer Name', key: 'sirOfficerName', width: 22 },
    { header: 'Officer Rank', key: 'officerRank', width: 18 },
    { header: 'Respondent(s)', key: 'respondent', width: 25 },
    { header: 'CA Details (Desig/Dept/Office)', key: 'caDetails', width: 35 },
    { header: 'Permission Status', key: 'permissionStatus', width: 18 },
    { header: 'Perm. Sent Date', key: 'permissionSentDate', width: 16 },
    { header: 'Perm. Recv Date', key: 'permissionReceivedFromCA', width: 16 },
    { header: 'Sent to Unit Date', key: 'caSentToUnit', width: 18 },
    { header: 'Proposal Status', key: 'proposalStatus', width: 20 },
    { header: 'Proposal Sent Date', key: 'proposalSentDate', width: 18 },
    { header: 'PE No', key: 'peNo', width: 15 },
    { header: 'PE Status', key: 'peStatus', width: 18 },
    { header: 'PE Reg Date', key: 'peRegDate', width: 18 },
    { header: 'PE Report Sent Date', key: 'peReportSentDate', width: 22 }
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
  if (petitions.length === 0) {
    sheet.mergeCells('A8:S8');
    sheet.getCell('A8').value = 'No petition records available.';
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

    petitions.forEach((p, idx) => {
      rows.push({
        sl: idx + 1,
        district: p.district,
        petitionNo: p.petitionNo,
        petitioner: p.petitionerName,
        petitionerAddress: p.petitionerAddress || '',
        sirOfficerName: p.sirOfficerName || '',
        officerRank: p.officerRank || '',
        respondent: (p.respondents || []).map(r => {
          const details = [r.designation, r.office, r.department].filter(Boolean).join(' / ');
          return details ? `${r.name} (${details})` : r.name;
        }).join('\n'),
        caDetails: (p.respondents || []).map(r => [r.caDesignation, r.caDepartment, r.caPlace].filter(Boolean).join(' / ') || '-').join('\n'),
        permissionStatus: (p.respondents || []).map(r => r.permissionStatus || '-').join('\n'),
        permissionSentDate: (p.respondents || []).map(r => formatDate(r.permissionSentDate) || '-').join('\n'),
        permissionReceivedFromCA: (p.respondents || []).map(r => formatDate(r.permissionReceivedFromCA) || '-').join('\n'),
        caSentToUnit: (p.respondents || []).map(r => formatDate(r.caSentToUnit) || '-').join('\n'),
        proposalStatus: p.proposalStatus || '',
        proposalSentDate: formatDate(p.proposalSentDate),
        peNo: p.peNo || '',
        peStatus: p.peStatus || '',
        peRegDate: formatDate(p.peRegDate),
        peReportSentDate: formatDate(p.peReportSentDate)
      });
    });

    const addedRows = sheet.addRows(rows);

    addedRows.forEach((row, index) => {
      const petition = petitions[index];
      const respCount = Math.max(1, petition.respondents ? petition.respondents.length : 1);
      row.height = Math.max(25, respCount * 18);
      const isEven = index % 2 === 0;
      const rowFill = isEven ? 'FFFFFFFF' : 'FFF2F2F2';

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Aptos', size: 11 };
        
        // Alignments based on columns
        let alignHoriz = 'center';
        if ([2, 4, 5, 6].includes(colNumber)) {
          alignHoriz = 'left';
        }
        
        let wrap = false;
        if ([4, 5, 6, 7, 8, 9, 10, 11, 14].includes(colNumber)) {
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
        
        if (colNumber === 7 || colNumber === 11 || colNumber === 14) {
          const val = (cell.value || '').toString().toLowerCase();
          if (val.includes('accept') || val.includes('approve') || val.includes('register')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
            cell.font = { name: 'Aptos', size: 11, color: { argb: 'FF375623' }, bold: true };
          } else if (val.includes('reject') || val.includes('error')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
            cell.font = { name: 'Aptos', size: 11, color: { argb: 'FFC00000' }, bold: true };
          } else if (val === 'completed') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; 
            cell.font = { name: 'Aptos', size: 11, color: { argb: 'FF274E13' }, bold: true };
          } else if (val) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
            cell.font = { name: 'Aptos', size: 11, color: { argb: 'FF833C0C' }, bold: true };
          }
        }
      });
    });

    sheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: 16 }
    };
  }

  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 8, topLeftCell: 'A9' }
  ];

  if (petitions.length > 0) {
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
  const fileName = `17-A_Proposals_Status_Register_${now.toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
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
