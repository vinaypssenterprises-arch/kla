import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, AlertCircle, Landmark, Plus, Trash2, Scale, Users, Gavel, BookOpen
} from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import {
  HC_BENCHES,
  CASE_TYPES,
  CASE_STAGES,
  HC_PETITION_TYPES,
  HC_RESPONDENTS,
  HC_COURT_ORDERS,
  CLC_OPINIONS,
  SC_PETITION_TYPES,
  parseCrimeNo,
  formatCrimeNo
} from '../lib/courtCases';

const toDateInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
};

export default function CourtCaseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const [initialData, setInitialData] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [acts, setActs] = useState([]);
  const [actSections, setActSections] = useState([]);
  const [courtNames, setCourtNames] = useState([]);
  const [sppList, setSppList] = useState([]);
  const [stayTypes, setStayTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const activeOnly = (data) => (Array.isArray(data) ? data.filter(d => d.isActive) : []);
    const requests = [
      apiFetch('/districts').then(r => r.json()).then(d => setDistricts(activeOnly(d))),
      apiFetch('/master-items/act').then(r => r.json()).then(d => setActs(activeOnly(d))),
      apiFetch('/master-items/actSection').then(r => r.json()).then(d => setActSections(activeOnly(d))),
      apiFetch('/master-items/courtName').then(r => r.json()).then(d => setCourtNames(activeOnly(d))),
      apiFetch('/master-items/spp').then(r => r.json()).then(d => setSppList(activeOnly(d))),
      apiFetch('/master-items/stayType').then(r => r.json()).then(d => setStayTypes(activeOnly(d))),
      apiFetch('/master-items/department').then(r => r.json()).then(d => setDepartments(activeOnly(d))),
      apiFetch('/master-items/subDepartment').then(r => r.json()).then(d => setSubDepartments(activeOnly(d))),
      isEdit
        ? apiFetch(`/court-cases/${id}`).then(r => (r.ok ? r.json() : Promise.reject())).then(setInitialData).catch(() => setNotFound(true))
        : Promise.resolve()
    ];
    Promise.all(requests.map(p => p.catch(err => console.error('Court case form load failed', err)))).finally(() => setLoading(false));
  }, [id, isEdit]);

  if (loading) return (
    <div className="space-y-5 animate-pulse p-1">
      <div className="h-7 skeleton-line w-48 rounded-lg" />
      <div className="h-4 skeleton-line w-72 rounded-lg" />
      <div className="h-[400px] skeleton-card rounded-xl mt-6" />
    </div>
  );
  if (isEdit && notFound) return <div className="min-h-[300px] flex items-center justify-center text-ink-text-soft">Court case not found.</div>;

  return (
    <CourtCaseFormInner
      initialData={initialData}
      districts={districts}
      acts={acts}
      actSections={actSections}
      courtNames={courtNames}
      sppList={sppList}
      stayTypes={stayTypes}
      departments={departments}
      subDepartments={subDepartments}
    />
  );
}

function Section({ numeral, title, subtitle, icon: Icon, aside, children }) {
  return (
    <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 lg:p-7 shadow-soft w-full">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-[#E8EEF9] border border-[#CBD8EF] flex items-center justify-center text-[#000E89] flex-shrink-0 mt-0.5 shadow-2xs">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-[16.5px] text-ink-text font-serif font-semibold flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-brass font-semibold">{numeral}.</span> {title}
            </h4>
            {subtitle && <p className="text-[12.5px] text-ink-text-faint mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

function CourtCaseFormInner({
  initialData,
  districts,
  acts,
  actSections,
  courtNames,
  sppList,
  stayTypes,
  departments,
  subDepartments
}) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const isEdit = !!initialData;
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const canSelectAnyDistrict = role === 'admin' || isHeadOffice;
  const userDistrictId = localStorage.getItem('districtId') || '';

  // Form State
  const [districtId, setDistrictId] = useState(
    isEdit ? initialData.districtId : (canSelectAnyDistrict ? '' : userDistrictId)
  );

  // Crime Number Segmented inputs
  const parsedInitCrime = parseCrimeNo(initialData?.crimeNo);
  const [crimeNumber, setCrimeNumber] = useState(parsedInitCrime.number || '');
  const [crimeYear, setCrimeYear] = useState(parsedInitCrime.year || new Date().getFullYear().toString());

  // Other I. Case & FIR Details
  const [complainantName, setComplainantName] = useState(initialData?.complainantName || '');
  const [firRegDate, setFirRegDate] = useState(toDateInput(initialData?.firRegDate));
  const [caseType, setCaseType] = useState(initialData?.caseType || '');
  const [courtName, setCourtName] = useState(initialData?.courtName || '');
  const [sppName, setSppName] = useState(initialData?.sppName || '');
  const [caseStage, setCaseStage] = useState(initialData?.caseStage || '');
  const [ccNo, setCcNo] = useState(initialData?.ccNo || '');
  const [ioName, setIoName] = useState(initialData?.ioName || '');

  // II. Act & Section Details (Max 30)
  const [caseActSections, setCaseActSections] = useState(() => {
    if (initialData?.actSections && initialData.actSections.length > 0) {
      return initialData.actSections.map(as => ({
        act: as.act || '',
        section: as.section || ''
      }));
    }
    if (initialData?.act || initialData?.section) {
      return [{ act: initialData.act || '', section: initialData.section || initialData.sectionOfLaw || '' }];
    }
    return [{ act: '', section: '' }];
  });

  // III. Accused Government Officials (AGO Details - Max 50)
  const [agos, setAgos] = useState(() => {
    if (initialData?.agos && initialData.agos.length > 0) {
      return initialData.agos.map(a => ({
        name: a.name || '',
        designation: a.designation || '',
        department: a.department || '',
        subDepartment: a.subDepartment || ''
      }));
    }
    return [{ name: '', designation: '', department: '', subDepartment: '' }];
  });

  // III. Hon'ble High Court — Stay Details
  const [hcBench, setHcBench] = useState(initialData?.hcBench || '');
  const [hcCourtHall, setHcCourtHall] = useState(initialData?.hcCourtHall || '');
  const [hcPetitionType, setHcPetitionType] = useState(initialData?.hcPetitionType || '');
  const [hcPetitionNo, setHcPetitionNo] = useState(initialData?.hcPetitionNo || initialData?.wpCrlpNo || '');
  const [hcPetitionDate, setHcPetitionDate] = useState(toDateInput(initialData?.hcPetitionDate));
  const [hcStayDate, setHcStayDate] = useState(toDateInput(initialData?.hcStayDate || initialData?.stayDate));
  const [hcStayType, setHcStayType] = useState(initialData?.hcStayType || initialData?.stayType || '');
  const [hcCounselInformedDate, setHcCounselInformedDate] = useState(toDateInput(initialData?.hcCounselInformedDate || initialData?.sppInformedDate));
  const [hcPetitionerName, setHcPetitionerName] = useState(initialData?.hcPetitionerName || '');
  const [hcRespondents, setHcRespondents] = useState(initialData?.hcRespondents || '');
  const [hcParawiseRemarksDate, setHcParawiseRemarksDate] = useState(toDateInput(initialData?.hcParawiseRemarksDate));
  const [hcNextHearingDate, setHcNextHearingDate] = useState(toDateInput(initialData?.hcNextHearingDate));
  const [hcCourtOrders, setHcCourtOrders] = useState(initialData?.hcCourtOrders || initialData?.hcCaseStatus || '');
  const [hcCounselName, setHcCounselName] = useState(initialData?.hcCounselName || '');
  const [hcClcIntimationDate, setHcClcIntimationDate] = useState(toDateInput(initialData?.hcClcIntimationDate));
  const [hcClcOpinion, setHcClcOpinion] = useState(initialData?.hcClcOpinion || '');
  const [hcClcOpinionDate, setHcClcOpinionDate] = useState(toDateInput(initialData?.hcClcOpinionDate));

  // IV. Hon'ble Supreme Court Details
  const [scPetitionType, setScPetitionType] = useState(initialData?.scPetitionType || '');
  const [scPetitionNo, setScPetitionNo] = useState(initialData?.scPetitionNo || initialData?.slpNo || '');
  const [scPetitionDate, setScPetitionDate] = useState(toDateInput(initialData?.scPetitionDate));
  const [scPetitionerName, setScPetitionerName] = useState(initialData?.scPetitionerName || '');
  const [scRespondents, setScRespondents] = useState(initialData?.scRespondents || '');
  const [scHearingDate, setScHearingDate] = useState(toDateInput(initialData?.scHearingDate));
  const [scCourtOrders, setScCourtOrders] = useState(initialData?.scCourtOrders || initialData?.scCaseStatus || '');
  const [scCounselName, setScCounselName] = useState(initialData?.scCounselName || '');

  // Derived district code
  const selectedDistrict = useMemo(() => districts.find(d => d.id === districtId), [districts, districtId]);
  const districtCode = useMemo(() => {
    if (!selectedDistrict) return '';
    return selectedDistrict.shortName
      ? selectedDistrict.shortName.toUpperCase()
      : selectedDistrict.name.slice(0, 3).toUpperCase();
  }, [selectedDistrict]);

  // Formatted crime number live preview
  const previewCrimeNo = useMemo(() => {
    return formatCrimeNo({
      districtCode,
      number: crimeNumber,
      year: crimeYear
    });
  }, [districtCode, crimeNumber, crimeYear]);

  // Act & Section handlers (Max 30)
  const handleAddActSection = () => {
    if (caseActSections.length >= 30) {
      showError('Maximum 30 Act & Section entries allowed.');
      return;
    }
    setCaseActSections([...caseActSections, { act: '', section: '' }]);
  };

  const handleRemoveActSection = (index) => {
    if (caseActSections.length <= 1) {
      setCaseActSections([{ act: '', section: '' }]);
      return;
    }
    setCaseActSections(caseActSections.filter((_, i) => i !== index));
  };

  const handleActSectionChange = (index, field, value) => {
    const updated = [...caseActSections];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'act') {
      updated[index].section = ''; // reset section when act changes
    }
    setCaseActSections(updated);
  };

  const getSectionsForAct = (actName) => {
    if (!actName) return [];
    const actObj = acts.find(a => a.name === actName);
    if (!actObj) return [];
    return actSections.filter(s => s.parentId === actObj.id).map(s => ({ value: s.name, label: s.name }));
  };

  // Cascading Courts based on selected District
  const filteredCourts = useMemo(() => {
    if (!districtId) return [];
    return courtNames.filter(c => c.parentId === districtId);
  }, [courtNames, districtId]);

  // Selected Court object
  const selectedCourtObj = useMemo(() => {
    if (!courtName) return null;
    return (
      filteredCourts.find(c => c.name === courtName) ||
      courtNames.find(c => c.name === courtName && (!districtId || c.parentId === districtId)) ||
      courtNames.find(c => c.name === courtName) ||
      null
    );
  }, [courtName, filteredCourts, courtNames, districtId]);

  // Cascading SPPs based on selected Court
  const filteredSppList = useMemo(() => {
    if (!selectedCourtObj) return [];
    return sppList.filter(s => s.parentId === selectedCourtObj.id);
  }, [sppList, selectedCourtObj]);

  const handleDistrictChange = (newDistrictId) => {
    setDistrictId(newDistrictId);
    setCourtName('');
    setSppName('');
  };

  const handleCourtChange = (newCourtName) => {
    setCourtName(newCourtName);
    if (!newCourtName) {
      setSppName('');
      return;
    }
    const courtObj =
      filteredCourts.find(c => c.name === newCourtName) ||
      courtNames.find(c => c.name === newCourtName && (!districtId || c.parentId === districtId)) ||
      courtNames.find(c => c.name === newCourtName);

    if (courtObj) {
      const matchingSpps = sppList.filter(s => s.parentId === courtObj.id);
      if (matchingSpps.length === 1) {
        setSppName(matchingSpps[0].name);
      } else if (!matchingSpps.some(s => s.name === sppName)) {
        setSppName('');
      }
    } else {
      setSppName('');
    }
  };

  const courtOptions = useMemo(() => {
    const opts = filteredCourts.map(c => ({ value: c.name, label: c.name }));
    if (courtName && !filteredCourts.some(c => c.name === courtName)) {
      opts.unshift({ value: courtName, label: `${courtName} (Current)` });
    }
    return [
      {
        value: '',
        label: !districtId
          ? 'Select District first'
          : filteredCourts.length === 0
          ? 'No courts registered for this district'
          : 'Select Court'
      },
      ...opts
    ];
  }, [filteredCourts, courtName, districtId]);

  const sppOptions = useMemo(() => {
    const opts = filteredSppList.map(s => ({ value: s.name, label: s.name }));
    if (sppName && !filteredSppList.some(s => s.name === sppName)) {
      opts.unshift({ value: sppName, label: `${sppName} (Current)` });
    }
    return [
      {
        value: '',
        label: !courtName
          ? 'Select Court first'
          : filteredSppList.length === 0
          ? 'No Spl PP registered for this court'
          : 'Select Spl PP'
      },
      ...opts
    ];
  }, [filteredSppList, sppName, courtName]);

  // Handle AGO table row management
  const handleAddAgo = () => {
    if (agos.length >= 50) {
      showError('Maximum 50 Accused Government Officials allowed.');
      return;
    }
    setAgos([...agos, { name: '', designation: '', department: '', subDepartment: '' }]);
  };

  const handleRemoveAgo = (index) => {
    if (agos.length <= 1) {
      setAgos([{ name: '', designation: '', department: '', subDepartment: '' }]);
      return;
    }
    setAgos(agos.filter((_, i) => i !== index));
  };

  const handleAgoChange = (index, field, value) => {
    const updated = [...agos];
    updated[index] = { ...updated[index], [field]: value };
    // If department changes, clear subDepartment
    if (field === 'department') {
      updated[index].subDepartment = '';
    }
    setAgos(updated);
  };

  const getSubDeptOptions = (deptName) => {
    if (!deptName) return [];
    const deptObj = departments.find(d => d.name === deptName);
    if (!deptObj) return [];
    return subDepartments.filter(sd => sd.parentId === deptObj.id).map(sd => ({ value: sd.name, label: sd.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!districtId) {
      setErrorMsg('District is required.');
      return;
    }
    if (!crimeNumber || !crimeNumber.trim()) {
      setErrorMsg('3-digit Crime Number is required (e.g. 001).');
      return;
    }
    if (!crimeYear || crimeYear.trim().length !== 4) {
      setErrorMsg('4-digit Year is required in YYYY format (e.g. 2026).');
      return;
    }

    const fullCrimeNo = `KLA/${districtCode}/${crimeNumber.padStart(3, '0')}/${crimeYear}`;

    // Filter valid Act & Section rows
    const validActSections = caseActSections
      .filter(as => (as.act && as.act.trim()) || (as.section && as.section.trim()))
      .map(as => ({
        act: (as.act || '').trim(),
        section: (as.section || '').trim()
      }));

    // Filter valid AGO rows
    const validAgos = agos
      .filter(a => (a.name && a.name.trim()) || (a.designation && a.designation.trim()) || (a.department && a.department.trim()))
      .map(a => ({
        name: (a.name || '').trim(),
        designation: (a.designation || '').trim(),
        department: (a.department || '').trim(),
        subDepartment: (a.subDepartment || '').trim()
      }));

    const primaryAct = validActSections.map(a => a.act).filter(Boolean).join(', ') || null;
    const allSections = validActSections.map(a => a.section).filter(Boolean).join(', ') || null;

    const payload = {
      districtId,
      crimeNo: fullCrimeNo,
      complainantName: complainantName.trim() || null,
      firRegDate: firRegDate || null,
      act: primaryAct,
      section: allSections,
      caseType: caseType || null,
      courtName: courtName || null,
      sppName: sppName || null,
      caseStage: caseStage || null,
      ccNo: ccNo.trim() || null,
      ioName: ioName.trim() || null,

      // Act & Sections
      actSections: validActSections,

      // AGOs
      agos: validAgos,

      // High Court
      hcBench: hcBench || null,
      hcCourtHall: hcCourtHall.trim() || null,
      hcPetitionType: hcPetitionType || null,
      hcPetitionNo: hcPetitionNo.trim() || null,
      hcPetitionDate: hcPetitionDate || null,
      hcStayDate: hcStayDate || null,
      hcStayType: hcStayType || null,
      hcCounselInformedDate: hcCounselInformedDate || null,
      hcPetitionerName: hcPetitionerName.trim() || null,
      hcRespondents: hcRespondents || null,
      hcParawiseRemarksDate: hcParawiseRemarksDate || null,
      hcNextHearingDate: hcNextHearingDate || null,
      hcCourtOrders: hcCourtOrders || null,
      hcCounselName: hcCounselName.trim() || null,
      hcClcIntimationDate: hcClcIntimationDate || null,
      hcClcOpinion: hcClcOpinion || null,
      hcClcOpinionDate: hcClcOpinionDate || null,

      // Supreme Court
      scPetitionType: scPetitionType || null,
      scPetitionNo: scPetitionNo.trim() || null,
      scPetitionDate: scPetitionDate || null,
      scPetitionerName: scPetitionerName.trim() || null,
      scRespondents: scRespondents.trim() || null,
      scHearingDate: scHearingDate || null,
      scCourtOrders: scCourtOrders.trim() || null,
      scCounselName: scCounselName.trim() || null
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/court-cases/${initialData.id}` : '/court-cases';
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess(`Court case ${isEdit ? 'updated' : 'created'} successfully.`);
        navigate('/court-cases');
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error || `Failed to ${isEdit ? 'update' : 'create'} court case.`);
      }
    } catch (err) {
      console.error('Court case submit error', err);
      setErrorMsg('An unexpected error occurred while saving the court case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* Top Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 w-full bg-[#FFFDF7] border border-rule rounded-m p-5 shadow-soft">
        <div>
          <button
            type="button"
            onClick={() => navigate('/court-cases')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-text-soft hover:text-ink-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Court Cases
          </button>
          <h2 className="text-[22px] font-serif font-bold text-ink-text">
            {isEdit ? `Edit Court Case — ${initialData.crimeNo}` : 'Register New Court Case'}
          </h2>
          <p className="text-[13px] text-ink-text-soft mt-0.5">
            Complete FIR, case details, accused government officials, High Court stay, and Supreme Court tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/court-cases')}
            className="btn btn-secondary px-5"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary px-6 shadow-sm"
            disabled={submitting}
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Register Court Case')}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-brick-bg border border-brick-soft text-brick flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* SECTION I: Case & FIR Details */}
      <Section
        numeral="I"
        title="Case & FIR Details"
        subtitle="Basic registration info, jurisdiction district, crime number, applicable laws, and case stage."
        icon={Landmark}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. District */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                District <span className="text-brick">*</span>
              </label>
              {districtCode && (
                <span className="font-mono text-[11px] font-bold text-[#000E89] bg-[#E8EEF9] border border-[#CBD8EF] px-1.5 py-0.2 rounded">
                  {districtCode}
                </span>
              )}
            </div>
            <SearchableSelect
              value={districtId}
              onChange={handleDistrictChange}
              options={districts.map(d => ({
                value: d.id,
                label: d.shortName ? `${d.name} (${d.shortName})` : d.name
              }))}
              label="Select District"
              placeholder="Select district..."
              disabled={!canSelectAnyDistrict}
            />
          </div>

          {/* 2. Crime Number (3 digits) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Cr. No. (3 Digits) <span className="text-brick">*</span>
              </label>
              <span className="text-[11px] text-ink-text-faint font-mono">001-999</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder="001"
              className="app-input font-mono font-bold text-center tracking-widest text-[14px]"
              value={crimeNumber}
              onChange={e => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCrimeNumber(clean);
              }}
              onBlur={() => {
                if (crimeNumber && crimeNumber.length > 0) {
                  setCrimeNumber(crimeNumber.padStart(3, '0'));
                }
              }}
            />
          </div>

          {/* 3. Crime Year (4 digits) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Year <span className="text-brick">*</span>
              </label>
              <span className="text-[11px] text-ink-text-faint font-mono">YYYY</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder={new Date().getFullYear().toString()}
              className="app-input font-mono font-bold text-center tracking-widest text-[14px]"
              value={crimeYear}
              onChange={e => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCrimeYear(clean);
              }}
            />
          </div>

          {/* 4. Complainant Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Complainant Name
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Name of complainant..."
              value={complainantName}
              onChange={e => setComplainantName(e.target.value)}
            />
          </div>

          {/* Live Formatted Crime Number Banner */}
          <div className="sm:col-span-2 lg:col-span-4 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs border bg-[#FAF6ED] border-rule/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border bg-[#E8EEF9] border-[#CBD8EF] text-[#000E89] flex items-center justify-center font-bold font-mono text-[14px] flex-shrink-0">
                №
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-text-faint">
                  Generated Crime Number (Cr. No.)
                </div>
                <div className="font-mono text-[15px] font-bold text-[#000E89] tracking-wide">
                  {previewCrimeNo}
                </div>
              </div>
            </div>
            <div className="text-[11.5px] text-ink-text-faint italic">
              Format: KLA / [District Code] / [3-digit No] / [4-digit Year]
            </div>
          </div>

          {/* 5. Date of Registration FIR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Date of Registration FIR
            </label>
            <input
              type="date"
              className="app-input"
              value={firRegDate}
              onChange={e => setFirRegDate(e.target.value)}
            />
          </div>

          {/* 6. Type of Case */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Type of Case
            </label>
            <select
              className="app-input"
              value={caseType}
              onChange={e => setCaseType(e.target.value)}
            >
              <option value="">Select Case Type</option>
              {CASE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 7. Court Name (Master - Cascading by District) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Court Name (Master)
              </label>
              {districtId && filteredCourts.length > 0 && (
                <span className="text-[11px] text-ink-text-faint font-mono">
                  {filteredCourts.length} {filteredCourts.length === 1 ? 'court' : 'courts'}
                </span>
              )}
            </div>
            <SearchableSelect
              value={courtName}
              onChange={handleCourtChange}
              options={courtOptions}
              label="Select Court Name"
              placeholder={!districtId ? "Select district first..." : "Select court..."}
              disabled={!districtId}
            />
          </div>

          {/* 8. Name of the Spl PP (Master - Cascading by Court) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Name of the Spl PP (Master)
              </label>
              {filteredSppList.length > 1 && (
                <span className="text-[11px] text-[#000E89] font-medium">
                  {filteredSppList.length} prosecutors
                </span>
              )}
            </div>
            <SearchableSelect
              value={sppName}
              onChange={setSppName}
              options={sppOptions}
              label="Select Spl PP"
              placeholder={!courtName ? "Select court first..." : "Select Spl PP..."}
              disabled={!courtName}
            />
          </div>

          {/* 9. Stage of the case */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Stage of the Case
            </label>
            <select
              className="app-input"
              value={caseStage}
              onChange={e => setCaseStage(e.target.value)}
            >
              <option value="">Select Stage</option>
              {CASE_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 10. CC No (6 digits) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                CC No
              </label>
              <span className="text-[11px] text-ink-text-faint font-mono">6 digits</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="app-input font-mono"
              value={ccNo}
              onChange={e => setCcNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          {/* 11. IO / Holding IO */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-[12.5px] font-bold text-ink-text">
              IO / Holding IO
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Name of Investigating Officer / Holding I.O..."
              value={ioName}
              onChange={e => setIoName(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* SECTION II: Act & Section Details */}
      <Section
        numeral="II"
        title="Act & Section Details"
        subtitle="Applicable Acts and dependent sections. Add up to 30 entries."
        icon={BookOpen}
        aside={
          <button
            type="button"
            onClick={handleAddActSection}
            disabled={caseActSections.length >= 30}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Act & Section ({caseActSections.length}/30)
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-rule/70 shadow-2xs">
          <table className="w-full border-collapse bg-white table-fixed">
            <thead>
              <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12 text-center">
                  #
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[52%]">
                  Act (Master)
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[40%]">
                  Section (Master)
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-14">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAD9]">
              {caseActSections.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F9F6EE]/60 transition-colors">
                  <td className="py-3 px-3 text-[12px] font-mono text-ink-text-faint text-center">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <SearchableSelect
                      className="w-full"
                      value={item.act}
                      onChange={val => handleActSectionChange(idx, 'act', val)}
                      options={[{ value: '', label: 'Select Act' }, ...acts.map(a => ({ value: a.name, label: a.name }))]}
                      label="Select Act"
                      placeholder="Select act..."
                    />
                  </td>
                  <td className="py-3 px-3">
                    <SearchableSelect
                      className="w-full"
                      value={item.section}
                      onChange={val => handleActSectionChange(idx, 'section', val)}
                      options={[{ value: '', label: 'Select Section' }, ...getSectionsForAct(item.act)]}
                      label="Select Section"
                      placeholder={item.act ? 'Select section...' : 'Select act first'}
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveActSection(idx)}
                      title="Remove Act & Section row"
                      className="p-1.5 rounded-lg text-ink-text-faint hover:text-brick hover:bg-brick-bg/60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION III: Accused Government Officials (AGO Details) */}
      <Section
        numeral="III"
        title="AGO Details (Accused Government Officials)"
        subtitle="List public servants accused in this case. Add up to 50 officials with department and sub-department mappings."
        icon={Users}
        aside={
          <button
            type="button"
            onClick={handleAddAgo}
            disabled={agos.length >= 50}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add AGO ({agos.length}/50)
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-rule/70 shadow-2xs">
          <table className="w-full border-collapse bg-white table-fixed">
            <thead>
              <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12 text-center">
                  #
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[25%]">
                  Name of the AGO
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[22%]">
                  AGO Designation
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[25%]">
                  Department (Master)
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[23%]">
                  Sub Department (Master)
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-14">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAD9]">
              {agos.map((ago, idx) => (
                <tr key={idx} className="hover:bg-[#F9F6EE]/60 transition-colors">
                  <td className="py-3 px-3 text-[12px] font-mono text-ink-text-faint text-center">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      className="app-input py-1.5 px-3 text-[13px] w-full"
                      placeholder="Official's name..."
                      value={ago.name}
                      onChange={e => handleAgoChange(idx, 'name', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      className="app-input py-1.5 px-3 text-[13px] w-full"
                      placeholder="e.g. Village Accountant, AEE..."
                      value={ago.designation}
                      onChange={e => handleAgoChange(idx, 'designation', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <SearchableSelect
                      className="w-full"
                      value={ago.department}
                      onChange={val => handleAgoChange(idx, 'department', val)}
                      options={[{ value: '', label: 'Select Department' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
                      label="Department"
                      placeholder="Select department..."
                    />
                  </td>
                  <td className="py-3 px-3">
                    <SearchableSelect
                      className="w-full"
                      value={ago.subDepartment}
                      onChange={val => handleAgoChange(idx, 'subDepartment', val)}
                      options={[{ value: '', label: 'Select Sub Dept' }, ...getSubDeptOptions(ago.department)]}
                      label="Sub Department"
                      placeholder={ago.department ? 'Select sub department...' : 'Select department first'}
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAgo(idx)}
                      title="Remove AGO row"
                      className="p-1.5 rounded-lg text-ink-text-faint hover:text-brick hover:bg-brick-bg/60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION IV: Hon'ble High Court — Stay Details */}
      <Section
        numeral="IV"
        title="Hon'ble High Court — Stay Details"
        subtitle="High Court stay proceedings, bench, petition info, dates, counsel, and CLC opinion."
        icon={Scale}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* High Court Bench */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              High Court Bench
            </label>
            <select
              className="app-input"
              value={hcBench}
              onChange={e => setHcBench(e.target.value)}
            >
              <option value="">Select Bench</option>
              {HC_BENCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Court Hall (6 digits) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Court Hall
              </label>
              <span className="text-[11px] text-ink-text-faint font-mono">6 digits</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 000004"
              className="app-input font-mono"
              value={hcCourtHall}
              onChange={e => setHcCourtHall(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          {/* Petition Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Petition Type
            </label>
            <select
              className="app-input"
              value={hcPetitionType}
              onChange={e => setHcPetitionType(e.target.value)}
            >
              <option value="">Select Petition Type</option>
              {HC_PETITION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Petition No (6 digits) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-ink-text">
                Petition No.
              </label>
              <span className="text-[11px] text-ink-text-faint font-mono">6 digits</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 012345"
              className="app-input font-mono"
              value={hcPetitionNo}
              onChange={e => setHcPetitionNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          {/* Date of Petition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Date of Petition
            </label>
            <input
              type="date"
              className="app-input"
              value={hcPetitionDate}
              onChange={e => setHcPetitionDate(e.target.value)}
            />
          </div>

          {/* Date of Stay */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Date of Stay
            </label>
            <input
              type="date"
              className="app-input"
              value={hcStayDate}
              onChange={e => setHcStayDate(e.target.value)}
            />
          </div>

          {/* Stay Type (Master) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Stay Type (Master)
            </label>
            <SearchableSelect
              value={hcStayType}
              onChange={setHcStayType}
              options={[{ value: '', label: 'Select Stay Type' }, ...stayTypes.map(s => ({ value: s.name, label: s.name }))]}
              label="Select Stay Type"
              placeholder="Select stay type..."
            />
          </div>

          {/* Info Given to IO by Counsel */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Info Given to IO by Counsel (Date)
            </label>
            <input
              type="date"
              className="app-input"
              value={hcCounselInformedDate}
              onChange={e => setHcCounselInformedDate(e.target.value)}
            />
          </div>

          {/* Petitioner Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Petitioner Name
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Petitioner name..."
              value={hcPetitionerName}
              onChange={e => setHcPetitionerName(e.target.value)}
            />
          </div>

          {/* Respondents */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Respondents
            </label>
            <select
              className="app-input"
              value={hcRespondents}
              onChange={e => setHcRespondents(e.target.value)}
            >
              <option value="">Select Respondent</option>
              {HC_RESPONDENTS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Date of Parawise remarks by IO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Date of Parawise remarks by IO
            </label>
            <input
              type="date"
              className="app-input"
              value={hcParawiseRemarksDate}
              onChange={e => setHcParawiseRemarksDate(e.target.value)}
            />
          </div>

          {/* Next Hearing Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Next Hearing Date
            </label>
            <input
              type="date"
              className="app-input"
              value={hcNextHearingDate}
              onChange={e => setHcNextHearingDate(e.target.value)}
            />
          </div>

          {/* Orders of the Court */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Orders of the Court
            </label>
            <select
              className="app-input"
              value={hcCourtOrders}
              onChange={e => setHcCourtOrders(e.target.value)}
            >
              <option value="">Pending / In Force</option>
              {HC_COURT_ORDERS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Name of the Counsel */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Name of the Counsel
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Advocate / Counsel name..."
              value={hcCounselName}
              onChange={e => setHcCounselName(e.target.value)}
            />
          </div>

          {/* Intimation to CLC by Counsel */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Intimation to CLC by Counsel (Date)
            </label>
            <input
              type="date"
              className="app-input"
              value={hcClcIntimationDate}
              onChange={e => setHcClcIntimationDate(e.target.value)}
            />
          </div>

          {/* Opinion of CLC */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Opinion of CLC
            </label>
            <select
              className="app-input"
              value={hcClcOpinion}
              onChange={e => setHcClcOpinion(e.target.value)}
            >
              <option value="">Select Opinion</option>
              {CLC_OPINIONS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Opinion Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Opinion Date
            </label>
            <input
              type="date"
              className="app-input"
              value={hcClcOpinionDate}
              onChange={e => setHcClcOpinionDate(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* SECTION V: Hon'ble Supreme Court Detail */}
      <Section
        numeral="V"
        title="Hon'ble Supreme Court Detail"
        subtitle="Special Leave Petition (SLP) or Criminal Diary details, hearings, orders, and counsel."
        icon={Gavel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Petition Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Petition Type
            </label>
            <select
              className="app-input"
              value={scPetitionType}
              onChange={e => setScPetitionType(e.target.value)}
            >
              <option value="">Select Type</option>
              {SC_PETITION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Petition / Diary No */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Petition No. / Diary No.
            </label>
            <input
              type="text"
              className="app-input font-mono"
              placeholder="e.g. SLP (Crl) 1234/2026"
              value={scPetitionNo}
              onChange={e => setScPetitionNo(e.target.value)}
            />
          </div>

          {/* Date of Petition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Date of Petition
            </label>
            <input
              type="date"
              className="app-input"
              value={scPetitionDate}
              onChange={e => setScPetitionDate(e.target.value)}
            />
          </div>

          {/* Petitioner Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Petitioner Name
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Petitioner name..."
              value={scPetitionerName}
              onChange={e => setScPetitionerName(e.target.value)}
            />
          </div>

          {/* Respondents */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Respondents
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="Respondents..."
              value={scRespondents}
              onChange={e => setScRespondents(e.target.value)}
            />
          </div>

          {/* Hearing Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Hearing Date
            </label>
            <input
              type="date"
              className="app-input"
              value={scHearingDate}
              onChange={e => setScHearingDate(e.target.value)}
            />
          </div>

          {/* Orders of the Court */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Orders of the Court
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="e.g. Notice issued, Dismissed..."
              value={scCourtOrders}
              onChange={e => setScCourtOrders(e.target.value)}
            />
          </div>

          {/* Name of the Counsel */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-bold text-ink-text">
              Name of the Counsel
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="SC Advocate / Counsel name..."
              value={scCounselName}
              onChange={e => setScCounselName(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* Bottom Action Footer */}
      <div className="sticky bottom-0 z-30 flex items-center justify-between p-4 bg-[#FFFDF7]/95 backdrop-blur-md border border-rule rounded-m shadow-soft">
        <button
          type="button"
          onClick={() => navigate('/court-cases')}
          className="btn btn-secondary px-5"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary px-6 shadow-sm"
          disabled={submitting}
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Register Court Case')}
        </button>
      </div>
    </form>
  );
}
