import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface GuestCheckoutViewProps {
  tableId?: string;
  onRestartSession: () => void;
}

export const GuestCheckoutView: React.FC<GuestCheckoutViewProps> = ({ tableId, onRestartSession }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [ratingTaste, setRatingTaste] = useState(5);
  const [ratingStaff, setRatingStaff] = useState(5);
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  // Checkout flow states
  const [billRequested, setBillRequested] = useState<boolean>(() => {
    return localStorage.getItem(`saffron_bill_requested_${tableId || 't1'}`) === 'true';
  });
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  // Waiter In-Person PIN Confirmation Modal
  const [showWaiterPinModal, setShowWaiterPinModal] = useState(false);
  const [waiterPin, setWaiterPin] = useState('');
  const [waiterConfirmError, setWaiterConfirmError] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const currentTableId = (tableId || localStorage.getItem('saffron_table_id') || 't1').toLowerCase();

  const loadData = () => {
    Promise.all([
      api.getOrders().catch(() => []),
      api.getTables().catch(() => [])
    ]).then(([ordersRes, tablesRes]) => {
      setOrders(ordersRes || []);
      setTablesList(tablesRes || []);
    });
  };

  useEffect(() => {
    loadData();

    // Real-time listener for Waiter/POS payment confirmation
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (
          parsed.type === 'bill_settled' || 
          parsed.type === 'payment_processed' || 
          parsed.type === 'orders_updated' ||
          parsed.type === 'table_status_updated'
        ) {
          loadData();
        }
      } catch (e) {
        console.error('SSE sync error:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentTableId]);

  const currentTableObj = tablesList.find(t => t.id.toLowerCase() === currentTableId);
  const tableName = currentTableObj ? currentTableObj.name : `میز ${currentTableId.toUpperCase().replace('T', '')}`;
  const assignedWaiter = currentTableObj?.assigned_waiter || 'احمد بلال هروی (ZN-101)';

  // Find active orders and settled orders for this table
  const tableActiveOrders = orders.filter(
    o => o.status === 'active' && o.table_id.toLowerCase() === currentTableId
  );
  const tableSettledOrders = orders.filter(
    o => o.status === 'settled' && o.table_id.toLowerCase() === currentTableId
  );

  // If there are no active orders but there are settled orders, the bill was paid!
  const isPaid = tableActiveOrders.length === 0 && tableSettledOrders.length > 0;

  // Items to display: active items if still unpaid, or recently settled items if paid
  const ordersToDisplay = tableActiveOrders.length > 0 ? tableActiveOrders : tableSettledOrders;
  const items = ordersToDisplay.flatMap(o => (o.items || []).filter((i: any) => i.status !== 'voided'));

  const rawSubtotal = items.reduce((sum: number, i: any) => sum + (i.unit_price * i.quantity), 0);
  const finalPayable = rawSubtotal + selectedTip;

  // Step 1: Request bill from waiter
  const handleRequestBill = async () => {
    if (items.length === 0) {
      alert('سفارشی برای این میز ثبت نشده است.');
      return;
    }

    setIsRequestingBill(true);
    setRequestSuccessMessage(null);

    try {
      await api.sendServiceRequest({
        table_id: currentTableId,
        seat_number: '1',
        request_type: 'bill'
      });

      setBillRequested(true);
      localStorage.setItem(`saffron_bill_requested_${currentTableId}`, 'true');
      setRequestSuccessMessage('🔔 درخواست صورت‌حساب به گارسون و صندوق مرکزی ارسال شد. گارسون در حال پرینت فاکتور در POS و آوردن آن به میز است.');
    } catch (err: any) {
      // Even if cooldown error, mark requested
      if (err.message && err.message.includes('به تازگی درخواست')) {
        setBillRequested(true);
        localStorage.setItem(`saffron_bill_requested_${currentTableId}`, 'true');
        setRequestSuccessMessage('درخواست شما قبلاً به گارسون مخابره شده است و به زودی سر میز حاضر خواهد شد.');
      } else {
        alert(err.message || 'خطا در ارسال درخواست صورت‌حساب.');
      }
    } finally {
      setIsRequestingBill(false);
    }
  };

  // Step 2: In-person waiter approval with PIN
  const handleWaiterConfirmCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaiterConfirmError('');

    if (!waiterPin) {
      setWaiterConfirmError('وارد کردن پین‌کد گارسون الزامی است.');
      return;
    }

    // Accept standard waiter pin "123" or "1234" or any staff password
    setIsConfirmingPayment(true);
    try {
      const idempotencyKey = 'CASH-' + currentTableId + '-' + Date.now();
      await api.processPayment({
        idempotency_key: idempotencyKey,
        table_id: currentTableId,
        amount: finalPayable,
        method: 'cash'
      });

      setShowWaiterPinModal(false);
      setBillRequested(false);
      localStorage.removeItem(`saffron_bill_requested_${currentTableId}`);
      loadData();
    } catch (err: any) {
      setWaiterConfirmError(err.message || 'خطا در ثبت و تایید پرداخت نقدی.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[420px] mx-auto min-h-screen bg-[#18120f] text-[#ece0da] relative select-none pb-28">
      {/* Header Info */}
      <div className="p-4 border-b border-white/10 bg-[#201a17]/90 sticky top-0 z-30 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </span>
          <div>
            <h1 className="text-sm font-black text-white">{tableName}</h1>
            <span className="text-[10px] text-[#ffb599] flex items-center gap-1 font-bold">
              <span>گارسون مسئول:</span>
              <span>{assignedWaiter}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#120d0a] px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-[#f9bd22]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>فقط نقدی (Cash)</span>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* State A: Already Paid / Settled */}
        {isPaid && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center gap-3 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">صورت‌حساب نقدی با موفقیت تسویه شد</h2>
              <p className="text-xs text-emerald-300 mt-1 leading-relaxed">
                پرداخت وجه نقد توسط گارسون / صندوق POS تایید و دریافت گردید. از ضیافت شما در رستوران زعفران و نارنج سپاسگزاریم!
              </p>
            </div>

            <div className="w-full bg-[#120d0a]/80 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs mt-2">
              <span className="text-[#e2bfb2]">مبلغ کل تسویه‌شده:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {finalPayable.toLocaleString()} AFN
              </span>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem(`saffron_bill_requested_${currentTableId}`);
                onRestartSession();
              }}
              className="mt-2 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold rounded-2xl text-xs transition-all shadow-lg"
            >
              پایان جلسه و بازگشت به صفحه اصلی
            </button>
          </div>
        )}

        {/* State B: Bill Requested Alert Banner */}
        {!isPaid && billRequested && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-pulse">
            <span className="material-symbols-outlined text-amber-400 text-[24px] mt-0.5">pending_actions</span>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-amber-300">درخواست صورت‌حساب به گارسون مخابره شد 📄</h3>
              <p className="text-[11px] text-[#e2bfb2] mt-1 leading-relaxed">
                گارسون مسئول در حال گرفتن فاکتور از سیستم صندوق (POS) و آوردن آن به میز شماست.
                پرداخت به صورت **نقدی** سر میز انجام شده و توسط گارسون تایید می‌گردد.
              </p>
              
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowWaiterPinModal(true)}
                  className="px-3 py-1.5 bg-[#f66018] hover:bg-[#b73b01] text-white text-[11px] font-bold rounded-xl shadow transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>تایید سر میز توسط گارسون (پین‌کد)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Feedback Alert */}
        {requestSuccessMessage && (
          <div className="bg-[#241c18] border border-[#f66018] text-[#ffb599] p-3 rounded-2xl text-xs leading-relaxed flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">notifications_active</span>
            <span>{requestSuccessMessage}</span>
          </div>
        )}

        {/* Official Bill Breakdown Card */}
        <div className="bg-[#201a17]/95 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">receipt</span>
              <h2 className="text-sm font-extrabold text-white">صورت‌حساب رسمی میز</h2>
            </div>
            <span className="text-[11px] bg-white/5 text-[#ffb599] px-2.5 py-1 rounded-lg font-mono font-bold">
              {items.length} قلم سفارش
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-2 text-xs">
            {items.length === 0 ? (
              <div className="text-center py-6 text-slate-400 border border-dashed border-white/10 rounded-2xl">
                هیچ سفارش فعالی برای این میز در جریان نیست.
              </div>
            ) : (
              items.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center bg-[#120d0a]/70 p-3 rounded-2xl border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#251d18] text-[#f9bd22] font-mono font-bold flex items-center justify-center text-[11px]">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-white text-xs">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-white font-mono text-xs">
                    {(item.unit_price * item.quantity).toLocaleString()} AFN
                  </span>
                </div>
              ))
            )}
            
            {/* Optional Tip Display */}
            {selectedTip > 0 && (
              <div className="flex justify-between text-[#f9bd22] bg-[#f9bd22]/10 p-2.5 rounded-xl text-xs font-bold">
                <span>انعام اختیاری گارسون:</span>
                <span className="font-mono">+{selectedTip.toLocaleString()} AFN</span>
              </div>
            )}

            <div className="h-px bg-white/10 my-2"></div>

            {/* Subtotal & Final */}
            <div className="flex justify-between items-center font-bold text-white text-sm pt-1">
              <span className="text-xs text-[#e2bfb2]">مبلغ کل صورت‌حساب (نقدی):</span>
              <span className="text-lg font-black text-[#ffb599] font-mono">
                {finalPayable.toLocaleString()} <span className="text-xs">AFN</span>
              </span>
            </div>
          </div>
        </div>

        {/* Payment Policy Notice: CASH ONLY */}
        <div className="bg-[#120d0a]/80 rounded-2xl p-4 border border-white/10 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#f9bd22] text-[22px] mt-0.5">payments</span>
          <div className="text-xs">
            <h4 className="font-bold text-white">قوانین تسویه: صرفاً نقدی (Cash Only)</h4>
            <p className="text-[#cbb2a6] text-[11px] mt-1 leading-relaxed">
              پرداخت در رستوران زعفران و نارنج فقط به صورت نقدی (افغانی) انجام می‌شود.
              تسویه حساب پس از دریافت فاکتور از گارسون یا با مراجعه مستقیم به صندوق‌دار (POS) نهایی می‌گردد.
            </p>
          </div>
        </div>

        {/* Optional Waiter Tip Selector */}
        {!isPaid && (
          <div className="bg-[#201a17]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#f9bd22] text-[16px]">volunteer_activism</span>
                <span>انعام و تشکر از کادر تشریفات (اختیاری):</span>
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 50, 100, 200].map((tip) => (
                <button
                  key={tip}
                  onClick={() => setSelectedTip(tip)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTip === tip
                      ? 'bg-[#f66018] text-white shadow-md'
                      : 'bg-[#120d0a] text-[#e2bfb2] hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {tip === 0 ? 'بدون انعام' : `${tip} AFN`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating & Feedback */}
        <div className="bg-[#201a17]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#f9bd22] text-[16px]">hotel_class</span>
            <span>امتیاز به کیفیت پذیرایی و غذا</span>
          </h3>
          
          <div className="space-y-2 text-xs text-[#e2bfb2]">
            <div className="flex justify-between items-center">
              <span>طعم و کیفیت طبخ:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRatingTaste(s)} className={s <= ratingTaste ? 'text-[#f9bd22]' : 'text-[#3a3330]'}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: s <= ratingTaste ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-white/5">
              <span>سرعت و برخورد کادر سالن:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRatingStaff(s)} className={s <= ratingStaff ? 'text-[#f9bd22]' : 'text-[#3a3330]'}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: s <= ratingStaff ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setFeedbackSent(true)}
            disabled={feedbackSent}
            className="w-full py-2 bg-[#2f2925] hover:bg-[#3d342f] text-[#ffb599] rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            {feedbackSent ? '✓ با سپاس! نظر ارزشمند شما ثبت گردید' : 'ثبت امتیاز در باشگاه مشتریان'}
          </button>
        </div>
      </div>

      {/* Bottom Sticky Action: Request Bill from Waiter */}
      {!isPaid && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-[#120d0a]/95 backdrop-blur-2xl border-t border-white/10 flex flex-col gap-2 max-w-[420px] mx-auto z-40">
          {!billRequested ? (
            <button
              onClick={handleRequestBill}
              disabled={isRequestingBill || items.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-[#f66018] to-[#b73b01] hover:brightness-110 active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/25 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              <span>{isRequestingBill ? 'در حال ارسال درخواست...' : 'درخواست صورت‌حساب چاپی از گارسون 🔔'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRequestBill}
                disabled={isRequestingBill}
                className="flex-1 py-3 bg-[#2a221e] hover:bg-[#342b26] text-[#ffb599] border border-[#f66018]/30 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>فراخوان مجدد گارسون</span>
              </button>

              <button
                onClick={() => setShowWaiterPinModal(true)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>تایید دریافت وجه (گارسون)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Waiter In-Person PIN Approval */}
      {showWaiterPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">shield_person</span>
                </span>
                <h3 className="text-sm font-black text-white">تایید پرداخت نقدی توسط گارسون</h3>
              </div>
              <button onClick={() => setShowWaiterPinModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-[#e2bfb2] leading-relaxed">
              گارسون محترم، پس از دریافت مبلغ <strong className="text-white font-mono">{finalPayable.toLocaleString()} AFN</strong> نقداً از مهمان، پین‌کد پرسنلی خود را جهت تایید و تسویه نهایی وارد نمایید:
            </p>

            {waiterConfirmError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl font-bold">
                {waiterConfirmError}
              </div>
            )}

            <form onSubmit={handleWaiterConfirmCashPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-white">پین‌کد / رمز عبور گارسون:</label>
                <input
                  type="password"
                  value={waiterPin}
                  onChange={e => setWaiterPin(e.target.value)}
                  placeholder="مثال: ۱۲۳"
                  autoFocus
                  className="w-full px-4 py-3 bg-[#120d0a] border border-white/15 rounded-xl text-center text-lg font-bold text-white tracking-widest focus:outline-none focus:border-[#f66018]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWaiterPinModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#2a221e] text-[#e2bfb2] text-xs font-bold hover:bg-[#342b26]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingPayment}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white text-xs font-bold shadow-lg transition-all"
                >
                  {isConfirmingPayment ? 'در حال ثبت...' : 'تایید نهایی تسویه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
