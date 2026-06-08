import React, { useState, useEffect } from 'react';
import { BusinessSettings } from '../types';
import { getSystemLogs, clearSystemLogs, LogEntry } from '../services/systemLogs';
import {
  loadGeneralSettings, saveGeneralSettings,
  applyTheme, showNotification,
  GeneralSettings, DEFAULT_GENERAL,
} from '../services/generalSettings';

interface SettingsPageProps {
  settings: BusinessSettings;
  onSave:   (s: BusinessSettings) => void;
  canEdit:  boolean;
}

interface ReceiptSettings {
  headerText:       string;
  footerText:       string;
  receiptPrefix:    string;
  showBusinessName: boolean;
  showPhone:        boolean;
  showAddress:      boolean;
  autoPrint:        boolean;
}

const DEFAULT_RECEIPT: ReceiptSettings = {
  headerText: 'Thank you for your business!',
  footerText: 'Please come again.',
  receiptPrefix: 'RCP',
  showBusinessName: true,
  showPhone: true,
  showAddress: true,
  autoPrint: false,
};

const RECEIPT_KEY = 'printpos_receipt_settings';

const SECTIONS = [
  { id: 'business', label: 'Business Information', icon: 'ti-building-store' },
  { id: 'general',  label: 'General Settings',     icon: 'ti-settings'       },
  { id: 'receipt',  label: 'Receipt Settings',     icon: 'ti-receipt'        },
  { id: 'payment',  label: 'Payment Methods',      icon: 'ti-credit-card'    },
  { id: 'backup',   label: 'Backup & Restore',     icon: 'ti-database'       },
  { id: 'logs',     label: 'System Logs',          icon: 'ti-list-details'   },
];

const TYPE_COLORS: Record<LogEntry['type'], { bg: string; color: string; label: string }> = {
  sale:     { bg: '#dbeafe', color: '#1d4ed8', label: 'Sale'     },
  expense:  { bg: '#fee2e2', color: '#dc2626', label: 'Expense'  },
  auth:     { bg: '#d1fae5', color: '#059669', label: 'Auth'     },
  settings: { bg: '#fef3c7', color: '#b45309', label: 'Settings' },
  delete:   { bg: '#fce7f3', color: '#be185d', label: 'Delete'   },
};

const TIMEZONES = [
  'Asia/Manila','Asia/Singapore','Asia/Tokyo','Asia/Hong_Kong',
  'Asia/Kuala_Lumpur','Australia/Sydney','Europe/London',
  'America/New_York','America/Los_Angeles','UTC',
];

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, canEdit }) => {
  const [active,       setActive]       = useState('business');
  const [form,         setForm]         = useState<BusinessSettings>(settings);
  const [saved,        setSaved]        = useState(false);
  const [receipt,      setReceipt]      = useState<ReceiptSettings>(DEFAULT_RECEIPT);
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [general,      setGeneral]      = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [logs,         setLogs]         = useState<LogEntry[]>([]);
  const [logFilter,    setLogFilter]    = useState('all');
  const [logSearch,    setLogSearch]    = useState('');
  const [now,          setNow]          = useState(new Date());

  // Live clock for timezone preview
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const r = localStorage.getItem(RECEIPT_KEY);
      if (r) setReceipt(JSON.parse(r));
      setGeneral(loadGeneralSettings());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (active === 'logs') setLogs(getSystemLogs());
  }, [active]);

  const handleSave = () => {
    if (!canEdit) return;
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReceiptSave = () => {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
    setReceiptSaved(true);
    setTimeout(() => setReceiptSaved(false), 2000);
  };

  // ── General save: applies theme + requests notification permission ──
  const handleGeneralSave = async () => {
    saveGeneralSettings(general);
    applyTheme(general.theme);

    if (general.notifSale || general.notifExpense || general.notifLowBalance || general.notifDailySummary) {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      showNotification('Settings Saved ✅', 'Notification preferences updated.', 'notifSale');
    }

    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2000);
  };

  const handleClearLogs = () => {
    if (!window.confirm('Clear all system logs? This cannot be undone.')) return;
    clearSystemLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const rows = filteredLogs.map(l =>
      `"${l.timestamp}","${l.user}","${l.action}","${l.details}","${l.type}"`
    );
    const csv  = ['Timestamp,User,Action,Details,Type', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(l => {
    const matchType   = logFilter === 'all' || l.type === logFilter;
    const matchSearch = logSearch === '' ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.user.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase());
    return matchType && matchSearch;
  });

  const formatTs = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const Toggle = ({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) => (
    <div onClick={() => !disabled && onChange()} style={{
      width: 40, height: 22, borderRadius: 11,
      background: value ? 'var(--accent)' : '#d1d5db',
      position: 'relative', transition: 'background .2s',
      cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, background: '#fff', borderRadius: '50%',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
    <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const SaveRow = ({ onSave: save, saved: s, label = 'Save Changes' }: { onSave: () => void; saved: boolean; label?: string }) => (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
      {canEdit ? (
        <button className="btn-primary" style={{ minWidth: 160, background: s ? 'var(--green)' : undefined }} onClick={save}>
          <i className={`ti ${s ? 'ti-check' : 'ti-device-floppy'}`} aria-hidden="true" />
          {' '}{s ? 'Saved!' : label}
        </button>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          You need Admin access to edit settings.
        </div>
      )}
    </div>
  );

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure system preferences and business information</p>
        </div>
        {!canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#b45309' }}>
            <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden="true" /> View Only
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="page-card" style={{ padding: 10, height: 'fit-content' }}>
          {SECTIONS.map((s) => (
            <div key={s.id} onClick={() => setActive(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
              background: active === s.id ? 'var(--accent-light)' : 'transparent',
              color:      active === s.id ? 'var(--accent)' : 'var(--sub)',
              fontWeight: active === s.id ? 600 : 500,
              fontSize: 13, marginBottom: 2,
              transition: 'background .15s, color .15s',
            }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
              {s.label}
            </div>
          ))}
        </div>

        <div className="page-card">

          {/* ── Business ── */}
          {active === 'business' && (
            <div>
              <SectionTitle title="Business Information" />
              <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
                {([
                  ['Business Name',  'businessName', 'My Print Shop'      ],
                  ['Business Owner', 'owner',        'Juan Dela Cruz'     ],
                  ['Address',        'address',      '123 Printing St...' ],
                  ['Phone',          'phone',        '0917 123 4567'      ],
                  ['Email',          'email',        'shop@example.com'   ],
                ] as [string, keyof BusinessSettings, string][]).map(([label, key, placeholder]) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" value={form[key] ?? ''} placeholder={placeholder} disabled={!canEdit}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      style={{ background: canEdit ? '#fff' : 'var(--bg)', cursor: canEdit ? 'text' : 'not-allowed', color: canEdit ? 'var(--text)' : 'var(--muted)' }} />
                  </div>
                ))}
              </div>
              <SaveRow onSave={handleSave} saved={saved} />
            </div>
          )}

          {/* ── General Settings ── */}
          {active === 'general' && (
            <div>
              <SectionTitle title="General Settings" sub="Customize your system appearance and preferences" />
              <div style={{ display: 'grid', gap: 24, maxWidth: 520 }}>

                {/* Theme — applies live on click */}
                <div>
                  <label className="form-label">Theme</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {([
                      ['light',  'ti-sun',          'Light' ],
                      ['dark',   'ti-moon',          'Dark'  ],
                      ['system', 'ti-device-laptop', 'System'],
                    ] as const).map(([val, icon, label]) => (
                      <button key={val}
                        onClick={() => {
                          if (!canEdit) return;
                          setGeneral(g => ({ ...g, theme: val }));
                          applyTheme(val); // instant preview
                        }}
                        style={{
                          flex: 1, padding: '12px 8px', borderRadius: 9,
                          border: general.theme === val ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                          background: general.theme === val ? 'var(--accent-light)' : 'rgba(255,255,255,0.6)',
                          color: general.theme === val ? 'var(--accent)' : 'var(--sub)',
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          transition: 'all .15s',
                        }}>
                        <i className={`ti ${icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    Theme applies instantly — save to keep on next reload.
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="form-label">Language</label>
                  <select className="filter-select" value={general.language} disabled={!canEdit}
                    onChange={(e) => setGeneral(g => ({ ...g, language: e.target.value as 'en' | 'fil' }))}
                    style={{ width: '100%', padding: '10px 14px', background: canEdit ? 'rgba(255,255,255,0.8)' : 'var(--bg)' }}>
                    <option value="en">🇵🇭 English</option>
                    <option value="fil">🇵🇭 Filipino (Tagalog)</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="form-label">Currency Format</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {([['PHP', '₱ Philippine Peso'], ['USD', '$ US Dollar']] as const).map(([val, label]) => (
                      <button key={val}
                        onClick={() => canEdit && setGeneral(g => ({ ...g, currency: val }))}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 9,
                          border: general.currency === val ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                          background: general.currency === val ? 'var(--accent-light)' : 'rgba(255,255,255,0.6)',
                          color: general.currency === val ? 'var(--accent)' : 'var(--sub)',
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                          transition: 'all .15s',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="form-label">Timezone</label>
                  <select className="filter-select" value={general.timezone} disabled={!canEdit}
                    onChange={(e) => setGeneral(g => ({ ...g, timezone: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', background: canEdit ? 'rgba(255,255,255,0.8)' : 'var(--bg)' }}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-clock" style={{ fontSize: 12 }} aria-hidden="true" />
                    Current time: <strong>{now.toLocaleTimeString('en-PH', { timeZone: general.timezone })}</strong> ({general.timezone.replace(/_/g, ' ')})
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <label className="form-label">Notification Preferences</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10, padding: 16, background: 'rgba(255,255,255,0.3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    {([
                      ['notifSale',         'Sale Saved',        'Notify when a sale is recorded'        ],
                      ['notifExpense',       'Expense Added',     'Notify when an expense is recorded'    ],
                      ['notifLowBalance',    'Low Balance Alert', 'Alert when remaining balance is low'   ],
                      ['notifDailySummary',  'Daily Summary',     'Show a daily summary at end of day'    ],
                    ] as [keyof GeneralSettings, string, string][]).map(([key, label, desc]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                        </div>
                        <Toggle value={general[key] as boolean} onChange={() => setGeneral(g => ({ ...g, [key]: !g[key] }))} disabled={!canEdit} />
                      </div>
                    ))}
                  </div>
                  {'Notification' in window && Notification.permission === 'denied' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', display: 'flex', gap: 5, alignItems: 'center' }}>
                      <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />
                      Browser notifications are blocked. Enable them in your browser settings.
                    </div>
                  )}
                </div>
              </div>
              <SaveRow onSave={handleGeneralSave} saved={generalSaved} label="Save General Settings" />
            </div>
          )}

          {/* ── Receipt Settings ── */}
          {active === 'receipt' && (
            <div>
              <SectionTitle title="Receipt Settings" sub="Customize what appears on printed receipts" />
              <div style={{ display: 'grid', gap: 18, maxWidth: 520 }}>
                <div>
                  <label className="form-label">Receipt Number Prefix</label>
                  <input className="form-input" value={receipt.receiptPrefix} placeholder="RCP" disabled={!canEdit}
                    onChange={(e) => setReceipt(r => ({ ...r, receiptPrefix: e.target.value }))}
                    style={{ background: canEdit ? '#fff' : 'var(--bg)', cursor: canEdit ? 'text' : 'not-allowed' }} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Example: RCP-2026-001</div>
                </div>
                <div>
                  <label className="form-label">Receipt Header Text</label>
                  <input className="form-input" value={receipt.headerText} placeholder="Thank you for your business!" disabled={!canEdit}
                    onChange={(e) => setReceipt(r => ({ ...r, headerText: e.target.value }))}
                    style={{ background: canEdit ? '#fff' : 'var(--bg)', cursor: canEdit ? 'text' : 'not-allowed' }} />
                </div>
                <div>
                  <label className="form-label">Receipt Footer Text</label>
                  <input className="form-input" value={receipt.footerText} placeholder="Please come again." disabled={!canEdit}
                    onChange={(e) => setReceipt(r => ({ ...r, footerText: e.target.value }))}
                    style={{ background: canEdit ? '#fff' : 'var(--bg)', cursor: canEdit ? 'text' : 'not-allowed' }} />
                </div>
                <div>
                  <label className="form-label">Show on Receipt</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    {([
                      ['showBusinessName', 'Business Name'               ],
                      ['showPhone',        'Phone Number'                ],
                      ['showAddress',      'Address'                     ],
                      ['autoPrint',        'Auto-print after saving sale'],
                    ] as [keyof ReceiptSettings, string][]).map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                        <Toggle value={receipt[key] as boolean} onChange={() => setReceipt(r => ({ ...r, [key]: !r[key] }))} disabled={!canEdit} />
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(249,250,251,0.8)', border: '1px dashed var(--border)', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Receipt Preview</div>
                  <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.8, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {receipt.showBusinessName && <div style={{ fontWeight: 700 }}>{form.businessName || 'Your Business'}</div>}
                    {receipt.showAddress      && <div>{form.address || '123 Main St'}</div>}
                    {receipt.showPhone        && <div>{form.phone   || '0917 000 0000'}</div>}
                    <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }} />
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{receipt.receiptPrefix}-2026-001</div>
                    <div style={{ borderTop: '1px dashed #d1d5db', margin: '8px 0' }} />
                    <div style={{ fontSize: 11, color: 'var(--sub)' }}>{receipt.headerText}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{receipt.footerText}</div>
                  </div>
                </div>
              </div>
              <SaveRow onSave={handleReceiptSave} saved={receiptSaved} label="Save Receipt Settings" />
            </div>
          )}

          {/* ── System Logs ── */}
          {active === 'logs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>System Logs</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{logs.length} total entries</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" onClick={handleExportLogs} disabled={logs.length === 0} style={{ fontSize: 12, padding: '7px 14px' }}>
                    <i className="ti ti-download" aria-hidden="true" /> Export CSV
                  </button>
                  {canEdit && (
                    <button onClick={handleClearLogs} disabled={logs.length === 0}
                      style={{ fontSize: 12, padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, cursor: logs.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', opacity: logs.length === 0 ? 0.5 : 1 }}>
                      <i className="ti ti-trash" aria-hidden="true" /> Clear Logs
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14, pointerEvents: 'none' }} aria-hidden="true" />
                  <input className="search-input" placeholder="Search logs..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={logFilter} onChange={(e) => setLogFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="sale">Sale</option>
                  <option value="expense">Expense</option>
                  <option value="auth">Auth</option>
                  <option value="settings">Settings</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
              {filteredLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <i className="ti ti-list-details" style={{ fontSize: 40, opacity: .3, display: 'block', marginBottom: 10 }} aria-hidden="true" />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sub)', marginBottom: 4 }}>
                    {logSearch || logFilter !== 'all' ? 'No logs match your filter' : 'No logs yet'}
                  </div>
                  <div style={{ fontSize: 12 }}>Logs are recorded automatically as you use the system.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((l) => {
                        const tc = TYPE_COLORS[l.type];
                        return (
                          <tr key={l.id}>
                            <td style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatTs(l.timestamp)}</td>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{l.user}</td>
                            <td style={{ fontSize: 12 }}>{l.action}</td>
                            <td style={{ fontSize: 12, color: 'var(--sub)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details}</td>
                            <td><span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>{tc.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Coming Soon */}
          {!['business', 'general', 'receipt', 'logs'].includes(active) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--muted)', gap: 12 }}>
              <i className={`ti ${SECTIONS.find((s) => s.id === active)?.icon}`} style={{ fontSize: 48, opacity: .3 }} aria-hidden="true" />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sub)' }}>{SECTIONS.find((s) => s.id === active)?.label}</div>
              <div style={{ fontSize: 13 }}>This section is coming soon.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;