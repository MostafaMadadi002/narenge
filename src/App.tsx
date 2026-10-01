/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PosBillingView } from './components/PosBillingView';
import { TablesHallView } from './components/TablesHallView';
import { KitchenKdsView } from './components/KitchenKdsView';
import { MenuManagementView } from './components/MenuManagementView';
import { StaffView } from './components/StaffView';
import { CustomerClubView } from './components/CustomerClubView';
import { InventoryView } from './components/InventoryView';
import { SettingsView } from './components/SettingsView';
import { DevicesView } from './components/DevicesView';
import { WaiterTabletView } from './components/WaiterTabletView';
import { TableSideSplitPaymentModal } from './components/TableSideSplitPaymentModal';
import { GuestPortalContainer } from './components/GuestPortalContainer';
import { LoginView } from './components/LoginView';
import { ReportsView } from './components/ReportsView';
import { api } from './api';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('table') || params.get('table_id') || params.get('guest')) {
        return 'guest-portal';
      }
      const savedRole = localStorage.getItem('saffron_user_role');
      const savedUsername = localStorage.getItem('saffron_username');
      if (savedRole && savedUsername) {
        return 'dashboard';
      }
    }
    return 'login';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [role, setRole] = useState<string>(() => localStorage.getItem('saffron_user_role') || '');
  const [username, setUsername] = useState<string>(() => localStorage.getItem('saffron_username') || '');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Global shared state synced via SSE
  const [menu, setMenu] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tableStatus, setTableStatus] = useState<any>({});
  const [staff, setStaff] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const loadAllData = () => {
    api.getMenu().then(setMenu).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
    api.getTableStatuses().then(setTableStatus).catch(() => {});
    
    // Auth-protected ones
    if (localStorage.getItem('saffron_credentials') || localStorage.getItem('saffron_token')) {
      api.getStaff().then(setStaff).catch(() => {});
      api.getCustomers().then(setCustomers).catch(() => {});
    }
  };

  useEffect(() => {
    loadAllData();

    // Connect Server-Sent Events (SSE)
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = () => {
      try {
        loadAllData();
      } catch (e) {
        console.error('Error parsing SSE event', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []); // Run ONLY ONCE on mount!

  const handleLoginSuccess = (userRole: string, userUsername: string) => {
    setRole(userRole);
    setUsername(userUsername);
    setCurrentPath('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('saffron_credentials');
    localStorage.removeItem('saffron_user_role');
    localStorage.removeItem('saffron_username');
    setRole('');
    setUsername('');
    setCurrentPath('login');
  };

  // Strict Role-Based Access Control (RBAC) path protection
  useEffect(() => {
    if (currentPath === 'login' || currentPath === 'guest-portal') return;

    const savedRole = role || localStorage.getItem('saffron_user_role') || '';
    if (!savedRole) {
      setCurrentPath('login');
      return;
    }

    if (savedRole === 'manager') {
      return; // Manager has access to everything
    }

    if (savedRole === 'cashier') {
      const allowed = ['cashier-billing', 'split-payment', 'active-orders'];
      if (!allowed.includes(currentPath)) {
        setCurrentPath('cashier-billing');
      }
    } else if (savedRole === 'chef') {
      const allowed = ['kitchen-kds'];
      if (!allowed.includes(currentPath)) {
        setCurrentPath('kitchen-kds');
      }
    } else if (savedRole === 'waiter') {
      const allowed = ['quick-order', 'tables-hall'];
      if (!allowed.includes(currentPath)) {
        setCurrentPath('quick-order');
      }
    } else {
      // Anyone else goes to login
      setCurrentPath('login');
    }
  }, [currentPath, role]);

  // Pure Full-Screen Guest Mobile App Mode (No management sidebar or desktop header)
  if (currentPath === 'guest-portal') {
    const userRole = role || localStorage.getItem('saffron_user_role') || '';
    const canGoBack = userRole === 'manager' || userRole === 'waiter';
    return (
      <div className="min-h-screen bg-[#18120f] text-[#ece0da] font-['Inter'] antialiased">
        <GuestPortalContainer onBackToAdmin={canGoBack ? () => setCurrentPath('dashboard') : undefined} />
      </div>
    );
  }

  if (currentPath === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentPath} />;
      case 'active-orders':
      case 'cashier-billing':
        return <PosBillingView />;
      case 'split-payment':
        return <TableSideSplitPaymentModal onClose={() => setCurrentPath('cashier-billing')} />;
      case 'tables-hall':
        return <TablesHallView />;
      case 'kitchen-kds':
        return <KitchenKdsView />;
      case 'menu-management':
        return <MenuManagementView />;
      case 'staff':
      case 'staff-personnel':
        return <StaffView />;
      case 'customer-club':
        return <CustomerClubView />;
      case 'inventory':
      case 'inventory-expenses':
        return <InventoryView />;
      case 'devices':
      case 'devices-hub':
        return <DevicesView />;
      case 'settings':
      case 'system-settings':
      case 'settings-devices':
        return <SettingsView />;
      case 'quick-order':
        return <WaiterTabletView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView onNavigate={setCurrentPath} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#18120f] text-[#ece0da] font-['Inter'] antialiased selection:bg-[#f66018] selection:text-white">
      <Sidebar
        currentPath={currentPath}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onNavigate={(path) => {
          setIsMobileSidebarOpen(false);
          if (path === 'login') {
            handleLogout();
          } else {
            setCurrentPath(path);
          }
        }}
      />
      <div className="lg:pr-72 pr-0 transition-all duration-300">
        <Header
          onSearch={(q) => setSearchQuery(q)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        />
        <main className="w-full pt-16 bg-[#18120f] min-h-screen">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
