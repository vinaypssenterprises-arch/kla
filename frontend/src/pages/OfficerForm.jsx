import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';
import SearchableSelect from '../components/ui/SearchableSelect';

const formSchema = z.object({
  districtId: z.string().min(1, 'District is required'),
  name: z.string().min(1, 'Officer name is required'),
  designation: z.string().min(1, 'Designation is required'),
  mobile: z.string().optional().refine(val => !val || /^[6-9]\d{9}$/.test(val), {
    message: 'Enter a valid 10-digit Indian mobile number'
  }),
  reportingDate: z.string().optional(),
  remarks: z.string().optional(),
  presentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  previousPlaces: z.array(
    z.object({
      place: z.string().optional(),
      fromYear: z.string().optional(),
      toYear: z.string().optional()
    })
  ).optional()
});

const todayStr = () => new Date().toISOString().slice(0, 10);
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

export default function OfficerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const [initialData, setInitialData] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const districtsPromise = apiFetch(`/districts`)
      .then(res => res.json())
      .then(data => setDistricts(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load districts', err));

    const designationsPromise = apiFetch(`/designations`)
      .then(res => res.json())
      .then(data => setDesignations(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(err => console.error('Failed to load designations', err));

    const officerPromise = isEdit
      ? apiFetch(`/officers/${id}`)
          .then(res => res.json())
          .then(setInitialData)
          .catch(() => setNotFound(true))
      : Promise.resolve();

    Promise.all([districtsPromise, designationsPromise, officerPromise]).finally(() => setLoading(false));
  }, [id, isEdit]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Loading...</div>;
  if (isEdit && notFound) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Officer not found.</div>;

  return <OfficerFormInner initialData={initialData} districts={districts} allDesignations={designations} />;
}

function OfficerFormInner({ initialData, districts, allDesignations = [] }) {
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
      mobile: initialData?.mobile || '',
      reportingDate: toDateInput(initialData?.reportingDate) || todayStr(),
      remarks: initialData?.remarks || '',
      presentAddress: initialData?.presentAddress || '',
      permanentAddress: initialData?.permanentAddress || '',
      previousPlaces: (initialData?.previousPlaces || []).map(p => ({
        place: p.place || '', fromYear: p.fromYear || '', toYear: p.toYear || ''
      }))
    } : {
      districtId: canSelectAnyDistrict ? '' : userDistrictId, 
      name: '', designation: '', mobile: '',
      reportingDate: todayStr(), remarks: '', presentAddress: '', permanentAddress: '',
      previousPlaces: [{ place: '', fromYear: '', toYear: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'previousPlaces' });

  const watchedDistrictId = watch('districtId');

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

  // Filter designations belonging to the currently selected district
  const designationOptions = useMemo(() => {
    if (!watchedDistrictId) return [];
    const matching = allDesignations.filter(d => d.districtId === watchedDistrictId);
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
    const payload = {
      ...data,
      remarks: data.remarks || null,
      previousPlaces: (data.previousPlaces || []).filter(p => p.place && p.place.trim())
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
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-[21px] font-serif font-semibold text-ink-text">{isEdit ? 'Edit Officer' : 'Add Officer'}</h2>
        <div className="flex items-center gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/officers')}>
            <ArrowLeft className="w-[15px] h-[15px]" />
            Back to Officers
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="w-[15px] h-[15px]" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Officer' : 'Save Officer'}
          </button>
        </div>
      </div>

      <form className="flex flex-col gap-5 max-w-[1400px]">
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold">Officer Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">District <span className="text-brick">*</span></label>
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
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Officer Name <span className="text-brick">*</span></label>
              <input type="text" className={`app-input ${errors.name ? 'input-error' : ''}`} placeholder="Full name" {...register('name')} />
              {errors.name && <span className="text-brick text-xs">{errors.name.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Designation <span className="text-brick">*</span></label>
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
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Mobile Number</label>
              <input type="text" className={`app-input ${errors.mobile ? 'input-error' : ''}`} placeholder="10-digit number" maxLength={10} {...register('mobile')} />
              {errors.mobile && <span className="text-brick text-xs">{errors.mobile.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Reporting Date</label>
              <input type="date" className={`app-input ${errors.reportingDate ? 'input-error' : ''}`} {...register('reportingDate')} />
              {errors.reportingDate && <span className="text-brick text-xs">{errors.reportingDate.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Remarks</label>
              <input type="text" className="app-input" placeholder="Any remarks or notes" {...register('remarks')} />
            </div>
          </div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold">Address Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Present Residence Address</label>
              <textarea className={`app-input ${errors.presentAddress ? 'input-error' : ''}`} rows={2} placeholder="Full present address" {...register('presentAddress')} />
              {errors.presentAddress && <span className="text-brick text-xs">{errors.presentAddress.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Permanent Address</label>
              <textarea className={`app-input ${errors.permanentAddress ? 'input-error' : ''}`} rows={2} placeholder="Full permanent address" {...register('permanentAddress')} />
              {errors.permanentAddress && <span className="text-brick text-xs">{errors.permanentAddress.message}</span>}
            </div>
          </div>
        </div>

        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold">Previous Working Places</h4>
          <div className="bg-parchment border border-dashed border-rule rounded-s p-4">
            {fields.length === 0 && <p className="text-[12.5px] text-ink-text-faint italic mb-3">No previous places added.</p>}
            <div className="flex flex-col gap-3 mb-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2.5 items-start">
                  <input
                    type="text"
                    className="app-input"
                    placeholder="Place / Designation (e.g. ASI, Sadashivanagara)"
                    {...register(`previousPlaces.${index}.place`)}
                  />
                  <input type="text" className="app-input" placeholder="From (e.g. 1995)" {...register(`previousPlaces.${index}.fromYear`)} />
                  <input type="text" className="app-input" placeholder="To (e.g. 2000)" {...register(`previousPlaces.${index}.toYear`)} />
                  <button
                    type="button"
                    className="w-11 h-[42px] flex items-center justify-center rounded-s bg-brick-bg text-brick hover:bg-brick hover:text-white transition-colors duration-150 flex-shrink-0"
                    title="Remove row"
                    onClick={() => remove(index)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => append({ place: '', fromYear: '', toYear: '' })}
            >
              <Plus className="w-[16px] h-[16px]" />
              Add Place
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/officers')}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="w-[15px] h-[15px]" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Officer' : 'Save Officer'}
          </button>
        </div>
      </form>
    </div>
  );
}
