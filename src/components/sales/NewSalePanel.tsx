import React from 'react';
import { SaleItem, DistributionResult } from '../../types';
import { formatPeso } from '../../utils/helpers';

interface NewSalePanelProps {
  items: SaleItem[];
  grandTotal: number;
  distPreview: DistributionResult[];
  onAdjustQty: (serviceId: string, delta: number) => void;
  onSetPrice: (serviceId: string, price: number) => void;
  onSave: () => void;
  onClear: () => void;
  saveSuccess: boolean;
}

const SERVICE_ICONS: Record<string, string> = {
  s1: '🖨️', s2: '📄', s3: '🗂️', s4: '🪪',
};

const NewSalePanel: React.FC<NewSalePanelProps> = ({
  items, grandTotal, distPreview, onAdjustQty, onSetPrice, onSave, onClear, saveSuccess,
}) => (
  <aside
    style={{
      width: 290, minWidth: 290, background: '#fff',
      borderLeft: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', overflowY: 'auto',
    }}
    aria-label="New Sale panel"
  >
    {/* Header */}
    <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>🧾 New Sale</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Add services & compute total</div>
    </div>

    <div style={{ padding: '14px 16px', flex: 1 }}>
      {/* Column headers */}
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>
        Services
      </div>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '0 0 6px', borderBottom: '1px solid var(--border)', gap: 8, marginBottom: 4 }}>
        <span style={{ flex: 1 }}>Item</span>
        <span style={{ width: 72, textAlign: 'center' }}>Qty</span>
        <span style={{ width: 68, textAlign: 'right' }}>Price</span>
        <span style={{ width: 62, textAlign: 'right' }}>Total</span>
      </div>

      {/* Service rows */}
      {items.map(item => (
        <div key={item.serviceId} className="service-item">
          <span style={{ fontSize: 15, flexShrink: 0 }}>{SERVICE_ICONS[item.serviceId] ?? '📦'}</span>
          <span className="svc-name">{item.serviceName}</span>
          <div className="qty-ctrl">
            <button className="qty-btn" onClick={() => onAdjustQty(item.serviceId, -1)} aria-label={`Decrease ${item.serviceName} quantity`}>−</button>
            <span className="qty-val">{item.qty}</span>
            <button className="qty-btn" onClick={() => onAdjustQty(item.serviceId, 1)} aria-label={`Increase ${item.serviceName} quantity`}>+</button>
          </div>
          <input
            className="price-input"
            type="number"
            value={item.unitPrice}
            min={0}
            step={0.5}
            onChange={e => onSetPrice(item.serviceId, parseFloat(e.target.value) || 0)}
            aria-label={`Unit price for ${item.serviceName}`}
          />
          <span className="svc-total" style={{ color: item.total > 0 ? 'var(--blue-400)' : 'var(--muted)' }}>
            {formatPeso(item.total)}
          </span>
        </div>
      ))}

      {/* Total summary box */}
      <div style={{ marginTop: 12, padding: 12, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--sub)' }}>Subtotal</span>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{formatPeso(grandTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--sub)' }}>Discount</span>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: 'var(--red)' }}>-₱0.00</span>
        </div>
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Grand Total</span>
          <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: 'var(--blue-400)' }}>
            {formatPeso(grandTotal)}
          </span>
        </div>
      </div>

      {/* Save / Clear buttons */}
      <button
        className="btn-save"
        style={{
          marginTop: 12,
          background: saveSuccess ? '#10b981' : undefined,
          transition: 'background .3s',
        }}
        onClick={onSave}
        disabled={saveSuccess}
      >
        <i className="ti ti-device-floppy" style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }} aria-hidden="true" />
        {saveSuccess ? '✓ Sale Saved!' : 'Save Sale'}
      </button>
      <button
        style={{ width: '100%', padding: 8, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}
        onClick={onClear}
      >
        <i className="ti ti-x" style={{ fontSize: 12, verticalAlign: -1, marginRight: 4 }} aria-hidden="true" />
        Clear
      </button>

      {/* Distribution preview */}
      {distPreview.length > 0 && grandTotal > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>
            Distribution Preview
          </div>
          <div className="dist-mini-grid">
            {distPreview.map(r => (
              <div key={r.id} className="dist-mini-item">
                <div className="dmi-label" style={{ color: r.color }}>{r.name}</div>
                <div className="dmi-val" style={{ color: r.color }}>{formatPeso(r.amount ?? 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </aside>
);

export default NewSalePanel;
