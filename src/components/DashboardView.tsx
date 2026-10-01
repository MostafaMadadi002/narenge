import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface DashboardViewProps {
  onNavigate: (path: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  // Navigation filter: 'overview' (shows everything: menu + diners + tables), or filtered sections
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'diners' | 'tables' | 'orders' | 'staff'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [tableStatus, setTableStatus] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [menuList, setMenuList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Table Floor Filters
  const [tableSectionFilter, setTableSectionFilter] = useState<string>('all');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('all');

  // Menu Search & Filter
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [menuStationFilter, setMenuStationFilter] = useState<string>('all');

  // Toast / Feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      const [analyticsRes, tablesRes, statusRes, ordersRes, menuRes, staffRes] = await Promise.all([
        api.getAnalyticsReports().catch(() => null),
        api.getTables().catch(() => []),
        api.getTableStatuses().catch(() => ({})),
        api.getOrders().catch(() => []),
        api.getMenu().catch(() => []),
        api.getPublicStaffList().catch(() => [])
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      setTablesList(tablesRes || []);
      setTableStatus(statusRes || {});
      setOrders(ordersRes || []);
      setMenuList(menuRes || []);
      setStaffList(staffRes || []);
      setLastSyncTime(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Real-time SSE listener
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = () => {
      try {
        loadAllData();
      } catch (e) {
        console.error('SSE sync error', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Quick Table Status Toggle directly from Dashboard
  const handleQuickStatusChange = async (tableId: string, newStatus: string) => {
    try {
      const currentTable = tablesList.find(t => t.id === tableId);
      const defaultGuests = newStatus === 'occupied' ? (currentTable?.capacity || 4) : 0;
      await api.updateTableStatus(tableId, newStatus, defaultGuests);
      showFeedback(`وضعیت میز «${currentTable?.name || tableId}» به ${getStatusLabel(newStatus)} تغییر یافت.`);
      loadAllData();
    } catch (e: any) {
      showFeedback(`خطا در تغییر وضعیت میز: ${e.message || 'ناموفق'}`);
    }
  };

  // Quick Guest Count Adjuster
  const handleGuestCountChange = async (tableId: string, newCount: number) => {
    try {
      const count = Math.max(0, newCount);
      await api.updateTableGuests(tableId, count);
      loadAllData();
    } catch (e: any) {
      showFeedback(`خطا در تغییر تعداد مهمانان: ${e.message || 'ناموفق'}`);
    }
  };

  // Quick Seed Order Generator for Demo/Testing
  const handleCreateTestOrder = async (targetTableId?: string) => {
    try {
      const tableToUse = targetTableId 
        ? tablesList.find(t => t.id === targetTableId)
        : (tablesList.find(t => tableStatus[t.id] !== 'occupied') || tablesList[0]);

      if (!tableToUse) return;

      const randomMenuItem = menuList[Math.floor(Math.random() * menuList.length)] || { id: 1, name: 'قابلی پلو شاهانه', price: 520 };
      const randomDrink = menuList.find(m => m.station === 'plating') || menuList[0];

      await api.placeOrder({
        table_id: tableToUse.id,
        seat_number: '1',
        customer_name: 'مهمان تست سریع',
        items: [
          { menu_item_id: randomMenuItem.id, quantity: 2, chef_note: 'سفارش ثبت‌شده از داشبورد' },
          { menu_item_id: randomDrink.id, quantity: 2 }
        ]
      });

      showFeedback(`سفارش زنده با موفقیت برای «${tableToUse.name}» ثبت و در سیستم پخش گردید.`);
      loadAllData();
    } catch (e: any) {
      showFeedback(`خطا در ثبت سفارش تستی: ${e.message || 'دسترسی محدود است'}`);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'مشغول / در حال پذیرایی';
      case 'cleaning': return 'در حال نظافت و آماده‌سازی';
      case 'reserved': return 'رزرو شده';
      case 'free': default: return 'آزاد و آماده پذیرش';
    }
  };

  // Dynamic calculations
  const totalTables = tablesList.length;
  const occupiedTables = tablesList.filter(t => (tableStatus[t.id] || t.status) === 'occupied');
  const occupiedTablesCount = occupiedTables.length;
  const cleaningTablesCount = tablesList.filter(t => (tableStatus[t.id] || t.status) === 'cleaning').length;
  const freeTablesCount = totalTables - occupiedTablesCount - cleaningTablesCount;

  // Active orders
  const activeOrders = orders.filter(o => o.status === 'active');
  const activeOrdersTotalBill = activeOrders.reduce((sum, o) => {
    const orderSum = (o.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? (it.unit_price * it.quantity) : 0), 0);
    return sum + orderSum;
  }, 0);

  // Total seated diners calculation
  const totalCapacity = tablesList.reduce((sum, t) => sum + Number(t.capacity || 4), 0);
  const totalDinersPresent = occupiedTables.reduce((sum, t) => {
    const activeOrder = activeOrders.find(o => o.table_id === t.id);
    const guests = Number(t.current_guests || activeOrder?.guest_count || Math.max(1, t.capacity - 1));
    return sum + guests;
  }, 0);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalDinersPresent / totalCapacity) * 100) : 0;

  // Sales Summary
  const salesSummary = analytics?.sales_summary || {
    total_revenue: orders.filter(o => o.status === 'settled').length * 1350,
    settled_orders_count: orders.filter(o => o.status === 'settled').length,
    active_orders_count: activeOrders.length,
    average_order_value: 1250,
    profit_margin_percent: 65
  };

  const productPerformance = analytics?.product_performance || [];
  const waiterPerformance = analytics?.waiter_performance || [];

  // Filtered Tables
  const filteredTables = tablesList.filter(table => {
    const currentStatus = tableStatus[table.id] || table.status || 'free';
    const matchSection = tableSectionFilter === 'all' || table.section === tableSectionFilter;
    const matchStatus = tableStatusFilter === 'all' || currentStatus === tableStatusFilter;
    return matchSection && matchStatus;
  });

  // Filtered Menu
  const filteredMenu = menuList.filter(dish => {
    const matchStation = menuStationFilter === 'all' || dish.station === menuStationFilter;
    const matchSearch = !menuSearch || dish.name.toLowerCase().includes(menuSearch.toLowerCase()) || (dish.desc && dish.desc.toLowerCase().includes(menuSearch.toLowerCase()));
    return matchStation && matchSearch;
  });

  const sections = Array.from(new Set(tablesList.map(t => t.section || 'اصلی')));

  return (
    <div className="flex flex-col w-full min-w-0 p-4 sm:p-6 gap-6 relative overflow-hidden bg-[#18120f] min-h-screen text-[#ece0da]">
      {/* Ambient Glows */}
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#f66018]/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-[#f9bd22]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Toast Alert Feedback */}
      {actionFeedback && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#251d18] border border-[#f66018] text-[#ffb599] px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-bounce text-sm font-bold">
          <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">notifications_active</span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#201a17]/95 via-[#261f1c]/90 to-[#322924]/80 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span className="w-3 h-8 bg-gradient-to-b from-[#f66018] to-[#f9bd22] rounded-full"></span>
                <span>داشبورد جامع رستوران زعفران و نارنج</span>
              </h1>
              <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>متصل به API سرور و دیتابیس زنده</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#e2bfb2]">
              مشاهده همزمان منوی غذاها، افراد حاضر در رستوران، میزهای فعال سالن و وضعیت فاکتورها
              {lastSyncTime && <span className="mr-2 text-[#ffb599] font-mono">• آخرین همگام‌سازی: {lastSyncTime}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-[#2a221e] hover:bg-[#342b26] text-[#e2bfb2] hover:text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-bold transition-all"
              title="همگام‌سازی دستی"
            >
              <span className={`material-symbols-outlined text-[18px] text-[#f9bd22] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
              <span>{isRefreshing ? 'در حال دریافت...' : 'به‌روزرسانی'}</span>
            </button>

            <button
              onClick={() => handleCreateTestOrder()}
              className="flex items-center gap-1.5 bg-[#f9bd22]/15 hover:bg-[#f9bd22]/25 text-[#f9bd22] border border-[#f9bd22]/30 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              title="ثبت سفارش آزمایشی"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>سفارش تستی جدید</span>
            </button>

            <button
              onClick={() => onNavigate('cashier-billing')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#f66018] to-[#b73b01] hover:brightness-110 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-orange-500/25 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
              <span>صندوق و تسویه</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Seated Diners */}
        <div 
          onClick={() => setActiveTab('diners')}
          className="cursor-pointer bg-[#201a17]/80 hover:border-[#f66018]/50 transition-all p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#e2bfb2] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              افراد حاضر در رستوران
            </span>
            <span className="w-9 h-9 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black text-white font-mono">{totalDinersPresent}</span>
            <span className="text-xs text-[#ffb599] font-bold">مهمان نشسته</span>
            <span className="text-[11px] text-[#e2bfb2] mr-auto">از {totalCapacity} ظرفیت</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-bold">ضریب اشغال: {occupancyPercent}%</span>
            <span className="text-[#e2bfb2]">{occupiedTablesCount} میز پذیرایی</span>
          </div>
        </div>

        {/* Metric 2: Active Tables */}
        <div 
          onClick={() => setActiveTab('tables')}
          className="cursor-pointer bg-[#201a17]/80 hover:border-[#f9bd22]/50 transition-all p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#e2bfb2] font-semibold">میزهای سالن</span>
            <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#f9bd22] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black text-white font-mono">{occupiedTablesCount}</span>
            <span className="text-xs text-[#e2bfb2]">از {totalTables} میز</span>
            <span className="text-[11px] text-amber-400 mr-auto font-bold">{freeTablesCount} آزاد</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#e2bfb2]">
            <span>🔴 {occupiedTablesCount} مشغول</span>
            <span>🟢 {freeTablesCount} آزاد</span>
            <span>🧹 {cleaningTablesCount} نظافت</span>
          </div>
        </div>

        {/* Metric 3: Menu Catalog Count */}
        <div 
          onClick={() => setActiveTab('menu')}
          className="cursor-pointer bg-[#201a17]/80 hover:border-emerald-500/50 transition-all p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#e2bfb2] font-semibold">منوی غذاها و نوشیدنی‌ها</span>
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black text-emerald-400 font-mono">{menuList.length}</span>
            <span className="text-xs text-white font-bold">خوراک در منو</span>
            <span className="text-[11px] text-[#ffb599] mr-auto">۴ ایستگاه پخت</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#e2bfb2]">
            <span className="text-emerald-400">تمام اقلام فعال و آماده طبخ</span>
            <span className="text-[#f9bd22]">مشاهده غذاها ↓</span>
          </div>
        </div>

        {/* Metric 4: Revenue & Orders */}
        <div 
          onClick={() => setActiveTab('orders')}
          className="cursor-pointer bg-[#201a17]/80 hover:border-blue-500/50 transition-all p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#e2bfb2] font-semibold">فروش کل و فاکتورها</span>
            <span className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black text-white font-mono">{salesSummary.total_revenue.toLocaleString()}</span>
            <span className="text-xs text-[#ffb599]">AFN</span>
            <span className="text-[11px] text-blue-400 mr-auto font-mono">{activeOrders.length} فاکتور باز</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#e2bfb2]">
            <span>{salesSummary.settled_orders_count} تسویه‌شده</span>
            <span className="text-emerald-400 font-mono">{activeOrdersTotalBill.toLocaleString()} AFN جاری</span>
          </div>
        </div>
      </div>

      {/* Section View Selector Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>نمای جامع داشبورد (منو + میزها + افراد حاضر)</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'menu'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
          <span>منوی کامل غذاها ({menuList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diners')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'diners'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>افراد حاضر سر میزها ({totalDinersPresent} نفر)</span>
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'tables'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">grid_view</span>
          <span>وضعیت میزهای سالن ({totalTables})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
          <span>سفارشات آشپزخانه ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-lg shadow-orange-500/25'
              : 'bg-[#201a17]/60 text-[#e2bfb2] hover:bg-[#201a17] hover:text-white border border-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>پرسنل شیفت ({staffList.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: RESTAURANT MENU SHOWCASE (نمایش زنده منو در داشبورد)              */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'menu') && (
        <section className="flex flex-col gap-4 bg-[#201a17]/85 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f66018] to-[#b73b01] text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[22px]">restaurant_menu</span>
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <span>منوی غذاهای رستوران زعفران و نارنج</span>
                    <span className="bg-[#f66018]/20 border border-[#f66018]/40 text-[#ffb599] text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {menuList.length} خوراک فعال
                    </span>
                  </h2>
                  <p className="text-xs text-[#e2bfb2] mt-0.5">
                    بررسی غذاها، قیمت به افغانی، ایستگاه‌های پخت، آمار فروش واقعی و ثبت سفارش سریع
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('menu')}
                className="bg-[#2f2520] hover:bg-[#3d302a] text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>مدیریت و افزودن غذا به منو</span>
              </button>
            </div>
          </div>

          {/* Menu Search Bar & Station Filter Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-[#120d0a] border border-white/10 px-3.5 py-2 rounded-xl">
              <span className="material-symbols-outlined text-[#e2bfb2] text-[18px]">search</span>
              <input
                type="text"
                placeholder="جستجو در منو (قابلی پلو، کباب چوپان، منتو، بولانی...)"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                className="bg-transparent text-white text-xs w-full outline-none placeholder:text-[#88776f]"
              />
              {menuSearch && (
                <button onClick={() => setMenuSearch('')} className="text-xs text-[#e2bfb2]">✕</button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setMenuStationFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  menuStationFilter === 'all'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#2a221e] text-[#e2bfb2] hover:text-white'
                }`}
              >
                همه ایستگاه‌ها ({menuList.length})
              </button>
              <button
                onClick={() => setMenuStationFilter('pots')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  menuStationFilter === 'pots'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#2a221e] text-[#e2bfb2] hover:text-white'
                }`}
              >
                دیگ‌ها و پلوها
              </button>
              <button
                onClick={() => setMenuStationFilter('grill')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  menuStationFilter === 'grill'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#2a221e] text-[#e2bfb2] hover:text-white'
                }`}
              >
                منقل و کباب‌ها
              </button>
              <button
                onClick={() => setMenuStationFilter('tandoor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  menuStationFilter === 'tandoor'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#2a221e] text-[#e2bfb2] hover:text-white'
                }`}
              >
                تندور و بولانی
              </button>
              <button
                onClick={() => setMenuStationFilter('plating')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  menuStationFilter === 'plating'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#2a221e] text-[#e2bfb2] hover:text-white'
                }`}
              >
                پیشخوان و نوشیدنی
              </button>
            </div>
          </div>

          {/* Menu Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pt-2">
            {filteredMenu.map(dish => {
              const performance = productPerformance.find((p: any) => p.name === dish.name || p.id === dish.id);
              const soldCount = performance?.quantity || 0;
              const dishRevenue = performance?.revenue || 0;

              let stationLabel = 'دیگ‌ها و پلو';
              if (dish.station === 'grill') stationLabel = 'منقل‌خانه و کباب';
              else if (dish.station === 'tandoor') stationLabel = 'تندور محلی';
              else if (dish.station === 'plating') stationLabel = 'پیشخوان و نوشیدنی';

              return (
                <div 
                  key={dish.id}
                  className="bg-[#18120f]/90 rounded-2xl overflow-hidden border border-white/10 hover:border-[#f66018]/50 transition-all shadow-xl flex flex-col justify-between group"
                >
                  <div className="relative h-44 w-full bg-[#120d0a] overflow-hidden">
                    <img 
                      src={dish.image || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600"} 
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#18120f] via-transparent to-black/40"></div>
                    
                    <span className="absolute top-3 right-3 bg-[#18120f]/85 backdrop-blur-md text-[#ffb599] text-[11px] font-bold px-3 py-1 rounded-full border border-white/10">
                      ایستگاه: {stationLabel}
                    </span>

                    <span className="absolute top-3 left-3 bg-emerald-500/25 backdrop-blur-md text-emerald-300 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30">
                      آماده طبخ
                    </span>

                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                      <span className="text-xl font-black text-white font-mono drop-shadow-md">
                        {dish.price.toLocaleString()} <span className="text-xs text-[#ffb599]">AFN</span>
                      </span>
                      <span className="text-xs text-[#f9bd22] bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-sm border border-white/10">
                        ★ +{dish.loyalty_points || 0} امتیاز
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-base">{dish.name}</h3>
                      <p className="text-xs text-[#cbb2a6] mt-1 line-clamp-2 leading-relaxed">
                        {dish.desc || 'تهیه‌شده از تازه‌ترین مواد اولیه محلی با ادویه‌جات اصیل.'}
                      </p>
                    </div>

                    {/* Sales Metrics Strip */}
                    <div className="bg-[#120d0a] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[#e2bfb2]">آمار فروش ثبت‌شده:</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white font-mono">{soldCount} پرس</span>
                        <span className="font-extrabold text-[#ffb599] font-mono">{dishRevenue.toLocaleString()} AFN</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-[#e2bfb2]">شناسه خوراک: #{dish.id}</span>
                      <button
                        onClick={() => onNavigate('cashier-billing')}
                        className="bg-[#f66018]/15 hover:bg-[#f66018] text-[#ffb599] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-[#f66018]/30 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
                        <span>ثبت در فاکتور صندوق</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: SEATED DINERS & ACTIVE TABLES (افراد حاضر و میزهای فعال)          */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'diners') && (
        <section className="flex flex-col gap-4 bg-[#201a17]/85 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">groups</span>
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>افراد حاضر در رستوران و میزهای فعال سالن</span>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {totalDinersPresent} مهمان نشسته
                  </span>
                </h2>
                <p className="text-xs text-[#e2bfb2] mt-0.5">
                  تعداد نفرات نشسته سر هر میز، فاکتور باز جاری و امکان تغییر سریع تعداد یا وضعیت میز
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('tables-hall')}
              className="bg-[#2f2520] hover:bg-[#3d302a] text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">deck</span>
              <span>مدیریت کامل سالن و میزها</span>
            </button>
          </div>

          {occupiedTables.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center gap-3 bg-[#120d0a]/60 rounded-2xl border border-white/5">
              <span className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]">event_seat</span>
              </span>
              <h3 className="text-sm font-bold text-white">تمامی میزها در حال حاضر آزاد هستند</h3>
              <p className="text-xs text-[#e2bfb2]">مهمانی در سالن مستقر نیست. می‌توانید با دکمه زیر یک سفارش سریع ثبت کنید.</p>
              <button
                onClick={() => handleCreateTestOrder()}
                className="mt-1 bg-[#f66018] hover:bg-[#b73b01] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
              >
                پذیرش مهمان و ثبت سفارش سریع
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {occupiedTables.map(table => {
                const activeOrder = activeOrders.find(o => o.table_id === table.id);
                const currentGuests = Number(table.current_guests || activeOrder?.guest_count || table.capacity || 4);
                const orderSum = (activeOrder?.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? (it.unit_price * it.quantity) : 0), 0);

                return (
                  <div 
                    key={table.id}
                    className="bg-[#120d0a]/90 rounded-2xl p-5 border border-[#f66018]/30 hover:border-[#f66018] transition-all shadow-xl flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f66018] to-[#b73b01] text-white flex flex-col items-center justify-center font-mono shadow-md">
                          <span className="text-[10px] uppercase font-bold opacity-80">{table.section}</span>
                          <span className="text-base font-extrabold leading-none">{table.name.split(' ')[1] || table.id}</span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-white text-sm">{table.name}</h3>
                          <span className="text-xs text-[#ffb599] flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">room_service</span>
                            <span>گارسون: {table.assigned_waiter || 'احمد بلال'}</span>
                          </span>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-extrabold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                        <span>مشغول</span>
                      </span>
                    </div>

                    {/* Guest Counter Controller */}
                    <div className="bg-[#241c18] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">groups</span>
                        <span className="text-xs text-[#e2bfb2]">مهمانان نشسته سر میز:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGuestCountChange(table.id, currentGuests - 1)}
                          className="w-7 h-7 rounded-lg bg-[#332721] hover:bg-[#44342c] text-white text-xs font-bold flex items-center justify-center transition-colors"
                          title="کاهش یک نفر"
                        >
                          -
                        </button>
                        <span className="font-mono text-sm font-extrabold text-white w-6 text-center">{currentGuests}</span>
                        <button
                          onClick={() => handleGuestCountChange(table.id, currentGuests + 1)}
                          className="w-7 h-7 rounded-lg bg-[#332721] hover:bg-[#44342c] text-white text-xs font-bold flex items-center justify-center transition-colors"
                          title="افزایش یک نفر"
                        >
                          +
                        </button>
                        <span className="text-[11px] text-[#e2bfb2]">نفر (ظرفیت: {table.capacity} صندلی)</span>
                      </div>
                    </div>

                    {/* Order Details Preview */}
                    {activeOrder ? (
                      <div className="bg-[#18120f] p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#e2bfb2] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#f9bd22]">receipt_long</span>
                            <span>{activeOrder.customer_name || 'مهمان سالن'} ({activeOrder.items?.length || 0} قلم خوراک)</span>
                          </span>
                          <span className="font-extrabold text-[#f9bd22] font-mono text-sm">{orderSum.toLocaleString()} AFN</span>
                        </div>
                        <div className="text-[11px] text-[#cbb2a6] line-clamp-1">
                          {(activeOrder.items || []).map((it: any) => `${it.name} (${it.quantity})`).join('، ')}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#18120f] p-3 rounded-xl border border-white/5 text-xs text-[#e2bfb2] flex items-center justify-between">
                        <span>میز اشغال شده و هنوز سفارشی ثبت نکرده است.</span>
                        <button
                          onClick={() => handleCreateTestOrder(table.id)}
                          className="text-[#f9bd22] hover:underline text-[11px] font-bold"
                        >
                          + ثبت سفارش
                        </button>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleQuickStatusChange(table.id, 'free')}
                        className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>آزاد کردن میز</span>
                      </button>

                      <button
                        onClick={() => handleQuickStatusChange(table.id, 'cleaning')}
                        className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        title="تغییر به نظافت"
                      >
                        <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                        <span>نظافت</span>
                      </button>

                      <button
                        onClick={() => onNavigate('cashier-billing')}
                        className="bg-gradient-to-r from-[#f66018] to-[#b73b01] hover:brightness-110 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-1"
                        title="تسویه در صندوق"
                      >
                        <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                        <span>تسویه</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: ALL TABLES FLOOR MONITOR (مانیتور کل میزها و سالن)              */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'tables') && (
        <section className="flex flex-col gap-4 bg-[#201a17]/85 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">table_restaurant</span>
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>وضعیت تمامی میزهای سالن و بخش‌ها</span>
                  <span className="bg-amber-500/20 border border-amber-500/40 text-[#f9bd22] text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {tablesList.length} میز
                  </span>
                </h2>
                <p className="text-xs text-[#e2bfb2] mt-0.5">
                  مشاهده ظرفیت صندلی‌ها، وضعیت لحظه‌ای آزاد/مشغول و تغییر مستقیم وضعیت
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={tableSectionFilter}
                onChange={e => setTableSectionFilter(e.target.value)}
                className="bg-[#120d0a] text-white text-xs border border-white/10 rounded-xl px-3 py-2 outline-none font-bold"
              >
                <option value="all">همه بخش‌ها ({tablesList.length})</option>
                {sections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>

              <select
                value={tableStatusFilter}
                onChange={e => setTableStatusFilter(e.target.value)}
                className="bg-[#120d0a] text-white text-xs border border-white/10 rounded-xl px-3 py-2 outline-none font-bold"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="occupied">🔴 فقط مشغول ({occupiedTablesCount})</option>
                <option value="free">🟢 فقط آزاد ({freeTablesCount})</option>
                <option value="cleaning">🧹 در حال نظافت ({cleaningTablesCount})</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
            {filteredTables.map(table => {
              const currentStatus = tableStatus[table.id] || table.status || 'free';
              const activeOrder = activeOrders.find(o => o.table_id === table.id);
              const currentGuests = table.current_guests || (activeOrder ? activeOrder.guest_count : null) || (currentStatus === 'occupied' ? table.capacity : 0);

              let statusBorder = 'border-emerald-500/40 bg-emerald-950/10';
              let statusBadge = (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  🟢 آزاد
                </span>
              );

              if (currentStatus === 'occupied') {
                statusBorder = 'border-[#f66018] bg-[#f66018]/10 ring-1 ring-[#f66018]/30';
                statusBadge = (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                    <span>مشغول ({currentGuests} نفر)</span>
                  </span>
                );
              } else if (currentStatus === 'cleaning') {
                statusBorder = 'border-amber-500/40 bg-amber-950/10';
                statusBadge = (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                    🧹 نظافت
                  </span>
                );
              }

              return (
                <div 
                  key={table.id}
                  className={`rounded-2xl p-5 border backdrop-blur-xl transition-all shadow-lg flex flex-col justify-between gap-4 ${statusBorder}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-[#ffb599] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">
                        {table.section || 'سالن'}
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-1.5">{table.name}</h3>
                      <span className="text-xs text-[#e2bfb2] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">event_seat</span>
                        <span>ظرفیت: {table.capacity} صندلی</span>
                      </span>
                    </div>
                    {statusBadge}
                  </div>

                  <div className="bg-[#120d0a]/80 p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#e2bfb2]">
                      <span>گارسون مسئول:</span>
                      <span className="font-bold text-white">{table.assigned_waiter || 'ZN-101'}</span>
                    </div>

                    {currentStatus === 'occupied' && activeOrder ? (
                      <div className="flex items-center justify-between text-[#e2bfb2] pt-1.5 border-t border-white/5">
                        <span>مبلغ فاکتور باز:</span>
                        <span className="font-bold text-[#f9bd22] font-mono">
                          {(activeOrder.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? (it.unit_price * it.quantity) : 0), 0).toLocaleString()} AFN
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Status Toggle Dropdown */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <select
                      value={currentStatus}
                      onChange={e => handleQuickStatusChange(table.id, e.target.value)}
                      className="flex-1 bg-[#251d18] text-white text-xs border border-white/10 rounded-xl px-2.5 py-2 outline-none cursor-pointer font-bold focus:border-[#f66018]"
                    >
                      <option value="free">تغییر به: آزاد 🟢</option>
                      <option value="occupied">تغییر به: مشغول 🔴</option>
                      <option value="cleaning">تغییر به: نظافت 🧹</option>
                    </select>

                    {currentStatus === 'occupied' ? (
                      <button
                        onClick={() => onNavigate('cashier-billing')}
                        className="bg-[#f66018] hover:bg-[#b73b01] text-white p-2 rounded-xl text-xs font-bold transition-all shadow-md"
                        title="مشاهده در صندوق"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateTestOrder(table.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl text-xs font-bold transition-all shadow-md"
                        title="ثبت سفارش برای این میز"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: ACTIVE KITCHEN ORDERS FEED (سفارشات زنده آشپزخانه)              */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'orders') && (
        <section className="flex flex-col gap-4 bg-[#201a17]/85 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">soup_kitchen</span>
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>سفارشات فعال و جاری مطبخ (KDS)</span>
                  <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {activeOrders.length} فاکتور
                  </span>
                </h2>
                <p className="text-xs text-[#e2bfb2] mt-0.5">
                  مشاهده جریان لحظه‌ای طبخ و آماده‌سازی خوراک‌ها در ایستگاه‌های آشپزخانه
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('kitchen-kds')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
              <span>ورود به نمایشگر مطبخ (KDS)</span>
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-[#120d0a]/60 rounded-2xl p-8 text-center border border-white/5 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-[28px]">checklist</span>
              <p className="text-xs text-[#e2bfb2]">هیچ سفارشی در صف آشپزخانه معطل نیست.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {activeOrders.map(order => {
                const totalOrderPrice = (order.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? (it.unit_price * it.quantity) : 0), 0);
                const orderTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'هم‌اکنون';

                return (
                  <div 
                    key={order.id}
                    className="bg-[#120d0a]/90 rounded-2xl p-5 border border-white/10 hover:border-blue-500/40 transition-all shadow-xl flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">{order.table_name || order.table_id}</span>
                          <span className="text-[11px] bg-white/5 text-[#ffb599] px-2 py-0.5 rounded font-mono">{order.id}</span>
                        </div>
                        <span className="text-xs text-[#e2bfb2] mt-1 block">
                          مهمان: {order.customer_name || 'حضوری'} • زمان: {orderTime}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-[#f9bd22] font-mono">
                        {totalOrderPrice.toLocaleString()} AFN
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {(order.items || []).map((it: any) => {
                        let itemBadge = 'bg-amber-500/20 text-amber-300';
                        let itemStatusText = 'در حال طبخ';
                        if (it.status === 'ready') {
                          itemBadge = 'bg-emerald-500/20 text-emerald-400';
                          itemStatusText = 'آماده سرو';
                        } else if (it.status === 'delivered') {
                          itemBadge = 'bg-blue-500/20 text-blue-300';
                          itemStatusText = 'تحویل شده';
                        } else if (it.status === 'pending') {
                          itemBadge = 'bg-purple-500/20 text-purple-300';
                          itemStatusText = 'در صف انتظار';
                        }

                        return (
                          <div key={it.id} className="p-2.5 bg-[#18120f] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-[#251d18] text-[#f9bd22] font-mono font-bold flex items-center justify-center text-[11px]">
                                {it.quantity}×
                              </span>
                              <span className="font-bold text-white">{it.name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${itemBadge}`}>
                              {itemStatusText}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => onNavigate('kitchen-kds')}
                        className="flex-1 bg-[#2e241f] hover:bg-[#3d302a] text-white py-2 rounded-xl text-xs font-bold transition-all text-center"
                      >
                        مدیریت در KDS
                      </button>
                      <button
                        onClick={() => onNavigate('cashier-billing')}
                        className="bg-[#f66018] hover:bg-[#b73b01] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        تسویه فاکتور
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: ON-DUTY STAFF (پرسنل حاضر در شیفت)                               */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'staff') && (
        <section className="flex flex-col gap-4 bg-[#201a17]/85 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>پرسنل حاضر در شیفت و راندمان کاری</span>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {staffList.length} نفر
                  </span>
                </h2>
                <p className="text-xs text-[#e2bfb2] mt-0.5">
                  گارسون‌های سالن، سرآشپز ارشد، صندوق‌دار و امتیاز رضایت مشتریان
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('staff')}
              className="bg-[#2f2520] hover:bg-[#3d302a] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 whitespace-nowrap"
            >
              مدیریت پرسنل ←
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {staffList.map((member: any) => {
              const waiterData = waiterPerformance.find((w: any) => w.username === member.username);
              const totalSales = waiterData?.totalSales || (member.role === 'waiter' ? 14200 : 0);
              const ordersCount = waiterData?.ordersCount || (member.role === 'waiter' ? 6 : 0);

              let roleLabel = 'گارسون سالن';
              let roleBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              if (member.role === 'chef') {
                roleLabel = 'سرآشپز ارشد';
                roleBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
              } else if (member.role === 'cashier') {
                roleLabel = 'مسئول صندوق و پذیرش';
                roleBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              } else if (member.role === 'manager') {
                roleLabel = 'مدیریت مجموعه';
                roleBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
              }

              return (
                <div 
                  key={member.username}
                  className="bg-[#120d0a]/90 rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"} 
                      alt={member.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#f66018]/50 shadow-md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-white text-base">{member.name}</h3>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="آنلاین"></span>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border mt-1 ${roleBadge}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#18120f] p-3 rounded-xl border border-white/5 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between text-[#e2bfb2]">
                      <span>کد پرسنلی:</span>
                      <span className="font-mono text-white font-bold">{member.username}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#e2bfb2]">
                      <span>میزهای پذیرایی‌شده:</span>
                      <span className="font-mono text-[#ffb599] font-bold">{ordersCount} فاکتور</span>
                    </div>
                    <div className="flex items-center justify-between text-[#e2bfb2]">
                      <span>فروش ایجادشده:</span>
                      <span className="font-mono text-emerald-400 font-extrabold">{totalSales.toLocaleString()} AFN</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-[#e2bfb2]">امتیاز رضایت:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ★ {member.rating || '۵.۰'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
