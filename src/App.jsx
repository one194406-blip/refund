import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Home from './components/Home';
import RegistrationForm from './components/RegistrationForm';
import StatusVerification from './components/StatusVerification';
import AdminDashboard from './components/AdminDashboard';
import { Sun, Moon, GraduationCap, CheckCircle, AlertTriangle, Info, X, Lock } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isRegistrationActive, setIsRegistrationActive] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Read local storage or system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Toasts State
  const [toasts, setToasts] = useState([]);

  // Toast adder function
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync and fetch portal state
  useEffect(() => {
    const fetchPortalSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const { data, error } = await supabase
          .from('portal_settings')
          .select('value')
          .eq('key', 'registration_active')
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setIsRegistrationActive(data.value.active);
        }
      } catch (err) {
        console.error('Error fetching portal settings:', err);
        // Fallback to active if offline/error during setup
        setIsRegistrationActive(true);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchPortalSettings();
  }, [currentPage]); // Re-fetch on page transitions to keep state in sync

  // Sync theme to DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Navigate handler
  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Decorative Blur Blobs */}
      <div className="ambient-glow-1 no-print"></div>
      <div className="ambient-glow-2 no-print"></div>

      {/* Navigation Bar */}
      <nav className="navbar no-print" style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
        <a href="#" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem', flexShrink: 0 }} onClick={(e) => { e.preventDefault(); handleNavigate('home'); }}>
          <div className="nav-logo" style={{ flexShrink: 0 }}>
            <span className="nav-logo-icon">BU</span>
          </div>
          <div className="nav-title" style={{ flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Bharathiar University</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Chellammal Hostel Refund Portal</span>
          </div>
        </a>

        <div className="nav-actions">
          {/* Quick Nav Home */}
          {currentPage !== 'home' && (
            <button 
              onClick={() => handleNavigate('home')} 
              className="btn btn-secondary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              Home
            </button>
          )}

          {/* Quick Nav Admin */}
          {currentPage !== 'admin' && (
            <button 
              onClick={() => handleNavigate('admin')} 
              className="btn btn-outline"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Lock size={14} /> Admin Portal
            </button>
          )}

          {/* Theme Toggler */}
          <button 
            onClick={() => setIsDarkMode(prev => !prev)}
            className="theme-toggle-btn"
            aria-label="Toggle Dark Mode"
            title="Toggle Light/Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Main Layout Area */}
      <main className="container">
        {currentPage === 'home' && (
          <Home 
            isRegistrationActive={isRegistrationActive} 
            onNavigate={handleNavigate}
            isLoadingSettings={isLoadingSettings}
          />
        )}

        {currentPage === 'register' && (
          <RegistrationForm 
            onBack={() => handleNavigate('home')} 
            addToast={addToast}
          />
        )}

        {currentPage === 'verify' && (
          <StatusVerification 
            onBack={() => handleNavigate('home')} 
            addToast={addToast}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard 
            addToast={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer no-print">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <GraduationCap size={16} />
          <strong>Bharathiar University</strong>
        </div>
        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0' }}>
          Chellammal Hostel Refund Portal
        </p>
      </footer>

      {/* Printable Footer */}
      <div className="only-print" style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.8rem', borderTop: '1px solid #000', paddingTop: '1rem' }}>
        <p>&copy; {new Date().getFullYear()} Bharathiar University Chellammal Hostel Deposit Refund Portal. All system logs are recorded.</p>
      </div>

      {/* Toast Notification Container */}
      <div className="toast-container no-print">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={18} className="toast-icon success" />}
              {toast.type === 'error' && <AlertTriangle size={18} className="toast-icon error" />}
              {toast.type === 'info' && <Info size={18} className="toast-icon info" />}
            </span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
