import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { formatPeso } from '../utils/helpers';
import { Pagination, Modal, ActionBtns } from './shared';

interface InventoryPageProps {
  items: InventoryItem[];
  onAdd: (item: Omit<InventoryItem,'id'>) => void;
}

const STATUS_STYLE: Record<string, {bg:string;color:string}> = {
  'In Stock':     {bg:'#dcfce7', color:'#15803d'},
  'Low Stock':    {bg:'#fef3c7', color:'#b45309'},
  'Out of Stock': {bg:'#fee2e2', color:'#dc2626'},
};
const PER = 6;
const CATS = ['All Categories','Paper','Ink','Supplies'];
const STATUSES = ['All Status','In Stock','Low Stock','Out of Stock'];

const InventoryPage: React.FC<InventoryPageProps> = ({ items, onAdd }) => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:'', category:'Paper', stock:'', unit:'ream', unitCost:'' });

  const filtered = useMemo(() => items.filter(it =>
    it.name.toLowerCase().includes(search.toLowerCase()) &&
    (cat==='All Categories'||it.category===cat) &&
    (statusFilter==='All Status'||it.status===statusFilter)
  ), [items,search,cat,statusFilter]);

  const totalPages = Math.ceil(filtered.length/PER);
  const rows = filtered.slice((page-1)*PER, page*PER);

  const totalItems = items.length;
  const lowStock = items.filter(i=>i.status==='Low Stock').length;
  const outOfStock = items.filter(i=>i.status==='Out of Stock').length;
  const totalValue = items.reduce((s,i)=>s+i.totalValue,0);

  const save = () => {
    if (!form.name||!form.stock||!form.unitCost) return;
    const stock=parseInt(form.stock); const uc=parseFloat(form.unitCost);
    const status: InventoryItem['status'] = stock===0?'Out of Stock':stock<10?'Low Stock':'In Stock';
    onAdd({name:form.name,category:form.category,stock,unit:form.unit,unitCost:uc,totalValue:stock*uc,status});
    setForm({name:'',category:'Paper',stock:'',unit:'ream',unitCost:''});
    setModal(false);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-sub">Track and manage your stocks and materials</p></div>
        <button className="btn-primary" onClick={()=>setModal(true)}><i className="ti ti-plus" aria-hidden="true"/> Add Item</button>
      </div>

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Total Items',       value:String(totalItems), accent:'#2563eb', mono:false},
          {label:'Low Stock Items',   value:String(lowStock),   accent:'#f59e0b', mono:false, warn:true},
          {label:'Out of Stock',      value:String(outOfStock), accent:'#ef4444', mono:false, danger:true},
          {label:'Total Stock Value', value:formatPeso(totalValue), accent:'#10b981'},
        ].map(c=>(
          <div key={c.label} className="stat-card" style={{borderTop:`3px solid ${c.accent}`,paddingTop:16}}>
            <div className="stat-label">{c.label}</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:c.mono===false?'inherit':"'JetBrains Mono',monospace",
              color:c.danger?'var(--red)':c.warn?'#b45309':'var(--text)',marginTop:6}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="page-card" style={{marginBottom:14}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{position:'relative',flex:1}}>
            <i className="ti ti-search" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:15}} aria-hidden="true"/>
            <input className="search-input" placeholder="Search inventory..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
          <select className="filter-select" value={cat} onChange={e=>{setCat(e.target.value);setPage(1);}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="page-card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Item Name</th><th>Category</th><th>Stock</th><th>Unit</th><th>Unit Cost</th><th>Total Value</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((it,i)=>{
              const ss=STATUS_STYLE[it.status];
              return(<tr key={it.id}>
                <td className="row-num">{(page-1)*PER+i+1}</td>
                <td style={{fontWeight:600}}>{it.name}</td>
                <td><span className="cat-badge" style={{background:'#f1f5f9',color:'#475569'}}>{it.category}</span></td>
                <td style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:it.stock===0?'var(--red)':it.stock<10?'#b45309':'var(--text)'}}>{it.stock}</td>
                <td style={{color:'var(--sub)'}}>{it.unit}</td>
                <td style={{fontFamily:"'JetBrains Mono',monospace"}}>₱{it.unitCost.toFixed(2)}</td>
                <td style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--blue-400)'}}>₱{it.totalValue.toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
                <td><span className="status-badge" style={{background:ss.bg,color:ss.color}}>{it.status}</span></td>
              </tr>);
            })}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER} onPage={setPage}/>
      </div>

      {modal && (
        <Modal title="Add Inventory Item" onClose={()=>setModal(false)}>
          <label className="form-label">Item Name</label>
          <input className="form-input" placeholder="e.g. Bond Paper (A4)" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
            <div>
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {['Paper','Ink','Supplies','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Unit</label>
              <select className="form-input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                {['ream','bottle','pack','roll','box','set'].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
            <div>
              <label className="form-label">Stock Qty</label>
              <input className="form-input" type="number" placeholder="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/>
            </div>
            <div>
              <label className="form-label">Unit Cost (₱)</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.unitCost} onChange={e=>setForm(f=>({...f,unitCost:e.target.value}))}/>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:18}}>
            <button className="btn-primary" style={{flex:1}} onClick={save}>Save Item</button>
            <button className="btn-ghost" style={{flex:1}} onClick={()=>setModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default InventoryPage;
