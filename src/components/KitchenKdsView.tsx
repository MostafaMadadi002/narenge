import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const KitchenKdsView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [activeStation, setActiveStation] = useState<string>('all');
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('all');
  const [notifiedOrders, setNotifiedOrders] = useState<{ [orderId: string]: boolean }>({});

  const loadData = () => {
    api.getOrders().then(setOrders).catch(() => {});
    api.getTables().then(setTables).catch(() => {});
    api.getStations().then(setStations).catch(() => {});
    api.getMenu().then(setMenu).catch(() => {});
  };

  useEffect(() => {
    loadData();

    // SSE connection for real-time order sync
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'order_placed' ||
          payload.type === 'order_item_status_updated' ||
          payload.type === 'order_item_voided' ||
          payload.type === 'payment_processed'
        ) {
          loadData();
        }
      } catch (e) {}
    };

    const interval = setInterval(loadData, 4000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const getStationForItem = (menuItemId: number) => {
    const found = menu.find(m => m.id === menuItemId);
    return found ? found.station : 'plating';
  };

  const handleItemStatusChange = async (orderItemId: string, newStatus: string) => {
    try {
      await api.updateOrderItemStatus(orderItemId, newStatus);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در بروزرسانی وضعیت غذا.');
    }
  };

  const handleCallWaiterToServe = async (order: any) => {
    try {
      await api.notifyFoodReady({
        order_id: order.order_ids[0],
        table_id: order.table_id,
        seat_number: order.seat_number
      });
      setNotifiedOrders(prev => ({ ...prev, [order.table_id]: true }));
      alert(`پیام آماده بودن غذا برای ${order.table_name || order.table_id} با موفقیت به گارسون مسئول ارسال شد.`);
    } catch (e: any) {
      alert(e.message || 'خطا در ارسال پیام به گارسون.');
    }
  };

  const handleDeliverAllToWaiter = async (tableId: string, tableName: string) => {
    try {
      await api.deliverAllTableOrders(tableId);
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در تحویل سفارش به گارسون.');
    }
  };

  // Active orders grouped by Table
  const activeOrders = orders.filter(o => o.status === 'active');

  // Group active orders by table_id into unified table tickets
  const tableGroupsMap = new Map<string, {
    table_id: string;
    table_name: string;
    assigned_waiter: string;
    seat_number: string;
    created_at: string;
    order_ids: string[];
    items: any[];
  }>();

  activeOrders.forEach(o => {
    const tableMeta = tables.find(t => t.id === o.table_id);
    const tableName = o.table_name || (tableMeta ? tableMeta.name : o.table_id.toUpperCase().replace('T', 'میز '));
    const waiter = o.assigned_waiter || (tableMeta ? tableMeta.assigned_waiter : 'ZN-101');

    if (!tableGroupsMap.has(o.table_id)) {
      tableGroupsMap.set(o.table_id, {
        table_id: o.table_id,
        table_name: tableName,
        assigned_waiter: waiter,
        seat_number: o.seat_number || '1',
        created_at: o.created_at,
        order_ids: [o.id],
        items: [...(o.items || [])]
      });
    } else {
      const existing = tableGroupsMap.get(o.table_id)!;
      existing.order_ids.push(o.id);
      existing.items.push(...(o.items || []));
      if (new Date(o.created_at).getTime() < new Date(existing.created_at).getTime()) {
        existing.created_at = o.created_at;
      }
    }
  });

  const groupedTableOrders = Array.from(tableGroupsMap.values());

  const filteredOrders = groupedTableOrders.filter(group => {
    // Exclude table card if all non-voided items have been delivered
    const nonVoidedItems = group.items.filter((i: any) => i.status !== 'voided');
    if (nonVoidedItems.length > 0 && nonVoidedItems.every((i: any) => i.status === 'delivered')) {
      return false;
    }
    if (selectedTableFilter !== 'all' && group.table_id !== selectedTableFilter) {
      return false;
    }
    if (activeStation !== 'all') {
      const hasStationItem = group.items.some(
        (i: any) => i.status !== 'voided' && getStationForItem(i.menu_item_id) === activeStation
      );
      if (!hasStationItem) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full min-w-0 p-6 gap-6 relative overflow-hidden">
      {/* KDS Header */}
      <section className="rounded-2xl bg-[#201a17]/80 backdrop-blur-2xl p-5 shadow-xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f66018] to-[#f9bd22] flex items-center justify-center text-[#4f1700] shadow-lg">
            <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>soup_kitchen</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">نمایشگر زنده پخت و سفارشات مطبخ (KDS)</h1>
            <p className="text-xs text-[#e2bfb2] flex items-center gap-2 mt-1">
              <span className="text-[#f9bd22]">●</span> نمایش بر اساس تیکت مجزای هر میز • تفکیک زنده اقلام و فراخوان گارسون
            </p>
          </div>
        </div>

        {/* Filters by Station & Table */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Station Filters */}
          <div className="flex items-center gap-1.5 bg-[#120d0a] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveStation('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeStation === 'all' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2]'
              }`}
            >
              همه ایستگاه‌ها
            </button>
            {stations.map(st => (
              <button
                key={st}
                onClick={() => setActiveStation(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeStation === st ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2]'
                }`}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Table Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#120d0a] p-1.5 rounded-xl border border-white/10">
            <label className="text-xs text-[#e2bfb2]">فیلتر میز:</label>
            <select
              value={selectedTableFilter}
              onChange={(e) => setSelectedTableFilter(e.target.value)}
              className="bg-[#201a17] text-white text-xs p-1.5 rounded-lg outline-none font-bold"
            >
              <option value="all">همه میزها ({activeOrders.length} تیکت)</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Table Orders Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {filteredOrders.length === 0 && (
          <div className="col-span-full p-16 text-center bg-[#201a17]/80 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-white">هیچ سفارش فعالی در صف مطبخ وجود ندارد</h3>
            <p className="text-xs text-[#e2bfb2]">تمامی سفارشات پخته شده یا تحویل مهمانان داده شده‌اند.</p>
          </div>
        )}

        {filteredOrders.map((order) => {
          const tableMeta = tables.find(t => t.id === order.table_id);
          const tableName = order.table_name || (tableMeta ? tableMeta.name : order.table_id.toUpperCase().replace('T', 'میز '));
          const assignedWaiter = order.assigned_waiter || (tableMeta ? tableMeta.assigned_waiter : 'ZN-101');
          
          const elapsedMinutes = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);
          const isCritical = elapsedMinutes >= 20;
          const isAllReady = order.items.every((i: any) => i.status === 'ready' || i.status === 'delivered' || i.status === 'voided');

          return (
            <div
              key={order.table_id}
              className={`flex flex-col rounded-3xl bg-[#201a17]/90 backdrop-blur-2xl p-5 shadow-2xl relative overflow-hidden border transition-all ${
                isAllReady
                  ? 'border-emerald-500/70 shadow-emerald-500/10'
                  : isCritical
                  ? 'border-rose-500/70 shadow-rose-500/10'
                  : 'border-white/10 hover:border-[#f66018]/50'
              }`}
            >
              {/* Top Accent Bar */}
              <div
                className={`absolute top-0 right-0 left-0 h-2 ${
                  isAllReady ? 'bg-emerald-500' : isCritical ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-[#f66018] to-[#f9bd22]'
                }`}
              ></div>

              {/* Ticket Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">{tableName}</span>
                    <span className="text-[11px] bg-[#f66018]/20 text-[#ffb599] px-2 py-0.5 rounded-md font-bold">
                      صندلی {order.seat_number}
                    </span>
                  </div>
                  <span className="text-xs text-[#e2bfb2] mt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#f9bd22]">person</span>
                    گارسون مسئول: <strong className="text-white font-bold">{assignedWaiter}</strong>
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white'
                  }`}>
                    ⏱️ {elapsedMinutes} دقیقه پیش
                  </span>
                  <span className="text-[10px] text-[#e2bfb2] font-mono mt-1">{order.order_ids?.join(', ') || order.table_id}</span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="py-3 flex-grow space-y-2.5">
                {order.items.map((item: any) => {
                  const itemStation = getStationForItem(item.menu_item_id);
                  const isVoided = item.status === 'voided';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${
                        isVoided
                          ? 'bg-rose-950/20 border-rose-500/20 opacity-40 line-through'
                          : item.status === 'ready'
                          ? 'bg-emerald-950/30 border-emerald-500/30'
                          : item.status === 'cooking'
                          ? 'bg-amber-950/30 border-amber-500/30'
                          : 'bg-[#120d0a]/70 border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center text-xs font-extrabold">
                            {item.quantity}×
                          </span>
                          <span className="font-bold text-white text-sm">{item.name}</span>
                        </div>
                        <span className="text-[10px] bg-black/50 text-[#f9bd22] px-2 py-0.5 rounded font-bold">
                          {itemStation.toUpperCase()}
                        </span>
                      </div>

                      {item.chef_note && (
                        <p className="text-[11px] text-[#f9bd22] bg-white/5 p-2 rounded-xl">
                          📝 یادداشت مشتری: {item.chef_note}
                        </p>
                      )}

                      {/* Status Control Buttons for this item */}
                      {!isVoided && (
                        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/5">
                          <button
                            onClick={() => handleItemStatusChange(item.id, 'pending')}
                            className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              item.status === 'pending'
                                ? 'bg-amber-500 text-black shadow'
                                : 'bg-[#2f2925] text-[#e2bfb2] hover:bg-[#3a3330]'
                            }`}
                          >
                            در انتظار
                          </button>
                          <button
                            onClick={() => handleItemStatusChange(item.id, 'cooking')}
                            className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              item.status === 'cooking'
                                ? 'bg-[#f66018] text-white shadow'
                                : 'bg-[#2f2925] text-[#e2bfb2] hover:bg-[#3a3330]'
                            }`}
                          >
                            در حال پخت
                          </button>
                          <button
                            onClick={() => handleItemStatusChange(item.id, 'ready')}
                            className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              item.status === 'ready'
                                ? 'bg-emerald-500 text-white shadow'
                                : 'bg-[#2f2925] text-[#e2bfb2] hover:bg-[#3a3330]'
                            }`}
                          >
                            آماده شد ✓
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Call Waiter & Complete Delivery Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => handleCallWaiterToServe(order)}
                  className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    notifiedOrders[order.table_id]
                      ? 'bg-emerald-700 text-white'
                      : isAllReady
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white shadow-orange-500/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                  <span>
                    {notifiedOrders[order.table_id]
                      ? `گارسون فراخوانده شد (${assignedWaiter})`
                      : `فراخوان گارسون (${assignedWaiter}) جهت سرو ${tableName}`}
                  </span>
                </button>

                <button
                  onClick={() => handleDeliverAllToWaiter(order.table_id, tableName)}
                  className="w-full py-2.5 rounded-2xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-emerald-400/30"
                >
                  <span className="material-symbols-outlined text-[18px]">check_box</span>
                  <span>تحویل کامل به گارسون و خروج از صفحه ✓</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
