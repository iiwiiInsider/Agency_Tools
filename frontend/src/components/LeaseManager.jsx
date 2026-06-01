import React, { useEffect, useRef } from 'react';

const STATUS_META = {
  pending_otp: { label: 'Pending OTP', color: '#ffd700', icon: '⏳' },
  otp_sent:    { label: 'OTP Sent',    color: '#00d4ff', icon: '📧' },
  active:      { label: 'Active',      color: '#00ff88', icon: '✅' },
  expired:     { label: 'Expired',     color: '#ff6666', icon: '⛔' },
  cancelled:   { label: 'Cancelled',   color: '#888',    icon: '🚫' },
};

export default function LeaseManager({ leases, onRefresh, onDelete, onDownloadPDF, onUploadSignedPdf, onEditLease, loading }) {
  useEffect(() => { onRefresh(); }, []);

  return (
    <section className="manager-section">
      <div className="manager-header">
        <h2 className="section-title">
          <span className="title-icon">☰</span>
          Lease Management
        </h2>
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? '…' : '⟳ Refresh'}
        </button>
      </div>

      {leases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>No leases yet. Create one with New Lease or use the voice command helper.</p>
        </div>
      ) : (
        <div className="leases-grid">
          {leases.map(lease => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              onDelete={onDelete}
              onDownloadPDF={onDownloadPDF}
              onUploadSignedPdf={onUploadSignedPdf}
              onEditLease={onEditLease}
              loading={loading}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaseCard({ lease, onDelete, onDownloadPDF, onUploadSignedPdf, onEditLease, loading }) {
  const status = STATUS_META[lease.status] || STATUS_META.active;
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF document only.');
      event.target.value = '';
      return;
    }
    onUploadSignedPdf(lease.id, file);
    event.target.value = '';
  };

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

      {/* Timestamps */}
      <div className="card-meta">
        Created: {new Date(lease.createdAt).toLocaleString()}
      </div>

      {lease.signedPdfName ? (
        <div className="card-meta" style={{ color: '#70c070' }}>
          Signed copy: {lease.signedPdfName}
        </div>
      ) : (
        <div className="card-meta" style={{ color: '#cccc77' }}>
          Signed PDF not uploaded yet
        </div>
      )}

      {/* Actions */}
      <div className="card-actions">
        <button
          className="btn-pdf"
          onClick={() => onDownloadPDF(lease.id)}
          title="Download Unsigned Lease PDF"
        >
          ⬇️ Unsigned Lease
        </button>
        <button
          className="btn-outline"
          type="button"
          onClick={() => onEditLease(lease)}
          disabled={loading}
          title="Edit this lease"
        >
          ✏️ Edit
        </button>
        <button
          className="btn-outline"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Upload signed lease PDF"
        >
          📤 Upload Signed
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
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
