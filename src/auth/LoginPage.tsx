import React, { useState } from 'react';
import bgImage   from '../assets/login-bg.png';
import logoImage from '../assets/Logo-pg.png';
import { useAuth }   from './AuthContext';
import LoadingScreen from '../components/shared/LoadingScreen';

type Mode = 'owner' | 'staff' | 'signup';

export default function LoginPage() {
  const { ownerLogin, ownerSignUp, staffLogin } = useAuth();

  const [mode,         setMode]         = useState<Mode>('owner');
  const [email,        setEmail]        = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState('');
  const [success,      setSuccess]      = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup') {
      if (!businessName.trim()) {
        return setError('Please enter your business name.');
      }
      setLoadingMsg('Setting up your business account...');
      setLoading(true);
      const result = await ownerSignUp(email, password, businessName.trim());
      setLoading(false);
      if (!result.success) return setError(result.error ?? 'Sign up failed.');
      setSuccess('Account created! You can now sign in.');
      setMode('owner');
      return;
    }

    if (mode === 'owner') {
      setLoadingMsg('Signing in to your business...');
      setLoading(true);
      const result = await ownerLogin(email, password);
      setLoading(false);
      if (!result.success) return setError(result.error ?? 'Login failed.');
      return;
    }

    if (mode === 'staff') {
      setLoadingMsg('Signing in as staff...');
      setLoading(true);
      const result = await staffLogin(username, password);
      setLoading(false);
      if (!result.success) return setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <>
      {loading && <LoadingScreen message={loadingMsg} />}

      <div style={styles.root}>

        {/* ── Left panel ── */}
        <div style={styles.left}>
          <div style={styles.brand}>
            <div style={styles.logoBox}>
              <img src={logoImage} alt="Sales Flow Logo"
                style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10 }} />
            </div>
            <div>
              <div style={styles.brandName}>Sales Flow</div>
              <div style={styles.brandSub}>Sales Tracker</div>
            </div>
          </div>

          <div style={styles.leftContent}>
            <h1 style={styles.headline}>Track sales and manage your<br />business<br />smarter.</h1>
            <p style={styles.tagline}>
              Track daily sales, expenses, and distributions all in one place.
            </p>
          </div>

          <div style={styles.quoteBox}>
            <div style={styles.quoteText}>"Built for sales and business management."</div>
            <div style={styles.quoteSub}>
              Manage sales, expenses, and daily transactions with a clean and
              smart system designed for your business.
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={styles.right}>
          <div style={styles.card}>

            {mode !== 'staff' && (
              <div style={styles.tabs}>
                <button
                  style={{ ...styles.tab, ...(mode === 'owner'  ? styles.tabActive : {}) }}
                  onClick={() => { setMode('owner');  setError(''); setSuccess(''); }}
                >
                  Business Login
                </button>
                <button
                  style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
                  onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                >
                  Sign Up
                </button>
              </div>
            )}

            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>
                {mode === 'signup' ? 'Create your account' :
                 mode === 'owner'  ? 'Welcome back'        :
                                     'Staff login'}
              </h2>
              <p style={styles.cardSub}>
                {mode === 'signup' ? 'Register your business — takes 30 seconds' :
                 mode === 'owner'  ? 'Sign in with your business email'           :
                                     'Enter your staff credentials'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>

              {/* Business name — signup only */}
              {mode === 'signup' && (
                <div style={styles.field}>
                  <label style={styles.label}>Business Name</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Sunshine Print Shop"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email — owner & signup */}
              {(mode === 'owner' || mode === 'signup') && (
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Username — staff only */}
              {mode === 'staff' && (
                <div style={styles.field}>
                  <label style={styles.label}>Username</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={styles.input}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password — all modes */}
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={styles.eyeBtn} title={showPass ? 'Hide' : 'Show'}>
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8b9cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error   && (
                <div style={styles.errorBox}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
              {success && <div style={styles.successBox}>{success}</div>}

              <button type="submit" style={styles.submitBtn} disabled={loading}>
                {mode === 'signup' ? 'Create Account & Set Up Business' :
                 mode === 'owner'  ? 'Sign In'                          :
                                    'Sign In as Staff'}
              </button>
            </form>

            {mode === 'owner' && (
              <button style={styles.switchBtn}
                onClick={() => { setMode('staff'); setError(''); setSuccess(''); }}>
                Sign in as staff instead →
              </button>
            )}
            {mode === 'staff' && (
              <button style={styles.switchBtn}
                onClick={() => { setMode('owner'); setError(''); setSuccess(''); }}>
                ← Back to business login
              </button>
            )}

          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input::placeholder { color: #4a5568; }
          input:focus {
            outline: none;
            border-color: #4f46e5 !important;
            box-shadow: 0 0 0 3px rgba(79,70,229,0.2);
          }
        `}</style>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#0f1117',
  },
  left: {
    width: '45%',
    backgroundImage: `linear-gradient(rgba(10,14,30,0.78),rgba(10,14,30,0.88)), url(${bgImage})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
    padding: '48px', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  brand:     { display: 'flex', alignItems: 'center', gap: '14px' },
  logoBox: {
    width: '48px', height: '48px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', background: 'transparent',
  },
  brandName: { color: '#ffffff', fontSize: '18px', fontWeight: 700, lineHeight: 1.2 },
  brandSub:  { color: '#6b7db3', fontSize: '13px' },
  leftContent: {
    flex: 1, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', paddingTop: '40px',
  },
  headline: {
    color: '#ffffff', fontSize: '42px', fontWeight: 800,
    lineHeight: 1.2, margin: '0 0 20px', letterSpacing: '-0.5px',
  },
  tagline: { color: '#6b7db3', fontSize: '16px', lineHeight: 1.6, margin: 0, maxWidth: '340px' },
  quoteBox: { paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  quoteText: {
    color: '#ffffff', fontSize: '15px', fontWeight: 600,
    fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.4,
  },
  quoteSub: { color: '#6b7db3', fontSize: '13px', lineHeight: 1.7 },
  right: {
    flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '48px 40px',
  },
  card:       { width: '100%', maxWidth: '420px' },
  tabs: {
    display: 'flex', gap: '4px', marginBottom: '28px',
    background: '#1a1f35', borderRadius: '10px', padding: '4px',
  },
  tab: {
    flex: 1, padding: '10px', background: 'none', border: 'none',
    borderRadius: '8px', color: '#6b7db3', fontSize: '13px',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
  },
  tabActive:  { background: '#4f46e5', color: '#ffffff' },
  cardHeader: { marginBottom: '28px' },
  cardTitle:  { color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' },
  cardSub:    { color: '#6b7db3', fontSize: '14px', margin: 0 },
  form:       { display: 'flex', flexDirection: 'column', gap: '20px' },
  field:      { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    color: '#a0aec0', fontSize: '13px', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  inputWrap:  { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon:  { position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '13px 44px',
    background: '#1a1f35', border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#ffffff', fontSize: '15px',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: '14px', background: 'none',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
    borderRadius: '8px', padding: '10px 14px', color: '#e74c3c', fontSize: '13px',
  },
  successBox: {
    background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)',
    borderRadius: '8px', padding: '10px 14px', color: '#27ae60', fontSize: '13px',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px', background: '#4f46e5', border: 'none', borderRadius: '10px',
    color: '#ffffff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '4px',
  },
  switchBtn: {
    marginTop: '16px', background: 'none', border: 'none',
    color: '#6b7db3', fontSize: '13px', cursor: 'pointer',
    padding: '8px 0', width: '100%', textAlign: 'center',
  },
};