import React, { useState } from 'react';
import { ChartDataPoint } from '../../types';
import { WEEKLY_CHART_DATA } from '../../data/seed';
import { CardHeader } from '../ui';

type ChartPeriod = 'Week' | 'Month' | 'Year';

const SalesChart: React.FC = () => {
  const [period, setPeriod] = useState<ChartPeriod>('Week');
  const data: ChartDataPoint[] = WEEKLY_CHART_DATA;

  const W = 500, H = 180;
  const pad = { t: 20, r: 20, b: 30, l: 44 };
  const gW = W - pad.l - pad.r;
  const gH = H - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.value)) * 1.15;
  const px = (i: number) => pad.l + (i * gW) / (data.length - 1);
  const py = (v: number) => pad.t + gH - (v / max) * gH;

  const pts = data.map((d, i) => ({ x: px(i), y: py(d.value) }));

  let linePath = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    linePath += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`;

  const tabs: ChartPeriod[] = ['Week', 'Month', 'Year'];

  return (
    <div className="chart-card">
      <CardHeader
        title="Sales Analytics"
        subtitle="Weekly revenue trend"
        action={
          <div className="chart-tabs">
            {tabs.map(t => (
              <button key={t} className={`ctab ${period === t ? 'active' : ''}`} onClick={() => setPeriod(t)}>
                {t}
              </button>
            ))}
          </div>
        }
      />
      <div className="chart-svg-wrap">
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
          aria-label="Weekly sales chart"
          role="img"
        >
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = pad.t + (i * gH) / 4;
            const val = Math.round(max - (i * max) / 4);
            const label = val >= 1000 ? `₱${(val / 1000).toFixed(1)}k` : `₱${val}`;
            return (
              <g key={i}>
                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="Plus Jakarta Sans">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chart-area-grad)" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data points */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === 5 ? 5 : 3}
              fill={i === 5 ? '#2563eb' : '#93c5fd'}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={px(i)}
              y={H - pad.b + 16}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
              fontFamily="Plus Jakarta Sans"
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default SalesChart;
