import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const CustomerClubView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filterTier, setFilterTier] = useState<'all' | 'vip' | 'silver'>('all');

  // New customer states
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [addError, setAddError] = useState('');

  // Redeem states
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [cashierUser, setCashierUser] = useState('');
  const [cashierPass, setCashierPass] = useState('');
  const [redeemError, setRedeemError] = useState('');

  const loadData = () => {
    api.getCustomers().then(setCustomers).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!phone) {
      setAddError('شماره تلفن الزامی است.');
      return;
    }

    try {
      await api.registerLoyalty(phone, name);
      setShowAddModal(false);
      setPhone('');
      setName('');
      alert('مشتری با موفقیت در باشگاه ثبت‌نام شد.');
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'خطا در ثبت‌نام مشتری.');
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError('');

    if (!targetPhone || !redeemPoints || !cashierUser || !cashierPass) {
      setRedeemError('پر کردن تمامی فیلدها الزامی است.');
      return;
    }

    try {
      await api.redeemLoyalty({
        phone: targetPhone,
        points: Number(redeemPoints),
        cashier_username: cashierUser,
        password: cashierPass
      });

      setShowRedeemModal(false);
      setTargetPhone('');
      setRedeemPoints('');
      setCashierUser('');
      setCashierPass('');
      alert('پوینت‌ها با موفقیت مصرف و از فاکتور کسر گردید.');
      loadData();
    } catch (err: any) {
      setRedeemError(err.message || 'خطا در تایید پوینت.');
    }
  };

  const triggerRedeem = (phoneStr: string) => {
    setTargetPhone(phoneStr);
    setRedeemPoints('');
    setCashierUser('');
    setCashierPass('');
    setRedeemError('');
    setShowRedeemModal(true);
  };

  const getTier = (points: number) => {
    if (points >= 3500) return 'VIP طلایی';
    if (points >= 1000) return 'سطح نقره‌ای';
    return 'سطح برنزی';
  };

  const filtered = customers.filter(c => {
    const tier = getTier(c.points);
    if (filterTier === 'all') return true;
    if (filterTier === 'vip') return tier.includes('طلایی');
    if (filterTier === 'silver') return tier.includes('نقره‌ای');
    return true;
  });

  return (
    <div className="flex flex-col w-full p-6 gap-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#f9bd22] uppercase tracking-wider">سیستم وفاداری و تجارب مهمانان</span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">باشگاه مشتریان و مدیریت ارتباط با مهمانان (CRM)</h1>
          <p className="text-sm text-[#e2bfb2]">ثبت علایق غذایی، ارتقای سطوح وفاداری، شارژ کیف پول و ارسال کمپاین‌های اختصاصی</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#f66018] text-white text-xs font-bold shadow-lg shadow-orange-500/30 hover:brightness-110 active:scale-95 transition-all"
          >
            + ثبت مشتری جدید
          </button>
        </div>
      </div>

      {/* Filter Tiers */}
      <div className="flex items-center gap-2 bg-[#201a17] p-2 rounded-xl border border-white/10 w-fit">
        <button onClick={() => setFilterTier('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier === 'all' ? 'bg-[#f66018] text-white' : 'text-[#e2bfb2]'}`}>همه ({customers.length})</button>
        <button onClick={() => setFilterTier('vip')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier === 'vip' ? 'bg-[#f66018] text-white' : 'text-[#e2bfb2]'}`}>VIP و طلایی</button>
        <button onClick={() => setFilterTier('silver')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTier === 'silver' ? 'bg-[#f66018] text-white' : 'text-[#e2bfb2]'}`}>نقره‌ای</button>
      </div>

      {/* Customer List */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 && (
          <div className="p-12 text-center bg-[#201a17]/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#f9bd22]">loyalty</span>
            <h3 className="text-lg font-bold text-white">هیچ مشتری‌ای در باشگاه ثبت نشده است</h3>
            <p className="text-xs text-[#e2bfb2]">با ثبت شماره همراه مهمان، پرونده وفاداری ایشان ایجاد می‌گردد.</p>
          </div>
        )}
        {filtered.map((c, i) => (
          <div key={i} className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#f9bd22]/20 text-[#f9bd22] flex items-center justify-center font-bold text-base shrink-0">
                {c.name.slice(0, 2)}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-bold text-white text-base">{c.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f9bd22]/20 text-[#f9bd22] text-xs font-semibold">{getTier(c.points)} • تلفن {c.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between xl:justify-end gap-6 pt-4 xl:pt-0 border-t xl:border-t-0 border-white/5">
              <div className="text-left">
                <span className="text-[11px] text-[#e2bfb2] block">امتیاز کیف پول</span>
                <span className="font-bold text-[#ffb599] text-sm">{c.points} پوینت</span>
              </div>
              <button
                onClick={() => triggerRedeem(c.phone)}
                className="px-3 py-2 rounded-xl bg-[#f66018]/20 hover:bg-[#f66018] text-[#ffb59c] hover:text-white text-xs font-semibold"
              >
                مصرف پوینت سر میز
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Register Customer Modal (Rule [8] - Frictionless free registration) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleRegister} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">ثبت‌نام مشتری جدید در باشگاه وفاداری</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {addError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#e2bfb2] mb-1">شماره تلفن مشتری (کلید شناسایی یکتا) *</label>
                <input
                  type="text"
                  required
                  placeholder="0799112233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1">نام و تخلص مهمان</label>
                <input
                  type="text"
                  placeholder="مثال: حاجی ظاہر"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-[#f66018] text-white rounded-xl text-xs font-bold shadow-md">ثبت‌نام آنی</button>
            </div>
          </form>
        </div>
      )}

      {/* Redeem Points Modal (Rule [8] - Cashier friction approved) */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleRedeem} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-base font-bold text-[#f9bd22] flex items-center gap-1.5">
                <span className="material-symbols-outlined">verified</span>
                تایید صندوق‌دار جهت خرج امتیازات باشگاه
              </h3>
              <button type="button" onClick={() => setShowRedeemModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {redeemError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {redeemError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">تلفن مشتری</label>
                  <input
                    type="text"
                    disabled
                    value={targetPhone}
                    className="w-full bg-[#120d0a]/60 p-3 rounded-xl border border-white/10 text-gray-400 outline-none text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">تعداد پوینت جهت مصرف *</label>
                  <input
                    type="number"
                    required
                    placeholder="۵۰۰"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">یوزرنیم صندوق‌دار *</label>
                  <input
                    type="text"
                    required
                    placeholder="ZN-108"
                    value={cashierUser}
                    onChange={(e) => setCashierUser(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">رمز عبور صندوق‌دار *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    value={cashierPass}
                    onChange={(e) => setCashierPass(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRedeemModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-[#f66018] text-white rounded-xl text-xs font-bold shadow-md">تایید و کسر پوینت</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
