import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const PosBillingView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [tableStatus, setTableStatus] = useState<any>({});
  const [selectedTable, setSelectedTable] = useState<string>('t3');
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  
  // Payment states
  const [cashReceived, setCashReceived] = useState('4000');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pos' | 'wallet'>('cash');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Void modal states
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [targetOrderItemId, setTargetOrderItemId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [approverUser, setApproverUser] = useState('');
  const [approverPass, setApproverPass] = useState('');
  const [voidError, setVoidError] = useState('');

  const loadData = () => {
    api.getOrders().then(setOrders).catch(() => {});
    api.getTableStatuses().then(setTableStatus).catch(() => {});
    api.getTables().then(res => {
      setTablesList(res || []);
      if (res && res.length > 0 && !selectedTable) {
        setSelectedTable(res[0].id);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
    // Generate unique idempotency key on mount or after successful payment
    generateIdempotencyKey();
  }, []);

  const currentTableObj = tablesList.find(t => t.id === selectedTable);
  const tableName = currentTableObj ? currentTableObj.name : selectedTable.toUpperCase().replace('T', 'میز ');
  const tableCapacity = Math.max(1, Number(currentTableObj?.capacity || 4));
  const availableSeats = Array.from({ length: tableCapacity }, (_, i) => String(i + 1));

  // Reset seat if out of bounds for current table
  useEffect(() => {
    if (selectedSeat && Number(selectedSeat) > tableCapacity) {
      setSelectedSeat('');
    }
  }, [selectedTable, tablesList]);

  const generateIdempotencyKey = () => {
    setIdempotencyKey('IK-' + Math.random().toString(36).substr(2, 9).toUpperCase());
  };

  // Filter orders matching selected table & status
  const activeOrdersForTable = orders.filter(
    (o) => o.table_id === selectedTable && o.status === 'active'
  );

  // Group items to list
  let billItems: any[] = [];
  activeOrdersForTable.forEach((order) => {
    order.items.forEach((item: any) => {
      // If we filtered by seat, match it
      if (!selectedSeat || order.seat_number === selectedSeat) {
        billItems.push({
          ...item,
          order_id: order.id,
          seat_number: order.seat_number
        });
      }
    });
  });

  const totalBill = billItems
    .filter(i => i.status !== 'voided')
    .reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  // Discount calculation
  const discount = Math.round(totalBill * 0.05); // 5% discount
  const finalPayable = Math.max(0, totalBill - discount);

  const receivedNum = parseInt(cashReceived) || 0;
  const changeNum = Math.max(0, receivedNum - finalPayable);

  // Handle Idempotent Settlement (Rule [7])
  const handleSettlement = async () => {
    if (finalPayable === 0) {
      alert('مبلغ قابل پرداختی وجود ندارد.');
      return;
    }

    try {
      const res = await api.processPayment({
        idempotency_key: idempotencyKey,
        table_id: selectedTable,
        seat_number: selectedSeat || null,
        amount: finalPayable,
        method: paymentMethod
      });

      alert('تسویه حساب با موفقیت انجام شد و اطلاعات ثبت گردید.');
      generateIdempotencyKey();
      loadData();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت تراکنش.');
    }
  };

  // Open Void Modal Dialog (Rule [5])
  const triggerVoid = (orderItemId: string) => {
    setTargetOrderItemId(orderItemId);
    setVoidReason('');
    setApproverUser('');
    setApproverPass('');
    setVoidError('');
    setShowVoidModal(true);
  };

  const submitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoidError('');

    if (!voidReason || !approverUser || !approverPass) {
      setVoidError('لطفاً تمامی فیلدها را وارد نمایید.');
      return;
    }

    try {
      await api.voidOrderItem({
        order_item_id: targetOrderItemId,
        void_reason: voidReason,
        approved_by_username: approverUser,
        password: approverPass
      });

      setShowVoidModal(false);
      alert('آیتم با موفقیت ابطال گردید و در لاگ امنیتی ثبت شد.');
      loadData();
    } catch (err: any) {
      setVoidError(err.message || 'نام کاربری یا رمز عبور تاییدکننده معتبر نیست.');
    }
  };

  return (
    <div className="flex flex-col w-full min-w-0 p-6 gap-6 relative overflow-hidden">
      {/* Cashier Global Bar */}
      <section className="w-full bg-[#201a17]/80 backdrop-blur-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl border border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-[#2f2925] px-4 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-[#f66018]/20 flex items-center justify-center text-[#ffb599]">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#e2bfb2]">صندوق‌دار شیفت عصر</span>
              <span className="text-[15px] font-bold text-white">فرشته صمدی <span className="text-xs text-[#f9bd22]">#POS-04</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#2f2925]/60 px-4 py-2 rounded-xl">
            <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">payments</span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#e2bfb2]">کلید پرداخت تکرار فعال</span>
              <span className="text-[11px] text-emerald-400 font-mono select-all font-bold">{idempotencyKey}</span>
            </div>
          </div>
        </div>
      </section>

      {/* POS 3 Columns Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Col 1: Queue */}
        <div className="lg:col-span-3 bg-[#201a17]/80 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffb599] text-[18px]">table_restaurant</span>
              میزهای فعال سالن کابل
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
            {Object.keys(tableStatus).length === 0 && (
              <div className="p-4 text-center text-xs text-[#e2bfb2]">هیچ میزی در دیتابیس ثبت نشده است.</div>
            )}
            {Object.keys(tableStatus).map((tabId) => {
              const status = tableStatus[tabId];
              const isSelected = selectedTable === tabId;
              const meta = tablesList.find(t => t.id === tabId);
              const tabDisplayName = meta ? meta.name : tabId.toUpperCase().replace('T', 'میز ');
              const tabCap = meta ? meta.capacity : 4;

              return (
                <div
                  key={tabId}
                  onClick={() => { setSelectedTable(tabId); setSelectedSeat(''); }}
                  className={`p-3 rounded-xl flex flex-col gap-2 cursor-pointer transition-all border ${
                    isSelected ? 'bg-[#f66018]/20 border-[#f66018]/50' : 'bg-[#2f2925]/60 border-white/5 hover:bg-[#2f2925]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${status === 'occupied' ? 'bg-[#f66018] animate-pulse' : 'bg-emerald-500'}`}></span>
                      {tabDisplayName} ({tabCap} صندلی)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      status === 'occupied' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {status === 'occupied' ? 'مشغول' : 'خالی'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2: Active Bill Items */}
        <div className="lg:col-span-5 bg-[#201a17]/80 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-[#120d0a]/60 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{tableName}</span>
                  <select
                    value={selectedSeat}
                    onChange={(e) => setSelectedSeat(e.target.value)}
                    className="bg-[#1a1921] border border-white/10 text-[#ece0da] text-xs p-1.5 rounded-lg outline-none font-bold"
                  >
                    <option value="">همه صندلی‌ها (کل میز {tableCapacity} نفره)</option>
                    {availableSeats.map(s => (
                      <option key={s} value={s}>صندلی {s}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-[#e2bfb2]">مجموعاً {billItems.length} ردیف کالا در فاکتور</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
            {billItems.length === 0 && (
              <div className="p-8 text-center text-xs text-[#e2bfb2] border border-dashed border-white/10 rounded-xl">
                هیچ سفارش فعالی برای این میز/صندلی ثبت نشده است.
              </div>
            )}
            {billItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center bg-[#120d0a]/50 p-3 rounded-xl border border-white/5">
                <div className="col-span-6 flex flex-col">
                  <span className={`font-bold text-white text-sm ${item.status === 'voided' ? 'line-through opacity-40' : ''}`}>
                    {item.name}
                  </span>
                  <span className="text-[11px] text-[#e2bfb2]">صندلی {item.seat_number} • {item.quantity} عدد</span>
                </div>
                <div className="col-span-3 text-center text-xs text-[#e2bfb2]">
                  {item.status === 'voided' ? (
                    <span className="text-red-400 font-bold">ابطال شد</span>
                  ) : (
                    <span>{item.status}</span>
                  )}
                </div>
                <div className="col-span-3 text-left flex items-center justify-end gap-2">
                  <span className="font-bold text-white text-sm">{item.unit_price * item.quantity} AFN</span>
                  {item.status !== 'voided' && (
                    <button
                      onClick={() => triggerVoid(item.id)}
                      className="text-red-400 hover:text-red-300 material-symbols-outlined text-[18px]"
                      title="ابطال این ردیف"
                    >
                      block
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Calculations */}
          <div className="bg-[#120d0a]/80 rounded-xl p-4 flex flex-col gap-2 text-xs text-[#e2bfb2] border border-white/5">
            <div className="flex justify-between items-center">
              <span>جمع اقلام سفارش:</span>
              <span className="font-bold text-white">{totalBill.toLocaleString()} AFN</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">تخفیف وفاداری باشگاه <span className="bg-primary/25 text-[#ffb599] px-1.5 rounded text-[10px]">۵٪</span></span>
              <span className="text-rose-400 font-bold">-{discount.toLocaleString()} AFN</span>
            </div>
            <div className="h-px bg-white/10 my-1"></div>
            <div className="flex justify-between items-end">
              <span className="text-[#ffb599] font-bold">مبلغ نهایی قابل پرداخت:</span>
              <span className="text-2xl font-extrabold text-[#ffb599]">{finalPayable.toLocaleString()} AFN</span>
            </div>
          </div>
        </div>

        {/* Col 3: Payment Terminal & Thermal Receipt */}
        <div className="lg:col-span-4 bg-[#201a17]/80 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">روش پرداخت و تسویه</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 shadow-md font-bold text-xs transition-all ${
                paymentMethod === 'cash' ? 'bg-[#f66018] text-white ring-2 ring-orange-500/40' : 'bg-[#2f2925] text-white hover:bg-[#38312d]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              <span>تسویه نقدی (وجه نقد)</span>
            </button>
            <button
              onClick={() => setPaymentMethod('pos')}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                paymentMethod === 'pos' ? 'bg-[#f66018] text-white ring-2 ring-orange-500/40' : 'bg-[#2f2925] text-white hover:bg-[#38312d]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
              <span>کارت‌خوان بانکی (POS)</span>
            </button>
          </div>

          <div className="bg-[#120d0a]/90 p-3 rounded-xl flex flex-col gap-2 border border-white/5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#e2bfb2]">مبلغ دریافتی نقد:</span>
              <div className="flex items-center gap-1 bg-[#2f2925] px-2.5 py-1 rounded-lg">
                <input
                  type="text"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-20 bg-transparent text-left font-bold text-white outline-none"
                />
                <span className="text-[#e2bfb2]">AFN</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[#f9bd22] font-semibold">باقیمانده جهت عودت:</span>
              <span className="text-lg font-extrabold text-[#f9bd22]">{changeNum.toLocaleString()} AFN</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleSettlement}
            className="w-full bg-[#f66018] hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>تایید تسویه و ثبت فاکتور</span>
          </button>
        </div>
      </div>

      {/* Security-Approved Void Modal (Rule [5]) */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={submitVoid} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5 text-red-400">
                <span className="material-symbols-outlined">warning</span>
                تایید امنیتی ابطال آیتم فاکتور
              </h3>
              <button type="button" onClick={() => setShowVoidModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {voidError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {voidError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#e2bfb2] mb-1">دلیل ابطال (جهت ثبت در لاگ امنیتی) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تغییر نظر مشتری / اشتباه گارسون"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">نام کاربری تاییدکننده *</label>
                  <input
                    type="text"
                    required
                    placeholder="ZN-101"
                    value={approverUser}
                    onChange={(e) => setApproverUser(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">رمز تاییدکننده *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    value={approverPass}
                    onChange={(e) => setApproverPass(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowVoidModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md">تایید و ثبت ابطال</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
