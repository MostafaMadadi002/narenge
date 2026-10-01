import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const SettingsView: React.FC = () => {
  const [branchName, setBranchName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [currency, setCurrency] = useState('AFN');
  const [wifiSsid, setWifiSsid] = useState('');
  const [waiterCooldown, setWaiterCooldown] = useState<number>(2);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings()
      .then(res => {
        if (res) {
          setBranchName(res.branch_name || 'زعفران و نارنج • شعبه مرکزی کابل');
          setPhone(res.phone || '+93 20 250 0100');
          setTaxPercent(res.tax_percent || 0);
          setServiceCharge(res.service_charge_percent || 0);
          setCurrency(res.currency || 'AFN');
          setWifiSsid(res.wifi_ssid || 'Saffron_Guest_5G');
          setWaiterCooldown(res.waiter_cooldown_minutes || 2);
          setReceiptHeader(res.receipt_header || 'رستوران سنتی و شیک زعفران و نارنج');
          setReceiptFooter(res.receipt_footer || 'با سپاس از تشریف‌فرمایی شما • نوش جان');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        branch_name: branchName,
        phone,
        tax_percent: Number(taxPercent),
        service_charge_percent: Number(serviceCharge),
        currency,
        wifi_ssid: wifiSsid,
        waiter_cooldown_minutes: Number(waiterCooldown),
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter
      });
      setToast('تنظیمات عمومی، مالیات و فاکتور با موفقیت در دیتابیس سرور ذخیره گردید.');
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      alert(e.message || 'خطا در ذخیره‌سازی تنظیمات.');
    } finally {
      setSaving(false);
    }
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
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>پیکربندی کلان سیستم POS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">تنظیمات عمومی و چاپ فاکتور</h1>
          <p className="text-sm text-[#e2bfb2]">مدیریت نرخ‌های مالیاتی، واحد پولی، وای‌فای رستوران و متن سربرگ بل‌های مشتریان</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">{saving ? 'hourglass_top' : 'save'}</span>
          <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
        </button>
      </div>

      {/* Two Column Layout: Settings & Live Thermal Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Branch & Financial Rules (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Section 1: Financial & Tax */}
          <div className="bg-[#201a17]/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="material-symbols-outlined text-[#f9bd22] text-[22px]">account_balance</span>
              تنظیمات مالیاتی، واحد پول و حق سرویس
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">درصد مالیات (Tax %)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018] pl-8"
                  />
                  <span className="absolute left-3 top-3 text-xs text-[#e2bfb2] font-bold">%</span>
                </div>
                <span className="text-[10px] text-[#e2bfb2]/60 mt-1 block">محاسبه در انتهای فاکتور</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">درصد حق سرویس (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(Number(e.target.value))}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018] pl-8"
                  />
                  <span className="absolute left-3 top-3 text-xs text-[#e2bfb2] font-bold">%</span>
                </div>
                <span className="text-[10px] text-[#e2bfb2]/60 mt-1 block">سرویس سالن و تشریفات</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">واحد پول پیش‌فرض</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none font-bold text-center focus:border-[#f66018]"
                />
                <span className="text-[10px] text-[#e2bfb2]/60 mt-1 block">مثال: AFN یا افغانی</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-[#ffb599] mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">timer</span>
                  <span>تایمر محدودیت فراخوان گارسون (دقیقه)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={waiterCooldown}
                  onChange={(e) => setWaiterCooldown(Number(e.target.value))}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-amber-500/50 text-[#f9bd22] text-xs outline-none font-bold text-center"
                />
                <span className="text-[10px] text-[#e2bfb2]/60 mt-1 block">فاصله زمانی میان ۲ فراخوان از سر میز</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">wifi</span>
                  <span>نام شبکه وای‌فای رستوران (SSID)</span>
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="مثال: Saffron_Guest_5G"
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018]"
                />
                <span className="text-[10px] text-[#e2bfb2]/60 mt-1 block">نمایش به مهمان در صفحه منو</span>
              </div>
            </div>
          </div>

          {/* Section 2: Branch Info */}
          <div className="bg-[#201a17]/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="material-symbols-outlined text-[#f66018] text-[22px]">store</span>
              اطلاعات رسمی شعبه و شماره‌های تماس
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">نام رسمی شعبه و آدرس کامل</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">شماره تماس رزرو و پشتیبانی</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none font-mono focus:border-[#f66018]"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Receipt Header & Thermal Preview (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-[#201a17]/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="material-symbols-outlined text-[#f9bd22] text-[22px]">receipt_long</span>
              تنظیمات سربرگ فاکتور و پیش‌نمایش چاپی
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">عنوان سربرگ فاکتور (بل)</label>
              <input
                type="text"
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#e2bfb2] mb-1.5">پیام پابرگ و تشکر فاکتور</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white text-xs outline-none focus:border-[#f66018]"
              />
            </div>

            {/* Live Thermal Receipt Simulator */}
            <div className="mt-2">
              <span className="text-xs font-bold text-[#ffb599] flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>پیش‌نمایش زنده پرینتر حرارتی ۸۰ میلی‌متری:</span>
              </span>

              <div className="bg-[#120d0a] p-5 rounded-2xl font-mono text-[11px] text-[#ece0da] border border-white/10 flex flex-col gap-2.5 shadow-inner">
                <div className="text-center pb-2.5 border-b border-dashed border-white/20">
                  <span className="font-bold text-[#ffb599] text-sm font-sans">{receiptHeader}</span>
                  <span className="block text-[10px] text-[#e2bfb2] mt-0.5">{branchName}</span>
                  <span className="text-[10px] text-[#e2bfb2] dir-ltr mt-0.5">{phone}</span>
                </div>

                <div className="flex justify-between text-[#e2bfb2] text-[10px]">
                  <span>میز: ۳ (سالن اصلی)</span>
                  <span>فاکتور: #۱۰۸۴</span>
                </div>

                <div className="py-2 border-y border-dashed border-white/20 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>۱x قابلی پلو شاهانه</span>
                    <span>۵۲۰ {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>۲x منتو اصیل هراتی</span>
                    <span>۶۸۰ {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>۱x شله مشهدی زعفرانی</span>
                    <span>۲۴۰ {currency}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-[10px] text-[#e2bfb2]">
                  <div className="flex justify-between">
                    <span>جمع اقلام:</span>
                    <span>۱,۴۴۰ {currency}</span>
                  </div>
                  {taxPercent > 0 && (
                    <div className="flex justify-between">
                      <span>مالیات ({taxPercent}%):</span>
                      <span>{Math.round(1440 * (taxPercent / 100))} {currency}</span>
                    </div>
                  )}
                  {serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>حق سرویس ({serviceCharge}%):</span>
                      <span>{Math.round(1440 * (serviceCharge / 100))} {currency}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-dashed border-white/20">
                  <span>مبلغ قابل پرداخت:</span>
                  <span className="text-[#f9bd22]">{Math.round(1440 * (1 + (taxPercent + serviceCharge) / 100))} {currency}</span>
                </div>

                <div className="text-center pt-2 text-[10px] text-[#e2bfb2]/80 border-t border-dashed border-white/20 font-sans">
                  {receiptFooter}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
