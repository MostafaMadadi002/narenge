import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('گوشت و پروتئین');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [unit, setUnit] = useState('کیلوگرم');
  const [unitPrice, setUnitPrice] = useState('');
  const [expiry, setExpiry] = useState('');

  const loadData = () => {
    api.getInventory()
      .then(res => {
        setItems(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !stock || !unit) {
      alert('وارد کردن نام، موجودی و واحد شمارش الزامی است.');
      return;
    }

    try {
      await api.addInventory({
        name,
        category,
        stock: Number(stock),
        min_stock: Number(minStock || 10),
        unit,
        unit_price: Number(unitPrice || 0),
        expiry: expiry || 'نامحدود'
      });

      setShowAddModal(false);
      setName('');
      setStock('');
      setUnitPrice('');
      setExpiry('');
      alert('قلم کالای جدید با موفقیت به انبار افزوده شد.');
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت کالا.');
    }
  };

  const handleUpdateStock = async (item: any, delta: number) => {
    const nextStock = Math.max(0, Number(item.stock) + delta);
    try {
      await api.updateInventory(item.id, { stock: nextStock });
      loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در بروزرسانی موجودی.');
    }
  };

  const handleDeleteItem = async (id: number, itemName: string) => {
    if (window.confirm(`آیا از حذف «${itemName}» از انبار اطمینان دارید؟`)) {
      try {
        await api.deleteInventory(id);
        loadData();
      } catch (e: any) {
        alert(e.message || 'خطا در حذف آیتم انبار.');
      }
    }
  };

  // KPIs dynamically computed from live inventory
  const totalValuation = items.reduce((sum, it) => sum + (Number(it.stock || 0) * Number(it.unit_price || 0)), 0);
  const criticalItemsCount = items.filter(it => Number(it.stock || 0) <= Number(it.min_stock || 10)).length;
  const warningItemsCount = items.filter(it => Number(it.stock || 0) > Number(it.min_stock || 10) && Number(it.stock || 0) <= Number(it.min_stock || 10) * 1.5).length;

  return (
    <div className="flex flex-col w-full p-6 gap-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-24 right-20 w-96 h-96 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#f9bd22] uppercase tracking-wider">سیستم یکپارچه انبار و تدارکات</span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">کنترل موجودی انبار، مواد اولیه و ثبت مصارف روزانه</h1>
          <p className="text-sm text-[#e2bfb2]">دیتابیس زنده نظارت بر زنجیره تامین گوشت، برنج اعلای هلمند و زعفران صادراتی</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white text-xs font-bold shadow-lg shadow-orange-500/30 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>ورود کالا / خرید جدید</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPIs from Live Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl">
          <span className="text-xs text-[#e2bfb2]">ارزش برآوردی موجودی انبار</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-white">{totalValuation.toLocaleString()}</span>
            <span className="text-xs text-[#ffb599]">AFN</span>
          </div>
          <span className="text-xs text-[#f9bd22] mt-3 pt-2 border-t border-white/5">محاسبه از روی {items.length} ردیف کالا</span>
        </div>

        <div className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl">
          <span className="text-xs text-[#e2bfb2]">هشدارهای کسری موجودی</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-rose-400">{criticalItemsCount}</span>
            <span className="text-xs text-rose-300">قلم کالا بحرانی</span>
          </div>
          <span className="text-xs text-rose-300 mt-3 pt-2 border-t border-white/5">نیاز به خرید و تامین فوری</span>
        </div>

        <div className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl">
          <span className="text-xs text-[#e2bfb2]">اقلام در آستانه هشدار</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-[#f9bd22]">{warningItemsCount}</span>
            <span className="text-xs text-[#e2bfb2]">قلم کالا</span>
          </div>
          <span className="text-xs text-[#e2bfb2] mt-3 pt-2 border-t border-white/5">نزدیک به حد حداقل انبار</span>
        </div>

        <div className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl">
          <span className="text-xs text-[#e2bfb2]">کل اقلام ثبت‌شده</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white">{items.length}</span>
            <span className="text-xs text-[#e2bfb2]">نوع ماده اولیه</span>
          </div>
          <span className="text-xs text-[#ffb599] mt-3 pt-2 border-t border-white/5">مدیریت متمرکز رستوران</span>
        </div>
      </div>

      {/* Table Catalog */}
      <div className="bg-[#201a17]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl overflow-x-auto">
        <h2 className="text-lg font-bold text-white mb-4">فهرست مواد اولیه و اقلام انبار مرکزی کابل</h2>
        {loading ? (
          <div className="p-8 text-center text-white">در حال بارگذاری داده‌های انبار...</div>
        ) : (
          <table className="w-full text-right border-collapse min-w-[850px] text-xs">
            <thead>
              <tr className="bg-[#2f2925] text-[#e2bfb2]">
                <th className="p-3">کد کالا</th>
                <th className="p-3">ماده اولیه و مشخصات</th>
                <th className="p-3">دسته‌بندی</th>
                <th className="p-3">موجودی فعلی</th>
                <th className="p-3">حداقل هشدار</th>
                <th className="p-3">فی خرید (AFN)</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3 text-center">تنظیم موجودی</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it) => {
                const isCritical = Number(it.stock) <= Number(it.min_stock);
                return (
                  <tr key={it.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-[#f9bd22]">{it.code || `#INV-${it.id}`}</td>
                    <td className="p-3 font-bold text-white text-sm">{it.name}</td>
                    <td className="p-3 text-[#e2bfb2]">{it.category}</td>
                    <td className="p-3 font-extrabold text-white">{it.stock} {it.unit}</td>
                    <td className="p-3 text-rose-400 font-bold">{it.min_stock} {it.unit}</td>
                    <td className="p-3 text-white font-mono">{Number(it.unit_price).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isCritical ? 'بحرانی (کسری)' : 'کافی و پایدار'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5 bg-[#120d0a] p-1 rounded-xl border border-white/10 w-fit mx-auto">
                        <button
                          onClick={() => handleUpdateStock(it, -1)}
                          className="w-6 h-6 rounded-lg bg-[#2f2925] text-white flex items-center justify-center font-bold"
                          title="ثبت مصرف / کاهش"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-white text-xs">{it.stock}</span>
                        <button
                          onClick={() => handleUpdateStock(it, 1)}
                          className="w-6 h-6 rounded-lg bg-[#f66018] text-white flex items-center justify-center font-bold"
                          title="ثبت ورود / افزایش"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteItem(it.id, it.name)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 inline-flex items-center justify-center"
                        title="حذف قلم کالا"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018]">inventory_2</span>
                ثبت ورود کالای تازه به انبار
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#e2bfb2]">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">نام ماده اولیه / کالا *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: دانه هل سبز هندی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">دسته‌بندی</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  >
                    <option value="گوشت و پروتئین">گوشت و پروتئین</option>
                    <option value="برنج و حبوبات">برنج و حبوبات</option>
                    <option value="ادویه‌جات و زعفران">ادویه‌جات و زعفران</option>
                    <option value="لبنیات و روغن">لبنیات و روغن</option>
                    <option value="ظروف و بسته‌بندی">ظروف و بسته‌بندی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">واحد شمارش *</label>
                  <input
                    type="text"
                    required
                    placeholder="کیلوگرم / گونی / کارتن"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">موجودی ورودی *</label>
                  <input
                    type="number"
                    required
                    placeholder="۵۰"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">حداقل آستانه هشدار</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">قیمت واحد خرید (AFN)</label>
                <input
                  type="number"
                  placeholder="۶۵۰"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#2f2925] text-[#e2bfb2] text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white text-xs font-bold shadow-lg shadow-orange-500/30"
              >
                ثبت ورود کالا
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
