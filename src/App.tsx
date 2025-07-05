import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import LoginPage from './pages/LoginPage';
import SellerLoginPage from './pages/SellerLoginPage';
import AccountPage from './pages/AccountPage';
import SellerInvitation from './components/SellerInvitation';
import SellerInvitationAccept from './pages/SellerInvitationAccept';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrderList from './pages/AdminOrderList';
import AdminSellerList from './pages/AdminSellerList';
import AdminSellerDetails from './pages/AdminSellerDetails';
import LandingPage from './pages/LandingPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';

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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/landingpage" replace />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seller/login" element={<SellerLoginPage />} />
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
      </Routes>
      <PWAInstallPrompt />
    </Router>
  );
}

export default App;
