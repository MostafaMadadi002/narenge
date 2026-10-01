import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const TablesHallView: React.FC = () => {
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [tableStatus, setTableStatus] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Role & Session
  const userRole = localStorage.getItem('saffron_user_role') || 'manager';
  const currentUsername = localStorage.getItem('saffron_username') || 'ZN-101';
  const isManager = userRole === 'manager';

  // Waiter Filter Toggle: 'my' or 'all'
  const [waiterFilter, setWaiterFilter] = useState<'my' | 'all'>('my');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [selectedQrTable, setSelectedQrTable] = useState<any>(null);
  const [tableOrdersModal, setTableOrdersModal] = useState<any | null>(null);
  const [hallToast, setHallToast] = useState<string | null>(null);

  // New/Edit Table Form States
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newSection, setNewSection] = useState('سالن اصلی');
  const [customSection, setCustomSection] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [assignedWaiter, setAssignedWaiter] = useState('ZN-101');
  const [addError, setAddError] = useState('');

  // Local IPv4 Server IP configuration setting
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [serverIp, setServerIp] = useState<string>(() => {
    return localStorage.getItem('saffron_server_ip') || (window.location.host || 'saffron.local:3000');
  });

  const loadData = () => {
    api.getTables().then(setTablesList).catch(() => {});
    api.getTableStatuses().then(setTableStatus).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
    
    // Robust staff fetching: try getStaff first, and also getPublicStaffList to ensure full personnel list
    api.getStaff().then(res => {
      if (res && res.length > 0) {
        setStaff(res);
      } else {
        api.getPublicStaffList().then(setStaff).catch(() => {});
      }
    }).catch(() => {
      api.getPublicStaffList().then(setStaff).catch(() => {});
    });

    api.getNetworkInfo().then(info => {
      setNetworkInfo(info);
      if (!localStorage.getItem('saffron_server_ip') && info?.recommended_domain) {
        setServerIp(`${info.recommended_domain}:3000`);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();

    // SSE event listener for real-time staff and table updates
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'staff_updated') {
          api.getStaff().then(res => {
            if (res && res.length > 0) setStaff(res);
            else api.getPublicStaffList().then(setStaff).catch(() => {});
          }).catch(() => {
            api.getPublicStaffList().then(setStaff).catch(() => {});
          });
        } else if (payload.type === 'tables_updated' || payload.type === 'table_status_updated') {
          api.getTables().then(setTablesList).catch(() => {});
          api.getTableStatuses().then(setTableStatus).catch(() => {});
        }
      } catch (e) {}
    };

    const t = setInterval(loadData, 4000);
    return () => {
      clearInterval(t);
      eventSource.close();
    };
  }, []);

  const handleQuickAssignWaiter = async (tableId: string, waiterUsername: string) => {
    const targetTable = tablesList.find(t => t.id === tableId);
    if (!targetTable) return;
    try {
      await api.updateTable(tableId, {
        ...targetTable,
        assigned_waiter: waiterUsername
      });
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در تخصیص گارسون به میز.');
    }
  };

  const handleOpenAddModal = () => {
    const autoGenId = 't' + (tablesList.length + 1);
    setNewId(autoGenId);
    setNewName('');
    setCustomSection('');
    setAddError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (table: any) => {
    setEditingTable(table);
    setNewId(table.id);
    setNewName(table.name);
    setNewSection(table.section || 'سالن اصلی');
    setCustomSection('');
    setNewCapacity(String(table.capacity || 4));
    setAssignedWaiter(table.assigned_waiter || 'ZN-101');
    setAddError('');
    setShowEditModal(true);
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (confirm(`آیا از حذف ${tableName} (${tableId}) اطمینان دارید؟`)) {
      try {
        await api.deleteTable(tableId);
        alert('میز با موفقیت حذف گردید.');
        loadData();
      } catch (err: any) {
        alert(err.message || 'خطا در حذف میز.');
      }
    }
  };

  const handleEditTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setAddError('');

    const finalSection = newSection === 'custom' ? customSection : newSection;
    if (!newName || !finalSection) {
      setAddError('وارد کردن نام و بخش میز الزامی است.');
      return;
    }

    try {
      await api.updateTable(editingTable.id, {
        name: newName,
        capacity: Number(newCapacity || 4),
        section: finalSection,
        assigned_waiter: assignedWaiter
      });

      setShowEditModal(false);
      setEditingTable(null);
      alert('مشخصات میز با موفقیت بروزرسانی گردید.');
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'خطا در ویرایش میز.');
    }
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const finalSection = newSection === 'custom' ? customSection : newSection;
    if (!newName || !finalSection) {
      setAddError('وارد کردن نام و بخش میز الزامی است.');
      return;
    }

    const finalId = newId || ('t' + (tablesList.length + 1));

    try {
      await api.addTable({
        id: finalId,
        name: newName,
        capacity: Number(newCapacity || 4),
        section: finalSection,
        assigned_waiter: assignedWaiter
      });

      setShowAddModal(false);
      setNewId('');
      setNewName('');
      setCustomSection('');
      alert('میز جدید با شناسه اتوماتیک ' + finalId + ' ایجاد گردید.');
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'خطا در ثبت میز جدید.');
    }
  };

  const handleStatusChange = async (tableId: string, status: string) => {
    try {
      await api.updateTableStatus(tableId, status);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در تغییر وضعیت میز.');
    }
  };

  const handleSaveIp = () => {
    localStorage.setItem('saffron_server_ip', serverIp);
    alert('آدرس IP سرور محلی با موفقیت ثبت گردید و تمام بارکدهای QR بازتولید شدند.');
  };

  const cleanBase = serverIp.startsWith('http://') || serverIp.startsWith('https://') 
    ? serverIp 
    : `http://${serverIp}`;

  // Merge table metadata with live statuses
  const allTables = tablesList.map((t: any) => {
    const status = tableStatus[t.id] || t.status || 'free';
    const tableOrders = orders.filter(o => o.table_id === t.id && o.status === 'active');
    const totalAmount = tableOrders.reduce((sum, o) => {
      return sum + o.items.reduce((s: number, item: any) => s + (item.status !== 'voided' ? item.unit_price * item.quantity : 0), 0);
    }, 0);

    const qrToken = t.qr_token || ('zn_qr_' + t.id);
    const qrUrl = `${cleanBase}/?table=${t.id}&qr_token=${qrToken}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;

    return {
      ...t,
      status,
      totalAmount: totalAmount > 0 ? `${totalAmount.toLocaleString()} AFN` : '-',
      duration: status === 'occupied' ? 'در حال سرو' : status === 'cleaning' ? 'نیازمند نظافت' : 'آماده پذیرش',
      items: tableOrders.length > 0 ? tableOrders[0].items.map((i: any) => i.name).join('، ') : 'چیدمان پاکیزه و آماده',
      qrUrl,
      qrImageUrl
    };
  });

  // Filter tables if waiter
  const displayedTables = (!isManager && waiterFilter === 'my')
    ? allTables.filter(t => t.assigned_waiter === currentUsername)
    : allTables;

  const waiters = staff.length > 0 ? staff : [
    { username: 'ZN-101', name: 'احمد بلال هروی (مدیر سالن)', role: 'manager' },
    { username: 'waiter1', name: 'جاوید کریمی (گارسون)', role: 'waiter' }
  ];

  return (
    <div className="flex flex-col w-full min-w-0 p-6 gap-6 relative overflow-hidden">
      {/* Ambient Orbs */}
      <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-[#f66018]/15 blur-[100px] pointer-events-none"></div>
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#201a17]/80 backdrop-blur-2xl shadow-xl p-6 border border-white/10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#f66018]/20 flex items-center justify-center text-[#ffb599]">
            <span className="material-symbols-outlined text-[24px]">table_restaurant</span>
          </span>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">نقشه و دسته‌بندی میزهای پذیرایی</h1>
            <p className="text-xs text-[#e2bfb2]">مدیریت دسته‌بندی‌های اختصاصی (سالن، فضای باز، VIP) و تحویل میزها به گارسون‌ها</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Waiter Filter Toggle */}
          {!isManager && (
            <div className="flex items-center gap-1 bg-[#120d0a] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setWaiterFilter('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${waiterFilter === 'my' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2]'}`}
              >
                میزهای تحویلی من
              </button>
              <button
                onClick={() => setWaiterFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${waiterFilter === 'all' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2]'}`}
              >
                همه میزهای رستوران ({allTables.length})
              </button>
            </div>
          )}

          {/* Manager authority button to add new table */}
          {isManager && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-[#f66018] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-orange-500/30"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ افزودن میز / بخش جدید (مدیر)</span>
            </button>
          )}

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 bg-[#2f2925] hover:bg-[#3a3330] text-white px-4 py-2.5 rounded-xl font-bold text-xs border border-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            <span>پرینت پلاک QR</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {displayedTables.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#201a17]/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#f9bd22]">table_restaurant</span>
            <h3 className="text-lg font-bold text-white">هنوز میزی در دیتابیس ثبت نشده است</h3>
            <p className="text-xs text-[#e2bfb2]">مدیر سیستم می‌تواند با کلیک بر روی دکمه «+ افزودن میز» نخستین جایگاه را تعریف کند.</p>
          </div>
        )}
        {displayedTables.map(t => (
          <div key={t.id} className="relative overflow-hidden rounded-2xl bg-[#201a17]/80 backdrop-blur-xl p-5 flex flex-col justify-between gap-4 shadow-xl border border-white/10 group hover:border-[#ffb599]/40 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f66018]/20 flex items-center justify-center text-[#ffb599]">
                  <span className="material-symbols-outlined text-[20px]">room_preferences</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{t.name}</span>
                    <span className="text-[10px] bg-amber-500/10 text-[#f9bd22] px-2 py-0.5 rounded-md font-semibold border border-amber-500/20">
                      بخش: {t.section}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#e2bfb2]">
                    <span>ظرفیت: {t.capacity} نفر</span>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#ffb599] font-bold">گارسون مسئول:</span>
                      {isManager ? (
                        <select
                          value={t.assigned_waiter || ''}
                          onChange={(e) => handleQuickAssignWaiter(t.id, e.target.value)}
                          className="bg-[#120d0a] border border-[#f66018]/50 text-white font-bold text-[11px] px-2 py-0.5 rounded-lg outline-none cursor-pointer hover:border-[#f66018]"
                          title="تغییر سریع گارسون مسئول این میز"
                        >
                          {waiters.map(w => (
                            <option key={w.username} value={w.username} className="bg-[#1a1310] text-white">
                              {w.name} ({w.role === 'waiter' ? 'گارسون' : w.role === 'manager' ? 'مدیر' : w.role} - {w.username})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-white font-bold">
                          {staff.find(s => s.username === t.assigned_waiter)?.name || t.assigned_waiter}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                t.status === 'occupied' ? 'bg-[#f66018]/20 text-[#ffb599]' :
                t.status === 'free' ? 'bg-emerald-500/20 text-emerald-400' :
                t.status === 'cleaning' ? 'bg-rose-500/20 text-rose-400' : 'bg-secondary/20 text-secondary'
              }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                <span>{t.status === 'occupied' ? 'مشغول پذیرایی' : t.status === 'free' ? 'خالی و آماده' : t.status === 'cleaning' ? 'در حال پاک‌کاری' : 'رزرو شده'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#120d0a]/70 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#e2bfb2]">وضعیت جاری:</span>
                <span className="text-[#f9bd22] font-semibold">{t.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#e2bfb2]">مجموع سفارشات فعال:</span>
                <span className="text-white font-bold">{t.totalAmount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2 flex-wrap">
              <select
                value={t.status}
                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                className="bg-[#120d0a] border border-white/10 text-xs p-1.5 rounded-lg text-white outline-none"
              >
                <option value="free">آزاد (خالی)</option>
                <option value="occupied">مشغول پخت/سرو</option>
                <option value="cleaning">نیازمند نظافت</option>
                <option value="reserved">رزرو شده</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTableOrdersModal(t)}
                  className="p-1.5 rounded-lg bg-orange-500/20 text-[#ffb599] hover:bg-orange-500/30 text-xs flex items-center gap-1 font-bold cursor-pointer"
                  title="مشاهده و ویرایش سفارشات این میز"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  <span>سفارشات</span>
                </button>

                <button
                  onClick={() => setSelectedQrTable(t)}
                  className="p-1.5 rounded-lg bg-[#2f2925] text-white hover:bg-[#3a3330] text-xs flex items-center gap-1"
                  title="مشاهده QR کد چاپ روی میز"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code</span>
                  <span>QR</span>
                </button>

                {isManager && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs flex items-center gap-1"
                      title="ویرایش مشخصات میز"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTable(t.id, t.name)}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs flex items-center gap-1"
                      title="حذف میز"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Table Modal */}
      {showEditModal && isManager && editingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleEditTableSubmit} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018]">edit_location_alt</span>
                ویرایش مشخصات و گارسون مسئول {editingTable.name}
              </h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {addError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">شناسه یکتای میز</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={newId}
                    className="w-full bg-[#120d0a]/60 p-3 rounded-xl border border-white/10 text-[#f9bd22] font-mono outline-none cursor-not-allowed font-bold"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">عنوان کامل میز (دری) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: میز ۷ فضای باز"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#e2bfb2] mb-1">دسته‌بندی بخش سالن / فضا *</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none mb-2"
                >
                  <option value="سالن اصلی">سالن اصلی</option>
                  <option value="فضای باز / حیاط">فضای باز / حیاط</option>
                  <option value="تراس VIP">تراس VIP</option>
                  <option value="تخت‌های سنتی پامیر">تخت‌های سنتی پامیر</option>
                  <option value="custom">+ تعریف بخش سفارشی جدید...</option>
                </select>

                {newSection === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="نام بخش جدید"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-amber-500/50 text-white outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">ظرفیت پذیرایی (نفر) *</label>
                  <input
                    type="number"
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">گارسون مسئول سرویس‌دهی *</label>
                  <select
                    value={assignedWaiter}
                    onChange={(e) => setAssignedWaiter(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  >
                    {waiters.map(w => (
                      <option key={w.username} value={w.username}>
                        {w.name} ({w.role === 'waiter' ? 'گارسون' : w.role === 'manager' ? 'مدیر' : w.role} - {w.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md">ذخیره تغییرات میز</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Table Modal (Manager Authority) */}
      {showAddModal && isManager && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddTableSubmit} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018]">add_location_alt</span>
                تعریف میز جدید و دسته‌بندی بخش‌های سالن
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {addError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1 flex items-center justify-between">
                    <span>شناسه یکتای میز</span>
                    <span className="text-[10px] text-[#f9bd22] bg-[#f9bd22]/10 px-1.5 py-0.5 rounded font-bold">تولید خودکار سیستم</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={newId}
                    className="w-full bg-[#120d0a]/60 p-3 rounded-xl border border-white/10 text-[#f9bd22] font-mono outline-none cursor-not-allowed font-bold"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">عنوان کامل میز (دری) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: میز ۷ فضای باز"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#e2bfb2] mb-1">دسته‌بندی بخش سالن / فضا (User-Defined) *</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none mb-2"
                >
                  <option value="سالن اصلی">سالن اصلی</option>
                  <option value="فضای باز / حیاط">فضای باز / حیاط</option>
                  <option value="تراس VIP">تراس VIP</option>
                  <option value="تخت‌های سنتی پامیر">تخت‌های سنتی پامیر</option>
                  <option value="custom">+ تعریف بخش سفارشی جدید...</option>
                </select>

                {newSection === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="نام بخش جدید (مثلاً: روف گاردن، غرفه بهار)"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-amber-500/50 text-white outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">ظرفیت پذیرایی (نفر) *</label>
                  <input
                    type="number"
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">گارسون مسئول سرویس‌دهی *</label>
                  <select
                    value={assignedWaiter}
                    onChange={(e) => setAssignedWaiter(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  >
                    {waiters.map(w => (
                      <option key={w.username} value={w.username}>
                        {w.name} ({w.role === 'waiter' ? 'گارسون' : w.role === 'manager' ? 'مدیر' : w.role} - {w.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-[#f66018] text-white rounded-xl text-xs font-bold shadow-md">ثبت و تحویل میز</button>
            </div>
          </form>
        </div>
      )}

      {/* Printable QR Code Modal Dialog with IPv4 Server Address Setting */}
      {(showQrModal || selectedQrTable) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018]">qr_code_2</span>
                پلاک‌های QR کد و تنظیم آدرس IP سرور شبکه محلی
              </h3>
              <button onClick={() => { setShowQrModal(false); setSelectedQrTable(null); }} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {/* Automated QR Resolution & Architecture Selection */}
            <div className="bg-[#120d0a] p-4 rounded-2xl border border-white/10 flex flex-col gap-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <label className="text-xs font-bold text-[#f9bd22] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">dns</span>
                    <span>اتوماسیون آدرس‌دهی QR و حل مشکل تغییر IP سرور/روتر:</span>
                  </label>
                  <span className="text-[11px] text-[#e2bfb2]">
                    یکی از روش‌های زیر را جهت تولید پلاک‌های دائمی و بدون نیاز به تعویض انتخاب فرمایید:
                  </span>
                </div>
                <button
                  onClick={handleSaveIp}
                  className="px-4 py-2 bg-[#f66018] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>اعمال و ذخیره آدرس</span>
                </button>
              </div>

              {/* Fast Auto-Selection Strategies */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Strategy A: Permanent Local Domain */}
                <button
                  type="button"
                  onClick={() => {
                    const domain = networkInfo?.recommended_domain || 'saffron.local';
                    setServerIp(`${domain}:3000`);
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    serverIp.includes('saffron.local')
                      ? 'bg-[#f66018]/20 border-[#f66018] text-white ring-1 ring-orange-500'
                      : 'bg-[#201a17] border-white/10 text-[#e2bfb2] hover:bg-[#2b221d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">۱. دامنه محلی دائمی (mDNS)</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">پیشنهادی</span>
                  </div>
                  <span className="text-[10px] text-white font-mono dir-ltr truncate">http://saffron.local:3000</span>
                  <span className="text-[9px] opacity-75">ثابت برای همیشه؛ مصون در برابر تغییر روتر یا آی‌پی</span>
                </button>

                {/* Strategy B: Auto-Detected Active LAN IP */}
                <button
                  type="button"
                  onClick={() => {
                    if (networkInfo?.primary_ip) {
                      setServerIp(`${networkInfo.primary_ip}:3000`);
                    } else {
                      api.getNetworkInfo().then(info => {
                        setNetworkInfo(info);
                        setServerIp(`${info.primary_ip}:3000`);
                      }).catch(() => {});
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    networkInfo?.primary_ip && serverIp.includes(networkInfo.primary_ip)
                      ? 'bg-[#f66018]/20 border-[#f66018] text-white ring-1 ring-orange-500'
                      : 'bg-[#201a17] border-white/10 text-[#e2bfb2] hover:bg-[#2b221d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">۲. تشخیص خودکار IP سرور</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">اتوماتیک</span>
                  </div>
                  <span className="text-[10px] text-white font-mono dir-ltr truncate">
                    http://{networkInfo?.primary_ip || '192.168.1.100'}:3000
                  </span>
                  <span className="text-[9px] opacity-75">استخراج خودکار از کارت شبکه بدون تایپ دستی</span>
                </button>

                {/* Strategy C: Permanent Cloud URL */}
                <button
                  type="button"
                  onClick={() => {
                    setServerIp(window.location.host);
                  }}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                    serverIp === window.location.host
                      ? 'bg-[#f66018]/20 border-[#f66018] text-white ring-1 ring-orange-500'
                      : 'bg-[#201a17] border-white/10 text-[#e2bfb2] hover:bg-[#2b221d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400">۳. دامنه پایدار اینترنتی</span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">ابری</span>
                  </div>
                  <span className="text-[10px] text-white font-mono dir-ltr truncate">
                    {window.location.host}
                  </span>
                  <span className="text-[9px] opacity-75">دسترسی با اینترنت سیم‌کارت مهمانان</span>
                </button>
              </div>

              {/* Editable Input */}
              <div className="flex items-center gap-2 dir-ltr mt-1">
                <span className="text-xs text-[#e2bfb2] font-mono select-none">http://</span>
                <input
                  type="text"
                  placeholder="saffron.local:3000"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  className="flex-grow bg-[#201a17] text-white font-mono text-xs p-2.5 rounded-xl border border-white/10 outline-none text-left tracking-wider"
                />
              </div>

              <div className="bg-[#1c1511] p-3 rounded-xl border border-amber-500/20 text-[11px] text-[#e2bfb2] leading-relaxed">
                🚀 <strong>پیشنهاد مهندسی (حل دائمی مشکل):</strong> بهترین روش برای رستوران، استفاده از نام دامنه محلی 
                (<code className="text-[#f9bd22] font-mono font-bold">saffron.local:3000</code>) است. 
                با این روش، پلاک‌های چاپ‌شده روی میزها <strong>تا همیشه پایدار</strong> می‌مانند و حتی اگر روتر یا آی‌پی وای‌فای عوض شود، نیازی به چاپ مجدد هیچ بارکدی نخواهید داشت.
              </div>
            </div>

            {/* QR Code Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(selectedQrTable ? [selectedQrTable] : displayedTables).map(t => (
                <div key={t.id} className="bg-white text-black p-5 rounded-2xl flex flex-col items-center text-center gap-3 shadow-xl border-2 border-amber-500">
                  <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm border-b pb-1 w-full justify-center">
                    <span className="material-symbols-outlined text-amber-600">restaurant</span>
                    <span>رستوران زعفران و نارنج</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900">{t.name}</h4>
                  <div className="w-40 h-40 border-4 border-slate-900 rounded-xl p-1 bg-white shadow-inner">
                    <img src={t.qrImageUrl} alt={t.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full dir-ltr font-mono truncate max-w-full">
                    {t.qrUrl}
                  </span>
                  <p className="text-[10px] font-bold text-amber-800">لطفاً جهت مشاهده منو و ثبت سفارش بارکد فوق را با گوشی خود اسکن فرمایید.</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-xs text-[#e2bfb2]">آماده جهت پرینت روی پلاک‌های فلزی یا چوبی سر میز</span>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#f66018] text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>پرینت پلاک‌ها</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Table Orders View & Edit Modal for Waiter / Manager */}
      {tableOrdersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-orange-500/20 text-[#ffb599] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>سفارشات و اقلام فاکتور {tableOrdersModal.name}</span>
                    <span className="text-xs bg-amber-500/10 text-[#f9bd22] px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      بخش: {tableOrdersModal.section}
                    </span>
                  </h3>
                  <span className="text-xs text-[#e2bfb2]">
                    گارسون مسئول: <strong className="text-white">{tableOrdersModal.assigned_waiter || 'نامشخص'}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTableOrdersModal(null)}
                className="text-[#e2bfb2] hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            {/* Find orders for this table */}
            {(() => {
              const activeOrders = orders.filter(
                (o: any) => o.table_id?.toLowerCase() === tableOrdersModal.id.toLowerCase() && o.status === 'active'
              );

              const items: any[] = [];
              activeOrders.forEach(o => {
                (o.items || []).forEach((it: any) => {
                  items.push({
                    ...it,
                    orderId: o.id,
                    seat_number: it.seat_number || o.seat_number || '1',
                    created_at: o.created_at
                  });
                });
              });

              const nonVoided = items.filter(it => it.status !== 'voided');
              const totalSum = nonVoided.reduce((s, it) => s + (it.unit_price * it.quantity), 0);

              if (items.length === 0) {
                return (
                  <div className="p-12 text-center text-xs text-[#e2bfb2] flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[48px] text-amber-500/30">restaurant_menu</span>
                    <p className="font-bold text-white text-sm">هیچ سفارش فعالی برای این میز ثبت نشده است.</p>
                    <p className="text-[11px] text-[#e2bfb2]/70">مهمان می‌تواند با اسکن QR سفارش دهد یا گارسون از تبلت ثبت نماید.</p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    {items.map((item, idx) => {
                      const isVoided = item.status === 'voided';
                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isVoided
                              ? 'bg-rose-950/20 border-rose-500/20 opacity-50'
                              : 'bg-[#18120f] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {item.quantity}x
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{item.name}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                  item.status === 'ready' ? 'bg-emerald-500/20 text-emerald-300' :
                                  item.status === 'delivered' ? 'bg-cyan-500/20 text-cyan-300' :
                                  item.status === 'preparing' ? 'bg-orange-500/20 text-orange-300' :
                                  item.status === 'voided' ? 'bg-rose-500/20 text-rose-300' :
                                  'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {item.status === 'ready' ? 'آماده سرو' : item.status === 'delivered' ? 'تحویل شد' : item.status === 'preparing' ? 'در حال پخت' : item.status === 'voided' ? 'لغو شده' : 'در صف پخت'}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#e2bfb2]">
                                فی: {item.unit_price} AFN • مجموع: <strong className="text-white font-mono">{item.unit_price * item.quantity} AFN</strong>
                              </span>
                              {item.chef_note && (
                                <span className="text-[10px] text-amber-300 mt-0.5">یادداشت: {item.chef_note}</span>
                              )}
                            </div>
                          </div>

                          {!isVoided && (
                            <div className="flex items-center gap-2 justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                              {/* Quantity adjustments */}
                              <div className="flex items-center gap-1 bg-[#120d0a] p-1 rounded-xl border border-white/10">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newQ = item.quantity - 1;
                                    if (newQ <= 0) {
                                      await api.removeOrderItem(item.id, 'لغو توسط گارسون');
                                    } else {
                                      await api.updateOrderItem({ order_item_id: item.id, quantity: newQ });
                                    }
                                    loadData();
                                  }}
                                  className="w-6 h-6 rounded bg-[#251d18] text-white hover:bg-rose-900/60 text-xs flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-white font-bold text-xs">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.updateOrderItem({ order_item_id: item.id, quantity: item.quantity + 1 });
                                    loadData();
                                  }}
                                  className="w-6 h-6 rounded bg-[#f66018] text-white hover:bg-[#ff7b39] text-xs flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>

                              {item.status !== 'delivered' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.updateOrderItemStatus(item.id, 'delivered');
                                    loadData();
                                  }}
                                  className="p-1.5 rounded-lg bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-500/20 text-xs"
                                  title="تحویل داده شد"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`آیا از لغو قلم «${item.name}» اطمینان دارید؟`)) {
                                    await api.removeOrderItem(item.id, 'انصراف مهمان سر میز');
                                    loadData();
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/20 text-xs"
                                title="لغو قلم"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-xs text-[#e2bfb2]">مجموع کل فاکتور:</span>
                    <span className="text-base font-black text-[#f9bd22] font-mono">{totalSum.toLocaleString()} AFN</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTableOrdersModal(null)}
                className="px-6 py-2.5 bg-[#2f2925] hover:bg-[#3a3330] text-white rounded-xl text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
