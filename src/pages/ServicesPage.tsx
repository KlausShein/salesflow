import React, { useState, useMemo } from 'react';
import { Service } from '../types';
import { Pagination, Modal, ActionBtns } from './shared';

interface ServicesPageProps {
  services: Service[];
  onAdd: (s: Omit<Service,'id'>) => void;
  onToggle: (id: string) => void;
}

const PER = 8;

const ServicesPage: React.FC<ServicesPageProps> = ({ services, onAdd, onToggle }) => {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:'', unit:'pcs', price:'' });

  const rows = services.slice((page-1)*PER, page*PER);
  const totalPages = Math.ceil(services.length / PER);

  const save = () => {
    if (!form.name || !form.price) return;
    onAdd({ name:form.name, unit:form.unit, unitPrice:parseFloat(form.price), category:'other', isActive:true });
    setForm({ name:'', unit:'pcs', price:'' });
    setModal(false);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div><h1 className="page-title">Services</h1><p className="page-sub">Manage all services offered in your print shop</p></div>
        <button className="btn-primary" onClick={()=>setModal(true)}><i className="ti ti-plus" aria-hidden="true"/> Add Service</button>
      </div>

      <div className="page-card">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Service Name</th><th>Unit</th><th>Price</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((s,i)=>(
              <tr key={s.id}>
                <td className="row-num">{(page-1)*PER+i+1}</td>
                <td style={{fontWeight:600}}>{s.name}</td>
                <td style={{color:'var(--sub)'}}>{s.unit}</td>
                <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--blue-400)'}}>₱{s.unitPrice.toFixed(2)}</span></td>
                <td>
                  <span className="status-badge" style={{background:s.isActive?'#dcfce7':'#fee2e2',color:s.isActive?'#15803d':'#dc2626'}}>
                    {s.isActive?'Active':'Inactive'}
                  </span>
                </td>
                <td><ActionBtns onEdit={()=>onToggle(s.id)} onDelete={()=>{}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={services.length} perPage={PER} onPage={setPage}/>
      </div>

      {modal && (
        <Modal title="Add Service" onClose={()=>setModal(false)}>
          <label className="form-label">Service Name</label>
          <input className="form-input" placeholder="e.g. Document Printing" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <label className="form-label" style={{marginTop:12}}>Unit</label>
          <select className="form-input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
            {['pcs','sqm','copy','sheet','set'].map(u=><option key={u}>{u}</option>)}
          </select>
          <label className="form-label" style={{marginTop:12}}>Price (₱)</label>
          <input className="form-input" type="number" placeholder="0.00" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/>
          <div style={{display:'flex',gap:8,marginTop:18}}>
            <button className="btn-primary" style={{flex:1}} onClick={save}>Save Service</button>
            <button className="btn-ghost" style={{flex:1}} onClick={()=>setModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default ServicesPage;
