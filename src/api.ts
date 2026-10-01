/**
 * Saffron & Naranj API Client
 */

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // Staff / Manager Bearer Token
  const token = localStorage.getItem('saffron_token');
  const role = localStorage.getItem('saffron_user_role');
  const username = localStorage.getItem('saffron_username');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const credentials = localStorage.getItem('saffron_credentials');
    if (credentials) {
      headers['Authorization'] = 'Basic ' + credentials;
    }
  }

  if (role) {
    headers['X-User-Role'] = role;
  }
  if (username) {
    headers['X-Username'] = username;
  }

  // Guest Table Session Token
  const tableToken = localStorage.getItem('saffron_table_token');
  if (tableToken) {
    headers['X-Table-Token'] = tableToken;
  }

  return headers;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `خطا در برقراری ارتباط با سرور: ${response.status}`);
  }
  return response.json();
};

export const api = {
  getStatus: () => apiFetch('/api/status'),
  setup: (data: any) => apiFetch('/api/setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => apiFetch('/api/login', { method: 'POST', body: JSON.stringify(data) }),
  getStaff: () => apiFetch('/api/staff'),
  addStaff: (data: any) => apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (username: string, data: any) => apiFetch('/api/staff/' + encodeURIComponent(username), { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (username: string) => apiFetch('/api/staff/' + encodeURIComponent(username), { method: 'DELETE' }),
  getMenu: () => apiFetch('/api/menu'),
  addMenu: (data: any) => apiFetch('/api/menu', { method: 'POST', body: JSON.stringify(data) }),
  updateMenu: (id: number, data: any) => apiFetch(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenu: (id: number) => apiFetch(`/api/menu/${id}`, { method: 'DELETE' }),
  getStations: () => apiFetch('/api/stations'),
  addStation: (data: any) => apiFetch('/api/stations', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => apiFetch('/api/orders'),
  placeOrder: (data: any) => apiFetch('/api/order', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderItemStatus: (order_item_id: string, status: string) => 
    apiFetch('/api/order/item/status', { method: 'POST', body: JSON.stringify({ order_item_id, status }) }),
  updateOrderItem: (data: { order_item_id: string; quantity?: number; chef_note?: string; seat_number?: string }) =>
    apiFetch('/api/order/item/update', { method: 'POST', body: JSON.stringify(data) }),
  removeOrderItem: (order_item_id: string, reason?: string) =>
    apiFetch('/api/order/item/remove', { method: 'POST', body: JSON.stringify({ order_item_id, reason }) }),
  addOrderItems: (data: { table_id: string; seat_number?: string; items: any[] }) =>
    apiFetch('/api/order/items/add', { method: 'POST', body: JSON.stringify(data) }),
  cancelTableOrder: (data: { order_id?: string; table_id?: string; reason?: string }) =>
    apiFetch('/api/order/cancel', { method: 'POST', body: JSON.stringify(data) }),
  voidOrderItem: (data: any) => apiFetch('/api/order/item/void', { method: 'POST', body: JSON.stringify(data) }),
  getTableStatuses: () => apiFetch('/api/table/status'),
  updateTableStatus: (table_id: string, status: string, guests_count?: number) => 
    apiFetch('/api/table/status', { method: 'POST', body: JSON.stringify({ table_id, status, guests_count }) }),
  updateTableGuests: (table_id: string, guests_count: number) => 
    apiFetch('/api/table/guests', { method: 'POST', body: JSON.stringify({ table_id, guests_count }) }),
  processPayment: (data: any) => apiFetch('/api/payment', { method: 'POST', body: JSON.stringify(data) }),
  registerLoyalty: (phone: string, name?: string) => 
    apiFetch('/api/loyalty/register', { method: 'POST', body: JSON.stringify({ phone, name }) }),
  redeemLoyalty: (data: any) => apiFetch('/api/loyalty/redeem', { method: 'POST', body: JSON.stringify(data) }),
  getCustomers: () => apiFetch('/api/customers'),
  getPublicStaffList: () => apiFetch('/api/public-staff-list'),
  getTables: () => apiFetch('/api/tables'),
  addTable: (data: any) => apiFetch('/api/tables', { method: 'POST', body: JSON.stringify(data) }),
  updateTable: (id: string, data: any) => apiFetch(`/api/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTable: (id: string) => apiFetch(`/api/tables/${id}`, { method: 'DELETE' }),
  getSettings: () => apiFetch('/api/settings'),
  updateSettings: (data: any) => apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(data) }),
  getDevices: () => apiFetch('/api/devices'),
  updateDeviceStatus: (id: string, status: string) => 
    apiFetch('/api/devices/status', { method: 'POST', body: JSON.stringify({ id, status }) }),
  renameDevice: (id: string, name: string) => 
    apiFetch('/api/devices/rename', { method: 'POST', body: JSON.stringify({ id, name }) }),
  deleteDevice: (id: string) => 
    apiFetch(`/api/devices/${id}`, { method: 'DELETE' }),
  getInventory: () => apiFetch('/api/inventory'),
  addInventory: (data: any) => apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id: number, data: any) => apiFetch(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInventory: (id: number) => apiFetch(`/api/inventory/${id}`, { method: 'DELETE' }),
  getAnalyticsReports: () => apiFetch('/api/reports/analytics'),
  requestTableSession: (data: { table_id: string; qr_token?: string; seat_number?: string }) =>
    apiFetch('/api/table/session', { method: 'POST', body: JSON.stringify(data) }),
  guestCheckIn: (data: { table_id: string; seat_number: string }) => 
    apiFetch('/api/guest/check-in', { method: 'POST', body: JSON.stringify(data) }),
  sendServiceRequest: (data: { table_id: string; seat_number: string; request_type: string }) => 
    apiFetch('/api/service-request', { method: 'POST', body: JSON.stringify(data) }),
  deliverAllTableOrders: (table_id: string) => 
    apiFetch('/api/table/orders/deliver-all', { method: 'POST', body: JSON.stringify({ table_id }) }),
  notifyFoodReady: (data: { order_id: string; table_id: string; seat_number?: string }) => 
    apiFetch('/api/chef/ready-notify', { method: 'POST', body: JSON.stringify(data) }),
  callWaiter: (data: any) => apiFetch('/api/call-waiter', { method: 'POST', body: JSON.stringify(data) }),
  broadcastMessage: (data: any) => apiFetch('/api/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  getNetworkInfo: () => apiFetch('/api/system/network-info')
};
