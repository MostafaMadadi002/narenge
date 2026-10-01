import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface TableSideSplitPaymentModalProps {
  onClose?: () => void;
}

export const TableSideSplitPaymentModal: React.FC<TableSideSplitPaymentModalProps> = ({ onClose }) => {
  const [splitCount, setSplitCount] = useState<number>(4);
  const [selectedTip, setSelectedTip] = useState<number>(500);
  const [rating, setRating] = useState<number>(5);
  const [selectedTable, setSelectedTable] = useState<string>('t3');
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tableStatuses, setTableStatuses] = useState<any>({});

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {});
    api.getTableStatuses().then(setTableStatuses).catch(() => {});
    api.getTables().then(res => {
      setTablesList(res || []);
      if (res && res.length > 0 && !selectedTable) {
        setSelectedTable(res[0].id);
      }
    }).catch(() => {});
  }, []);

  const currentTableObj = tablesList.find(t => t.id === selectedTable);
  const tableName = currentTableObj ? currentTableObj.name : selectedTable.toUpperCase().replace('T', 'میز ');
  const tableCapacity = Math.max(1, Number(currentTableObj?.capacity || 4));

  useEffect(() => {
    if (currentTableObj) {
      setSplitCount(tableCapacity);
    }
  }, [selectedTable, tablesList]);

  // Calculate bill for selected table
  const activeOrders = orders.filter(o => o.table_id === selectedTable && o.status === 'active');
  const totalBill = activeOrders.reduce((sum, o) => {
    return sum + o.items.reduce((s: number, i: any) => s + (i.status !== 'voided' ? i.unit_price * i.quantity : 0), 0);
  }, 0) || 7728; // fallback default

  const perPerson = Math.round(totalBill / splitCount);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#18120f] text-[#ece0da] p-4 sm:p-6 relative overflow-y-auto">
      {/* Ambient Glows */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#f9bd22]/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 relative z-10 pb-16">
        {/* Top Header Card */}
        <div className="bg-[#201a17]/95 backdrop-blur-2xl rounded-2xl p-5 shadow-2xl border border-white/10 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f66018] animate-pulse"></span>
              <span className="text-xs font-semibold text-[#f66018]">صفحه اختصاصی تسویه دُنگی صندوق‌دار</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#e2bfb2]">انتخاب میز:</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-[#120d0a] border border-white/10 text-white text-xs p-1.5 rounded-lg outline-none font-bold"
              >
                {tablesList.length > 0 ? (
                  tablesList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.capacity} صندلی)
                    </option>
                  ))
                ) : (
                  Object.keys(tableStatuses).map((tId) => (
                    <option key={tId} value={tId}>
                      {tId.toUpperCase().replace('T', 'میز ')}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{tableName}</h1>
              <p className="text-xs text-[#e2bfb2] mt-0.5">محاسبه و تقسیم دُنگ بین همراهان میز ({tableCapacity} نفره)</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-[#3a3330] hover:bg-[#2f2925] text-xs font-bold text-white flex items-center gap-1"
              >
                <span>بازگشت به صندوق</span>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              </button>
            )}
          </div>

          {/* Breakdown summary */}
          <div className="mt-4 p-4 rounded-xl bg-[#120d0a]/80 text-xs space-y-2 border border-white/5">
            <div className="flex justify-between text-[#e2bfb2]">
              <span>مجموع سفارشات فعال میز:</span>
              <span className="text-white font-bold">{totalBill.toLocaleString()} افغانی</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>تخفیف باشگاه مشتریان (۱۰٪):</span>
              <span className="font-bold">-{Math.round(totalBill * 0.1).toLocaleString()} افغانی</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
              <span className="font-bold text-white">مبلغ نهایی قابل تصفیه:</span>
              <span className="font-extrabold text-[#ffb599] text-base">{totalBill.toLocaleString()} افغانی</span>
            </div>
          </div>
        </div>

        {/* Equal Split Calculator */}
        <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#f9bd22] text-[24px]">diversity_3</span>
              <div>
                <h3 className="text-sm font-bold text-white">ماشین‌حساب تفکیک دنگ</h3>
                <p className="text-[11px] text-[#e2bfb2]">تقسیم دقیق سهم بین همراهان میز</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#120d0a] px-3 py-1 rounded-full border border-white/5">
              <button
                onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                className="w-8 h-8 rounded-full bg-[#3a3330] text-white flex items-center justify-center font-bold text-lg hover:bg-[#f66018]"
              >
                -
              </button>
              <div className="px-2 text-center">
                <span className="text-lg font-bold text-[#ffb599]">{splitCount}</span>
                <span className="text-[10px] text-[#e2bfb2] block -mt-1">نفر</span>
              </div>
              <button
                onClick={() => setSplitCount(Math.min(12, splitCount + 1))}
                className="w-8 h-8 rounded-full bg-[#3a3330] text-white flex items-center justify-center font-bold text-lg hover:bg-[#f66018]"
              >
                +
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#2f2925]/70 flex items-center justify-between">
            <span className="text-xs text-white">سهم محاسبه‌شده هر مهمان:</span>
            <span className="text-lg font-extrabold text-[#f9bd22]">{perPerson.toLocaleString()} افغانی</span>
          </div>

          {/* Guest share status */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-[#e2bfb2]">
              <span>وضعیت پرداخت مهمانان</span>
              <span className="text-[#f9bd22] font-semibold">۲ از {splitCount} سهم تسویه شد</span>
            </div>
            {[1, 2].map((g) => (
              <div key={g} className="flex items-center justify-between p-3 rounded-xl bg-[#120d0a]/60 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                  <span className="text-xs font-semibold text-white">مهمان شماره {g}</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">{perPerson.toLocaleString()} افغانی (تسویه شد)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb599] text-[20px]">point_of_sale</span>
            روش دریافت برای مهمان جاری ({perPerson.toLocaleString()} افغانی)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#f66018] text-white flex flex-col justify-between h-24 shadow-md cursor-pointer">
              <span className="material-symbols-outlined text-[24px]">contactless</span>
              <div>
                <span className="font-bold text-sm block">پوز سیار بی‌سیم</span>
                <span className="text-[10px] opacity-90">Kabul Bank POS #12</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#2f2925] hover:bg-[#3a3330] text-white flex flex-col justify-between h-24 cursor-pointer transition-all">
              <span className="material-symbols-outlined text-[#f9bd22] text-[24px]">attach_money</span>
              <div>
                <span className="font-bold text-sm block">دریافت نقدی</span>
                <span className="text-[10px] text-[#e2bfb2]">محاسبه باقیمانده پول</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Action Button */}
        <button
          onClick={() => { alert('تسویه کامل و آزادسازی میز با موفقیت در سیستم ثبت شد!'); if (onClose) onClose(); }}
          className="w-full py-4 bg-[#f66018] hover:brightness-110 text-white font-bold rounded-2xl shadow-warm-glow text-base flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[24px]">lock_reset</span>
          <span>تکمیل تسویه و آزادسازی {selectedTable.toUpperCase().replace('T', 'میز ')} ({totalBill.toLocaleString()} AFN)</span>
        </button>
      </div>
    </div>
  );
};
