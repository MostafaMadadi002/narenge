import React, { useState } from 'react';

interface GuestCustomizerViewProps {
  selectedItem: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GuestCustomizerView: React.FC<GuestCustomizerViewProps> = ({ selectedItem, onConfirm, onCancel }) => {
  const [portion, setPortion] = useState('base');
  const [cookStyle, setCookStyle] = useState('standard');
  const [chefNote, setChefNote] = useState('');
  const [addons, setAddons] = useState<string[]>([]);

  const handleAddonToggle = (addon: string) => {
    setAddons(prev => prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]);
  };

  const getPrice = () => {
    let price = selectedItem?.price || 520;
    if (portion === 'double') price += 120;
    if (addons.includes('carrot')) price += 40;
    if (addons.includes('saffron')) price += 30;
    return price;
  };

  return (
    <div className="flex flex-col w-full max-w-[420px] mx-auto min-h-screen bg-[#18120f] text-[#ece0da] relative select-none pb-24">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-bold text-white">شخصی‌سازی خوراک</h2>
        <button onClick={onCancel} className="text-[#e2bfb2] hover:text-white">✕</button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-140px)]">
        {/* Item Header */}
        <div className="flex items-center gap-3 bg-[#201a17]/50 p-3 rounded-xl border border-white/5">
          <div className="w-12 h-12 bg-[#f66018]/20 rounded-lg flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">restaurant</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{selectedItem?.name}</h3>
            <span className="text-xs text-[#e2bfb2]">قیمت پایه: {selectedItem?.price} افغانی</span>
          </div>
        </div>

        {/* Portion Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#e2bfb2]">نوع برش و وزن ماهیچه</span>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#201a17] cursor-pointer">
              <div className="flex items-center gap-2">
                <input type="radio" checked={portion === 'base'} onChange={() => setPortion('base')} className="accent-[#f66018]" />
                <span className="text-xs text-white">ماهیچه گوسفندی معمولی (۴۰۰ گرم)</span>
              </div>
              <span className="text-[10px] text-[#e2bfb2]">پایه</span>
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#201a17] cursor-pointer">
              <div className="flex items-center gap-2">
                <input type="radio" checked={portion === 'double'} onChange={() => setPortion('double')} className="accent-[#f66018]" />
                <span className="text-xs text-white">گردن و ماهیچه دو برابر ویژه</span>
              </div>
              <span className="text-[10px] text-[#f9bd22]">+۱۲۰ افغانی</span>
            </label>
          </div>
        </div>

        {/* Cooking Style */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#e2bfb2]">میزان پخت و روغن</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'standard', label: 'مجلسی (معمولی)' },
              { id: 'crispy', label: 'برشته و چرب‌تر' },
              { id: 'light', label: 'کم‌روغن / رژیمی' },
            ].map(style => (
              <button
                key={style.id}
                onClick={() => setCookStyle(style.id)}
                className={`py-2 rounded-xl text-xs font-semibold ${
                  cookStyle === style.id ? 'bg-[#f66018]/25 text-[#ffb599] border border-[#f66018]/40' : 'bg-[#201a17] text-[#e2bfb2]'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Addons */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#e2bfb2]">مخلفات و چاشنی اضافی</span>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#201a17] cursor-pointer">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={addons.includes('carrot')} onChange={() => handleAddonToggle('carrot')} className="rounded accent-[#f66018]" />
                <span className="text-xs text-white">کشمش و خلال زردک کاراملی اضافه</span>
              </div>
              <span className="text-[10px] text-[#ffb599]">+۴۰ افغانی</span>
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#201a17] cursor-pointer">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={addons.includes('saffron')} onChange={() => handleAddonToggle('saffron')} className="rounded accent-[#f66018]" />
                <span className="text-xs text-white">زعفران سرگل اضافه دم‌کشیده</span>
              </div>
              <span className="text-[10px] text-[#ffb599]">+۳۰ افغانی</span>
            </label>
          </div>
        </div>

        {/* Chef Note */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#e2bfb2]">یادداشت برای سرآشپز (KDS)</span>
          <input
            type="text"
            placeholder="مثال: کم‌نمک باشد، پیاز داغ روی پلو زیاد باشد..."
            value={chefNote}
            onChange={(e) => setChefNote(e.target.value)}
            className="w-full h-11 px-4 bg-[#120d0a] text-white text-xs rounded-xl outline-none"
          />
        </div>
      </div>

      {/* Action bottom bar */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#120d0a]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between max-w-[420px] mx-auto z-40">
        <button onClick={onCancel} className="px-4 py-3 bg-[#2f2925] text-white rounded-xl text-xs font-bold">
          انصراف
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-3 bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold rounded-xl shadow-lg text-xs"
        >
          افزودن به فاکتور ({getPrice()} AFN)
        </button>
      </div>
    </div>
  );
};
