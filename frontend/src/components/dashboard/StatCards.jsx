import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Gavel, 
  AlertTriangle, 
  Clock,
  Users,
  Send,
  AlertCircle
} from 'lucide-react';

export default function StatCards({ overview = {}, onFilterPendingCa, viewMode = 'proposals' }) {
  const isRespondents = viewMode === 'respondents';

  const {
    // Proposal-level metrics
    totalPetitions = 0,
    proposalsSentToCA = 0,
    proposalsNotSentToCA = 0,
    proposalsBackToDist = 0,
    proposalsPendingWithCA = 0,
    proposalsSanctionsObtained = 0,
    proposalsSanctionsRejected = 0,
    firRegistered = 0,
    criticalPendingCount = 0,
    warningPendingCount = 0,
    totalPendingCa = 0,

    // Respondent-level metrics
    totalRespondents = 0,
    respondentsSentToCA = 0,
    respondentsNotSentToCA = 0,
    respondentsBackToDist = 0,
    respondentsPendingWithCA = 0,
    permissionsObtained = 0,
    permissionsRejected = 0,
    respondentsFirRegistered = 0,
    respondentsCriticalPendingCount = 0,
    respondentsWarningPendingCount = 0,

    // Rates
    acceptanceRate = 0,
    sanctionRate = 0,
    firRate = 0,
    permissionRate = 0
  } = overview;

  const proposalCards = [
    {
      id: 'petitions',
      label: 'Total Petitions Registered',
      sublabel: 'Active Registry',
      value: totalPetitions,
      icon: FileText,
      accent: '#60A5FA',
      badge: 'Active Registry',
      badgeColor: 'bg-white/20 text-white border-white/30',
      footerNote: `${proposalsSentToCA} Dispatched • ${proposalsNotSentToCA} Awaiting • ${proposalsBackToDist} Returned`,
      to: '/register'
    },
    {
      id: 'proposals',
      label: 'Proposals Sent to CA',
      sublabel: 'Dispatched to Authority',
      value: proposalsSentToCA,
      icon: Send,
      accent: '#34D399',
      badge: `${totalPetitions ? Math.round((proposalsSentToCA / totalPetitions) * 100) : 0}% Dispatched`,
      badgeColor: 'bg-emerald-400/25 text-white border-emerald-300/40',
      progressBar: { 
        value: totalPetitions ? Math.round((proposalsSentToCA / totalPetitions) * 100) : 0, 
        color: 'bg-emerald-400' 
      },
      footerNote: `${proposalsNotSentToCA} Awaiting Dispatch • ${proposalsBackToDist} Returned to Dist`,
      to: '/register'
    },
    {
      id: 'permissions',
      label: 'CA Sanctions Obtained',
      sublabel: 'Authority Decision Granted',
      value: proposalsSanctionsObtained,
      icon: ShieldCheck,
      accent: '#FBBF24',
      badge: `${proposalsSentToCA ? Math.round((proposalsSanctionsObtained / proposalsSentToCA) * 100) : 0}% Granted`,
      badgeColor: 'bg-amber-400/25 text-white border-amber-300/40',
      progressBar: { 
        value: proposalsSentToCA ? Math.round((proposalsSanctionsObtained / proposalsSentToCA) * 100) : 0, 
        color: 'bg-amber-400' 
      },
      footerNote: `${proposalsSanctionsObtained} Sanctioned • ${proposalsSanctionsRejected} Refused / Disposed`,
      to: '/register'
    },
    {
      id: 'firs',
      label: 'FIRs Registered',
      sublabel: 'Criminal Prosecution Initiated',
      value: firRegistered,
      icon: Gavel,
      accent: '#F87171',
      badge: 'Prosecution Active',
      badgeColor: 'bg-red-400/25 text-white border-red-300/40',
      progressBar: { 
        value: totalPetitions ? Math.round((firRegistered / totalPetitions) * 100) : 0, 
        color: 'bg-red-400' 
      },
      footerNote: `${firRegistered} Cases Registered in Lokayukta Police Stations`,
      to: '/register'
    },
    {
      id: 'pending-ca',
      label: 'CA Pending Cases',
      sublabel: 'Awaiting Competent Authority Order',
      value: proposalsPendingWithCA || totalPendingCa,
      icon: criticalPendingCount > 0 ? AlertTriangle : Clock,
      accent: criticalPendingCount > 0 ? '#FB923C' : '#FBBF24',
      badge: criticalPendingCount > 0 ? `${criticalPendingCount} Overdue >60d` : `${proposalsPendingWithCA} Under Review`,
      badgeColor: criticalPendingCount > 0 
        ? 'bg-rose-500/40 text-white border-rose-300/50 animate-pulse' 
        : 'bg-amber-400/25 text-white border-amber-300/40',
      footerNote: `${criticalPendingCount} Critical (>60d) • ${warningPendingCount} Warning (30-59d)`,
      onClick: onFilterPendingCa,
      isAction: true
    }
  ];

  const respondentCards = [
    {
      id: 'respondents-total',
      label: 'Total Accused Registered',
      sublabel: 'Public Servants Registry',
      value: totalRespondents,
      icon: Users,
      accent: '#60A5FA',
      badge: 'Named Accused',
      badgeColor: 'bg-white/20 text-white border-white/30',
      footerNote: `${respondentsSentToCA} Dispatched • ${respondentsNotSentToCA} Awaiting • ${respondentsBackToDist} Returned`,
      to: '/register'
    },
    {
      id: 'respondents-sent',
      label: 'Accused Sent to CA',
      sublabel: 'Sanction Requests Dispatched',
      value: respondentsSentToCA,
      icon: Send,
      accent: '#34D399',
      badge: `${totalRespondents ? Math.round((respondentsSentToCA / totalRespondents) * 100) : 0}% Dispatched`,
      badgeColor: 'bg-emerald-400/25 text-white border-emerald-300/40',
      progressBar: { 
        value: totalRespondents ? Math.round((respondentsSentToCA / totalRespondents) * 100) : 0, 
        color: 'bg-emerald-400' 
      },
      footerNote: `${respondentsNotSentToCA} Awaiting Dispatch • ${respondentsBackToDist} Returned to Dist`,
      to: '/register'
    },
    {
      id: 'respondents-obtained',
      label: 'CA Sanctions Obtained',
      sublabel: 'Approved by Competent Authority',
      value: permissionsObtained,
      icon: ShieldCheck,
      accent: '#FBBF24',
      badge: `${respondentsSentToCA ? Math.round((permissionsObtained / respondentsSentToCA) * 100) : 0}% Approved`,
      badgeColor: 'bg-amber-400/25 text-white border-amber-300/40',
      progressBar: { 
        value: respondentsSentToCA ? Math.round((permissionsObtained / respondentsSentToCA) * 100) : 0, 
        color: 'bg-amber-400' 
      },
      footerNote: `${permissionsObtained} Sanctioned • ${permissionsRejected} Rejected by CA`,
      to: '/register'
    },
    {
      id: 'respondents-firs',
      label: 'Accused in FIRs',
      sublabel: 'Charges Registered',
      value: respondentsFirRegistered,
      icon: Gavel,
      accent: '#F87171',
      badge: 'Prosecution Active',
      badgeColor: 'bg-red-400/25 text-white border-red-300/40',
      progressBar: { 
        value: totalRespondents ? Math.round((respondentsFirRegistered / totalRespondents) * 100) : 0, 
        color: 'bg-red-400' 
      },
      footerNote: `${respondentsFirRegistered} Public Servants Indicted in FIRs`,
      to: '/register'
    },
    {
      id: 'respondents-pending-ca',
      label: 'Accused Awaiting CA',
      sublabel: 'Pending CA Sanction Decision',
      value: respondentsPendingWithCA,
      icon: respondentsCriticalPendingCount > 0 ? AlertTriangle : Clock,
      accent: respondentsCriticalPendingCount > 0 ? '#FB923C' : '#FBBF24',
      badge: respondentsCriticalPendingCount > 0 ? `${respondentsCriticalPendingCount} Overdue >60d` : `${respondentsPendingWithCA} In Review`,
      badgeColor: respondentsCriticalPendingCount > 0 
        ? 'bg-rose-500/40 text-white border-rose-300/50 animate-pulse' 
        : 'bg-amber-400/25 text-white border-amber-300/40',
      footerNote: `${respondentsCriticalPendingCount} Critical (>60d) • ${respondentsWarningPendingCount} Warning (30-59d)`,
      onClick: onFilterPendingCa,
      isAction: true
    }
  ];

  const cards = isRespondents ? respondentCards : proposalCards;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const CardContent = (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0000FE] via-[#0000E6] to-[#0000C8] p-4 border border-blue-300/40 shadow-[0_8px_20px_rgba(0,0,254,0.25)] hover:border-yellow-300 hover:shadow-[0_12px_28px_rgba(0,0,254,0.38)] transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col justify-between">
            {/* Top accent bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5" 
              style={{ backgroundColor: card.accent }} 
            />

            {/* Subtle glow in background on hover */}
            <div 
              className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-20 blur-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-40" 
              style={{ backgroundColor: card.accent }} 
            />

            {/* Top row: Icon and Badge */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/25 bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 shadow-sm"
                  style={{ color: '#FFFFFF' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor} tracking-wide backdrop-blur-xs`}>
                  {card.badge}
                </span>
              </div>

              {/* Number and Label */}
              <div className="font-serif text-3xl font-bold text-white tracking-tight mb-1">
                {typeof card.value === 'number' ? card.value.toLocaleString('en-IN') : card.value}
              </div>
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#E0F2FE]">
                {card.label}
              </div>
            </div>

            {/* Middle/Bottom section: Progress bar or footer note */}
            <div className="mt-3 pt-2.5 border-t border-white/20 space-y-2">
              {card.progressBar && (
                <div className="w-full bg-black/25 h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full ${card.progressBar.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, card.progressBar.value))}%` }}
                  />
                </div>
              )}
              {card.footerNote && (
                <div className="text-[10px] text-blue-100/80 font-mono truncate" title={card.footerNote}>
                  {card.footerNote}
                </div>
              )}
            </div>
          </div>
        );

        if (card.to) {
          return (
            <Link key={card.id} to={card.to} className="block h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C9A15E]">
              {CardContent}
            </Link>
          );
        }

        return (
          <div 
            key={card.id} 
            onClick={card.onClick} 
            className={`block h-full ${card.onClick ? 'cursor-pointer' : ''} focus:outline-none`}
            title={card.onClick ? 'Click to jump to Watchlist' : undefined}
          >
            {CardContent}
          </div>
        );
      })}
    </div>
  );
}
