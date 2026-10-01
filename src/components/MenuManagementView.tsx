import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const MenuManagementView: React.FC = () => {
  const [menu, setMenu] = useState<any[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pots' | 'grill' | 'tandoor' | 'plating'>('all');

  // Add Item Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [points, setPoints] = useState('');
  const [station, setStation] = useState('plating');
  const [image, setImage] = useState('');
  const [addError, setAddError] = useState('');

  // Edit Item Modal states
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editStation, setEditStation] = useState('pots');
  const [editImage, setEditImage] = useState('');
  const [editError, setEditError] = useState('');

  const loadData = () => {
    api.getMenu().then(setMenu).catch(() => {});
    api.getStations().then(res => {
      setStations(res || ['pots', 'grill', 'tandoor', 'plating']);
    }).catch(() => {
      setStations(['pots', 'grill', 'tandoor', 'plating']);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!name || !price || !station) {
      setAddError('وارد کردن نام، قیمت و ایستگاه پخت الزامی است.');
      return;
    }

    try {
      await api.addMenu({
        name,
        price: Number(price),
        desc,
        loyalty_points: Number(points || 0),
        station,
        image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'
      });

      setShowAddModal(false);
      setName('');
      setPrice('');
      setDesc('');
      setPoints('');
      setImage('');
      alert('خوراک جدید با موفقیت به منوی سیستم افزوده شد.');
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'خطا در ثبت غذا.');
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditDesc(item.desc || '');
    setEditPoints((item.loyalty_points || 0).toString());
    setEditStation(item.station || 'pots');
    setEditImage(item.image || '');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError('');

    try {
      await api.updateMenu(editingItem.id, {
        name: editName,
        price: Number(editPrice),
        desc: editDesc,
        loyalty_points: Number(editPoints || 0),
        station: editStation,
        image: editImage
      });

      setEditingItem(null);
      alert('مشخصات و قیمت خوراک با موفقیت در دیتابیس بروزرسانی شد.');
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'خطا در ویرایش غذا.');
    }
  };

  const handleDeleteItem = async (id: number, foodName: string) => {
    if (window.confirm(`آیا از حذف «${foodName}» از منو اطمینان دارید؟`)) {
      try {
        await api.deleteMenu(id);
        loadData();
      } catch (e: any) {
        alert(e.message || 'خطا در حذف غذا.');
      }
    }
  };

  const filteredMenu = menu.filter(f => activeTab === 'all' || f.station === activeTab);

  return (
    <div className="flex flex-col w-full min-w-0 p-6 gap-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">مدیریت منو و کاتالوگ خوراک‌ها</h1>
          <p className="text-xs text-[#e2bfb2] mt-0.5">افزودن، ویرایش قیمت و مشخصات، و حذف آیتم‌ها به صورت آنی در Backend</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#f66018] hover:bg-[#e05008] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>افزودن خوراک جدید</span>
          </button>
        </div>
      </div>

      {/* Station Tabs */}
      <div className="flex items-center gap-2 bg-[#201a17] p-1.5 rounded-xl border border-white/10 w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: `همه (${menu.length})` },
          { id: 'pots', label: 'دیگ‌ها و قابلی' },
          { id: 'grill', label: 'کباب و منقل' },
          { id: 'tandoor', label: 'تنور و بولانی' },
          { id: 'plating', label: 'منتو و چای' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === cat.id ? 'bg-[#f66018] text-white shadow-md' : 'text-[#e2bfb2] hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMenu.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#201a17]/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#f9bd22]">restaurant_menu</span>
            <h3 className="text-lg font-bold text-white">هیچ خوراکی در این دسته‌بندی یافت نشد</h3>
            <p className="text-xs text-[#e2bfb2]">با کلیک بر روی دکمه «افزودن خوراک جدید» نخستین غذا را ثبت نمایید.</p>
          </div>
        )}
        {filteredMenu.map(f => (
          <div key={f.id} className="rounded-2xl bg-[#201a17]/90 backdrop-blur-xl shadow-xl border border-white/10 flex flex-col justify-between overflow-hidden hover:border-[#f66018]/40 transition-all">
            <div className="h-44 w-full overflow-hidden relative bg-[#120d0a]">
              {f.image ? (
                <img
                  src={f.image}
                  alt={f.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#e2bfb2]">بدون تصویر</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#201a17] via-transparent to-transparent"></div>
              <span className="absolute top-3 right-3 bg-black/80 text-[#f9bd22] text-[10px] px-2.5 py-1 rounded-full font-bold">
                ایستگاه: {f.station ? f.station.toUpperCase() : 'مطبخ'}
              </span>
            </div>

            <div className="p-5 flex flex-col justify-between gap-4 flex-grow">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base leading-tight">{f.name}</h3>
                  <div className="text-left whitespace-nowrap">
                    <span className="text-lg font-extrabold text-[#ffb599]">{Number(f.price).toLocaleString()}</span>
                    <span className="text-[10px] text-[#e2bfb2] block">AFN</span>
                  </div>
                </div>
                <p className="text-xs text-[#e2bfb2]/75 line-clamp-2 mt-2">{f.desc || 'فاقد توضیحات'}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#120d0a]/70 flex items-center justify-between text-xs text-[#e2bfb2]">
                <span>وفاداری: <strong className="text-[#f9bd22]">+{f.loyalty_points || 0} امتیاز</strong></span>
                <span className="text-[11px]">کد: #{f.id}</span>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleOpenEdit(f)}
                  className="flex-1 py-2 rounded-xl bg-[#2f2925] hover:bg-[#3a3330] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#f9bd22]">edit</span>
                  <span>ویرایش خوراک</span>
                </button>
                <button
                  onClick={() => handleDeleteItem(f.id, f.name)}
                  className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                  title="حذف از منو"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f66018]">restaurant_menu</span>
                افزودن خوراک تازه به کاتالوگ منو
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {addError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-xl font-bold">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">نام کامل خوراک (دری) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کباب چنجه گوسفندی زعفرانی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">قیمت فروش (AFN) *</label>
                  <input
                    type="number"
                    required
                    placeholder="۴۵۰"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">ایستگاه پخت مطبخ *</label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none cursor-pointer"
                  >
                    {stations.map(st => (
                      <option key={st} value={st}>ایستگاه {st.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">امتیاز وفاداری برای مشتری</label>
                <input
                  type="number"
                  placeholder="مثال: ۴۵"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">آدرس تصویر غذا (URL)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">ترکیبات و توضیحات</label>
                <textarea
                  rows={2}
                  placeholder="گوشت تازه، خلال بادام، ادویه‌جات شاهانه..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018] resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#2f2925] text-[#e2bfb2] hover:text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white text-xs font-bold shadow-lg shadow-orange-500/30"
              >
                ذخیره در منو
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f9bd22]">edit</span>
                ویرایش خوراک ({editingItem.name})
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-xs rounded-xl font-bold">
                {editError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">نام خوراک *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">قیمت (AFN) *</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1 font-bold">ایستگاه پخت *</label>
                  <select
                    value={editStation}
                    onChange={(e) => setEditStation(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none cursor-pointer"
                  >
                    {stations.map(st => (
                      <option key={st} value={st}>ایستگاه {st.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">امتیاز وفاداری</label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">آدرس تصویر (URL)</label>
                <input
                  type="text"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018]"
                />
              </div>
              <div>
                <label className="block text-[#e2bfb2] mb-1 font-bold">توضیحات</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none focus:border-[#f66018] resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-[#2f2925] text-[#e2bfb2] hover:text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white text-xs font-bold shadow-lg shadow-orange-500/30"
              >
                ذخیره تغییرات
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
