import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ShieldAlert, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Users,
  Building2,
  FileText
} from 'lucide-react';

export default function StatutoryAgingWatchlist({ watchlist = [] }) {
  const [expandedPetitions, setExpandedPetitions] = useState(() => new Set());

  // Group watchlist respondents by Petition
  const petitionGroups = useMemo(() => {
    const map = new Map();
    (watchlist || []).forEach(item => {
      const key = item.petitionId || item.petitionNo;
      if (!map.has(key)) {
        map.set(key, {
          key,
          petitionId: item.petitionId,
          petitionNo: item.petitionNo,
          district: item.district,
          respondents: [],
          maxDaysPending: 0,
          highestUrgency: 'normal',
          obtainedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          latestDispatchDate: item.permissionSentDate
        });
      }
      const group = map.get(key);
      group.respondents.push(item);
      if (item.daysPending > group.maxDaysPending) {
        group.maxDaysPending = item.daysPending;
      }
      if (item.permissionStatus === 'Obtained') group.obtainedCount++;
      else if (item.permissionStatus === 'Rejected') group.rejectedCount++;
      else group.pendingCount++;

      if (item.permissionSentDate && (!group.latestDispatchDate || new Date(item.permissionSentDate) > new Date(group.latestDispatchDate))) {
        group.latestDispatchDate = item.permissionSentDate;
      }

      // Urgency hierarchy: critical > warning > normal > obtained
      const urgencyRank = { critical: 4, warning: 3, normal: 2, obtained: 1 };
      if ((urgencyRank[item.urgency] || 0) > (urgencyRank[group.highestUrgency] || 0)) {
        group.highestUrgency = item.urgency;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.maxDaysPending - a.maxDaysPending);
  }, [watchlist]);

  const toggleExpand = (key) => {
    setExpandedPetitions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedPetitions.size === petitionGroups.length) {
      setExpandedPetitions(new Set());
    } else {
      setExpandedPetitions(new Set(petitionGroups.map(g => g.key)));
    }
  };

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
            Active status and statutory elapsed time organized by petition. Expand rows to view individual accused public servants.
          </p>
        </div>

        {/* Status badges & Expand All Button */}
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
            {petitionGroups.length} Petitions ({watchlist.length} Accused)
          </span>

          {petitionGroups.some(g => g.respondents.length > 1) && (
            <button
              type="button"
              onClick={toggleAll}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-[#000E89] hover:bg-[#E8EEF9] border border-[#CBD8EF] transition-colors cursor-pointer"
            >
              {expandedPetitions.size === petitionGroups.length ? 'Collapse All' : 'Expand All Accused'}
            </button>
          )}
        </div>
      </div>

      {/* Petition Grouped Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-rule/40 text-[11px] font-semibold text-[#6E6248] uppercase tracking-wider bg-parchment-2/40">
              <th className="py-2.5 px-3 min-w-[130px]">Petition No.</th>
              <th className="py-2.5 px-3 min-w-[200px]">Accused Summary</th>
              <th className="py-2.5 px-3 min-w-[180px]">Department & Office</th>
              <th className="py-2.5 px-3 min-w-[170px]">Competent Authority (CA)</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Date Dispatched</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Days Elapsed</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Sanction Status</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/20 font-sans">
            {petitionGroups.map((group) => {
              const isExpanded = expandedPetitions.has(group.key);
              const isCritical = group.highestUrgency === 'critical';
              const isWarning = group.highestUrgency === 'warning';
              
              const rowBg = isCritical 
                ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                : isWarning 
                ? 'bg-amber-50/30 hover:bg-amber-50/60' 
                : 'hover:bg-white/80';

              const formattedDate = group.latestDispatchDate 
                ? new Date(group.latestDispatchDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'N/A';

              const primaryRespondent = group.respondents[0] || {};

              return (
                <React.Fragment key={group.key}>
                  {/* Main Petition Row */}
                  <tr 
                    onClick={() => toggleExpand(group.key)} 
                    className={`transition-colors duration-150 cursor-pointer ${rowBg} ${isExpanded ? 'bg-parchment-2/40' : ''}`}
                  >
                    {/* Petition No. & District */}
                    <td className="py-3 px-3 font-mono font-semibold text-ink-text">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(group.key); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-ink-text-soft hover:text-[#000E89] hover:bg-parchment transition-colors"
                          title={isExpanded ? "Minimize Accused List" : "Maximize / Expand Accused List"}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#000E89]" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <span className="bg-parchment-2/90 px-2 py-0.5 rounded border border-rule/30 text-xs font-bold text-[#000E89] inline-flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#000E89]/70" />
                            {group.petitionNo}
                          </span>
                          <div className="text-[10px] text-ink-text-faint mt-0.5">{group.district}</div>
                        </div>
                      </div>
                    </td>

                    {/* Accused Summary & Pill */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAE4D2] text-[#4A3E25] border border-[#DDD5BE]">
                          <Users className="w-3 h-3 text-brass" />
                          {group.respondents.length} {group.respondents.length === 1 ? 'Accused' : 'Accused'}
                        </span>
                        <span className="text-[11px] text-[#000E89] hover:underline font-medium">
                          {isExpanded ? 'Minimize ▴' : 'Maximize / View ▾'}
                        </span>
                      </div>
                      <div 
                        className="text-[11px] text-ink-text-soft truncate max-w-[220px] mt-1" 
                        title={group.respondents.map((r, i) => `${i + 1}. ${r.respondentName} (${r.designation || 'N/A'})`).join('\n')}
                      >
                        <span className="font-semibold text-ink-text">{primaryRespondent.respondentName}</span>
                        {group.respondents.length > 1 && (
                          <span className="text-ink-text-faint font-normal"> +{group.respondents.length - 1} more</span>
                        )}
                        {primaryRespondent.designation && (
                          <span className="text-[10.5px] text-ink-text-faint"> · {primaryRespondent.designation}</span>
                        )}
                      </div>
                    </td>

                    {/* Department & Office */}
                    <td className="py-3 px-3">
                      <div className="text-[11.5px] font-medium text-ink-text truncate max-w-[190px]" title={primaryRespondent.department}>
                        {primaryRespondent.department || '—'}
                      </div>
                      <div className="text-[10.5px] text-ink-text-soft truncate max-w-[190px]" title={primaryRespondent.office || primaryRespondent.caPlace}>
                        {primaryRespondent.office || primaryRespondent.caPlace || '—'}
                      </div>
                    </td>

                    {/* Competent Authority (CA) */}
                    <td className="py-3 px-3">
                      <div className="text-[11.5px] font-semibold text-[#1c2840] truncate max-w-[170px]" title={primaryRespondent.caDesignation}>
                        {primaryRespondent.caDesignation || 'Competent Authority'}
                      </div>
                      <div className="text-[10px] text-ink-text-soft truncate max-w-[170px]" title={primaryRespondent.caPlace || primaryRespondent.caDepartment}>
                        {primaryRespondent.caPlace || primaryRespondent.caDepartment || '—'}
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
                        {group.maxDaysPending} days
                      </span>
                    </td>

                    {/* Statutory Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {group.obtainedCount === group.respondents.length ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          Sanction Obtained ({group.obtainedCount})
                        </span>
                      ) : group.obtainedCount > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-2.5 h-2.5" /> {group.obtainedCount} Obtained
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-2.5 h-2.5" /> {group.pendingCount} Pending
                          </span>
                        </div>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Critical Delay
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Action Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </td>

                    {/* Action Link & Maximize Button */}
                    <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.key)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-ink-text hover:bg-parchment-2 border border-rule/30 transition-colors cursor-pointer"
                          title={isExpanded ? "Minimize Accused Details" : "Maximize / Expand All Accused"}
                        >
                          <span>{isExpanded ? 'Minimize' : 'Maximize'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-[#000E89]" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <Link
                          to={`/register?search=${encodeURIComponent(group.petitionNo)}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brass hover:text-[#7E2A34] transition-colors px-1 py-1"
                          title="View case file in Register"
                        >
                          <span>File</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Nested Accused Details Drawer */}
                  {isExpanded && (
                    <tr className="bg-[#FAF7EE]/60 border-b border-rule/40 animate-fade-in">
                      <td colSpan={8} className="p-3 sm:p-4">
                        <div className="bg-white rounded-xl border border-rule/50 p-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-rule/30">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#000E89]/10 text-[#000E89] flex items-center justify-center text-xs font-bold font-mono">
                                §
                              </span>
                              <h5 className="font-serif font-bold text-ink-text text-xs sm:text-sm">
                                Accused Public Servants in Petition #{group.petitionNo} ({group.respondents.length} Total)
                              </h5>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-ink-text-soft">
                              <span className="font-mono">District: {group.district}</span>
                              <Link
                                to={`/register?search=${encodeURIComponent(group.petitionNo)}`}
                                className="text-[#000E89] font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                Open in Register <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>

                          {/* Accused Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-rule/30 text-[10.5px] font-semibold text-ink-text-soft uppercase tracking-wider bg-parchment-2/50">
                                  <th className="py-2 px-3 w-8">#</th>
                                  <th className="py-2 px-3 min-w-[160px]">Accused Name & Designation</th>
                                  <th className="py-2 px-3 min-w-[180px]">Department & Office</th>
                                  <th className="py-2 px-3 min-w-[160px]">Competent Authority (CA)</th>
                                  <th className="py-2 px-3 whitespace-nowrap">Date Dispatched</th>
                                  <th className="py-2 px-3 text-center whitespace-nowrap">Days Elapsed</th>
                                  <th className="py-2 px-3 text-center whitespace-nowrap">Sanction Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rule/20">
                                {group.respondents.map((r, rIdx) => {
                                  const isCrit = r.urgency === 'critical';
                                  const isWarn = r.urgency === 'warning';
                                  const rDate = r.permissionSentDate 
                                    ? new Date(r.permissionSentDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : 'N/A';

                                  return (
                                    <tr key={r.id || rIdx} className="hover:bg-parchment-2/30 transition-colors">
                                      <td className="py-2.5 px-3 font-mono font-bold text-ink-text-soft text-[11px]">
                                        {rIdx + 1}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="font-semibold text-ink-text text-[12px]">{r.respondentName}</div>
                                        <div className="text-[11px] text-ink-text-soft">{r.designation}</div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="text-[11.5px] font-medium text-ink-text">{r.department}</div>
                                        <div className="text-[10.5px] text-ink-text-soft">{r.office}</div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="text-[11.5px] font-semibold text-[#1c2840]">{r.caDesignation}</div>
                                        <div className="text-[10px] text-ink-text-soft">{r.caPlace || r.caDepartment}</div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-text-soft whitespace-nowrap">
                                        {rDate}
                                      </td>
                                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                          isCrit 
                                            ? 'bg-rose-600 text-white' 
                                            : isWarn 
                                            ? 'bg-amber-500 text-white' 
                                            : 'bg-parchment-2 text-ink-text'
                                        }`}>
                                          {r.daysPending} days
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                        {r.permissionStatus === 'Obtained' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle className="w-2.5 h-2.5" /> Sanction Obtained
                                          </span>
                                        ) : r.permissionStatus === 'Rejected' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                            Sanction Refused
                                          </span>
                                        ) : isCrit ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                                            <AlertTriangle className="w-2.5 h-2.5" /> Critical Delay
                                          </span>
                                        ) : isWarn ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                            <Clock className="w-2.5 h-2.5" /> Action Due
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                            Pending Review
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
