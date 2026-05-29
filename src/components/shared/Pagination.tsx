import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page, totalPages, total, perPage, onPage,
}) => {
  const from = Math.min((page - 1) * perPage + 1, total);
  const to   = Math.min(page * perPage, total);
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <div className="pagination-row">
      <span className="page-info">
        Showing {from} to {to} of {total} entries
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {page > 1 && (
          <button className="page-btn" onClick={() => onPage(page - 1)}>‹</button>
        )}
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn${page === p ? ' active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        {totalPages > 5 && page < totalPages && (
          <button className="page-btn" onClick={() => onPage(Math.min(page + 1, totalPages))}>›</button>
        )}
      </div>
    </div>
  );
};

export default Pagination;