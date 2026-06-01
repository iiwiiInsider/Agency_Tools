import React, { useState } from 'react';

const CURRENCIES = ['ZAR', 'USD', 'GBP', 'EUR', 'AED'];

// ─── Per-type configuration ────────────────────────────────────────────────
// partyA / partyB  → party labels
// valueLabel       → monetary field label
// sections[]       → grouped field definitions
// field types: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'toggle'

const LEASE_CONFIGS = {
  'Residential Monthly': {
    partyA: { badge: 'Landlord', label: 'Landlord / Lessor', placeholder: 'Full name or company' },
    partyB: { badge: 'Tenant',   label: 'Tenant / Lessee',   placeholder: 'Full name' },
    valueLabel: 'Monthly Rent', valuePlaceholder: '0.00',
    sections: [
      { title: '🏠 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Full street address', full: true },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',       label: 'Deposit (Months)',    type: 'number', placeholder: 'e.g. 2' },
        { key: 'noticePeriod',  label: 'Notice Period',       type: 'text',   placeholder: 'e.g. 1 calendar month' },
      ]},
      { title: '📅 Dates', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
      ]},
      { title: '⚙️ Inclusions', fields: [
        { key: 'furnished',         label: 'Furnished',          type: 'toggle' },
        { key: 'petsAllowed',       label: 'Pets Allowed',       type: 'toggle' },
        { key: 'parkingIncluded',   label: 'Parking Included',   type: 'toggle' },
        { key: 'utilitiesIncluded', label: 'Utilities Included', type: 'toggle' },
      ]},
    ],
  },

  'Residential Fixed-Term': {
    partyA: { badge: 'Landlord', label: 'Landlord / Lessor', placeholder: 'Full name or company' },
    partyB: { badge: 'Tenant',   label: 'Tenant / Lessee',   placeholder: 'Full name' },
    valueLabel: 'Monthly Rent', valuePlaceholder: '0.00',
    sections: [
      { title: '🏠 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Full street address', full: true },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',     label: 'Deposit (Months)',       type: 'number', placeholder: 'e.g. 2' },
        { key: 'escalation',  label: 'Annual Escalation (%)',  type: 'number', placeholder: 'e.g. 8' },
      ]},
      { title: '📅 Dates & Term', fields: [
        { key: 'startDate', label: 'Start Date',  type: 'date' },
        { key: 'endDate',   label: 'End Date',    type: 'date' },
        { key: 'duration',  label: 'Duration',    type: 'text', placeholder: 'e.g. 12 months' },
      ]},
      { title: '⚙️ Inclusions', fields: [
        { key: 'furnished',       label: 'Furnished',        type: 'toggle' },
        { key: 'petsAllowed',     label: 'Pets Allowed',     type: 'toggle' },
        { key: 'parkingIncluded', label: 'Parking Included', type: 'toggle' },
      ]},
    ],
  },

  'Commercial Lease': {
    partyA: { badge: 'Lessor',  label: 'Property Owner / Lessor', placeholder: 'Company or full name' },
    partyB: { badge: 'Lessee',  label: 'Business / Lessee',       placeholder: 'Registered company name' },
    valueLabel: 'Monthly Rental (excl. VAT)', valuePlaceholder: '0.00',
    sections: [
      { title: '🏢 Premises', fields: [
        { key: 'propertyAddress', label: 'Premises Address',  type: 'text',   placeholder: 'Unit/building address', full: true },
        { key: 'floorArea',       label: 'Floor Area (m²)',   type: 'number', placeholder: 'e.g. 250' },
        { key: 'zoning',          label: 'Zoning / Use',      type: 'text',   placeholder: 'e.g. Commercial B1' },
      ]},
      { title: '🏦 Business Details', fields: [
        { key: 'businessType',   label: 'Business Type',      type: 'text', placeholder: 'e.g. Retail, Office, Warehouse' },
        { key: 'vatNumber',      label: 'VAT Number',         type: 'text', placeholder: 'Lessee VAT number' },
        { key: 'registrationNo', label: 'Company Reg. No.',   type: 'text', placeholder: 'e.g. 2020/123456/07' },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',     label: 'Deposit (Months)',      type: 'number', placeholder: 'e.g. 3' },
        { key: 'escalation',  label: 'Annual Escalation (%)', type: 'number', placeholder: 'e.g. 8' },
        { key: 'camCharges',  label: 'CAM / Levy Charges',    type: 'number', placeholder: 'Monthly levy' },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
        { key: 'endDate',   label: 'Expiry Date',       type: 'date' },
        { key: 'duration',  label: 'Lease Term',        type: 'text', placeholder: 'e.g. 3 years' },
      ]},
      { title: '⚙️ Extras', fields: [
        { key: 'parkingBays',      label: 'Parking Bays',          type: 'number', placeholder: 'No. of bays' },
        { key: 'fitoutAllowance',  label: 'Fit-Out Allowance (ZAR)', type: 'number', placeholder: 'Amount' },
      ]},
    ],
  },

  'Industrial Lease': {
    partyA: { badge: 'Lessor',  label: 'Property Owner / Lessor',     placeholder: 'Company or full name' },
    partyB: { badge: 'Lessee',  label: 'Industrial Tenant / Lessee',  placeholder: 'Company name' },
    valueLabel: 'Monthly Rental (excl. VAT)', valuePlaceholder: '0.00',
    sections: [
      { title: '🏭 Premises', fields: [
        { key: 'propertyAddress', label: 'Industrial Premises Address', type: 'text',   placeholder: 'ERF/stand/unit address', full: true },
        { key: 'floorArea',       label: 'Total Floor Area (m²)',       type: 'number', placeholder: 'e.g. 1500' },
        { key: 'yardArea',        label: 'Yard / Hardstand Area (m²)',  type: 'number', placeholder: 'e.g. 800' },
      ]},
      { title: '⚡ Technical Specs', fields: [
        { key: 'powerSupply',  label: 'Power Supply',        type: 'text',   placeholder: 'e.g. 3-phase 200A' },
        { key: 'loadingDocks', label: 'Loading Docks',       type: 'number', placeholder: 'No. of docks' },
        { key: 'roofHeight',   label: 'Eaves Height (m)',    type: 'number', placeholder: 'e.g. 8' },
        { key: 'cranage',      label: 'Cranage Available',   type: 'toggle' },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',    label: 'Deposit (Months)',      type: 'number', placeholder: 'e.g. 3' },
        { key: 'escalation', label: 'Annual Escalation (%)', type: 'number', placeholder: 'e.g. 8' },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
        { key: 'endDate',   label: 'Expiry Date',       type: 'date' },
        { key: 'duration',  label: 'Lease Term',        type: 'text', placeholder: 'e.g. 3 years' },
      ]},
    ],
  },

  'Retail Lease': {
    partyA: { badge: 'Lessor',  label: 'Shopping Centre / Lessor', placeholder: 'Company or full name' },
    partyB: { badge: 'Lessee',  label: 'Retailer / Lessee',        placeholder: 'Trading name or company' },
    valueLabel: 'Base Rental (excl. VAT)', valuePlaceholder: '0.00',
    sections: [
      { title: '🛍️ Premises', fields: [
        { key: 'propertyAddress', label: 'Shop / Unit Address',  type: 'text',   placeholder: 'Unit no. + centre name + address', full: true },
        { key: 'floorArea',       label: 'Shop Floor Area (m²)', type: 'number', placeholder: 'e.g. 120' },
        { key: 'tradingName',     label: 'Trading / Store Name', type: 'text',   placeholder: 'e.g. The Coffee Corner' },
      ]},
      { title: '⏰ Operations', fields: [
        { key: 'tradingHours', label: 'Trading Hours',   type: 'text', placeholder: 'e.g. Mon–Sat 09:00–18:00' },
        { key: 'permittedUse', label: 'Permitted Use',   type: 'text', placeholder: 'e.g. Coffee shop / Food & Beverage' },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'turnoverRent',    label: 'Turnover Rent (%)',         type: 'number', placeholder: 'e.g. 6' },
        { key: 'marketingLevy',   label: 'Marketing Levy (p/m)',      type: 'number', placeholder: 'Monthly levy (ZAR)' },
        { key: 'deposit',         label: 'Deposit (Months)',          type: 'number', placeholder: 'e.g. 3' },
        { key: 'fitoutAllowance', label: 'Fit-Out Contribution (ZAR)',type: 'number', placeholder: 'Amount' },
        { key: 'escalation',      label: 'Annual Escalation (%)',     type: 'number', placeholder: 'e.g. 8' },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
        { key: 'endDate',   label: 'Expiry Date',       type: 'date' },
        { key: 'duration',  label: 'Lease Term',        type: 'text', placeholder: 'e.g. 3 years' },
      ]},
    ],
  },

  'Office Lease': {
    partyA: { badge: 'Lessor',  label: 'Building Owner / Lessor', placeholder: 'Company or full name' },
    partyB: { badge: 'Lessee',  label: 'Occupant / Lessee',       placeholder: 'Company name' },
    valueLabel: 'Monthly Rental (excl. VAT)', valuePlaceholder: '0.00',
    sections: [
      { title: '🏛️ Premises', fields: [
        { key: 'propertyAddress', label: 'Office Suite Address', type: 'text',   placeholder: 'Suite/floor + building + address', full: true },
        { key: 'floorArea',       label: 'Office Area (m²)',     type: 'number', placeholder: 'e.g. 400' },
        { key: 'floor',           label: 'Floor Level',          type: 'text',   placeholder: 'e.g. 3rd Floor' },
      ]},
      { title: '⚙️ Inclusions', fields: [
        { key: 'parkingBays',      label: 'Parking Bays',              type: 'number', placeholder: 'No. of bays' },
        { key: 'internetProvided', label: 'Internet Provided',         type: 'toggle' },
        { key: 'generatorBackup',  label: 'Generator / UPS Backup',    type: 'toggle' },
        { key: 'securityAccess',   label: 'Access Control / Security', type: 'toggle' },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',    label: 'Deposit (Months)',      type: 'number', placeholder: 'e.g. 2' },
        { key: 'camCharges', label: 'CAM / Operating Costs', type: 'number', placeholder: 'Monthly ops levy' },
        { key: 'escalation', label: 'Annual Escalation (%)', type: 'number', placeholder: 'e.g. 8' },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
        { key: 'endDate',   label: 'Expiry Date',       type: 'date' },
        { key: 'duration',  label: 'Lease Term',        type: 'text', placeholder: 'e.g. 2 years' },
      ]},
    ],
  },

  'Month-to-Month': {
    partyA: { badge: 'Landlord', label: 'Landlord / Lessor', placeholder: 'Full name or company' },
    partyB: { badge: 'Tenant',   label: 'Tenant / Lessee',   placeholder: 'Full name' },
    valueLabel: 'Monthly Rent', valuePlaceholder: '0.00',
    sections: [
      { title: '🏠 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Full street address', full: true },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',      label: 'Deposit (Months)',         type: 'number', placeholder: 'e.g. 1' },
        { key: 'noticePeriod', label: 'Notice Period Required',   type: 'text',   placeholder: 'e.g. 1 calendar month' },
      ]},
      { title: '📅 Start', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
      ]},
      { title: '⚙️ Inclusions', fields: [
        { key: 'furnished',         label: 'Furnished',          type: 'toggle' },
        { key: 'petsAllowed',       label: 'Pets Allowed',       type: 'toggle' },
        { key: 'utilitiesIncluded', label: 'Utilities Included', type: 'toggle' },
      ]},
    ],
  },

  'Short-Term Rental': {
    partyA: { badge: 'Host',  label: 'Host / Property Owner', placeholder: 'Full name' },
    partyB: { badge: 'Guest', label: 'Guest / Occupant',      placeholder: 'Full name' },
    valueLabel: 'Nightly Rate', valuePlaceholder: '0.00',
    sections: [
      { title: '🏡 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text',   placeholder: 'Full address', full: true },
        { key: 'maxOccupants',    label: 'Max Occupants',    type: 'number', placeholder: 'e.g. 6' },
        { key: 'bedrooms',        label: 'Bedrooms',         type: 'number', placeholder: 'e.g. 3' },
      ]},
      { title: '💰 Pricing', fields: [
        { key: 'cleaningFee',     label: 'Cleaning Fee',      type: 'number', placeholder: 'Once-off amount' },
        { key: 'securityDeposit', label: 'Security Deposit',  type: 'number', placeholder: 'Refundable amount' },
      ]},
      { title: '📅 Stay Dates', fields: [
        { key: 'startDate',    label: 'Check-In Date',  type: 'date' },
        { key: 'endDate',      label: 'Check-Out Date', type: 'date' },
        { key: 'checkInTime',  label: 'Check-In Time',  type: 'text', placeholder: 'e.g. 14:00' },
        { key: 'checkOutTime', label: 'Check-Out Time', type: 'text', placeholder: 'e.g. 10:00' },
      ]},
      { title: '⚙️ House Rules', fields: [
        { key: 'petsAllowed',     label: 'Pets Allowed',      type: 'toggle' },
        { key: 'smokingAllowed',  label: 'Smoking Allowed',   type: 'toggle' },
        { key: 'parkingIncluded', label: 'Parking Included',  type: 'toggle' },
      ]},
    ],
  },

  'Sale Mandate': {
    partyA: { badge: 'Seller', label: 'Property Owner / Seller', placeholder: 'Full name or company' },
    partyB: { badge: 'Agent',  label: 'Mandated Agent / Agency', placeholder: 'Agent / agency name' },
    valueLabel: 'Asking / Listing Price', valuePlaceholder: '0.00',
    sections: [
      { title: '🏠 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address / ERF', type: 'text',   placeholder: 'Full address + ERF number', full: true },
        { key: 'propertyType',    label: 'Property Type',          type: 'text',   placeholder: 'e.g. Freehold, Sectional Title, Farm' },
        { key: 'erfSize',         label: 'ERF / Stand Size (m²)',  type: 'number', placeholder: 'e.g. 800' },
      ]},
      { title: '📋 Mandate', fields: [
        { key: 'mandateType', label: 'Mandate Type', type: 'select',
          options: ['Sole Mandate', 'Open Mandate', 'Joint Mandate'] },
        { key: 'agentName',   label: 'Agent Full Name',        type: 'text', placeholder: 'Registered agent name' },
        { key: 'agencyName',  label: 'Agency / Brokerage',     type: 'text', placeholder: 'Company name' },
        { key: 'ffc',         label: 'Agent FFC Number',       type: 'text', placeholder: 'FFC number' },
      ]},
      { title: '💰 Commission', fields: [
        { key: 'commission',      label: 'Commission (%)',    type: 'number', placeholder: 'e.g. 7.5' },
        { key: 'vatOnCommission', label: 'VAT on Commission', type: 'toggle' },
      ]},
      { title: '📅 Mandate Period', fields: [
        { key: 'startDate', label: 'Mandate Start Date',   type: 'date' },
        { key: 'endDate',   label: 'Mandate Expiry Date',  type: 'date' },
        { key: 'duration',  label: 'Mandate Period',       type: 'text', placeholder: 'e.g. 90 days' },
      ]},
    ],
  },

  'Rental Mandate': {
    partyA: { badge: 'Owner', label: 'Property Owner',          placeholder: 'Full name or company' },
    partyB: { badge: 'Agent', label: 'Mandated Agent / Agency', placeholder: 'Agent / agency name' },
    valueLabel: 'Desired Monthly Rental', valuePlaceholder: '0.00',
    sections: [
      { title: '🏠 Property', fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Full address', full: true },
        { key: 'propertyType',    label: 'Property Type',    type: 'text', placeholder: 'e.g. Apartment, House, Commercial' },
      ]},
      { title: '📋 Mandate', fields: [
        { key: 'mandateType', label: 'Mandate Type', type: 'select',
          options: ['Sole Mandate', 'Open Mandate', 'Joint Mandate'] },
        { key: 'agentName',  label: 'Agent Full Name',    type: 'text', placeholder: 'Registered agent name' },
        { key: 'agencyName', label: 'Agency / Brokerage', type: 'text', placeholder: 'Company name' },
      ]},
      { title: '💰 Agent Fees', fields: [
        { key: 'lettingFee',    label: 'Letting Fee (% of 1st month)',  type: 'number', placeholder: 'e.g. 100' },
        { key: 'managementFee', label: 'Management Fee (% p/m)',        type: 'number', placeholder: 'e.g. 10' },
        { key: 'vatOnFees',     label: 'VAT on Fees',                   type: 'toggle' },
      ]},
      { title: '📅 Mandate Period', fields: [
        { key: 'startDate', label: 'Mandate Start Date',  type: 'date' },
        { key: 'endDate',   label: 'Mandate Expiry Date', type: 'date' },
        { key: 'duration',  label: 'Mandate Period',      type: 'text', placeholder: 'e.g. 90 days' },
      ]},
    ],
  },

  'Agricultural Lease': {
    partyA: { badge: 'Lessor', label: 'Farm Owner / Lessor', placeholder: 'Full name or company' },
    partyB: { badge: 'Lessee', label: 'Farmer / Lessee',    placeholder: 'Full name or company' },
    valueLabel: 'Annual / Monthly Rental', valuePlaceholder: '0.00',
    sections: [
      { title: '🌾 Farm Details', fields: [
        { key: 'propertyAddress', label: 'Farm / ERF Address',       type: 'text',   placeholder: 'Farm name + district + province', full: true },
        { key: 'landSize',        label: 'Land Size (hectares)',      type: 'number', placeholder: 'e.g. 250' },
        { key: 'cropType',        label: 'Crop / Livestock Type',    type: 'text',   placeholder: 'e.g. Maize, Cattle, Mixed farming' },
      ]},
      { title: '💧 Resources', fields: [
        { key: 'waterRights',        label: 'Water Rights Included',          type: 'toggle' },
        { key: 'irrigationSystem',   label: 'Irrigation System',              type: 'toggle' },
        { key: 'farmEquipment',      label: 'Equipment / Implements Included',type: 'toggle' },
        { key: 'farmWorkerQuarters', label: 'Worker Quarters Included',       type: 'toggle' },
      ]},
      { title: '💰 Financials', fields: [
        { key: 'deposit',    label: 'Deposit',                  type: 'number', placeholder: 'Amount in currency' },
        { key: 'escalation', label: 'Annual Escalation (%)',    type: 'number', placeholder: 'e.g. 6' },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Commencement Date', type: 'date' },
        { key: 'endDate',   label: 'Expiry Date',       type: 'date' },
        { key: 'duration',  label: 'Lease Term',        type: 'text', placeholder: 'e.g. 5 years' },
      ]},
    ],
  },

  'Other': {
    partyA: { badge: 'Lessor', label: 'Lease Holder / Party A', placeholder: 'Full name or company' },
    partyB: { badge: 'Lessee', label: 'Recipient / Party B',    placeholder: 'Full name or company' },
    valueLabel: 'Rent / Value Amount', valuePlaceholder: '0.00',
    sections: [
      { title: '📍 Property / Subject', fields: [
        { key: 'propertyAddress', label: 'Address / Description',      type: 'text', placeholder: 'Property or subject matter', full: true },
        { key: 'leaseTypeCustom', label: 'Describe the Agreement',     type: 'text', placeholder: 'Nature of this lease/mandate', full: true },
      ]},
      { title: '📅 Term', fields: [
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate',   label: 'End Date',   type: 'date' },
        { key: 'duration',  label: 'Duration',   type: 'text', placeholder: 'e.g. 12 months' },
      ]},
    ],
  },
};

// ─── Toggle component ─────────────────────────────────────────────────────────
function ToggleField({ label, fieldKey, value, onChange }) {
  const on = value === true || value === 'true' || value === 'yes';
  return (
    <div className="toggle-field">
      <span className="toggle-label">{label}</span>
      <button
        type="button"
        className={`toggle-btn ${on ? 'toggle-on' : 'toggle-off'}`}
        onClick={() => onChange(fieldKey, !on)}
      >
        <span className="toggle-knob" />
        <span className="toggle-text">{on ? 'Yes' : 'No'}</span>
      </button>
    </div>
  );
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────
function DynamicField({ field, value, onChange }) {
  const cls = `field-group ${field.full ? 'full-width' : ''}`;
  if (field.type === 'toggle') {
    return (
      <div className={cls}>
        <ToggleField label={field.label} fieldKey={field.key} value={value} onChange={onChange} />
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <div className={cls}>
        <label className="field-label">{field.label}</label>
        <select className="field-input" value={value || ''} onChange={e => onChange(field.key, e.target.value)}>
          <option value="">— Select —</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <div className={cls}>
        <label className="field-label">{field.label}</label>
        <textarea className="field-input" rows={3} placeholder={field.placeholder || ''} value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
      </div>
    );
  }
  return (
    <div className={cls}>
      <label className="field-label">{field.label}</label>
      <input className="field-input" type={field.type || 'text'} placeholder={field.placeholder || ''} value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LeaseForm({ form, onChange, onSave, loading, listings = [], onLinkListing }) {
  const [selectedListingId, setSelectedListingId] = useState('');
  const f = form;
  const cfg = LEASE_CONFIGS[f.leaseType] || null;
  const selectedListing = listings.find(listing => listing.id === selectedListingId) || null;

  return (
    <section className="form-section">
      <div className="form-header">
        <h2 className="section-title">
          <span className="title-icon">📋</span>
          {f.leaseType ? f.leaseType : 'New Listing / Mandate'}
        </h2>
        <p className="section-sub">
          {f.leaseType
            ? 'Fields auto-matched to selected type · Use voice or type below'
            : 'Select a listing type to reveal the matching fields'}
        </p>
      </div>

      <div className="form-grid">

        {/* ── Lease Type selector (always visible) ───────────────────────── */}
        <div className="field-group full-width">
          <label className="field-label">Listing / Mandate Type</label>
          <select
            className="field-input"
            value={f.leaseType}
            onChange={e => onChange('leaseType', e.target.value)}
          >
            <option value="">— Select Type —</option>
            {Object.keys(LEASE_CONFIGS).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {listings.length > 0 && onLinkListing && (
          <div className="field-group full-width lease-link-panel">
            <label className="field-label">Link listing details</label>
            <div className="linking-row">
              <select
                className="field-input"
                value={selectedListingId}
                onChange={e => setSelectedListingId(e.target.value)}
              >
                <option value="">— Select listing to link —</option>
                {listings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.propertyTitle || 'Untitled listing'}{listing.city ? ` — ${listing.city}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline"
                disabled={!selectedListingId}
                onClick={() => selectedListing && onLinkListing(selectedListing)}
              >
                Link listing
              </button>
            </div>
            <p className="field-hint">Prefill lease address, lessor, currency and pricing from an existing listing.</p>
          </div>
        )}

        {/* ── Quick-pick chips when no type chosen ───────────────────────── */}
        {!cfg && (
          <div className="type-prompt full-width">
            <p className="type-prompt-hint">Or pick quickly:</p>
            <div className="type-prompt-grid">
              {Object.keys(LEASE_CONFIGS).filter(t => t !== 'Other').map(t => (
                <button
                  key={t}
                  className="type-chip"
                  type="button"
                  onClick={() => onChange('leaseType', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Parties (shown once type is selected) ─────────────────────── */}
        {cfg && (
          <div className="field-group">
            <label className="field-label">
              <span className="field-badge lessor">{cfg.partyA.badge}</span>
              {cfg.partyA.label}
            </label>
            <input
              className="field-input"
              placeholder={cfg.partyA.placeholder}
              value={f.leaseHolder || ''}
              onChange={e => onChange('leaseHolder', e.target.value)}
            />
          </div>
        )}

        {cfg && (
          <div className="field-group">
            <label className="field-label">
              <span className="field-badge lessee">{cfg.partyB.badge}</span>
              {cfg.partyB.label}
            </label>
            <input
              className="field-input"
              placeholder={cfg.partyB.placeholder}
              value={f.recipientName || ''}
              onChange={e => onChange('recipientName', e.target.value)}
            />
          </div>
        )}

        {/* ── Recipient email (required for lease contact) ──────────────── */}
        {cfg && (
          <div className="field-group full-width">
            <label className="field-label">
              <span className="field-badge otp">Contact</span>
              Recipient Email
              <span className="field-hint">— Lease notifications and documents will be sent here</span>
            </label>
            <input
              className="field-input"
              type="email"
              placeholder="recipient@email.com"
              value={f.recipientEmail || ''}
              onChange={e => onChange('recipientEmail', e.target.value)}
            />
          </div>
        )}

        {/* ── Monetary value (always needed) ─────────────────────────────── */}
        {cfg && (
          <div className="field-group full-width">
            <label className="field-label">{cfg.valueLabel}</label>
            <div className="input-group">
              <select
                className="field-input currency-sel"
                value={f.currency || 'ZAR'}
                onChange={e => onChange('currency', e.target.value)}
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="field-input flex-1"
                type="number"
                placeholder={cfg.valuePlaceholder}
                value={f.rentAmount || ''}
                onChange={e => onChange('rentAmount', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Dynamic sections per lease type ───────────────────────────── */}
        {cfg && cfg.sections.map(section => (
          <div key={section.title} className="section-block full-width">
            <div className="section-divider">
              <span className="section-divider-label">{section.title}</span>
            </div>
            <div className="section-grid">
              {section.fields.map(field => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={f[field.key]}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {cfg && (
          <>
            <div className="section-divider full-width">
              <span className="section-divider-label">📝 Special Conditions / Notes</span>
            </div>
            <div className="field-group full-width">
              <textarea
                className="field-input"
                rows={3}
                placeholder="Any additional terms, conditions or information…"
                value={f.notes || ''}
                onChange={e => onChange('notes', e.target.value)}
              />
            </div>
          </>
        )}

        {/* ── Payment Details ────────────────────────────────────────────── */}
        {cfg && (
          <>
            <div className="section-divider full-width">
              <span className="section-divider-label">💳 Payment Details</span>
              <span className="section-badge payment-badge">PAYMENT</span>
            </div>

            {/* Bank Name */}
            <div className="field-group">
              <label className="field-label">Bank Name</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. First National Bank"
                value={f.paymentBankName || ''}
                onChange={e => onChange('paymentBankName', e.target.value)}
              />
            </div>

            {/* Account Holder */}
            <div className="field-group">
              <label className="field-label">Account Holder Name</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. John A. Smith"
                value={f.paymentAccountHolder || ''}
                onChange={e => onChange('paymentAccountHolder', e.target.value)}
              />
            </div>

            {/* Account Number */}
            <div className="field-group">
              <label className="field-label">Account Number</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. 62012345678"
                value={f.paymentAccountNumber || ''}
                onChange={e => onChange('paymentAccountNumber', e.target.value)}
              />
            </div>

            {/* Branch / Sort Code */}
            <div className="field-group">
              <label className="field-label">Branch / Sort Code</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. 250655"
                value={f.paymentBranchCode || ''}
                onChange={e => onChange('paymentBranchCode', e.target.value)}
              />
            </div>

            {/* Account Type */}
            <div className="field-group">
              <label className="field-label">Account Type</label>
              <select
                className="field-input"
                value={f.paymentAccountType || ''}
                onChange={e => onChange('paymentAccountType', e.target.value)}
              >
                <option value="">— Select account type —</option>
                <option value="Cheque">Cheque</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
                <option value="Business">Business</option>
                <option value="Transmission">Transmission</option>
              </select>
            </div>

            {/* Payment Reference */}
            <div className="field-group">
              <label className="field-label">Payment Reference</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. RENT-APT4B-MAY25"
                value={f.paymentReference || ''}
                onChange={e => onChange('paymentReference', e.target.value)}
              />
            </div>

            {/* Due Day */}
            <div className="field-group">
              <label className="field-label">Payment Due Day</label>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. 1st of each month"
                value={f.paymentDueDay || ''}
                onChange={e => onChange('paymentDueDay', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      {cfg && (
        <div className="form-actions">
          <div className="form-required-hint">
            <span className="req-icon">⚡</span>
            <em>{cfg.partyA.badge}</em> and <em>Recipient Email</em> are required to save this lease
          </div>
          <button
            className="btn-primary"
            onClick={onSave}
            disabled={loading || !f.leaseHolder || !f.recipientEmail}
          >
            {loading
              ? <><span className="spinner" /> Saving…</>
              : <>⚖️ Save Lease</>
            }
          </button>
        </div>
      )}
    </section>
  );
}
