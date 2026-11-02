import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

// Shared building blocks for the Officers and Court Cases module dashboards.

export function ChartTooltip({ active, payload, label, unit = 'Count', totalLabel = 'Total' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-ink text-[#F5EFE1] px-3 py-2 rounded-lg border border-white/20 shadow-deep text-xs min-w-[150px]">
      <div className="font-serif font-bold text-[13px] text-[#C9A15E] mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-[#A0B0CB]">
            {payload.length > 1 && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />}
            {payload.length > 1 ? p.name : unit}
          </span>
          <span className="font-mono font-bold text-white">{p.value}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-white/15">
          <span className="text-[#A0B0CB]">{totalLabel}</span>
          <span className="font-mono font-bold text-white">{payload.reduce((sum, p) => sum + (p.value || 0), 0)}</span>
        </div>
      )}
    </div>
  );
}

export function Card({ icon: Icon, title, subtitle, action, children, className = '', id }) {
  return (
    <div id={id} className={`bg-[#FFFDF7] border border-rule/70 rounded-xl p-5 shadow-soft ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#E8EEF9] border border-[#CBD8EF] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[#000E89]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[15px] font-serif font-bold text-ink-text leading-tight">{title}</h4>
            {subtitle && <p className="text-[11.5px] text-ink-text-soft mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, suffix, accent, badge, footer, progress, to, onClick }) {
  const body = (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0000FE] via-[#0000E6] to-[#0000C8] p-4 border border-blue-300/40 shadow-[0_8px_20px_rgba(0,0,254,0.25)] hover:border-yellow-300 hover:shadow-[0_12px_28px_rgba(0,0,254,0.38)] transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col justify-between">
      <div className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5" style={{ backgroundColor: accent }} />
      <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-20 blur-xl pointer-events-none transition-opacity duration-300 group-hover:opacity-40" style={{ backgroundColor: accent }} />
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/25 bg-white/20 text-white transition-transform duration-300 group-hover:scale-110 shadow-sm">
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white/15 text-white border-white/30 tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <div className="font-serif text-3xl font-bold text-white tracking-tight mb-1 tabular-nums">
          {Number(value || 0).toLocaleString('en-IN')}
          {suffix && <span className="text-[16px] text-blue-100/70 font-sans font-semibold ml-0.5">{suffix}</span>}
        </div>
        <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#E0F2FE]">{label}</div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/20 space-y-2">
        {progress !== undefined && (
          <div className="w-full bg-black/25 h-1.5 rounded-full overflow-hidden border border-white/10">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(3, progress))}%`, backgroundColor: accent }} />
          </div>
        )}
        {footer && <div className="text-[10px] text-blue-100/80 font-mono truncate" title={footer}>{footer}</div>}
      </div>
    </div>
  );

  if (to) return <Link to={to} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A15E] rounded-xl">{body}</Link>;
  return (
    <button type="button" onClick={onClick} className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A15E] rounded-xl">
      {body}
    </button>
  );
}

export function EmptyState({ label, icon: Icon = Shield }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="w-8 h-8 text-ink-text-faint mb-2" strokeWidth={1.5} />
      <p className="text-[12.5px] text-ink-text-soft">{label}</p>
    </div>
  );
}
