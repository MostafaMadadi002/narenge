import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface LoginViewProps {
  onLoginSuccess: (role: string, username: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Setup form states (only if system hasn't been set up yet)
  const [setupUser, setSetupUser] = useState('');
  const [setupPass, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const loadPublicUsers = () => {
    api.getPublicStaffList()
      .then(res => {
        if (Array.isArray(res)) {
          setRegisteredUsers(res);
          if (res.length > 0) {
            setSelectedUser(res[0]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Check system status
    api.getStatus()
      .then(res => {
        setIsSetupCompleted(res.is_setup_completed);
        loadPublicUsers();
      })
      .catch(() => {
        setIsSetupCompleted(true);
        loadPublicUsers();
      });
  }, []);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setPassword('');
    setLoginError('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    if (!setupUser || !setupPass) {
      setSetupError('وارد کردن نام کاربری و رمز عبور الزامی است.');
      return;
    }
    try {
      const res = await api.setup({ username: setupUser, password: setupPass });
      if (res.token) {
        localStorage.setItem('saffron_token', res.token);
      }
      setIsSetupCompleted(true);
      alert('راه‌اندازی اولیه مدیر با موفقیت انجام شد. اکنون وارد شوید.');
      loadPublicUsers();
    } catch (err: any) {
      setSetupError(err.message || 'خطا در انجام راه‌اندازی.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!selectedUser) {
      setLoginError('لطفاً ابتدا حساب کاربری خود را انتخاب کنید.');
      return;
    }

    if (!password) {
      setLoginError('لطفاً رمز عبور را وارد نمایید.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.login({ username: selectedUser.username, password });
      
      // Store session token and role
      if (res.token) {
        localStorage.setItem('saffron_token', res.token);
      }
      localStorage.setItem('saffron_credentials', btoa(selectedUser.username + ':' + password));
      localStorage.setItem('saffron_user_role', res.role);
      localStorage.setItem('saffron_username', res.username);
      
      onLoginSuccess(res.role, res.username);
    } catch (err: any) {
      setLoginError(err.message || 'رمز عبور وارد شده نادرست است.');
      setIsLoading(false);
      passwordInputRef.current?.focus();
    }
  };

  // Helper for role label & badge colors
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'manager':
        return { label: 'مدیریت کل', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'chef':
        return { label: 'سرآشپز ارشد', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'cashier':
        return { label: 'صندوق‌دار', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'waiter':
      default:
        return { label: 'گارسون سالن', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
  };

  // If system setup not completed
  if (isSetupCompleted === false) {
    return (
      <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-[#18120f] text-[#ece0da]">
        <section className="w-full lg:w-[45%] min-h-screen flex flex-col justify-between p-8 bg-[#201a17] z-10 shadow-2xl relative overflow-y-auto">
          <div className="max-w-[400px] w-full mx-auto my-auto py-4">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f66018] to-[#f9bd22] flex items-center justify-center text-[#4f1700] shadow-xl mb-3">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">زعفران و نارنج</h1>
              <span className="text-xs text-[#e2bfb2] mt-1">سامانه مدیریت داخلی و POS رستوران</span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-extrabold text-white mb-2">راه‌اندازی اولیه مدیر سیستم</h2>
              <p className="text-xs text-[#e2bfb2]">هیچ حساب مدیری یافت نشد. حساب مدیریت کل را تعریف کنید.</p>
            </div>

            <form onSubmit={handleSetupSubmit} className="space-y-4">
              {setupError && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl font-bold">
                  {setupError}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#e2bfb2]">نام کاربری ارشد</label>
                <input
                  type="text"
                  placeholder="مثال: admin"
                  value={setupUser}
                  onChange={(e) => setSetupUser(e.target.value)}
                  className="w-full px-4 py-3 bg-[#120d0a] border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[#f66018]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#e2bfb2]">رمز عبور ارشد</label>
                <input
                  type="password"
                  placeholder="رمز عبور مدیریتی"
                  value={setupPass}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#120d0a] border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[#f66018]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#f66018] to-[#b73b01] hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all text-sm mt-4"
              >
                ایجاد و ثبت حساب مدیر ارشد
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-[#18120f] text-[#ece0da]">
      {/* Left/Main Login Panel */}
      <section className="w-full lg:w-[48%] xl:w-[44%] min-h-screen flex flex-col justify-between p-6 sm:p-10 bg-[#201a17]/95 backdrop-blur-2xl z-10 shadow-2xl relative overflow-y-auto border-l border-white/5">
        {/* Brand Tag */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f66018]/15 text-[#ffb599] border border-[#f66018]/30 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>رستوران زعفران و نارنج • شعبه مرکزی کابل</span>
          </div>
        </div>

        <div className="max-w-[460px] w-full mx-auto my-auto py-2">
          {/* Header Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f66018] to-[#f9bd22] flex items-center justify-center text-[#4f1700] shadow-xl shadow-orange-500/20 mb-3">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">ورود پرسنل و مدیریت</h1>
            <p className="text-xs text-[#e2bfb2] mt-1">
              پروفایل خود را از لیست زیر انتخاب کنید و با وارد کردن رمز عبور وارد شوید.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl font-bold flex items-center gap-2 animate-shake">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{loginError}</span>
              </div>
            )}

            {/* User Dropdown Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#f9bd22] text-[18px]">badge</span>
                  <span>انتخاب کاربر از لیست پرسنل و مدیریت:</span>
                </label>
                <span className="text-[11px] text-[#ffb599] font-mono">
                  {registeredUsers.length} کاربر
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedUser?.username || ''}
                  onChange={(e) => {
                    const found = registeredUsers.find(u => u.username === e.target.value);
                    if (found) handleSelectUser(found);
                  }}
                  className="w-full px-4 py-3.5 bg-[#120d0a] border border-white/15 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#f66018] focus:ring-2 focus:ring-[#f66018]/20 appearance-none cursor-pointer pr-4 pl-10 shadow-inner"
                >
                  <option value="" disabled>-- انتخاب نام خود از منوی کشویی --</option>
                  {registeredUsers.map((user) => {
                    const roleBadge = getRoleBadge(user.role);
                    return (
                      <option key={user.username} value={user.username} className="bg-[#1c1511] text-white py-2">
                        {user.name} ({roleBadge.label} - {user.username})
                      </option>
                    );
                  })}
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#ffb599] flex items-center">
                  <span className="material-symbols-outlined text-[24px]">arrow_drop_down</span>
                </div>
              </div>
            </div>

            {/* Selected User Password Input Field */}
            {selectedUser && (
              <div className="bg-[#120d0a]/90 p-4 rounded-2xl border border-white/10 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#f9bd22] text-[18px]">lock</span>
                    <span>رمز عبور «{selectedUser.name}»:</span>
                  </label>
                  <span className="text-[10px] text-[#ffb599] font-mono">
                    کد: {selectedUser.username}
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور حساب خود را وارد کنید..."
                    autoFocus
                    className="w-full px-4 py-3 bg-[#1e1713] border border-white/15 rounded-xl text-sm font-bold text-white placeholder:text-[#88776f] focus:outline-none focus:border-[#f66018] tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e2bfb2] hover:text-white p-1"
                    title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !selectedUser}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#f66018] to-[#b73b01] hover:brightness-110 active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              <span>{isLoading ? 'در حال تایید و ورود...' : `ورود به حساب ${selectedUser ? selectedUser.name : ''}`}</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <footer className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#e2bfb2]">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>سامانه داخلی و شبکه محلی فعال</span>
          </div>
          <span className="font-mono text-[11px] text-[#ffb599]">نسخه پیشرفته ۴.۳</span>
        </footer>
      </section>

      {/* Right/Hero Visual Showcase (Desktop) */}
      <section className="hidden lg:block lg:w-[52%] xl:w-[56%] relative bg-[#120d0a] overflow-hidden select-none">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1600"
            alt="زعفران و نارنج"
            className="w-full h-full object-cover filter saturate-125 brightness-75 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#18120f] via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#18120f] via-transparent to-black/30"></div>
        </div>

        {/* Ambient Overlay Quote & Badge */}
        <div className="absolute bottom-12 right-12 left-12 p-8 rounded-3xl bg-[#1c1511]/85 backdrop-blur-xl border border-white/10 shadow-2xl max-w-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-[#f66018] animate-ping"></div>
            <span className="text-xs font-bold text-[#f9bd22] uppercase tracking-wider">میزبانی اصیل افغانی</span>
          </div>
          <h2 className="text-2xl font-black text-white leading-snug">
            طعم ماندگار اصالت در فضای سنتی و مدرن زعفران و نارنج
          </h2>
          <p className="text-xs text-[#e2bfb2] mt-2 leading-relaxed">
            سیستم مدیریت یکپارچه سالن، صندوق‌دار، نمایشگر KDS مطبخ و سفارش‌گیر دیجیتال سر میز برای مهمانان گرامی.
          </p>
        </div>
      </section>
    </div>
  );
};
