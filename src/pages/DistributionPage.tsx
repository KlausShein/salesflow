import React, { useState } from 'react';
import { DistributionCategory, SalesRecord } from '../types';
import { formatPeso, computeDistribution } from '../utils/helpers';

interface DistributionPageProps {
  categories: DistributionCategory[];
  salesRecords: SalesRecord[];
}

const DistributionPage: React.FC<DistributionPageProps> = ({ categories, salesRecords }) => {
  const totalSales = salesRecords.reduce((s, r) => s + r.amount, 0);
  const [customBase, setCustomBase] = useState('');

  const base    = customBase ? Math.max(0, parseFloat(customBase) || 0) : totalSales;
  const results = computeDistribution(base, categories);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Distribution</h1>
          <p className="page-sub" style={{ color: '#1f2937', fontWeight: 600 }}>
            Automatic financial distribution based on total sales
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Rules */}
        <div className="page-card">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Distribution Rules</div>
          <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, marginBottom: 18 }}>Fixed percentage allocation per category</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Category', 'Percentage'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 10.5, fontWeight: 700,
                    color: '#374151', textTransform: 'uppercase',
                    letterSpacing: '.7px', padding: '0 0 10px',
                    borderBottom: '1px solid rgba(0,0,0,0.12)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{
                      background: c.bgColor,
                      color: c.color,
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 6,
                      // Add a dark text shadow for readability on light colors
                      filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.15))',
                    }}>
                      {c.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '12px 0', fontWeight: 700, color: '#111827' }}>Total</td>
                <td style={{ padding: '12px 0' }}>
                  <span style={{ background: '#e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>100%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Computed results */}
        <div className="page-card">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Distribution (Based on Total Sales)</div>
          <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 500, marginBottom: 16 }}>Edit the base amount to simulate different totals</div>

          <div style={{
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Total Sales</span>
            <input
              style={{
                flex: 1, border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 7, padding: '6px 10px',
                fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
                color: '#111827', background: 'rgba(255,255,255,0.8)', outline: 'none'
              }}
              type="number"
              min="0"
              step="0.01"
              value={customBase !== '' ? customBase : String(totalSales)}
              onChange={(e) => setCustomBase(e.target.value)}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Category', 'Bar', 'Amount'].map((h) => (
                  <th key={h} style={{
                    textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: 10.5, fontWeight: 700, color: '#374151',
                    textTransform: 'uppercase', letterSpacing: '.7px',
                    padding: '0 0 10px', borderBottom: '1px solid rgba(0,0,0,0.12)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '9px 0', fontWeight: 600, color: '#111827' }}>
                    {r.name} ({r.percentage}%)
                  </td>
                  <td style={{ padding: '9px 16px 9px 0' }}>
                    <div style={{ height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden', width: 100 }}>
                      <div style={{ height: '100%', width: `${r.percentage}%`, background: r.color, borderRadius: 99 }} />
                    </div>
                  </td>
                  <td style={{
                    padding: '9px 0',
                    fontFamily: 'var(--mono)',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#fff',
                    textAlign: 'right',
                  }}>
                    {/* Colored pill for amount — much more readable */}
                    <span style={{
                      background: r.color,
                      padding: '3px 10px',
                      borderRadius: 7,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'inline-block',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    }}>
                      {formatPeso(r.amount || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            borderTop: '2px solid rgba(0,0,0,0.1)',
            marginTop: 10, paddingTop: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Total Distributed</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>
              {formatPeso(base)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DistributionPage;