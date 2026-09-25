import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Gavel, 
  AlertTriangle, 
  Clock
} from 'lucide-react';

export default function StatCards({ overview = {}, onFilterPendingCa }) {
  const {
    totalPetitions = 0,
    acceptedProposals = 0,
    permissionsObtained = 0,
    firRegistered = 0,
    acceptanceRate = 0,
    permissionRate = 0,
    firRate = 0,
    criticalPendingCount = 0,
    totalPendingCa = 0
  } = overview;

  const cards = [
    {
      id: 'petitions',
      label: 'Total Petitions Registered',
      value: totalPetitions,
      icon: FileText,
      accent: '#60A5FA',
      badge: 'Active Registry',
      badgeColor: 'bg-white/20 text-white border-white/30',
      to: '/register'
    },
    {
      id: 'proposals',
      label: '17-A Proposals Accepted',
      value: acceptedProposals,
      icon: CheckCircle2,
      accent: '#34D399',
      badge: `${acceptanceRate}% Accepted`,
      badgeColor: 'bg-emerald-400/25 text-white border-emerald-300/40',
      progressBar: { value: acceptanceRate, color: 'bg-emerald-400' },
      to: '/register'
    },
    {
      id: 'permissions',
      label: 'CA Sanctions Obtained',
      value: permissionsObtained,
      icon: ShieldCheck,
      accent: '#FBBF24',
      badge: 'Statutory Approved',
      badgeColor: 'bg-amber-400/25 text-white border-amber-300/40',
      progressBar: { value: permissionRate, color: 'bg-amber-400' },
      to: '/register'
    },
    {
      id: 'firs',
      label: 'FIRs Registered',
      value: firRegistered,
      icon: Gavel,
      accent: '#F87171',
      badge: 'Prosecution Active',
      badgeColor: 'bg-red-400/25 text-white border-red-300/40',
      progressBar: { value: firRate, color: 'bg-red-400' },
      to: '/register'
    },
    {
      id: 'pending-ca',
      label: 'Statutory CA Pending Cases',
      value: totalPendingCa,
      icon: criticalPendingCount > 0 ? AlertTriangle : Clock,
      accent: criticalPendingCount > 0 ? '#FB923C' : '#FBBF24',
      badge: criticalPendingCount > 0 ? `${criticalPendingCount} Overdue >60d` : `${totalPendingCa} Under Review`,
      badgeColor: criticalPendingCount > 0 
        ? 'bg-rose-500/40 text-white border-rose-300/50 animate-pulse' 
        : 'bg-amber-400/25 text-white border-amber-300/40',
      onClick: onFilterPendingCa,
      isAction: true
    }
  ];

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
                {card.value}
              </div>
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#E0F2FE]">
                {card.label}
              </div>
            </div>

            {/* Bottom section: Progress bar only */}
            {card.progressBar && (
              <div className="mt-3 pt-2.5 border-t border-white/20">
                <div className="w-full bg-black/25 h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full ${card.progressBar.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, card.progressBar.value))}%` }}
                  />
                </div>
              </div>
            )}
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
