import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface GuestMenuViewProps {
  onPlaceDirectOrder: (cartItems: any[], chefNote: string) => void;
  onCallWaiter: () => void;
  tableId: string;
  seatNumber: string;
}

export const GuestMenuView: React.FC<GuestMenuViewProps> = ({
  onPlaceDirectOrder,
  onCallWaiter,
  tableId,
  seatNumber,
}) => {
  const [selectedStation, setSelectedStation] = useState('all');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<any[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cart state: { [menuItemId: number]: number }
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [chefNote, setChefNote] = useState<string>('');
  const [showOrderDrawer, setShowOrderDrawer] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      api.getMenu().catch(() => []),
      api.getTables().catch(() => [])
    ]).then(([menuRes, tablesRes]) => {
      setMenu(menuRes || []);
      setTablesList(tablesRes || []);
      setLoading(false);
    });
  }, []);

  const currentTable = tablesList.find(t => t.id === tableId);
  const tableName = currentTable ? currentTable.name : tableId.toUpperCase().replace('T', 'میز ');
  const tableCapacity = currentTable ? currentTable.capacity : 4;

  const updateQty = (id: number, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuantities(prev => {
      const nextVal = Math.max(0, (prev[id] || 0) + delta);
      const nextState = { ...prev, [id]: nextVal };
      if (nextVal === 0) {
        delete nextState[id];
      }
      return nextState;
    });
  };

  const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = menu.reduce((acc, item) => acc + ((quantities[item.id] || 0) * item.price), 0);

  const filteredFoods = menu.filter(f => {
    const matchStation = selectedStation === 'all' || (f.station || '').toLowerCase() === selectedStation.toLowerCase();
    const matchSearch = (f.name || '').toLowerCase().includes(search.toLowerCase()) || (f.desc || '').toLowerCase().includes(search.toLowerCase());
    return matchStation && matchSearch;
  });

  const handleFinalSubmit = () => {
    if (totalCount === 0) {
      alert('لطفاً حداقل یک غذا به سفارش اضافه کنید.');
      return;
    }

    const selectedCart = Object.keys(quantities)
      .filter(id => quantities[Number(id)] > 0)
      .map(id => {
        const item = menu.find(m => m.id === Number(id));
        return {
          id: Number(id),
          name: item ? item.name : 'غذا',
          price: item ? item.price : 0,
          qty: quantities[Number(id)],
          chefNote: chefNote
        };
      });

    onPlaceDirectOrder(selectedCart, chefNote);
    setShowOrderDrawer(false);
  };

  return (
    <div className="flex flex-col w-full max-w-[420px] mx-auto min-h-screen bg-[#18120f] text-[#ece0da] relative select-none pb-32">
      {/* Search & Station Pills Header */}
      <div className="px-4 pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-white">منوی ضیافت زعفران و نارنج</h2>
              <span className="text-[10px] text-[#ffb599] font-bold">
                {tableName} • صندلی {seatNumber} از {tableCapacity}
              </span>
            </div>
          </div>
          <button
            onClick={onCallWaiter}
            className="px-3 py-1.5 bg-[#201a17] hover:bg-[#2f2925] border border-white/10 rounded-xl text-[11px] text-[#ffb599] font-bold flex items-center gap-1 shadow"
          >
            <span className="material-symbols-outlined text-[16px] text-[#f9bd22]">notifications_active</span>
            <span>گارسون</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو در میان کباب‌ها، قابلی، منتو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pr-10 pl-4 bg-[#201a17] text-white text-xs rounded-2xl outline-none border border-white/10 placeholder:text-[#a98a7e]/60 shadow-inner"
          />
          <span className="absolute right-3.5 top-3 material-symbols-outlined text-sm text-[#a98a7e]">search</span>
        </div>

        {/* Scrollable station categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'همه خوراک‌ها' },
            { id: 'pots', label: 'دیگ‌ها و قابلی' },
            { id: 'grill', label: 'کباب و منقل' },
            { id: 'tandoor', label: 'تنور و بولانی' },
            { id: 'plating', label: 'منتو و چای' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedStation(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedStation === cat.id ? 'bg-[#f66018] text-white shadow-md' : 'bg-[#201a17] text-[#e2bfb2] border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 px-4 mt-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-[#201a17]/50 rounded-2xl h-48 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredFoods.length === 0 && (
        <div className="p-8 my-8 text-center bg-[#201a17]/80 rounded-3xl border border-white/10 mx-4 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[40px] text-[#f9bd22]">restaurant_menu</span>
          <h3 className="text-sm font-bold text-white">هیچ خوراکی یافت نشد</h3>
          <p className="text-[11px] text-[#e2bfb2]">در حال حاضر هیچ غذایی با این فیلتر موجود نیست.</p>
        </div>
      )}

      {/* Foods Grid with Instant + / - Quantity Controls */}
      {!loading && filteredFoods.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 mt-3">
          {filteredFoods.map(food => {
            const qty = quantities[food.id] || 0;
            return (
              <div
                key={food.id}
                className="bg-[#201a17]/90 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between border border-white/10 hover:border-[#f66018]/40 transition-all"
              >
                {/* Image */}
                <div className="relative h-32 bg-[#120d0a] overflow-hidden">
                  {food.image ? (
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#e2bfb2]">بدون تصویر</div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/75 text-[#f9bd22] text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {food.station ? food.station.toUpperCase() : 'مطبخ'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col justify-between flex-grow gap-2">
                  <div>
                    <h3 className="font-bold text-white text-xs leading-tight line-clamp-1">{food.name}</h3>
                    <p className="text-[10px] text-[#e2bfb2] line-clamp-2 mt-1 leading-normal">{food.desc || 'خوراک اصیل سنتی'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="font-extrabold text-xs text-[#ffb599]">
                      {food.price} <span className="text-[9px] font-normal text-[#e2bfb2]">AFN</span>
                    </span>

                    {/* Inline + and - buttons */}
                    {qty === 0 ? (
                      <button
                        onClick={(e) => updateQty(food.id, 1, e)}
                        className="px-3 py-1.5 rounded-xl bg-[#f66018] text-white font-extrabold text-xs flex items-center gap-1 shadow-md shadow-orange-500/20 active:scale-95 transition-transform"
                      >
                        <span>+ افزودن</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#120d0a] p-1 rounded-xl border border-white/10">
                        <button
                          onClick={(e) => updateQty(food.id, -1, e)}
                          className="w-6 h-6 rounded-lg bg-[#2f2925] text-white flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-extrabold text-white text-xs">{qty}</span>
                        <button
                          onClick={(e) => updateQty(food.id, 1, e)}
                          className="w-6 h-6 rounded-lg bg-[#f66018] text-white flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Cart Button (مثل دکمه گفتگو / سبد خرید شناور در سایت) */}
      {totalCount > 0 && (
        <div className="fixed bottom-20 left-4 z-40 max-w-[420px]">
          <button
            onClick={() => setShowOrderDrawer(prev => !prev)}
            className="group relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white rounded-full shadow-[0_10px_35px_rgba(246,96,24,0.5)] border-2 border-white/20 active:scale-95 transition-all hover:scale-105"
          >
            {/* Cart Icon with Counter Badge */}
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_cart
              </span>
              <span className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#18120f] shadow">
                {totalCount}
              </span>
            </div>

            {/* Price & Summary Info */}
            <div className="flex flex-col text-right">
              <span className="text-xs font-extrabold text-white leading-tight">
                {totalPrice.toLocaleString()} AFN
              </span>
              <span className="text-[10px] text-[#ffdf9f] font-semibold">
                مشاهده سفارش ({totalCount} قلم)
              </span>
            </div>

            <span className="material-symbols-outlined text-[18px] text-white/80 mr-0.5">
              expand_less
            </span>
          </button>
        </div>
      )}

      {/* Floating Popup Order Window over Menu (پنجره شناور بالای منو) */}
      {showOrderDrawer && totalCount > 0 && (
        <div className="fixed bottom-20 inset-x-4 max-w-[390px] mx-auto z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#201a17]/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col gap-4">
            {/* Popup Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f66018]/20 text-[#ffb599] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">سبد سفارش جاری</h3>
                  <span className="text-[10px] text-[#e2bfb2]">
                    {tableId.toUpperCase().replace('T', 'میز ')} • صندلی {seatNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowOrderDrawer(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Selected Items List */}
            <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
              {Object.keys(quantities)
                .filter(id => quantities[Number(id)] > 0)
                .map(id => {
                  const food = menu.find(m => m.id === Number(id));
                  const qty = quantities[Number(id)];
                  if (!food) return null;
                  return (
                    <div key={id} className="p-2.5 bg-[#120d0a]/80 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-xs">{food.name}</span>
                        <span className="text-[10px] text-[#ffb599] font-mono mt-0.5">{food.price * qty} AFN</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#201a17] p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => updateQty(Number(id), -1)}
                          className="w-6 h-6 rounded-lg bg-[#2f2925] text-white flex items-center justify-center font-bold text-xs active:scale-90"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-bold text-white text-xs">{qty}</span>
                        <button
                          onClick={() => updateQty(Number(id), 1)}
                          className="w-6 h-6 rounded-lg bg-[#f66018] text-white flex items-center justify-center font-bold text-xs active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Chef Note Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#f9bd22] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                یادداشت برای سرآشپز (اختیاری):
              </label>
              <textarea
                rows={2}
                placeholder="مثلاً: کم‌نمک باشد، پیاز سرخ‌شده بیشتر..."
                value={chefNote}
                onChange={(e) => setChefNote(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-[#120d0a] border border-white/10 text-white placeholder:text-[#a98a7e]/50 text-xs outline-none focus:border-[#f66018] transition-all resize-none"
              ></textarea>
            </div>

            {/* Total Calculation & Send Order Button */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#e2bfb2]">جمع کل قابل پرداخت:</span>
                <span className="font-extrabold text-base text-[#f9bd22]">{totalPrice.toLocaleString()} AFN</span>
              </div>

              <button
                onClick={handleFinalSubmit}
                className="w-full py-3 bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/30 text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>ارسال سفارش به مطبخ ({totalCount} قلم)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
