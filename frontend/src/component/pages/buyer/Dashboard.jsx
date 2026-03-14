import { useState } from "react";

const initialContracts = [
  { id: 1, ctrId: "CT00001", farmerId: "20001", buyerId: "10001", ctrValue: 1000,  dateCreated: "2026-01-05", status: "Full signed",          location: "Kigali" },
  { id: 2, ctrId: "CT00002", farmerId: "20001", buyerId: "10001", ctrValue: 200,   dateCreated: "2026-01-05", status: "Full signed",          location: "Kigali" },
  { id: 3, ctrId: "CT00003", farmerId: "20004", buyerId: "10002", ctrValue: 500,   dateCreated: "2026-01-05", status: "Pending on Buyer Side", location: "Huye" },
  { id: 4, ctrId: "CT00004", farmerId: "20007", buyerId: "10001", ctrValue: 200,   dateCreated: "2026-01-05", status: "Full signed",          location: "Kigali" },
  { id: 5, ctrId: "CT00005", farmerId: "20008", buyerId: "10001", ctrValue: 500,   dateCreated: "2026-01-05", status: "Pending on Buyer Side", location: "Musanze" },
  { id: 6, ctrId: "CT00006", farmerId: "20005", buyerId: "10002", ctrValue: 1350,  dateCreated: "2026-01-05", status: "Full signed",          location: "Rubavu" },
];

const LOCATIONS = ["Kigali", "Huye", "Musanze", "Rubavu", "Nyagatare"];
const STATUSES  = ["Full signed", "Pending on Buyer Side", "Pending on Farmer Side", "Cancelled"];

const emptyForm = {
  farmerId: "", buyerId: "", ctrValue: "", dateCreated: "", status: "Full signed", location: "Kigali",
};

const statusStyle = {
  "Full signed":           { bg: "#e8f5e9", color: "#2e7d32" },
  "Pending on Buyer Side": { bg: "#fff8e1", color: "#d4920a" },
  "Pending on Farmer Side":{ bg: "#fff3e0", color: "#e65100" },
  "Cancelled":             { bg: "#fce4ec", color: "#c62828" },
};

function fmt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function BuyerDashboard() {
  const [contracts, setContracts]   = useState(initialContracts);
  const [locFilter, setLocFilter]   = useState("Pick by Location");
  const [statusFilter, setStatusFilter] = useState("Status");
  const [search, setSearch]         = useState("");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [nextId, setNextId]         = useState(7);

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (c) => {
    setForm({ farmerId: c.farmerId, buyerId: c.buyerId, ctrValue: c.ctrValue, dateCreated: c.dateCreated, status: c.status, location: c.location });
    setEditId(c.id); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const handleSave = () => {
    if (!form.farmerId.trim() || !form.buyerId.trim() || !form.ctrValue) return;
    if (editId !== null) {
      setContracts(p => p.map(c => c.id === editId ? { ...c, ...form, ctrValue: Number(form.ctrValue) } : c));
    } else {
      const newCtrId = `CT${String(nextId).padStart(5, "0")}`;
      setContracts(p => [...p, { id: nextId, ctrId: newCtrId, ...form, ctrValue: Number(form.ctrValue) }]);
      setNextId(n => n + 1);
    }
    closeModal();
  };

  const handleDelete = (id) => setContracts(p => p.filter(c => c.id !== id));

  const filtered = contracts.filter(c => {
    const matchLoc    = locFilter === "Pick by Location" || c.location === locFilter;
    const matchStatus = statusFilter === "Status" || c.status === statusFilter;
    const matchSearch = c.ctrId.toLowerCase().includes(search.toLowerCase()) ||
                        c.farmerId.includes(search) || c.buyerId.includes(search);
    return matchLoc && matchStatus && matchSearch;
  });

  return (
    <div className="cm-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .cm-root { font-family: 'DM Sans', sans-serif; color: #1a1a1a; }

        /* PAGE HEADER */
        .cm-page-header { margin-bottom: 20px; }
        .cm-page-header h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
        .cm-page-header p  { font-size: 13px; color: #999; margin-top: 3px; }

        /* TOP ACTION ROW */
        .cm-action-row {
          display: flex; justify-content: flex-end; margin-bottom: 20px;
        }
        .create-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 11px 22px; border-radius: 10px; border: none;
          background: #111; color: #fff;
          font-size: 13.5px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: background 0.2s;
        }
        .create-btn:hover { background: #1a3a1a; }

        /* OUTER CARD */
        .cm-outer-card {
          background: #fff; border-radius: 16px;
          border: 1px solid #ececec; box-shadow: 0 1px 8px rgba(0,0,0,0.05);
          padding: 22px;
        }

        /* CARD HEADER */
        .cm-card-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 22px; gap: 12px; flex-wrap: wrap;
        }
        .cm-card-header-left h3 { font-size: 15px; font-weight: 700; color: #1a1a1a; }
        .cm-card-header-left p  { font-size: 12px; color: #bbb; margin-top: 2px; }
        .cm-card-header-right   { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .filter-select {
          padding: 8px 30px 8px 12px; border-radius: 8px;
          border: 1.5px solid #e0e0e0; font-size: 12.5px; color: #555;
          outline: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          background: #fff; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; min-width: 150px;
        }
        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-wrap svg { position: absolute; right: 10px; color: #bbb; pointer-events: none; }
        .search-input {
          padding: 8px 32px 8px 12px; border-radius: 8px;
          border: 1.5px solid #e0e0e0; font-size: 12.5px; color: #333;
          outline: none; width: 200px; font-family: 'DM Sans', sans-serif;
          background: #fff; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #2e7d32; }
        .search-input::placeholder { color: #bbb; }

        /* TABLE HEADER */
        .cm-table-header {
          display: grid;
          grid-template-columns: 110px 110px 110px 100px 130px 1fr 100px;
          padding: 10px 12px 10px;
          border-bottom: 1.5px dashed #e8e8e8;
          margin-bottom: 4px;
        }
        .cm-table-header span {
          font-size: 12px; font-weight: 700; color: #aaa; letter-spacing: 0.3px;
        }

        /* CONTRACT ROWS */
        .cm-rows { display: flex; flex-direction: column; }

        .cm-row {
          display: grid;
          grid-template-columns: 110px 110px 110px 100px 130px 1fr 100px;
          align-items: center;
          padding: 13px 12px;
          border-bottom: 1px solid #f5f5f5;
          transition: background 0.15s;
          border-radius: 0;
        }
        .cm-row:last-child { border-bottom: none; }
        .cm-row:hover { background: #fafafa; }

        .cm-cell {
          font-size: 13px; color: #333; padding-right: 8px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cm-cell.ctr-id  { font-weight: 700; color: #1a1a1a; }
        .cm-cell.farmer  { color: #555; }
        .cm-cell.buyer   { color: #555; }
        .cm-cell.value   { font-weight: 600; color: #1a1a1a; }
        .cm-cell.date    { color: #777; }

        .status-badge {
          display: inline-block; padding: 4px 12px; border-radius: 20px;
          font-size: 11.5px; font-weight: 600; white-space: nowrap;
        }

        .cm-actions { display: flex; align-items: center; gap: 6px; }
        .action-icon-btn {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s;
        }
        .action-icon-btn.del  { background: #fff0f0; color: #ef5350; }
        .action-icon-btn.del:hover  { background: #ef5350; color: #fff; }
        .action-icon-btn.edit { background: transparent; color: #888; }
        .action-icon-btn.edit:hover { background: #edf4ff; color: #3b82f6; }

        .empty-state { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }

        /* MODAL */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 500px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1); overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          padding: 22px 24px 18px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #f0f0f0;
        }
        .modal-header h2 { font-size: 16px; font-weight: 700; color: #1a1a1a; }
        .modal-header p  { font-size: 12px; color: #aaa; margin-top: 2px; }
        .modal-close {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          background: #f5f5f5; cursor: pointer; color: #666;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .modal-close:hover { background: #fee; color: #ef5350; }
        .modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 15px; }
        .form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #555; letter-spacing: 0.2px; }
        .form-input, .form-select {
          padding: 10px 14px; border-radius: 9px;
          border: 1.5px solid #e8e8e8; font-size: 13px; color: #1a1a1a;
          outline: none; font-family: 'DM Sans', sans-serif;
          background: #fafafa; transition: border-color 0.2s, box-shadow 0.2s; width: 100%;
        }
        .form-input:focus, .form-select:focus {
          border-color: #2e7d32; background: #fff;
          box-shadow: 0 0 0 3px rgba(46,125,50,0.08);
        }
        .form-input::placeholder { color: #bbb; }
        .form-select {
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
        }
        .modal-footer { padding: 0 24px 22px; display: flex; gap: 10px; justify-content: flex-end; }
        .btn-cancel {
          padding: 10px 22px; border-radius: 9px;
          border: 1.5px solid #e0e0e0; background: #fff;
          color: #666; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-cancel:hover { background: #f5f5f5; }
        .btn-save {
          padding: 10px 26px; border-radius: 9px; border: none;
          background: #1a3a1a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-save:hover { background: #2e7d32; }

        @media (max-width: 800px) {
          .cm-table-header, .cm-row { grid-template-columns: 90px 90px 90px 80px 110px 1fr 80px; }
          .search-input { width: 150px; }
        }
        @media (max-width: 600px) {
          .cm-table-header { display: none; }
          .cm-row { grid-template-columns: 1fr 1fr; gap: 6px; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div className="cm-page-header">
        <h1>Contracts Management</h1>
        <p>View and manage all contracts</p>
      </div>

      {/* TOP ACTION ROW */}
      <div className="cm-action-row">
        <button className="create-btn" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Contract
        </button>
      </div>

      {/* OUTER CARD */}
      <div className="cm-outer-card">
        {/* Card header */}
        <div className="cm-card-header">
          <div className="cm-card-header-left">
            <h3>All Contracts</h3>
            <p>Contracts directory</p>
          </div>
          <div className="cm-card-header-right">
            <select className="filter-select" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
              <option>Pick by Location</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 120 }}>
              <option>Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="search-wrap">
              <input className="search-input" placeholder="Search anything..." value={search} onChange={e => setSearch(e.target.value)} />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>

        {/* TABLE HEADER */}
        <div className="cm-table-header">
          <span>Ctr_Id</span>
          <span>Farmer_Id</span>
          <span>Buyer_Id</span>
          <span>Ctr_Value</span>
          <span>Date_Created</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {/* ROWS */}
        <div className="cm-rows">
          {filtered.length === 0 ? (
            <div className="empty-state">No contracts found.</div>
          ) : filtered.map(c => {
            const st = statusStyle[c.status] || statusStyle["Full signed"];
            return (
              <div className="cm-row" key={c.id}>
                <div className="cm-cell ctr-id">{c.ctrId}</div>
                <div className="cm-cell farmer">{c.farmerId}</div>
                <div className="cm-cell buyer">{c.buyerId}</div>
                <div className="cm-cell value">$ {c.ctrValue.toLocaleString()}</div>
                <div className="cm-cell date">{fmt(c.dateCreated)}</div>
                <div className="cm-cell">
                  <span className="status-badge" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                </div>
                <div className="cm-cell">
                  <div className="cm-actions">
                    <button className="action-icon-btn del" onClick={() => handleDelete(c.id)} title="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                    <button className="action-icon-btn edit" onClick={() => openEdit(c)} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{editId !== null ? "Edit Contract" : "Create Contract"}</h2>
                <p>{editId !== null ? "Update the contract details below" : "Fill in the details to create a new contract"}</p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>FARMER ID</label>
                  <input className="form-input" placeholder="e.g. 20001" value={form.farmerId} onChange={e => setForm(f => ({ ...f, farmerId: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>BUYER ID</label>
                  <input className="form-input" placeholder="e.g. 10001" value={form.buyerId} onChange={e => setForm(f => ({ ...f, buyerId: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>CONTRACT VALUE ($)</label>
                  <input className="form-input" type="number" placeholder="e.g. 1000" value={form.ctrValue} onChange={e => setForm(f => ({ ...f, ctrValue: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>DATE CREATED</label>
                  <input className="form-input" type="date" value={form.dateCreated} onChange={e => setForm(f => ({ ...f, dateCreated: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>STATUS</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>LOCATION</label>
                  <select className="form-select" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                    {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave}>{editId !== null ? "Save Changes" : "Create Contract"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}