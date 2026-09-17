import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SidebarMenuItem({ icon: Icon, label, path, end, collapsed, onLinkClick, onClick, active }) {
  const baseClass = 'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150 w-full';
  const inactiveClass = 'text-[#C9CEDA] hover:bg-white/5 hover:text-[#F5EFE1]';
  const activeClass = 'bg-brass/20 text-brass-light';

  const content = (
    <>
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (path) {
    return (
      <NavLink
        to={path}
        end={end}
        onClick={onLinkClick}
        title={collapsed ? label : undefined}
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`${baseClass} ${active ? activeClass : inactiveClass}`}
    >
      {content}
    </button>
  );
}
