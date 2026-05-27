import React, { useEffect } from 'react';

const STATUS_META = {
  pending_otp: { label: 'Pending OTP', color: '#ffd700', icon: '⏳' },
  otp_sent:    { label: 'OTP Sent',    color: '#00d4ff', icon: '📧' },
  active:      { label: 'Active',      color: '#00ff88', icon: '✅' },
  expired:     { label: 'Expired',     color: '#ff6666', icon: '⛔' },
  cancelled:   { label: 'Cancelled',   color: '#888',    icon: '🚫' },
};

export default function LeaseManager({ leases, onRefresh, onSendOTP, onDelete, onDownloadPDF, loading }) {
  useEffect(() => { onRefresh(); }, []);

  return (
    <section className="manager-section">
      <div className="manager-header">
        <h2 className="section-title">
          <span className="title-icon">☰</span>
          Lease Manager
        </h2>
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? '…' : '⟳ Refresh'}
        </button>
      </div>

      {leases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>No leases yet. Create one with a voice command or via the New Lease tab.</p>
        </div>
      ) : (
        <div className="leases-grid">
          {leases.map(lease => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              onSendOTP={onSendOTP}
              onDelete={onDelete}
              onDownloadPDF={onDownloadPDF}
              loading={loading}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaseCard({ lease, onSendOTP, onDelete, onDownloadPDF, loading }) {
  const status = STATUS_META[lease.status] || STATUS_META.pending_otp;

  return (
    <div className="lease-card">
      {/* Status badge */}
      <div className="card-status" style={{ color: status.color, borderColor: status.color + '55' }}>
        <span>{status.icon}</span>
        <span>{status.label}</span>
      </div>

      {/* Type + ID */}
      <div className="card-type">{lease.leaseType || 'General Lease'}</div>
      <div className="card-id">ID: {lease.id.slice(0, 8)}…</div>

      {/* Core details */}
      <div className="card-details">
        <Row icon="👤" label="Lessor"    value={lease.leaseHolder} />
        <Row icon="🏠" label="Lessee"    value={lease.recipientName || '—'} />
        <Row icon="📧" label="Email"     value={lease.recipientEmail} />
        <Row icon="📍" label="Property"  value={lease.propertyAddress || '—'} />
        <Row icon="💰" label="Rent"      value={lease.rentAmount ? `${lease.currency} ${Number(lease.rentAmount).toLocaleString()}` : '—'} />
        <Row icon="📅" label="Start"     value={lease.startDate || '—'} />
        <Row icon="📅" label="End"       value={lease.endDate || '—'} />
        {lease.notes && <Row icon="📝" label="Notes" value={lease.notes} />}
      </div>

      {/* OTP info */}
      {lease.otp && (
        <div className="card-otp-info">
          <span className="otp-label">OTP</span>
          <span className="otp-value">{lease.otp}</span>
          <span className={`otp-status ${lease.otpVerified ? 'verified' : 'unverified'}`}>
            {lease.otpVerified ? '✅ Verified' : '⏳ Awaiting'}
          </span>
        </div>
      )}

      {/* Timestamps */}
      <div className="card-meta">
        Created: {new Date(lease.createdAt).toLocaleString()}
      </div>

      {/* Actions */}
      <div className="card-actions">
        {lease.status === 'pending_otp' && (
          <button
            className="btn-otp"
            onClick={() => onSendOTP(lease.id, lease.recipientEmail)}
            disabled={loading}
          >
            📧 Send OTP
          </button>
        )}
        {lease.status === 'otp_sent' && !lease.otpVerified && (
          <button
            className="btn-otp btn-resend"
            onClick={() => onSendOTP(lease.id, lease.recipientEmail)}
            disabled={loading}
          >
            🔄 Resend OTP
          </button>
        )}
        <button
          className="btn-pdf"
          onClick={() => onDownloadPDF(lease.id)}
          title="Download Lease PDF"
        >
          ⬇️ PDF
        </button>
        <button
          className="btn-delete"
          onClick={() => onDelete(lease.id)}
          disabled={loading}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  if (!value || value === '—') return null;
  return (
    <div className="detail-row">
      <span className="detail-icon">{icon}</span>
      <span className="detail-label">{label}:</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}
