import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface GuestOrderTrackingViewProps {
  tableId?: string;
  onGoToCheckout: () => void;
}

export const GuestOrderTrackingView: React.FC<GuestOrderTrackingViewProps> = ({ tableId, onGoToCheckout }) => {
  const [orders, setOrders] = useState<any[]>([]);

  const loadData = () => {
    api.getOrders().then(setOrders).catch(() => {});
  };

  useEffect(() => {
    loadData();
    // Listen to real-time SSE event for order status changes
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = () => {
      try {
        loadData();
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Get ALL active orders for current table so previous items don't disappear
  const currentTableId = tableId || localStorage.getItem('saffron_table_id') || 't1';
  const tableActiveOrders = orders.filter(o => o.status === 'active' && o.table_id.toLowerCase() === currentTableId.toLowerCase());

  // Flatten all items across all active order submissions for this table
  const items = tableActiveOrders.flatMap(o => (o.items || []).filter((i: any) => i.status !== 'voided'));

  // Calculate overall timeline stage
  const hasCooking = items.some((i: any) => i.status === 'cooking');
  const hasReady = items.some((i: any) => i.status === 'ready');
  const allDelivered = items.length > 0 && items.every((i: any) => i.status === 'delivered');

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'در صف پخت مطبخ';
      case 'cooking': return 'در حال پخت روی آتش';
      case 'ready': return 'آماده تحویل توسط گارسون';
      case 'delivered': return 'سرو شده سر میز';
      default: return 'ثبت شده';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-400 bg-amber-500/10';
      case 'cooking': return 'text-[#f66018] bg-orange-500/10';
      case 'ready': return 'text-emerald-400 bg-emerald-500/10';
      case 'delivered': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-white bg-white/10';
    }
  };

  const totalBill = items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity), 0);

  return (
    <div className="flex flex-col w-full max-w-[420px] mx-auto min-h-screen bg-[#18120f] text-[#ece0da] relative select-none pb-24">
      {/* Ambient glows */}
      <div className="absolute top-0 right-4 w-44 h-44 bg-[#f66018]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* Estimated Countdown Banner */}
        <div className="bg-[#201a17]/90 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#e2bfb2] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f9bd22] animate-ping"></span>
              پگیری زنده SSE بدون رفرش
            </span>
            <span className="text-xs text-[#ffb599] font-bold">
              {tableActiveOrders.length > 0 ? `میز ${currentTableId.toUpperCase()} (${tableActiveOrders.length} نوبت سفارش)` : 'فاقد سفارش فعال'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#f66018]/20 flex items-center justify-center text-[#ffb599]">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>microwave</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">وضعیت زنده پخت و سرو</h2>
              <span className="text-sm font-bold text-[#f9bd22]">
                {allDelivered ? 'تمام غذاها سرو گردید!' : hasReady ? 'غذا آماده سرو است!' : hasCooking ? 'در حال پخت روی آتش...' : 'در صف مطبخ'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Timeline */}
        <div className="bg-[#201a17]/70 rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f66018] text-[20px]">timeline</span>
            مسیر لحظه‌ای سفارش شما
          </h3>

          <div className="relative flex flex-col gap-5 pr-2">
            {/* Step 1 Placed */}
            <div className="relative flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 z-10 border border-emerald-500/30">
                <span className="material-symbols-outlined text-[14px] font-bold">check</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">۱. ثبت سفارش سر میز</span>
                <span className="text-[10px] text-[#e2bfb2]">مخابره خودکار به KDS ایستگاه‌های مربوطه</span>
              </div>
            </div>

            {/* Step 2 Cooking */}
            <div className={`relative flex items-start gap-3 ${hasCooking || hasReady || allDelivered ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-7 h-7 rounded-full bg-[#f66018]/20 text-[#f66018] flex items-center justify-center shrink-0 z-10 border border-[#f66018]/30">
                <span className="material-symbols-outlined text-[14px] animate-pulse">skillet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">۲. پخت زنده در مطبخ</span>
                <span className="text-[10px] text-[#e2bfb2]">آماده‌سازی توسط سرآشپز اجرایی</span>
              </div>
            </div>

            {/* Step 3 Ready & Delivered */}
            <div className={`relative flex items-start gap-3 ${allDelivered ? 'opacity-100' : hasReady ? 'opacity-90' : 'opacity-40'}`}>
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 z-10 border border-blue-500/30">
                <span className="material-symbols-outlined text-[14px]">room_service</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">۳. سرو توسط گارسون اختصاصی</span>
                <span className="text-[10px] text-[#e2bfb2]">تحویل سر میز / تخت شما</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Items List */}
        <div className="bg-[#201a17]/70 rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-[#e2bfb2]">اقلام سفارش شما ({items.length} آیتم)</h3>
          {items.map((item: any) => (
            <div key={item.id} className="bg-[#120d0a]/60 p-3 rounded-xl flex items-center justify-between border border-white/5">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{item.name} (×{item.quantity})</span>
                <span className="text-[10px] text-[#e2bfb2] mt-0.5">{item.unit_price * item.quantity} AFN</span>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${getStatusColor(item.status)}`}>
                {getStatusLabel(item.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Check and Pay Trigger */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#120d0a]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between max-w-[420px] mx-auto z-40">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#e2bfb2]">مجموع فاکتور سفارش</span>
          <span className="font-bold text-white text-base">{totalBill.toLocaleString()} AFN</span>
        </div>
        <button
          onClick={onGoToCheckout}
          className="px-6 py-3 bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 text-xs flex items-center gap-1.5"
        >
          <span>تسویه حساب سر میز</span>
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
        </button>
      </div>
    </div>
  );
};
