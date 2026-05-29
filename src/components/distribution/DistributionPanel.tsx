import React from 'react';
import { DistributionResult } from '../../types';
import { formatPeso } from '../../utils/helpers';
import { ProgressBar, CardHeader } from '../ui';

interface DistributionPanelProps {
  base: number;
  results: DistributionResult[];
}

const DistributionPanel: React.FC<DistributionPanelProps> = ({ base, results }) => (
  <div className="dist-card">
    <CardHeader
      title="Auto Distribution"
      subtitle="From total daily sales"
      action={<i className="ti ti-arrows-split-2" style={{ color: 'var(--blue-400)', fontSize: 18 }} aria-hidden="true" />}
    />

    <div className="dist-total">
      <div className="dist-total-label">Total Sales Base</div>
      <div className="dist-total-val">{formatPeso(base)}</div>
    </div>

    {results.map(r => (
      <div key={r.id} className="dist-item">
        <div className="dist-row">
          <span className="dist-name">{r.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="dist-pct"
              style={{ background: r.bgColor ?? '#eef2ff', color: r.color ?? '#3b82f6'}}
            >
              {r.percentage}%
            </span>
            <span className="dist-amount">{formatPeso(r.amount ?? 0)}</span>
          </div>
        </div>
        <ProgressBar value={r.percentage ?? 0} color={r.color ?? '#3b82f6'} /> 
      </div>
    ))}
  </div>
);

export default DistributionPanel;
