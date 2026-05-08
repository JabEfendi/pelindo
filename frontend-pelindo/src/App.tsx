/**
 * Komponen root aplikasi.
 *
 * Saya mengelola state sidebar (buka/tutup) di sini agar bisa
 * dioper ke TopBar (tombol hamburger) dan Sidebar (onTutup).
 * Seluruh routing didefinisikan di sini menggunakan React Router v6.
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ParkirProvider } from './context/ParkirContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// Halaman-halaman aplikasi
import Dashboard from './pages/Dashboard';
import FormPemesanan from './pages/FormPemesanan';
import RincianSesi from './pages/RincianSesi';
import StatusLangsung from './pages/StatusLangsung';
import Riwayat from './pages/Riwayat';

const App = () => {
  // State visibilitas sidebar (dipakai di mode mobile)
  const [sidebarTerbuka, setSidebarTerbuka] = useState(false);

  return (
    <BrowserRouter>
      {/* Provider context membungkus seluruh tree agar semua komponen bisa akses state */}
      <ParkirProvider>
        <div className="app-layout">
          {/* Sidebar navigasi samping */}
          <Sidebar
            terbuka={sidebarTerbuka}
            onTutup={() => setSidebarTerbuka(false)}
          />

          {/* Area konten utama */}
          <div className="app-layout__main">
            {/* Bar atas */}
            <TopBar onToggleSidebar={() => setSidebarTerbuka((prev) => !prev)} />

            {/* Konten halaman berdasarkan route */}
            <div className="app-layout__konten">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pesan" element={<FormPemesanan />} />
                <Route path="/rincian/:id" element={<RincianSesi />} />
                <Route path="/status" element={<StatusLangsung />} />
                <Route path="/riwayat" element={<Riwayat />} />
                {/* Fallback: redirect ke dashboard */}
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </div>
          </div>
        </div>
      </ParkirProvider>
    </BrowserRouter>
  );
};

export default App;
