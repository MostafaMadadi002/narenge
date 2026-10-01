import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const DevicesView: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deviceTab, setDeviceTab] = useState<'all' | 'customer' | 'staff' | 'blocked'>('all');
  const [deviceSearch, setDeviceSearch] = useState<string>('');

  // Modal states replacing browser prompt and confirm
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [confirmDisconnectDevice, setConfirmDisconnectDevice] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadDevices = () => {
    api.getDevices().then(res => {
      if (Array.isArray(res)) {
        setDevices(res);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadDevices();

    // Real-time SSE synchronization for devices
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'devices_updated' ||
          payload.type === 'device_status_updated' ||
          payload.type === 'device_updated' ||
          payload.type === 'device_deleted' ||
          payload.type === 'guest_seated'
        ) {
          loadDevices();
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleToggleBlockDevice = async (dev: any) => {
    const newStatus = dev.status === 'blocked' ? 'active' : 'blocked';
    try {
      await api.updateDeviceStatus(dev.id, newStatus);
      setToast(`دستگاه «${dev.name}» با موفقیت ${newStatus === 'blocked' ? 'مسدود گردید' : 'رفع مسدودیت و فعال شد'}.`);
      loadDevices();
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(e.message || 'خطا در تغییر وضعیت دستگاه.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleOpenRenameModal = (dev: any) => {
    setEditingDevice(dev);
    setNewDeviceName(dev.name || '');
  };

  const handleSaveRename = async () => {
    if (!editingDevice) return;
    const trimmed = newDeviceName.trim();
    if (!trimmed) {
      return;
    }
    setIsSubmitting(true);
    try {
      await api.renameDevice(editingDevice.id, trimmed);
      setToast(`نام دستگاه به «${trimmed}» بروزرسانی گردید.`);
      setEditingDevice(null);
      loadDevices();
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(e.message || 'خطا در تغییر نام دستگاه.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDisconnectModal = (dev: any) => {
    setConfirmDisconnectDevice(dev);
  };

  const handleConfirmDisconnect = async () => {
    if (!confirmDisconnectDevice) return;
    setIsSubmitting(true);
    try {
      await api.deleteDevice(confirmDisconnectDevice.id);
      setToast(`دسترسی دستگاه «${confirmDisconnectDevice.name}» لغو گردید.`);
      setConfirmDisconnectDevice(null);
      loadDevices();
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      setToast(e.message || 'خطا در لغو دسترسی دستگاه.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and split devices into Customer and Staff categories
  const filteredDevices = devices.filter(d => {
    const query = deviceSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      (d.name && d.name.toLowerCase().includes(query)) ||
      (d.ip && d.ip.includes(query)) ||
      (d.table_id && d.table_id.toLowerCase().includes(query)) ||
      (d.device_type && d.device_type.toLowerCase().includes(query)) ||
      (d.username && d.username.toLowerCase().includes(query))
    );
  });

  const customerDevices = filteredDevices.filter(d => 
    d.category === 'customer' || d.table_id || d.name?.includes('مشتری') || d.name?.includes('مهمان') || d.id?.includes('cust')
  );

  const staffDevices = filteredDevices.filter(d => 
    d.category === 'staff' || (!d.table_id && !d.name?.includes('مشتری') && !d.name?.includes('مهمان') && !d.id?.includes('cust'))
  );

  const blockedDevices = filteredDevices.filter(d => d.status === 'blocked');

  const renderDeviceRow = (dev: any) => {
    const isCustomer = dev.category === 'customer' || dev.table_id || dev.name?.includes('مشتری') || dev.name?.includes('مهمان');
    
    return (
      <div
        key={dev.id}
        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
          dev.status === 'blocked'
            ? 'bg-rose-950/20 border-rose-500/40 opacity-80'
            : 'bg-[#18120f]/80 backdrop-blur-md border-white/10 hover:border-[#f66018]/40 shadow-md'
        }`}
      >
        {/* Left Info: Icon, Name, Table, Specs */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              dev.status === 'blocked'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isCustomer
                ? 'bg-amber-500/15 text-[#f9bd22] border border-amber-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {dev.status === 'blocked'
                ? 'block'
                : isCustomer
                ? 'smartphone'
                : dev.device_type?.includes('Tablet')
                ? 'tablet_mac'
                : dev.device_type?.includes('PC')
                ? 'desktop_windows'
                : 'terminal'}
            </span>
          </div>

          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-white text-sm tracking-tight truncate">{dev.name}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isCustomer
                    ? 'bg-amber-500/15 text-[#ffb599] border border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {isCustomer ? '📱 مهمان سالن' : '👔 پایانه پرسنل'}
              </span>

              {dev.table_id && (
                <span className="bg-[#2a201b] text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-500/20">
                  میز {dev.table_id.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#e2bfb2] font-mono mt-0.5">
              <span className="text-[#ffb599] font-bold select-all">{dev.ip}</span>
              <span className="text-white/20">•</span>
              <span className="text-[#cbb2a6] font-sans text-[11px]">{dev.device_type || 'موبایل هوشمند'}</span>
              {dev.username && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-cyan-300 font-sans text-[11px] font-bold">کاربر: {dev.username}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Info: Status badge & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-white/5 shrink-0">
          <div className="flex flex-col items-start md:items-end text-right">
            <span
              className={`flex items-center gap-1.5 text-xs font-bold ${
                dev.status === 'blocked' ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dev.status === 'blocked' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                }`}
              ></span>
              <span>{dev.status === 'blocked' ? '⛔ مسدود شده' : '🟢 آنلاین و فعال'}</span>
            </span>
            <span className="text-[11px] text-[#e2bfb2]/70 mt-0.5">
              آخرین فعالیت: {dev.last_seen || 'هم‌اکنون'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Rename button */}
            <button
              type="button"
              onClick={() => handleOpenRenameModal(dev)}
              className="p-2 rounded-xl bg-[#251d18] text-[#e2bfb2] hover:text-white hover:bg-[#342721] transition-all border border-white/5 active:scale-95 cursor-pointer shadow-sm flex items-center justify-center"
              title="تغییر نام و برچسب شناسایی دستگاه"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>

            {/* Block / Unblock Toggle */}
            <button
              type="button"
              onClick={() => handleToggleBlockDevice(dev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow cursor-pointer active:scale-95 ${
                dev.status === 'blocked'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
              title={dev.status === 'blocked' ? 'رفع مسدودیت دستگاه' : 'مسدودسازی دسترسی این دستگاه'}
            >
              <span className="material-symbols-outlined text-[17px]">
                {dev.status === 'blocked' ? 'check_circle' : 'block'}
              </span>
              <span>{dev.status === 'blocked' ? 'رفع انسداد' : 'مسدودسازی'}</span>
            </button>

            {/* Delete / Disconnect */}
            <button
              type="button"
              onClick={() => handleOpenDisconnectModal(dev)}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-rose-300 border border-rose-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title="قطع دسترسی و لغو ثبت دستگاه"
            >
              <span className="material-symbols-outlined text-[18px]">link_off</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-white">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-6 gap-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-12 right-20 w-96 h-96 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Floating Feedback Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#f9bd22] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">router</span>
            <span>مرکز پایش و کنترل دستگاه‌های متصل شبکه</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">مدیریت دستگاه‌ها و پایانه‌های سالن</h1>
          <p className="text-sm text-[#e2bfb2]">تفکیک کامل موبایل‌های مشتریان از تبلت‌ها و صندوق پرسنل به همراه دسترسی بلادرنگ</p>
        </div>

        <button
          onClick={loadDevices}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#201a17] hover:bg-[#2c2420] text-white font-bold border border-white/10 text-xs shadow-md transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>بروزرسانی وضعیت شبکه</span>
        </button>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#201a17]/90 backdrop-blur-xl border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#ffb599] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">devices_other</span>
          </div>
          <div>
            <span className="text-[11px] text-[#e2bfb2]">کل پایانه‌ها</span>
            <h4 className="text-lg font-black text-white font-mono">{devices.length}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#201a17]/90 backdrop-blur-xl border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#f9bd22] flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">smartphone</span>
          </div>
          <div>
            <span className="text-[11px] text-[#e2bfb2]">موبایل مهمانان</span>
            <h4 className="text-lg font-black text-amber-400 font-mono">{customerDevices.length}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#201a17]/90 backdrop-blur-xl border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">badge</span>
          </div>
          <div>
            <span className="text-[11px] text-[#e2bfb2]">پایانه‌های پرسنل</span>
            <h4 className="text-lg font-black text-cyan-400 font-mono">{staffDevices.length}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#201a17]/90 backdrop-blur-xl border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">block</span>
          </div>
          <div>
            <span className="text-[11px] text-[#e2bfb2]">مسدود شده</span>
            <h4 className="text-lg font-black text-rose-400 font-mono">{blockedDevices.length}</h4>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#201a17]/90 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col gap-6">
        {/* Hub Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[26px]">cell_tower</span>
            </span>
            <div>
              <h2 className="text-lg font-black text-white">پایانه‌ها و دستگاه‌های متصل شبکه محلی</h2>
              <span className="text-xs text-[#e2bfb2]">
                مدیریت دسترسی و مانیتورینگ زنده ترافیک میزها و صندوق
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Search */}
            <div className="flex items-center gap-2 bg-[#120d0a] px-3 py-2 rounded-xl border border-white/10 focus-within:border-[#f66018] transition-all">
              <span className="material-symbols-outlined text-[#e2bfb2] text-[18px]">search</span>
              <input
                type="text"
                placeholder="جستجو در نام، IP یا شماره میز..."
                value={deviceSearch}
                onChange={e => setDeviceSearch(e.target.value)}
                className="bg-transparent text-white text-xs outline-none w-44 sm:w-56"
              />
              {deviceSearch && (
                <button onClick={() => setDeviceSearch('')} className="text-[#e2bfb2] hover:text-white text-xs">✕</button>
              )}
            </div>

            {/* View Filter Tabs */}
            <div className="flex items-center bg-[#120d0a] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setDeviceTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  deviceTab === 'all'
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'text-[#e2bfb2] hover:text-white'
                }`}
              >
                همه ({devices.length})
              </button>
              <button
                onClick={() => setDeviceTab('customer')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  deviceTab === 'customer'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-[#e2bfb2] hover:text-white'
                }`}
              >
                <span>📱 مشتریان</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">{customerDevices.length}</span>
              </button>
              <button
                onClick={() => setDeviceTab('staff')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  deviceTab === 'staff'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-[#e2bfb2] hover:text-white'
                }`}
              >
                <span>👔 پرسنل</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">{staffDevices.length}</span>
              </button>
              {blockedDevices.length > 0 && (
                <button
                  onClick={() => setDeviceTab('blocked')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    deviceTab === 'blocked'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <span>⛔ مسدود</span>
                  <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">{blockedDevices.length}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SUB-SECTION A: CUSTOMER DEVICES LIST */}
        {(deviceTab === 'all' || deviceTab === 'customer') && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-black text-[#ffb599] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">person_pin</span>
                <span>بخش ۱: دستگاه‌های موبایل مشتریان و مهمانان سالن ({customerDevices.length})</span>
              </h3>
              <span className="text-[11px] text-[#e2bfb2]/70">دستگاه‌هایی که با اسکن بارکد QR سر میز وارد شده‌اند</span>
            </div>

            {customerDevices.length === 0 ? (
              <div className="p-8 text-center bg-[#120d0a]/60 rounded-2xl border border-dashed border-white/10 text-xs text-[#e2bfb2]/70">
                در حال حاضر هیچ دستگاه مشتری فعالی با فیلتر جاری یافت نشد.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {customerDevices.map(renderDeviceRow)}
              </div>
            )}
          </div>
        )}

        {/* SUB-SECTION B: STAFF & HARDWARE TERMINALS LIST */}
        {(deviceTab === 'all' || deviceTab === 'staff') && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[20px]">badge</span>
                <span>بخش ۲: تبلت‌ها، صندوق و پایانه‌های پرسنل رستوران ({staffDevices.length})</span>
              </h3>
              <span className="text-[11px] text-[#e2bfb2]/70">تبلت‌های سفارش‌گیر گارسون، سیستم KDS مطبخ و صندوق مرکزی</span>
            </div>

            {staffDevices.length === 0 ? (
              <div className="p-8 text-center bg-[#120d0a]/60 rounded-2xl border border-dashed border-white/10 text-xs text-[#e2bfb2]/70">
                در حال حاضر هیچ پایانه پرسنلی با فیلتر جاری ثبت نشده است.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {staffDevices.map(renderDeviceRow)}
              </div>
            )}
          </div>
        )}

        {/* SUB-SECTION C: BLOCKED DEVICES (IF SELECTED) */}
        {deviceTab === 'blocked' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-[20px]">block</span>
                <span>دستگاه‌های مسدود شده و غیرمجاز ({blockedDevices.length})</span>
              </h3>
            </div>

            {blockedDevices.length === 0 ? (
              <div className="p-8 text-center bg-[#120d0a]/60 rounded-2xl border border-dashed border-white/10 text-xs text-[#e2bfb2]/70">
                هیچ دستگاه مسدود شده‌ای وجود ندارد.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {blockedDevices.map(renderDeviceRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* In-App Rename Modal (no browser prompt popup) */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </span>
                <h3 className="text-base font-bold text-white">تغییر نام و برچسب دستگاه</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="text-[#e2bfb2] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="text-xs text-[#e2bfb2] flex items-center gap-2 bg-[#120d0a] p-2.5 rounded-xl border border-white/5">
                <span>آدرس آی‌پی: <strong className="text-white font-mono">{editingDevice.ip}</strong></span>
                <span>•</span>
                <span>نوع: <strong className="text-white">{editingDevice.device_type}</strong></span>
              </div>
              
              <label className="text-xs text-[#ffb599] font-bold mt-1">نام یا عنوان نمایشی جدید دستگاه:</label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="مثلاً: موبایل مهمان • میز ۳ سالن اصلی"
                className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/15 text-white text-xs outline-none focus:border-[#f66018] shadow-inner"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs font-bold hover:bg-[#3a3330] transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isSubmitting || !newDeviceName.trim()}
                onClick={handleSaveRename}
                className="px-5 py-2 bg-[#f66018] hover:bg-[#ff7b39] text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره نام دستگاه'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Disconnect Modal (no browser confirm popup) */}
      {confirmDisconnectDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-rose-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">link_off</span>
              </span>
              <div>
                <h3 className="text-base font-bold text-white">لغو اتصال و حذف دستگاه</h3>
                <span className="text-xs text-[#e2bfb2]">آیا از قطع دسترسی دستگاه زیر اطمینان دارید؟</span>
              </div>
            </div>

            <div className="bg-[#120d0a] p-3 rounded-xl border border-white/10 flex flex-col gap-1 text-xs">
              <span className="font-bold text-white">{confirmDisconnectDevice.name}</span>
              <span className="text-[#e2bfb2] font-mono">{confirmDisconnectDevice.ip} • {confirmDisconnectDevice.device_type}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setConfirmDisconnectDevice(null)}
                className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs font-bold hover:bg-[#3a3330] transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDisconnect}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'در حال قطع دسترسی...' : 'قطع دسترسی و حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
