import React, { useState, useCallback, useEffect } from 'react';
import VoiceCommand from './components/VoiceCommand.jsx';
import LeaseForm from './components/LeaseForm.jsx';
import LeaseManager from './components/LeaseManager.jsx';
import OTPModal from './components/OTPModal.jsx';
import axios from 'axios';

const API = '/api/leases';

const defaultForm = {
  leaseType: '',
  leaseHolder: '',
  recipientName: '',
  recipientEmail: '',
  propertyAddress: '',
  rentAmount: '',
  currency: 'ZAR',
  startDate: '',
  endDate: '',
  duration: '',
  notes: '',
  // Payment details
  paymentBankName: '',
  paymentAccountHolder: '',
  paymentAccountNumber: '',
  paymentBranchCode: '',
  paymentAccountType: '',
  paymentReference: '',
  paymentDueDay: '',
};

const DRAFT_KEY = 'leaseFormDraft';

export default function App() {
  const [view, setView] = useState('create'); // 'create' | 'manage'
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm;
    } catch {
      return defaultForm;
    }
  });
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [otpModal, setOtpModal] = useState(null); // { leaseId, recipientEmail, otp }
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // ── Persist form draft to localStorage ──────────────────────────────────
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Field update from form or voice ───────────────────────────────────────
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Voice command processor ────────────────────────────────────────────────
  const handleVoiceCommand = useCallback((transcript) => {
    setVoiceTranscript(transcript);
    const t = transcript.toLowerCase().trim();

    // Navigation
    if (/(show|view|open|manage|all) (leases|contracts|mandates)/i.test(t)) {
      setView('manage');
      loadLeases();
      showToast('📋 Opening Lease Manager', 'info');
      return;
    }
    if (/(new|create|start|add) (lease|mandate|contract)/i.test(t)) {
      setView('create');
      setForm(defaultForm);
      showToast('✨ New lease started', 'info');
      return;
    }
    if (/clear|reset|start over/i.test(t)) {
      setForm(defaultForm);
      localStorage.removeItem(DRAFT_KEY);
      showToast('🔄 Form cleared', 'info');
      return;
    }
    if (/save|submit|create lease/i.test(t)) {
      handleSaveLease();
      return;
    }

    // Field extraction
    const extracted = extractFields(t, transcript);
    if (Object.keys(extracted).length > 0) {
      setForm(prev => ({ ...prev, ...extracted }));
      const names = Object.keys(extracted).join(', ');
      showToast(`🎙️ Set: ${names}`, 'success');
    } else {
      showToast(`🎙️ Heard: "${transcript.slice(0, 60)}..." — try a command like "lease holder John Doe"`, 'warn');
    }
  }, [form]);

  // ── Field extractor ────────────────────────────────────────────────────────
  function extractFields(t, raw) {
    const result = {};

    const patterns = [
      // Lease type
      { regex: /(?:lease type|type of lease|mandate type|it(?:'s| is) (?:a )?)([\w\s]+?)(?:\s+lease|\s+mandate|\s+contract)?(?:,|$|\s+lease holder|\s+for|\s+property)/i, field: 'leaseType', group: 1 },
      // Lease holder
      { regex: /(?:lease holder|lessor|landlord|holder|owner)(?:\s+is|\s*:)?\s+([A-Z][a-zA-Z\s'-]+?)(?:\s+recipient|\s+property|\s+rent|\s+start|\s+end|\s+email|,|$)/i, field: 'leaseHolder', group: 1, raw: true },
      // Recipient name
      { regex: /(?:recipient(?:\s+name)?|lessee|tenant|client)(?:\s+is|\s+name|\s*:)?\s+([A-Z][a-zA-Z\s'-]+?)(?:\s+(?:email|property|rent|start|end)|,|$)/i, field: 'recipientName', group: 1, raw: true },
      // Recipient email
      { regex: /(?:recipient email|email|send to|email to)\s+([\w._%+\-]+@[\w.\-]+\.[a-z]{2,})/i, field: 'recipientEmail', group: 1 },
      // Property address
      { regex: /(?:property(?:\s+address)?|address|located at|property is at)(?:\s+is|\s*:)?\s+(.+?)(?:\s+rent|\s+amount|\s+start|\s+end|\s+notes|,|$)/i, field: 'propertyAddress', group: 1, raw: true },
      // Rent amount — extract numbers
      { regex: /(?:rent(?:\s+(?:is|amount))?|monthly rent|amount)(?:\s+is|\s*:)?\s*(?:r|zar|usd|gbp|eur)?\s*([0-9][0-9,\s]*(?:\.[0-9]{1,2})?)/i, field: 'rentAmount', group: 1 },
      // Currency
      { regex: /(?:currency|in)\s+(zar|usd|gbp|eur|rand|dollars|pounds|euros)/i, field: 'currency', group: 1 },
      // Duration
      { regex: /(?:duration|term|period)(?:\s+is|\s*:)?\s+(\d+)\s*(?:months?|years?)/i, field: 'duration', group: 1 },
      // Notes
      { regex: /(?:notes?|additional(?:\s+info)?|add note)(?:\s+is|\s*:)?\s+(.+?)(?:,|$)/i, field: 'notes', group: 1, raw: true },
    ];

    // Dates
    const startMatch = raw.match(/(?:start(?:ing)?(?:\s+date)?|commences?(?:\s+on)?|from)(?:\s+is|\s*:)?\s+([A-Za-z0-9 ,]+?)(?:\s+(?:end|until|to)|,|$)/i);
    if (startMatch) result.startDate = normalizeDate(startMatch[1].trim());

    const endMatch = raw.match(/(?:end(?:ing)?(?:\s+date)?|expires?(?:\s+on)?|until|to)(?:\s+is|\s*:)?\s+([A-Za-z0-9 ,]+?)(?:,|$)/i);
    if (endMatch) result.endDate = normalizeDate(endMatch[1].trim());

    // Lease type shortcut (e.g. "residential monthly" / "commercial annual")
    const typeShortcuts = /(residential|commercial|industrial|retail|office|month[\-\s]?to[\-\s]?month|short[\-\s]?term|long[\-\s]?term|annual|monthly|fixed[\-\s]?term|mandate|sale mandate|rental mandate)/i;
    if (!result.leaseType && typeShortcuts.test(t)) {
      const m = t.match(typeShortcuts);
      if (m) result.leaseType = capitalize(m[1]);
    }

    for (const { regex, field, group, raw: useRaw } of patterns) {
      const src = useRaw ? raw : t;
      const m = src.match(regex);
      if (m && m[group]) {
        let val = m[group].trim();
        if (field === 'currency') val = normalizeCurrency(val);
        if (field === 'rentAmount') val = val.replace(/[,\s]/g, '');
        result[field] = val;
      }
    }

    return result;
  }

  function normalizeDate(str) {
    try {
      const d = new Date(str);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    } catch (_) {}
    return str;
  }

  function normalizeCurrency(val) {
    const map = { rand: 'ZAR', dollars: 'USD', pounds: 'GBP', euros: 'EUR' };
    return map[val.toLowerCase()] || val.toUpperCase();
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // ── Save lease ─────────────────────────────────────────────────────────────
  const handleSaveLease = async () => {
    if (!form.leaseHolder || !form.recipientEmail) {
      showToast('❌ Lease holder and recipient email are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(API, form);
      showToast('✅ Lease created successfully!', 'success');
      setForm(defaultForm);
      localStorage.removeItem(DRAFT_KEY);
      setView('manage');
      loadLeases();
    } catch (e) {
      showToast('❌ Failed to create lease: ' + (e.response?.data?.error || e.message), 'error');
    }
    setLoading(false);
  };

  // ── Load leases ────────────────────────────────────────────────────────────
  const loadLeases = async () => {
    try {
      const { data } = await axios.get(API);
      setLeases(data);
    } catch (e) {
      showToast('❌ Failed to load leases', 'error');
    }
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOTP = async (leaseId, recipientEmail) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/${leaseId}/send-otp`);
      setOtpModal({ leaseId, recipientEmail, otp: data.otp });
      showToast(`📧 OTP sent to ${recipientEmail}`, 'success');
      loadLeases();
    } catch (e) {
      showToast('❌ Failed to send OTP: ' + (e.response?.data?.error || e.message), 'error');
    }
    setLoading(false);
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOTP = async (leaseId, otp) => {
    setLoading(true);
    try {
      await axios.post(`${API}/${leaseId}/verify-otp`, { otp });
      showToast('✅ OTP verified! Lease is now ACTIVE', 'success');
      setOtpModal(null);
      loadLeases();
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.message || 'OTP verification failed'), 'error');
    }
    setLoading(false);
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPDF = (leaseId) => {
    window.open(`/api/leases/${leaseId}/pdf`, '_blank');
  };

  // ── Delete lease ───────────────────────────────────────────────────────────
  const handleDelete = async (leaseId) => {
    if (!confirm('Delete this lease?')) return;
    try {
      await axios.delete(`${API}/${leaseId}`);
      showToast('🗑️ Lease deleted', 'info');
      loadLeases();
    } catch (e) {
      showToast('❌ Delete failed', 'error');
    }
  };

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">⚖️</span>
          <span className="logo-text">LeaseGen <span className="logo-accent">Pro</span></span>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${view === 'create' ? 'active' : ''}`}
            onClick={() => setView('create')}
          >
            <span>✦</span> New Lease
          </button>
          <button
            className={`nav-btn ${view === 'manage' ? 'active' : ''}`}
            onClick={() => { setView('manage'); loadLeases(); }}
          >
            <span>☰</span> Manage Leases
          </button>
        </nav>
      </header>

      {/* ── Voice transcript banner ───────────────────────────────────── */}
      {voiceTranscript && (
        <div className="transcript-banner">
          <span className="transcript-icon">🎙️</span>
          <span className="transcript-text">{voiceTranscript}</span>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="app-main">
        <VoiceCommand
          onCommand={handleVoiceCommand}
          onTranscriptChange={setVoiceTranscript}
        />

        {view === 'create' ? (
          <LeaseForm
            form={form}
            onChange={updateField}
            onSave={handleSaveLease}
            loading={loading}
          />
        ) : (
          <LeaseManager
            leases={leases}
            onRefresh={loadLeases}
            onSendOTP={handleSendOTP}
            onDelete={handleDelete}
            onDownloadPDF={handleDownloadPDF}
            loading={loading}
          />
        )}
      </main>

      {/* ── OTP Modal ──────────────────────────────────────────────────── */}
      {otpModal && (
        <OTPModal
          leaseId={otpModal.leaseId}
          recipientEmail={otpModal.recipientEmail}
          generatedOtp={otpModal.otp}
          onVerify={handleVerifyOTP}
          onDownloadPDF={handleDownloadPDF}
          onClose={() => setOtpModal(null)}
          loading={loading}
        />
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <p>LeaseGen Pro © {new Date().getFullYear()} · Voice-Powered Lease Management</p>
      </footer>
    </div>
  );
}
