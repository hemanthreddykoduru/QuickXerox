import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SellerDashboard from './pages/seller/SellerDashboard';
import LoginPage from './pages/auth/LoginPage';
import SellerLoginPage from './pages/auth/SellerLoginPage';
import AccountPage from './pages/customer/AccountPage';
import SellerInvitation from './pages/admin/SellerInvitation';
import SellerInvitationAccept from './pages/auth/SellerInvitationAccept';
import EmailVerificationHandler from './pages/auth/EmailVerificationHandler';
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
import MaintenancePage from './pages/legal/MaintenancePage';
import LandingPage from './pages/home/LandingPage';
import SellerLandingPage from './pages/seller/SellerLandingPage';


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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'systemSettings', 'global'), (doc) => {
      if (doc.exists()) {
        setMaintenanceMode(doc.data()?.maintenanceMode || false);
      }
      setLoadingSettings(false);
    }, (error) => {
      console.error("Failed to fetch settings", error);
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="relative">
          <Printer className="h-12 w-12 text-blue-600 animate-pulse" />
          <div className="absolute -inset-4 bg-blue-100/50 rounded-full blur-2xl -z-10 animate-pulse" />
        </div>
        <div className="mt-8 space-y-3 flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">QuickXerox</h2>
          <div className="flex gap-1.5 align-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-[bounce_1s_infinite_100ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-[bounce_1s_infinite_200ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-[bounce_1s_infinite_300ms]" />
          </div>
        </div>
      </div>
    );
  }

  // If maintenance mode is on, render MaintenancePage for all non-admin routes
  // We need to wrap this in Router to check location, or just conditionally render based on path if possible.
  // Better approach: Render Router, but specific routes might redirect.
  // Actually, to block everything easily, we can check path.
  // But we need Router to get path. 

  // Custom wrapper to handle maintenance mode logic with router context
  const AppContent = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    if (maintenanceMode && !isAdminRoute) {
      return <MaintenancePage />;
    }

    return (
      <>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />

          // ...

          <Route path="/login" element={<LoginPage />} />
          <Route path="/seller/login" element={<SellerLoginPage />} />
          <Route path="/seller/landingpage" element={<SellerLandingPage />} />
          <Route path="/ip-blocked" element={<IpBlocked />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refund" element={<RefundPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/landingpage" element={<LandingPage />} />
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
          <Route path="/verify-email" element={<EmailVerificationHandler />} />
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
      </>
    );
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
