import React, { useState, useEffect } from 'react';

const UpdateBanner: React.FC = () => {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [progress,      setProgress]      = useState<number | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return; // not running in Electron

    api.onUpdateDownloaded((version: string) => {
      setUpdateVersion(version);
      setProgress(null);
    });

    api.onUpdateProgress((percent: number) => {
      setProgress(percent);
    });

    return () => {
      api.removeAllListeners?.();
      setProgress(null);
      setUpdateVersion(null);
    };
  }, []);

  // Show download progress bar
  if (progress !== null && !updateVersion) {
    return (
      <div style={{
        position:    'fixed',
        bottom:      24,
        right:       24,
        zIndex:      9999,
        background:  'linear-gradient(135deg, #1e293b, #0f172a)',
        color:       '#fff',
        borderRadius: 14,
        padding:     '14px 20px',
        boxShadow:   '0 8px 32px rgba(0,0,0,0.4)',
        width:       320,
        border:      '1px solid rgba(255,255,255,0.08)',
        animation:   'slideUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <i className="ti ti-download" style={{ fontSize: 18, color: '#818cf8' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Downloading Update</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{progress}% complete</div>
          </div>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
            borderRadius: 99, transition: 'width 0.3s ease',
          }} />
        </div>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>
    );
  }

  // Show install banner when update is ready
  if (!updateVersion) return null;

  return (
    <div style={{
      position:    'fixed',
      bottom:      24,
      right:       24,
      zIndex:      9999,
      background:  'linear-gradient(135deg, #4f46e5, #7c3aed)',
      color:       '#fff',
      borderRadius: 14,
      padding:     '16px 20px',
      boxShadow:   '0 8px 32px rgba(79,70,229,0.5)',
      display:     'flex',
      alignItems:  'center',
      gap:         14,
      maxWidth:    360,
      border:      '1px solid rgba(255,255,255,0.15)',
      animation:   'slideUp 0.3s ease',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-rocket" style={{ fontSize: 20 }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
          Update Ready — v{updateVersion}
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Restart to apply the latest features & fixes.
        </div>
      </div>

      <button
        onClick={() => (window as any).electronAPI?.installUpdate()}
        style={{
          background:   'rgba(255,255,255,0.2)',
          border:       '1px solid rgba(255,255,255,0.3)',
          borderRadius: 9,
          color:        '#fff',
          padding:      '8px 14px',
          fontSize:     12,
          fontWeight:   700,
          cursor:       'pointer',
          whiteSpace:   'nowrap',
          flexShrink:   0,
          transition:   'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
      >
        Restart & Update
      </button>

      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default UpdateBanner;