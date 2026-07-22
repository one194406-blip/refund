import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Lock, LogOut, Search, Eye, Filter, Check, 
  Download, Printer, AlertTriangle, FileText, 
  LayoutDashboard, Users, Clock, CheckCircle2, 
  Settings, RefreshCw, EyeOff, X, SearchCode, ChevronDown, Save, IndianRupee 
} from 'lucide-react';

export default function AdminDashboard({ addToast }) {
  // Authentication State
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Portal State
  const [registrations, setRegistrations] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRegistrationActive, setIsRegistrationActive] = useState(true);
  const [isTogglingMode, setIsTogglingMode] = useState(false);

  // Filters and Searching State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Interactive UI State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Pagination State
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Check existing session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDashboardData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchDashboardData();
      } else {
        setRegistrations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all registrations and portal settings
  const fetchDashboardData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Fetch registrations
      const { data: regs, error: regsError } = await supabase
        .from('refund_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (regsError) throw regsError;
      setRegistrations(regs || []);

      // 2. Fetch portal settings
      const { data: settings, error: settingsError } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('key', 'registration_active')
        .maybeSingle();

      if (settingsError) throw settingsError;
      if (settings) {
        setIsRegistrationActive(settings.value.active);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      addToast(err.message || 'Failed to fetch registration data.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Sign In Admin
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) throw error;
      addToast('Welcome back, Admin!', 'success');
      setSession(data.session);
    } catch (err) {
      console.error('Login error:', err);
      addToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign Out Admin
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      addToast('Logged out successfully', 'info');
    } catch (err) {
      addToast(err.message || 'Logout failed.', 'error');
    }
  };

  // Toggle Portal Registration Mode
  const toggleRegistrationMode = async () => {
    setIsTogglingMode(true);
    const newStatus = !isRegistrationActive;
    try {
      const { error } = await supabase
        .from('portal_settings')
        .upsert({ 
          key: 'registration_active', 
          value: { active: newStatus } 
        });

      if (error) throw error;
      setIsRegistrationActive(newStatus);
      addToast(`Portal mode switched to ${newStatus ? 'Active Registration' : 'Verification Only'}`, 'success');
    } catch (err) {
      console.error('Error toggling portal settings:', err);
      addToast(err.message || 'Failed to toggle portal setting', 'error');
    } finally {
      setIsTogglingMode(false);
    }
  };

  // Toggle Status of a registration (Pending <-> Completed)
  const toggleStudentStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    try {
      const { error } = await supabase
        .from('refund_registrations')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => reg.id === id ? { ...reg, status: nextStatus } : reg)
      );

      if (selectedStudent && selectedStudent.id === id) {
        setSelectedStudent(prev => ({ ...prev, status: nextStatus }));
      }

      addToast(`Status updated to ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      addToast(err.message || 'Failed to update student status', 'error');
    }
  };

  // Save admin internal notes
  const saveAdminNote = async (id) => {
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('refund_registrations')
        .update({ admin_notes: adminNoteInput })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => reg.id === id ? { ...reg, admin_notes: adminNoteInput } : reg)
      );

      if (selectedStudent && selectedStudent.id === id) {
        setSelectedStudent(prev => ({ ...prev, admin_notes: adminNoteInput }));
      }

      addToast('Admin notes saved successfully', 'success');
    } catch (err) {
      console.error('Error saving admin notes:', err);
      addToast(err.message || 'Failed to save notes', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Trigger loading notes input when student is viewed
  useEffect(() => {
    if (selectedStudent) {
      setAdminNoteInput(selectedStudent.admin_notes || '');
    }
  }, [selectedStudent]);

  // Reset pagination when searching or filters change
  useEffect(() => {
    setCurrentPageIndex(1);
  }, [searchTerm, statusFilter, departmentFilter, rowsPerPage]);

  // Analytics calculations
  const totalCount = registrations.length;
  const pendingCount = registrations.filter(r => r.status === 'Pending').length;
  const completedCount = registrations.filter(r => r.status === 'Completed').length;
  
  // Total money sums
  const totalAmount = registrations.reduce((sum, r) => sum + (r.deposit_amount ? Number(r.deposit_amount) : 0), 0);
  const pendingAmount = registrations
    .filter(r => r.status === 'Pending')
    .reduce((sum, r) => sum + (r.deposit_amount ? Number(r.deposit_amount) : 0), 0);
  const completedAmount = registrations
    .filter(r => r.status === 'Completed')
    .reduce((sum, r) => sum + (r.deposit_amount ? Number(r.deposit_amount) : 0), 0);

  // Departments List for filter & stats
  const departmentsMap = registrations.reduce((acc, r) => {
    const dept = r.department.trim().toUpperCase();
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const uniqueDepartments = Object.keys(departmentsMap).sort();

  // Filter registrations based on inputs
  const filteredRegistrations = registrations.filter(reg => {
    const searchString = `${reg.full_name} ${reg.register_number} ${reg.department} ${reg.course}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase().trim());
    
    const matchesStatus = statusFilter === 'All' || reg.status === statusFilter;
    const matchesDept = departmentFilter === 'All' || reg.department.trim().toUpperCase() === departmentFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const totalPages = Math.ceil(filteredRegistrations.length / rowsPerPage);
  const paginatedRegistrations = filteredRegistrations.slice(
    (currentPageIndex - 1) * rowsPerPage,
    currentPageIndex * rowsPerPage
  );

  // CSV Export Utility
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      addToast('No records to export', 'error');
      return;
    }

    const headers = [
      'Registration ID', 'Full Name', 'Register Number', 'Department', 
      'Course', 'Batch / Year', 'Mobile Number', 'Email', 
      'Claimed Amount', 'Student Remarks', 'Admin Notes', 
      'Signature URL', 'Status', 'Created Date'
    ];

    const rows = filteredRegistrations.map(r => [
      r.id,
      r.full_name,
      r.register_number,
      r.department,
      r.course,
      r.batch_year,
      r.mobile_number,
      r.email || '',
      r.deposit_amount || '0',
      r.remarks || '',
      r.admin_notes || '',
      r.signature_url || '',
      r.status,
      new Date(r.created_at).toLocaleString()
    ]);

    const csvContent = "\uFEFF" // Add BOM for Excel compatibility
      + [headers.join(','), ...rows.map(row => 
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        )].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BU_Refund_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported Successfully!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // LOGIN PAGE
  if (!session) {
    return (
      <div className="glass-card admin-gate-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--primary-glow)', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem' }}>Admin Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Please log in with your Supabase Admin account credentials to proceed.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@university.edu"
                className="input-control"
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-control"
                required
                disabled={isLoggingIn}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={18} className="spinner" style={{ animation: 'spin 1s linear infinite', border: 'none' }} /> Authenticating...
                </>
              ) : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ADMIN PORTAL
  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header no-print">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
            <LayoutDashboard style={{ color: 'var(--primary)' }} /> Admin Management Console
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage student refund applications, update verification statuses, and download sheets.
          </p>
        </div>

        <div className="nav-actions">
          {/* Active Mode Toggle */}
          <div className="admin-mode-toggle">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isRegistrationActive ? 'var(--primary)' : 'var(--text-muted)' }}>
              {isRegistrationActive ? 'Registration Active' : 'Portal Locked'}
            </span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isRegistrationActive}
                onChange={toggleRegistrationMode}
                disabled={isTogglingMode}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <button onClick={fetchDashboardData} className="btn btn-secondary btn-icon" title="Refresh Data" disabled={isLoadingData}>
            <RefreshCw size={16} className={isLoadingData ? 'spinner' : ''} style={isLoadingData ? { animation: 'spin 1s linear infinite', border: 'none' } : {}} />
          </button>

          <button onClick={handleLogout} className="btn btn-secondary">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Printable Title Block */}
      <div className="only-print" style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
        <h2>BHARATHIAR UNIVERSITY - CHELLAMMAL HOSTEL</h2>
        <h3>Consolidated Deposit Refund Registrations</h3>
        <p>Report generated on: {new Date().toLocaleString()}</p>
        <p>Total Registrations: {totalCount} | Completed: {completedCount} | Pending: {pendingCount}</p>
      </div>

      {/* Analytics stats */}
      <div className="stats-grid no-print">
        <div className="stat-card">
          <div className="stat-icon primary"><Users size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Total Registrations</span>
            <span className="stat-val">{totalCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning"><Clock size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Pending Reviews</span>
            <span className="stat-val">{pendingCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success"><CheckCircle2 size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Refunds Completed</span>
            <span className="stat-val">{completedCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent"><IndianRupee size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Pending Claim amount</span>
            <span className="stat-val" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'normal', marginRight: '2px' }}>₹</span>
              {pendingAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Department-wise Pillbox Stats */}
      <div className="glass-card no-print" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Department Breakdown
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {uniqueDepartments.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No departments registered yet.</span>
          ) : (
            uniqueDepartments.map(dept => (
              <div 
                key={dept} 
                onClick={() => setDepartmentFilter(departmentFilter === dept ? 'All' : dept)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '100px', 
                  background: departmentFilter === dept ? 'var(--primary-glow)' : 'var(--border-color)',
                  border: `1px solid ${departmentFilter === dept ? 'var(--primary)' : 'transparent'}`,
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <span>{dept}</span>
                <span style={{ background: 'var(--bg-input)', padding: '0.1rem 0.4rem', borderRadius: '50px', fontSize: '0.75rem' }}>
                  {departmentsMap[dept]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dashboard Table Controls */}
      <div className="dashboard-controls no-print">
        <div className="search-filters-left">
          <div className="search-box" style={{ minWidth: '280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Register No, Name..."
              className="input-control"
            />
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Department Filter Reset */}
          {departmentFilter !== 'All' && (
            <button 
              onClick={() => setDepartmentFilter('All')} 
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Clear Dept: {departmentFilter}
            </button>
          )}
        </div>

        {/* Download & Print Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Print PDF
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary">
            <Download size={16} /> Export Sheet (.csv)
          </button>
        </div>
      </div>

      {/* Registrations List Table */}
      {isLoadingData ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {/* Screen Display Table (no-print) */}
          <div className="table-container no-print">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Course / Year</th>
                  <th className="no-print">Mobile</th>
                  <th className="no-print">Deposit</th>
                  <th>Status</th>
                  <th>Registered On</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', color: 'var(--text-light)', textAlign: 'center' }}>
                      <AlertTriangle size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                      No registrations found matching the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{reg.full_name}</div>
                        {reg.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }} className="no-print">{reg.email}</div>}
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{reg.register_number}</span></td>
                      <td>{reg.department}</td>
                      <td>
                        <div>{reg.course}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reg.batch_year}</div>
                      </td>
                      <td className="no-print">{reg.mobile_number}</td>
                      <td className="no-print">
                        {reg.deposit_amount ? (
                          <span style={{ fontWeight: 500 }}>₹{reg.deposit_amount}</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${reg.status === 'Completed' ? 'completed' : 'pending'}`}>
                          {reg.status}
                        </span>
                      </td>
                      <td>
                        {new Date(reg.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-row-actions no-print">
                        <button 
                          onClick={() => setSelectedStudent(reg)} 
                          className="btn-icon" 
                          title="View Full Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => toggleStudentStatus(reg.id, reg.status)} 
                          className="btn-icon" 
                          style={{ color: reg.status === 'Completed' ? 'var(--warning)' : 'var(--success)' }}
                          title={reg.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
                        >
                          <Check size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredRegistrations.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{Math.min(filteredRegistrations.length, (currentPageIndex - 1) * rowsPerPage + 1)}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{Math.min(filteredRegistrations.length, currentPageIndex * rowsPerPage)}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{filteredRegistrations.length}</span> entries
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Rows Per Page */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Show</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>entries</span>
                  </div>

                  {/* Navigation Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button 
                      onClick={() => setCurrentPageIndex(prev => Math.max(1, prev - 1))}
                      disabled={currentPageIndex === 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPageIndex) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span style={{ color: 'var(--text-light)', padding: '0 0.25rem' }}>...</span>}
                            <button
                              onClick={() => setCurrentPageIndex(p)}
                              className={currentPageIndex === p ? 'btn btn-primary' : 'btn btn-secondary'}
                              style={{ 
                                padding: '0.4rem 0.75rem', 
                                fontSize: '0.8rem', 
                                borderRadius: 'var(--radius-sm)',
                                background: currentPageIndex === p ? 'var(--primary)' : 'transparent',
                                color: currentPageIndex === p ? 'var(--text-on-primary)' : 'var(--text-main)',
                                border: currentPageIndex === p ? 'none' : '1px solid var(--border-color)',
                                minWidth: '32px'
                              }}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button 
                      onClick={() => setCurrentPageIndex(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPageIndex === totalPages}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Printable Display Table (only-print) */}
          <div className="table-container only-print">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Course / Year</th>
                  <th>Status</th>
                  <th>Registered On</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg) => (
                  <tr key={reg.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{reg.full_name}</div>
                      {reg.email && <div style={{ fontSize: '0.75rem', color: '#666' }}>{reg.email}</div>}
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{reg.register_number}</span></td>
                    <td>{reg.department}</td>
                    <td>
                      <div>{reg.course}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{reg.batch_year}</div>
                    </td>
                    <td>{reg.status}</td>
                    <td>
                      {new Date(reg.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Student Details / Signature Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedStudent(null)} title="Close Modal">
              <X size={20} />
            </button>

            <h3 className="modal-title" style={{ fontFamily: 'var(--font-heading)' }}>
              Registration Details
            </h3>

            <div className="modal-grid">
              <div className="modal-field">
                <span className="modal-label">Student Name</span>
                <span className="modal-value">{selectedStudent.full_name}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Register Number</span>
                <span className="modal-value" style={{ fontFamily: 'monospace' }}>{selectedStudent.register_number}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Department</span>
                <span className="modal-value">{selectedStudent.department}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Course</span>
                <span className="modal-value">{selectedStudent.course}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Batch / Year</span>
                <span className="modal-value">{selectedStudent.batch_year}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Mobile Number</span>
                <span className="modal-value">{selectedStudent.mobile_number}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Email Address</span>
                <span className="modal-value">{selectedStudent.email || '-'}</span>
              </div>
              <div className="modal-field">
                <span className="modal-label">Claimed Deposit Amount</span>
                <span className="modal-value">
                  {selectedStudent.deposit_amount ? `₹${selectedStudent.deposit_amount}` : '-'}
                </span>
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <span className="modal-label">Student Remarks</span>
                <span className="modal-value" style={{ fontStyle: 'italic', background: 'var(--border-color)', padding: '0.5rem', borderRadius: '4px' }}>
                  {selectedStudent.remarks || 'No remarks provided.'}
                </span>
              </div>

              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <span className="modal-label">Digital Signature</span>
                <div className="signature-img-container">
                  <img src={selectedStudent.signature_url} alt="Digital Signature" />
                </div>
                <a 
                  href={selectedStudent.signature_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', textAlign: 'right', display: 'block' }}
                >
                  Open in New Tab
                </a>
              </div>

              {/* Status Update Button inside modal */}
              <div className="modal-field" style={{ gridColumn: 'span 2', marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <span className="modal-label" style={{ marginBottom: '0.5rem' }}>Management Actions</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Status: <strong style={{ color: selectedStudent.status === 'Completed' ? 'var(--success)' : 'var(--warning)' }}>{selectedStudent.status}</strong></span>
                  <button 
                    onClick={() => toggleStudentStatus(selectedStudent.id, selectedStudent.status)}
                    className={`btn ${selectedStudent.status === 'Completed' ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Mark {selectedStudent.status === 'Completed' ? 'Pending' : 'Completed'}
                  </button>
                </div>
              </div>

              {/* Internal Notes block */}
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <span className="modal-label">Internal Office Notes</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                  <input
                    type="text"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Add notes (e.g. Consolidated on list 4, cash refund issued)..."
                    className="input-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button 
                    onClick={() => saveAdminNote(selectedStudent.id)}
                    className="btn btn-primary"
                    disabled={isSavingNote}
                    style={{ padding: '0.5rem' }}
                    title="Save Note"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setSelectedStudent(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
