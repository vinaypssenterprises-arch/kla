import React, { useState, useEffect } from 'react';
import { Menu, Clock, MapPin } from 'lucide-react';

export default function Header({ onToggleMobile }) {
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

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between py-3 px-5 lg:px-7 bg-[#000E89] border-b-[2px] border-yellow-400 gap-3 shadow-[0_4px_16px_rgba(0,14,137,0.35)]">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" className="icon-btn-dark lg:hidden flex-shrink-0 text-white" onClick={onToggleMobile} title="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[14.5px] text-white font-serif font-bold leading-tight truncate tracking-wide">
            17-A Proposals &amp; Status Register
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-[#E0F2FE] tracking-[0.05em] uppercase font-semibold">
              Petition &amp; Officer Register
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
          </div>
        </div>
      </div>

      {/* Live clock — right side */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 text-right">
        <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
        <div>
          <div className="text-[12px] font-mono font-bold text-amber-200 leading-tight">{timeStr}</div>
          <div className="text-[10px] text-[#E0F2FE] leading-tight font-medium">{dateStr}</div>
        </div>
      </div>
    </header>
  );
}
