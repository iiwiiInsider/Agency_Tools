require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
let PDFDocument = null;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory lease store (replace with DB in production)
let leases = [];

// ─── Helper: Generate 6-digit OTP ────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Helper: Escape untrusted text for HTML contexts ─────────────────────────
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Helper: Load PDF generator lazily for runtime compatibility and avoid startup failure
function getPDFDocument() {
  if (!PDFDocument) {
    try {
      PDFDocument = require('pdfkit');
    } catch (err) {
      throw new Error('PDF generation unavailable: ' + err.message);
    }
  }
  return PDFDocument;
}

// ─── Helper: Build PDF buffer ─────────────────────────────────────────────────
function generateLeasePDFBuffer(lease, otp) {
  return new Promise((resolve, reject) => {
    let PDFDoc;
    try {
      PDFDoc = getPDFDocument();
    } catch (err) {
      return reject(err);
    }

    const doc = new PDFDoc({ size: 'A4', margin: 0, info: {
      Title: `${lease.leaseType} – LeaseGen Pro`,
      Author: 'LeaseGen Pro',
    }});
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;  // A4 width
    const M = 50;      // body margin
    const BW = W - M * 2; // body width

    // ── Palette ─────────────────────────────────────────────────────────
    const NAVY   = '#020818';
    const BLUE   = '#0066cc';
    const LBLUE  = '#00aaff';
    const YELLOW = '#ffd700';
    const CYELLOW= '#ffe566';
    const WHITE  = '#ffffff';
    const LIGHT  = '#e8f0ff';
    const MUTED  = '#8899bb';
    const DARK   = '#061030';

    // ── Header band ──────────────────────────────────────────────────────
    doc.rect(0, 0, W, 110).fill(NAVY);
    // Blue gradient stripes (simulated)
    doc.rect(0, 0, W, 4).fill(LBLUE);
    doc.rect(0, 4, W, 2).fill(BLUE);

    // Yellow accent line
    doc.rect(0, 106, W, 4).fill(YELLOW);

    // Logo text
    doc.font('Helvetica-Bold').fontSize(26).fillColor(LBLUE)
      .text('LeaseGen', M, 28, { continued: true })
      .fillColor(YELLOW).text(' Pro', { continued: false });

    // Ref + date – right aligned
    const ref = `REF: LG-${lease.id.slice(0, 8).toUpperCase()}`;
    const dateStr = new Date(lease.createdAt).toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(ref, M, 32, { width: BW, align: 'right' })
      .text(dateStr, M, 44, { width: BW, align: 'right' });

    // Document title
    doc.font('Helvetica-Bold').fontSize(14).fillColor(WHITE)
      .text(lease.leaseType.toUpperCase(), M, 72, { width: BW, align: 'center' });

    // ── Sub-header band ───────────────────────────────────────────────────
    doc.rect(0, 110, W, 24).fill(DARK);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('LEASE AGREEMENT / MANDATE DOCUMENT', M, 119, { width: BW, align: 'center' });

    let y = 148;

    // ── Party boxes ───────────────────────────────────────────────────────
    const boxH = 72;
    const halfW = (BW - 12) / 2;

    // Party A box
    doc.rect(M, y, halfW, boxH).fill('#0a0f28').stroke('#0066cc');
    doc.rect(M, y, halfW, 18).fill(BLUE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE)
      .text('PARTY A  ·  LESSOR / OWNER', M + 8, y + 5);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(LBLUE)
      .text(lease.leaseHolder || '—', M + 8, y + 26, { width: halfW - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Lease Holder', M + 8, y + 42);

    // Party B box
    const bx = M + halfW + 12;
    doc.rect(bx, y, halfW, boxH).fill('#0a0f28').stroke('#004488');
    doc.rect(bx, y, halfW, 18).fill('#004488');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE)
      .text('PARTY B  ·  LESSEE / RECIPIENT', bx + 8, y + 5);

    doc.font('Helvetica-Bold').fontSize(11).fillColor(CYELLOW)
      .text(lease.recipientName || lease.recipientEmail, bx + 8, y + 26, { width: halfW - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Recipient', bx + 8, y + 42);
    if (lease.recipientEmail) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text(lease.recipientEmail, bx + 8, y + 54, { width: halfW - 16 });
    }

    y += boxH + 18;

    // ── OTP box (yellow highlight) ────────────────────────────────────────
    if (otp) {
      doc.rect(M, y, BW, 64).fill('#181400').stroke(YELLOW);
      doc.rect(M, y, BW, 18).fill('#3a2e00');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(YELLOW)
        .text('ONE-TIME PASSWORD (OTP)  ·  VERIFICATION REQUIRED', M + 8, y + 5, { width: BW - 16, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(28).fillColor(YELLOW)
        .text(otp.split('').join('  '), M, y + 24, { width: BW, align: 'center', characterSpacing: 4 });

      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text('This OTP authenticates the recipient\'s acceptance of this lease document — valid for 30 minutes.',
          M + 8, y + 52, { width: BW - 16, align: 'center' });

      y += 82;
    }

    // ── Section helper ────────────────────────────────────────────────────
    function sectionTitle(title, yPos) {
      doc.rect(M, yPos, BW, 18).fill(BLUE);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE)
        .text(title, M + 8, yPos + 5);
      return yPos + 18;
    }

    function row(label, value, yPos, shade) {
      const rH = 18;
      doc.rect(M, yPos, BW, rH).fill(shade ? '#0a0e20' : '#080c1a').stroke('#0a1530');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(LBLUE)
        .text(label, M + 8, yPos + 5, { width: 130 });
      doc.font('Helvetica').fontSize(8).fillColor(LIGHT)
        .text(value || '—', M + 144, yPos + 5, { width: BW - 152 });
      return yPos + rH;
    }

    // ── Primary Details ───────────────────────────────────────────────────
    y = sectionTitle('LEASE DETAILS', y);
    let shade = false;
    const primaryFields = [
      ['Lease Type',           lease.leaseType],
      ['Property / Address',   lease.propertyAddress],
      ['Rental / Value',       lease.rentAmount ? `${lease.currency} ${Number(lease.rentAmount).toLocaleString('en-ZA')}` : null],
      ['Commencement Date',    lease.startDate],
      ['Expiry / End Date',    lease.endDate],
      ['Duration / Term',      lease.duration],
    ];
    for (const [lbl, val] of primaryFields) {
      y = row(lbl, val, y, shade);
      shade = !shade;
    }

    // ── Extra dynamic fields ──────────────────────────────────────────────
    const skip = new Set(['id','leaseType','leaseHolder','recipientName','recipientEmail',
      'propertyAddress','rentAmount','currency','startDate','endDate','duration','notes',
      'paymentBankName','paymentAccountHolder','paymentAccountNumber','paymentBranchCode',
      'paymentAccountType','paymentReference','paymentDueDay',
      'status','otp','otpSentAt','otpVerified','createdAt','updatedAt','leaseTypeCustom']);

    const extras = Object.entries(lease).filter(([k, v]) => !skip.has(k) && v !== null && v !== '' && v !== false && v !== undefined);
    if (extras.length) {
      y += 6;
      y = sectionTitle('ADDITIONAL TERMS & CONDITIONS', y);
      shade = false;
      for (const [k, v] of extras) {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        const val = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
        y = row(label, val, y, shade);
        shade = !shade;
        if (y > 720) { doc.addPage(); y = 50; }
      }
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    if (lease.notes) {
      y += 6;
      y = sectionTitle('SPECIAL CONDITIONS / NOTES', y);
      doc.rect(M, y, BW, 56).fill('#080c1a').stroke('#0a1530');
      doc.font('Helvetica').fontSize(9).fillColor(LIGHT)
        .text(lease.notes, M + 8, y + 8, { width: BW - 16, height: 46 });
      y += 62;
    }

    // ── Payment Details ───────────────────────────────────────────────────
    const hasPayment = lease.paymentBankName || lease.paymentAccountHolder ||
      lease.paymentAccountNumber || lease.paymentBranchCode ||
      lease.paymentAccountType || lease.paymentReference || lease.paymentDueDay;

    if (hasPayment) {
      y += 6;
      if (y > 700) { doc.addPage(); y = 50; }

      // Section title bar in gold instead of blue
      doc.rect(M, y, BW, 18).fill('#3a2e00').stroke(YELLOW);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(YELLOW)
        .text('💳  PAYMENT DETAILS', M + 8, y + 5);
      y += 18;

      shade = false;
      const paymentFields = [
        ['Bank Name',           lease.paymentBankName],
        ['Account Holder',      lease.paymentAccountHolder],
        ['Account Number',      lease.paymentAccountNumber],
        ['Branch / Sort Code',  lease.paymentBranchCode],
        ['Account Type',        lease.paymentAccountType],
        ['Payment Reference',   lease.paymentReference],
        ['Payment Due',         lease.paymentDueDay],
      ];
      for (const [lbl, val] of paymentFields) {
        if (!val) continue;
        // Gold label instead of blue for payment rows
        const rH = 18;
        doc.rect(M, y, BW, rH).fill(shade ? '#100e00' : '#0d0b00').stroke('#1a1500');
        doc.font('Helvetica-Bold').fontSize(8).fillColor(YELLOW)
          .text(lbl, M + 8, y + 5, { width: 130 });
        doc.font('Helvetica').fontSize(8).fillColor(CYELLOW)
          .text(String(val), M + 144, y + 5, { width: BW - 152 });
        y += rH;
        shade = !shade;
        if (y > 720) { doc.addPage(); y = 50; }
      }
    }

    // ── Status badge ──────────────────────────────────────────────────────
    if (y < 720) {
      y += 10;
      const statusColors = { pending_otp: YELLOW, otp_sent: LBLUE, active: '#00ff88', expired: '#ff6666', cancelled: '#888' };
      const sc = statusColors[lease.status] || MUTED;
      doc.roundedRect(M, y, 120, 22, 4).fill(sc + '22').stroke(sc);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(sc)
        .text(`STATUS: ${(lease.status || '').replace(/_/g, ' ').toUpperCase()}`, M + 8, y + 7, { width: 104 });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footerY = 800;
    doc.rect(0, footerY, W, 42).fill(NAVY);
    doc.rect(0, footerY, W, 2).fill(YELLOW);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('This document was generated by LeaseGen Pro · Digitally issued · Not a substitute for legal advice',
        M, footerY + 10, { width: BW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#334466')
      .text(`Generated: ${new Date().toLocaleString('en-ZA')}  ·  ID: ${lease.id}`,
        M, footerY + 24, { width: BW, align: 'center' });

    // ── Right-side blue gutter bar ─────────────────────────────────────────
    doc.rect(W - 8, 110, 8, footerY - 110).fill('#00111f');
    doc.rect(W - 3, 110, 3, footerY - 110).fill(BLUE + '55');

    doc.end();
  });
}

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all leases
app.get('/api/leases', (req, res) => {
  res.json(leases);
});

// GET single lease
app.get('/api/leases/:id', (req, res) => {
  const lease = leases.find(l => l.id === req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  res.json(lease);
});

// POST create lease
app.post('/api/leases', (req, res) => {
  const {
    leaseType, leaseHolder, recipientName, recipientEmail,
    propertyAddress, rentAmount, currency, startDate,
    endDate, duration, notes,
    paymentBankName, paymentAccountHolder, paymentAccountNumber,
    paymentBranchCode, paymentAccountType, paymentReference, paymentDueDay,
    ...extraFields
  } = req.body;

  if (!leaseHolder || !recipientEmail) {
    return res.status(400).json({ error: 'leaseHolder and recipientEmail are required.' });
  }

  const lease = {
    id: uuidv4(),
    leaseType: leaseType || 'General Lease',
    leaseHolder,
    recipientName: recipientName || '',
    recipientEmail,
    propertyAddress: propertyAddress || '',
    rentAmount: rentAmount || '',
    currency: currency || 'ZAR',
    startDate: startDate || '',
    endDate: endDate || '',
    duration: duration || '',
    notes: notes || '',
    // Payment details
    paymentBankName: paymentBankName || '',
    paymentAccountHolder: paymentAccountHolder || '',
    paymentAccountNumber: paymentAccountNumber || '',
    paymentBranchCode: paymentBranchCode || '',
    paymentAccountType: paymentAccountType || '',
    paymentReference: paymentReference || '',
    paymentDueDay: paymentDueDay || '',
    ...extraFields,
    status: 'active',
    otp: null,
    otpSentAt: null,
    otpVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  leases.push(lease);
  res.status(201).json(lease);
});

// PATCH update lease
app.patch('/api/leases/:id', (req, res) => {
  const index = leases.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Lease not found' });

  leases[index] = {
    ...leases[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  res.json(leases[index]);
});

// DELETE lease
app.delete('/api/leases/:id', (req, res) => {
  const index = leases.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Lease not found' });
  leases.splice(index, 1);
  res.json({ success: true });
});

// GET download PDF for a lease
app.get('/api/leases/:id/pdf', async (req, res) => {
  const lease = leases.find(l => l.id === req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  try {
    const pdfBuffer = await generateLeasePDFBuffer(lease, lease.otp);
    const filename = `LeaseGen-${lease.leaseType.replace(/\s+/g, '-')}-${lease.id.slice(0, 8)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed', detail: err.message });
  }
});

function handleSignedPdfUpload(req, res) {
  const lease = leases.find(l => l.id === req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  const { signedPdfName, signedPdfData } = req.body;
  if (!signedPdfName || !signedPdfData) {
    return res.status(400).json({ error: 'signedPdfName and signedPdfData are required' });
  }

  try {
    const cleanBase64 = String(signedPdfData).replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    lease.signedPdfName = signedPdfName;
    lease.signedPdfData = cleanBase64;
    lease.signedPdfSize = buffer.length;
    lease.signedPdfUploadedAt = new Date().toISOString();
    lease.updatedAt = new Date().toISOString();

    const responseLease = { ...lease };
    delete responseLease.signedPdfData;
    res.json(responseLease);
  } catch (err) {
    console.error('Signed PDF upload error:', err);
    res.status(500).json({ error: 'Failed to store signed PDF', detail: err.message });
  }
}

app.post('/api/leases/:id/signed-pdf', handleSignedPdfUpload);
app.patch('/api/leases/:id/signed-pdf', handleSignedPdfUpload);

// POST send OTP for a lease
app.post('/api/leases/:id/send-otp', async (req, res) => {
  const lease = leases.find(l => l.id === req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });

  const otp = generateOTP();
  lease.otp = otp;
  lease.otpSentAt = new Date().toISOString();
  lease.otpVerified = false;
  lease.status = 'otp_sent';
  lease.updatedAt = new Date().toISOString();

  // Email content
  const recipientDisplay = escapeHtml(lease.recipientName || lease.recipientEmail);
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #0a0a1a; color: #e0e0ff; }
        .container { max-width: 600px; margin: 40px auto; background: #0d0d2b;
          border: 1px solid #00aaff; border-radius: 12px; padding: 40px;
          box-shadow: 0 0 30px rgba(0,170,255,0.4); }
        h1 { color: #00d4ff; text-shadow: 0 0 10px #00aaff; }
        .otp-box { background: #1a1a3e; border: 2px solid #ffd700;
          border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 42px; font-weight: bold; color: #ffd700;
          letter-spacing: 10px; text-shadow: 0 0 15px #ffd700; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #1a2a4a; }
        .label { color: #00aaff; font-weight: bold; }
        .payment-section { margin-top: 24px; }
        .payment-header { background: #1a1400; border: 1px solid #ffd700;
          border-radius: 8px 8px 0 0; padding: 10px 16px; }
        .payment-header h3 { margin: 0; color: #ffd700; font-size: 14px; letter-spacing: 1px; }
        .payment-body { background: #0f0f25; border: 1px solid #ffd70055;
          border-top: none; border-radius: 0 0 8px 8px; padding: 4px 0; }
        .payment-row { padding: 7px 16px; border-bottom: 1px solid #1a2a4a; display: flex; gap: 12px; }
        .payment-row:last-child { border-bottom: none; }
        .p-label { color: #ffd700; font-weight: bold; min-width: 160px; font-size: 13px; }
        .p-value { color: #ffffcc; font-size: 13px; }
        .footer { color: #5566aa; font-size: 12px; margin-top: 30px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔑 Lease OTP Verification</h1>
        <p>Dear <strong>${recipientDisplay}</strong>,</p>
        <p>You have been assigned as the recipient of the following lease/mandate. Please use the OTP below to verify your acceptance.</p>
        
        <div class="otp-box">
          <p style="color:#aabbff;margin:0 0 10px">Your One-Time Password</p>
          <div class="otp-code">${otp}</div>
          <p style="color:#aabbff;font-size:13px;margin:10px 0 0">Valid for 30 minutes</p>
        </div>

        <h3 style="color:#00d4ff">Lease Details</h3>
        <div class="detail-row"><span class="label">Type:</span> ${lease.leaseType}</div>
        <div class="detail-row"><span class="label">Lease Holder:</span> ${lease.leaseHolder}</div>
        <div class="detail-row"><span class="label">Property:</span> ${lease.propertyAddress || 'N/A'}</div>
        <div class="detail-row"><span class="label">Rent Amount:</span> ${lease.currency} ${lease.rentAmount || 'N/A'}</div>
        <div class="detail-row"><span class="label">Start Date:</span> ${lease.startDate || 'N/A'}</div>
        <div class="detail-row"><span class="label">End Date:</span> ${lease.endDate || 'N/A'}</div>
        ${lease.notes ? `<div class="detail-row"><span class="label">Notes:</span> ${lease.notes}</div>` : ''}

        ${(lease.paymentBankName || lease.paymentAccountHolder || lease.paymentAccountNumber || lease.paymentReference || lease.paymentDueDay) ? `
        <div class="payment-section">
          <div class="payment-header"><h3>💳 Payment Details</h3></div>
          <div class="payment-body">
            ${lease.paymentBankName        ? `<div class="payment-row"><span class="p-label">Bank Name:</span><span class="p-value">${lease.paymentBankName}</span></div>` : ''}
            ${lease.paymentAccountHolder   ? `<div class="payment-row"><span class="p-label">Account Holder:</span><span class="p-value">${lease.paymentAccountHolder}</span></div>` : ''}
            ${lease.paymentAccountNumber   ? `<div class="payment-row"><span class="p-label">Account Number:</span><span class="p-value">${lease.paymentAccountNumber}</span></div>` : ''}
            ${lease.paymentBranchCode      ? `<div class="payment-row"><span class="p-label">Branch / Sort Code:</span><span class="p-value">${lease.paymentBranchCode}</span></div>` : ''}
            ${lease.paymentAccountType     ? `<div class="payment-row"><span class="p-label">Account Type:</span><span class="p-value">${lease.paymentAccountType}</span></div>` : ''}
            ${lease.paymentReference       ? `<div class="payment-row"><span class="p-label">Reference:</span><span class="p-value">${lease.paymentReference}</span></div>` : ''}
            ${lease.paymentDueDay          ? `<div class="payment-row"><span class="p-label">Payment Due:</span><span class="p-value">${lease.paymentDueDay}</span></div>` : ''}
          </div>
        </div>` : ''}
        
        <div class="footer">
          This OTP was generated on ${new Date().toLocaleString()}.<br/>
          Do not share this code with anyone. If you did not expect this email, please ignore it.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const pdfBuffer = await generateLeasePDFBuffer(lease, otp);
    const pdfFilename = `LeaseGen-${lease.leaseType.replace(/\s+/g, '-')}-${lease.id.slice(0, 8)}.pdf`;

    await transporter.sendMail({
      from: `"LeaseGen Pro" <${process.env.EMAIL_USER}>`,
      to: lease.recipientEmail,
      subject: `[LeaseGen Pro] OTP for Your Lease – ${lease.leaseType}`,
      html: htmlBody,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    res.json({ success: true, message: `OTP sent to ${lease.recipientEmail}`, otp });
  } catch (err) {
    console.error('Email error:', err.message);
    // Still return OTP for demo purposes (remove in production)
    res.json({ success: true, message: 'Email service not configured – OTP generated', otp, emailError: err.message });
  }
});

// POST verify OTP
app.post('/api/leases/:id/verify-otp', (req, res) => {
  const { otp } = req.body;
  const lease = leases.find(l => l.id === req.params.id);
  if (!lease) return res.status(404).json({ error: 'Lease not found' });
  if (!lease.otp) return res.status(400).json({ error: 'No OTP generated for this lease' });

  if (lease.otp === otp) {
    lease.otpVerified = true;
    lease.status = 'active';
    lease.updatedAt = new Date().toISOString();
    res.json({ success: true, message: 'OTP verified. Lease is now active.' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 LeaseGen backend running on http://localhost:${PORT}`);
  console.log(`📋 Email: ${process.env.EMAIL_USER || 'NOT CONFIGURED (set in .env)'}\n`);
});
