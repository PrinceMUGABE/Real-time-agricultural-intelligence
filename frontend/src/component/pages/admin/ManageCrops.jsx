import { useState } from "react";

const initialCrops = [
  { id: 1, name: "Potatoes",  grade: "A", quantity: 1000, harvestDate: "2026-02-09", status: "ready" },
  { id: 2, name: "Coffee",    grade: "C", quantity: 500,  harvestDate: "2026-04-08", status: "growing" },
  { id: 3, name: "Maize",     grade: "B", quantity: 600,  harvestDate: "2026-02-03", status: "ready" },
  { id: 4, name: "Beans",     grade: "A", quantity: 700,  harvestDate: "2026-04-08", status: "growing" },
];

const empty = { name: "", grade: "A", quantity: "", harvestDate: "", status: "growing" };

const statusStyle = {
  ready:   { bg: "#e8f5e9", color: "#2e7d32", label: "Ready" },
  growing: { bg: "#fff8e1", color: "#d4920a", label: "growing" },
};

function fmt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function ManageCrops() {
  const [crops, setCrops]       = useState(initialCrops);
  const [search, setSearch]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(empty);
  const [nextId, setNextId]     = useState(5);

  const openAdd  = () => { setForm(empty); setEditId(null); setModalOpen(true); };
  const openEdit = (crop) => {
    setForm({ name: crop.name, grade: crop.grade, quantity: crop.quantity, harvestDate: crop.harvestDate, status: crop.status });
    setEditId(crop.id); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(empty); };

  const handleSave = () => {
    if (!form.name.trim() || !form.quantity || !form.harvestDate) return;
    if (editId !== null) {
      setCrops(p => p.map(c => c.id === editId ? { ...c, ...form, quantity: Number(form.quantity) } : c));
    } else {
      setCrops(p => [...p, { id: nextId, ...form, quantity: Number(form.quantity) }]);
      setNextId(n => n + 1);
    }
    closeModal();
  };

  const handleDelete = (id) => setCrops(p => p.filter(c => c.id !== id));

  const filtered = crops.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalQty = crops.reduce((s, c) => s + c.quantity, 0);
  const growing  = crops.filter(c => c.status === "growing").length;
  const ready    = crops.filter(c => c.status === "ready").length;

  const summaryCards = [
    { label: "Total Crops", value: crops.length, iconBg: "#f0f0f0",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: "Growing", value: growing, iconBg: "#fff8e6",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4920a" strokeWidth="1.6"><path d="M12 22V12"/><path d="M5 3s.55 7 7 9"/><path d="M19 3s-.55 7-7 9"/></svg> },
    { label: "Ready to Harvest", value: ready, iconBg: "#edf7ee",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.6"><path d="M12 22V12"/><path d="M20 7s-4 0-8 5-8 5-8 5"/><path d="M4 7s4 0 8 5 8 5 8 5"/></svg> },
    { label: "Total Quantity", value: `${totalQty.toLocaleString()} kg`, iconBg: "#edf4ff",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><path d="M8 7V5a2 2 0 0 0-4 0v2"/></svg> },
  ];

  return (
    <div className="cd-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .cd-root { font-family: 'DM Sans', sans-serif; color: #1a1a1a; }

        .cd-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 22px; flex-wrap: wrap; gap: 12px;
        }
        .cd-header-left h1 { font-size: 21px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
        .cd-header-left p  { font-size: 13px; color: #999; margin-top: 3px; }
        .add-crop-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 9px; border: none;
          background: #1a3a1a; color: #fff;
          font-size: 13.5px; font-weight: 600; cursor: pointer;
          transition: background 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .add-crop-btn:hover { background: #2e7d32; }

        /* SUMMARY */
        .summary-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 14px; margin-bottom: 22px;
        }
        .summary-card {
          background: #fff; border-radius: 16px; padding: 18px 20px 20px;
          border: 1px solid #ececec; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .summary-card-top {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        .summary-label { font-size: 12px; color: #888; font-weight: 500; }
        .summary-icon-wrap {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .summary-value { font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -1px; }

        /* OUTER CONTAINER */
        .crop-list-card {
          background: #fff; border-radius: 16px;
          border: 1px solid #ececec; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .crop-list-header {
          padding: 18px 22px 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; border-bottom: 1px solid #f5f5f5;
        }
        .crop-list-title h3 { font-size: 14.5px; font-weight: 700; color: #1a1a1a; }
        .crop-list-title p  { font-size: 12px; color: #bbb; margin-top: 2px; }
        .crop-list-controls { display: flex; align-items: center; gap: 10px; }

        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-wrap svg { position: absolute; left: 10px; color: #bbb; pointer-events: none; }
        .search-input {
          padding: 8px 12px 8px 32px; border-radius: 8px;
          border: 1.5px solid #e8e8e8; font-size: 12.5px; color: #333;
          outline: none; width: 190px; font-family: 'DM Sans', sans-serif;
          background: #fafafa; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #2e7d32; background: #fff; }
        .search-input::placeholder { color: #bbb; }

        .year-select {
          padding: 8px 32px 8px 12px; border-radius: 8px;
          border: 1.5px solid #e8e8e8; font-size: 12.5px; color: #555;
          outline: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          background: #fafafa;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
        }
        .view-all-btn {
          padding: 8px 20px; border-radius: 8px;
          border: 1.5px solid #1a3a1a; background: transparent;
          color: #1a3a1a; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .view-all-btn:hover { background: #1a3a1a; color: #fff; }

        /* ── CROP CARDS GRID ── */
        .crop-cards-wrapper {
          padding: 18px 18px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        /* Each crop = its own card */
        .crop-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 14px;
          padding: 16px 16px 14px;
          box-shadow: 0 1px 5px rgba(0,0,0,0.05);
          transition: box-shadow 0.2s, transform 0.2s;
          position: relative;
        }
        .crop-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.09);
          transform: translateY(-1px);
        }

        .crop-card-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; margin-bottom: 2px;
        }
        .crop-name  { font-size: 15px; font-weight: 700; color: #1a1a1a; }
        .crop-grade { font-size: 12px; color: #999; margin-bottom: 14px; }

        .crop-status-badge {
          padding: 3px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
          flex-shrink: 0;
        }

        .crop-detail {
          display: flex; align-items: center; gap: 7px;
          font-size: 12.5px; color: #444; margin-bottom: 7px;
        }
        .crop-detail:last-of-type { margin-bottom: 0; }
        .crop-detail svg { color: #2e7d32; flex-shrink: 0; }

        /* Edit + Delete stacked bottom-right */
        .crop-actions {
          position: absolute; right: 13px; bottom: 13px;
          display: flex; flex-direction: column; gap: 5px; align-items: center;
        }
        .action-btn {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s;
        }
        .action-btn.edit   { background: #edf4ff; color: #3b82f6; }
        .action-btn.edit:hover   { background: #3b82f6; color: #fff; }
        .action-btn.delete { background: #fff0f0; color: #ef5350; }
        .action-btn.delete:hover { background: #ef5350; color: #fff; }

        /* MODAL */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.42);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1);
          overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header {
          padding: 22px 24px 18px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #f0f0f0;
        }
        .modal-header h2 { font-size: 16px; font-weight: 700; color: #1a1a1a; }
        .modal-header p  { font-size: 12px; color: #aaa; margin-top: 2px; }
        .modal-close {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          background: #f5f5f5; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s; color: #666;
        }
        .modal-close:hover { background: #fee; color: #ef5350; }
        .modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #555; letter-spacing: 0.2px; }
        .form-input, .form-select {
          padding: 10px 14px; border-radius: 9px;
          border: 1.5px solid #e8e8e8; font-size: 13px; color: #1a1a1a;
          outline: none; font-family: 'DM Sans', sans-serif;
          background: #fafafa; transition: border-color 0.2s, background 0.2s; width: 100%;
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
        .modal-footer {
          padding: 0 24px 22px;
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .btn-cancel {
          padding: 10px 22px; border-radius: 9px;
          border: 1.5px solid #e0e0e0; background: #fff;
          color: #666; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-cancel:hover { border-color: #ccc; background: #f5f5f5; }
        .btn-save {
          padding: 10px 26px; border-radius: 9px; border: none;
          background: #1a3a1a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.2s; font-family: 'DM Sans', sans-serif;
        }
        .btn-save:hover { background: #2e7d32; }

        .empty-state { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }

        @media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) {
          .crop-cards-wrapper { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HEADER */}
      <div className="cd-header">
        <div className="cd-header-left">
          <h1>Crop Data Entry</h1>
          <p>Manage your crop inventory</p>
        </div>
        <button className="add-crop-btn" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Crop
        </button>
      </div>

      {/* SUMMARY */}
      <div className="summary-grid">
        {summaryCards.map((card) => (
          <div className="summary-card" key={card.label}>
            <div className="summary-card-top">
              <span className="summary-label">{card.label}</span>
              <div className="summary-icon-wrap" style={{ background: card.iconBg }}>{card.icon}</div>
            </div>
            <div className="summary-value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* CROP LIST */}
      <div className="crop-list-card">
        <div className="crop-list-header">
          <div className="crop-list-title">
            <h3>Crops List - Farm A</h3>
            <p>All crops on the farm</p>
          </div>
          <div className="crop-list-controls">
            <div className="search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="search-input" placeholder="Search anything..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="year-select"><option>This Year</option><option>Last Year</option></select>
            <button className="view-all-btn">View all</button>
          </div>
        </div>

        <div className="crop-cards-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>No crops found.</div>
          ) : filtered.map((crop) => {
            const st = statusStyle[crop.status] || statusStyle.growing;
            return (
              <div className="crop-card" key={crop.id}>
                {/* Top row: name + badge */}
                <div className="crop-card-top">
                  <div className="crop-name">{crop.name}</div>
                  <span className="crop-status-badge" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                {/* Grade */}
                <div className="crop-grade">Grade: {crop.grade}</div>

                {/* Details */}
                <div className="crop-detail">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  {crop.quantity.toLocaleString()} kg available
                </div>
                <div className="crop-detail">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Harvest: {fmt(crop.harvestDate)}
                </div>

                {/* Edit + Delete */}
                <div className="crop-actions">
                  <button className="action-btn edit" onClick={() => openEdit(crop)} title="Edit crop">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(crop.id)} title="Delete crop">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
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
                <h2>{editId !== null ? "Edit Crop" : "Add New Crop"}</h2>
                <p>{editId !== null ? "Update the crop details below" : "Fill in the details to add a new crop"}</p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>CROP NAME</label>
                <input className="form-input" placeholder="e.g. Tomatoes" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>GRADE</label>
                  <select className="form-select" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                    {["A","B","C","D"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>STATUS</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="growing">Growing</option>
                    <option value="ready">Ready to Harvest</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>QUANTITY (KG)</label>
                  <input className="form-input" type="number" placeholder="e.g. 500" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>HARVEST DATE</label>
                  <input className="form-input" type="date" value={form.harvestDate} onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-save" onClick={handleSave}>{editId !== null ? "Save Changes" : "Add Crop"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}