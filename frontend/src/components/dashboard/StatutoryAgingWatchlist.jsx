import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ArrowUpRight, ShieldAlert, CheckCircle } from 'lucide-react';

export default function StatutoryAgingWatchlist({ watchlist = [] }) {
  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="bg-[#FFFDF7] border border-rule/60 rounded-xl p-6 shadow-soft text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h4 className="font-serif font-bold text-ink-text text-base mb-1">
          No Statutory Delays Detected
        </h4>
        <p className="text-xs text-ink-text-soft max-w-md mx-auto">
          All pending Section 17-A Competent Authority permission requests are within standard statutory turnaround times.
        </p>
      </div>
    );
  }

  const criticalCount = watchlist.filter(w => w.urgency === 'critical').length;
  const warningCount = watchlist.filter(w => w.urgency === 'warning').length;
  const obtainedCount = watchlist.filter(w => w.permissionStatus === 'Obtained').length;
  const pendingCount = watchlist.filter(w => w.permissionStatus !== 'Obtained').length;

  return (
    <div id="statutory-watchlist" className="bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-rule/30">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brass" />
            <h3 className="text-base font-serif font-bold text-ink-text">
              Statutory 17-A Competent Authority (CA) Sanction Status Tracker
            </h3>
          </div>
          <p className="text-[12px] text-ink-text-soft mt-0.5">
            Active status and statutory elapsed time for all accused public servants on record.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {obtainedCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              {obtainedCount} Sanctioned
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} Awaiting Decision
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalCount} Critical (&gt;60d)
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-xs font-mono text-ink-text-soft bg-parchment-2 border border-rule/40">
            {watchlist.length} Total Public Servants
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-rule/40 text-[11px] font-semibold text-[#6E6248] uppercase tracking-wider bg-parchment-2/40">
              <th className="py-2.5 px-3">Petition No.</th>
              <th className="py-2.5 px-3">Accused Respondent</th>
              <th className="py-2.5 px-3">Department & Office</th>
              <th className="py-2.5 px-3">Competent Authority (CA)</th>
              <th className="py-2.5 px-3">Date Dispatched</th>
              <th className="py-2.5 px-3 text-center">Days Elapsed</th>
              <th className="py-2.5 px-3 text-center">Statutory Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/20 font-sans">
            {watchlist.map((item) => {
              const isCritical = item.urgency === 'critical';
              const isWarning = item.urgency === 'warning';
              
              const rowBg = isCritical 
                ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                : isWarning 
                ? 'bg-amber-50/30 hover:bg-amber-50/60' 
                : 'hover:bg-white/80';

              const formattedDate = item.permissionSentDate 
                ? new Date(item.permissionSentDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'N/A';

              return (
                <tr key={item.id} className={`transition-colors duration-150 ${rowBg}`}>
                  {/* Petition No. */}
                  <td className="py-3 px-3 font-mono font-semibold text-ink-text">
                    <span className="bg-parchment-2/80 px-2 py-0.5 rounded border border-rule/30">
                      {item.petitionNo}
                    </span>
                    <div className="text-[10px] text-ink-text-faint mt-0.5">{item.district}</div>
                  </td>

                  {/* Respondent */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-ink-text text-[12px]">{item.respondentName}</div>
                    <div className="text-[11px] text-ink-text-soft truncate max-w-[160px]" title={item.designation}>
                      {item.designation}
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-3 px-3">
                    <div className="text-[11.5px] font-medium text-ink-text truncate max-w-[200px]" title={item.department}>
                      {item.department}
                    </div>
                    <div className="text-[10.5px] text-ink-text-soft truncate max-w-[200px]" title={item.office}>
                      {item.office}
                    </div>
                  </td>

                  {/* CA */}
                  <td className="py-3 px-3">
                    <div className="text-[11.5px] font-semibold text-[#1c2840] truncate max-w-[180px]" title={item.caDesignation}>
                      {item.caDesignation}
                    </div>
                    <div className="text-[10px] text-ink-text-soft truncate max-w-[180px]" title={`${item.caDepartment}, ${item.caPlace}`}>
                      {item.caPlace || item.caDepartment}
                    </div>
                  </td>

                  {/* Date Sent */}
                  <td className="py-3 px-3 font-mono text-[11px] text-ink-text-soft whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Days Elapsed */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      isCritical 
                        ? 'bg-rose-600 text-white' 
                        : isWarning 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-parchment-2 text-ink-text'
                    }`}>
                      {item.daysPending} days
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {item.permissionStatus === 'Obtained' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Sanction Obtained
                      </span>
                    ) : isCritical ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        Critical Delay
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Action Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        Pending Review
                      </span>
                    )}
                  </td>

                  {/* Action Link */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <Link
                      to={`/register?search=${encodeURIComponent(item.petitionNo)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brass hover:text-[#7E2A34] transition-colors"
                    >
                      <span>View File</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 pt-2.5 border-t border-rule/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-text-faint">
        <span>* Section 17-A (Prevention of Corruption Act) statutory response window: 3 months (90 days).</span>
        <span className="font-mono">Karnataka Lokayukta Legal Directorate</span>
      </div>
    </div>
  );
}
