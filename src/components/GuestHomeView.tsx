import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface GuestHomeViewProps {
  onStartOrder: (tableId: string, seatNumber: string, guestInfo?: { name: string; phone: string }) => void;
  onCallWaiter: () => void;
}

export const GuestHomeView: React.FC<GuestHomeViewProps> = ({ onStartOrder, onCallWaiter }) => {
  const [detectedTable, setDetectedTable] = useState<string>('t1');
  const [selectedSeat, setSelectedSeat] = useState<string>('1');
  const [phoneNumber, setPhone] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [wifiConnected, setWifiConnected] = useState<boolean>(false);
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [serviceMessage, setServiceMessage] = useState<string>('');

  useEffect(() => {
    // Load real tables from DB
    api.getTables().then(res => {
      setTables(res || []);
      // Check query params for table and cryptographic QR token
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table') || urlParams.get('table_id');
      const qrTokenParam = urlParams.get('qr_token');

      const targetTable = tableParam || (res && res.length > 0 ? res[0].id : 't1');
      setDetectedTable(targetTable);

      // Authenticate cryptographic table session with backend
      api.requestTableSession({
        table_id: targetTable,
        qr_token: qrTokenParam || undefined,
        seat_number: selectedSeat
      }).then(sessRes => {
        if (sessRes && sessRes.table_session_token) {
          localStorage.setItem('saffron_table_token', sessRes.table_session_token);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSendService = async (type: string) => {
    try {
      await api.sendServiceRequest({
        table_id: detectedTable,
        seat_number: selectedSeat,
        request_type: type
      });
      setShowServiceModal(false);
      setServiceMessage('درخواست شما فوراً برای مهماندار مسئول ارسال گردید.');
      setTimeout(() => setServiceMessage(''), 6000);
      onCallWaiter();
    } catch (e: any) {
      alert(e.message || 'خطا در ارسال درخواست.');
    }
  };

  const handleProceedToMenu = async () => {
    if (!selectedSeat) {
      alert('لطفاً شماره صندلی خود را انتخاب کنید.');
      return;
    }

    try {
      // Automatic real-time table check-in -> sets table status to OCCUPIED and yields secure table token
      const checkInRes = await api.guestCheckIn({
        table_id: detectedTable,
        seat_number: selectedSeat
      });
      if (checkInRes && checkInRes.table_session_token) {
        localStorage.setItem('saffron_table_token', checkInRes.table_session_token);
      }
    } catch (e) {}

    // Save customer phone for loyalty if entered
    if (phoneNumber) {
      api.registerLoyalty(phoneNumber, guestName).catch(() => {});
    }

    onStartOrder(detectedTable, selectedSeat, { name: guestName, phone: phoneNumber });
  };

  // Auto-adjust selected seat if it exceeds current table's capacity
  useEffect(() => {
    const meta = tables.find(t => t.id === detectedTable);
    const maxCap = Math.max(1, Number(meta?.capacity || 4));
    if (Number(selectedSeat) > maxCap) {
      setSelectedSeat('1');
    }
  }, [detectedTable, tables]);

  const currentTableMeta = tables.find(t => t.id === detectedTable);
  const tableName = currentTableMeta ? currentTableMeta.name : detectedTable.toUpperCase().replace('T', 'میز ');
  const assignedWaiter = currentTableMeta ? currentTableMeta.assigned_waiter : 'ZN-101';
  const tableCapacity = Math.max(1, Number(currentTableMeta?.capacity || 4));
  const availableSeats = Array.from({ length: tableCapacity }, (_, i) => String(i + 1));

  return (
    <div className="flex flex-col w-full max-w-[420px] mx-auto min-h-screen bg-[#18120f] text-[#ece0da] relative select-none pb-28">
      {/* Ambient Saffron Glows */}
      <div className="absolute top-0 right-4 w-44 h-44 rounded-full bg-[#f66018]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-2 w-52 h-52 rounded-full bg-[#f9bd22]/10 blur-3xl pointer-events-none"></div>

      {/* Service Request Feedback Banner */}
      {serviceMessage && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            <span>{serviceMessage}</span>
          </div>
          <button onClick={() => setServiceMessage('')} className="text-white/80 font-bold">✕</button>
        </div>
      )}

      {/* Luxury Crest Header */}
      <div className="flex flex-col items-center justify-center pt-6 pb-3 text-center px-4">
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#f9bd22] via-[#f66018] to-[#b73b01] p-0.5 shadow-lg flex items-center justify-center mb-2">
          <div className="w-full h-full rounded-full bg-[#120d0a] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#f9bd22] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2f2925]/60 backdrop-blur-md mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f9bd22] animate-pulse"></span>
          <span className="text-[10px] font-semibold text-[#ffdf9f] tracking-wider">سفارش‌گیر دیجیتال سر میز</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">رستوران زعفران و نارنج</h1>
        <p className="text-xs text-[#e2bfb2] mt-0.5">{tableName} • مهماندار: {assignedWaiter}</p>
      </div>

      {/* Table & Seat Selection Card */}
      <div className="px-4 mt-2">
        <div className="bg-[#201a17]/95 p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
              </span>
              <div>
                <span className="text-xs font-bold text-white block">{tableName}</span>
                <span className="text-[10px] text-[#e2bfb2]">مهماندار مسئول: {assignedWaiter}</span>
              </div>
            </div>
            {tables.length > 1 && (
              <select
                value={detectedTable}
                onChange={(e) => setDetectedTable(e.target.value)}
                className="bg-[#120d0a] text-white text-xs p-1.5 rounded-xl border border-white/10 outline-none font-bold"
              >
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.capacity} صندلی)</option>
                ))}
              </select>
            )}
          </div>

          {/* Seat Number Selector - Fully dynamic based on table.capacity */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#f9bd22] text-[18px]">event_seat</span>
                <span>انتخاب صندلی سر میز ({tableCapacity} صندلی):</span>
              </label>
              <span className="text-[10px] text-[#f9bd22] bg-[#f9bd22]/10 px-2 py-0.5 rounded font-bold font-mono">
                صندلی {selectedSeat} از {tableCapacity}
              </span>
            </div>

            <div className={`grid gap-1.5 mt-1 ${tableCapacity <= 3 ? 'grid-cols-3' : tableCapacity <= 4 ? 'grid-cols-4' : tableCapacity <= 6 ? 'grid-cols-6' : 'grid-cols-4 sm:grid-cols-6'}`}>
              {availableSeats.map((seat) => (
                <button
                  key={seat}
                  onClick={() => setSelectedSeat(seat)}
                  className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${
                    selectedSeat === seat
                      ? 'bg-[#f66018] text-white shadow-lg shadow-orange-500/40 scale-105 ring-2 ring-white/20'
                      : 'bg-[#120d0a] text-[#e2bfb2] hover:bg-[#2f2925] border border-white/5'
                  }`}
                >
                  <span className="text-[10px] opacity-75">صندلی</span>
                  <span className="text-sm font-mono font-extrabold">{seat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Loyalty Identification (Name & Phone) */}
          <div className="bg-[#120d0a]/70 p-3 rounded-2xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#f9bd22] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                عضویت و پوینت وفاداری (اختیاری):
              </span>
              <span className="text-[9px] text-[#e2bfb2]">تخفیف در سفارش بعدی</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="نام شما (اختیاری)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[#201a17] text-white placeholder:text-[#a98a7e]/40 text-xs outline-none border border-white/5"
              />
              <input
                type="tel"
                placeholder="شماره تماس (079...)"
                value={phoneNumber}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[#201a17] text-white placeholder:text-[#a98a7e]/40 text-xs outline-none border border-white/5 text-left font-mono"
                dir="ltr"
              />
            </div>
          </div>

          {/* Enter Menu Button */}
          <button
            onClick={handleProceedToMenu}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-xl">restaurant_menu</span>
            <span>مشاهده منوی غذا و ثبت سفارش (صندلی {selectedSeat})</span>
          </button>
        </div>
      </div>

      {/* Guest Quick Service Actions Grid */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#f9bd22] text-[18px]">room_service</span>
            خدمات فوری سر میز:
          </span>
          <span className="text-[10px] text-[#e2bfb2]">مستقیم به تبلت گارسون</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleSendService('waiter')}
            className="p-3 bg-[#201a17] hover:bg-[#2f2925] border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all text-right shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">صدا زدن گارسون</span>
              <span className="text-[9px] text-[#e2bfb2]">فراخوان سر میز</span>
            </div>
          </button>

          <button
            onClick={() => handleSendService('water')}
            className="p-3 bg-[#201a17] hover:bg-[#2f2925] border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all text-right shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">water_drop</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">آب معدنی و یخ</span>
              <span className="text-[9px] text-[#e2bfb2]">درخواست فوری نوشیدنی</span>
            </div>
          </button>

          <button
            onClick={() => handleSendService('cutlery')}
            className="p-3 bg-[#201a17] hover:bg-[#2f2925] border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all text-right shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#f9bd22] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">flatware</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">قاشق، چنگال و دستمال</span>
              <span className="text-[9px] text-[#e2bfb2]">ظروف اضافی</span>
            </div>
          </button>

          <button
            onClick={() => handleSendService('bill')}
            className="p-3 bg-[#201a17] hover:bg-[#2f2925] border border-white/10 rounded-2xl flex items-center gap-2.5 transition-all text-right shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block">درخواست صورت‌حساب</span>
              <span className="text-[9px] text-[#e2bfb2]">تسویه نقدی سر میز</span>
            </div>
          </button>
        </div>
      </div>

      {/* Wi-Fi Helper Card */}
      <div className="px-4 mt-3">
        <div className="bg-[#201a17]/70 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#f9bd22] text-[20px]">wifi</span>
            <div>
              <span className="text-xs font-bold text-white block">وای‌فای رایگان مهمانان</span>
              <span className="text-[10px] text-[#e2bfb2]">رمز شبکه: Zafaran@2024</span>
            </div>
          </div>
          <button
            onClick={() => { setWifiConnected(true); alert('رمز وای‌فای کپی شد: Zafaran@2024'); }}
            className="px-3 py-1 bg-[#2f2925] hover:bg-[#3a3330] text-white rounded-xl text-xs font-bold transition-all"
          >
            {wifiConnected ? 'متصل شد ✓' : 'اتصال'}
          </button>
        </div>
      </div>
    </div>
  );
};
