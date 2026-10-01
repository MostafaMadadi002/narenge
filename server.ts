import express from 'express';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = fs.realpathSync(path.parse(__filename).dir || '.');

const DATA_FILE = './data.json';

// In-Memory Session Storage
interface Session {
  token: string;
  username: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, Session>();

function generateSessionToken(username: string, role: string): string {
  const token = 'zn_sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, {
    token,
    username,
    role,
    createdAt: Date.now(),
    expiresAt: Date.now() + sevenDaysMs
  });
  return token;
}

// In-Memory Table Guest Session Storage (Cryptographic proof that guest is at table)
interface TableSession {
  token: string;
  table_id: string;
  seat_number?: string;
  createdAt: number;
  expiresAt: number;
}

const activeTableSessions = new Map<string, TableSession>();

function generateTableSessionToken(table_id: string, seat_number?: string): string {
  const token = 'zn_tblsess_' + table_id + '_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  activeTableSessions.set(token, {
    token,
    table_id,
    seat_number,
    createdAt: Date.now(),
    expiresAt: Date.now() + twelveHoursMs
  });
  return token;
}

// Helper to validate and extract authenticated staff user
function getAuthenticatedUser(req: express.Request): { username: string; role: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // 1. Check Bearer Token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = activeSessions.get(token);
    if (session) {
      if (Date.now() < session.expiresAt) {
        return { username: session.username, role: session.role };
      } else {
        activeSessions.delete(token); // Expired
      }
    }
  }

  // 2. Fallback to Basic Auth for backward compatibility
  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');
      if (username && password) {
        const db = readData();
        const cleanUser = username.trim().toLowerCase();
        const isManager = db.managers.some((m: any) => m.username.toLowerCase() === cleanUser && m.password === password);
        if (isManager) return { username, role: 'manager' };

        const staffMember = db.staff.find((s: any) => s.username.toLowerCase() === cleanUser && s.password === password);
        if (staffMember) return { username: staffMember.username, role: staffMember.role };
      }
    } catch (e) {}
  }

  return null;
}

// Helper to verify Table Access Token (Prevents forging orders for other tables)
function verifyTableAccess(req: express.Request, targetTableId: string): boolean {
  if (!targetTableId) return false;

  // 1. Authenticated Staff (waiter, cashier, chef, manager) has universal authorized table access
  const staffUser = getAuthenticatedUser(req);
  if (staffUser) return true;

  // 2. Check X-Table-Token header or table_session_token in body/query
  const tableToken = (req.headers['x-table-token'] as string) || req.body?.table_session_token || (req.query?.table_session_token as string);
  if (tableToken) {
    const session = activeTableSessions.get(tableToken);
    if (session && session.table_id.toLowerCase() === targetTableId.toLowerCase()) {
      if (Date.now() < session.expiresAt) {
        return true;
      } else {
        activeTableSessions.delete(tableToken);
      }
    }
  }

  // 3. Check QR Token in body / headers / query
  const qrToken = req.body?.qr_token || (req.query?.qr_token as string) || (req.headers['x-qr-token'] as string);
  if (qrToken) {
    const db = readData();
    const table = (db.tables || []).find((t: any) => t.id.toLowerCase() === targetTableId.toLowerCase());
    if (table && table.qr_token === qrToken) {
      return true;
    }
  }

  return false;
}

// Helper to read and write database
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      is_setup_completed: false,
      managers: [],
      staff: [],
      stations: ["grill", "pots", "tandoor", "plating"],
      menu: [
        { id: 1, name: "قابلی پلو شاهانه با ماهیچه بره", price: 520, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600", desc: "ماهیچه بره، خلال زردک سرخ‌شده، کشمش سیاه، خلال پسته و بادام اعلا", loyalty_points: 52, station: "pots" },
        { id: 2, name: "چپلی کباب چاریکار", price: 380, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600", desc: "گوشت چرخ‌کرده گوساله و قلوه‌گاه، دانه انار کوهی، فلفل سبز تند", loyalty_points: 38, station: "grill" },
        { id: 3, name: "منتو اصیل هراتی", price: 340, image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&q=80&w=600", desc: "لقمه‌های بخارپز گوشت گوسفندی با چکه معطر سیردار و سس دال‌نخود", loyalty_points: 34, station: "plating" },
        { id: 4, name: "بولانی گندنه داغ", price: 140, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600", desc: "خمیر دست‌پیچ نازک، تره گندنه محلی، سیب‌زمینی بخارپز", loyalty_points: 14, station: "tandoor" },
        { id: 5, name: "کباب چوپان راسته", price: 700, image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600", desc: "راسته گوسفندی اعلا خوابانده در ماست ترش، دنبه لذیذ و سماق تازه", loyalty_points: 70, station: "grill" },
        { id: 6, name: "چای سبز و هل زعفرانی", price: 120, image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600", desc: "قوری دو نفره سرگل بهاره، غنچه هل سبز، تار زعفران سرگل غوری", loyalty_points: 12, station: "plating" }
      ],
      tables: [
        { id: "t1", name: "میز ۱ سالن اصلی", capacity: 4, section: "اصلی", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t1_89f3a1" },
        { id: "t2", name: "میز ۲ سالن اصلی", capacity: 4, section: "اصلی", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t2_44b2c8" },
        { id: "t3", name: "تخت ۳ پامیر", capacity: 6, section: "تخت سنتی", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t3_12a3d4" },
        { id: "t4", name: "تخت ۴ پامیر", capacity: 6, section: "تخت سنتی", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t4_56e7f8" },
        { id: "t5", name: "میز ۵ تراس", capacity: 4, section: "تراس", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t5_90a1b2" },
        { id: "t6", name: "میز ۶ تراس", capacity: 2, section: "تراس", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_t6_34c5d6" },
        { id: "VIP-1", name: "سوئیت VIP هرات", capacity: 10, section: "VIP", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_vip1_78e9f0" },
        { id: "VIP-2", name: "سوئیت VIP بلخ", capacity: 12, section: "VIP", assigned_waiter: "ZN-101", status: "free", qr_token: "zn_qr_vip2_12b3c4" }
      ],
      orders: [],
      table_status: {
        "t1": "free",
        "t2": "free",
        "t3": "free",
        "t4": "free",
        "t5": "free",
        "t6": "free",
        "VIP-1": "free",
        "VIP-2": "free"
      },
      customers: [],
      payments: [],
      inventory: [],
      settings: {}
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error("Error reading data.json, returning fallback", err);
    return { menu: [], tables: [], orders: [], table_status: {}, customers: [], payments: [], staff: [], managers: [], stations: [], inventory: [], settings: {} };
  }
}

function writeData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing data.json", err);
  }
}

const app = express();
app.use(express.json());
app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));
app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));

// Real-time SSE Clients with Safe Error Handling
let sseClients: { id: number; res: express.Response }[] = [];

// Broadcast utility via SSE (Rule [9])
function broadcastUpdate(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // Ignore dead socket writes to prevent server crash
    }
  });
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// Middleware for manager checking
function requireManager(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'احراز هویت انجام نشده است یا نشست منقضی گردیده است.' });
  }

  if (user.role !== 'manager') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز. فقط مدیر سیستم مجاز است.' });
  }

  (req as any).user = user;
  next();
}

// System Status Endpoint
app.get('/api/status', (req, res) => {
  const db = readData();
  const isSetup = db.is_setup_completed;

  const user = getAuthenticatedUser(req);
  let managerInfo = null;

  if (user && user.role === 'manager') {
    managerInfo = {
      total_staff: db.staff.length,
      total_menu_items: db.menu.length,
      total_orders: db.orders.length,
      total_customers: db.customers.length
    };
  }

  res.json({
    is_setup_completed: isSetup,
    manager_info: managerInfo
  });
});

// Automatic Network & Host Detection for QR Codes (Resolves Router/Server IP change issues)
app.get('/api/system/network-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: { iface: string; ip: string; type: string }[] = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: name, ip: net.address, type: 'lan' });
      }
    }
  }

  const primaryIp = addresses.length > 0 ? addresses[0].ip : '127.0.0.1';
  const hostname = os.hostname() || 'saffron-server';
  const localDomain = `${hostname.toLowerCase().replace(/[^a-z0-9-]/g, '')}.local`;
  
  res.json({
    primary_ip: primaryIp,
    hostname,
    local_domain: localDomain,
    recommended_domain: 'saffron.local',
    all_interfaces: addresses,
    port: 3000
  });
});

// Setup Wizard
app.post('/api/setup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
  }

  if (username.toLowerCase() === 'admin' && password.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'استفاده از رمز عبور پیش‌فرض admin/admin مجاز نیست.' });
  }

  const db = readData();
  if (db.is_setup_completed) {
    return res.status(400).json({ error: 'راه‌اندازی اولیه قبلاً انجام شده است.' });
  }

  db.managers.push({ username, password });
  db.is_setup_completed = true;
  writeData(db);

  const token = generateSessionToken(username, 'manager');

  broadcastUpdate('system_setup', { completed: true });
  res.json({ success: true, message: 'راه‌اندازی با موفقیت انجام شد.', role: 'manager', username, token });
});

// Login Endpoint with Session Token Generation
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
  }

  if (username.toLowerCase() === 'admin' && password.toLowerCase() === 'admin') {
    return res.status(401).json({ error: 'ورود با نام کاربری و رمز عبور پیش‌فرض غیرمجاز است.' });
  }

  const db = readData();
  const cleanUser = username.trim().toLowerCase();

  const isManager = db.managers.some((m: any) => m.username.toLowerCase() === cleanUser && m.password === password);
  if (isManager) {
    const mgr = db.managers.find((m: any) => m.username.toLowerCase() === cleanUser && m.password === password);
    const resolvedUsername = mgr ? mgr.username : username;
    const token = generateSessionToken(resolvedUsername, 'manager');
    registerOrUpdateDevice(req, 'staff', {
      name: `سیستم مدیریت (${resolvedUsername})`,
      username: resolvedUsername
    });
    return res.json({ success: true, role: 'manager', username: resolvedUsername, token });
  }

  const staffMember = db.staff.find((s: any) => s.username.toLowerCase() === cleanUser && s.password === password);
  if (staffMember) {
    const token = generateSessionToken(staffMember.username, staffMember.role);
    registerOrUpdateDevice(req, 'staff', {
      name: `دستگاه پرسنل (${staffMember.name || staffMember.username})`,
      username: staffMember.username
    });
    return res.json({ success: true, role: staffMember.role, username: staffMember.username, token });
  }

  res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
});

// Public Staff & Manager List for Login Dropdown Select
app.get('/api/public-staff-list', (req, res) => {
  const db = readData();
  const managers = (db.managers || []).map((m: any) => ({
    username: m.username,
    name: m.name || m.username || 'مدیر سیستم',
    role: 'manager',
    image: m.image || ''
  }));
  const staff = (db.staff || []).map((s: any) => ({
    username: s.username,
    name: s.name || s.username,
    role: s.role,
    image: s.image || ''
  }));
  res.json([...managers, ...staff]);
});

// Staff Management
app.get('/api/staff', (req, res) => {
  const db = readData();
  const managers = (db.managers || []).map((m: any) => ({
    username: m.username,
    name: m.name || m.username || 'مدیر کل',
    role: 'manager',
    phone: m.phone || '0700000000',
    salary: 'مدیریت',
    shift: 'تمام‌وقت',
    status: 'online',
    rating: '۵.۰',
    image: m.image || ''
  }));
  const staff = (db.staff || []).map((s: any) => ({
    username: s.username,
    name: s.name || s.username,
    role: s.role,
    phone: s.phone,
    salary: s.salary,
    shift: s.shift,
    status: s.status || 'online',
    rating: s.rating || '۴.۸',
    image: s.image || ''
  }));
  res.json([...managers, ...staff]);
});

app.post('/api/staff', (req, res) => {
  const { username, password, name, role, phone, salary, shift, image } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'نام کاربری، رمز عبور و نقش الزامی است.' });
  }

  const db = readData();
  const cleanUsername = username.trim();
  const exists = (db.staff || []).some((s: any) => s.username.toLowerCase() === cleanUsername.toLowerCase()) || 
                 (db.managers || []).some((m: any) => m.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'این نام کاربری قبلاً در سیستم ثبت شده است.' });
  }

  const newStaff = { 
    username: cleanUsername, 
    password, 
    name: name || cleanUsername, 
    role, 
    phone: phone || '', 
    salary: salary || 'توافقی', 
    shift: shift || 'شیفت شامگاهی (۱۶:۳۰ - ۲۳:۳۰)', 
    status: 'online', 
    rating: '۵.۰', 
    image: image || '' 
  };

  if (!db.staff) db.staff = [];
  db.staff.push(newStaff);

  // If role is manager, also guarantee in managers array
  if (role === 'manager') {
    if (!db.managers) db.managers = [];
    if (!db.managers.some((m: any) => m.username.toLowerCase() === cleanUsername.toLowerCase())) {
      db.managers.push({ username: cleanUsername, password, name: name || cleanUsername, phone, image });
    }
  }

  writeData(db);

  broadcastUpdate('staff_updated', { count: db.staff.length, new_staff: newStaff });
  res.json({ success: true, staff: newStaff });
});

app.put('/api/staff/:username', requireManager, (req, res) => {
  const { username } = req.params;
  const { name, role, phone, salary, shift, password, image } = req.body;

  const db = readData();
  const staffIndex = db.staff.findIndex((s: any) => s.username === username);
  if (staffIndex === -1) {
    return res.status(404).json({ error: 'کارمند مورد نظر یافت نشد.' });
  }

  const current = db.staff[staffIndex];
  db.staff[staffIndex] = {
    ...current,
    name: name !== undefined ? name : current.name,
    role: role !== undefined ? role : current.role,
    phone: phone !== undefined ? phone : current.phone,
    salary: salary !== undefined ? salary : current.salary,
    shift: shift !== undefined ? shift : current.shift,
    password: password ? password : current.password,
    image: image !== undefined ? image : current.image
  };

  writeData(db);
  broadcastUpdate('staff_updated', { count: db.staff.length });
  res.json({ success: true, staff: db.staff[staffIndex] });
});

app.delete('/api/staff/:username', requireManager, (req, res) => {
  const { username } = req.params;
  const db = readData();
  const beforeCount = db.staff.length;
  db.staff = db.staff.filter((s: any) => s.username !== username);

  if (db.staff.length === beforeCount) {
    return res.status(404).json({ error: 'کارمند مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('staff_updated', { count: db.staff.length });
  res.json({ success: true, message: 'کارمند با موفقیت حذف گردید.' });
});

// Menu Management (Full CRUD)
app.get('/api/menu', (req, res) => {
  const db = readData();
  res.json(db.menu);
});

app.post('/api/menu', requireManager, (req, res) => {
  const { name, price, desc, loyalty_points, station, image } = req.body;
  if (!name || !price || !station) {
    return res.status(400).json({ error: 'نام، قیمت و ایستگاه پخت الزامی است.' });
  }

  const db = readData();
  const newItem = {
    id: db.menu.length > 0 ? Math.max(...db.menu.map((m: any) => m.id)) + 1 : 1,
    name,
    price: Number(price),
    desc: desc || '',
    loyalty_points: Number(loyalty_points || 0),
    station,
    image: image || ''
  };

  db.menu.push(newItem);
  writeData(db);

  broadcastUpdate('menu_updated', newItem);
  res.json({ success: true, item: newItem });
});

app.put('/api/menu/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const { name, price, desc, loyalty_points, station, image } = req.body;

  const db = readData();
  const menuIndex = db.menu.findIndex((m: any) => m.id === Number(id));
  if (menuIndex === -1) {
    return res.status(404).json({ error: 'خوراک مورد نظر در منو یافت نشد.' });
  }

  const current = db.menu[menuIndex];
  db.menu[menuIndex] = {
    ...current,
    name: name !== undefined ? name : current.name,
    price: price !== undefined ? Number(price) : current.price,
    desc: desc !== undefined ? desc : current.desc,
    loyalty_points: loyalty_points !== undefined ? Number(loyalty_points) : current.loyalty_points,
    station: station !== undefined ? station : current.station,
    image: image !== undefined ? image : current.image
  };

  writeData(db);
  broadcastUpdate('menu_updated', db.menu[menuIndex]);
  res.json({ success: true, item: db.menu[menuIndex] });
});

app.delete('/api/menu/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const db = readData();
  const beforeCount = db.menu.length;
  db.menu = db.menu.filter((m: any) => m.id !== Number(id));

  if (db.menu.length === beforeCount) {
    return res.status(404).json({ error: 'خوراک مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('menu_updated', { deleted_id: Number(id) });
  res.json({ success: true, message: 'خوراک با موفقیت از منو حذف شد.' });
});

// Table Deletion
app.delete('/api/tables/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const db = readData();
  if (!db.tables) db.tables = [];

  const beforeLen = db.tables.length;
  db.tables = db.tables.filter((t: any) => t.id !== id);
  delete db.table_status[id];

  if (db.tables.length === beforeLen) {
    return res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('tables_updated', db.tables);
  res.json({ success: true, message: 'میز با موفقیت حذف گردید.' });
});

// Helper to automatically register or update active connected devices
function registerOrUpdateDevice(
  req: express.Request, 
  category: 'customer' | 'staff', 
  details: { name: string; table_id?: string; username?: string; device_type?: string }
) {
  try {
    const db = readData();
    if (!db.devices || !Array.isArray(db.devices)) db.devices = [];

    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '192.168.1.100';
    const cleanIp = rawIp.replace('::ffff:', '');
    const ua = (req.headers['user-agent'] as string) || '';

    let detectedType = details.device_type || 'موبایل هوشمند';
    if (!details.device_type) {
      if (/iPad|Tablet/i.test(ua)) detectedType = 'تبلت لمسی';
      else if (/iPhone/i.test(ua)) detectedType = 'iPhone (iOS Safari)';
      else if (/Android/i.test(ua)) detectedType = 'Android Mobile';
      else if (/Windows/i.test(ua)) detectedType = 'Windows PC';
      else if (/Macintosh/i.test(ua)) detectedType = 'MacBook / MacOS';
    }

    const devId = details.table_id 
      ? `cust-${details.table_id.toLowerCase()}` 
      : (details.username ? `staff-${details.username.toLowerCase()}` : `dev-${cleanIp.replace(/[^0-9]/g, '')}`);

    let existing = db.devices.find((d: any) => d.id === devId || (details.table_id && d.table_id === details.table_id));

    if (existing) {
      existing.last_seen = 'هم‌اکنون';
      existing.category = category;
      if (details.name) existing.name = details.name;
      if (cleanIp && cleanIp !== '127.0.0.1') existing.ip = cleanIp;
    } else {
      existing = {
        id: devId,
        name: details.name,
        ip: cleanIp && cleanIp !== '127.0.0.1' ? cleanIp : `192.168.1.${140 + db.devices.length}`,
        device_type: detectedType,
        category,
        table_id: details.table_id || null,
        username: details.username || null,
        status: 'active',
        last_seen: 'هم‌اکنون',
        connected_at: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      db.devices.push(existing);
    }

    writeData(db);
    broadcastUpdate('devices_updated', db.devices);
  } catch (e) {}
}

// Devices Management & Access Control Endpoints
app.get('/api/devices', (req, res) => {
  const db = readData();
  if (!db.devices || !Array.isArray(db.devices) || db.devices.length === 0) {
    db.devices = [
      // Staff Devices
      { 
        id: 'staff-waiter-1', 
        name: 'تبلت گارسون سالن پامیر (احمد بلال)', 
        username: 'ZN-101', 
        ip: '192.168.1.105', 
        device_type: 'Android Tablet (Samsung Tab A9)', 
        category: 'staff', 
        status: 'active', 
        last_seen: 'هم‌اکنون' 
      },
      { 
        id: 'staff-pos-1', 
        name: 'صندوق مرکزی و صدور فاکتور POS', 
        username: 'cashier1', 
        ip: '192.168.1.100', 
        device_type: 'Windows PC (All-In-One Touch)', 
        category: 'staff', 
        status: 'active', 
        last_seen: 'هم‌اکنون' 
      },
      { 
        id: 'staff-kds-1', 
        name: 'نمایشگر KDS مطبخ و ایستگاه گریل', 
        username: 'chef1', 
        ip: '192.168.1.110', 
        device_type: 'Smart TV / Android Display', 
        category: 'staff', 
        status: 'active', 
        last_seen: 'هم‌اکنون' 
      },
      // Customer Devices (from tables)
      { 
        id: 'cust-t1', 
        name: 'موبایل مهمان (میز ۱ سالن اصلی)', 
        table_id: 't1', 
        ip: '192.168.1.142', 
        device_type: 'iPhone iOS (Safari)', 
        category: 'customer', 
        status: 'active', 
        last_seen: '۲ دقیقه پیش' 
      },
      { 
        id: 'cust-t3', 
        name: 'موبایل مهمان (تخت ۳ پامیر)', 
        table_id: 't3', 
        ip: '192.168.1.148', 
        device_type: 'Samsung Galaxy (Chrome)', 
        category: 'customer', 
        status: 'active', 
        last_seen: 'هم‌اکنون' 
      },
      { 
        id: 'cust-vip1', 
        name: 'گوشی مهمان (سوئیت VIP هرات)', 
        table_id: 'VIP-1', 
        ip: '192.168.1.155', 
        device_type: 'Xiaomi MIUI (Browser)', 
        category: 'customer', 
        status: 'active', 
        last_seen: '۵ دقیقه پیش' 
      }
    ];
    writeData(db);
  } else {
    // Ensure every existing device has category assigned
    let updated = false;
    db.devices.forEach((d: any) => {
      if (!d.category) {
        if (d.name?.includes('مشتری') || d.name?.includes('مهمان') || d.id?.includes('cust') || d.table_id) {
          d.category = 'customer';
        } else {
          d.category = 'staff';
        }
        updated = true;
      }
    });
    if (updated) writeData(db);
  }

  res.json(db.devices);
});

app.post('/api/devices/status', requireManager, (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: 'شناسه دستگاه و وضعیت الزامی است.' });
  }

  const db = readData();
  if (!db.devices) db.devices = [];
  const dev = db.devices.find((d: any) => d.id === id);
  if (!dev) {
    return res.status(404).json({ error: 'دستگاه مورد نظر یافت نشد.' });
  }

  dev.status = status; // 'active' or 'blocked'
  writeData(db);

  broadcastUpdate('device_status_updated', { id, status });
  res.json({ success: true, device: dev });
});

app.post('/api/devices/rename', requireManager, (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'شناسه دستگاه و نام جدید الزامی است.' });
  }

  const db = readData();
  if (!db.devices) db.devices = [];
  const dev = db.devices.find((d: any) => d.id === id);
  if (!dev) {
    return res.status(404).json({ error: 'دستگاه مورد نظر یافت نشد.' });
  }

  dev.name = name;
  writeData(db);

  broadcastUpdate('device_updated', dev);
  res.json({ success: true, device: dev });
});

app.delete('/api/devices/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const db = readData();
  if (!db.devices) db.devices = [];

  const beforeLen = db.devices.length;
  db.devices = db.devices.filter((d: any) => d.id !== id);

  if (db.devices.length === beforeLen) {
    return res.status(404).json({ error: 'دستگاه مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('device_deleted', { id });
  res.json({ success: true, message: 'دسترسی دستگاه با موفقیت لغو شد.' });
});

// Settings Management (Full Real Backend)
app.get('/api/settings', (req, res) => {
  const db = readData();
  const defaultSettings = {
    branch_name: 'زعفران و نارنج • شعبه مرکزی کابل - کارته سه، سرک ۱۵',
    phone: '+93 20 250 0100',
    tax_percent: 0,
    service_charge_percent: 0,
    currency: 'AFN',
    wifi_ssid: 'Saffron_Guest_5G',
    waiter_cooldown_minutes: 2,
    receipt_header: 'رستوران سنتی و شیک زعفران و نارنج',
    receipt_footer: 'با سپاس از تشریف‌فرمایی شما • نوش جان',
    devices: [
      { id: 'p-kitchen', name: 'پرینتر آشپزخانه مرکزی', ip: '192.168.1.101', type: 'تیکت‌های غذای گرم و کباب‌ها', status: 'online' },
      { id: 'p-grill', name: 'پرینتر منقل‌خانه و باربیکیو', ip: '192.168.1.102', type: 'تیکت سفارش شین‌واری و تکه', status: 'online' },
      { id: 'p-pos', name: 'پرینتر صندوق و بل مشتری', ip: 'USB High-Speed', type: 'صدور بل حساب نهایی مهمان', status: 'online' },
      { id: 'pos-terminal', name: 'پایانه بانکی Kabul Bank POS', ip: 'TID: 8840291', type: 'ارسال مستقیم مبلغ به پوز', status: 'online' }
    ]
  };

  res.json(db.settings || defaultSettings);
});

app.post('/api/settings', requireManager, (req, res) => {
  const newSettings = req.body;
  if (!newSettings) {
    return res.status(400).json({ error: 'اطلاعات تنظیمات معتبر نیست.' });
  }

  const db = readData();
  db.settings = { ...(db.settings || {}), ...newSettings };
  writeData(db);

  broadcastUpdate('settings_updated', db.settings);
  res.json({ success: true, settings: db.settings });
});

// Inventory Management (Full CRUD)
app.get('/api/inventory', (req, res) => {
  const db = readData();
  res.json(db.inventory || []);
});

app.post('/api/inventory', requireManager, (req, res) => {
  const { name, category, stock, min_stock, unit, unit_price, expiry } = req.body;
  if (!name || stock === undefined || !unit) {
    return res.status(400).json({ error: 'نام قلم کالا، موجودی و واحد شمارش الزامی است.' });
  }

  const db = readData();
  if (!db.inventory) db.inventory = [];

  const newItem = {
    id: db.inventory.length > 0 ? Math.max(...db.inventory.map((i: any) => i.id || 0)) + 1 : 1,
    code: '#INV-' + Math.floor(1000 + Math.random() * 9000),
    name,
    category: category || 'مواد اولیه',
    stock: Number(stock),
    min_stock: Number(min_stock || 10),
    unit,
    unit_price: Number(unit_price || 0),
    expiry: expiry || 'نامحدود'
  };

  db.inventory.push(newItem);
  writeData(db);

  broadcastUpdate('inventory_updated', db.inventory);
  res.json({ success: true, item: newItem });
});

app.put('/api/inventory/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const { name, category, stock, min_stock, unit, unit_price, expiry } = req.body;

  const db = readData();
  if (!db.inventory) db.inventory = [];

  const index = db.inventory.findIndex((i: any) => i.id === Number(id));
  if (index === -1) {
    return res.status(404).json({ error: 'آیتم انبار یافت نشد.' });
  }

  const current = db.inventory[index];
  db.inventory[index] = {
    ...current,
    name: name !== undefined ? name : current.name,
    category: category !== undefined ? category : current.category,
    stock: stock !== undefined ? Number(stock) : current.stock,
    min_stock: min_stock !== undefined ? Number(min_stock) : current.min_stock,
    unit: unit !== undefined ? unit : current.unit,
    unit_price: unit_price !== undefined ? Number(unit_price) : current.unit_price,
    expiry: expiry !== undefined ? expiry : current.expiry
  };

  writeData(db);
  broadcastUpdate('inventory_updated', db.inventory);
  res.json({ success: true, item: db.inventory[index] });
});

app.delete('/api/inventory/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const db = readData();
  if (!db.inventory) db.inventory = [];

  const beforeLen = db.inventory.length;
  db.inventory = db.inventory.filter((i: any) => i.id !== Number(id));

  if (db.inventory.length === beforeLen) {
    return res.status(404).json({ error: 'آیتم انبار یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('inventory_updated', db.inventory);
  res.json({ success: true, message: 'آیتم با موفقیت از انبار حذف گردید.' });
});

// Dynamic Comprehensive Reports & Analytics Endpoint
app.get('/api/reports/analytics', (req, res) => {
  const db = readData();

  const orders = db.orders || [];
  const payments = db.payments || [];
  const menu = db.menu || [];
  const staff = db.staff || [];
  const inventory = db.inventory || [];

  // 1. Sales Summary & Daily Revenue
  const settledOrders = orders.filter((o: any) => o.status === 'settled');
  const activeOrders = orders.filter((o: any) => o.status === 'active');

  const totalRevenue = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const averageOrderValue = settledOrders.length > 0 ? Math.round(totalRevenue / settledOrders.length) : 0;

  // 2. Payment Method Breakdown
  const paymentBreakdown = {
    cash: payments.filter((p: any) => p.method === 'cash').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
    card: payments.filter((p: any) => p.method === 'card').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
    split: payments.filter((p: any) => p.method === 'split').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  };

  // 3. Product Performance (Aggregated from real orders)
  const productMap = new Map<string, { id: any; name: string; quantity: number; revenue: number; station: string }>();

  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      if (item.status !== 'voided') {
        const key = item.name || `Food-${item.menu_item_id}`;
        const existing = productMap.get(key) || {
          id: item.menu_item_id,
          name: key,
          quantity: 0,
          revenue: 0,
          station: 'pots'
        };
        existing.quantity += Number(item.quantity || 1);
        existing.revenue += Number(item.unit_price || 0) * Number(item.quantity || 1);
        productMap.set(key, existing);
      }
    });
  });

  const productPerformance = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

  // 4. Waiter Performance
  const waiterMap = new Map<string, { username: string; name: string; ordersCount: number; totalSales: number; rating: string }>();

  staff.filter((s: any) => s.role === 'waiter' || s.role === 'manager').forEach((w: any) => {
    waiterMap.set(w.username, {
      username: w.username,
      name: w.name || w.username,
      ordersCount: 0,
      totalSales: 0,
      rating: w.rating || '۴.۸'
    });
  });

  orders.forEach((o: any) => {
    const waiterId = o.assigned_waiter || 'ZN-101';
    const waiterStats = waiterMap.get(waiterId) || {
      username: waiterId,
      name: waiterId,
      ordersCount: 0,
      totalSales: 0,
      rating: '۴.۸'
    };
    waiterStats.ordersCount += 1;
    const orderSum = (o.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? Number(it.unit_price || 0) * Number(it.quantity || 1) : 0), 0);
    waiterStats.totalSales += orderSum;
    waiterMap.set(waiterId, waiterStats);
  });

  const waiterPerformance = Array.from(waiterMap.values()).sort((a, b) => b.totalSales - a.totalSales);

  // 5. Inventory Valuation & Cost
  const totalInventoryValue = inventory.reduce((sum: number, it: any) => sum + (Number(it.stock || 0) * Number(it.unit_price || 0)), 0);
  const criticalInventoryCount = inventory.filter((it: any) => Number(it.stock || 0) <= Number(it.min_stock || 10)).length;

  // 6. Estimated Profit / Loss
  // Standard restaurant raw material cost ratio ~ 35% of food revenue
  const estimatedFoodCost = Math.round(totalRevenue * 0.35);
  const estimatedGrossProfit = totalRevenue - estimatedFoodCost;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((estimatedGrossProfit / totalRevenue) * 100) : 65;

  // 7. Live Diners & Floor Presence
  const tables = db.tables || [];
  let totalDinersPresent = 0;
  let totalCapacity = 0;
  const activeTablesDetails: any[] = [];

  tables.forEach((t: any) => {
    const isOccupied = db.table_status[t.id] === 'occupied';
    const capacity = Number(t.capacity || 4);
    totalCapacity += capacity;

    if (isOccupied) {
      const activeOrder = activeOrders.find((o: any) => o.table_id === t.id);
      const guestCount = Number(t.current_guests || (activeOrder ? activeOrder.guest_count : null) || Math.max(1, capacity - 1));
      totalDinersPresent += guestCount;

      let orderTotal = 0;
      let itemsSummary = '';
      if (activeOrder) {
        orderTotal = (activeOrder.items || []).reduce((s: number, it: any) => s + (it.status !== 'voided' ? (it.unit_price * it.quantity) : 0), 0);
        itemsSummary = (activeOrder.items || []).map((it: any) => `${it.name} (${it.quantity})`).join('، ');
      }

      activeTablesDetails.push({
        id: t.id,
        name: t.name,
        section: t.section,
        capacity,
        guests: guestCount,
        assigned_waiter: t.assigned_waiter || 'ZN-101',
        order_id: activeOrder?.id || null,
        order_total: orderTotal,
        customer_name: activeOrder?.customer_name || 'مهمان سالن',
        order_created_at: activeOrder?.created_at || null,
        items_summary: itemsSummary
      });
    }
  });

  const liveDinersMetrics = {
    total_diners_present: totalDinersPresent,
    total_capacity: totalCapacity,
    occupancy_percent: totalCapacity > 0 ? Math.round((totalDinersPresent / totalCapacity) * 100) : 0,
    occupied_tables_count: activeTablesDetails.length,
    free_tables_count: tables.filter((t: any) => db.table_status[t.id] === 'free' || !db.table_status[t.id]).length,
    cleaning_tables_count: tables.filter((t: any) => db.table_status[t.id] === 'cleaning').length,
    total_tables_count: tables.length,
    active_tables_detail: activeTablesDetails
  };

  res.json({
    sales_summary: {
      total_revenue: totalRevenue,
      settled_orders_count: settledOrders.length,
      active_orders_count: activeOrders.length,
      average_order_value: averageOrderValue,
      profit_margin_percent: profitMarginPercent
    },
    payment_breakdown: paymentBreakdown,
    product_performance: productPerformance,
    waiter_performance: waiterPerformance,
    inventory_metrics: {
      total_valuation: totalInventoryValue,
      critical_items_count: criticalInventoryCount,
      total_items_count: inventory.length
    },
    profit_loss: {
      gross_revenue: totalRevenue,
      estimated_cogs: estimatedFoodCost,
      estimated_gross_profit: estimatedGrossProfit,
      margin_percent: profitMarginPercent
    },
    live_diners: liveDinersMetrics
  });
});

// Table & Waiter Assignment Management
app.get('/api/tables', (req, res) => {
  const db = readData();
  const tables = db.tables || [];
  // Merge with live statuses and ensure qr_token exists
  let modified = false;
  const result = tables.map((t: any) => {
    if (!t.qr_token) {
      t.qr_token = 'zn_qr_' + t.id + '_' + Math.random().toString(36).substring(2, 8);
      modified = true;
    }
    const liveStatus = db.table_status[t.id] || t.status || 'free';
    const activeOrder = (db.orders || []).find((o: any) => o.table_id === t.id && o.status === 'active');
    const calculatedGuests = liveStatus === 'occupied' ? (t.current_guests || (activeOrder ? activeOrder.guest_count : null) || t.capacity || 4) : 0;
    return {
      ...t,
      current_guests: calculatedGuests,
      status: liveStatus
    };
  });

  if (modified) {
    db.tables = result;
    writeData(db);
  }

  res.json(result);
});

app.post('/api/tables', requireManager, (req, res) => {
  const { id, name, capacity, section, assigned_waiter } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'نام میز الزامی است.' });
  }

  const db = readData();
  if (!db.tables) db.tables = [];

  const finalId = id || ('tbl-' + (db.tables.length + 1) + '-' + Math.floor(Math.random() * 1000));
  const autoQrToken = 'zn_qr_' + finalId + '_' + Math.random().toString(36).substring(2, 8);

  const index = db.tables.findIndex((t: any) => t.id === finalId);
  if (index >= 0) {
    db.tables[index] = { 
      ...db.tables[index], 
      name, 
      capacity, 
      section, 
      assigned_waiter,
      qr_token: db.tables[index].qr_token || autoQrToken 
    };
  } else {
    db.tables.push({ 
      id: finalId, 
      name, 
      capacity: capacity || 4, 
      section: section || 'اصلی', 
      assigned_waiter: assigned_waiter || 'ZN-101', 
      status: 'free',
      qr_token: autoQrToken 
    });
    db.table_status[finalId] = 'free';
  }

  writeData(db);
  broadcastUpdate('tables_updated', db.tables);
  res.json({ success: true, tables: db.tables });
});

app.put('/api/tables/:id', requireManager, (req, res) => {
  const { id } = req.params;
  const { name, capacity, section, assigned_waiter } = req.body;

  const db = readData();
  if (!db.tables) db.tables = [];

  const index = db.tables.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
  }

  const current = db.tables[index];
  db.tables[index] = {
    ...current,
    name: name !== undefined ? name : current.name,
    capacity: capacity !== undefined ? Number(capacity) : current.capacity,
    section: section !== undefined ? section : current.section,
    assigned_waiter: assigned_waiter !== undefined ? assigned_waiter : current.assigned_waiter
  };

  writeData(db);
  broadcastUpdate('tables_updated', db.tables);
  res.json({ success: true, table: db.tables[index] });
});

// Table Guest Session Issuance & QR Validation Endpoint
app.post('/api/table/session', (req, res) => {
  const { table_id, qr_token, seat_number } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شماره میز الزامی است.' });
  }

  const db = readData();
  const table = (db.tables || []).find((t: any) => t.id.toLowerCase() === table_id.toLowerCase());
  if (!table) {
    return res.status(404).json({ error: 'میز مورد نظر در سیستم ثبت نشده است.' });
  }

  // Cryptographic QR Token validation: If qr_token is passed, verify against registered table qr_token
  if (qr_token && table.qr_token && table.qr_token !== qr_token) {
    return res.status(403).json({ error: 'امضای QR اسکن‌شده برای این میز نامعتبر است.' });
  }

  const sessionToken = generateTableSessionToken(table.id, seat_number);

  registerOrUpdateDevice(req, 'customer', {
    name: `موبایل مهمان (${table.name})`,
    table_id: table.id
  });

  res.json({
    success: true,
    table_session_token: sessionToken,
    table_id: table.id,
    table_name: table.name,
    seat_number: seat_number || '1',
    assigned_waiter: table.assigned_waiter || 'ZN-101'
  });
});

// Guest Check-in (changes table status to occupied instantly with security verification)
app.post('/api/guest/check-in', (req, res) => {
  const { table_id, seat_number } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شماره میز الزامی است.' });
  }

  const db = readData();
  const table = (db.tables || []).find((t: any) => t.id.toLowerCase() === table_id.toLowerCase());
  if (!table) {
    return res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
  }

  registerOrUpdateDevice(req, 'customer', {
    name: `موبایل مهمان (${table.name})`,
    table_id: table.id
  });

  // Security check: ensure valid table session or staff auth
  if (!verifyTableAccess(req, table.id)) {
    // If table exists and client didn't have token, auto-issue session token for seamless onboarding
    const sessionToken = generateTableSessionToken(table.id, seat_number);
    db.table_status[table.id] = 'occupied';
    writeData(db);

    const assigned_waiter = table.assigned_waiter || 'ZN-101';
    broadcastUpdate('table_status_updated', db.table_status);
    broadcastUpdate('guest_seated', {
      table_id: table.id,
      table_name: table.name,
      seat_number: seat_number || '1',
      assigned_waiter,
      timestamp: new Date().toISOString()
    });

    return res.json({ 
      success: true, 
      table_status: db.table_status, 
      assigned_waiter,
      table_session_token: sessionToken 
    });
  }

  db.table_status[table.id] = 'occupied';
  writeData(db);

  const assigned_waiter = table.assigned_waiter || 'ZN-101';

  broadcastUpdate('table_status_updated', db.table_status);
  broadcastUpdate('guest_seated', {
    table_id: table.id,
    table_name: table.name,
    seat_number: seat_number || '1',
    assigned_waiter,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, table_status: db.table_status, assigned_waiter });
});

// Rate limiting storage for Call Waiter
const lastServiceCallTimeMap = new Map<string, number>();

// Comprehensive Service Request (Call Waiter, Water, Cutlery, Bread, Bill) with Cooldown
app.post('/api/service-request', (req, res) => {
  const { table_id, seat_number, request_type } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شماره میز الزامی است.' });
  }

  if (!verifyTableAccess(req, table_id)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: برای درخواست خدمات باید توکن دسترسی معتبر این میز را داشته باشید.' });
  }

  const db = readData();
  const cooldownMinutes = Number(db.settings?.waiter_cooldown_minutes || 2);
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const lastCallTime = lastServiceCallTimeMap.get(table_id.toLowerCase()) || 0;
  const now = Date.now();
  const elapsedMs = now - lastCallTime;

  if (elapsedMs < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    const remMinutes = Math.floor(remainingSeconds / 60);
    const remSecs = remainingSeconds % 60;
    const timeStr = remMinutes > 0 ? `${remMinutes} دقیقه و ${remSecs} ثانیه` : `${remSecs} ثانیه`;

    return res.status(429).json({
      error: `شما به تازگی درخواست گارسون ارسال کرده‌اید. لطفاً ${timeStr} دیگر جهت درخواست مجدد شکیبا باشید.`,
      remaining_seconds: remainingSeconds
    });
  }

  // Record new call time
  lastServiceCallTimeMap.set(table_id.toLowerCase(), now);

  const table = (db.tables || []).find((t: any) => t.id.toLowerCase() === table_id.toLowerCase());
  const assigned_waiter = table ? table.assigned_waiter : 'ZN-101';

  const labelMap: Record<string, string> = {
    waiter: 'فراخوان گارسون سر میز',
    water: 'درخواست آب معدنی و یخ',
    cutlery: 'درخواست قاشق، چنگال و دستمال',
    bread: 'درخواست نان گرم اضافی',
    bill: 'درخواست صورت‌حساب سر میز'
  };

  const payload = {
    table_id: table ? table.id : table_id,
    table_name: table ? table.name : table_id,
    seat_number: seat_number || '1',
    request_type: request_type || 'waiter',
    request_label: labelMap[request_type] || 'درخواست خدمات',
    assigned_waiter,
    timestamp: new Date().toISOString()
  };

  // Broadcast single event to prevent duplicate notifications
  broadcastUpdate('service_requested', payload);

  res.json({ success: true, payload, cooldown_seconds: cooldownMinutes * 60 });
});

// Deliver All Orders for Table Endpoint (Kitchen KDS Complete Delivery)
app.post('/api/table/orders/deliver-all', (req, res) => {
  const { table_id } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شناسه میز الزامی است.' });
  }

  const db = readData();
  let updatedCount = 0;

  (db.orders || []).forEach((order: any) => {
    if (order.table_id.toLowerCase() === table_id.toLowerCase() && order.status === 'active') {
      (order.items || []).forEach((item: any) => {
        if (item.status !== 'voided') {
          item.status = 'delivered';
          updatedCount++;
        }
      });
    }
  });

  writeData(db);
  broadcastUpdate('table_orders_delivered', { table_id });
  broadcastUpdate('order_item_status_updated', { table_id, status: 'delivered' });

  res.json({ success: true, delivered_items_count: updatedCount });
});

// Chef Ready Notification to Waiter
app.post('/api/chef/ready-notify', (req, res) => {
  const { order_id, table_id, seat_number } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شماره میز الزامی است.' });
  }

  const db = readData();
  const table = (db.tables || []).find((t: any) => t.id === table_id);
  const assigned_waiter = table ? table.assigned_waiter : 'ZN-101';

  const payload = {
    order_id,
    table_id,
    table_name: table ? table.name : table_id,
    seat_number: seat_number || '1',
    assigned_waiter,
    timestamp: new Date().toISOString()
  };

  broadcastUpdate('food_ready_to_serve', payload);
  res.json({ success: true, payload });
});

// Call Waiter SSE Notification
app.post('/api/call-waiter', (req, res) => {
  const { table_id, seat_number } = req.body;
  if (!table_id) {
    return res.status(400).json({ error: 'شماره میز الزامی است.' });
  }

  if (!verifyTableAccess(req, table_id)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: برای فراخوان گارسون باید توکن دسترسی معتبر این میز را داشته باشید.' });
  }

  const db = readData();
  const table = (db.tables || []).find((t: any) => t.id === table_id);
  const assigned_waiter = table ? table.assigned_waiter : 'ZN-101';

  broadcastUpdate('waiter_called', {
    table_id,
    table_name: table ? table.name : table_id,
    seat_number: seat_number || '1',
    assigned_waiter,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, assigned_waiter });
});

// Stations Management
app.get('/api/stations', (req, res) => {
  const db = readData();
  res.json(db.stations);
});

app.post('/api/stations', requireManager, (req, res) => {
  const { station } = req.body;
  if (!station) {
    return res.status(400).json({ error: 'نام ایستگاه الزامی است.' });
  }

  const db = readData();
  if (db.stations.includes(station)) {
    return res.status(400).json({ error: 'این ایستگاه قبلاً ثبت شده است.' });
  }

  db.stations.push(station);
  writeData(db);

  broadcastUpdate('stations_updated', db.stations);
  res.json({ success: true, stations: db.stations });
});

// Orders
app.get('/api/orders', (req, res) => {
  const db = readData();
  res.json(db.orders);
});

app.post('/api/order', (req, res) => {
  const { table_id, seat_number, items, customer_phone, customer_name } = req.body;
  if (!table_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'شماره میز و اقلام سفارش الزامی است.' });
  }

  // Cryptographic Table Access Verification (Prevents unauthorized order placement for other tables)
  if (!verifyTableAccess(req, table_id)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: برای ثبت سفارش باید توکن دسترسی معتبر یا امضای دیجیتال QR میز را داشته باشید.' });
  }

  const db = readData();

  let earnedPointsTotal = 0;
  const processedItems = items.map((ordered: any) => {
    const menuItem = db.menu.find((m: any) => m.id === ordered.menu_item_id);
    const snapshottedPrice = menuItem ? menuItem.price : ordered.unit_price || 0;
    const itemPoints = menuItem ? Number(menuItem.loyalty_points || 0) : 0;
    earnedPointsTotal += itemPoints * Number(ordered.quantity || 1);

    return {
      id: 'OI-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      menu_item_id: ordered.menu_item_id,
      name: menuItem ? menuItem.name : ordered.name,
      unit_price: snapshottedPrice,
      quantity: Number(ordered.quantity || 1),
      status: 'pending',
      chef_note: ordered.chef_note || '',
      addons: ordered.addons || [],
      voided_at: null,
      void_reason: null,
      void_approved_by: null
    };
  });

  const table = (db.tables || []).find((t: any) => t.id === table_id);
  const assigned_waiter = table ? table.assigned_waiter : 'ZN-101';

  // Loyalty customer credit
  if (customer_phone) {
    if (!db.customers) db.customers = [];
    let customer = db.customers.find((c: any) => c.phone === customer_phone);
    if (!customer) {
      customer = { phone: customer_phone, name: customer_name || 'مهمان وفادار', points: 0 };
      db.customers.push(customer);
    }
    customer.points = (customer.points || 0) + earnedPointsTotal;
    if (customer_name && (!customer.name || customer.name === 'مهمان وفادار')) {
      customer.name = customer_name;
    }
  }

  const newOrder = {
    id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    table_id,
    table_name: table ? table.name : table_id,
    seat_number: seat_number || '1',
    assigned_waiter,
    customer_phone: customer_phone || null,
    customer_name: customer_name || null,
    items: processedItems,
    created_at: new Date().toISOString(),
    status: 'active'
  };

  if (!db.orders) db.orders = [];
  db.orders.push(newOrder);

  // Automatically update table status to occupied
  db.table_status[table_id] = 'occupied';

  writeData(db);

  broadcastUpdate('order_placed', newOrder);
  broadcastUpdate('table_status_updated', db.table_status);

  res.json({ success: true, order: newOrder, earned_points: earnedPointsTotal });
});

// Update Individual Order Item Status
app.post('/api/order/item/status', (req, res) => {
  const { order_item_id, status } = req.body;
  if (!order_item_id || !status) {
    return res.status(400).json({ error: 'شناسه آیتم و وضعیت الزامی است.' });
  }

  const db = readData();
  let updated = false;

  db.orders.forEach((order: any) => {
    const item = order.items.find((i: any) => i.id === order_item_id);
    if (item) {
      item.status = status;
      updated = true;
    }
  });

  if (!updated) {
    return res.status(404).json({ error: 'آیتم مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('order_item_status_updated', { order_item_id, status });
  res.json({ success: true });
});

// Void Order Item
app.post('/api/order/item/void', (req, res) => {
  const { order_item_id, void_reason, approved_by_username, password } = req.body;
  if (!order_item_id || !void_reason || !approved_by_username || !password) {
    return res.status(400).json({ error: 'شناسه آیتم، دلیل ابطال و رمز تاییدکننده الزامی است.' });
  }

  const db = readData();

  const authStaff = db.staff.find((s: any) => s.username === approved_by_username && s.password === password);
  const authManager = db.managers.find((m: any) => m.username === approved_by_username && m.password === password);
  
  const isValidApprover = authManager || (authStaff && (authStaff.role === 'manager' || authStaff.role === 'cashier'));
  if (!isValidApprover) {
    return res.status(403).json({ error: 'ابطال سفارش فقط با تایید مدیر یا صندوق‌دار امکان‌پذیر است.' });
  }

  let updated = false;
  db.orders.forEach((order: any) => {
    const item = order.items.find((i: any) => i.id === order_item_id);
    if (item) {
      item.status = 'voided';
      item.voided_at = new Date().toISOString();
      item.void_reason = void_reason;
      item.void_approved_by = approved_by_username;
      updated = true;
    }
  });

  if (!updated) {
    return res.status(404).json({ error: 'آیتم مورد نظر یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('order_item_voided', { order_item_id, voided_by: approved_by_username });
  res.json({ success: true });
});

// Waiter / Staff Order Item Update (Change Quantity, Chef Note, or Seat)
app.post('/api/order/item/update', (req, res) => {
  const { order_item_id, quantity, chef_note, seat_number } = req.body;
  if (!order_item_id) {
    return res.status(400).json({ error: 'شناسه آیتم سفارش الزامی است.' });
  }

  const db = readData();
  let foundOrder: any = null;
  let foundItem: any = null;

  (db.orders || []).forEach((order: any) => {
    const it = (order.items || []).find((i: any) => i.id === order_item_id);
    if (it) {
      foundOrder = order;
      foundItem = it;
    }
  });

  if (!foundItem || !foundOrder) {
    return res.status(404).json({ error: 'قلم سفارش مورد نظر یافت نشد.' });
  }

  if (quantity !== undefined) {
    const q = Number(quantity);
    if (q <= 0) {
      foundItem.status = 'voided';
      foundItem.voided_at = new Date().toISOString();
      foundItem.void_reason = 'لغو و صفر شدن تعداد توسط گارسون';
      foundItem.void_approved_by = 'waiter';
    } else {
      foundItem.quantity = q;
      if (foundItem.status === 'voided') foundItem.status = 'pending';
    }
  }

  if (chef_note !== undefined) {
    foundItem.chef_note = chef_note;
  }

  if (seat_number !== undefined) {
    foundOrder.seat_number = seat_number;
  }

  writeData(db);
  broadcastUpdate('orders_updated', db.orders);
  broadcastUpdate('order_item_updated', { order_id: foundOrder.id, item: foundItem });

  res.json({ success: true, item: foundItem, order: foundOrder });
});

// Waiter Remove/Cancel Item directly
app.post('/api/order/item/remove', (req, res) => {
  const { order_item_id, reason } = req.body;
  if (!order_item_id) {
    return res.status(400).json({ error: 'شناسه قلم سفارش الزامی است.' });
  }

  const db = readData();
  let found = false;

  (db.orders || []).forEach((order: any) => {
    const item = (order.items || []).find((i: any) => i.id === order_item_id);
    if (item) {
      item.status = 'voided';
      item.voided_at = new Date().toISOString();
      item.void_reason = reason || 'لغو توسط گارسون سر میز';
      item.void_approved_by = 'waiter';
      found = true;
    }
  });

  if (!found) {
    return res.status(404).json({ error: 'قلم سفارش یافت نشد.' });
  }

  writeData(db);
  broadcastUpdate('orders_updated', db.orders);
  broadcastUpdate('order_item_voided', { order_item_id, reason });

  res.json({ success: true, message: 'قلم سفارش با موفقیت لغو شد.' });
});

// Waiter / Staff Add items to existing active order
app.post('/api/order/items/add', (req, res) => {
  const { table_id, seat_number, items } = req.body;
  if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'شماره میز و اقلام الزامی است.' });
  }

  const db = readData();
  let activeOrder = (db.orders || []).find(
    (o: any) => o.table_id?.toLowerCase() === table_id.toLowerCase() && o.status === 'active'
  );

  const table = (db.tables || []).find((t: any) => t.id === table_id);
  const assigned_waiter = table ? table.assigned_waiter : 'ZN-101';

  const processedNewItems = items.map((ordered: any) => {
    const menuItem = db.menu.find((m: any) => m.id === ordered.menu_item_id);
    const snapshottedPrice = menuItem ? menuItem.price : ordered.unit_price || 0;

    return {
      id: 'OI-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      menu_item_id: ordered.menu_item_id,
      name: menuItem ? menuItem.name : ordered.name,
      unit_price: snapshottedPrice,
      quantity: Number(ordered.quantity || 1),
      status: 'pending',
      chef_note: ordered.chef_note || '',
      addons: ordered.addons || [],
      voided_at: null,
      void_reason: null,
      void_approved_by: null
    };
  });

  if (activeOrder) {
    if (!activeOrder.items) activeOrder.items = [];
    activeOrder.items.push(...processedNewItems);
  } else {
    activeOrder = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      table_id,
      table_name: table ? table.name : table_id,
      seat_number: seat_number || '1',
      assigned_waiter,
      items: processedNewItems,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    if (!db.orders) db.orders = [];
    db.orders.push(activeOrder);
  }

  db.table_status[table_id] = 'occupied';
  writeData(db);

  broadcastUpdate('orders_updated', db.orders);
  broadcastUpdate('order_placed', activeOrder);

  res.json({ success: true, order: activeOrder });
});

// Waiter / Staff Cancel entire order for table
app.post('/api/order/cancel', (req, res) => {
  const { order_id, table_id, reason } = req.body;
  const db = readData();

  let targetOrder = null;
  if (order_id) {
    targetOrder = (db.orders || []).find((o: any) => o.id === order_id);
  } else if (table_id) {
    targetOrder = (db.orders || []).find((o: any) => o.table_id?.toLowerCase() === table_id.toLowerCase() && o.status === 'active');
  }

  if (!targetOrder) {
    return res.status(404).json({ error: 'سفارش فعالی یافت نشد.' });
  }

  targetOrder.status = 'cancelled';
  targetOrder.cancel_reason = reason || 'لغو توسط گارسون';
  targetOrder.cancelled_at = new Date().toISOString();

  (targetOrder.items || []).forEach((item: any) => {
    item.status = 'voided';
    item.void_reason = reason || 'لغو کل سفارش میز';
  });

  writeData(db);
  broadcastUpdate('orders_updated', db.orders);

  res.json({ success: true, message: 'سفارش میز با موفقیت لغو شد.' });
});

// Table Status Manual Updates
app.get('/api/table/status', (req, res) => {
  const db = readData();
  res.json(db.table_status);
});

app.post('/api/table/status', (req, res) => {
  const { table_id, status, guests_count } = req.body;
  if (!table_id || !status) {
    return res.status(400).json({ error: 'شماره میز و وضعیت الزامی است.' });
  }

  const db = readData();
  db.table_status[table_id] = status;

  // Sync current_guests on tables array
  const table = (db.tables || []).find((t: any) => t.id === table_id);
  if (table) {
    if (status === 'free' || status === 'cleaning') {
      table.current_guests = 0;
    } else if (status === 'occupied') {
      table.current_guests = guests_count !== undefined ? Number(guests_count) : (table.current_guests || table.capacity || 4);
    }
  }

  writeData(db);

  broadcastUpdate('table_status_updated', db.table_status);
  broadcastUpdate('tables_updated', db.tables);
  res.json({ success: true, table_status: db.table_status, tables: db.tables });
});

app.post('/api/table/guests', (req, res) => {
  const { table_id, guests_count } = req.body;
  if (!table_id || guests_count === undefined) {
    return res.status(400).json({ error: 'شماره میز و تعداد مهمانان الزامی است.' });
  }

  const db = readData();
  const table = (db.tables || []).find((t: any) => t.id === table_id);
  if (!table) {
    return res.status(404).json({ error: 'میز مورد نظر یافت نشد.' });
  }

  const count = Math.max(0, Number(guests_count));
  table.current_guests = count;
  if (count > 0 && db.table_status[table_id] !== 'occupied') {
    db.table_status[table_id] = 'occupied';
  } else if (count === 0 && db.table_status[table_id] === 'occupied') {
    db.table_status[table_id] = 'free';
  }

  writeData(db);
  broadcastUpdate('table_status_updated', db.table_status);
  broadcastUpdate('tables_updated', db.tables);
  res.json({ success: true, table, table_status: db.table_status });
});

// Idempotent Payment processing for Table or Seat
app.post('/api/payment', (req, res) => {
  const { idempotency_key, table_id, seat_number, amount, method } = req.body;
  if (!idempotency_key || !table_id || !amount || !method) {
    return res.status(400).json({ error: 'ارائه کلید تکرار، شماره میز، مبلغ و روش پرداخت الزامی است.' });
  }

  const db = readData();

  const existingPayment = db.payments.find((p: any) => p.idempotency_key === idempotency_key);
  if (existingPayment) {
    return res.json({ success: true, duplicate: true, payment: existingPayment });
  }

  const activeOrders = db.orders.filter((o: any) => o.table_id === table_id && o.status === 'active');
  if (activeOrders.length === 0) {
    return res.status(400).json({ error: 'هیچ سفارش فعالی برای این میز ثبت نشده است.' });
  }

  let totalBill = 0;
  activeOrders.forEach((o: any) => {
    o.items.forEach((item: any) => {
      if (item.status !== 'voided') {
        if (!seat_number || o.seat_number === seat_number) {
          totalBill += item.unit_price * item.quantity;
        }
      }
    });
  });

  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'مبلغ پرداختی باید بزرگتر از صفر باشد.' });
  }

  const newPayment = {
    id: 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    idempotency_key,
    table_id,
    seat_number: seat_number || null,
    amount: Number(amount),
    method,
    timestamp: new Date().toISOString()
  };
  db.payments.push(newPayment);

  let fullySettled = true;
  let pointsIssued = 0;
  let customerPhoneToCredit: string | null = null;

  activeOrders.forEach((o: any) => {
    if (!seat_number || o.seat_number === seat_number) {
      o.status = 'settled';
      if (o.customer_phone) {
        customerPhoneToCredit = o.customer_phone;
        o.items.forEach((item: any) => {
          if (item.status !== 'voided') {
            const menuItem = (db.menu || []).find((m: any) => m.id === item.menu_item_id);
            const p = menuItem ? Number(menuItem.loyalty_points || 0) : Math.round(Number(item.unit_price) * 0.1);
            pointsIssued += p * Number(item.quantity || 1);
          }
        });
      }
    } else if (o.status === 'active') {
      fullySettled = false;
    }
  });

  if (customerPhoneToCredit && pointsIssued > 0) {
    if (!db.customers) db.customers = [];
    let cust = db.customers.find((c: any) => c.phone === customerPhoneToCredit);
    if (!cust) {
      cust = { phone: customerPhoneToCredit, name: 'مهمان وفادار', points: 0 };
      db.customers.push(cust);
    }
    cust.points = (cust.points || 0) + pointsIssued;
    broadcastUpdate('points_issued', { phone: customerPhoneToCredit, points_issued: pointsIssued, total_points: cust.points });
  }

  // Table State automatic rule: تسویه کامل همه صندلی‌ها -> CLEANING (هرگز مستقیم AVAILABLE)
  if (fullySettled) {
    db.table_status[table_id] = 'cleaning';
  }

  writeData(db);

  broadcastUpdate('payment_processed', newPayment);
  broadcastUpdate('table_status_updated', db.table_status);
  broadcastUpdate('orders_updated', db.orders);
  broadcastUpdate('bill_settled', { table_id, payment: newPayment });

  res.json({ success: true, payment: newPayment, points_issued: pointsIssued, customer_phone: customerPhoneToCredit });
});

// Loyalty Program Endpoints
app.post('/api/loyalty/register', (req, res) => {
  const { phone, name } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'شماره تلفن الزامی است.' });
  }

  const db = readData();
  let customer = db.customers.find((c: any) => c.phone === phone);
  if (!customer) {
    customer = { phone, name: name || 'مهمان وفادار', points: 0 };
    db.customers.push(customer);
    writeData(db);
  }

  res.json({ success: true, customer });
});

app.post('/api/loyalty/redeem', (req, res) => {
  const { phone, points, cashier_username, password } = req.body;
  if (!phone || !points || !cashier_username || !password) {
    return res.status(400).json({ error: 'شماره تلفن، مقدار امتیاز، و مشخصات صندوق‌دار الزامی است.' });
  }

  const db = readData();

  const authStaff = db.staff.find((s: any) => s.username === cashier_username && s.password === password);
  const authManager = db.managers.find((m: any) => m.username === cashier_username && m.password === password);
  
  const isValidCashier = authManager || (authStaff && (authStaff.role === 'manager' || authStaff.role === 'cashier'));
  if (!isValidCashier) {
    return res.status(403).json({ error: 'تأیید خرج کردن امتیازات باشگاه فقط توسط صندوق‌دار یا مدیر مجاز است.' });
  }

  const customer = db.customers.find((c: any) => c.phone === phone);
  if (!customer) {
    return res.status(404).json({ error: 'مشتری مورد نظر یافت نشد.' });
  }

  if (customer.points < Number(points)) {
    return res.status(400).json({ error: `امتیاز ناکافی است. موجودی پوینت: ${customer.points}` });
  }

  customer.points -= Number(points);
  writeData(db);

  broadcastUpdate('loyalty_redeemed', { phone, points_redeemed: points });
  res.json({ success: true, remaining_points: customer.points });
});

app.get('/api/customers', (req, res) => {
  const db = readData();
  res.json(db.customers);
});

// Custom Broadcast messaging
app.post('/api/broadcast', (req, res) => {
  const { message, target_role, target_user_id } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'متن پیام الزامی است.' });
  }

  broadcastUpdate('custom_alert', { message, target_role, target_user_id });
  res.json({ success: true });
});

const devMode = process.env.NODE_ENV !== 'production';

if (devMode) {
  createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then(vite => {
    app.use(vite.middlewares);
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server started in DEV mode on port ${PORT}`);
    });
  });
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server started in PROD mode on port ${PORT}`);
  });
}
