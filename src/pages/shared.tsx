import React from 'react';

export const Pagination: React.FC<{
  page: number; totalPages: number; total: number; perPage: number; onPage: (p: number) => void;
}> = ({ page, totalPages, total, perPage, onPage }) => (
  <div className="pagination-row">
    <span className="page-info">
      Showing {Math.min((page-1)*perPage+1, total)} to {Math.min(page*perPage, total)} of {total} entries
    </span>
    <div style={{display:'flex',gap:4}}>
      {page > 1 && <button className="page-btn" onClick={()=>onPage(page-1)}>‹</button>}
      {Array.from({length: Math.min(totalPages, 5)}, (_,i)=>i+1).map(p=>(
        <button key={p} className={`page-btn${page===p?' active':''}`} onClick={()=>onPage(p)}>{p}</button>
      ))}
      {totalPages > 5 && page < totalPages && <button className="page-btn" onClick={()=>onPage(Math.min(page+1,totalPages))}>›</button>}
    </div>
  </div>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; width?: number }> =
  ({ title, onClose, children, width = 420 }) => (
    <div style={{position:'fixed',inset:0,background:'rgba(15,32,64,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width,maxWidth:'95vw',boxShadow:'0 24px 64px rgba(0,0,0,0.18)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:20,lineHeight:1,padding:2}}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );

export const ActionBtns: React.FC<{ onEdit?: ()=>void; onDelete?: ()=>void }> = ({ onEdit, onDelete }) => (
  <div style={{display:'flex',gap:6}}>
    <button className="action-btn-edit" onClick={onEdit}><i className="ti ti-pencil" aria-hidden="true"/></button>
    <button className="action-btn-del"  onClick={onDelete}><i className="ti ti-trash"  aria-hidden="true"/></button>
  </div>
);
