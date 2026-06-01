import React, { useState, useCallback, useEffect } from 'react';
import LeaseForm from './components/LeaseForm.jsx';
import LeaseManager from './components/LeaseManager.jsx';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const API = `${API_BASE}/api/leases`;

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
  paymentBankName: '',
  paymentAccountHolder: '',
  paymentAccountNumber: '',
  paymentBranchCode: '',
  paymentAccountType: '',
  paymentReference: '',
  paymentDueDay: '',
};

const DRAFT_KEY = 'leaseFormDraft';
const LISTING_DRAFT_KEY = 'listingFormDraft';
const LISTINGS_KEY = 'propertyListings';
const AVAILABLE_LISTING_PLATFORMS = [
  'Private Property',
  'Property24',
];
const CUSTOMER_KEY = 'customerRecords';
const CUSTOMER_FORM_KEY = 'customerFormDraft';

const defaultListingForm = {
  propertyTitle: '',
  address: '',
  city: '',
  region: '',
  zipCode: '',
  country: 'South Africa',
  listingType: 'Sale',
  propertyType: 'Apartment',
  bedrooms: '',
  bathrooms: '',
  area: '',
  currency: 'ZAR',
  price: '',
  availableFrom: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerCompany: '',
  description: '',
  features: '',
  listingStatus: 'Draft',
  photos: [],
};

const defaultCustomerForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  role: 'Client',
  notes: '',
};

export default function App() {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('leaseAuth')) || false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('leaseUser')) || { username: '' });
  const [page, setPage] = useState(() => (JSON.parse(localStorage.getItem('leaseAuth')) ? 'dashboard' : 'login'));
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('leaseSettings')) || {
    autoSaveDrafts: true,
    emailAlerts: true,
    themeAccent: 'blue',
  });
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm;
    } catch {
      return defaultForm;
    }
  });
  const [listingForm, setListingForm] = useState(() => {
    try {
      const saved = localStorage.getItem(LISTING_DRAFT_KEY);
      return saved ? { ...defaultListingForm, ...JSON.parse(saved) } : defaultListingForm;
    } catch {
      return defaultListingForm;
    }
  });
  const [listings, setListings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [customerForm, setCustomerForm] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_FORM_KEY);
      return saved ? { ...defaultCustomerForm, ...JSON.parse(saved) } : defaultCustomerForm;
    } catch {
      return defaultCustomerForm;
    }
  });
  const [customers, setCustomers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [leases, setLeases] = useState([]);
  const [editingLeaseId, setEditingLeaseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [loginStart, setLoginStart] = useState(() => {
    const stored = localStorage.getItem('leaseLoginStart');
    return stored ? Number(stored) : null;
  });
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loginPrompt, setLoginPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem('leaseAuth', JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    localStorage.setItem('leaseUser', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (loginStart) {
      localStorage.setItem('leaseLoginStart', String(loginStart));
    } else {
      localStorage.removeItem('leaseLoginStart');
    }
  }, [loginStart]);

  useEffect(() => {
    localStorage.setItem('leaseSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify(listingForm));
  }, [listingForm]);

  useEffect(() => {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_FORM_KEY, JSON.stringify(customerForm));
  }, [customerForm]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  }, [customers]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const findCustomerByEmail = (email) => {
    if (!email) return null;
    return customers.find(c => c.email?.toLowerCase() === email.toLowerCase());
  };

  const findCustomerByName = (name) => {
    if (!name) return null;
    return customers.find(c => c.name?.toLowerCase() === name.toLowerCase());
  };

  const upsertCustomer = (customerData) => {
    setCustomers(prev => {
      const existing = customerData.email
        ? prev.find(c => c.email?.toLowerCase() === customerData.email.toLowerCase())
        : prev.find(c => c.name && customerData.name && c.name.toLowerCase() === customerData.name.toLowerCase());
      if (existing) {
        return prev.map(c => c.id === existing.id ? {
          ...existing,
          ...customerData,
          name: customerData.name || existing.name,
          email: customerData.email || existing.email,
          phone: customerData.phone || existing.phone,
          company: customerData.company || existing.company,
          role: customerData.role || existing.role,
          notes: customerData.notes || existing.notes,
          updatedAt: new Date().toISOString(),
        } : c);
      }
      return [{
        ...customerData,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ...prev];
    });
  };

  const determineBestListingPlatform = (listingData) => {
    const title = listingData.propertyTitle?.toLowerCase() || '';
    const type = listingData.propertyType?.toLowerCase() || '';
    const listingType = listingData.listingType?.toLowerCase() || '';
    const address = `${listingData.address || ''} ${listingData.city || ''} ${listingData.region || ''}`.toLowerCase();
    const price = Number(listingData.price) || 0;

    if (listingType.includes('rent') || type.includes('apartment') || address.includes('city')) {
      return 'Apartments.com';
    }
    if (address.includes('downtown') || title.includes('luxury') || price >= 750000) {
      return 'Redfin';
    }
    if (listingType.includes('sale') && price >= 1000000) {
      return 'Zillow';
    }
    if (type.includes('studio') || type.includes('villa')) {
      return 'Realtor';
    }
    return 'Trulia';
  };

  const buildListingLink = (listing, platform) => {
    const safeTitle = listing.propertyTitle
      ? listing.propertyTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : 'property';
    const platformSlug = platform.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `https://preview.${platformSlug}.test/listings/${listing.id}/${encodeURIComponent(safeTitle)}`;
  };

  const syncCustomerFromLease = (leaseData) => {
    if (!leaseData) return;
    if (leaseData.recipientEmail || leaseData.recipientName) {
      upsertCustomer({
        name: leaseData.recipientName || leaseData.recipientEmail,
        email: leaseData.recipientEmail,
        role: 'Lessee',
        notes: `Auto saved from lease ${leaseData.leaseType || ''}`,
      });
    }
    if (leaseData.leaseHolder) {
      upsertCustomer({
        name: leaseData.leaseHolder,
        role: 'Lessor',
        notes: `Auto saved from lease ${leaseData.leaseType || ''}`,
      });
    }
  };

  const syncCustomerFromListing = (listingData) => {
    if (!listingData) return;
    if (listingData.ownerEmail || listingData.ownerName) {
      upsertCustomer({
        name: listingData.ownerName || listingData.ownerEmail,
        email: listingData.ownerEmail,
        phone: listingData.ownerPhone,
        company: listingData.ownerCompany,
        role: 'Owner',
        notes: 'Auto saved from listing',
      });
    }
  };

  const navigateTo = (target) => {
    if (!auth && target !== 'login') {
      setPage('login');
      setLoginPrompt(true);
      return;
    }
    setLoginPrompt(false);
    setPage(target);
  };

  const handleLoginInput = (field, value) => {
    setLoginState(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const username = loginState.username.trim();
    if (!username || !loginState.password) {
      showToast('⚠️ Username and password are required', 'warn');
      return;
    }
    const now = Date.now();
    setAuth(true);
    setUser({ username });
    setLoginStart(now);
    setPage('dashboard');
    setLoginPrompt(false);
    setLoginState({ username: '', password: '' });
    showToast(`Welcome back, ${username}!`, 'success');
  };

  const handleLogout = () => {
    setAuth(false);
    setPage('login');
    setUser({ username: '' });
    setLoginStart(null);
    setLoginPrompt(false);
    showToast('🔒 You have been logged out', 'info');
  };

  const updateField = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'recipientEmail') {
        const customer = findCustomerByEmail(value);
        if (customer && !next.recipientName) next.recipientName = customer.name;
      }
      if (field === 'recipientName') {
        const customer = findCustomerByName(value);
        if (customer && !next.recipientEmail) next.recipientEmail = customer.email;
      }
      return next;
    });
  }, [customers]);

  const updateListingField = useCallback((field, value) => {
    setListingForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'ownerEmail') {
        const customer = findCustomerByEmail(value);
        if (customer) {
          next.ownerName = customer.name || next.ownerName;
          next.ownerPhone = customer.phone || next.ownerPhone;
          next.ownerCompany = customer.company || next.ownerCompany;
        }
      }
      if (field === 'ownerName') {
        const customer = findCustomerByName(value);
        if (customer) {
          next.ownerEmail = customer.email || next.ownerEmail;
          next.ownerPhone = customer.phone || next.ownerPhone;
          next.ownerCompany = customer.company || next.ownerCompany;
        }
      }
      return next;
    });
  }, [customers]);

  const updateCustomerField = useCallback((field, value) => {
    setCustomerForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleListingPhotos = async (files) => {
    const allowedFiles = Array.from(files).filter(file => {
      const maxSize = 3 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(`⚠️ ${file.name} exceeds the 3MB limit and was skipped`, 'warn');
        return false;
      }
      return true;
    });

    const photoPromises = allowedFiles.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: String(Date.now()) + Math.random(), name: file.name, src: reader.result });
      reader.readAsDataURL(file);
    }));
    const photoItems = await Promise.all(photoPromises);
    setListingForm(prev => ({ ...prev, photos: [...prev.photos, ...photoItems] }));
  };

  useEffect(() => {
    if (!auth) {
      setElapsedTime('00:00:00');
      return;
    }

    if (!loginStart) {
      setLoginStart(Date.now());
      return;
    }

    const updateElapsed = () => {
      const diff = Date.now() - loginStart;
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsedTime([
        String(hours).padStart(2, '0'),
        String(mins).padStart(2, '0'),
        String(secs).padStart(2, '0'),
      ].join(':'));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [auth, loginStart]);

  const handleSaveLease = async () => {
    if (!form.leaseType) {
      showToast('❌ Please select a lease type before saving', 'error');
      return;
    }
    if (!form.leaseHolder || !form.recipientEmail) {
      showToast('❌ Lease holder and recipient email are required', 'error');
      return;
    }
    setLoading(true);
    try {
      let data;
      if (editingLeaseId) {
        const response = await axios.patch(`${API}/${editingLeaseId}`, form);
        data = response.data;
        setLeases(prev => prev.map(l => l.id === editingLeaseId ? data : l));
        showToast('✅ Lease updated successfully!', 'success');
      } else {
        const response = await axios.post(API, form);
        data = response.data;
        setLeases(prev => [data, ...prev]);
        showToast('✅ Lease created successfully!', 'success');
      }
      syncCustomerFromLease(form);
      setForm(defaultForm);
      setEditingLeaseId(null);
      localStorage.removeItem(DRAFT_KEY);
      setPage('leaseManager');
    } catch (e) {
      showToast('❌ Failed to save lease: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveListing = () => {
    if (!listingForm.propertyTitle || !listingForm.address || !listingForm.price) {
      showToast('❌ Title, address, and price are required for a listing', 'error');
      return;
    }

    const platform = determineBestListingPlatform(listingForm);
    const newListing = {
      ...listingForm,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      bestPlatform: platform,
      selectedPlatforms: [],
      listingStatus: 'Ready to publish',
      listingUrls: {},
      publishedPlatforms: [],
      publishedAt: null,
    };

    syncCustomerFromListing(listingForm);
    setListings(prev => [newListing, ...prev]);
    setListingForm(defaultListingForm);
    localStorage.removeItem(LISTING_DRAFT_KEY);
    setPage('listingManager');
    showToast(`🔎 Auto-scanned best platform: ${platform}`, 'success');
  };

  const handleLinkListingToLease = (listing) => {
    if (!listing) return;
    const addressParts = [listing.address, listing.city, listing.region, listing.zipCode, listing.country].filter(Boolean);
    setForm(prev => ({
      ...prev,
      leaseHolder: listing.ownerName || prev.leaseHolder,
      propertyAddress: addressParts.join(', ') || prev.propertyAddress,
      rentAmount: listing.price || prev.rentAmount,
      currency: listing.currency || prev.currency,
      notes: `Linked from listing: ${listing.propertyTitle}`,
      paymentReference: listing.propertyTitle ? `LISTING-${listing.id}` : prev.paymentReference,
      availableFrom: listing.availableFrom || prev.availableFrom,
    }));
    showToast('🔗 Listing details linked into the lease form', 'success');
  };

  const handleEditLease = (lease) => {
    setForm({
      ...defaultForm,
      ...lease,
    });
    setEditingLeaseId(lease.id);
    setPage('newLease');
    showToast('✏️ Lease loaded for editing', 'info');
  };

  const handleToggleListingPlatform = (listingId, platform) => {
    setListings(prev => prev.map(listing => {
      if (listing.id !== listingId) return listing;
      const selected = Array.isArray(listing.selectedPlatforms) ? [...listing.selectedPlatforms] : [];
      const index = selected.indexOf(platform);
      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        selected.push(platform);
      }
      return {
        ...listing,
        selectedPlatforms: selected,
      };
    }));
  };

  const handlePublishListing = (listingId) => {
    let publishedPlatforms = [];
    let error = null;
    setListings(prev => prev.map(listing => {
      if (listing.id !== listingId) return listing;
      const selected = Array.isArray(listing.selectedPlatforms) ? listing.selectedPlatforms : [];
      if (selected.length === 0) {
        error = 'Please select one or more platforms before publishing.';
        return listing;
      }
      const platforms = Array.from(new Set(selected));
      const listingUrls = platforms.reduce((urls, platform) => {
        urls[platform] = buildListingLink(listing, platform);
        return urls;
      }, {});
      publishedPlatforms = platforms;
      return {
        ...listing,
        listingStatus: 'Published',
        publishedAt: new Date().toISOString(),
        publishedPlatforms: platforms,
        listingUrls,
      };
    }));
    if (error) {
      showToast(`⚠️ ${error}`, 'warn');
      return;
    }
    if (publishedPlatforms.length > 0) {
      showToast(`✅ Published to ${publishedPlatforms.join(', ')} (simulated). Links generated.`, 'success');
    }
  };

  const refreshListings = () => {
    setListings(prev => [...prev]);
    showToast('🔄 Listing Manager refreshed', 'success');
  };

  const handleDeleteListing = (listingId) => {
    if (!confirm('Delete this listing? This will remove it from all published platforms.')) return;
    setListings(prev => prev.filter(listing => listing.id !== listingId));
    showToast('🗑️ Listing deleted from manager and all published platforms', 'info');
  };

  const handleSaveCustomer = () => {
    if (!customerForm.name || !customerForm.email) {
      showToast('❌ Customer name and email are required', 'error');
      return;
    }
    upsertCustomer(customerForm);
    setCustomerForm(defaultCustomerForm);
    localStorage.removeItem(CUSTOMER_FORM_KEY);
    setPage('customerManager');
    showToast('✅ Customer saved to directory', 'success');
  };

  const handleEditCustomer = (customer) => {
    setCustomerForm(customer);
    setPage('newCustomer');
    showToast('✍️ Loaded customer into the editor', 'info');
  };

  const refreshCustomers = () => {
    setCustomers(prev => [...prev]);
    showToast('🔄 Customer directory refreshed', 'success');
  };

  const handleDeleteCustomer = (customerId) => {
    if (!confirm('Delete this customer record?')) return;
    setCustomers(prev => prev.filter(customer => customer.id !== customerId));
    showToast('🗑️ Customer removed', 'info');
  };

  const loadLeases = async (showError = true) => {
    try {
      const { data } = await axios.get(API);
      setLeases(data);
    } catch (e) {
      if (showError) {
        showToast('❌ Failed to load leases', 'error');
      }
    }
  };


  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleUploadSignedPdf = async (leaseId, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('❌ Only PDF files are supported for signed leases.', 'error');
      return;
    }
    setLoading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const { data } = await axios.patch(`${API}/${leaseId}/signed-pdf`, {
        signedPdfName: file.name,
        signedPdfData: base64,
      });
      setLeases(prev => prev.map(l => l.id === leaseId ? data : l));
      showToast(`✅ Signed lease uploaded: ${file.name}`, 'success');
    } catch (e) {
      showToast('❌ Signed lease upload failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (leaseId) => {
    window.open(`${API}/${leaseId}/pdf`, '_blank');
  };

  const handleDelete = async (leaseId) => {
    if (!confirm('Delete this lease?')) return;
    try {
      await axios.delete(`${API}/${leaseId}`);
      showToast('🗑️ Lease deleted', 'info');
      loadLeases(true);
    } catch (e) {
      showToast('❌ Delete failed', 'error');
    }
  };

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="header-logo" onClick={() => navigateTo('dashboard')}>
          <span className="logo-text">CarbonBlack <span className="logo-accent">Properties</span></span>
        </button>

        <div className="header-actions">
          {auth ? (
            <>
              <button className={`nav-btn ${page === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
                <span>🛠️</span> Settings
              </button>
              <div className="user-chip">
                <div className="user-chip-meta">
                  <span>👤 {user.username}</span>
                  <span className="session-timer">Session: {elapsedTime}</span>
                </div>
                <button onClick={handleLogout}>Logout</button>
              </div>
            </>
          ) : (
            <button className="nav-btn login-link" onClick={() => navigateTo('login')}>
              <span>🔒</span> Login
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <main className="app-main">
        {page === 'login' ? (
          <LoginPage
            loginState={loginState}
            onInput={handleLoginInput}
            onSubmit={handleLogin}
          />
        ) : page === 'dashboard' ? (
          <DashboardPage
            username={user.username}
            onNavigate={navigateTo}
          />
        ) : page === 'newListing' ? (
          <NewListingPage form={listingForm} onChange={updateListingField} onSave={handleSaveListing} onPhotosChange={handleListingPhotos} />
        ) : page === 'listingManager' ? (
          <ListingManagerPage
            listings={listings}
            availablePlatforms={AVAILABLE_LISTING_PLATFORMS}
            onDeleteListing={handleDeleteListing}
            onRefreshListings={refreshListings}
            onPublishListing={handlePublishListing}
            onTogglePlatform={handleToggleListingPlatform}
          />
        ) : page === 'newLease' ? (
          <LeaseForm
            form={form}
            onChange={updateField}
            onSave={handleSaveLease}
            loading={loading}
            listings={listings}
            onLinkListing={handleLinkListingToLease}
          />
        ) : page === 'leaseManager' ? (
          <LeaseManager
            leases={leases}
            onRefresh={loadLeases}
            onDelete={handleDelete}
            onDownloadPDF={handleDownloadPDF}
            onUploadSignedPdf={handleUploadSignedPdf}
            onEditLease={handleEditLease}
            loading={loading}
          />
        ) : page === 'newCustomer' ? (
          <NewCustomerPage form={customerForm} onChange={updateCustomerField} onSave={handleSaveCustomer} />
        ) : page === 'customerManager' ? (
          <CustomerManagerPage customers={customers} onEdit={handleEditCustomer} onDelete={handleDeleteCustomer} onRefresh={refreshCustomers} />
        ) : page === 'settings' ? (
          <SettingsPage
            user={user}
            settings={settings}
            onUpdateUser={setUser}
            onUpdateSettings={updateSettings}
          />
        ) : null}
      </main>


      {loginPrompt && !auth && (
        <div className="modal-overlay" onClick={() => setLoginPrompt(false)}>
          <div className="popup-panel" onClick={e => e.stopPropagation()}>
            <h3>Login required</h3>
            <p>Access to this section is restricted. Please log in first to proceed.</p>
            <button className="btn-primary" onClick={() => { setPage('login'); setLoginPrompt(false); }}>
              Proceed to Login
            </button>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} CarbonBlack Properties · Secure lease workflow</p>
      </footer>
    </div>
  );
}

function LoginPage({ loginState, onInput, onSubmit }) {
  return (
    <section className="login-screen">
      <div className="login-card">
        <div className="login-brand">CarbonBlack Properties</div>
        <h1 className="login-heading">Agent Access Portal</h1>
        <p className="login-copy">One secure entry point for lease creation and controls. Login to unlock the system.</p>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              className="login-input"
              value={loginState.username}
              onChange={e => onInput('username', e.target.value)}
              placeholder="Enter your agent ID"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              className="login-input"
              type="password"
              value={loginState.password}
              onChange={e => onInput('password', e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>
          <button className="btn-primary login-submit" type="submit">Log In</button>
        </form>

        <p className="login-hint">Demo mode: any username and password works. Logged-in users can access lease tools and settings.</p>
      </div>
    </section>
  );
}

function DashboardPage({ username, onNavigate }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>Welcome back, {username}.</h2>
          <p className="section-sub">Your secure operations hub is ready.</p>
        </div>
      </div>

      <div className="page-grid">
        <FeatureCard title="New Listing" description="Create a listing for a property." actionLabel="Create" onClick={() => onNavigate('newListing')} />
        <FeatureCard title="Listing Manager" description="Publish listings to dedicated sites and manage their visibility and publishing state." actionLabel="Publish" onClick={() => onNavigate('listingManager')} />
        <FeatureCard title="New Lease" description="Create a lease agreement for a customer." actionLabel="Create" onClick={() => onNavigate('newLease')} />
        <FeatureCard title="Lease Management" description="Manage active leases, renewals and documents." actionLabel="Manage" onClick={() => onNavigate('leaseManager')} />
        <FeatureCard title="New Customer" description="Add a new customer record and keep contact details ready." actionLabel="Add new" onClick={() => onNavigate('newCustomer')} />
        <FeatureCard title="Customer Directory" description="View, update and manage saved customer records." actionLabel="View" onClick={() => onNavigate('customerManager')} />
      </div>
    </section>
  );
}

function FeatureCard({ title, description, actionLabel, onClick, locked }) {
  return (
    <div className={`feature-card ${locked ? 'locked' : ''}`}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {locked ? (
        <span className="feature-tag">Locked</span>
      ) : (
        <button className="btn-outline" onClick={onClick}>{actionLabel}</button>
      )}
    </div>
  );
}

function SettingsPage({ user, settings, onUpdateUser, onUpdateSettings }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>General User Settings</h2>
          <p className="section-sub">Manage your session, notifications, voice assistant and profile.</p>
        </div>
      </div>

      <div className="settings-panel">
        <div className="settings-group">
          <h4>Profile</h4>
          <label>
            Agent name
            <input
              className="login-input"
              value={user.username}
              onChange={e => onUpdateUser({ username: e.target.value })}
              placeholder="Agent name"
            />
          </label>
          <label>
            Theme accent
            <select className="login-input" value={settings.themeAccent} onChange={e => onUpdateSettings('themeAccent', e.target.value)}>
              <option value="blue">Blue Tech</option>
              <option value="yellow">Yellow Pulse</option>
              <option value="green">Green Guard</option>
            </select>
          </label>
        </div>

        <div className="settings-group">
          <h4>Preferences</h4>
          <ToggleRow label="Auto save drafts" enabled={settings.autoSaveDrafts} onToggle={() => onUpdateSettings('autoSaveDrafts', !settings.autoSaveDrafts)} />
          <ToggleRow label="Email alerts" enabled={settings.emailAlerts} onToggle={() => onUpdateSettings('emailAlerts', !settings.emailAlerts)} />
        </div>

        <div className="settings-group">
          <h4>Security</h4>
          <p className="security-note">This portal uses a demo client-side login. A production version would enforce server-side credentials and access management.</p>
        </div>
      </div>
    </section>
  );
}

function NewListingPage({ form, onChange, onSave, onPhotosChange }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>New Listing</h2>
          <p className="section-sub">Create property listings for external listing sites. Configuration for listing destinations will be added later.</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={e => { e.preventDefault(); onSave(); }}>
        <div className="field-group full-width">
          <label className="field-label">Property Title</label>
          <input className="field-input" value={form.propertyTitle} onChange={e => onChange('propertyTitle', e.target.value)} placeholder="e.g. Ocean View Apartment" />
        </div>
        <div className="field-group">
          <label className="field-label">Address</label>
          <input className="field-input" value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="Street address and number" />
        </div>
        <div className="field-group">
          <label className="field-label">City</label>
          <input className="field-input" value={form.city} onChange={e => onChange('city', e.target.value)} placeholder="City" />
        </div>
        <div className="field-group">
          <label className="field-label">Region</label>
          <input className="field-input" value={form.region} onChange={e => onChange('region', e.target.value)} placeholder="Province / State" />
        </div>
        <div className="field-group">
          <label className="field-label">Postcode / ZIP</label>
          <input className="field-input" value={form.zipCode} onChange={e => onChange('zipCode', e.target.value)} placeholder="Postal code" />
        </div>
        <div className="field-group">
          <label className="field-label">Country</label>
          <input className="field-input" value={form.country} onChange={e => onChange('country', e.target.value)} placeholder="Country" />
        </div>
        <div className="field-group">
          <label className="field-label">Listing Type</label>
          <select className="field-input" value={form.listingType} onChange={e => onChange('listingType', e.target.value)}>
            <option value="Sale">Sale</option>
            <option value="Rent">Rent</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Property Type</label>
          <select className="field-input" value={form.propertyType} onChange={e => onChange('propertyType', e.target.value)}>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Land</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Bedrooms</label>
          <input className="field-input" type="number" min="0" value={form.bedrooms} onChange={e => onChange('bedrooms', e.target.value)} placeholder="Number of bedrooms" />
        </div>
        <div className="field-group">
          <label className="field-label">Bathrooms</label>
          <input className="field-input" type="number" min="0" value={form.bathrooms} onChange={e => onChange('bathrooms', e.target.value)} placeholder="Number of bathrooms" />
        </div>
        <div className="field-group">
          <label className="field-label">Area (m²)</label>
          <input className="field-input" value={form.area} onChange={e => onChange('area', e.target.value)} placeholder="Size in square meters" />
        </div>
        <div className="field-group">
          <label className="field-label">Currency</label>
          <select className="field-input" value={form.currency} onChange={e => onChange('currency', e.target.value)}>
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Price</label>
          <input className="field-input" type="number" min="0" value={form.price} onChange={e => onChange('price', e.target.value)} placeholder="Listing price" />
        </div>
        <div className="field-group">
          <label className="field-label">Available From</label>
          <input className="field-input" type="date" value={form.availableFrom} onChange={e => onChange('availableFrom', e.target.value)} />
        </div>
        <div className="field-group full-width">
          <label className="field-label">Owner / Contact</label>
          <div className="field-grid-two">
            <input className="field-input" value={form.ownerName} onChange={e => onChange('ownerName', e.target.value)} placeholder="Owner name" />
            <input className="field-input" type="email" value={form.ownerEmail} onChange={e => onChange('ownerEmail', e.target.value)} placeholder="Owner email" />
            <input className="field-input" value={form.ownerPhone} onChange={e => onChange('ownerPhone', e.target.value)} placeholder="Owner phone" />
            <input className="field-input" value={form.ownerCompany} onChange={e => onChange('ownerCompany', e.target.value)} placeholder="Owner company" />
          </div>
        </div>
        <div className="field-group full-width">
          <label className="field-label">Photos</label>
          <input
            className="field-input"
            type="file"
            accept="image/*"
            multiple
            onChange={e => onPhotosChange(e.target.files)}
          />
          {form.photos && form.photos.length > 0 && (
            <div className="listing-photo-grid">
              {form.photos.map(photo => (
                <div key={photo.id} className="photo-preview">
                  <img src={photo.src} alt={photo.name} />
                  <button type="button" className="btn-delete" onClick={() => onChange('photos', form.photos.filter(item => item.id !== photo.id))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="field-group full-width">
          <label className="field-label">Description</label>
          <textarea className="field-input" rows={4} value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Write a brief property description" />
        </div>
        <div className="field-group full-width">
          <label className="field-label">Features</label>
          <textarea className="field-input" rows={3} value={form.features} onChange={e => onChange('features', e.target.value)} placeholder="e.g. pool, parking, furnished" />
        </div>
        <div className="field-group full-width">
          <button className="btn-primary" type="submit">Save Listing</button>
        </div>
      </form>
    </section>
  );
}

function NewCustomerPage({ form, onChange, onSave }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>New Customer</h2>
          <p className="section-sub">Capture customer details once and reuse them in leases and listings.</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={e => { e.preventDefault(); onSave(); }}>
        <div className="field-group full-width">
          <label className="field-label">Full Name</label>
          <input className="field-input" value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="Customer full name" />
        </div>
        <div className="field-group">
          <label className="field-label">Email</label>
          <input className="field-input" type="email" value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="customer@email.com" />
        </div>
        <div className="field-group">
          <label className="field-label">Phone</label>
          <input className="field-input" type="tel" value={form.phone} onChange={e => onChange('phone', e.target.value)} placeholder="Owner / tenant phone" />
        </div>
        <div className="field-group">
          <label className="field-label">Company</label>
          <input className="field-input" value={form.company} onChange={e => onChange('company', e.target.value)} placeholder="Company or agency" />
        </div>
        <div className="field-group">
          <label className="field-label">Role</label>
          <select className="field-input" value={form.role} onChange={e => onChange('role', e.target.value)}>
            <option value="Client">Client</option>
            <option value="Owner">Owner</option>
            <option value="Lessee">Lessee</option>
            <option value="Lessor">Lessor</option>
            <option value="Agent">Agent</option>
          </select>
        </div>
        <div className="field-group full-width">
          <label className="field-label">Notes</label>
          <textarea className="field-input" rows={3} value={form.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Optional customer notes" />
        </div>
        <div className="field-group full-width">
          <button className="btn-primary" type="submit">Save Customer</button>
        </div>
      </form>
    </section>
  );
}

function CustomerManagerPage({ customers, onEdit, onDelete, onRefresh }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>Customer Directory</h2>
          <p className="section-sub">Review and manage customers added from listings, leases or manually.</p>
        </div>
        <button className="btn-outline" type="button" onClick={onRefresh}>⟳ Refresh</button>
      </div>

      {customers.length === 0 ? (
        <div className="about-card">
          <p>No customer records are stored yet. Add a new customer or save a lease/listing with contact details to populate this list.</p>
        </div>
      ) : (
        <div className="leases-grid">
          {customers.map(customer => (
            <div key={customer.id} className="lease-card">
              <div className="card-status" style={{ color: '#00d4ff', borderColor: '#00d4ff55' }}>
                <span>👤</span>
                <span>{customer.role || 'Client'}</span>
              </div>
              <div className="card-type">{customer.name}</div>
              <div className="card-id">{customer.email || 'No email'}</div>
              <div className="card-details">
                {customer.company && <p><strong>Company:</strong> {customer.company}</p>}
                {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
                {customer.notes && <p>{customer.notes}</p>}
                <p><strong>Added:</strong> {new Date(customer.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="card-actions">
                <button className="btn-outline" onClick={() => onEdit(customer)}>Edit</button>
                <button className="btn-delete" onClick={() => onDelete(customer.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ListingManagerPage({ listings, availablePlatforms, onDeleteListing, onRefreshListings, onPublishListing, onTogglePlatform }) {
  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <h2>Listing Manager</h2>
          <p className="section-sub">Manage and review properties that have been listed through the portal.</p>
        </div>
        <button className="btn-outline" type="button" onClick={onRefreshListings}>⟳ Refresh</button>
      </div>

      {listings.length === 0 ? (
        <div className="about-card">
          <p>No listings are stored yet. Use New Listing to create property listings that will appear here.</p>
        </div>
      ) : (
        <div className="leases-grid">
          {listings.map(listing => (
            <div key={listing.id} className="lease-card">
              <div className="card-status" style={{ color: listing.listingStatus === 'Published' ? '#00ff88' : '#ffd700', borderColor: listing.listingStatus === 'Published' ? '#00ff8855' : '#ffd70055' }}>
                <span>{listing.listingStatus === 'Published' ? '✅' : '⏳'}</span>
                <span>{listing.listingStatus}</span>
              </div>
              <div className="card-type">{listing.propertyTitle}</div>
              <div className="card-id">{listing.propertyType} · {listing.listingType}</div>
              <div className="card-details">
                <p><strong>Price:</strong> {listing.currency} {listing.price}</p>
                <p><strong>Address:</strong> {listing.address}, {listing.city}</p>
                <p><strong>Owner:</strong> {listing.ownerName || '—'} {listing.ownerCompany ? `(${listing.ownerCompany})` : ''}</p>
                <p><strong>Bedrooms:</strong> {listing.bedrooms || '—'} · <strong>Bathrooms:</strong> {listing.bathrooms || '—'}</p>
                <p><strong>Area:</strong> {listing.area ? `${listing.area} m²` : '—'}</p>
                <p><strong>Available:</strong> {listing.availableFrom || 'Immediately'}</p>
                {listing.description && <p>{listing.description}</p>}
                {listing.bestPlatform && (
                  <p><strong>Suggested platform:</strong> {listing.bestPlatform}</p>
                )}
                {listing.selectedPlatforms && listing.selectedPlatforms.length > 0 && (
                  <p><strong>Publish selection:</strong> {listing.selectedPlatforms.join(', ')}</p>
                )}
                {listing.photos && listing.photos.length > 0 && (
                  <div className="listing-photo-grid">
                    {listing.photos.map(photo => (
                      <div key={photo.id} className="photo-preview">
                        <img src={photo.src} alt={photo.name} />
                      </div>
                    ))}
                  </div>
                )}
                {listing.publishedPlatforms?.length > 0 && (
                  <p><strong>Published platforms:</strong> {listing.publishedPlatforms.join(', ')}</p>
                )}
                {listing.listingUrls && Object.keys(listing.listingUrls).length > 0 && (
                  <div className="listing-links">
                    <p><strong>Preview links:</strong></p>
                    <ul>
                      {Object.entries(listing.listingUrls).map(([platform, url]) => (
                        <li key={platform}><a href={url} target="_blank" rel="noreferrer">{platform}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
                {!listing.publishedPlatforms?.length && (
                  <div className="platform-options">
                    <p><strong>Select platforms to publish:</strong></p>
                    <div className="platform-list">
                      {availablePlatforms.map(platform => (
                        <label key={platform} className="platform-option">
                          <input
                            type="checkbox"
                            checked={listing.selectedPlatforms?.includes(platform)}
                            onChange={() => onTogglePlatform(listing.id, platform)}
                          />
                          <span>{platform}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="card-actions">
                {listing.listingStatus !== 'Published' ? (
                  <button className="btn-primary" type="button" onClick={() => onPublishListing(listing.id)}>
                    Publish
                  </button>
                ) : (
                  <button className="btn-outline" type="button" disabled>
                    Already published
                  </button>
                )}
                <button className="btn-pdf" onClick={() => onDeleteListing(listing.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ToggleRow({ label, enabled, onToggle }) {
  return (
    <div className="toggle-row">
      <div>
        <span>{label}</span>
        <p className="toggle-description">{enabled ? 'Enabled' : 'Disabled'}</p>
      </div>
      <button type="button" className={`toggle-switch ${enabled ? 'active' : ''}`} onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}
