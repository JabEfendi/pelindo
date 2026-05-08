/**
 * Komponen bar atas (TopBar) yang muncul di setiap halaman.
 * Berisi tombol hamburger menu (mobile), nama aplikasi, dan
 * kolom pencarian cepat.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  /** Callback untuk membuka/menutup sidebar di mode mobile */
  onToggleSidebar: () => void;
}

const TopBar = ({ onToggleSidebar }: TopBarProps) => {
  const [kataPencarian, setKataPencarian] = useState('');
  const navigate = useNavigate();

  // Arahkan ke halaman riwayat saat user menekan Enter di kolom pencarian
  const handleCari = (e: React.FormEvent) => {
    e.preventDefault();
    if (kataPencarian.trim()) {
      navigate(`/riwayat?cari=${encodeURIComponent(kataPencarian.trim())}`);
      setKataPencarian('');
    }
  };

  return (
    <header className="topbar" role="banner">
      {/* Tombol hamburger — hanya tampil di mobile */}
      <button
        id="btn-hamburger"
        className="topbar__hamburger"
        onClick={onToggleSidebar}
        aria-label="Buka menu navigasi"
        type="button"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          menu
        </span>
      </button>

      {/* Nama aplikasi */}
      <div className="topbar__brand" aria-label="Nama aplikasi">
        <span className="material-symbols-outlined topbar__brand-ikon" aria-hidden="true">
          local_parking
        </span>
        <span className="topbar__brand-nama">ParkMaster</span>
      </div>

      {/* Kolom pencarian cepat — disembunyikan di layar kecil */}
      <form
        className="topbar__search-form"
        onSubmit={handleCari}
        role="search"
        aria-label="Pencarian cepat"
      >
        <span className="material-symbols-outlined topbar__search-ikon" aria-hidden="true">
          search
        </span>
        <input
          id="input-pencarian-cepat"
          className="topbar__search-input"
          type="search"
          placeholder="Cari zona, plat kendaraan..."
          value={kataPencarian}
          onChange={(e) => setKataPencarian(e.target.value)}
          aria-label="Cari zona atau plat kendaraan"
        />
      </form>

      {/* Tombol aksi di kanan */}
      <div className="topbar__actions">
        <button
          id="btn-notifikasi"
          className="topbar__action-btn"
          aria-label="Notifikasi"
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </button>
        <button
          id="btn-pengaturan"
          className="topbar__action-btn topbar__action-btn--desktop"
          aria-label="Pengaturan"
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            settings
          </span>
        </button>
        <button
          id="btn-bantuan"
          className="topbar__action-btn topbar__action-btn--desktop"
          aria-label="Bantuan"
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            help
          </span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
