import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Plus, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import SearchableSelect from './ui/SearchableSelect';
import { useToast } from './ui/ToastProvider';

const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN') : '';

export default function FormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [initialData, setInitialData] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const handleAuthError = (res) => {
      if (res.status === 401) {
        localStorage.clear();
        navigate('/login');
        throw new Error('Unauthorized');
      }
      return res;
    };

    const districtsPromise = apiFetch(`/districts`, {  })
      .then(res => res.json())
      .then(data => setDistricts(data.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load districts', err));

    const petitionPromise = isEdit
      ? apiFetch(`/petitions/${id}`, {  })
          .then(res => res.json())
          .then(data => setInitialData(data))
          .catch(() => setNotFound(true))
      : Promise.resolve(null);

    const departmentsPromise = apiFetch(`/master-items/department`, {  })
      .then(res => res.json())
      .then(data => setDepartments(data.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load departments', err));

    const subDepartmentsPromise = apiFetch(`/master-items/subDepartment`, {  })
      .then(res => res.json())
      .then(data => setSubDepartments(data.filter(d => d.isActive)))
      .catch(err => console.error('Failed to load subDepartments', err));

    Promise.all([districtsPromise, departmentsPromise, subDepartmentsPromise, petitionPromise]).finally(() => setLoading(false));
  }, [id, isEdit]);

  if (loading) return (
    <div className="space-y-5 animate-pulse p-1">
      <div className="h-7 skeleton-line w-48 rounded-lg" />
      <div className="h-4 skeleton-line w-72 rounded-lg" />
      <div className="h-[400px] skeleton-card rounded-xl mt-6" />
    </div>
  );
  if (isEdit && notFound) return <div className="min-h-[300px] flex items-center justify-center text-ink-text-soft">Petition not found.</div>;

  return <PetitionWorkflow initialData={initialData} districts={districts} departments={departments} subDepartments={subDepartments} />;
}

function PetitionWorkflow({ initialData, districts, departments, subDepartments }) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const isEdit = !!initialData;
  const currentUserId = localStorage.getItem('userId');
  
  // Status and Roles
  const status = initialData?.status || 'DRAFT';
  const isCreator = isEdit ? initialData.createdById === currentUserId : true;
  const isSupervisor = isEdit ? initialData.createdBy?.supervisorUserId === currentUserId : false;
  const isAdmin = localStorage.getItem('role') === 'admin';
  const isAdminNewPetition = isAdmin && !isEdit;

  const { register, control, watch, setValue, getValues, formState: { isSubmitting } } = useForm({
    defaultValues: isEdit ? {
      district: initialData.district || '',
      petitionNo: initialData.petitionNo || '',
      petitionerName: initialData.petitionerName || '',
      petitionerAddress: initialData.petitionerAddress || '',
      respondents: (initialData.respondents || []).map(r => ({
        id: r.id, name: r.name || '', designation: r.designation || '', office: r.office || '', department: r.department || '', subDepartment: r.subDepartment || '',
        caDesignation: r.caDesignation || '', caDepartment: r.caDepartment || '', caSubDepartment: r.caSubDepartment || '', caPlace: r.caPlace || '',
        permissionStatus: r.permissionStatus || '', permissionSentDate: toDateInput(r.permissionSentDate),
        permissionReceivedFromCA: toDateInput(r.permissionReceivedFromCA), caSentToUnit: toDateInput(r.caSentToUnit),
      })),
      proposalStatus: initialData.proposalStatus || '',
      proposalSentDate: toDateInput(initialData.proposalSentDate),
      peNo: initialData.peNo || '',
      peRegDate: toDateInput(initialData.peRegDate),
      peReportSentDate: toDateInput(initialData.peReportSentDate),
      peStatus: initialData.peStatus || '',
      sirEo: initialData.sirEo || '',
    } : {
      district: isAdminNewPetition ? '' : (localStorage.getItem('isHeadOffice') !== '1' ? (localStorage.getItem('districtName') || '') : ''), 
      petitionNo: '', petitionerName: '', petitionerAddress: '', respondents: [], sirEo: '',
      proposalStatus: '', proposalSentDate: '',
      peNo: '', peRegDate: '', peReportSentDate: '', peStatus: '',
    }
  });

  const { fields: respondentFields, append: appendRespondent, remove: removeRespondent } = useFieldArray({ control, name: "respondents" });
  const [newResp, setNewResp] = useState({ name: '', designation: '', office: '', department: '', subDepartment: '' });
  const [actionRemarks, setActionRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddRespondent = () => {
    if (newResp.name) {
      appendRespondent({ ...newResp, caDesignation: '', caDepartment: '', caSubDepartment: '', caPlace: '', permissionStatus: '', permissionSentDate: '', permissionReceivedFromCA: '', caSentToUnit: '' }, { shouldFocus: false });
      setNewResp({ name: '', designation: '', office: '', department: '', subDepartment: '' });
    }
  };

  const getFilteredSubDepts = (deptName) => {
    if (!deptName) return [];
    const deptId = departments.find(d => d.name === deptName)?.id;
    return subDepartments.filter(sd => sd.parentId === deptId);
  };

  // SearchableSelect option lists. `withLegacyOption` keeps a previously-saved value
  // selectable even after it's been renamed/deactivated in the master list.
  const withLegacyOption = (opts, legacyValue) =>
    legacyValue && !opts.some(o => o.value === legacyValue) ? [...opts, { value: legacyValue, label: legacyValue }] : opts;

  const departmentOptions = departments.map(d => ({ value: d.name, label: d.name }));
  const getSubDeptOptions = (deptName) => getFilteredSubDepts(deptName).map(d => ({ value: d.name, label: d.name }));
  const districtOptions = withLegacyOption(
    districts.map(d => ({ value: d.name, label: d.name })),
    isEdit ? initialData.district : (localStorage.getItem('isHeadOffice') !== '1' ? localStorage.getItem('districtName') : null)
  );

  const currentRespondents = watch('respondents');

  const doAction = async (actionType) => {
    setErrorMsg('');
    const data = getValues();
    const token = localStorage.getItem('token');
    
    // Validation before specific actions
    if (actionType === 'CREATE_SUBMIT' || actionType === 'RESUBMIT' || actionType === 'ADMIN_CREATE_FULL') {
      if (!data.district || !data.petitionNo || !data.petitionerName) return setErrorMsg('Petition Details are required.');
      if (data.respondents.length === 0) return setErrorMsg('At least one respondent is required.');
    }
    if (actionType === 'RETURN_17A' && !actionRemarks) return setErrorMsg('Remarks are required to return.');
    if (actionType === 'SUBMIT_CA') {
      for (const r of data.respondents) {
        if (!r.caDesignation || !r.caDepartment || !r.caSubDepartment || !r.caPlace) return setErrorMsg('All CA fields must be filled for all respondents.');
      }
    }

    try {
      if (actionType === 'ADMIN_CREATE_FULL') {
        const res = await apiFetch(`/petitions`, {
          method: 'POST',
          body: JSON.stringify({ ...data, adminFullCreate: true })
        });
        if (res.ok) {
          showSuccess('Petition created successfully.');
          navigate('/register');
        } else { const e = await res.json(); setErrorMsg(e.error || 'Failed to create'); }
      } else if (actionType === 'CREATE_SUBMIT') {
        const res = await apiFetch(`/petitions`, {
          method: 'POST',
          body: JSON.stringify({
            district: data.district, petitionNo: data.petitionNo, petitionerName: data.petitionerName, petitionerAddress: data.petitionerAddress,
            respondents: data.respondents
          })
        });
        if (res.ok) {
          showSuccess('Petition submitted successfully.');
          navigate('/register');
        } else { const e = await res.json(); setErrorMsg(e.error || 'Failed to create'); }
      } else {
        const res = await apiFetch(`/petitions/${initialData.id}/action`, {
          method: 'POST',
          body: JSON.stringify({ action: actionType, payload: data, remarks: actionRemarks })
        });
        if (res.ok) {
          showSuccess('Action applied successfully.');
          window.location.reload();
        } else {
          const e = await res.json(); setErrorMsg(e.error || 'Failed to process action');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error occurred.');
    }
  };

  // Section Visibilities and Editability
  // isAdminNewPetition: admin creating new petition → all sections visible & editable in one form
  const canEditIandII = isAdminNewPetition || status === 'DRAFT' || (status === '17A_RETURNED' && isCreator);
  const showIII = isAdminNewPetition || (status !== 'DRAFT' && status !== '17A_RETURNED');
  const canEditIII = (status === 'SUBMITTED_TO_SUPERVISOR') && (isSupervisor || isAdmin);

  const showIV = isAdminNewPetition || ['17A_ACCEPTED', 'CA_SUBMITTED', '17A_PERMISSION_PENDING', '17A_PERMISSION_COMPLETED', 'PRELIMINARY_ENQUIRY_SUBMITTED'].includes(status);
  const canEditIV = isAdminNewPetition || ((status === '17A_ACCEPTED') && (isSupervisor || isAdmin));

  const showV = isAdminNewPetition || ['CA_SUBMITTED', '17A_PERMISSION_PENDING', '17A_PERMISSION_COMPLETED', 'PRELIMINARY_ENQUIRY_SUBMITTED'].includes(status);
  const canEditV = isAdminNewPetition || ((status === 'CA_SUBMITTED' || status === '17A_PERMISSION_PENDING') && (isSupervisor || isAdmin));

  const showVI = isAdminNewPetition || ['17A_PERMISSION_COMPLETED', 'PRELIMINARY_ENQUIRY_SUBMITTED'].includes(status);
  const canEditVI = isAdminNewPetition || ((status === '17A_PERMISSION_COMPLETED') && (isCreator || isAdmin));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">{isEdit ? `Petition: ${initialData.petitionNo}` : 'New Petition'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="stamp stamp-neutral">{status.replace(/_/g, ' ')}</span>
            {isEdit && <span className="text-[12px] text-ink-text-faint">Created by {initialData.createdBy?.fullName || 'User'}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/register')}>
          <ArrowLeft className="w-[15px] h-[15px]" /> Back
        </button>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 bg-brick-bg border border-brick-soft rounded-m flex items-center gap-2.5 text-brick text-[13px] font-semibold">
          <AlertCircle className="w-[18px] h-[18px]" /> {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-5 max-w-[1400px]">
        {/* I. Petition Details */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">I.</span> Petition Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">District</label>
              <Controller
                name="district"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={districtOptions}
                    label="Select District"
                    placeholder="Select district"
                    disabled={!canEditIandII || (!isAdminNewPetition && localStorage.getItem('isHeadOffice') !== '1')}
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Petition No.</label>
              <input type="text" className="app-input" {...register('petitionNo')} disabled={!canEditIandII} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Name of the Petitioner</label>
              <input type="text" className="app-input" {...register('petitionerName')} disabled={!canEditIandII} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[12.5px] font-semibold text-ink-text-soft">Address of the Petitioner</label>
              <input type="text" className="app-input" {...register('petitionerAddress')} disabled={!canEditIandII} />
            </div>
          </div>
        </div>

        {/* II. Respondent Details */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">II.</span> Respondent Details
          </h4>
          {respondentFields.length === 0 ? (
            <div className="text-[12.5px] text-ink-text-faint italic py-2 mb-3.5">No respondents added.</div>
          ) : (
            <div className="border border-parchment-3 rounded-lg overflow-hidden mb-3.5">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-9">#</th>
                      <th>Respondent</th>
                      <th>Office</th>
                      <th>Department</th>
                      <th>Sub Department</th>
                      {canEditIandII && <th className="w-9"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {respondentFields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="font-mono text-ink-text-faint">{index + 1}</td>
                        <td>
                          <div className="font-semibold text-ink-text whitespace-nowrap">{field.name}</div>
                          {field.designation && <div className="text-[11.5px] text-ink-text-soft whitespace-nowrap">{field.designation}</div>}
                        </td>
                        <td className="max-w-[160px]"><span className="block truncate" title={field.office}>{field.office || '—'}</span></td>
                        <td className="max-w-[200px]"><span className="block truncate" title={field.department}>{field.department || '—'}</span></td>
                        <td className="max-w-[240px]"><span className="block truncate" title={field.subDepartment}>{field.subDepartment || '—'}</span></td>
                        {canEditIandII && (
                          <td>
                            <button type="button" className="icon-btn hover:!bg-brick-bg hover:!text-brick" title="Remove respondent" onClick={() => removeRespondent(index)}>
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {canEditIandII && (
            <div className="mt-4 pt-4 border-t border-dashed border-rule">
              <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-ink-text-faint mb-3">Add a Respondent</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-ink-text-soft">Respondent Name</label>
                  <input type="text" className="app-input" placeholder="Respondent name" value={newResp.name} onChange={e => setNewResp({ ...newResp, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-ink-text-soft">Designation</label>
                  <input type="text" className="app-input" placeholder="Designation" value={newResp.designation} onChange={e => setNewResp({ ...newResp, designation: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-ink-text-soft">Office</label>
                  <input type="text" className="app-input" placeholder="Office" value={newResp.office} onChange={e => setNewResp({ ...newResp, office: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-ink-text-soft">Department</label>
                  <SearchableSelect
                    value={newResp.department}
                    onChange={v => setNewResp({ ...newResp, department: v, subDepartment: '' })}
                    options={departmentOptions}
                    label="Select Department"
                    placeholder="Select"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-ink-text-soft">Sub Department</label>
                  <SearchableSelect
                    value={newResp.subDepartment}
                    onChange={v => setNewResp({ ...newResp, subDepartment: v })}
                    options={getSubDeptOptions(newResp.department)}
                    label="Select Sub Department"
                    placeholder="Select"
                  />
                </div>
                <button type="button" className="btn btn-secondary w-full" onClick={handleAddRespondent}>
                  <Plus className="w-[18px] h-[18px]" /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* III. 17-A Proposal */}
        {showIII && (
          <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
            <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-brass font-semibold">III.</span> 17-A Proposal
            </h4>
            {isAdminNewPetition ? (
              /* Admin creating new petition: simple data-entry (no action buttons) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Proposal Status</label>
                  <select className="app-input" {...register('proposalStatus')}>
                    <option value="">Select status</option>
                    <option value="Accept">Accept</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Date Sent to CA</label>
                  <input type="date" className="app-input" {...register('proposalSentDate')} />
                </div>
              </div>
            ) : canEditIII ? (
              <div className="p-4 bg-parchment border border-dashed border-rule rounded-s">
                <p className="text-[13px] text-ink-text-soft mb-4">Review the petition details above and choose an action.</p>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Remarks (Required for Return)</label>
                  <textarea className="app-input" rows={2} value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button type="button" className="btn bg-brick-bg text-brick border border-brick-soft hover:bg-brick hover:text-white" onClick={() => doAction('RETURN_17A')} disabled={isSubmitting}>
                    Return with Remarks
                  </button>
                  <div className="flex items-center gap-2.5 ml-auto">
                    <span className="text-[12px] text-ink-text-faint">Date sent to CA:</span>
                    <input type="date" className="app-input py-[5px] text-[12px]" {...register('proposalSentDate')} />
                    <button type="button" className="btn btn-primary" onClick={() => doAction('ACCEPT_17A')} disabled={isSubmitting}>
                      <CheckCircle2 className="w-4 h-4" /> Accept Proposal
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Status</label>
                  <div className="text-[13.5px] font-semibold text-ink-text">{initialData.proposalStatus || '—'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">Sent to CA on</label>
                  <div className="text-[13.5px] text-ink-text">{initialData.proposalSentDate ? new Date(initialData.proposalSentDate).toLocaleDateString('en-IN') : '—'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* IV. Competent Authority (Per Respondent) */}
        {showIV && (
          <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
            <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-brass font-semibold">IV.</span> Competent Authority (Per Respondent)
            </h4>
            {respondentFields.map((field, index) => (
              <div key={field.id} className="p-4 border border-rule rounded-lg mb-3 bg-parchment last:mb-0">
                <div className="font-semibold text-[14px] text-maroon mb-3 border-b border-dashed border-rule pb-2">
                  {field.name} <span className="text-[12px] font-normal text-ink-text-soft ml-2">({field.designation})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">CA Designation</label>
                    <input type="text" className="app-input" {...register(`respondents.${index}.caDesignation`)} disabled={!canEditIV} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">CA Department</label>
                    <Controller
                      name={`respondents.${index}.caDepartment`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value}
                          onChange={(v) => { field.onChange(v); setValue(`respondents.${index}.caSubDepartment`, ''); }}
                          options={withLegacyOption(departmentOptions, initialData?.respondents?.[index]?.caDepartment)}
                          label="Select CA Department"
                          placeholder="Select"
                          disabled={!canEditIV}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">CA Sub Department</label>
                    <Controller
                      name={`respondents.${index}.caSubDepartment`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={withLegacyOption(getSubDeptOptions(currentRespondents?.[index]?.caDepartment), initialData?.respondents?.[index]?.caSubDepartment)}
                          label="Select CA Sub Department"
                          placeholder="Select"
                          disabled={!canEditIV}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">CA Office</label>
                    <input type="text" className="app-input" {...register(`respondents.${index}.caPlace`)} disabled={!canEditIV} />
                  </div>
                </div>
              </div>
            ))}
            {canEditIV && (
              <div className="mt-4 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={() => doAction('SUBMIT_CA')} disabled={isSubmitting}>
                  <Save className="w-4 h-4" /> Submit Competent Authority
                </button>
              </div>
            )}
          </div>
        )}

        {/* V. 17-A Permission */}
        {showV && (
          <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
            <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-brass font-semibold">V.</span> 17-A Permission (Per Respondent)
            </h4>
            <div className="flex flex-col gap-3">
              {respondentFields.map((field, index) => (
                <div key={field.id} className="py-3 border-b border-dashed border-parchment-3 last:border-b-0">
                  <div className="font-semibold text-[14px] text-ink-text mb-3">{field.name}</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-ink-text-soft">Status</label>
                      <select className="app-input" {...register(`respondents.${index}.permissionStatus`)} disabled={!canEditV}>
                        <option value="">Status</option>
                        <option value="Obtain">Obtain</option>
                        <option value="Reject">Reject</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-ink-text-soft">Sent Date</label>
                      <input type="date" className="app-input" title="Permission Sent Date" {...register(`respondents.${index}.permissionSentDate`)} disabled={!canEditV} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-ink-text-soft">PERMISSION RECEIVED FROM CA</label>
                      <input type="date" className="app-input" title="Permission Received from CA" {...register(`respondents.${index}.permissionReceivedFromCA`)} disabled={!canEditV} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-semibold text-ink-text-soft">CA SENT TO UNIT</label>
                      <input type="date" className="app-input" title="CA Sent to Unit" {...register(`respondents.${index}.caSentToUnit`)} disabled={!canEditV} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {canEditV && (
              <div className="mt-4 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={() => doAction('SUBMIT_PERMISSION')} disabled={isSubmitting}>
                  <Save className="w-4 h-4" /> Save Permissions
                </button>
              </div>
            )}
          </div>
        )}

        {/* VI. Preliminary Enquiry */}
        {showVI && (
          <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
            <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
              <span className="font-mono text-[13px] text-brass font-semibold">VI.</span> Preliminary Enquiry
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">PE No</label>
                <input type="text" className="app-input" {...register('peNo')} disabled={!canEditVI} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">PE Status</label>
                <select className="app-input" {...register('peStatus')} disabled={!canEditVI}>
                  <option value="">Select status</option>
                  <option value="Register FIR">Register FIR</option>
                  <option value="Recommended to DE">Recommended to DE</option>
                  <option value="Close">Close</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">Date of PE Registration</label>
                <input type="date" className="app-input" {...register('peRegDate')} disabled={!canEditVI} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">Date of PE report sent to HQ</label>
                <input type="date" className="app-input" {...register('peReportSentDate')} disabled={!canEditVI} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">PE EO</label>
                <input type="text" className="app-input" {...register('sirEo')} disabled={!canEditVI} />
              </div>
            </div>
            {canEditVI && (
              <div className="mt-5 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={() => doAction('SUBMIT_PE')} disabled={isSubmitting}>
                  <Save className="w-4 h-4" /> Submit Preliminary Enquiry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit History */}
      {isEdit && initialData.history && initialData.history.length > 0 && (
        <div className="max-w-[1400px] mt-10">
          <h3 className="text-[16px] font-serif font-semibold text-ink mb-5 flex items-center gap-2">
            <Clock className="w-[18px] h-[18px] text-brass" /> Workflow History
          </h3>
          <div className="flex flex-col gap-3 relative before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-rule">
            {initialData.history.map((h, i) => (
              <div key={h.id} className="relative pl-10">
                <div className="absolute left-[11px] top-1 w-[9px] h-[9px] rounded-full bg-brass ring-4 ring-[#F9F7F1]"></div>
                <div className="bg-parchment border border-parchment-3 rounded-lg p-3.5 shadow-sm">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <span className="font-semibold text-[13.5px] text-ink">{h.toStatus.replace(/_/g, ' ')}</span>
                      <span className="text-[12px] text-ink-text-soft ml-2">by {h.actionBy?.fullName || 'System'}</span>
                    </div>
                    <div className="text-[11.5px] font-mono text-ink-text-faint">{formatDateTime(h.createdAt)}</div>
                  </div>
                  {h.remarks && (
                    <div className="text-[13px] text-ink-text italic border-l-2 border-brass/40 pl-2.5 mt-2 py-0.5">"{h.remarks}"</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions for Draft/Return — sticky within the content column so it always
          lines up with the sidebar's current width/collapsed state instead of a hardcoded pixel offset */}
      {(isAdminNewPetition || status === 'DRAFT' || status === '17A_RETURNED') && canEditIandII && (
        <div className="sticky bottom-0 -mx-5 lg:-mx-7 px-5 lg:px-7 mt-6 bg-[#FFFDF7]/90 backdrop-blur-md border-t border-rule py-4 flex justify-end gap-3 z-40">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/register')}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => doAction(
              isAdminNewPetition ? 'ADMIN_CREATE_FULL'
              : status === 'DRAFT' ? 'CREATE_SUBMIT'
              : 'RESUBMIT'
            )}
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4" />
            {isAdminNewPetition ? 'Create Petition' : status === 'DRAFT' ? 'Submit to Supervisor' : 'Resubmit Petition'}
          </button>
        </div>
      )}
    </div>
  );
}
