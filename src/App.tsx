import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// ─── Secure PrivateRoute ───────────────────────────────────────────────────
// Verifies auth state via Firebase (not forgeable localStorage flags).
// Shows a full-screen loader while the auth check is in progress.
type RouteType = 'customer' | 'seller' | 'admin';

const PrivateRoute = ({
  children,
  type = 'customer',
}: {
  children: React.ReactNode;
  type?: RouteType;
}) => {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('denied');
        return;
      }

      try {
        if (type === 'admin') {
          const snap = await getDoc(doc(db, 'admins', user.uid));
          setStatus(snap.exists() ? 'allowed' : 'denied');
        } else if (type === 'seller') {
          const snap = await getDoc(doc(db, 'shopOwners', user.uid));
          setStatus(snap.exists() ? 'allowed' : 'denied');
        } else {
          // Customer: any authenticated user is allowed
          setStatus('allowed');
        }
      } catch {
        setStatus('denied');
      }
    });

    return () => unsub();
  }, [type]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <img src="/favicon.svg" alt="QuickXerox" className="w-16 h-16 mb-4 animate-pulse" />
        <div className="flex gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    const redirectTo =
      type === 'admin' ? '/admin/login' :
      type === 'seller' ? '/seller/login' :
      '/login';
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
// ──────────────────────────────────────────────────────────────────────────────

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
import AdminCoupons from './pages/admin/AdminCoupons';
import IpBlocked from './pages/legal/IpBlocked';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import RefundPage from './pages/legal/RefundPage';
import ContactPage from './pages/legal/ContactPage';
import MaintenancePage from './pages/legal/MaintenancePage';
import LandingPage from './pages/home/LandingPage';
import SellerLandingPage from './pages/seller/SellerLandingPage';
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
        <div className="animate-in fade-in zoom-in duration-700 flex flex-col items-center">
          <img src="/favicon.svg" alt="QuickXerox" className="w-32 h-32 mb-8 animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">QuickXerox</h2>
          <div className="mt-6 flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" />
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
          <Route
            path="/admin/coupons"
            element={
              <PrivateRoute type="admin">
                <AdminCoupons />
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
