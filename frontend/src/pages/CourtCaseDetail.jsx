import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, Landmark, Gavel, Scale, CheckCircle2,
  Users, Building2, Calendar, FileText, UserCheck, Shield, BookOpen
} from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastProvider';
import { apiFetch } from '../lib/api';
import {
  STATUS_META, statusOf, daysBetween, formatDuration, formatCaseDate
} from '../lib/courtCases';

const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function Item({ label, children, mono, fullWidth }) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-ink-text-soft">{label}</div>
      <div className={`text-ink-text mt-0.5 text-[14px] font-semibold ${mono ? 'font-mono font-bold' : ''}`}>
        {children || <span className="text-ink-text-faint font-normal">—</span>}
      </div>
    </div>
  );
}

function Section({ numeral, title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-[#FFFDF7] border border-rule rounded-m p-6 lg:p-7 shadow-soft w-full">
      <div className="flex items-start gap-3 mb-5">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#E8EEF9] border border-[#CBD8EF] flex items-center justify-center text-[#000E89] flex-shrink-0 mt-0.5 shadow-2xs">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <h4 className="text-[16.5px] text-ink-text font-serif font-semibold flex items-baseline gap-2">
            <span className="font-mono text-[13px] text-brass font-semibold">{numeral}.</span> {title}
          </h4>
          {subtitle && <p className="text-[12.5px] text-ink-text-faint mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function CourtCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [courtCase, setCourtCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch(`/court-cases/${id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setCourtCase)
      .catch(() => setCourtCase(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-[300px] flex items-center justify-center text-ink-text-soft">Loading court case...</div>;
  if (!courtCase) return <div className="min-h-[300px] flex items-center justify-center text-ink-text-soft">Court case not found.</div>;

  const c = courtCase;
  const status = statusOf(c.hcCourtOrders || c.hcCaseStatus);
  const canEdit = localStorage.getItem('role') === 'admin' || c.createdById === localStorage.getItem('userId');
  const stayDate = c.hcStayDate || c.stayDate;
  const stayDays = status === 'Pending' && stayDate ? daysBetween(stayDate) : null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/court-cases/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete court case');
      }
      showSuccess('Court case deleted.');
      navigate('/court-cases');
    } catch (err) {
      showError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/court-cases')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-text-soft hover:text-ink-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Court Cases
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[23px] font-serif font-bold text-ink-text">
              Cr. No. {c.crimeNo}
            </h2>
            {c.caseStage && (
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#E8EEF9] text-[#000E89] border border-[#CBD8EF]">
                {c.caseStage}
              </span>
            )}
            <span className={`stamp ${STATUS_META[status].stamp}`}>
              {c.hcCourtOrders || STATUS_META[status].label}
            </span>
          </div>
          <p className="text-[13.5px] text-ink-text-soft mt-1">
            {c.district?.name}
            {c.caseType && <> · <span className="font-semibold">{c.caseType}</span></>}
            {c.courtName && <> · {c.courtName}</>}
            {c.hcBench && <> · High Court {c.hcBench} Bench</>}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && (
            <>
              <button
                type="button"
                className="btn btn-secondary hover:!text-brick"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-[15px] h-[15px]" /> Delete Case
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`/court-cases/${c.id}/edit`)}
              >
                <Pencil className="w-[15px] h-[15px]" /> Edit Case
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* SECTION I: Case & FIR Details */}
        <Section numeral="I" title="Case & FIR Details" icon={Landmark}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <Item label="District">{c.district?.name}</Item>
            <Item label="Cr. No." mono>{c.crimeNo}</Item>
            <Item label="Complainant Name">{c.complainantName}</Item>
            <Item label="Date of Registration FIR">{formatCaseDate(c.firRegDate)}</Item>
            <Item label="Type of Case">{c.caseType}</Item>
            <Item label="Court Name">{c.courtName}</Item>
            <Item label="Name of the Spl PP">{c.sppName}</Item>
            <Item label="Stage of the Case">
              {c.caseStage ? (
                <span className="font-bold text-[#000E89]">{c.caseStage}</span>
              ) : null}
            </Item>
            <Item label="CC No" mono>{c.ccNo}</Item>
            <Item label="IO / Holding IO">{c.ioName}</Item>
          </div>
        </Section>

        {/* SECTION II: Act & Section Details */}
        <Section numeral="II" title="Act & Section Details" icon={BookOpen}>
          {(c.actSections && c.actSections.length > 0) || c.act || c.section || c.sectionOfLaw ? (
            <div className="overflow-x-auto rounded-xl border border-rule/70 shadow-2xs">
              <table className="w-full border-collapse bg-white table-fixed">
                <thead>
                  <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12 text-center">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[55%]">
                      Act
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-[40%]">
                      Section
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAD9]">
                  {(c.actSections && c.actSections.length > 0) ? (
                    c.actSections.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#F9F6EE]/60 transition-colors">
                        <td className="py-2.5 px-3 text-[12px] font-mono text-ink-text-faint text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] font-semibold text-ink-text">
                          {item.act || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-ink-text-soft font-mono">
                          {item.section || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-[#F9F6EE]/60 transition-colors">
                      <td className="py-2.5 px-3 text-[12px] font-mono text-ink-text-faint text-center">1</td>
                      <td className="py-2.5 px-3 text-[13px] font-semibold text-ink-text">{c.act || '—'}</td>
                      <td className="py-2.5 px-3 text-[13px] text-ink-text-soft font-mono">{c.section || c.sectionOfLaw || '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-[13px] text-ink-text-faint italic bg-white rounded-lg border border-dashed border-rule">
              No Acts and Sections recorded for this case.
            </div>
          )}
        </Section>

        {/* SECTION III: Accused Government Officials (AGO Details) */}
        <Section numeral="III" title="AGO Details (Accused Government Officials)" icon={Users}>
          {c.agos && c.agos.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-rule/70">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[#F8F5EE] border-b border-[#E3DAC4]">
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft w-12 text-center">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Name of the AGO
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      AGO Designation
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Department
                    </th>
                    <th className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-text-soft">
                      Sub Department
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAD9]">
                  {c.agos.map((ago, idx) => (
                    <tr key={ago.id || idx} className="hover:bg-[#F9F6EE]/60 transition-colors">
                      <td className="py-2.5 px-3 text-[12px] font-mono text-ink-text-faint text-center">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] font-semibold text-ink-text">
                        {ago.name || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-ink-text-soft">
                        {ago.designation || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-ink-text-soft">
                        {ago.department || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-ink-text-soft">
                        {ago.subDepartment || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-[13px] text-ink-text-faint italic bg-white rounded-lg border border-dashed border-rule">
              No Accused Government Officials recorded for this case.
            </div>
          )}
        </Section>

        {/* SECTION IV: Hon'ble High Court — Stay Details */}
        <Section numeral="IV" title="Hon'ble High Court — Stay Details" icon={Scale}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <Item label="High Court Bench">{c.hcBench}</Item>
            <Item label="Court Hall" mono>{c.hcCourtHall}</Item>
            <Item label="Petition Type">{c.hcPetitionType}</Item>
            <Item label="Petition No." mono>{c.hcPetitionNo || c.wpCrlpNo}</Item>
            <Item label="Date of Petition">{formatCaseDate(c.hcPetitionDate)}</Item>
            <Item label="Date of Stay">{formatCaseDate(stayDate)}</Item>
            <Item label="Stay Type">{c.hcStayType || c.stayType}</Item>
            <Item label="Info Given to IO by Counsel">{formatCaseDate(c.hcCounselInformedDate || c.sppInformedDate)}</Item>
            <Item label="Petitioner Name">{c.hcPetitionerName}</Item>
            <Item label="Respondents">{c.hcRespondents}</Item>
            <Item label="Date of Parawise remarks by IO">{formatCaseDate(c.hcParawiseRemarksDate)}</Item>
            <Item label="Next Hearing Date">{formatCaseDate(c.hcNextHearingDate)}</Item>
            <Item label="Orders of the Court">
              {c.hcCourtOrders || c.hcCaseStatus ? (
                <span className={`stamp ${STATUS_META[status].stamp}`}>
                  {c.hcCourtOrders || c.hcCaseStatus}
                </span>
              ) : (
                <span className="text-ink-text-soft">Pending / In Force</span>
              )}
            </Item>
            <Item label="Name of the Counsel">{c.hcCounselName}</Item>
            <Item label="Intimation to CLC by Counsel">{formatCaseDate(c.hcClcIntimationDate)}</Item>
            <Item label="Opinion of CLC">
              {c.hcClcOpinion ? (
                <span className={`font-bold ${c.hcClcOpinion === 'Fit' ? 'text-forest' : 'text-brick'}`}>
                  {c.hcClcOpinion}
                </span>
              ) : null}
            </Item>
            <Item label="Opinion Date">{formatCaseDate(c.hcClcOpinionDate)}</Item>
          </div>
          {stayDays !== null && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12.5px] font-semibold text-amber-900 inline-flex items-center gap-2">
              Stay in force for {formatDuration(stayDays)} (since {formatCaseDate(stayDate)}).
            </div>
          )}
        </Section>

        {/* SECTION V: Hon'ble Supreme Court Detail */}
        <Section numeral="V" title="Hon'ble Supreme Court Detail" icon={Gavel}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <Item label="Petition Type">{c.scPetitionType}</Item>
            <Item label="Petition No. / Diary No." mono>{c.scPetitionNo || c.slpNo}</Item>
            <Item label="Date of Petition">{formatCaseDate(c.scPetitionDate)}</Item>
            <Item label="Petitioner Name">{c.scPetitionerName}</Item>
            <Item label="Respondents">{c.scRespondents}</Item>
            <Item label="Hearing Date">{formatCaseDate(c.scHearingDate)}</Item>
            <Item label="Orders of the Court">{c.scCourtOrders || c.scCaseStatus}</Item>
            <Item label="Name of the Counsel">{c.scCounselName}</Item>
          </div>
        </Section>

        {/* SECTION VI: Audit Information */}
        <Section numeral="VI" title="Audit Information" icon={Calendar}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
            <Item label="Created By">{c.createdBy?.fullName || c.createdBy?.email}</Item>
            <Item label="Created At">{formatDateTime(c.createdAt)}</Item>
            <Item label="Updated By">{c.updatedBy?.fullName || c.updatedBy?.email}</Item>
            <Item label="Updated At">{formatDateTime(c.updatedAt)}</Item>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Court Case?"
        message={`Are you sure you want to delete Cr. No. ${c.crimeNo}? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
