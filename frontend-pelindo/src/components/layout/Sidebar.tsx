/**
 * Komponen navigasi samping (Sidebar).
 * Saya buat ini sebagai komponen tersendiri agar bisa digunakan
 * di semua halaman dengan konsisten dan mudah di-maintain.
 *
 * Di mobile, sidebar akan disembunyikan dan bisa dibuka dengan tombol menu.
 */

import { NavLink, useNavigate } from 'react-router-dom';

interface SidebarProps {
  /** Apakah sidebar sedang terbuka (untuk mode mobile) */
  terbuka: boolean;
  /** Callback untuk menutup sidebar (mode mobile) */
  onTutup: () => void;
}

interface ItemNav {
  ke: string;
  ikon: string;
  label: string;
}

// Daftar item navigasi utama
const ITEM_NAV: ItemNav[] = [
  { ke: '/', ikon: 'dashboard', label: 'Dasbor' },
  { ke: '/pesan', ikon: 'add_box', label: 'Pemesanan Baru' },
  { ke: '/status', ikon: 'timer', label: 'Status Langsung' },
  { ke: '/riwayat', ikon: 'history', label: 'Riwayat' },
];

const Sidebar = ({ terbuka, onTutup }: SidebarProps) => {
  const navigate = useNavigate();

  const handleQuickScan = () => {
    // Navigasi ke halaman status sebagai simulasi "quick scan"
    navigate('/status');
    onTutup();
  };

  return (
    <>
      {/* Overlay gelap untuk mobile saat sidebar terbuka */}
      {terbuka && (
        <div
          className="sidebar-overlay"
          onClick={onTutup}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar ${terbuka ? 'sidebar--terbuka' : ''}`}
        aria-label="Navigasi utama"
      >
        {/* Header sidebar */}
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <div className="sidebar__avatar">
              <span className="material-symbols-outlined" aria-hidden="true">
                local_parking
              </span>
            </div>
            <div>
              <h2 className="sidebar__nama-terminal">Terminal Utama</h2>
              <p className="sidebar__facility-id">ID Fasilitas: P-8820</p>
            </div>
          </div>
        </div>

        {/* Tombol quick scan */}
        <button
          id="btn-quick-scan"
          className="sidebar__quick-scan-btn"
          onClick={handleQuickScan}
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            qr_code_scanner
          </span>
          Pindai Cepat
        </button>

        {/* Daftar menu navigasi */}
        <ul className="sidebar__nav-list" role="list">
          {ITEM_NAV.map((item) => (
            <li key={item.ke}>
              <NavLink
                to={item.ke}
                end={item.ke === '/'}
                className={({ isActive }) =>
                  `sidebar__nav-item ${isActive ? 'sidebar__nav-item--aktif' : ''}`
                }
                onClick={onTutup}
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {item.ikon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Footer sidebar — tautan pendukung */}
        <div className="sidebar__footer">
          <a href="#" className="sidebar__nav-item" aria-label="Bantuan">
            <span className="material-symbols-outlined" aria-hidden="true">
              contact_support
            </span>
            <span>Bantuan</span>
          </a>
          <a href="#" className="sidebar__nav-item" aria-label="Keluar">
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
            <span>Keluar</span>
          </a>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
