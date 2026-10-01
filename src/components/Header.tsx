import React from 'react';

interface HeaderProps {
  onSearch: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onToggleMobileMenu }) => {
  const username = localStorage.getItem('saffron_username') || 'ZN-101';
  const role = localStorage.getItem('saffron_user_role') || 'manager';

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'manager': return 'مدیر ارشد سیستم';
      case 'cashier': return 'صندوق‌دار شعبه';
      case 'chef': return 'سرآشپز مطبخ';
      case 'waiter': return 'گارسون سالن';
      default: return 'کاربر سیستم';
    }
  };

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'manager': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'cashier': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'chef': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'waiter': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-[#2f2925] text-[#e2bfb2] border-white/10';
    }
  };

  const initialLetter = username.substring(0, 2).toUpperCase();

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 bg-[#120d0a]/90 backdrop-blur-2xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#3a3330]/40">
      <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden w-9 h-9 rounded-xl bg-[#201a17] hover:bg-[#2f2925] border border-white/10 text-white flex items-center justify-center shadow"
            title="منوی ناوبری"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          <div className="flex items-center gap-2 bg-[#2f2925]/70 px-3 py-1.5 rounded-lg border border-[#3a3330]/50">
            <span className="material-symbols-outlined text-[#ffb599] text-[18px]">storefront</span>
            <span className="text-xs sm:text-[13px] font-medium text-[#ece0da] truncate">زعفران و نارنج • کابل</span>
          </div>
          <div className="hidden xl:flex items-center gap-2 bg-[#2f2925]/50 px-3.5 py-1.5 rounded-lg border border-[#3a3330]/30">
            <span className="material-symbols-outlined text-[#f9bd22] text-[18px]">calendar_today</span>
            <span className="text-[13px] text-[#e2bfb2]">سیستم آفلاین محلی</span>
          </div>
        </div>

        {/* Search Input Container with premium focus glow */}
        <div className="flex-1 max-w-md hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#201a17]/90 text-[#e2bfb2] focus-within:bg-[#29201c] focus-within:text-[#ece0da] focus-within:ring-2 focus-within:ring-[#f66018]/50 focus-within:border-[#f66018]/60 transition-all duration-300 border border-[#3a3330]/60 shadow-inner">
          <span className="material-symbols-outlined text-[#f66018] text-[20px]">search</span>
          <input
            type="text"
            onChange={(e) => onSearch(e.target.value)}
            placeholder="جستجوی سریع بل، کد غذا یا سفارش..."
            className="w-full bg-transparent border-0 outline-none text-[13px] text-[#ece0da] placeholder:text-[#e2bfb2]/55 font-semibold"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-[#b88900]/20 px-3 py-1.5 rounded-lg text-[#f9bd22] border border-[#b88900]/30">
            <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
            <span className="text-[12px] font-semibold">پایا و همگام</span>
          </div>
          <button className="relative p-2 rounded-lg hover:bg-[#2f2925] text-[#e2bfb2] hover:text-[#ece0da] transition-colors">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#f66018]"></span>
          </button>
          <div className="h-6 w-px bg-[#3a3330]/60"></div>
          
          {/* Dynamic User Profile info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:flex flex-col">
              <span className="text-[14px] font-bold text-[#ece0da] font-mono">{username}</span>
              <span className="text-[11px] text-[#e2bfb2] font-semibold">{getRoleLabel(role)}</span>
            </div>
            
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ring-2 ring-orange-500/30 border ${getRoleColor(role)}`}>
              {initialLetter}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
