import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, History, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import OfficerLifecycleModal from '../components/officers/OfficerLifecycleModal';

export default function OfficerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [officer, setOfficer] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);

  const loadOfficer = useCallback(() => {
    setLoading(true);
    apiFetch(`/officers/${id}`)
      .then(res => res.json())
      .then(setOfficer)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadOfficer();
    apiFetch('/districts')
      .then(res => res.json())
      .then(data => setDistricts(Array.isArray(data) ? data.filter(d => d.isActive) : []))
      .catch(() => {});
  }, [loadOfficer]);

  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';
  const userDistrictId = localStorage.getItem('districtId');
  const currentUserId = localStorage.getItem('userId');
  const canEdit = role === 'admin' || isHeadOffice || (userDistrictId && officer?.districtId === userDistrictId) || officer?.createdById === currentUserId;
  const isFilledPost = (officer?.workingStatus || 'Working') === 'Working' && officer?.name && officer?.name.trim().toLowerCase() !== 'vacant';

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Loading...</div>;
  if (notFound || !officer) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Officer not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">{officer.name || 'Vacant Post'}</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">{officer.designation} &middot; {officer.district?.name}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/officers')}>
            <ArrowLeft className="w-[15px] h-[15px]" />
            Back to Officers
          </button>
          {canEdit && isFilledPost && (
            <button
              type="button"
              className="btn btn-secondary border-brass/60 text-ink-text hover:bg-parchment"
              onClick={() => setLifecycleModalOpen(true)}
            >
              <ArrowRightLeft className="w-[15px] h-[15px] text-brass" />
              Transfer / Relieve
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/officers/${id}/edit`)}>
              <Pencil className="w-[15px] h-[15px]" />
              Edit Officer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 max-w-[900px]">
        {/* Pending Approval Banner */}
        {officer.pendingLifecycleRequest && (
          <div className="bg-[#FEF6E7] border border-[#F2C94C] rounded-m p-4 text-[13px] flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-[#9A6700] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-[#9A6700]">
                Pending Approval: {officer.pendingLifecycleRequest.details?.lifecycleType || officer.pendingLifecycleRequest.type} Request
              </div>
              <p className="text-ink-text-soft mt-0.5">
                Submitted by <strong>{officer.pendingLifecycleRequest.requestedByName || 'User'}</strong> on {formatDate(officer.pendingLifecycleRequest.createdAt)} (Order: <strong>{officer.pendingLifecycleRequest.details?.orderNumber || '—'}</strong>).
                {officer.pendingLifecycleRequest.details?.targetDistrictName && (
                  <span> Target: <strong>{officer.pendingLifecycleRequest.details?.targetDesignation}</strong> ({officer.pendingLifecycleRequest.details?.targetDistrictName}) {officer.pendingLifecycleRequest.details?.isSwap ? '(Mutual Swap)' : ''}.</span>
                )}
                <span className="block mt-1 font-medium text-amber-800 italic">Waiting for Administrator review and approval.</span>
              </p>
            </div>
          </div>
        )}
        {/* A. Officer Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">A.</span> Officer Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">District</div>
              <div className="text-ink-text mt-0.5">{officer.district?.name || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Officer Name</div>
              <div className="text-ink-text mt-0.5 font-semibold text-maroon">
                {officer.name && officer.name.trim() && officer.name.trim().toLowerCase() !== 'vacant' ? (
                  officer.name
                ) : (
                  <span className="text-ink-text-faint font-normal italic">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Designation</div>
              <div className="text-ink-text mt-0.5"><span className="stamp stamp-info">{officer.designation}</span></div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Working Status</div>
              <div className="text-ink-text mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold border tracking-wide ${
                    (officer.workingStatus || 'Working') === 'Working'
                      ? 'bg-[#EBF7EE] text-[#1E6935] border-[#BBE5C6]'
                      : 'bg-[#FEF6E7] text-[#9A6700] border-[#F2C94C]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (officer.workingStatus || 'Working') === 'Working' ? 'bg-[#1E6935]' : 'bg-[#E68A00]'
                    }`}
                  />
                  {officer.workingStatus || 'Working'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Govt (CUG) Mobile Number</div>
              <div className="text-ink-text mt-0.5 font-mono">{officer.mobile || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">KGID Number</div>
              <div className="text-ink-text mt-0.5 font-mono">{officer.kgidNumber || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Date of Joined to Department</div>
              <div className="text-ink-text mt-0.5">{formatDate(officer.dateOfJoiningDept)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Education and Qualification</div>
              <div className="text-ink-text mt-0.5">{officer.educationQualification || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Reporting Present Office Date</div>
              <div className="text-ink-text mt-0.5">{formatDate(officer.reportingDate)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Personal Mobile Number</div>
              <div className="text-ink-text mt-0.5 font-mono">{officer.personalMobile || '—'}</div>
            </div>
          </div>
        </div>

        {/* B. Training Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">B.</span> Training Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Training Place</div>
              <div className="text-ink-text mt-0.5">{officer.trainingPlace || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Training From Date</div>
              <div className="text-ink-text mt-0.5">{formatDate(officer.trainingFromDate)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Training To Date</div>
              <div className="text-ink-text mt-0.5">{formatDate(officer.trainingToDate)}</div>
            </div>
          </div>
        </div>

        {/* C. Address Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">C.</span> Address Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-[13px]">
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Native Place</div>
              <div className="text-ink-text mt-0.5">{officer.nativePlace || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Present Residence Address</div>
              <div className="text-ink-text mt-0.5">{officer.presentAddress || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Permanent Address</div>
              <div className="text-ink-text mt-0.5">{officer.permanentAddress || '—'}</div>
            </div>
          </div>
        </div>

        {/* D. Previous Working Places from Joining to Present */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">D.</span> Previous Working Places from Joining to Present
          </h4>
          {(!officer.previousPlaces || officer.previousPlaces.length === 0) ? (
            <p className="text-[13px] text-ink-text-faint italic">No previous working places recorded.</p>
          ) : (
            <div className="border border-rule rounded-s overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-[#F6F3EA] border-b border-rule text-ink-text-soft text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3 text-center w-14">Sl No</th>
                      <th className="py-2.5 px-3 text-left">Designation</th>
                      <th className="py-2.5 px-3 text-left">Police Station</th>
                      <th className="py-2.5 px-3 text-left">District</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">From Date</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">To Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/60">
                    {officer.previousPlaces.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-parchment/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-center text-ink-text-soft font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-ink-text">
                          {p.designation ? (
                            <span className="stamp stamp-info">{p.designation}</span>
                          ) : (
                            p.place || '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-ink-text">{p.policeStation || '—'}</td>
                        <td className="py-2.5 px-3 text-ink-text font-medium">{p.district || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-center text-ink-text-soft whitespace-nowrap">
                          {p.fromDate ? formatDate(p.fromDate) : (p.fromYear || '—')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-ink-text-soft whitespace-nowrap">
                          {p.toDate ? formatDate(p.toDate) : (p.toYear || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* E. Remarks */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[10px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">E.</span> Remarks
          </h4>
          <p className="text-[13px] text-ink-text">{officer.remarks || <span className="text-ink-text-faint italic">No remarks recorded.</span>}</p>
        </div>

        {/* F. Audit Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">F.</span> Audit Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Created By</div>
              <div className="text-ink-text mt-0.5">{officer.createdBy?.fullName || officer.createdBy?.email || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Created At</div>
              <div className="text-ink-text mt-0.5">{formatDateTime(officer.createdAt)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Updated By</div>
              <div className="text-ink-text mt-0.5">{officer.updatedBy?.fullName || officer.updatedBy?.email || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Updated At</div>
              <div className="text-ink-text mt-0.5">{formatDateTime(officer.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Action Modal */}
      <OfficerLifecycleModal
        open={lifecycleModalOpen}
        onClose={() => setLifecycleModalOpen(false)}
        officer={officer}
        districts={districts}
        onSuccess={loadOfficer}
      />
    </div>
  );
}
