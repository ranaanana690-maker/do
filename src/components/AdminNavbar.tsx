import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Layers, Archive, BarChart3, Mail, LogOut, RefreshCcw, Sparkles 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminNavbarProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  title,
  subtitle = 'مديرية الخدمات الجامعية معسكر',
  badgeText,
  onRefresh,
  isLoading = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    {
      path: '/admin',
      label: 'الجارية',
      fullLabel: 'الطلبات الجارية',
      icon: Layers,
    },
    {
      path: '/admin/completed',
      label: 'الأرشيف',
      fullLabel: 'أرشيف المكتملة',
      icon: Archive,
    },
    {
      path: '/admin/analytics',
      label: 'الإحصائيات',
      fullLabel: 'مرصد الإحصائيات',
      icon: BarChart3,
    },
    {
      path: '/admin/email-template',
      label: 'البريد',
      fullLabel: 'استوديو البريد (Resend)',
      icon: Mail,
    },
  ];

  return (
    <>
      {/* Top Navbar Header (Ultra-Sleek Modern Glass Header) */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Page Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-2xl p-1 flex items-center justify-center shrink-0 shadow-xs border border-slate-200/80 overflow-hidden">
              <img src="/logo.JPG" alt="الشعار" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="truncate max-w-[170px] sm:max-w-none">{title}</span>
                {badgeText && (
                  <span className="text-[10px] sm:text-xs bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-xs animate-pulse shrink-0">
                    {badgeText}
                  </span>
                )}
              </h1>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (Pill Style Modern SaaS Tabs) */}
          <div className="hidden sm:flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 font-bold text-xs md:text-sm py-2 px-3.5 md:px-4 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{item.fullLabel}</span>
                </Link>
              );
            })}
          </div>

          {/* Top Actions (Refresh & Logout Buttons) */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="تحديث البيانات"
                className="p-2.5 text-slate-500 hover:text-emerald-600 bg-slate-100/80 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200/60 active:scale-95"
              >
                <RefreshCcw size={17} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-red-600 text-white font-extrabold text-xs sm:text-sm py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl transition-all shadow-xs active:scale-95"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* Modern Floating Bottom Navigation Dock for Mobile */}
      <nav className="sm:hidden fixed bottom-3 inset-x-3 z-40 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-1.5">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-700 font-extrabold' 
                    : 'text-slate-400 hover:text-slate-800 font-medium'
                }`}
              >
                <div className={`p-1 rounded-xl transition-transform ${isActive ? 'scale-110 text-emerald-600' : ''}`}>
                  <Icon size={19} />
                </div>
                <span className="text-[10px] mt-0.5 leading-none">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
