import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import SignaturePad from './SignaturePad';
import { 
  User, Hash, GraduationCap, BookOpen, 
  Phone, Mail, FileText, CheckCircle2, 
  AlertTriangle, ArrowLeft, Printer, RefreshCw, IndianRupee 
} from 'lucide-react';

export default function RegistrationForm({ onBack, addToast }) {
  // Form fields state
  const [formData, setFormData] = useState({
    fullName: '',
    registerNumber: '',
    department: '',
    course: '',
    batchYear: '',
    mobileNumber: '',
    email: '',
    depositAmount: '',
    remarks: ''
  });

  const [signatureData, setSignatureData] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Signature handlers
  const handleSignatureSave = (base64) => {
    setSignatureData(base64);
    if (errors.signature) {
      setErrors(prev => ({ ...prev, signature: '' }));
    }
  };

  const handleSignatureClear = () => {
    setSignatureData(null);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    
    if (!formData.registerNumber.trim()) {
      newErrors.registerNumber = 'Register Number is required';
    } else if (formData.registerNumber.trim().length < 5) {
      newErrors.registerNumber = 'Register Number must be at least 5 characters';
    }

    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.course.trim()) newErrors.course = 'Course is required';
    if (!formData.batchYear.trim()) newErrors.batchYear = 'Batch / Year is required';

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      newErrors.mobileNumber = 'Enter a valid 10-digit mobile number starting with 6-9';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (formData.depositAmount && isNaN(formData.depositAmount)) {
      newErrors.depositAmount = 'Deposit amount must be a number';
    }

    if (!signatureData) {
      newErrors.signature = 'A digital signature is required';
    }

    if (!confirmed) {
      newErrors.confirmed = 'You must confirm that the details are correct';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Utility to convert Base64 Data URL to Blob
  const base64ToBlob = (base64Data, contentType) => {
    const parts = base64Data.split(';base64,');
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('Please fix validation errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check for Duplicate Register Number using the secure RPC
      const { data: existing, error: checkError } = await supabase
        .rpc('verify_student_status', { reg_num: formData.registerNumber.trim().toUpperCase() });

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        setErrors(prev => ({ ...prev, registerNumber: 'This Register Number has already been submitted' }));
        addToast('This Register Number has already been submitted.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Upload Signature to Supabase Storage
      const signatureBlob = base64ToBlob(signatureData, 'image/png');
      const fileExt = 'png';
      const fileName = `${formData.registerNumber.trim().toUpperCase()}_${Date.now()}.${fileExt}`;
      const filePath = `signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, signatureBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get signature public url
      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      const signatureUrl = publicUrlData.publicUrl;

      // 3. Save Student Record in Table
      const recordId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const record = {
        id: recordId,
        full_name: formData.fullName.trim(),
        register_number: formData.registerNumber.trim().toUpperCase(),
        department: formData.department.trim(),
        course: formData.course.trim(),
        batch_year: formData.batchYear.trim(),
        mobile_number: formData.mobileNumber.trim(),
        email: formData.email.trim() || null,
        deposit_amount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
        remarks: formData.remarks.trim() || null,
        signature_url: signatureUrl,
        status: 'Pending',
        created_at: createdAt
      };

      const { error: insertError } = await supabase
        .from('refund_registrations')
        .insert([record]);

      if (insertError) throw insertError;

      addToast('Registration submitted successfully!', 'success');
      setSubmittedData(record);

    } catch (err) {
      console.error('Error submitting form:', err);
      addToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Success view (Receipt screen)
  if (submittedData) {
    return (
      <div className="glass-card success-box" style={{ maxWidth: '680px', margin: '2rem auto' }}>
        <div className="success-icon">
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
          Registration Submitted!
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Your deposit refund request has been recorded and is pending verification.
        </p>

        {/* Printable Receipt Card */}
        <div className="receipt-details" id="printable-receipt">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
              BHARATHIAR UNIVERSITY
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chellammal Hostel Deposit Refund Registration Slip
            </p>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Reference ID</span>
            <span className="receipt-value" style={{ fontFamily: 'monospace' }}>{submittedData.id.slice(0, 8).toUpperCase()}...</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Student Name</span>
            <span className="receipt-value">{submittedData.full_name}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Register Number</span>
            <span className="receipt-value">{submittedData.register_number}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Department</span>
            <span className="receipt-value">{submittedData.department}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Course & Batch</span>
            <span className="receipt-value">{submittedData.course} ({submittedData.batch_year})</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Mobile Number</span>
            <span className="receipt-value">{submittedData.mobile_number}</span>
          </div>
          {submittedData.deposit_amount && (
            <div className="receipt-row">
              <span className="receipt-label">Claimed Refund Amount</span>
              <span className="receipt-value" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <IndianRupee size={14} /> {submittedData.deposit_amount}
              </span>
            </div>
          )}
          <div className="receipt-row">
            <span className="receipt-label">Submission Date</span>
            <span className="receipt-value">{new Date(submittedData.created_at).toLocaleDateString()}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Current Status</span>
            <span className="receipt-value" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
              {submittedData.status}
            </span>
          </div>

          {/* Student Signature Render */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', marginRight: '2rem' }}>
              Digital Signature
            </span>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.25rem', height: '60px', width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={submittedData.signature_url} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }} className="no-print">
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={18} /> Print Receipt
          </button>
          <button onClick={onBack} className="btn btn-secondary">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-secondary btn-icon" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="form-title">
        <FileText size={24} style={{ color: 'var(--primary)' }} />
        Deposit Refund Registration
      </h2>
      <p className="form-subtitle">
        Please fill in the fields exactly as per university records. Your signature is required for consolidation.
      </p>

      <div style={{ background: 'var(--primary-glow)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'left' }} className="no-print">
        <strong>Disclaimer:</strong> This portal is created by students, not by Bharathiar University (BU). It is for registration and consolidation purposes only.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Full Name */}
          <div className="form-group">
            <label className="label-required"><User size={16} /> Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Anand Kumar S"
              className={`input-control ${errors.fullName ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Enter your name in block letters as it appears in University records.
            </span>
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          {/* Register Number */}
          <div className="form-group">
            <label className="label-required"><Hash size={16} /> Register Number</label>
            <input
              type="text"
              name="registerNumber"
              value={formData.registerNumber}
              onChange={handleChange}
              placeholder="e.g. 21CSE25"
              className={`input-control ${errors.registerNumber ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Enter your unique University Registration Number.
            </span>
            {errors.registerNumber && <span className="error-message">{errors.registerNumber}</span>}
          </div>

          {/* Department */}
          <div className="form-group">
            <label className="label-required"><GraduationCap size={16} /> Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Computer Science"
              className={`input-control ${errors.department ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              The university department you belonged to (e.g. Physics, Commerce).
            </span>
            {errors.department && <span className="error-message">{errors.department}</span>}
          </div>

          {/* Course */}
          <div className="form-group">
            <label className="label-required"><BookOpen size={16} /> Course</label>
            <input
              type="text"
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="e.g. MCA / M.Sc. Physics"
              className={`input-control ${errors.course ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Specific degree name (e.g. M.Sc. Biotechnology, MBA).
            </span>
            {errors.course && <span className="error-message">{errors.course}</span>}
          </div>

          {/* Batch / Year */}
          <div className="form-group">
            <label className="label-required"><GraduationCap size={16} /> Batch / Year</label>
            <input
              type="text"
              name="batchYear"
              value={formData.batchYear}
              onChange={handleChange}
              placeholder="e.g. 2023 - 2025"
              className={`input-control ${errors.batchYear ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Academic years of study (e.g. 2021-2023).
            </span>
            {errors.batchYear && <span className="error-message">{errors.batchYear}</span>}
          </div>

          {/* Mobile Number */}
          <div className="form-group">
            <label className="label-required"><Phone size={16} /> Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className={`input-control ${errors.mobileNumber ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Active mobile number (WhatsApp linked preferred).
            </span>
            {errors.mobileNumber && <span className="error-message">{errors.mobileNumber}</span>}
          </div>

          {/* Email (Optional) */}
          <div className="form-group">
            <label><Mail size={16} /> Email Address (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@example.com"
              className={`input-control ${errors.email ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              For receiving email receipts and status updates.
            </span>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* Deposit Amount (Optional) */}
          <div className="form-group">
            <label><IndianRupee size={16} /> Deposit Amount (Optional)</label>
            <input
              type="text"
              name="depositAmount"
              value={formData.depositAmount}
              onChange={handleChange}
              placeholder="e.g. 1500"
              className={`input-control ${errors.depositAmount ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Enter your caution deposit amount (if known).
            </span>
            {errors.depositAmount && <span className="error-message">{errors.depositAmount}</span>}
          </div>

          {/* Remarks (Optional) */}
          <div className="form-group full-width">
            <label><FileText size={16} /> Remarks / Deposit Details (Optional)</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Write caution deposit details (e.g. Library Deposit, Lab Fee Deposit, Hostel Caution Money)..."
              rows={2}
              className="input-control"
              disabled={isSubmitting}
              style={{ resize: 'vertical' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>
              Provide any context about which caution deposit you are requesting (e.g. Library, Lab, Hostel).
            </span>
          </div>

          {/* Digital Signature Component */}
          <SignaturePad 
            onSave={handleSignatureSave} 
            onClear={handleSignatureClear}
            initialValue={signatureData}
          />
          {errors.signature && <span className="error-message" style={{ gridColumn: 'span 2' }}>{errors.signature}</span>}

          {/* Confirmation Checkbox */}
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                if (errors.confirmed) setErrors(prev => ({ ...prev, confirmed: '' }));
              }}
              disabled={isSubmitting}
            />
            <span className="checkbox-custom"></span>
            <span>I confirm that the above information is correct and matches my official University records.</span>
          </label>
          {errors.confirmed && <span className="error-message" style={{ gridColumn: 'span 2', marginTop: '-1.5rem' }}>{errors.confirmed}</span>}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="spinner" style={{ animation: 'spin 1s linear infinite', border: 'none' }} /> Submitting...
              </>
            ) : 'Submit Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}
