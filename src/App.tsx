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

const PrivateRoute = ({ children, type = 'customer' }: { children: React.ReactNode; type?: 'customer' | 'seller' }) => {
  const location = useLocation();
  const isAuthenticated =
    type === 'seller'
      ? localStorage.getItem('isSellerAuthenticated') === 'true'
      : localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to={type === 'seller' ? '/seller/login' : '/login'} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
          path="/seller"
          element={
            <PrivateRoute type="seller">
              <SellerDashboard />
            </PrivateRoute>
          }
        />
        <Route path="/admin/invite-seller" element={<SellerInvitation />} />
        <Route path="/seller-invitation" element={<SellerInvitationAccept />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
