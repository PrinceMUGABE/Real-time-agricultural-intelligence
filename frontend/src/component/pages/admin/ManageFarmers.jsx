import { useState } from "react";

const allFarmers = [
  { id: 1,  name: "Uwayo Clover",       location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 2,  name: "Muhire Christine",   location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 3,  name: "Bayishime Sosthene", location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 4,  name: "Umuton Valerie",     location: "Kigali city - Rwanda", crops: ["Rice", "Avocado"],        rating: 0 },
  { id: 5,  name: "Uwase Benie",        location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 6,  name: "Mutangana Yvan",     location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 7,  name: "Beza Honorine",      location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 8,  name: "Uwishimwe Tonny",    location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 9,  name: "Uwayo Theaneste",    location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 10, name: "Ishimwe Germaine",   location: "Kigali city - Rwanda", crops: ["Rice", "Avocado", "Tea"], rating: 0 },
  { id: 11, name: "Nkurunziza Pierre",  location: "Huye - Rwanda",        crops: ["Maize", "Beans"],         rating: 0 },
  { id: 12, name: "Mukamana Diane",     location: "Musanze - Rwanda",     crops: ["Irish Potatoes", "Tea"],  rating: 0 },
  { id: 13, name: "Habimana Eric",      location: "Rubavu - Rwanda",      crops: ["Rice", "Avocado"],        rating: 0 },
];

const ALL_CROPS = ["Rice", "Avocado", "Tea", "Maize", "Beans", "Irish Potatoes"];
const PAGE_SIZE = 10;

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "1px" }}>
      {[1,2,3,4,5].map(star => (
        <span
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          style={{
            fontSize: "17px", cursor: "pointer", lineHeight: 1,
            color: star <= (hovered || value) ? "#f9a825" : "#ddd",
            transition: "color 0.12s",
          }}
        >★</span>
      ))}
    </div>
  );
}

export default function FarmersPage() {
  const [farmers, setFarmers]       = useState(allFarmers);
  const [search, setSearch]         = useState("");
  const [cropFilter, setCropFilter] = useState("Pick Crop");
  const [page, setPage]             = useState(1);

  const setRating = (id, r) => setFarmers(p => p.map(f => f.id === id ? { ...f, rating: r } : f));

  const filtered = farmers.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase());
    const matchCrop   = cropFilter === "Pick Crop" || f.crops.includes(cropFilter);
    return matchSearch && matchCrop;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goPage     = (p) => { if (p >= 1 && p <= totalPages) setPage(p); };

  const getPageNums = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", totalPages - 2, totalPages - 1, totalPages];
    if (page >= totalPages - 2) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="fp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .fp-root { font-family: 'DM Sans', sans-serif; color: #1a1a1a; }

        /* PAGE TITLE — outside the global card */
        .fp-page-title { margin-bottom: 18px; }
        .fp-page-title h1 { font-size: 21px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
        .fp-page-title p  { font-size: 13px; color: #999; margin-top: 3px; }

        /* ── GLOBAL OUTER CARD ── */
        .farmers-outer-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 16px;
          box-shadow: 0 1px 8px rgba(0,0,0,0.05);
          padding: 18px 18px 18px;
        }

        /* Controls row inside the outer card */
        .farmers-controls-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
        }
        .farmers-controls-left h3  { font-size: 14.5px; font-weight: 700; color: #1a1a1a; }
        .farmers-controls-left p   { font-size: 12px; color: #bbb; margin-top: 2px; }
        .farmers-controls-right    { display: flex; align-items: center; gap: 10px; }

        .crop-select {
          padding: 8px 30px 8px 12px; border-radius: 8px;
          border: 1.5px solid #e0e0e0; font-size: 12.5px; color: #555;
          outline: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          background: #fff; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          min-width: 110px;
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

        /* ── INNER FARMER CARDS ── */
        .farmer-list {
          display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 16px;
        }

        .farmer-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 12px;
          padding: 11px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          display: flex; align-items: center; gap: 14px;
          transition: box-shadow 0.18s, transform 0.18s;
        }
        .farmer-card:hover {
          box-shadow: 0 4px 14px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }

        .farmer-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #f0f5f0; border: 1.5px solid #d0e8d0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .farmer-info { flex: 0 0 175px; min-width: 0; }
        .farmer-name {
          font-size: 13.5px; font-weight: 700; color: #1a1a1a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .farmer-location { font-size: 11px; color: #aaa; margin-top: 1px; }

        .farmer-crops { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
        .crop-tag {
          padding: 3px 12px; border-radius: 20px;
          border: 1px solid #ddd; background: #fff;
          font-size: 11.5px; color: #555; font-weight: 500; white-space: nowrap;
        }

        .farmer-stars { flex-shrink: 0; }

        .farmer-action-btn {
          width: 34px; height: 34px; border-radius: 9px; border: none;
          background: #1a3a1a; color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: background 0.18s;
        }
        .farmer-action-btn:hover { background: #2e7d32; }

        /* ── FOOTER inside outer card ── */
        .fp-footer {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
          padding-top: 14px;
          border-top: 1px solid #f0f0f0;
        }
        .showing-text { font-size: 12.5px; color: #2e7d32; font-weight: 600; }

        .pagination { display: flex; align-items: center; gap: 3px; }
        .pg-arrow {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          background: #f0f0f0; cursor: pointer; color: #555;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .pg-arrow:hover:not(:disabled) { background: #e0e0e0; }
        .pg-arrow:disabled { opacity: 0.3; cursor: default; }

        .pg-btn {
          width: 28px; height: 28px; border-radius: 7px; border: none;
          background: transparent; font-size: 12px; font-weight: 600; color: #555;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; transition: all 0.15s;
        }
        .pg-btn:hover { background: #f0f0f0; }
        .pg-btn.active { background: #1a3a1a; color: #fff; }

        .pg-ellipsis {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: #bbb;
        }

        .empty-state { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }

        @media (max-width: 680px) {
          .farmer-info { flex: 0 0 130px; }
          .farmers-controls-right { flex-wrap: wrap; }
          .search-input { width: 150px; }
        }
      `}</style>

      {/* PAGE TITLE — sits above the global card */}
      <div className="fp-page-title">
        <h1>Farmers</h1>
        <p>Manage your personal and farm information</p>
      </div>

      {/* ── GLOBAL OUTER CARD ── */}
      <div className="farmers-outer-card">

        {/* Controls row */}
        <div className="farmers-controls-row">
          <div className="farmers-controls-left">
            <h3>Farmers List</h3>
            <p>All farmers on this platform · {filtered.length} farmers</p>
          </div>
          <div className="farmers-controls-right">
            <select className="crop-select" value={cropFilter} onChange={e => { setCropFilter(e.target.value); setPage(1); }}>
              <option value="Pick Crop">Pick Crop</option>
              {ALL_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="search-wrap">
              <input
                className="search-input"
                placeholder="Search Names / Location..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Individual farmer cards */}
        <div className="farmer-list">
          {paginated.length === 0 ? (
            <div className="empty-state">No farmers found.</div>
          ) : paginated.map(farmer => (
            <div className="farmer-card" key={farmer.id}>
              <div className="farmer-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="farmer-info">
                <div className="farmer-name">{farmer.name}</div>
                <div className="farmer-location">{farmer.location}</div>
              </div>
              <div className="farmer-crops">
                {farmer.crops.map(c => <span className="crop-tag" key={c}>{c}</span>)}
              </div>
              <div className="farmer-stars">
                <StarRating value={farmer.rating} onChange={r => setRating(farmer.id, r)} />
              </div>
              <button className="farmer-action-btn" title="View farmer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Footer: showing text + pagination */}
        <div className="fp-footer">
          <span className="showing-text">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} results out of {filtered.length}
          </span>
          <div className="pagination">
            <button className="pg-arrow" onClick={() => goPage(page - 1)} disabled={page === 1}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            {getPageNums().map((n, i) =>
              n === "..." ? (
                <span className="pg-ellipsis" key={`e${i}`}>...</span>
              ) : (
                <button key={n} className={`pg-btn${page === n ? " active" : ""}`} onClick={() => goPage(n)}>
                  {n}
                </button>
              )
            )}
            <button className="pg-arrow" onClick={() => goPage(page + 1)} disabled={page === totalPages}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

      </div>{/* end outer card */}
    </div>
  );
}