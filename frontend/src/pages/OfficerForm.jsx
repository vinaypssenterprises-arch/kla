import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';
import SearchableSelect from '../components/ui/SearchableSelect';
import { compareDesignationsByRank } from '../lib/officerAnalytics';

const formSchema = z.object({
  districtId: z.string().min(1, 'District is required'),
  name: z.string().optional(),
  designation: z.string().min(1, 'Designation is required'),
  workingStatus: z.string().optional(),
  mobile: z.string().optional().refine(val => !val || /^[6-9]\d{9}$/.test(val), {
    message: 'Enter a valid 10-digit Indian mobile number'
  }),
  kgidNumber: z.string().optional(),
  dateOfJoiningDept: z.string().optional(),
  trainingPlace: z.string().optional(),
  trainingFromDate: z.string().optional(),
  trainingToDate: z.string().optional(),
  nativePlace: z.string().optional(),
  educationQualification: z.string().optional(),
  reportingDate: z.string().optional(),
  personalMobile: z.string().optional().refine(val => !val || /^[6-9]\d{9}$/.test(val), {
    message: 'Enter a valid 10-digit Indian mobile number'
  }),
  remarks: z.string().optional(),
  presentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  previousPlaces: z.array(
    z.object({
      designation: z.string().optional(),
      policeStation: z.string().optional(),
      district: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      place: z.string().optional(),
      fromYear: z.string().optional(),
      toYear: z.string().optional()
    })
  ).optional()
}).superRefine((data, ctx) => {
  const isVacant = data.workingStatus === 'Vacant';
  const nameVal = (data.name || '').trim();
  if (isVacant) {
    if (nameVal && nameVal.toLowerCase() !== 'vacant') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Officer name must be empty when status is Vacant.'
      });
    }
  } else {
    if (!nameVal || nameVal.toLowerCase() === 'vacant') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Officer name is required when status is Working.'
      });
    }
  }
});

const todayStr = () => new Date().toISOString().slice(0, 10);
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

export default function OfficerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { showError } = useToast();
  const isAdmin = localStorage.getItem('role') === 'admin';

  const [initialData, setInitialData] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [workingDesignations, setWorkingDesignations] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [workingDistricts, setWorkingDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit && !isAdmin) {
      showError('Only administrators can add new officers.');
      navigate('/officers', { replace: true });
      return;
    }

    const districtsPromise = apiFetch(`/districts`)
      .then(res => res.json())
      .then(data => setDistricts(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load districts', err));

    const designationsPromise = apiFetch(`/designations`)
      .then(res => res.json())
      .then(data => setDesignations(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load designations', err));

    const workingDesignationsPromise = apiFetch(`/master-items/workingDesignation`)
      .then(res => res.json())
      .then(data => setWorkingDesignations(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load working designations', err));

    const policeStationsPromise = apiFetch(`/master-items/policeStation`)
      .then(res => res.json())
      .then(data => setPoliceStations(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load police stations', err));

    const workingDistrictsPromise = apiFetch(`/master-items/workingDistrict`)
      .then(res => res.json())
      .then(data => setWorkingDistricts(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load working districts', err));

    const officerPromise = isEdit
      ? apiFetch(`/officers/${id}`)
          .then(res => res.json())
          .then(setInitialData)
          .catch(() => setNotFound(true))
      : Promise.resolve();

    Promise.all([
      districtsPromise,
      designationsPromise,
      workingDesignationsPromise,
      policeStationsPromise,
      workingDistrictsPromise,
      officerPromise
    ]).finally(() => setLoading(false));
  }, [id, isEdit, isAdmin, navigate, showError]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Loading...</div>;
  if (isEdit && notFound) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Officer not found.</div>;

  return (
    <OfficerFormInner
      initialData={initialData}
      districts={districts}
      allDesignations={designations}
      workingDesignations={workingDesignations}
      policeStations={policeStations}
      workingDistricts={workingDistricts}
    />
  );
}

function OfficerFormInner({
  initialData,
  districts,
  allDesignations = [],
  workingDesignations = [],
  policeStations = [],
  workingDistricts = []
}) {
  const navigate = useNavigate();
  const isEdit = !!initialData;
  const { showError, showSuccess } = useToast();

  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const canSelectAnyDistrict = isAdmin || isHeadOffice;
  const userDistrictId = localStorage.getItem('districtId') || '';
  const userDistrictName = localStorage.getItem('districtName') || '';

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit ? {
      districtId: initialData?.districtId || '',
      name: initialData?.name || '',
      designation: initialData?.designation || '',
      workingStatus: initialData?.workingStatus || 'Working',
      mobile: initialData?.mobile || '',
      kgidNumber: initialData?.kgidNumber || '',
      dateOfJoiningDept: toDateInput(initialData?.dateOfJoiningDept),
      trainingPlace: initialData?.trainingPlace || '',
      trainingFromDate: toDateInput(initialData?.trainingFromDate),
      trainingToDate: toDateInput(initialData?.trainingToDate),
      nativePlace: initialData?.nativePlace || '',
      educationQualification: initialData?.educationQualification || '',
      reportingDate: toDateInput(initialData?.reportingDate) || '',
      personalMobile: initialData?.personalMobile || '',
      remarks: initialData?.remarks || '',
      presentAddress: initialData?.presentAddress || '',
      permanentAddress: initialData?.permanentAddress || '',
      previousPlaces: (initialData?.previousPlaces || []).length > 0
        ? (initialData.previousPlaces).map(p => ({
            designation: p.designation || '',
            policeStation: p.policeStation || '',
            district: p.district || '',
            fromDate: toDateInput(p.fromDate),
            toDate: toDateInput(p.toDate),
            place: p.place || '',
            fromYear: p.fromYear || '',
            toYear: p.toYear || ''
          }))
        : [{ designation: '', policeStation: '', district: '', fromDate: '', toDate: '', place: '', fromYear: '', toYear: '' }]
    } : {
      districtId: canSelectAnyDistrict ? '' : userDistrictId, 
      name: '', designation: '', workingStatus: 'Working', mobile: '',
      kgidNumber: '', dateOfJoiningDept: '', trainingPlace: '',
      trainingFromDate: '', trainingToDate: '', nativePlace: '',
      educationQualification: '', reportingDate: '',
      personalMobile: '', remarks: '', presentAddress: '', permanentAddress: '',
      previousPlaces: [{ designation: '', policeStation: '', district: '', fromDate: '', toDate: '', place: '', fromYear: '', toYear: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'previousPlaces' });

  const watchedDistrictId = watch('districtId');
  const watchedWorkingStatus = watch('workingStatus');

  // When workingStatus is Vacant, officer name must be empty
  useEffect(() => {
    if (watchedWorkingStatus === 'Vacant') {
      setValue('name', '');
    }
  }, [watchedWorkingStatus, setValue]);

  const districtOptions = (() => {
    const opts = districts.map(d => ({
      value: d.id,
      label: d.shortName ? `${d.name} (${d.shortName})` : d.name
    }));
    const legacyId = isEdit
      ? (initialData?.district && !districts.some(d => d.id === initialData.districtId) ? initialData.districtId : null)
      : (!canSelectAnyDistrict && userDistrictId && !districts.some(d => d.id === userDistrictId) ? userDistrictId : null);
    if (legacyId) {
      const legacyLabel = isEdit ? initialData?.district?.name : (userDistrictName || 'Unknown');
      opts.push({ value: legacyId, label: legacyLabel });
    }
    return opts;
  })();

  const workingDesignationOptions = useMemo(() => {
    return (workingDesignations || []).map(d => ({ value: d.name, label: d.name }));
  }, [workingDesignations]);

  const policeStationOptions = useMemo(() => {
    return (policeStations || []).map(ps => ({ value: ps.name, label: ps.name }));
  }, [policeStations]);

  const workingDistrictOptions = useMemo(() => {
    return (workingDistricts || []).map(wd => ({ value: wd.name, label: wd.name }));
  }, [workingDistricts]);

  const getDesignationOpts = useCallback((val) => {
    if (val && !workingDesignationOptions.some(o => o.value === val)) {
      return [{ value: val, label: val }, ...workingDesignationOptions];
    }
    return workingDesignationOptions;
  }, [workingDesignationOptions]);

  const getPoliceStationOpts = useCallback((val) => {
    if (val && !policeStationOptions.some(o => o.value === val)) {
      return [{ value: val, label: val }, ...policeStationOptions];
    }
    return policeStationOptions;
  }, [policeStationOptions]);

  const getDistrictOpts = useCallback((val) => {
    if (val && !workingDistrictOptions.some(o => o.value === val)) {
      return [{ value: val, label: val }, ...workingDistrictOptions];
    }
    return workingDistrictOptions;
  }, [workingDistrictOptions]);

  // Filter designations belonging to the currently selected district (sorted by Rank Hierarchy)
  const designationOptions = useMemo(() => {
    if (!watchedDistrictId) return [];
    const matching = allDesignations.filter(d => !d.districtId || d.districtId === watchedDistrictId);
    matching.sort((a, b) => compareDesignationsByRank(a.name, b.name));
    const opts = matching.map(d => ({
      value: d.name,
      label: d.name
    }));

    // In edit mode, if initial designation is not in filtered list, preserve it as an option
    if (isEdit && initialData?.designation && !opts.some(o => o.value === initialData.designation)) {
      opts.unshift({ value: initialData.designation, label: `${initialData.designation} (Current)` });
    }

    return opts;
  }, [allDesignations, watchedDistrictId, isEdit, initialData?.designation]);

  // When user changes district, clear the designation field if it was set for another district
  const prevDistrictRef = useRef(isEdit ? initialData?.districtId : (canSelectAnyDistrict ? '' : userDistrictId));
  useEffect(() => {
    if (prevDistrictRef.current && prevDistrictRef.current !== watchedDistrictId) {
      setValue('designation', '', { shouldValidate: true });
    }
    prevDistrictRef.current = watchedDistrictId;
  }, [watchedDistrictId, setValue]);

  const onSubmit = async (data) => {
    const isVacant = data.workingStatus === 'Vacant';
    const payload = {
      ...data,
      name: isVacant ? '' : (data.name ? data.name.trim() : ''),
      kgidNumber: data.kgidNumber && data.kgidNumber.trim() ? data.kgidNumber.trim() : null,
      dateOfJoiningDept: data.dateOfJoiningDept || null,
      trainingPlace: data.trainingPlace && data.trainingPlace.trim() ? data.trainingPlace.trim() : null,
      trainingFromDate: data.trainingFromDate || null,
      trainingToDate: data.trainingToDate || null,
      nativePlace: data.nativePlace && data.nativePlace.trim() ? data.nativePlace.trim() : null,
      educationQualification: data.educationQualification && data.educationQualification.trim() ? data.educationQualification.trim() : null,
      reportingDate: data.reportingDate || null,
      personalMobile: data.personalMobile && data.personalMobile.trim() ? data.personalMobile.trim() : null,
      remarks: data.remarks && data.remarks.trim() ? data.remarks.trim() : null,
      presentAddress: data.presentAddress && data.presentAddress.trim() ? data.presentAddress.trim() : null,
      previousPlaces: (data.previousPlaces || [])
        .filter(p => (
          (p.designation && p.designation.trim()) ||
          (p.policeStation && p.policeStation.trim()) ||
          (p.district && p.district.trim()) ||
          (p.place && p.place.trim()) ||
          p.fromDate || p.toDate
        ))
        .map(p => ({
          designation: p.designation?.trim() || null,
          policeStation: p.policeStation?.trim() || null,
          district: p.district?.trim() || null,
          fromDate: p.fromDate || null,
          toDate: p.toDate || null,
          place: [p.designation?.trim(), p.policeStation?.trim(), p.district?.trim()].filter(Boolean).join(', ') || p.place?.trim() || null
        }))
    };

    const url = isEdit
      ? `/officers/${initialData.id}`
      : '/officers';

    try {
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess?.(isEdit ? 'Officer updated successfully.' : 'Officer added successfully.');
        navigate(isEdit ? `/officers/${initialData.id}` : '/officers');
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || (isEdit ? 'Failed to update officer.' : 'Failed to save officer.'));
      }
    } catch (error) {
      console.error('Save officer error', error);
      showError(isEdit ? 'Error updating officer.' : 'Error saving officer.');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 w-full bg-[#FFFDF7] border border-rule rounded-m p-5 shadow-soft">
        <div>
          <button
            type="button"
            onClick={() => navigate('/officers')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-text-soft hover:text-ink-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Officers
          </button>
          <h2 className="text-[22px] font-serif font-bold text-ink-text">
            {isEdit ? `Edit Officer — ${initialData?.name || initialData?.designation || ''}` : 'Deploy New Officer'}
          </h2>
          <p className="text-[13px] text-ink-text-soft mt-0.5">
            Complete officer deployment details, postings history, and rank assignment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary px-5" onClick={() => navigate('/officers')} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary px-6 shadow-sm" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Officer' : 'Save Officer'}
          </button>
        </div>
      </div>

      <form className="flex flex-col gap-5 w-full">
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[16px] text-ink-text mb-[18px] font-serif font-bold tracking-tight">Officer Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">District <span className="text-brick">*</span></label>
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={districtOptions}
                    label="Select District"
                    placeholder="Select District"
                    error={!!errors.districtId}
                    disabled={!canSelectAnyDistrict}
                  />
                )}
              />
              {errors.districtId && <span className="text-brick text-xs">{errors.districtId.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-ink-text">
                  Officer Name {watchedWorkingStatus === 'Vacant' ? (
                    <span className="text-[11px] font-normal text-amber-700 italic">(Must be empty for Vacant post)</span>
                  ) : (
                    <span className="text-brick">*</span>
                  )}
                </label>
                {!isAdmin && (
                  <span className="text-[10.5px] font-bold text-brass uppercase tracking-wider bg-[#FAF6ED] px-2 py-0.5 rounded border border-rule/60">
                    Admin Only
                  </span>
                )}
              </div>
              <input
                type="text"
                className={`app-input font-bold ${errors.name ? 'input-error' : ''} ${
                  !isAdmin || watchedWorkingStatus === 'Vacant'
                    ? 'bg-[#F2ECE1] cursor-not-allowed text-ink-text-soft border-rule/80 select-none font-medium'
                    : ''
                }`}
                placeholder={watchedWorkingStatus === 'Vacant' ? "Empty (Vacant Post)" : "Full name"}
                readOnly={!isAdmin || watchedWorkingStatus === 'Vacant'}
                title={watchedWorkingStatus === 'Vacant' ? "Officer name is empty for vacant post" : (!isAdmin ? "Officer name can only be edited by Administrator" : "")}
                {...register('name')}
              />
              {errors.name && <span className="text-brick text-xs">{errors.name.message}</span>}
              {!isAdmin && (
                <span className="text-[11px] text-ink-text-faint italic">
                  Officer name is locked for non-admins. Only Administrator can modify officer names.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Designation <span className="text-brick">*</span></label>
              <Controller
                name="designation"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={designationOptions}
                    label="Select Designation"
                    placeholder={watchedDistrictId ? (designationOptions.length > 0 ? "Select Designation" : "No designations for this district in Masters") : "Select District first"}
                    error={!!errors.designation}
                    disabled={!watchedDistrictId || designationOptions.length === 0}
                  />
                )}
              />
              {errors.designation && <span className="text-brick text-xs">{errors.designation.message}</span>}
              {!watchedDistrictId && (
                <span className="text-ink-text-faint text-[11px]">Select a district above first</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-ink-text">
                  Working Status <span className="text-brick">*</span>
                </label>
                {!isAdmin && (
                  <span className="text-[10.5px] font-bold text-brass uppercase tracking-wider bg-[#FAF6ED] px-2 py-0.5 rounded border border-rule/60">
                    Admin Only
                  </span>
                )}
              </div>
              {isAdmin ? (
                <select
                  className="app-input font-bold"
                  {...register('workingStatus')}
                >
                  <option value="Working">Working (Active / Filled Post)</option>
                  <option value="Vacant">Vacant (Vacant Post)</option>
                </select>
              ) : (
                <div className="app-input bg-[#F2ECE1] cursor-not-allowed text-ink-text border-rule/80 select-none flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${initialData?.workingStatus === 'Vacant' ? 'bg-[#E68A00]' : 'bg-[#1E6935]'}`} />
                    {initialData?.workingStatus || 'Working'}
                  </span>
                  <span className="text-[11px] text-ink-text-faint italic font-normal">Visible only</span>
                </div>
              )}
              {!isAdmin && (
                <span className="text-[11px] text-ink-text-faint italic">
                  Working status can only be modified by Administrator.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Govt (CUG) Mobile Number</label>
              <input type="text" className={`app-input font-mono font-bold ${errors.mobile ? 'input-error' : ''}`} placeholder="10-digit CUG number" maxLength={10} {...register('mobile')} />
              {errors.mobile && <span className="text-brick text-xs">{errors.mobile.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">KGID Number</label>
              <input type="text" className={`app-input font-mono font-bold ${errors.kgidNumber ? 'input-error' : ''}`} placeholder="e.g. 1234567" {...register('kgidNumber')} />
              {errors.kgidNumber && <span className="text-brick text-xs">{errors.kgidNumber.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Date of Joined to Department</label>
              <input type="date" className={`app-input font-bold ${errors.dateOfJoiningDept ? 'input-error' : ''}`} {...register('dateOfJoiningDept')} />
              {errors.dateOfJoiningDept && <span className="text-brick text-xs">{errors.dateOfJoiningDept.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Education and Qualification</label>
              <input type="text" className={`app-input ${errors.educationQualification ? 'input-error' : ''}`} placeholder="e.g. B.A, LL.B, M.Sc" {...register('educationQualification')} />
              {errors.educationQualification && <span className="text-brick text-xs">{errors.educationQualification.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Reporting present office date</label>
              <input type="date" className={`app-input font-bold ${errors.reportingDate ? 'input-error' : ''}`} {...register('reportingDate')} />
              {errors.reportingDate && <span className="text-brick text-xs">{errors.reportingDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Personal mobile number</label>
              <input type="text" className={`app-input font-mono font-bold ${errors.personalMobile ? 'input-error' : ''}`} placeholder="10-digit personal number" maxLength={10} {...register('personalMobile')} />
              {errors.personalMobile && <span className="text-brick text-xs">{errors.personalMobile.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
              <label className="text-[12.5px] font-bold text-ink-text">Remarks</label>
              <input type="text" className="app-input" placeholder="Any remarks or notes" {...register('remarks')} />
            </div>
          </div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[16px] text-ink-text mb-[18px] font-serif font-bold tracking-tight">Training Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Training Place</label>
              <input type="text" className={`app-input ${errors.trainingPlace ? 'input-error' : ''}`} placeholder="e.g. KPA Mysore / PTS" {...register('trainingPlace')} />
              {errors.trainingPlace && <span className="text-brick text-xs">{errors.trainingPlace.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Training from date</label>
              <input type="date" className={`app-input font-bold ${errors.trainingFromDate ? 'input-error' : ''}`} {...register('trainingFromDate')} />
              {errors.trainingFromDate && <span className="text-brick text-xs">{errors.trainingFromDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Training to date</label>
              <input type="date" className={`app-input font-bold ${errors.trainingToDate ? 'input-error' : ''}`} {...register('trainingToDate')} />
              {errors.trainingToDate && <span className="text-brick text-xs">{errors.trainingToDate.message}</span>}
            </div>
          </div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[16px] text-ink-text mb-[18px] font-serif font-bold tracking-tight">Address Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[12.5px] font-bold text-ink-text">Native Place</label>
              <input type="text" className={`app-input max-w-md ${errors.nativePlace ? 'input-error' : ''}`} placeholder="e.g. Belagavi" {...register('nativePlace')} />
              {errors.nativePlace && <span className="text-brick text-xs">{errors.nativePlace.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Present Residence Address</label>
              <textarea className={`app-input ${errors.presentAddress ? 'input-error' : ''}`} rows={2} placeholder="Full present address" {...register('presentAddress')} />
              {errors.presentAddress && <span className="text-brick text-xs">{errors.presentAddress.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-bold text-ink-text">Permanent Address</label>
              <textarea className={`app-input ${errors.permanentAddress ? 'input-error' : ''}`} rows={2} placeholder="Full permanent address" {...register('permanentAddress')} />
              {errors.permanentAddress && <span className="text-brick text-xs">{errors.permanentAddress.message}</span>}
            </div>
          </div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <div className="flex items-center justify-between mb-[18px] flex-wrap gap-2">
            <div>
              <h4 className="text-[16px] text-ink-text font-serif font-bold tracking-tight">
                Previous Working Places from Joining to Present
              </h4>
              <p className="text-[12px] text-ink-text-soft mt-0.5">
                Record working places with designation, police station, district, and service dates.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm font-bold"
              onClick={() => append({ designation: '', policeStation: '', district: '', fromDate: '', toDate: '' })}
            >
              <Plus className="w-[15px] h-[15px]" />
              Add Row
            </button>
          </div>

          <div className="border border-rule rounded-s overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px] min-w-[920px]">
                <thead>
                  <tr className="bg-[#F5F2E9] border-b-2 border-[#D8CEB2] text-ink-text text-[11.5px] uppercase tracking-[0.08em] font-black">
                    <th className="py-3 px-3 text-center w-14">Sl No</th>
                    <th className="py-3 px-3 text-left w-56">Designation</th>
                    <th className="py-3 px-3 text-left w-64">Police Station</th>
                    <th className="py-3 px-3 text-left w-52">District</th>
                    <th className="py-3 px-3 text-left w-40">From Date</th>
                    <th className="py-3 px-3 text-left w-40">To Date</th>
                    <th className="py-3 px-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/60">
                  {fields.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-ink-text-faint italic bg-parchment/40">
                        No previous working places added yet. Click &ldquo;Add Row&rdquo; to add a posting.
                      </td>
                    </tr>
                  ) : (
                    fields.map((field, index) => (
                      <tr key={field.id} className="hover:bg-parchment/30 transition-colors">
                        {/* Sl No (automatic) */}
                        <td className="py-2 px-3 text-center font-mono font-semibold text-ink-text-soft select-none">
                          {index + 1}
                        </td>

                        {/* Designation (separate designation master) */}
                        <td className="py-2 px-3">
                          <Controller
                            name={`previousPlaces.${index}.designation`}
                            control={control}
                            render={({ field: subField }) => (
                              <SearchableSelect
                                value={subField.value || ''}
                                onChange={subField.onChange}
                                options={getDesignationOpts(subField.value)}
                                label="Select Designation"
                                placeholder="Select Designation"
                              />
                            )}
                          />
                        </td>

                        {/* Police Station (existing police station master) */}
                        <td className="py-2 px-3">
                          <Controller
                            name={`previousPlaces.${index}.policeStation`}
                            control={control}
                            render={({ field: subField }) => (
                              <SearchableSelect
                                value={subField.value || ''}
                                onChange={subField.onChange}
                                options={getPoliceStationOpts(subField.value)}
                                label="Select Police Station"
                                placeholder="Select Police Station"
                              />
                            )}
                          />
                        </td>

                        {/* District (separate district master) */}
                        <td className="py-2 px-3">
                          <Controller
                            name={`previousPlaces.${index}.district`}
                            control={control}
                            render={({ field: subField }) => (
                              <SearchableSelect
                                value={subField.value || ''}
                                onChange={subField.onChange}
                                options={getDistrictOpts(subField.value)}
                                label="Select District"
                                placeholder="Select District"
                              />
                            )}
                          />
                        </td>

                        {/* From Date */}
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            className="app-input py-1.5 text-xs font-mono"
                            {...register(`previousPlaces.${index}.fromDate`)}
                          />
                        </td>

                        {/* To Date */}
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            className="app-input py-1.5 text-xs font-mono"
                            {...register(`previousPlaces.${index}.toDate`)}
                          />
                        </td>

                        {/* Remove Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-s text-ink-text-faint hover:text-brick hover:bg-brick-bg transition-colors"
                            title="Remove this row"
                            onClick={() => remove(index)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#FAF7EE] border-t border-rule px-4 py-3 flex items-center justify-between">
              <span className="text-[12px] text-ink-text-soft">
                {fields.length} working place{fields.length === 1 ? '' : 's'} recorded
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => append({ designation: '', policeStation: '', district: '', fromDate: '', toDate: '' })}
              >
                <Plus className="w-[15px] h-[15px]" />
                Add Another Row
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-30 flex items-center justify-between p-4 bg-[#FFFDF7]/95 backdrop-blur-md border border-rule rounded-m shadow-soft">
          <button type="button" className="btn btn-secondary px-5" onClick={() => navigate('/officers')} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary px-6 shadow-sm" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Officer' : 'Save Officer'}
          </button>
        </div>
      </form>
    </div>
  );
}
