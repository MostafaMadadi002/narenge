import React, { useState, useEffect } from 'react';
import { api } from '../api';

export const StaffView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showLoginQrModal, setShowLoginQrModal] = useState(false);

  // New staff states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manager' | 'cashier' | 'waiter' | 'chef' | 'inventory'>('waiter');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('evening');
  const [image, setImage] = useState('');
  const [addError, setAddError] = useState('');

  const loadData = () => {
    api.getStaff().then(setStaff).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteStaff = async (staffUsername: string, staffName: string) => {
    if (confirm(`آیا از حذف پرسنل ${staffName} (${staffUsername}) اطمینان دارید؟`)) {
      try {
        await api.deleteStaff(staffUsername);
        alert('پرونده پرسنلی کارمند با موفقیت حذف شد.');
        loadData();
      } catch (e: any) {
        alert(e.message || 'خطا در حذف کارمند.');
      }
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!username || !password || !name) {
      setAddError('وارد کردن یوزرنیم، رمز عبور و نام الزامی است.');
      return;
    }

    try {
      await api.addStaff({
        username,
        password,
        name,
        role,
        phone,
        salary: salary ? salary + ' AFN' : 'توافقی',
        shift: shift === 'evening' ? 'شیفت شامگاهی (۱۶:۳۰ - ۲۳:۳۰)' : 'شیفت چاشت (۱۱:۰۰ - ۱۶:۳۰)',
        image
      });

      setShowModal(false);
      setUsername('');
      setPassword('');
      setName('');
      setPhone('');
      setSalary('');
      setImage('');
      alert('کارمند جدید با موفقیت اضافه و پرونده پرسنلی صادر شد.');
      loadData();
    } catch (err: any) {
      setAddError(err.message || 'خطا در ثبت کارمند جدید.');
    }
  };

  const loginPageUrl = window.location.origin;
  const loginQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(loginPageUrl)}`;

  return (
    <div className="flex flex-col w-full p-6 gap-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-12 right-20 w-96 h-96 bg-[#f66018]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold">
            <span>سیستم منابع بشری و پرسنل</span>
            <span>•</span>
            <span>کد مجموعه: ZN-HR-KBL</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">مدیریت پرسنل و شیفت‌های کاری</h1>
          <p className="text-sm text-[#e2bfb2]">سامانه نظارت بر کارکرد، حاضری بیومتریک و مجوزهای سیستمی کارمندان رستوران زعفران و نارنج</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLoginQrModal(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#2a2320] text-[#ffdf9f] hover:text-white font-bold border border-white/10 hover:border-amber-500/50 shadow-lg active:scale-95 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            <span>QR کد ورود پرسنل</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f66018] to-[#b73b01] text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>+ افزودن کارمند جدید</span>
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {staff.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#201a17]/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#f9bd22]">badge</span>
            <h3 className="text-lg font-bold text-white">هنوز پرسنلی در سیستم ثبت نشده است</h3>
            <p className="text-xs text-[#e2bfb2]">جهت صدور پرونده پرسنلی روی دکمه «افزودن کارمند جدید» کلیک کنید.</p>
          </div>
        )}
        {staff.map((st, i) => (
          <div key={i} className="bg-[#201a17]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#3a3330] flex items-center justify-center text-white font-bold text-lg border border-white/10">
                  {st.image ? (
                    <img src={st.image} alt={st.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{st.name.slice(0, 2)}</span>
                  )}
                  <span className={`absolute bottom-1 left-1 w-3.5 h-3.5 rounded-full ring-2 ring-[#201a17] ${
                    st.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-white text-base">{st.name}</h3>
                  <span className="text-xs text-[#ffb599]">نقش: {st.role.toUpperCase()} • شناسه: {st.username}</span>
                  <span className="text-[11px] text-[#e2bfb2] mt-1">{st.shift}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 bg-[#120d0a]/60 p-3 rounded-xl text-xs">
              <div>
                <span className="text-[#e2bfb2]">تماس:</span>
                <p className="text-white font-mono mt-0.5" dir="ltr">{st.phone || '-'}</p>
              </div>
              <div>
                <span className="text-[#e2bfb2]">معاش ماهوار:</span>
                <p className="text-[#ffb599] font-bold mt-0.5">{st.salary}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-[#e2bfb2]">امتیاز رضایت: <strong className="text-[#f9bd22]">{st.rating || '۴.۸'} ⭐</strong></span>
              <button
                onClick={() => handleDeleteStaff(st.username, st.name)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold p-1 rounded hover:bg-rose-500/10"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>حذف کارمند</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Login QR Code Modal for Staff */}
      {showLoginQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-between w-full pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">qr_code_scanner</span>
                QR کد ورود سریع پرسنل به سیستم
              </h3>
              <button onClick={() => setShowLoginQrModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            <p className="text-xs text-[#e2bfb2] leading-relaxed">
              گارسون‌ها و پرسنل شیفت می‌توانند این بارکد را با دوربین گوشی یا تبلت اسکن کرده تا مستقیماً به صفحه ورود و انتخاب اسم هدایت شوند.
            </p>

            <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-xl border-4 border-amber-500 flex items-center justify-center">
              <img src={loginQrImageUrl} alt="Login QR Code" className="w-full h-full object-contain" />
            </div>

            <span className="text-[11px] text-amber-300 font-mono bg-[#120d0a] px-3 py-1.5 rounded-xl border border-white/10 max-w-full truncate dir-ltr">
              {loginPageUrl}
            </span>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-[#f66018] hover:brightness-110 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>پرینت پوستر QR ورود پرسنل</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAddStaff} className="bg-[#201a17] border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">استخدام و ثبت کارمند جدید</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-[#e2bfb2] hover:text-white">✕</button>
            </div>

            {addError && (
              <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl font-bold">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">نام کامل کارمند *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: محمد فهیم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">شماره تماس مستقیم</label>
                  <input
                    type="text"
                    placeholder="+93 79..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>

              {/* Photo Input: Local File Upload & URL */}
              <div className="space-y-2 bg-[#120d0a] p-3 rounded-2xl border border-white/10">
                <label className="block text-[#e2bfb2] font-bold">عکس پرسنلی (انتخاب از دستگاه یا لینک URL)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#201a17] border border-white/10 flex items-center justify-center shrink-0">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[#e2bfb2]">add_a_photo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-grow">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="text-xs text-[#e2bfb2] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#f66018] file:text-white hover:file:brightness-110 cursor-pointer"
                    />
                    <input
                      type="url"
                      placeholder="یا وارد کردن لینک URL عکس (https://...)"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full bg-[#201a17] p-2 rounded-xl border border-white/10 text-white outline-none text-left font-mono text-[11px]"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">نام کاربری / شناسه پرسنلی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ZN-120"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">رمز عبور / پین‌کد ورود *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#e2bfb2] mb-1">سمت و بخش کاری *</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  >
                    <option value="waiter">گارسون</option>
                    <option value="cashier">صندوق‌دار</option>
                    <option value="chef">سرآشپز</option>
                    <option value="inventory">مسئول انبار</option>
                    <option value="manager">مدیر سالن</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">شیفت کاری *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  >
                    <option value="evening">شیفت شامگاهی</option>
                    <option value="morning">شیفت چاشت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#e2bfb2] mb-1">معاش ماهوار (AFN)</label>
                  <input
                    type="number"
                    placeholder="۳۵۰۰۰"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full bg-[#120d0a] p-3 rounded-xl border border-white/10 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2f2925] text-white rounded-xl text-xs">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-[#f66018] text-white rounded-xl text-xs font-bold shadow-md">ثبت و صدور حساب</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
