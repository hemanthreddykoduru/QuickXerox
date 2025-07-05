import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { CheckCircle, Sparkles } from 'lucide-react'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          fontSize: '14px',
          maxWidth: '400px',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        },
        success: {
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            padding: '20px 24px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          },
          iconTheme: {
            primary: '#ffffff',
            secondary: '#10b981',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            padding: '20px 24px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          },
          iconTheme: {
            primary: '#ffffff',
            secondary: '#ef4444',
          },
        },
      }}
    />
  </React.StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}