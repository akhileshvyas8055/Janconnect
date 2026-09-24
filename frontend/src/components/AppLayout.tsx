import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  ShieldAlert,
  Map,
  BarChart3,
  Construction,
  MapPin,
  LogOut,
  Building2,
  Menu,
  X,
  User,
  Plus,
  BrainCircuit
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenComplaintModal?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenComplaintModal }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isCitizen = user?.role === 'Citizen';
  const isOfficer = user?.role === 'Officer';
  const canAccessCivicIntelligence = user?.role === 'Officer' || user?.role === 'Admin' || user?.role === 'Higher Authority';

  const navItems = [
    ...(isCitizen
      ? [{ label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard }]
      : []),
    ...(isOfficer
      ? [{ label: 'Command Center', path: '/officer', icon: ShieldAlert }]
      : []),
    ...(isCitizen
      ? [{ label: 'Issues Near You', path: '/nearby', icon: MapPin }]
      : []),
    { label: 'Strategic Map', path: '/map', icon: Map },
    { label: 'Public Works', path: '/projects', icon: Construction },
    { label: 'Transparency', path: '/transparency', icon: BarChart3 },
    ...(canAccessCivicIntelligence
      ? [{ label: 'Civic Intelligence', path: '/civic-intelligence', icon: BrainCircuit }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-white/10 shrink-0 select-none">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
              JC
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-none block">
                JanConnect
              </span>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                CivicAI Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Action Button for Citizen */}
        {isCitizen && onOpenComplaintModal && (
          <div className="p-4">
            <button
              onClick={onOpenComplaintModal}
              className="w-full btn-primary flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus size={16} />
              <span>Report Grievance</span>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            Main Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile and Bottom Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name ? user.name.slice(0, 2) : <User size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.name || 'Authorized User'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                {isOfficer && <Building2 size={10} />}
                {isOfficer ? user?.department : user?.role}
              </p>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-white/10 shrink-0 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            JC
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base">
            JanConnect
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-white/10 z-40 p-4 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          {isCitizen && onOpenComplaintModal && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenComplaintModal();
              }}
              className="w-full btn-primary flex items-center justify-center gap-2 mb-3"
            >
              <Plus size={16} />
              <span>Report Grievance</span>
            </button>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Signed in as <b className="text-slate-900 dark:text-white">{user?.name}</b>
            </span>
            <button
              onClick={logout}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
