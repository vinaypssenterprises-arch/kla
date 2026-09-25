import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function SidebarSubMenu({ icon: Icon, label, children, collapsed, active, expanded, onToggle, onLinkClick }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 ${
          active ? 'bg-white/20 text-white font-bold border-r-4 border-yellow-300' : 'text-[#DCE4FA] hover:bg-white/15 hover:text-white'
        }`}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
        {!collapsed && (
          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>

      {!collapsed && (
        <div className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-[320px] mt-1' : 'max-h-0'}`}>
          <div className="flex flex-col gap-0.5 pl-[14px] ml-[19px] py-0.5 border-l border-white/20">
            {children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.end}
                onClick={onLinkClick}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-[12.5px] transition-colors duration-150 ${
                    isActive ? 'text-yellow-300 font-bold bg-white/15' : 'text-[#BAC8F5] hover:text-white hover:bg-white/10 font-medium'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
