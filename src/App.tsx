import React, { useState } from 'react';
import { AuthProvider }  from './auth/AuthContext';
import { useAuth }       from './auth/AuthContext';
import ProtectedRoute    from './auth/ProtectedRoute';
import { useRole }       from './auth/useRole';
import AccessDenied      from './components/shared/AccessDenied';
import LoadingScreen     from './components/shared/LoadingScreen';
import Sidebar           from './components/layout/Sidebar';
import Topbar            from './components/layout/Topbar';
import DashboardPage     from './pages/DashboardPage';
import SalesPage         from './pages/SalesPage';
import ExpensesPage      from './pages/ExpensesPage';
import DistributionPage  from './pages/DistributionPage';
import ReportsPage       from './pages/ReportsPage';
import CustomersPage     from './pages/CustomersPage';
import UsersPage         from './pages/UsersPage';
import SettingsPage      from './pages/SettingsPage';
import {
  useSupaSales,
  useSupaExpenses,
  useSupaCustomers,
  useSupaUsers,
  useSupaSettings,
} from './hooks/useSupabase';
import { useLiveClock, useActivePage } from './hooks';
import { DISTRIBUTION_CATEGORIES }     from './data/seed';
import { todayIso }                    from './utils/helpers';

const PAGE_TITLES: Record<string, string> = {
  dashboard:    'Dashboard',
  sales:        'Sales',
  expenses:     'Expenses',
  distribution: 'Distribution',
  reports:      'Reports',
  customers:    'Customers',
  users:        'Users',
  settings:     'Settings',
};

const Loader: React.FC = () => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc', gap: 12, color: '#6b7280',
  }}>
    <i className="ti ti-loader-2"
      style={{ fontSize: 36, animation: 'spin 1s linear infinite' }}
      aria-hidden="true"
    />
    <span style={{ fontSize: 14, fontWeight: 500 }}>Loading data...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    margin: '24px 28px', padding: '14px 18px',
    background: '#fee2e2', border: '1px solid #fecaca',
    borderRadius: 10, color: '#dc2626',
    fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <i className="ti ti-alert-circle" style={{ fontSize: 18 }} aria-hidden="true" />
    Database error: {message}
  </div>
);

const AppShell: React.FC = () => {
  const { activePage, setActivePage } = useActivePage('dashboard');
  const { can } = useRole();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso());

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });

  const {
    records: sales,
    loading: salesLoading,
    error:   salesError,
    addOrUpdateSale,
    removeSale,
    removeAllSales,
  } = useSupaSales();

  const {
    records:  expenses,
    loading:  expensesLoading,
    error:    expensesError,
    addExpense,
    removeExpense,          // ← destructure
  } = useSupaExpenses();

  const { customers, loading: custLoading,     addCustomer }           = useSupaCustomers();
  const { users,     loading: usersLoading,    addUser, toggleStatus } = useSupaUsers();
  const { settings,  loading: settingsLoading, updateSettings }        = useSupaSettings();

  const isLoading =
    salesLoading || expensesLoading ||
    custLoading  || usersLoading    || settingsLoading;

  const dbError = salesError || expensesError;

  const renderPage = () => {
    if (isLoading) return <Loader />;
    if (dbError)   return <ErrorBanner message={dbError} />;

    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            sales={sales}
            expenses={expenses}
            categories={DISTRIBUTION_CATEGORIES}
            selectedDate={selectedDate}
            onSaveSale={can('canAddSales') ? addOrUpdateSale : async () => {}}
          />
        );
      case 'sales':
        return can('canViewSales') ? (
          <SalesPage
            records={sales}
            onRemove={removeSale}
            onRemoveAll={removeAllSales}
            canDelete={can('canDeleteSales')}
            canAdd={can('canAddSales')}
          />
        ) : <AccessDenied pageName="Sales" />;
      case 'expenses':
        return can('canViewExpenses') ? (
          <ExpensesPage
            records={expenses}
            onAdd={addExpense}
            onDelete={removeExpense}           // ← pass here
            canAdd={can('canAddExpenses')}
            canDelete={can('canDeleteExpenses')}
          />
        ) : <AccessDenied pageName="Expenses" />;
      case 'distribution':
        return can('canViewDistribution') ? (
          <DistributionPage
            categories={DISTRIBUTION_CATEGORIES}
            salesRecords={sales}
          />
        ) : <AccessDenied pageName="Distribution" />;
      case 'reports':
        return can('canViewReports') ? (
          <ReportsPage
            sales={sales}
            expenses={expenses}
            categories={DISTRIBUTION_CATEGORIES}
          />
        ) : <AccessDenied pageName="Reports" />;
      case 'customers':
        return can('canViewCustomers') ? (
          <CustomersPage
            customers={customers}
            onAdd={addCustomer}
            canAdd={can('canAddCustomers')}
          />
        ) : <AccessDenied pageName="Customers" />;
      case 'users':
        return can('canViewUsers') ? (
          <UsersPage
            users={users}
            onAdd={addUser}
            onToggleStatus={toggleStatus}
            canManage={can('canManageUsers')}
          />
        ) : <AccessDenied pageName="Users" />;
      case 'settings':
        return can('canViewSettings') ? (
          <SettingsPage
            settings={settings}
            onSave={updateSettings}
            canEdit={can('canEditSettings')}
          />
        ) : <AccessDenied pageName="Settings" />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main">
        <Topbar
          pageTitle={PAGE_TITLES[activePage] ?? ''}
          dateLabel={dateLabel}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

const AppWithAuth: React.FC = () => {
  const { ownerLoading } = useAuth();
  if (ownerLoading) return <LoadingScreen message="Starting up..." />;
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppWithAuth />
  </AuthProvider>
);

export default App;