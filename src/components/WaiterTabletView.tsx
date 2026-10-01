import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const WaiterTabletView: React.FC = () => {
  const [selectedStation, setSelectedStation] = useState('all');
  const [tables, setTables] = useState<any[]>([]);
  const [tableStatus, setTableStatus] = useState<any>({});
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<string>('1');
  const [menu, setMenu] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [chefNote, setChefNote] = useState<string>('');
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState<string>('');

  // 3 Organized Main Segments:
  // 'orders': مشاهده و ویرایش سفارشات میز جاری
  // 'menu': ثبت و افزودن خوراک از منو به میز
  // 'tables': نمای کلی و انتخاب سریع میزها
  const [activeSegment, setActiveSegment] = useState<'orders' | 'menu' | 'tables'>('orders');

  // Modals for editing orders
  const [editingItemNote, setEditingItemNote] = useState<{ itemId: string; name: string; note: string } | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');
  const [voidingItem, setVoidingItem] = useState<{ itemId: string; name: string } | null>(null);
  const [voidReason, setVoidReason] = useState<string>('انصراف مهمان سر میز');
  const [showCancelOrderModal, setShowCancelOrderModal] = useState<boolean>(false);
  const [cancelOrderReason, setCancelOrderReason] = useState<string>('انصراف و ترک میز توسط مهمان');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    api.getTables().then(res => {
      setTables(res || []);
      if (res && res.length > 0 && !selectedTable) {
        setSelectedTable(res[0].id);
      }
    }).catch(() => {});
    api.getTableStatuses().then(setTableStatus).catch(() => {});
    api.getMenu().then(setMenu).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
  };

  useEffect(() => {
    loadData();

    // SSE listener for waiter_called, service_requested, food_ready_to_serve & status updates
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'service_requested' || payload.type === 'waiter_called') {
          const alertObj = {
            id: Date.now() + Math.random(),
            title: payload.data.request_label || 'فراخوان فوری گارسون از میز',
            desc: `${payload.data.table_name || payload.data.table_id} (صندلی ${payload.data.seat_number || '۱'})`,
            type: 'guest_call',
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          };
          setActiveAlerts(prev => [alertObj, ...prev]);
        } else if (payload.type === 'food_ready_to_serve') {
          const alertObj = {
            id: Date.now() + Math.random(),
            title: '🍲 غذای میز آماده سرو در مطبخ!',
            desc: `${payload.data.table_name || payload.data.table_id} (صندلی ${payload.data.seat_number || '۱'}) - تحویل فوری`,
            type: 'kitchen_ready',
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          };
          setActiveAlerts(prev => [alertObj, ...prev]);
        } else if (payload.type === 'table_status_updated') {
          setTableStatus(payload.data);
        } else if (
          payload.type === 'orders_updated' ||
          payload.type === 'order_placed' ||
          payload.type === 'order_item_updated' ||
          payload.type === 'order_item_voided' ||
          payload.type === 'order_item_status_updated' ||
          payload.type === 'bill_settled' ||
          payload.type === 'payment_processed'
        ) {
          api.getOrders().then(setOrders).catch(() => {});
        } else if (payload.type === 'menu_updated') {
          api.getMenu().then(setMenu).catch(() => {});
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const removeAlert = (alertId: number) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const clearAllAlerts = () => {
    setActiveAlerts([]);
  };

  const handleTableStatusUpdate = async (tableId: string, status: string) => {
    try {
      await api.updateTableStatus(tableId, status);
      setTableStatus((prev: any) => ({ ...prev, [tableId]: status }));
      showToastMsg(`وضعیت میز با موفقیت بروزرسانی شد.`);
    } catch (err: any) {
      alert(err.message || 'خطا در تغییر وضعیت میز.');
    }
  };

  const updateQty = (id: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = menu.reduce((acc, item) => acc + ((quantities[item.id] || 0) * item.price), 0);

  // Active orders of currently selected table
  const selectedTableActiveOrders = orders.filter(
    (o: any) => o.table_id?.toLowerCase() === selectedTable.toLowerCase() && o.status === 'active'
  );

  // Flatten active items for display & editing
  const selectedTableActiveItems: any[] = [];
  selectedTableActiveOrders.forEach(o => {
    (o.items || []).forEach((it: any) => {
      selectedTableActiveItems.push({
        ...it,
        orderId: o.id,
        seat_number: it.seat_number || o.seat_number || '1',
        created_at: o.created_at
      });
    });
  });

  const activeItemsNonVoided = selectedTableActiveItems.filter(i => i.status !== 'voided');

  const selectedTableBillTotal = activeItemsNonVoided.reduce(
    (sum: number, it: any) => sum + (it.unit_price * it.quantity), 0
  );

  // Ready to serve items count
  const readyToServeCount = activeItemsNonVoided.filter(i => i.status === 'ready').length;

  // 1. Waiter Modifies Item Quantity (+ or -)
  const handleModifyItemQuantity = async (item: any, delta: number) => {
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      setVoidingItem({ itemId: item.id, name: item.name });
      setVoidReason('لغو به دلیل صفر شدن تعداد');
      return;
    }

    try {
      await api.updateOrderItem({
        order_item_id: item.id,
        quantity: newQty
      });
      showToastMsg(`تعداد «${item.name}» به ${newQty} تغییر یافت.`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در تغییر تعداد قلم سفارش.');
    }
  };

  // 2. Waiter Edits Chef Note for an Item
  const handleOpenEditNote = (item: any) => {
    setEditingItemNote({ itemId: item.id, name: item.name, note: item.chef_note || '' });
    setTempNoteText(item.chef_note || '');
  };

  const handleSaveChefNote = async () => {
    if (!editingItemNote) return;
    setIsProcessing(true);
    try {
      await api.updateOrderItem({
        order_item_id: editingItemNote.itemId,
        chef_note: tempNoteText.trim()
      });
      showToastMsg(`یادداشت پخت «${editingItemNote.name}» ذخیره شد.`);
      setEditingItemNote(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت یادداشت سرآشپز.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Waiter Marks Item as Delivered to Table
  const handleMarkItemDelivered = async (item: any) => {
    try {
      await api.updateOrderItemStatus(item.id, 'delivered');
      showToastMsg(`قلم «${item.name}» تحویل داده شد.`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در تغییر وضعیت تحویل.');
    }
  };

  // 4. Waiter Voids / Cancels Single Item
  const handleConfirmVoidItem = async () => {
    if (!voidingItem) return;
    setIsProcessing(true);
    try {
      await api.removeOrderItem(voidingItem.itemId, voidReason);
      showToastMsg(`قلم «${voidingItem.name}» لغو گردید.`);
      setVoidingItem(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در لغو قلم خوراک.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Waiter Cancels Entire Table Order
  const handleConfirmCancelOrder = async () => {
    setIsProcessing(true);
    try {
      await api.cancelTableOrder({
        table_id: selectedTable,
        reason: cancelOrderReason
      });
      showToastMsg(`سفارشات میز ${selectedTable.toUpperCase()} لغو گردید.`);
      setShowCancelOrderModal(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در لغو سفارش میز.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Waiter Sends / Adds New Menu Items
  const handleSendOrder = async () => {
    if (totalCount === 0) {
      alert('هیچ قلم کالایی انتخاب نشده است.');
      return;
    }

    const orderItems = Object.keys(quantities)
      .filter(id => quantities[Number(id)] > 0)
      .map(id => {
        const menuItem = menu.find(m => m.id === Number(id));
        return {
          menu_item_id: Number(id),
          name: menuItem ? menuItem.name : 'غذا',
          unit_price: menuItem ? menuItem.price : 0,
          quantity: quantities[Number(id)],
          chef_note: chefNote || ''
        };
      });

    try {
      if (selectedTableActiveOrders.length > 0) {
        await api.addOrderItems({
          table_id: selectedTable,
          seat_number: selectedSeat,
          items: orderItems
        });
        showToastMsg(`اقلام با موفقیت به سفارش فعال میز اضافه شدند.`);
      } else {
        await api.placeOrder({
          table_id: selectedTable,
          seat_number: selectedSeat,
          items: orderItems
        });
        showToastMsg(`سفارش مستقیم برای میز ${selectedTable.toUpperCase()} ثبت شد.`);
      }

      setQuantities({});
      setChefNote('');
      setActiveSegment('orders');
      loadData();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت سفارش.');
    }
  };

  // 7. Quick Cash Settlement
  const handleWaiterSettleCash = async () => {
    if (selectedTableBillTotal <= 0) {
      alert('سفارش فعالی برای تسویه نقدی این میز یافت نشد.');
      return;
    }

    const tObj = tables.find(t => t.id === selectedTable);
    if (!confirm(`آیا دریافت وجه نقد فاکتور به مبلغ ${selectedTableBillTotal.toLocaleString()} AFN را از مهمانان «${tObj?.name || selectedTable}» تایید می‌نمایید؟`)) {
      return;
    }

    try {
      const idempotencyKey = 'WAITER-CASH-' + selectedTable + '-' + Date.now();
      await api.processPayment({
        idempotency_key: idempotencyKey,
        table_id: selectedTable,
        amount: selectedTableBillTotal,
        method: 'cash'
      });
      showToastMsg(`تسویه نقدی تایید و فاکتور بسته شد.`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت تسویه نقدی.');
    }
  };

  // Auto-adjust selected seat
  useEffect(() => {
    const currentTableObj = tables.find(t => t.id === selectedTable);
    const maxCap = Math.max(1, Number(currentTableObj?.capacity || 4));
    if (Number(selectedSeat) > maxCap) {
      setSelectedSeat('1');
    }
  }, [selectedTable, tables]);

  const currentStatus = tableStatus[selectedTable] || 'free';
  const currentTableObj = tables.find(t => t.id === selectedTable);
  const tableCapacity = Math.max(1, Number(currentTableObj?.capacity || 4));
  const availableSeats = Array.from({ length: tableCapacity }, (_, i) => String(i + 1));

  const filteredMenu = menu
    .filter(item => selectedStation === 'all' || (item.station || '').toLowerCase() === selectedStation.toLowerCase())
    .filter(item => !menuSearch.trim() || item.name.toLowerCase().includes(menuSearch.toLowerCase().trim()));

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'preparing':
        return (
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
            <span>🔥 در حال پخت</span>
          </span>
        );
      case 'ready':
        return (
          <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse">
            <span className="material-symbols-outlined text-[13px]">soup_kitchen</span>
            <span>🍲 آماده سرو</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">done_all</span>
            <span>🟢 تحویل شد</span>
          </span>
        );
      case 'voided':
        return (
          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">cancel</span>
            <span>⛔ لغو شده</span>
          </span>
        );
      default:
        return (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
            <span>🟡 در صف پخت</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-60px)] p-3 sm:p-5 gap-4 relative overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COMPACT HEADER BAR: Table Selector + Live Status + Alerts Bell */}
      {/* ========================================================================= */}
      <div className="bg-[#201a17]/95 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Table Switcher & Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">restaurant</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTable}
              disabled={!(localStorage.getItem('saffron_user_role') === 'manager' || localStorage.getItem('saffron_user_role') === 'waiter')}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-[#120d0a] border border-[#f66018]/60 text-white font-black text-xs sm:text-sm p-2 rounded-xl outline-none cursor-pointer hover:border-[#f66018] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} • {tableStatus[t.id] === 'occupied' ? '🔥 مشغول' : tableStatus[t.id] === 'cleaning' ? '🧹 نظافت' : '🟢 آزاد'}
                </option>
              ))}
            </select>

            {/* Quick Status Select */}
            <select
              value={currentStatus}
              onChange={(e) => handleTableStatusUpdate(selectedTable, e.target.value)}
              className={`text-[11px] font-bold p-1.5 rounded-lg border outline-none cursor-pointer transition-all ${
                currentStatus === 'occupied'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : currentStatus === 'cleaning'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <option value="free">🟢 آزاد</option>
              <option value="occupied">🔥 مشغول</option>
              <option value="cleaning">🧹 نظافت</option>
              <option value="reserved">🟡 رزرو</option>
            </select>

            {/* Ready to serve indicator */}
            {readyToServeCount > 0 && (
              <span className="hidden sm:flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg text-[10px] font-black animate-pulse">
                <span className="material-symbols-outlined text-[13px]">soup_kitchen</span>
                <span>{readyToServeCount} غذا آماده سرو!</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Bill Total & Alerts Button */}
        <div className="flex items-center gap-2 mr-auto">
          {selectedTableBillTotal > 0 && (
            <div className="flex items-center gap-1.5 bg-[#120d0a] px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-[#e2bfb2]">فاکتور:</span>
              <span className="text-xs font-black text-[#f9bd22] font-mono">{selectedTableBillTotal.toLocaleString()} AFN</span>
            </div>
          )}

          <button
            onClick={() => setShowAlertModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeAlerts.length > 0
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30'
                : 'bg-[#2f2925] text-[#e2bfb2] hover:text-white border border-white/10'
            }`}
            title="مرکز اعلانات و فراخوان مشتریان"
          >
            <span className="material-symbols-outlined text-[17px]">notifications</span>
            <span>{activeAlerts.length}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ERGONOMIC 3-SEGMENT CONTROLLER (MAIN NAVIGATION TABS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2 bg-[#120d0a] p-1.5 rounded-2xl border border-white/10 shrink-0">
        {/* SEGMENT 1: TABLE ORDERS & ACTIONS */}
        <button
          onClick={() => setActiveSegment('orders')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSegment === 'orders'
              ? 'bg-[#f66018] text-white shadow-lg shadow-orange-500/25'
              : 'text-[#e2bfb2] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>سفارشات میز</span>
          {activeItemsNonVoided.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSegment === 'orders' ? 'bg-black/30 text-white' : 'bg-white/10 text-amber-300'
            }`}>
              {activeItemsNonVoided.length}
            </span>
          )}
        </button>

        {/* SEGMENT 2: ADD FOOD FROM MENU */}
        <button
          onClick={() => setActiveSegment('menu')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSegment === 'menu'
              ? 'bg-[#f66018] text-white shadow-lg shadow-orange-500/25'
              : 'text-[#e2bfb2] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>منوی غذاها</span>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500 text-white animate-pulse">
              +{totalCount}
            </span>
          )}
        </button>

        {/* SEGMENT 3: ALL TABLES OVERVIEW */}
        <button
          onClick={() => setActiveSegment('tables')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSegment === 'tables'
              ? 'bg-[#f66018] text-white shadow-lg shadow-orange-500/25'
              : 'text-[#e2bfb2] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">table_bar</span>
          <span>نقشه میزها</span>
          <span className="text-[10px] text-white/60 font-mono">({tables.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEGMENT 1: TABLE ORDERS & ACTIONS (FOCUSED & UNCLUTTERED) */}
      {/* ========================================================================= */}
      {activeSegment === 'orders' && (
        <div className="flex flex-col gap-3">
          {activeItemsNonVoided.length === 0 ? (
            <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-3xl p-10 border border-white/10 shadow-xl flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-[#f9bd22] flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">dinner_dining</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">هنوز غذایی برای این میز ثبت نشده است</h3>
              <p className="text-xs text-[#e2bfb2] max-w-sm">
                میز «{currentTableObj?.name || selectedTable}» فاکتور بازی ندارد. می‌توانید خوراک جدید اضافه کنید.
              </p>
              <button
                onClick={() => setActiveSegment('menu')}
                className="mt-1 px-5 py-2.5 bg-[#f66018] hover:bg-[#ff7b39] text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>افزودن غذا از منو برای این میز</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Items Card List */}
              <div className="flex flex-col gap-2">
                {selectedTableActiveItems.map((item, idx) => {
                  const isVoided = item.status === 'voided';
                  const itemTotal = (item.unit_price || 0) * (item.quantity || 1);

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVoided
                          ? 'bg-rose-950/20 border-rose-500/20 opacity-50'
                          : item.status === 'ready'
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg'
                          : 'bg-[#201a17]/90 backdrop-blur-xl border-white/10 hover:border-white/20 shadow-md'
                      }`}
                    >
                      {/* Item Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                          {item.quantity}x
                        </span>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-xs sm:text-sm truncate">{item.name}</h4>
                            {getItemStatusBadge(item.status)}
                            <span className="text-[10px] text-amber-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">
                              صندلی {item.seat_number}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#e2bfb2] mt-0.5">
                            <span>فی: <strong className="text-white font-mono">{item.unit_price} AFN</strong></span>
                            <span>•</span>
                            <span>جمع: <strong className="text-[#f9bd22] font-mono">{itemTotal.toLocaleString()} AFN</strong></span>
                          </div>

                          {item.chef_note && (
                            <span className="text-[10px] text-amber-300 mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">edit_note</span>
                              <span>یادداشت: {item.chef_note}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Waiter Controls */}
                      {!isVoided ? (
                        <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                          {/* Qty +/- */}
                          <div className="flex items-center gap-1 bg-[#120d0a] p-1 rounded-xl border border-white/10">
                            <button
                              onClick={() => handleModifyItemQuantity(item, -1)}
                              className="w-7 h-7 rounded-lg bg-[#251d18] text-white hover:bg-rose-900/60 transition-all flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                              title="کاهش تعداد"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-white text-xs">{item.quantity}</span>
                            <button
                              onClick={() => handleModifyItemQuantity(item, 1)}
                              className="w-7 h-7 rounded-lg bg-[#f66018] text-white hover:bg-[#ff7b39] transition-all flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                              title="افزایش تعداد"
                            >
                              +
                            </button>
                          </div>

                          {/* Edit Note */}
                          <button
                            onClick={() => handleOpenEditNote(item)}
                            className="p-2 rounded-xl bg-[#251d18] hover:bg-[#342721] text-[#e2bfb2] hover:text-white border border-white/10 transition-all cursor-pointer"
                            title="ویرایش یادداشت آشپزخانه"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit_note</span>
                          </button>

                          {/* Mark Delivered */}
                          {item.status !== 'delivered' && (
                            <button
                              onClick={() => handleMarkItemDelivered(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="علامت‌گذاری به عنوان تحویل داده شده"
                            >
                              <span className="material-symbols-outlined text-[15px]">check</span>
                              <span className="hidden sm:inline">تحویل شد</span>
                            </button>
                          )}

                          {/* Void / Delete */}
                          <button
                            onClick={() => setVoidingItem({ itemId: item.id, name: item.name })}
                            className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                            title="لغو قلم از سفارش"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-rose-400 font-bold">لغو گردیده است</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions Bar for Selected Table */}
              <div className="bg-[#201a17]/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#e2bfb2]">مجموع قابل پرداخت:</span>
                  <span className="text-base font-black text-[#f9bd22] font-mono">{selectedTableBillTotal.toLocaleString()} AFN</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveSegment('menu')}
                    className="px-4 py-2 bg-[#2f2925] hover:bg-[#3a3330] text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>افزودن غذا</span>
                  </button>

                  <button
                    onClick={handleWaiterSettleCash}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>تسویه نقد</span>
                  </button>

                  <button
                    onClick={() => setShowCancelOrderModal(true)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs cursor-pointer"
                    title="لغو کل فاکتور میز"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEGMENT 2: ADD FOOD FROM MENU (CLEAN & CATEGORIZED) */}
      {/* ========================================================================= */}
      {activeSegment === 'menu' && (
        <div className="flex flex-col gap-3 pb-24">
          {/* Seat Picker & Search Row */}
          <div className="bg-[#201a17]/90 p-3 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#e2bfb2] font-bold">صندلی مقصد:</span>
              <select
                value={selectedSeat}
                onChange={(e) => setSelectedSeat(e.target.value)}
                className="bg-[#120d0a] border border-white/15 text-white font-bold text-xs p-1.5 rounded-lg outline-none cursor-pointer"
              >
                {availableSeats.map(s => (
                  <option key={s} value={s}>صندلی {s}</option>
                ))}
              </select>
            </div>

            {/* Quick Search */}
            <div className="relative flex-grow max-w-xs">
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#e2bfb2] text-[18px]">search</span>
              <input
                type="text"
                placeholder="جستجوی نام غذا..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full bg-[#120d0a] text-white text-xs pr-8 pl-3 py-2 rounded-xl border border-white/10 outline-none focus:border-[#f66018]"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'همه منو' },
              { id: 'pots', label: 'قابلی و دیگ' },
              { id: 'grill', label: 'کباب‌ها' },
              { id: 'tandoor', label: 'تنوری و بولانی' },
              { id: 'plating', label: 'منتو و چای' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedStation(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStation === cat.id
                    ? 'bg-[#f66018] text-white shadow-md'
                    : 'bg-[#201a17] text-[#e2bfb2] hover:text-white border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Food Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMenu.map(food => {
              const qty = quantities[food.id] || 0;
              return (
                <div
                  key={food.id}
                  className="bg-[#201a17]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-lg hover:border-[#f66018]/40 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#120d0a] shrink-0 border border-white/10">
                      {food.image ? (
                        <img
                          src={food.image}
                          alt={food.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#e2bfb2]">عکس ندارد</div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">{food.name}</h4>
                      <span className="text-xs font-black text-[#ffb599] font-mono mt-0.5">{food.price} AFN</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-[#120d0a] p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      onClick={() => updateQty(food.id, -1)}
                      className="w-7 h-7 rounded-lg bg-[#251d18] text-white flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-white text-xs font-mono">{qty}</span>
                    <button
                      onClick={() => updateQty(food.id, 1)}
                      className="w-7 h-7 rounded-lg bg-[#f66018] text-white flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Chef Note Input */}
          {totalCount > 0 && (
            <div className="bg-[#201a17]/95 p-3 rounded-2xl border border-amber-500/30 flex flex-col gap-1.5 shadow-lg">
              <label className="text-[11px] font-bold text-[#f9bd22] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                <span>توضیحات و ترجیحات مهمان برای سرآشپز:</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً: کم‌نمک، بدون فلفل، پخت کامل..."
                value={chefNote}
                onChange={(e) => setChefNote(e.target.value)}
                className="w-full bg-[#120d0a] p-2.5 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Sticky Bottom Order Bar */}
          <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[#120d0a]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center font-black text-sm">
                {totalCount}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#e2bfb2]">صندلی {selectedSeat} • {selectedTable.toUpperCase()}</span>
                <span className="text-sm font-black text-[#f9bd22] font-mono">{totalPrice.toLocaleString()} AFN</span>
              </div>
            </div>

            <button
              onClick={handleSendOrder}
              disabled={totalCount === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>
                {selectedTableActiveOrders.length > 0 ? 'افزودن به سفارش فعال میز' : 'ارسال به مطبخ'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEGMENT 3: TABLES OVERVIEW & QUICK TAP (VISUAL HALL MAP) */}
      {/* ========================================================================= */}
      {activeSegment === 'tables' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[#e2bfb2]">جهت تغییر میز، روی کارت میز ضربه بزنید:</span>
            <span className="text-xs text-amber-300 font-bold">کل میزها: {tables.length}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tables.map(t => {
              const status = tableStatus[t.id] || 'free';
              const isSelected = t.id === selectedTable;
              const tableOrders = orders.filter((o: any) => o.table_id?.toLowerCase() === t.id.toLowerCase() && o.status === 'active');
              const itemCount = tableOrders.reduce((acc: number, o: any) => acc + (o.items || []).filter((i: any) => i.status !== 'voided').length, 0);

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTable(t.id);
                    setActiveSegment('orders');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-[#2f221b] border-[#f66018] shadow-lg shadow-orange-500/15'
                      : 'bg-[#201a17]/90 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate">{t.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      status === 'occupied' ? 'bg-orange-500 animate-pulse' :
                      status === 'cleaning' ? 'bg-cyan-400' :
                      status === 'reserved' ? 'bg-amber-400' :
                      'bg-emerald-400'
                    }`}></span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#e2bfb2]">
                    <span>{t.capacity} نفره</span>
                    {itemCount > 0 ? (
                      <span className="text-orange-400 font-bold">{itemCount} قلم فعال</span>
                    ) : (
                      <span className="text-emerald-400">آماده مهمان</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP MODAL 1: EDIT CHEF NOTE */}
      {/* ========================================================================= */}
      {editingItemNote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-[18px]">edit_note</span>
                <span>یادداشت سرآشپز: {editingItemNote.name}</span>
              </h3>
              <button onClick={() => setEditingItemNote(null)} className="text-[#e2bfb2] hover:text-white text-sm">✕</button>
            </div>

            <textarea
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="مثلاً: بدون پیاز، سس اضافه، کاملاً پخته..."
              rows={3}
              className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/15 text-white text-xs outline-none focus:border-[#f66018]"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingItemNote(null)}
                className="px-3.5 py-1.5 bg-[#2f2925] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveChefNote}
                className="px-4 py-1.5 bg-[#f66018] hover:bg-[#ff7b39] text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
              >
                {isProcessing ? 'در حال ثبت...' : 'ذخیره یادداشت'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP MODAL 2: VOID / REMOVE ITEM */}
      {/* ========================================================================= */}
      {voidingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-rose-500/30 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">delete</span>
              <span>لغو قلم: {voidingItem.name}</span>
            </h3>

            <div>
              <label className="block text-xs text-[#e2bfb2] mb-1">دلیل لغو:</label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-[#120d0a] p-2 rounded-xl border border-white/10 text-white text-xs outline-none"
              >
                <option value="انصراف مهمان سر میز">انصراف مهمان سر میز</option>
                <option value="اشتباه گارسون در ثبت قلم">اشتباه گارسون در ثبت قلم</option>
                <option value="عدم موجودی ماده اولیه در مطبخ">عدم موجودی ماده اولیه در مطبخ</option>
                <option value="تغییر نظر مهمان و تعویض با خوراک دیگر">تغییر نظر مهمان</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setVoidingItem(null)}
                className="px-3.5 py-1.5 bg-[#2f2925] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmVoidItem}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? 'در حال لغو...' : 'تایید لغو قلم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP MODAL 3: CANCEL ENTIRE TABLE ORDER */}
      {/* ========================================================================= */}
      {showCancelOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-rose-500/40 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">cancel</span>
              <span>لغو کامل سفارشات میز {selectedTable.toUpperCase()}</span>
            </h3>

            <input
              type="text"
              value={cancelOrderReason}
              onChange={(e) => setCancelOrderReason(e.target.value)}
              placeholder="دلیل لغو..."
              className="w-full bg-[#120d0a] p-2 rounded-xl border border-white/10 text-white text-xs outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCancelOrderModal(false)}
                className="px-3.5 py-1.5 bg-[#2f2925] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmCancelOrder}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isProcessing ? 'در حال لغو...' : 'تایید لغو کامل فاکتور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATION CENTER MODAL */}
      {/* ========================================================================= */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018] text-[20px]">notifications_active</span>
                <h3 className="text-sm font-bold text-white">اعلانات زنده گارسون ({activeAlerts.length})</h3>
              </div>
              <button onClick={() => setShowAlertModal(false)} className="text-[#e2bfb2] hover:text-white text-sm">✕</button>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#e2bfb2] flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-40">notifications_off</span>
                <span>هیچ فراخوان یا هشداری در انتظار نیست.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-white ${
                      alert.type === 'kitchen_ready'
                        ? 'bg-emerald-950/60 border-emerald-500/40'
                        : 'bg-amber-950/60 border-amber-500/40'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs">{alert.title}</h4>
                      <p className="text-[11px] text-[#e2bfb2] mt-0.5">{alert.desc}</p>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      تایید ✓
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              {activeAlerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold cursor-pointer"
                >
                  پاکسازی همه
                </button>
              )}
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-5 py-1.5 bg-[#2f2925] hover:bg-[#3a3330] text-white rounded-xl text-xs font-bold ml-auto cursor-pointer"
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
