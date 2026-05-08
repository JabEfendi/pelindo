/**
 * Halaman Dashboard — tampilan utama aplikasi.
 *
 * Menampilkan:
 * 1. Widget statistik (total slot, tersedia, terisi, overtime)
 * 2. Peta parkir interaktif menggunakan Konva.js
 * 3. Legenda warna slot
 * 4. Popover informasi saat user klik slot
 *
 * Saya memisahkan logika filter zona agar dashboard tetap responsif
 * saat data slot bertambah.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParkirContext } from '../context/ParkirContext';
import PetaParkir from '../components/parking/PetaParkir';
import SlotPopover from '../components/parking/SlotPopover';
import KartuStatistik from '../components/ui/KartuStatistik';
import type { SlotParkir } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { slots, pemesananList, getPemesananById } = useParkirContext();

  // Slot yang sedang dipilih (untuk menampilkan popover)
  const [slotDipilih, setSlotDipilih] = useState<SlotParkir | null>(null);

  // Filter zona yang aktif
  const [zonaAktif, setZonaAktif] = useState<'semua' | 'A' | 'B' | 'C' | 'D'>('semua');

  // Hitung statistik dari data slots
  const statistik = useMemo(() => ({
    total: slots.length,
    tersedia: slots.filter((s) => s.status === 'tersedia').length,
    terisi: slots.filter((s) => s.status === 'terisi' || s.status === 'dipesan').length,
    overtime: slots.filter((s) => s.status === 'overtime').length,
  }), [slots]);

  // Filter slot berdasarkan zona yang dipilih
  const slotDitampilkan = useMemo(() =>
    zonaAktif === 'semua' ? slots : slots.filter((s) => s.zona === zonaAktif),
    [slots, zonaAktif]
  );

  // Cari pemesanan aktif untuk slot yang dipilih
  const pemesananSlotDipilih = useMemo(() => {
    if (!slotDipilih?.pemesananId) return undefined;
    return getPemesananById(slotDipilih.pemesananId);
  }, [slotDipilih, getPemesananById]);

  const handleKlikSlot = (slot: SlotParkir) => {
    setSlotDipilih(slot);
  };

  const handlePesan = (slotId: string) => {
    navigate(`/pesan?slot=${slotId}`);
  };

  const handleLihatRincian = (pemesananId: string) => {
    navigate(`/rincian/${pemesananId}`);
  };

  // Ambil pemesanan aktif terbaru (maks 5) untuk ditampilkan di bawah peta
  const pemesananAktif = useMemo(() =>
    pemesananList.filter((p) => p.status === 'aktif').slice(0, 5),
    [pemesananList]
  );

  return (
    <div className="halaman">
      {/* Judul halaman */}
      <div className="halaman__header">
        <div>
          <h1 className="halaman__judul">Dasbor Parkiran</h1>
          <p className="halaman__subjudul">
            Pemantauan real-time kondisi parkiran — ID Fasilitas P-8820
          </p>
        </div>
        <button
          id="btn-pesan-baru"
          className="btn btn--primary"
          onClick={() => navigate('/pesan')}
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">add_box</span>
          Pesan Baru
        </button>
      </div>

      {/* ── Widget Statistik ── */}
      <div className="statistik-grid" role="region" aria-label="Statistik parkiran">
        <KartuStatistik
          judul="Total Slot"
          nilai={statistik.total}
          ikon="local_parking"
          warna="biru"
        />
        <KartuStatistik
          judul="Tersedia"
          nilai={statistik.tersedia}
          ikon="check_circle"
          warna="hijau"
        />
        <KartuStatistik
          judul="Terisi"
          nilai={statistik.terisi}
          ikon="directions_car"
          warna="merah"
        />
        <KartuStatistik
          judul="Overtime"
          nilai={statistik.overtime}
          ikon="warning"
          warna="oranye"
        />
      </div>

      {/* ── Peta Parkir ── */}
      <div className="peta-section">
        {/* Header peta: judul, filter zona, legenda */}
        <div className="peta-section__header">
          <div className="peta-section__judul-wrapper">
            <h2 className="peta-section__judul">Denah Parkiran</h2>
            <span className="chip-langsung" aria-label="Status: Langsung">
              <span className="chip-langsung__dot" aria-hidden="true" />
              Langsung
            </span>
          </div>

          {/* Filter zona */}
          <div className="peta-section__filter" role="group" aria-label="Filter zona">
            {(['semua', 'A', 'B', 'C', 'D'] as const).map((zona) => (
              <button
                key={zona}
                id={`btn-zona-${zona}`}
                className={`btn-zona ${zonaAktif === zona ? 'btn-zona--aktif' : ''}`}
                onClick={() => setZonaAktif(zona)}
                type="button"
                aria-pressed={zonaAktif === zona}
              >
                {zona === 'semua' ? 'Semua' : `Zona ${zona}`}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda warna */}
        <div className="legenda" role="legend" aria-label="Legenda warna slot">
          <div className="legenda__item">
            <div className="legenda__kotak legenda__kotak--tersedia" aria-hidden="true" />
            <span>Tersedia</span>
          </div>
          <div className="legenda__item">
            <div className="legenda__kotak legenda__kotak--terisi" aria-hidden="true" />
            <span>Terisi</span>
          </div>
          <div className="legenda__item">
            <div className="legenda__kotak legenda__kotak--overtime" aria-hidden="true" />
            <span>Overtime</span>
          </div>
          <div className="legenda__item">
            <div className="legenda__kotak legenda__kotak--dipesan" aria-hidden="true" />
            <span>Dipesan</span>
          </div>
        </div>

        {/* Kanvas Konva */}
        <div className="peta-section__kanvas">
          <PetaParkir
            slots={slotDitampilkan}
            onKlikSlot={handleKlikSlot}
            slotTerpilih={slotDipilih?.id}
          />

          {/* Popover slot terpilih */}
          {slotDipilih && (
            <div className="peta-section__popover-wrapper">
              <SlotPopover
                slot={slotDipilih}
                pemesananAktif={pemesananSlotDipilih}
                onPesan={handlePesan}
                onLihatRincian={handleLihatRincian}
                onTutup={() => setSlotDipilih(null)}
              />
            </div>
          )}
        </div>

        {/* Petunjuk interaksi */}
        <p className="peta-section__petunjuk" aria-live="polite">
          <span className="material-symbols-outlined" aria-hidden="true">touch_app</span>
          Klik slot hijau untuk memesan, atau klik slot terisi untuk melihat detailnya.
        </p>
      </div>

      {/* ── Sesi Aktif Terkini ── */}
      {pemesananAktif.length > 0 && (
        <div className="sesi-aktif-section">
          <h2 className="sesi-aktif-section__judul">Sesi Aktif Terkini</h2>
          <div className="sesi-aktif-grid">
            {pemesananAktif.map((p) => (
              <div
                key={p.id}
                className="kartu-sesi-mini"
                onClick={() => navigate(`/rincian/${p.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Sesi slot ${p.slotId} atas nama ${p.namaPemesan}`}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/rincian/${p.id}`)}
              >
                <div className="kartu-sesi-mini__header">
                  <span className="kartu-sesi-mini__slot">{p.slotId}</span>
                  <span className="chip-aktif">Aktif</span>
                </div>
                <p className="kartu-sesi-mini__nama">{p.namaPemesan}</p>
                <p className="kartu-sesi-mini__plat">{p.nomorPlat}</p>
                <p className="kartu-sesi-mini__durasi">{p.durasiJam} jam · {p.tipeKendaraan}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
