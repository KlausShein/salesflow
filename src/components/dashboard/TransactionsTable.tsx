import React from 'react';
import { Transaction } from '../../types';
import { formatPeso } from '../../utils/helpers';
import { Badge, CardHeader } from '../ui';

interface TransactionsTableProps {
  transactions: Transaction[];
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => (
  <div className="table-card">
    <CardHeader
      title="Recent Transactions"
      subtitle="Sales & expense records"
      action={<button className="ctab active" style={{ fontSize: 11 }}>View All</button>}
    />
    <table className="txn-table" aria-label="Transaction records">
      <thead>
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Description</th>
          <th scope="col">Amount</th>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">User</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(txn => (
          <tr key={txn.id}>
            <td>
              <Badge label={txn.type || 'OTHER'} variant={txn.type === 'SALE' ? 'sale' : 'expense'} />
            </td>
            <td style={{ color: 'var(--text)', fontSize: 12 }}>{txn.description}</td>
            <td>
              <span
                className="txn-amount"
                style={{ color: txn.amount >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
              >
                {txn.amount >= 0 ? '+' : '-'}{formatPeso(Math.abs(txn.amount))}
              </span>
            </td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{txn.date}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{txn.time}</td>
            <td style={{ color: 'var(--sub)', fontSize: 12 }}>{txn.user}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TransactionsTable;
