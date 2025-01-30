import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import LoginPage from './pages/LoginPage';
import SellerLoginPage from './pages/SellerLoginPage';
import AccountPage from './pages/AccountPage';

const PrivateRoute = ({ children, type = 'customer' }: { children: React.ReactNode; type?: 'customer' | 'seller' }) => {
  const isAuthenticated =
    type === 'seller'
      ? localStorage.getItem('isSellerAuthenticated') === 'true'
      : localStorage.getItem('isAuthenticated') === 'true';

  return isAuthenticated ? <>{children}</> : <Navigate to={type === 'seller' ? '/seller/login' : '/login'} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
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
      </Routes>
    </Router>
  );
}

export default App;
