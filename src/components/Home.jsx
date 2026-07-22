import React from 'react';
import { GraduationCap, ArrowRight, Search, Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Home({ isRegistrationActive, onNavigate, isLoadingSettings }) {
  return (
    <div className="hero-section">
      {/* University Visual Emblem */}
      <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-glow)', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1.5rem', border: '1px solid rgba(var(--primary-hue), var(--primary-sat), var(--primary-light), 0.1)' }}>
        <GraduationCap size={48} />
      </div>

      {/* Hero Badging */}
      {isLoadingSettings ? (
        <span className="hero-badge" style={{ animation: 'none' }}>
          Checking Portal Status...
        </span>
      ) : isRegistrationActive ? (
        <span className="hero-badge">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', marginRight: '4px' }}></span>
          Registration Active
        </span>
      ) : (
        <span className="hero-badge" style={{ background: 'hsla(346, 84%, 48%, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <AlertCircle size={14} /> Registration Closed
        </span>
      )}

      {/* Main Branding */}
      <h2 className="hero-title">Bharathiar University</h2>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem', fontFamily: 'var(--font-heading)' }}>
        Chellammal Hostel Deposit Refund Portal
      </h3>
      
      <p className="hero-subtitle">
        Students who have not received their deposit refund can register their details here. After verification, the consolidated request will be submitted to the University.
      </p>

      {/* Dynamic CTA Block depending on mode */}
      <div className="hero-cta">
        {isLoadingSettings ? (
          <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)' }}></div>
        ) : isRegistrationActive ? (
          <>
            <button 
              onClick={() => onNavigate('register')} 
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              Register Now <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => onNavigate('verify')} 
              className="btn btn-secondary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              <Search size={18} /> Verify Registration Status
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'var(--border-color)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '500px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong>Notice:</strong> The online registration form is currently closed as the collection phase is complete. However, you can verify if your details are successfully recorded.
            </div>
            <button 
              onClick={() => onNavigate('verify')} 
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              <Search size={18} /> Check My Status
            </button>
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2.5rem', maxWidth: '600px', fontStyle: 'italic', lineHeight: 1.5 }} className="no-print">
        *Disclaimer: This portal is created by students, not by Bharathiar University (BU). It is for registration and consolidation purposes only.
      </p>

      {/* Quick features summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', width: '100%', marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><Search size={24} /></div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>Easy Tracking</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check verification status instantly using your University register number</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><Lock size={24} /></div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>Admin Control</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Only authenticated admin operators can access student details and signatures</p>
        </div>
      </div>

    </div>
  );
}
