import React, { useState } from 'react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, isOpen = false, onClose }) => {
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'manager' | 'cashier' | 'chef' | 'waiter' | 'customer'>('all');

  const roleCategories = [
    {
      roleId: 'manager',
      roleName: 'پنل مدیریت (Manager)',
      roleIcon: 'manage_accounts',
      items: [
        { path: 'dashboard', label: 'داشبورد کلان', icon: 'space_dashboard' },
        { path: 'tables-hall', label: 'نقشه میزها و تخصیص سالن', icon: 'table_restaurant' },
        { path: 'menu-management', label: 'مدیریت منو و تصاویر', icon: 'menu_book' },
        { path: 'staff-personnel', label: 'پرسنل و منابع بشری', icon: 'badge' },
        { path: 'customer-club', label: 'باشگاه مشتریان (CRM)', icon: 'loyalty' },
        { path: 'inventory-expenses', label: 'انبارداری و مصارف', icon: 'inventory_2' },
        { path: 'devices-hub', label: 'دستگاه‌ها و پایانه‌ها', icon: 'devices' },
        { path: 'system-settings', label: 'تنظیمات عمومی و فاکتور', icon: 'settings' },
      ]
    },
    {
      roleId: 'cashier',
      roleName: 'پایانه صندوق‌دار (Cashier)',
      roleIcon: 'point_of_sale',
      items: [
        { path: 'cashier-billing', label: 'صندوق و ثبت فاکتور', icon: 'payments' },
        { path: 'split-payment', label: 'تسویه سر میز و دُنگ', icon: 'pie_chart' },
        { path: 'active-orders', label: 'سفارشات فعال', icon: 'receipt_long' },
      ]
    },
    {
      roleId: 'chef',
      roleName: 'سرآشپز و مطبخ (Head Chef)',
      roleIcon: 'skillet',
      items: [
        { path: 'kitchen-kds', label: 'مانیتور زنده KDS مطبخ', icon: 'soup_kitchen' },
      ]
    },
    {
      roleId: 'waiter',
      roleName: 'تبلت گارسون (Waiter)',
      roleIcon: 'badge',
      items: [
        { path: 'quick-order', label: 'تبلت سفارش‌گیر گارسون', icon: 'touch_app' },
        { path: 'tables-hall', label: 'مشاهده وضعیت میزهای سالن', icon: 'deck' },
      ]
    },
    {
      roleId: 'customer',
      roleName: 'پورتال مهمان سر میز (Customer)',
      roleIcon: 'smartphone',
      items: [
        { path: 'guest-portal', label: 'موبایل مهمانان سر میز', icon: 'qr_code_scanner' },
      ]
    }
  ];

  const loggedInRole = localStorage.getItem('saffron_user_role') || 'customer';

  // Only allow categories belonging to the user's logged-in role (Managers see all)
  const allowedCategories = roleCategories.filter(cat => {
    if (loggedInRole === 'manager') return true;
    return cat.roleId === loggedInRole;
  });

  const filteredCategories = allowedCategories.filter(cat => {
    if (activeRoleFilter === 'all') return true;
    return cat.roleId === activeRoleFilter;
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      )}

      <aside className={`fixed right-0 top-0 h-full w-72 bg-[#120d0a]/95 backdrop-blur-2xl z-50 flex flex-col justify-between py-4 shadow-2xl border-l border-[#3a3330]/40 select-none transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col min-h-0 flex-grow">
          {/* Brand */}
          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if (loggedInRole === 'manager') { onNavigate('dashboard'); } else if (loggedInRole === 'cashier') { onNavigate('cashier-billing'); } else if (loggedInRole === 'chef') { onNavigate('kitchen-kds'); } else if (loggedInRole === 'waiter') { onNavigate('quick-order'); } if (onClose) onClose(); }}>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">restaurant</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-bold text-primary tracking-tight font-['Plus_Jakarta_Sans']">زعفران و نارنج</span>
                <span className="text-[11px] text-[#e2bfb2]/70">سامانه نقش‌محور مدیریت</span>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          <div className="px-4 my-2">
            <div className="h-px w-full bg-[#3a3330]/60"></div>
          </div>

          {/* Role Category Selector Pills - ONLY visible for Manager */}
          {loggedInRole === 'manager' && (
            <div className="px-4 mb-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 shrink-0">
              {[
                { id: 'all', label: 'همه' },
                { id: 'manager', label: 'مدیر' },
                { id: 'cashier', label: 'صندوق' },
                { id: 'chef', label: 'مطبخ' },
                { id: 'waiter', label: 'گارسون' },
                { id: 'customer', label: 'مهمان' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveRoleFilter(r.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeRoleFilter === r.id
                      ? 'bg-[#f66018] text-white shadow-sm'
                      : 'bg-[#201a17] text-[#e2bfb2] hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

        {/* Navigation Categories */}
        <nav className="flex flex-col gap-4 px-4 overflow-y-auto flex-grow max-h-[calc(100vh-210px)]">
          {filteredCategories.map(cat => (
            <div key={cat.roleId} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-[#f9bd22] bg-white/5 rounded-md">
                <span className="material-symbols-outlined text-[15px]">{cat.roleIcon}</span>
                <span>{cat.roleName}</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {cat.items.map((item, idx) => {
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path + idx}
                      onClick={() => onNavigate(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-right w-full ${
                        isActive
                          ? 'bg-[#f66018] text-white font-bold shadow-[0_0_18px_rgba(234,88,12,0.35)]'
                          : 'text-[#e2bfb2] hover:bg-[#2f2925] hover:text-[#ece0da] font-medium'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span className="text-[13px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Status & Logout */}
      <div className="px-4 pt-2 flex flex-col gap-2">
        <button
          onClick={() => onNavigate('login')}
          className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 border border-red-500/20 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>خروج از حساب کاری</span>
        </button>
      </div>
    </aside>
    </>
  );
};
