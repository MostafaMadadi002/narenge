import React, { useState } from 'react';
import { GuestHomeView } from './GuestHomeView';
import { GuestMenuView } from './GuestMenuView';
import { GuestOrderTrackingView } from './GuestOrderTrackingView';
import { GuestCheckoutView } from './GuestCheckoutView';
import { api } from '../api';

interface GuestPortalContainerProps {
  onBackToAdmin?: () => void;
}

export const GuestPortalContainer: React.FC<GuestPortalContainerProps> = ({ onBackToAdmin }) => {
  const [subView, setSubView] = useState<'home' | 'menu' | 'tracking' | 'checkout'>('home');
  
  // Dynamic table and seat from Zero step
  const [tableId, setTableId] = useState<string>('t1');
  const [seatNumber, setSeatNumber] = useState<string>('1');
  const [guestInfo, setGuestInfo] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  // Placed Order Tracking
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const handleCallWaiter = () => {
    api.sendServiceRequest({ table_id: tableId, seat_number: seatNumber, request_type: 'waiter' })
      .then(() => alert(`🔔 درخواست گارسون برای ${tableId.toUpperCase()} (صندلی ${seatNumber}) ثبت شد و گارسون مسئول مطلع گردید.`))
      .catch((err: any) => alert(err.message || 'خطا در ثبت درخواست گارسون.'));
  };

  const handlePlaceDirectOrder = async (cartItems: any[], chefNote: string) => {
    if (!cartItems || cartItems.length === 0) {
      alert('سبد خرید شما خالی است.');
      return;
    }

    try {
      const orderPayload = {
        table_id: tableId,
        seat_number: seatNumber,
        customer_phone: guestInfo.phone || undefined,
        customer_name: guestInfo.name || undefined,
        items: cartItems.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          unit_price: item.price,
          quantity: item.qty || 1,
          chef_note: chefNote || '',
          addons: []
        }))
      };

      const res = await api.placeOrder(orderPayload);
      setPlacedOrder(res.order);
      setSubView('tracking');
      
      const loyaltyMsg = res.earned_points > 0 ? ` (+${res.earned_points} پوینت وفاداری برای شما ثبت شد)` : '';
      alert(`سفارش شما برای صندلی ${seatNumber} با موفقیت به مطبخ ارسال گردید!${loyaltyMsg}`);
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت سفارش.');
    }
  };

  return (
    <div className="min-h-screen bg-[#18120f] pb-safe flex flex-col justify-between relative">
      {onBackToAdmin && (
        <div className="fixed top-3 left-3 z-50">
          <button
            onClick={onBackToAdmin}
            className="px-3 py-1 bg-black/85 backdrop-blur-md text-[#ffdf9f] hover:text-white rounded-full text-[10px] font-bold border border-white/20 shadow-lg flex items-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            <span>پنل مدیریت</span>
          </button>
        </div>
      )}
      <div className="flex-grow">
        {subView === 'home' && (
          <GuestHomeView
            onStartOrder={(tbl, seat, info) => {
              setTableId(tbl);
              setSeatNumber(seat);
              if (info) setGuestInfo(info);
              setSubView('menu');
            }}
            onCallWaiter={handleCallWaiter}
          />
        )}
        {subView === 'menu' && (
          <GuestMenuView
            tableId={tableId}
            seatNumber={seatNumber}
            onPlaceDirectOrder={handlePlaceDirectOrder}
            onCallWaiter={handleCallWaiter}
          />
        )}
        {subView === 'tracking' && (
          <GuestOrderTrackingView
            tableId={tableId}
            onGoToCheckout={() => setSubView('checkout')}
          />
        )}
        {subView === 'checkout' && (
          <GuestCheckoutView
            tableId={tableId}
            onRestartSession={() => setSubView('home')}
          />
        )}
      </div>

      {/* Mobile Bar Navigator */}
      <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#120d0a]/90 backdrop-blur-2xl border-t border-white/5 max-w-[420px] mx-auto shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => setSubView('menu')}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${subView === 'menu' ? 'text-[#f66018]' : 'text-[#e2bfb2]'}`}
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            <span className="text-[9px]">منو غذا</span>
          </button>
          <button
            onClick={() => setSubView('home')}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${subView === 'home' ? 'text-[#f66018]' : 'text-[#e2bfb2]'}`}
          >
            <span className="material-symbols-outlined text-[20px]">deck</span>
            <span className="text-[9px]">میز من</span>
          </button>
          <button
            onClick={() => setSubView('tracking')}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${subView === 'tracking' ? 'text-[#f66018]' : 'text-[#e2bfb2]'}`}
          >
            <span className="material-symbols-outlined text-[20px]">microwave</span>
            <span className="text-[9px]">پیگیری زنده</span>
          </button>
          <button
            onClick={() => setSubView('checkout')}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${subView === 'checkout' ? 'text-[#f66018]' : 'text-[#e2bfb2]'}`}
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-[9px]">حساب و تسویه</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
