import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Gavel, 
  Users2, 
  AlertTriangle, 
  TrendingUp,
  Clock
} from 'lucide-react';

export default function StatCards({ overview = {}, onFilterPendingCa }) {
  const {
    totalPetitions = 0,
    acceptedProposals = 0,
    permissionsObtained = 0,
    firRegistered = 0,
    totalOfficers = 0,
    acceptanceRate = 0,
    permissionRate = 0,
    firRate = 0,
    criticalPendingCount = 0,
    warningPendingCount = 0,
    totalPendingCa = 0
  } = overview;

  const cards = [
    {
      id: 'petitions',
      label: 'Total Petitions Registered',
      value: totalPetitions,
      subtext: 'Across all jurisdiction units',
      icon: FileText,
      accent: '#3B82F6',
      badge: 'Active Registry',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      to: '/register'
    },
    {
      id: 'proposals',
      label: '17-A Proposals Accepted',
      value: acceptedProposals,
      subtext: `${acceptanceRate}% Scrutiny Acceptance Rate`,
      icon: CheckCircle2,
      accent: '#10B981',
      badge: `${acceptanceRate}% Accepted`,
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      progressBar: { value: acceptanceRate, color: 'bg-emerald-500' },
      to: '/register'
    },
    {
      id: 'permissions',
      label: 'CA Sanctions Obtained',
      value: permissionsObtained,
      subtext: `${permissionRate}% Sanction Rate (Sec. 17-A)`,
      icon: ShieldCheck,
      accent: '#C9A15E',
      badge: 'Statutory Approved',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      progressBar: { value: permissionRate, color: 'bg-[#C9A15E]' },
      to: '/register'
    },
    {
      id: 'firs',
      label: 'FIRs Registered',
      value: firRegistered,
      subtext: `${firRate}% Legal Action / Prosecution Rate`,
      icon: Gavel,
      accent: '#EF4444',
      badge: 'Prosecution Active',
      badgeColor: 'bg-red-500/15 text-red-300 border-red-500/30',
      progressBar: { value: firRate, color: 'bg-red-500' },
      to: '/register'
    },
    {
      id: 'officers',
      label: 'Vigilance Officers Deployed',
      value: totalOfficers,
      subtext: 'Field investigators & SPs active',
      icon: Users2,
      accent: '#8B5CF6',
      badge: 'Field Strength',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      to: '/officers'
    },
    {
      id: 'pending-ca',
      label: 'Statutory CA Pending Cases',
      value: totalPendingCa,
      subtext: criticalPendingCount > 0 
        ? `${criticalPendingCount} critical (>60d), ${warningPendingCount} warning`
        : totalPendingCa > 0 ? `${warningPendingCount} awaiting response (>30d)` : 'All statutory requests on track',
      icon: criticalPendingCount > 0 ? AlertTriangle : Clock,
      accent: criticalPendingCount > 0 ? '#F97316' : '#EAB308',
      badge: criticalPendingCount > 0 ? `${criticalPendingCount} Overdue >60d` : `${totalPendingCa} Under Review`,
      badgeColor: criticalPendingCount > 0 
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      onClick: onFilterPendingCa,
      isAction: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const CardContent = (
          <div className="relative overflow-hidden rounded-xl bg-ink p-4 border border-white/10 shadow-card hover:border-[#C9A15E]/50 transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col justify-between">
            {/* Top accent bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5" 
              style={{ backgroundColor: card.accent }} 
            />

            {/* Subtle glow in background on hover */}
            <div 
              className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-10 blur-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-25"
              style={{ backgroundColor: card.accent }}
            />

            {/* Top row: Icon and Badge */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 transition-transform duration-300 group-hover:scale-110"
                  style={{ color: card.accent }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${card.badgeColor} tracking-wide`}>
                  {card.badge}
                </span>
              </div>

              {/* Number and Label */}
              <div className="font-serif text-3xl font-bold text-[#F5EFE1] tracking-tight mb-1">
                {card.value}
              </div>
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#A0B0CB]">
                {card.label}
              </div>
            </div>

            {/* Bottom section: Progress bar or Subtext */}
            <div className="mt-3 pt-2.5 border-t border-white/5">
              {card.progressBar && (
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full ${card.progressBar.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, card.progressBar.value))}%` }}
                  />
                </div>
              )}
              <div className="text-[11px] text-[#8590A8] truncate flex items-center gap-1 font-sans">
                {card.subtext}
              </div>
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
            title={card.onClick ? 'Click to jump to Statutory Watchlist' : undefined}
          >
            {CardContent}
          </div>
        );
      })}
    </div>
  );
}
