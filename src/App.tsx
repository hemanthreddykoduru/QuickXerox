import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SellerDashboard from './pages/seller/SellerDashboard';
import LoginPage from './pages/auth/LoginPage';
import SellerLoginPage from './pages/auth/SellerLoginPage';
import AccountPage from './pages/customer/AccountPage';
import SellerInvitation from './pages/admin/SellerInvitation';
import SellerInvitationAccept from './pages/auth/SellerInvitationAccept';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrderList from './pages/admin/AdminOrderList';
import AdminSellerList from './pages/admin/AdminSellerList';
import AdminSellerDetails from './pages/admin/AdminSellerDetails';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminEmailTemplates from './pages/admin/AdminEmailTemplates';
import IpBlocked from './pages/legal/IpBlocked';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import RefundPage from './pages/legal/RefundPage';
import ContactPage from './pages/legal/ContactPage';


const PrivateRoute = ({ children, type = 'customer' }: { children: React.ReactNode; type?: 'customer' | 'seller' | 'admin' }) => {
  const location = useLocation();
  let isAuthenticated = false;

  if (type === 'seller') {
    isAuthenticated = localStorage.getItem('isSellerAuthenticated') === 'true';
  } else if (type === 'admin') {
    isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';
  } else {
    isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  }

  if (!isAuthenticated) {
    // Redirect to login page based on type
    let redirectTo = '/login';
    if (type === 'seller') {
      redirectTo = '/seller/login';
    } else if (type === 'admin') {
      redirectTo = '/admin/login';
    }
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seller/login" element={<SellerLoginPage />} />
        <Route path="/ip-blocked" element={<IpBlocked />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/customerdashboard"
          element={
            <PrivateRoute>
              <CustomerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <AccountPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/seller/dashboard"
          element={
            <PrivateRoute type="seller">
              <SellerDashboard />
            </PrivateRoute>
          }
        />
        <Route path="/admin/invite-seller" element={<SellerInvitation />} />
        <Route path="/seller-invitation" element={<SellerInvitationAccept />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute type="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <PrivateRoute type="admin">
              <AdminOrderList />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/sellers"
          element={
            <PrivateRoute type="admin">
              <AdminSellerList />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/sellers/:sellerId"
          element={
            <PrivateRoute type="admin">
              <AdminSellerDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <PrivateRoute type="admin">
              <AdminAuditLogs />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/email-templates"
          element={
            <PrivateRoute type="admin">
              <AdminEmailTemplates />
            </PrivateRoute>
          }
        />
      </Routes>

    </Router>
  );
}

export default App;
