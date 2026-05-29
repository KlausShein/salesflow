import React, { useState } from 'react';
import { BusinessSettings } from '../types';

interface SettingsPageProps {
  settings: BusinessSettings;
  onSave:   (s: BusinessSettings) => void;
  canEdit:  boolean;
}

const SECTIONS = [
  { id: 'business', label: 'Business Information', icon: 'ti-building-store' },
  { id: 'general',  label: 'General Settings',     icon: 'ti-settings'       },
  { id: 'receipt',  label: 'Receipt Settings',     icon: 'ti-receipt'        },
  { id: 'payment',  label: 'Payment Methods',      icon: 'ti-credit-card'    },
  { id: 'backup',   label: 'Backup & Restore',     icon: 'ti-database'       },
  { id: 'logs',     label: 'System Logs',          icon: 'ti-list-details'   },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, canEdit }) => {
  const [active, setActive] = useState('business');
  const [form,   setForm]   = useState<BusinessSettings>(settings);
  const [saved,  setSaved]  = useState(false);

  const handleSave = () => {
    if (!canEdit) return;
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure system preferences and business information</p>
        </div>
        {/* Read-only badge for non-Admin */}
        {!canEdit && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            background: '#fef3c7', border: '1px solid #fde68a',
            borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#b45309',
          }}>
            <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden="true" />
            View Only
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="page-card" style={{ padding: 10, height: 'fit-content' }}>
          {SECTIONS.map((s) => (
            <div
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                background: active === s.id ? 'var(--accent-light)' : 'transparent',
                color: active === s.id ? 'var(--accent)' : 'var(--sub)',
                fontWeight: active === s.id ? 600 : 500,
                fontSize: 13, marginBottom: 2,
                transition: 'background .15s, color .15s',
              }}
            >
              <i className={`ti ${s.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
              {s.label}
            </div>
          ))}
        </div>

        <div className="page-card">
          {active === 'business' ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                Business Information
              </div>
              <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
                {([
                  ['Business Name', 'businessName', 'PrintPOS Print Shop'],
                  ['Business Owner', 'owner',        'Juan Dela Cruz'     ],
                  ['Address',        'address',      '123 Printing St...' ],
                  ['Phone',          'phone',        '0917 123 4567'      ],
                  ['Email',          'email',        'shop@example.com'   ],
                ] as [string, keyof BusinessSettings, string][]).map(([label, key, placeholder]) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      className="form-input"
                      value={form[key] ?? ''}
                      placeholder={placeholder}
                      disabled={!canEdit}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      style={{
                        background: canEdit ? '#fff' : 'var(--bg)',
                        cursor:     canEdit ? 'text' : 'not-allowed',
                        color:      canEdit ? 'var(--text)' : 'var(--muted)',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label className="form-label">Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <label style={{
                      padding: '7px 14px', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, fontWeight: 600,
                      color: canEdit ? 'var(--sub)' : 'var(--muted)',
                      background: 'var(--bg)',
                      cursor: canEdit ? 'pointer' : 'not-allowed',
                      opacity: canEdit ? 1 : 0.6,
                    }}>
                      Choose File
                      <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!canEdit} />
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>No file chosen</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Recommended: 200×200px</div>
                </div>
              </div>

              {/* Save button — only for Admin */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                {canEdit ? (
                  <button
                    className="btn-primary"
                    style={{ minWidth: 140, background: saved ? 'var(--green)' : undefined }}
                    onClick={handleSave}
                  >
                    <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} aria-hidden="true" />
                    {' '}{saved ? 'Saved!' : 'Save Changes'}
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                    You need Admin access to edit settings.
                  </div>
                )}
              </div>
            </div>
          ) : (
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