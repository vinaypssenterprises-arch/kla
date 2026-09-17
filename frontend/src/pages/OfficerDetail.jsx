import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, History } from 'lucide-react';

export default function OfficerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiFetch(`/officers/${id}`, {  })
      .then(res => res.json())
      .then(setOfficer)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Loading...</div>;
  if (notFound || !officer) return <div className="min-h-screen flex items-center justify-center text-ink-text-soft">Officer not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-[21px] font-serif font-semibold text-ink-text">{officer.name}</h2>
          <p className="text-[13.5px] text-ink-text-soft mt-1">{officer.designation} &middot; {officer.district?.name}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/officers')}>
            <ArrowLeft className="w-[15px] h-[15px]" />
            Back to Officers
          </button>
          {(localStorage.getItem('role') === 'admin' || officer.createdById === localStorage.getItem('userId')) && (
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/officers/${id}/edit`)}>
              <Pencil className="w-[15px] h-[15px]" />
              Edit Officer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 max-w-[900px]">
        {/* A. Officer Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">A.</span> Officer Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">District</div>
              <div className="text-ink-text mt-0.5">{officer.district?.name}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Officer Name</div>
              <div className="text-ink-text mt-0.5">{officer.name}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Designation</div>
              <div className="text-ink-text mt-0.5"><span className="stamp stamp-info">{officer.designation}</span></div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Mobile</div>
              <div className="text-ink-text mt-0.5 font-mono">{officer.mobile}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Reporting Date</div>
              <div className="text-ink-text mt-0.5">{formatDate(officer.reportingDate)}</div>
            </div>
          </div>
        </div>

        {/* B. Address Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">B.</span> Address Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Present Residence Address</div>
              <div className="text-ink-text mt-0.5">{officer.presentAddress}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-text-soft">Permanent Address</div>
              <div className="text-ink-text mt-0.5">{officer.permanentAddress}</div>
            </div>
          </div>
        </div>

        {/* C. Previous Working History */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">C.</span> Previous Working History
          </h4>
          {(!officer.previousPlaces || officer.previousPlaces.length === 0) ? (
            <p className="text-[13px] text-ink-text-faint italic">No previous working places recorded.</p>
          ) : (
            <div className="flex flex-col gap-0">
              {officer.previousPlaces.map((p, idx) => (
                <div key={p.id} className="flex items-start gap-3 py-3 border-b border-dashed border-parchment-3 last:border-b-0">
                  <div className="w-7 h-7 rounded-full bg-navy-stamp-bg text-navy-stamp flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[13.5px] text-ink-text">{p.place}</div>
                    <div className="text-[12px] text-ink-text-soft mt-0.5">
                      {p.fromYear || p.toYear ? `${p.fromYear || '—'} to ${p.toYear || '—'}` : 'Duration not specified'}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-ink-text-faint">#{idx + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* D. Remarks */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[10px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">D.</span> Remarks
          </h4>
          <p className="text-[13px] text-ink-text">{officer.remarks || <span className="text-ink-text-faint italic">No remarks recorded.</span>}</p>
        </div>

        {/* E. Audit Information */}
        <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 shadow-soft">
          <h4 className="text-[15px] text-ink-text mb-[18px] font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">E.</span> Audit Information
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
    </div>
  );
}
