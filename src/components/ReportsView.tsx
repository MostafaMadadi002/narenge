import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const ReportsView: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportType, setReportType] = useState<'financial' | 'products' | 'waiters'>('financial');
  const [toast, setToast] = useState<string | null>(null);

  const loadReports = () => {
    api.getAnalyticsReports()
      .then(res => {
        setReportData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
    const t = setInterval(loadReports, 6000);
    return () => clearInterval(t);
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    const summary = reportData.sales_summary;
    const csvContent = `data:text/csv;charset=utf-8,Report Type,Total Revenue,Settled Orders,Avg Order Value\nFinancial Summary,${summary.total_revenue},${summary.settled_orders_count},${summary.average_order_value}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'saffron_financial_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast('گزارش مالی با موفقیت در قالب فایل CSV دانلود شد.');
    setTimeout(() => setToast(null), 3500);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-white gap-3">
        <span className="material-symbols-outlined text-4xl text-[#f66018] animate-spin">progress_activity</span>
        <p className="text-xs text-[#e2bfb2]">در حال پردازش و استخراج گزارشات مالی از دیتابیس...</p>
      </div>
    );
  }

  const summary = reportData?.sales_summary || { total_revenue: 0, settled_orders_count: 0, active_orders_count: 0, average_order_value: 0, profit_margin_percent: 65 };
  const pl = reportData?.profit_loss || { gross_revenue: 0, estimated_cogs: 0, estimated_gross_profit: 0, margin_percent: 65 };
  const payments = reportData?.payment_breakdown || { cash: 0, card: 0, split: 0 };
  const products = reportData?.product_performance || [];
  const waiters = reportData?.waiter_performance || [];
  const inv = reportData?.inventory_metrics || { total_valuation: 0, critical_items_count: 0 };

  return (
    <div className="flex flex-col w-full p-6 gap-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-10 right-1/3 w-96 h-96 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#f9bd22] uppercase tracking-wider">سیستم حسابداری و گزارشات پیشرفته</span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">گزارشات جامع مالی، سود و زیان و عملکرد شعبه کابل</h1>
          <p className="text-sm text-[#e2bfb2]">متصل مستقیم به Backend • تحلیل سود ناخالص (P&L)، تفکیک روش‌های پرداخت و راندمان پرسنل</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2f2925] hover:bg-[#3a3330] text-white text-xs font-bold transition-all border border-white/10"
          >
            <span className="material-symbols-outlined text-[18px] text-[#f9bd22]">download</span>
            <span>خروجی CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white text-xs font-bold shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>چاپ گزارش رسمی</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 bg-[#201a17] p-1.5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setReportType('financial')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'financial' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2] hover:text-white'}`}
        >
          گزارش مالی و سود و زیان (P&L)
        </button>
        <button
          onClick={() => setReportType('products')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'products' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2] hover:text-white'}`}
        >
          عملکرد محصولات و خوراک‌ها
        </button>
        <button
          onClick={() => setReportType('waiters')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'waiters' ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2] hover:text-white'}`}
        >
          عملکرد گارسون‌ها و پرسنل
        </button>
      </div>

      {/* TAB 1: FINANCIAL & P&L */}
      {reportType === 'financial' && (
        <div className="flex flex-col gap-6">
          {/* P&L Statement Card */}
          <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#f9bd22] rounded-full"></span>
                صورت سود و زیان شعبه (Profit & Loss Statement)
              </h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">تایید شده توسط حسابداری</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#120d0a] border border-white/5 flex flex-col justify-between">
                <span className="text-xs text-[#e2bfb2]">مجموع فروش ناخالص (Gross Revenue)</span>
                <span className="text-2xl font-extrabold text-white mt-3">{summary.total_revenue.toLocaleString()} <span className="text-xs text-[#ffb599]">AFN</span></span>
                <span className="text-[11px] text-[#e2bfb2] mt-3 pt-2 border-t border-white/5">{summary.settled_orders_count} فاکتور تسویه‌شده</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#120d0a] border border-white/5 flex flex-col justify-between">
                <span className="text-xs text-[#e2bfb2]">بهای تمام‌شده مواد اولیه (Estimated COGS)</span>
                <span className="text-2xl font-extrabold text-rose-400 mt-3">{pl.estimated_cogs.toLocaleString()} <span className="text-xs text-rose-300">AFN</span></span>
                <span className="text-[11px] text-rose-300 mt-3 pt-2 border-t border-white/5">نسبت استاندارد ۳۵٪ فروش</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#120d0a] border border-white/5 flex flex-col justify-between">
                <span className="text-xs text-[#e2bfb2]">سود ناخالص عملیاتی (Gross Profit)</span>
                <span className="text-2xl font-extrabold text-[#f9bd22] mt-3">{pl.estimated_gross_profit.toLocaleString()} <span className="text-xs text-[#ffb599]">AFN</span></span>
                <span className="text-[11px] text-emerald-400 mt-3 pt-2 border-t border-white/5 font-bold">حاشیه سود: {pl.margin_percent}%</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="mt-4">
              <h3 className="font-bold text-white text-sm mb-3">تفکیک درآمد بر اساس درگاه‌های پرداخت</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#120d0a]/70 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#e2bfb2] block">صندوق نقدی (Cash)</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">{payments.cash.toLocaleString()} AFN</span>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-[28px]">payments</span>
                </div>
                <div className="p-4 rounded-xl bg-[#120d0a]/70 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#e2bfb2] block">کارت‌خوان بانکی (POS)</span>
                    <span className="text-lg font-bold text-blue-400 font-mono mt-1 block">{payments.card.toLocaleString()} AFN</span>
                  </div>
                  <span className="material-symbols-outlined text-blue-400 text-[28px]">credit_card</span>
                </div>
                <div className="p-4 rounded-xl bg-[#120d0a]/70 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#e2bfb2] block">پرداخت ترکیبی / دنگی (Split)</span>
                    <span className="text-lg font-bold text-amber-400 font-mono mt-1 block">{payments.split.toLocaleString()} AFN</span>
                  </div>
                  <span className="material-symbols-outlined text-amber-400 text-[28px]">call_split</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT PERFORMANCE */}
      {reportType === 'products' && (
        <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#f66018] rounded-full"></span>
              گزارش تفکیکی فروش محصولات و خوراک‌ها
            </h2>
            <span className="text-xs text-[#e2bfb2]">{products.length} قلم خوراک دارای تراکنش</span>
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#e2bfb2]">هنوز هیچ خوراکی در سفارشات ثبت نشده است.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[700px] text-xs">
                <thead>
                  <tr className="bg-[#2f2925] text-[#e2bfb2]">
                    <th className="p-3">رتبه</th>
                    <th className="p-3">نام خوراک</th>
                    <th className="p-3">تعداد پرس فروخته‌شده</th>
                    <th className="p-3">مجموع درآمد ایجادشده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-[#f9bd22]">#{idx + 1}</td>
                      <td className="p-3 font-bold text-white text-sm">{p.name}</td>
                      <td className="p-3 font-mono text-white">{p.quantity} پرس</td>
                      <td className="p-3 font-extrabold text-[#ffb599] font-mono">{p.revenue.toLocaleString()} AFN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WAITER PERFORMANCE */}
      {reportType === 'waiters' && (
        <div className="bg-[#201a17]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-5 bg-emerald-500 rounded-full"></span>
              گزارش عملکرد و فروش پرسنل سالن و گارسون‌ها
            </h2>
            <span className="text-xs text-[#e2bfb2]">{waiters.length} پرسنل فعال</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="bg-[#2f2925] text-[#e2bfb2]">
                  <th className="p-3">نام گارسون</th>
                  <th className="p-3">تعداد میز/سفارش سروشده</th>
                  <th className="p-3">مجموع فروش ثبت‌شده</th>
                  <th className="p-3">امتیاز عملکرد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {waiters.map((w: any) => (
                  <tr key={w.username} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white text-sm">{w.name} ({w.username})</td>
                    <td className="p-3 font-mono text-white">{w.ordersCount} سفارش</td>
                    <td className="p-3 font-extrabold text-[#f9bd22] font-mono">{w.totalSales.toLocaleString()} AFN</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                        ★ {w.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
