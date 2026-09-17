import React from 'react';
import { ArrowRight, Shield, FileCheck, CheckCircle2, Search, Gavel } from 'lucide-react';

const STEP_ICONS = [
  FileCheck,
  Shield,
  CheckCircle2,
  Search,
  Gavel
];

export default function PipelineFunnel({ pipeline = [] }) {
  if (!pipeline || pipeline.length === 0) return null;

  return (
    <div className="bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-rule/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-brass animate-pulse" />
            <h3 className="text-base font-serif font-bold text-ink-text">
              Section 17-A Case Progression & Legal Lifecycle Funnel
            </h3>
          </div>
          <p className="text-[12.5px] text-ink-text-soft mt-0.5">
            Stage-by-stage throughput from petition receipt to statutory sanction and FIR registration.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] font-mono font-medium text-ink-text-soft bg-parchment-2/60 px-3 py-1 rounded-md border border-rule/40">
          <span>Total Pipeline Volume:</span>
          <span className="font-bold text-ink-text">{pipeline[0]?.count || 0} Petitions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative">
        {pipeline.map((item, index) => {
          const Icon = STEP_ICONS[index] || FileCheck;
          const isFirst = index === 0;
          const isLast = index === pipeline.length - 1;
          const prevCount = index > 0 ? pipeline[index - 1].count : null;
          const passThrough = prevCount && prevCount > 0 
            ? Math.round((item.count / prevCount) * 100) 
            : null;

          return (
            <div key={item.step} className="relative flex flex-col">
              <div 
                className={`flex-1 rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
                  isLast 
                    ? 'bg-rose-50/50 border-red-200/80' 
                    : isFirst 
                    ? 'bg-blue-50/40 border-blue-200/80' 
                    : 'bg-white border-rule/50'
                }`}
              >
                {/* Header with Step Number and Icon */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-parchment-2 text-ink-text-soft border border-rule/40">
                    STAGE {index + 1}
                  </span>
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Step Title */}
                <div className="text-[12.5px] font-semibold text-ink-text leading-tight mb-2 min-h-[34px]">
                  {item.step.replace(/^\d+\.\s*/, '')}
                </div>

                {/* Big Count */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-serif font-bold text-ink-text">
                    {item.count}
                  </span>
                  <span className="text-[11px] text-ink-text-soft">cases</span>
                </div>

                {/* Progress bar representing overall volume */}
                <div className="w-full bg-parchment-2 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${Math.max(5, Math.min(100, item.percentage))}%` 
                    }}
                  />
                </div>

                {/* Footer metrics */}
                <div className="flex items-center justify-between text-[10.5px] text-ink-text-soft">
                  <span>Of Total:</span>
                  <span className="font-semibold text-ink-text">{item.percentage}%</span>
                </div>

                {passThrough !== null && (
                  <div className="flex items-center justify-between text-[10px] text-ink-text-faint mt-1 pt-1 border-t border-rule/30">
                    <span>From Prev:</span>
                    <span className="font-mono font-semibold text-ink-text-soft">{passThrough}%</span>
                  </div>
                )}
              </div>

              {/* Connecting arrow for desktop view */}
              {!isLast && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-parchment-2 border border-rule/80 items-center justify-center text-ink-text-soft shadow-xs">
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
