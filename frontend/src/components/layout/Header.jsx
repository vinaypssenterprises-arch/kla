import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Clock, MapPin, LayoutGrid, X, Maximize2 } from 'lucide-react';
import { MODULES } from '../../lib/modules';

export default function Header({ moduleKey = 'petitions', onToggleMobile, isFormPage = false }) {
  const activeModule = MODULES[moduleKey] || MODULES.petitions;
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const districtName = localStorage.getItem('districtName');
  const role = localStorage.getItem('role');
  const isHeadOffice = localStorage.getItem('isHeadOffice') === '1';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleCancelForm = () => {
    const returnPath = moduleKey === 'courtCases' ? '/court-cases' : moduleKey === 'officers' ? '/officers' : '/register';
    navigate(returnPath);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between py-3 px-5 lg:px-7 bg-[#000E89] border-b-[2px] border-yellow-400 gap-3 shadow-[0_4px_16px_rgba(0,14,137,0.35)]">
      <div className="flex items-center gap-3 min-w-0">
        {!isFormPage && (
          <button type="button" className="icon-btn-dark lg:hidden flex-shrink-0 text-white" onClick={onToggleMobile} title="Menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-b from-[#FFF2D6] via-[#C9A15E] to-[#0015A8] flex items-center justify-center bg-white flex-shrink-0 shadow-xs">
          <img 
            src="/lokayukta-emblem.png" 
            alt="Karnataka Lokayukta" 
            className="w-6 h-6 object-contain select-none pointer-events-none" 
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-[14.5px] text-white font-serif font-bold leading-tight truncate tracking-wide">
            {activeModule.title}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-[#E0F2FE] tracking-[0.05em] uppercase font-semibold">
              {activeModule.label} Module · {activeModule.kannada}
            </span>
            {(districtName || isHeadOffice) && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-200 bg-black/20 px-1.5 py-0.5 rounded border border-amber-300/40">
                <MapPin className="w-2.5 h-2.5" />
                {isHeadOffice ? 'Head Office' : districtName}
              </span>
            )}
            {role && (
              <span className="hidden md:inline text-[10px] font-mono uppercase tracking-widest text-white px-1.5 py-0.5 rounded bg-white/20 border border-white/30 font-bold">
                {role}
              </span>
            )}
            {isFormPage && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/40 shadow-2xs">
                <Maximize2 className="w-2.5 h-2.5" /> Full Screen Form
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-right">
          <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
          <div>
            <div className="text-[12px] font-mono font-bold text-amber-200 leading-tight">{timeStr}</div>
            <div className="text-[10px] text-[#E0F2FE] leading-tight font-medium">{dateStr}</div>
          </div>
        </div>

        {/* When in form mode, provide Cancel / Exit button. Otherwise show Modules switch button */}
        {isFormPage ? (
          <button
            type="button"
            onClick={handleCancelForm}
            title="Cancel & Exit Form"
            className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white bg-white/10 border border-white/25 hover:bg-white/20 hover:border-yellow-300/70 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden xs:inline">Cancel & Exit</span>
          </button>
        ) : (
          <Link
            to="/home"
            title="Switch module"
            className="no-print inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-white bg-white/10 border border-white/25 hover:bg-white/20 hover:border-yellow-300/70 transition-colors"
          >
            <LayoutGrid className="w-[15px] h-[15px] text-yellow-300" />
            <span className="hidden md:inline">Modules</span>
          </Link>
        )}
      </div>
    </header>
  );
}
