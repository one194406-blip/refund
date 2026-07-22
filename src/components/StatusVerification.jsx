import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, ArrowLeft, CheckCircle2, Clock, ShieldAlert, FileText } from 'lucide-react';

export default function StatusVerification({ onBack, addToast }) {
  const [registerNumber, setRegisterNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!registerNumber.trim()) {
      addToast('Please enter a Register Number', 'error');
      return;
    }

    setIsLoading(true);
    setSearched(true);
    setResult(null);

    try {
      // Query the security-definer RPC function to protect PII while retrieving status.
      // This calls verify_student_status(reg_num) which returns safe columns only.
      const { data, error } = await supabase
        .rpc('verify_student_status', { reg_num: registerNumber.trim().toUpperCase() });

      if (error) throw error;

      if (data && data.length > 0) {
        setResult(data[0]);
        addToast('Registration status found', 'success');
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error('Error verifying status:', err);
      addToast(err.message || 'Error occurred while searching. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <button onClick={onBack} className="btn btn-secondary btn-icon" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
        Verify Deposit Refund Status
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Enter your Register Number below to verify your registration and check the status of your refund.
      </p>

      <form onSubmit={handleSearch} className="verification-search">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={registerNumber}
            onChange={(e) => setRegisterNumber(e.target.value)}
            placeholder="Enter Register Number (e.g. 21DPH05)"
            className="input-control"
            disabled={isLoading}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Check Status'}
        </button>
      </form>

      {/* Results Section */}
      {isLoading && (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      )}

      {searched && !isLoading && (
        <div className="verification-result">
          {result ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
                Registration Details Found
              </h3>
              
              <div style={{ background: 'var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Student Name</span>
                    <span style={{ fontWeight: 600 }}>{result.full_name}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Register Number</span>
                    <span style={{ fontWeight: 600 }}>{result.register_number}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Department</span>
                    <span>{result.department}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Course & Batch</span>
                    <span>{result.course} ({result.batch_year})</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Registered On</span>
                    <span>{new Date(result.created_at).toLocaleDateString()} at {new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Status Indicator Card */}
                <div className={`status-card ${result.status === 'Completed' ? 'completed' : 'pending'}`}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Refund Processing Status
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem', display: 'block' }}>
                      {result.status === 'Completed' 
                        ? 'Refund Completed' 
                        : 'Verification Pending'}
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {result.status === 'Completed'
                        ? 'Your deposit refund has been verified, consolidated, and disbursed by the University finance office.'
                        : 'Your registration slip is received. The University is verifying your records before processing the refund.'}
                    </p>
                  </div>
                  
                  <span className={`status-badge ${result.status === 'Completed' ? 'completed' : 'pending'}`}>
                    {result.status === 'Completed' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Completed</span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> Pending</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'hsla(346, 84%, 48%, 0.05)', borderLeft: '4px solid var(--error)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <ShieldAlert size={24} style={{ color: 'var(--error)', flexShrink: 0 }} />
              <div>
                <h4 style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.95rem' }}>Record Not Found</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  The register number <strong>"{registerNumber.toUpperCase()}"</strong> was not found in the registration system.
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  If you haven't registered yet, please make sure the portal is open for registration, or contact the university finance department.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
