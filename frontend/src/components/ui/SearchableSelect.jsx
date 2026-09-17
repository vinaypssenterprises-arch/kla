import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  ChevronDown, 
  Search, 
  Check, 
  X, 
  MapPin, 
  Building2, 
  Briefcase, 
  User, 
  Compass, 
  CornerDownLeft, 
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import Modal from './Modal';

function normalizeOptions(options) {
  return (options || []).map(o => (typeof o === 'string' ? { value: o, label: o } : o));
}

// Smart context-aware icon detection
function getContextIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('district')) return MapPin;
  if (t.includes('department') || t.includes('office') || t.includes('division')) return Building2;
  if (t.includes('designation') || t.includes('role') || t.includes('post')) return Briefcase;
  if (t.includes('officer') || t.includes('user') || t.includes('supervisor')) return User;
  return Compass;
}

// Helper to highlight matched query substring
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <span className="font-bold text-[#A97B33] bg-amber-100/90 px-1 py-0.5 rounded text-[14.5px] border border-amber-300/60 shadow-xs">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </span>
  );
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  label,
  disabled = false,
  error = false,
  id,
  className = '',
}) {
  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = normalized.find(o => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(o => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const title = label || placeholder || 'Select Option';
  const IconComponent = getContextIcon(title);
  const effectivePlaceholder = searchPlaceholder || `Search ${title.toLowerCase()} or start typing…`;

  const openPicker = () => {
    if (disabled) return;
    setQuery('');
    const curIdx = normalized.findIndex(o => o.value === value);
    setHighlighted(curIdx >= 0 ? curIdx : 0);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const itemEl = listRef.current?.querySelector(`[data-idx="${highlighted}"]`);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlighted, open]);

  const commit = (opt) => {
    onChange(opt.value);
    closePicker();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) commit(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`app-input group flex items-center justify-between gap-2 text-left cursor-pointer transition-all duration-200 hover:border-brass hover:shadow-xs disabled:cursor-not-allowed ${error ? 'input-error' : ''} ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComponent className="w-4 h-4 text-brass/80 group-hover:text-brass flex-shrink-0 transition-colors" />
          <span className={`truncate text-[13.5px] ${selected ? 'font-medium text-ink-text' : 'text-ink-text-faint'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          <ChevronDown className="w-4 h-4 text-ink-text-faint group-hover:text-ink-text transition-colors" />
        </div>
      </button>

      {/* Modern High-Tech Command Palette Modal */}
      <Modal open={open} onClose={closePicker}>
        <div className="bg-[#FFFDF7] border border-rule/80 rounded-2xl shadow-deep w-full max-w-[580px] max-h-[82vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
          
          {/* Executive Header */}
          <div className="bg-ink px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0 relative overflow-hidden">
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9A15E] to-transparent" />

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#C9A15E] shadow-sm">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold text-[#F5EFE1] leading-tight">
                    {title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#C9A15E] border border-white/15 font-semibold">
                    {normalized.length} Options
                  </span>
                </div>
                <p className="text-[11px] text-[#8590A8] mt-0.5">
                  Type to filter or use keyboard arrows to navigate.
                </p>
              </div>
            </div>

            {/* Close & Esc Badge */}
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-white/10 text-[#A0B0CB] border border-white/15">
                ESC
              </kbd>
              <button 
                type="button" 
                onClick={closePicker} 
                title="Close picker"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8590A8] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Input Bar with Modern Tech Glow */}
          <div className="p-4 bg-parchment-2/30 border-b border-rule/50 flex-shrink-0">
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-brass">
                <Search className="w-4 h-4" />
              </div>

              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={effectivePlaceholder}
                className="w-full bg-white border border-rule/80 rounded-xl pl-10 pr-10 py-2.5 text-[14px] text-ink-text font-medium placeholder:text-ink-text-faint placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#C9A15E] focus:border-[#C9A15E] shadow-xs transition-all"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-text-faint hover:text-ink-text hover:bg-parchment-2 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick search stats */}
            {query.trim() && (
              <div className="flex items-center justify-between text-[11px] text-ink-text-soft mt-2 px-1">
                <span>
                  Found <strong className="text-ink-text font-mono">{filtered.length}</strong> matching "{query.trim()}"
                </span>
                {filtered.length > 0 && (
                  <span className="text-[10.5px] text-brass font-medium">
                    Press <kbd className="px-1 py-0.5 rounded bg-white border border-rule/60 text-ink-text font-mono">↵ Enter</kbd> to select
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Options List Container */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[160px] max-h-[420px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-parchment-2 flex items-center justify-center text-ink-text-faint mb-3 border border-rule/60">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-ink-text text-sm mb-1">
                  No matching options found
                </h4>
                <p className="text-xs text-ink-text-soft max-w-xs mb-3">
                  No records match "{query}". Try checking for spelling or clear your search.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ink text-[#F5EFE1] hover:bg-[#1c2840] transition-colors shadow-xs"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div role="listbox" className="space-y-1">
                {filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlighted;

                  // Initials or Monogram for option
                  const words = opt.label.trim().split(/\s+/);
                  const monogram = words.length > 1
                    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
                    : opt.label.slice(0, 2).toUpperCase();

                  return (
                    <button
                      type="button"
                      key={opt.value}
                      data-idx={idx}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlighted(idx)}
                      onClick={() => commit(opt)}
                      className={`w-full flex items-center justify-between gap-3 text-left p-2.5 rounded-xl text-[13.5px] transition-all duration-150 border group ${
                        isSelected
                          ? 'bg-amber-500/10 border-[#C9A15E] shadow-xs'
                          : isHighlighted
                          ? 'bg-white border-rule shadow-xs translate-x-1'
                          : 'bg-transparent border-transparent hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Monogram / Icon Avatar */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-[#C9A15E] text-ink shadow-xs' 
                            : isHighlighted 
                            ? 'bg-ink text-[#F5EFE1]' 
                            : 'bg-parchment-2 text-ink-text-soft border border-rule/50'
                        }`}>
                          {monogram}
                        </div>

                        {/* Label with highlighted match */}
                        <div className="min-w-0">
                          <div className={`leading-snug truncate ${isSelected ? 'font-bold text-ink-text' : 'font-medium text-ink-text'}`}>
                            <HighlightedText text={opt.label} query={query} />
                          </div>
                          {isSelected && (
                            <span className="text-[10.5px] text-emerald-700 font-medium">
                              Currently selected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Action Badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Selected</span>
                          </span>
                        ) : isHighlighted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-brass bg-parchment-2/80 px-2 py-0.5 rounded border border-rule/50">
                            <span>Select</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* High-Tech Keyboard Navigation Footer */}
          <div className="px-5 py-2.5 bg-[#FFFDF7] border-t border-rule/50 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-text-soft">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-ink-text bg-parchment-2 px-2 py-0.5 rounded border border-rule/40">
                {filtered.length} of {normalized.length}
              </span>
              <span>available {title.toLowerCase()}</span>
            </div>

            {/* Keyboard Guide */}
            <div className="flex items-center gap-3 text-ink-text-faint flex-wrap">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white border border-rule/70 text-ink-text shadow-2xs">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white border border-rule/70 text-ink-text shadow-2xs">
                  ↓
                </kbd>
                <span className="text-[10px] text-ink-text-soft">Navigate</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white border border-rule/70 text-ink-text shadow-2xs">
                  ↵ Enter
                </kbd>
                <span className="text-[10px] text-ink-text-soft">Select</span>
              </span>

              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white border border-rule/70 text-ink-text shadow-2xs">
                  ESC
                </kbd>
                <span className="text-[10px] text-ink-text-soft">Close</span>
              </span>
            </div>
          </div>

        </div>
      </Modal>
    </>
  );
}
