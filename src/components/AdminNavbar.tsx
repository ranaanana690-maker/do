import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Layers, Archive, BarChart3, Mail, LogOut, RefreshCcw, Sparkles,
  ChevronDown, User, Edit3, KeyRound, CheckCircle2, X, ShieldCheck
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

  // Profile Dropdown & Modal States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('مدير النظام');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Edit Name Modal
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Change Password Modal
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    // Load Admin User Session Details
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAdminEmail(session.user.email || '');
        const metaName = session.user.user_metadata?.full_name;
        const savedLocalName = localStorage.getItem('admin_display_name');
        if (metaName) {
          setAdminName(metaName);
        } else if (savedLocalName) {
          setAdminName(savedLocalName);
        }
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameInput.trim()) return;

    setSavingName(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { full_name: newNameInput.trim() }
      });

      if (updateErr) throw updateErr;

      setAdminName(newNameInput.trim());
      localStorage.setItem('admin_display_name', newNameInput.trim());
      setIsEditNameOpen(false);
    } catch (err: any) {
      console.error('Error updating name:', err);
      // Fallback local update if Supabase metadata isn't configured
      setAdminName(newNameInput.trim());
      localStorage.setItem('admin_display_name', newNameInput.trim());
      setIsEditNameOpen(false);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      alert('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error: passErr } = await supabase.auth.updateUser({
        password: newPasswordInput
      });

      if (passErr) throw passErr;

      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setIsPasswordOpen(false);
      }, 2500);
    } catch (err: any) {
      console.error('Error changing password:', err);
      alert(`فشل تغيير كلمة المرور: ${err.message || 'يرجى إعادة تسجيل الدخول والمحاولة'}`);
    } finally {
      setSavingPassword(false);
    }
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
                <span className="truncate max-w-[140px] sm:max-w-none">{title}</span>
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
          <div className="hidden lg:flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
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

          {/* Top Actions: Refresh & Admin Profile Dropdown */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="تحديث البيانات"
                className="p-2.5 text-slate-500 hover:text-emerald-600 bg-slate-100/80 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200/60 active:scale-95 cursor-pointer"
              >
                <RefreshCcw size={17} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}

            {/* Admin Profile Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs sm:text-sm py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-2xl border border-slate-200/80 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                  {adminName.charAt(0)}
                </div>
                <span className="truncate max-w-[90px] sm:max-w-[130px] font-bold">{adminName}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating User Dropdown Menu */}
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute left-0 mt-2.5 w-64 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150" dir="rtl">
                    
                    {/* User Card Header */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-xs font-extrabold text-slate-900 block truncate">{adminName}</span>
                      <span className="text-[11px] font-mono text-slate-500 block truncate dir-ltr text-right">{adminEmail || 'admin@mascara-services.dz'}</span>
                      <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md mt-1">مدير رئيسي للنظام</span>
                    </div>

                    {/* Action Items */}
                    <div className="space-y-1 pt-1">
                      <button
                        onClick={() => { setIsProfileOpen(false); setNewNameInput(adminName); setIsEditNameOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all text-right cursor-pointer"
                      >
                        <Edit3 size={15} className="text-emerald-600" />
                        تعديل الاسم الشخصي
                      </button>

                      <button
                        onClick={() => { setIsProfileOpen(false); setNewPasswordInput(''); setIsPasswordOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all text-right cursor-pointer"
                      >
                        <KeyRound size={15} className="text-blue-600" />
                        تغيير كلمة المرور
                      </button>
                    </div>

                    {/* Logout Section */}
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all text-right cursor-pointer"
                      >
                        <LogOut size={15} />
                        تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Modern Floating Bottom Navigation Dock for Mobile */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-1.5">
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

      {/* Edit Name Modal Popup */}
      {isEditNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Edit3 size={16} className="text-emerald-600" />
                تعديل الاسم الشخصي
              </h3>
              <button onClick={() => setIsEditNameOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">أدخل الاسم الشخصي الجديد:</label>
                <input
                  type="text"
                  required
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="مثال: د. أحمد البشير"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingName}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {savingName ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'حفظ الاسم'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditNameOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal Popup */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <KeyRound size={16} className="text-blue-600" />
                تغيير كلمة المرور
              </h3>
              <button onClick={() => setIsPasswordOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold p-4 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>تم تحديث كلمة المرور بنجاح!</span>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة:</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    dir="ltr"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    {savingPassword ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'تحديث كلمة المرور'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasswordOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
