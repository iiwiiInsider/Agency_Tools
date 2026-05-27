import React, { useState, useRef, useEffect } from 'react';

export default function OTPModal({ leaseId, recipientEmail, generatedOtp, onVerify, onDownloadPDF, onClose, loading }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
      e.preventDefault();
    }
  };

  const handleSubmit = () => {
    const otp = digits.join('');
    if (otp.length < 6) return;
    onVerify(leaseId, otp);
  };

  const otp = digits.join('');
  const complete = otp.length === 6;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-icon">🔐</div>
        <h2 className="modal-title">OTP Verification</h2>
        <p className="modal-sub">
          An OTP has been dispatched to<br />
          <strong className="modal-email">{recipientEmail}</strong>
        </p>

        {/* Show generated OTP (for demo / dev) */}
        <div className="otp-preview">
          <span className="otp-preview-label">Generated OTP (demo):</span>
          <span className="otp-preview-code">{generatedOtp}</span>
        </div>

        <p className="modal-instruction">Enter the 6-digit code:</p>

        {/* Digit inputs */}
        <div className="otp-digits" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              className={`otp-digit ${d ? 'filled' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button
          className="btn-verify"
          onClick={handleSubmit}
          disabled={!complete || loading}
        >
          {loading ? <><span className="spinner" /> Verifying…</> : '✅ Verify OTP & Activate Lease'}
        </button>

        <button
          className="btn-download-pdf"
          onClick={() => onDownloadPDF(leaseId)}
          type="button"
        >
          ⬇️ Download Lease PDF
        </button>

        <p className="modal-hint">
          Paste the full code or type digit by digit.
          <br />The OTP and a copy of the <strong>Lease PDF</strong> have been sent to the recipient's email.
        </p>
      </div>
    </div>
  );
}
