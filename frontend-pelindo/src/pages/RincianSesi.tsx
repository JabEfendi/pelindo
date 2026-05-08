/**
 * Halaman Rincian Sesi Parkir.
 *
 * Fitur utama:
 * - Timer countdown sisa waktu (jika masih dalam durasi)
 * - Timer countup overtime dengan warna merah (jika durasi terlampaui)
 * - Progress bar waktu terpakai
 * - Ringkasan biaya dengan perhitungan denda overtime
 * - Tombol akhiri sesi
 * - Tombol tambah waktu (extend)
 *
 * Timer diperbarui setiap detik menggunakan setInterval.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParkirContext } from '../context/ParkirContext';
import { formatRupiah, formatWaktu, formatTanggalIndo } from '../utils/formatRupiah';

// Denda overtime: 1.5× tarif normal per jam
const FAKTOR_DENDA = 1.5;

const RincianSesi = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPemesananById, getSlotById, akhiriSesi } = useParkirContext();

  // Waktu sekarang, diperbarui setiap detik
  const [waktuSekarang, setWaktuSekarang] = useState(Date.now());

  // State konfirmasi akhiri sesi
  const [konfirmasiAkhir, setKonfirmasiAkhir] = useState(false);

  const pemesanan = id ? getPemesananById(id) : undefined;
  const slot = pemesanan ? getSlotById(pemesanan.slotId) : undefined;

  // Perbarui waktu setiap detik untuk timer live
  useEffect(() => {
    const interval = setInterval(() => setWaktuSekarang(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Hitung sisa/kelebihan waktu dalam detik
  const selisihDetik = useMemo(() => {
    if (!pemesanan) return 0;
    const selesai = new Date(pemesanan.waktuSelesai).getTime();
    return Math.floor((selesai - waktuSekarang) / 1000);
  }, [pemesanan, waktuSekarang]);

  // Apakah sudah overtime?
  const isOvertime = selisihDetik < 0;

  // Hitung total biaya termasuk denda overtime
  const totalBiayaKini = useMemo(() => {
    if (!pemesanan) return 0;
    const biayaNormal = pemesanan.totalBiaya;
    if (!isOvertime) return biayaNormal;

    const jamOvertime = Math.abs(selisihDetik) / 3600;
    const dendaOvertime = jamOvertime * pemesanan.tarifPerJam * FAKTOR_DENDA;
    return biayaNormal + dendaOvertime;
  }, [pemesanan, isOvertime, selisihDetik]);

  // Persentase waktu terpakai (maks 100% saat overtime)
  const persenTerpakai = useMemo(() => {
    if (!pemesanan) return 0;
    const totalDetik = pemesanan.durasiJam * 3600;
    const terpakai = totalDetik - selisihDetik;
    return Math.min(100, Math.round((terpakai / totalDetik) * 100));
  }, [pemesanan, selisihDetik]);

  const handleAkhiriSesi = () => {
    if (!id) return;
    akhiriSesi(id);
    navigate('/riwayat');
  };

  // Halaman error jika pemesanan tidak ditemukan
  if (!pemesanan) {
    return (
      <div className="halaman halaman--centered">
        <div className="kosong-state">
          <span className="material-symbols-outlined kosong-state__ikon" aria-hidden="true">
            search_off
          </span>
          <h2>Pemesanan Tidak Ditemukan</h2>
          <p>ID pemesanan tidak valid atau sudah dihapus.</p>
          <button
            id="btn-kembali-dasbor"
            className="btn btn--primary"
            onClick={() => navigate('/')}
            type="button"
          >
            Kembali ke Dasbor
          </button>
        </div>
      </div>
    );
  }

  // Cek apakah sesi sudah selesai
  const sudahSelesai = pemesanan.status === 'selesai';

  return (
    <div className="halaman">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button
          className="breadcrumb__btn"
          onClick={() => navigate('/status')}
          type="button"
          aria-label="Kembali ke Status Langsung"
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Status Langsung
        </button>
        <span className="breadcrumb__separator" aria-hidden="true">/</span>
        <span className="breadcrumb__aktif">Rincian Sesi</span>
      </div>

      {/* Grid bento layout seperti desain stitch */}
      <div className="rincian-grid">

        {/* ── Kartu Sesi Utama (full-width) ── */}
        <div className={`kartu kartu--full rincian-sesi__kartu-utama ${isOvertime ? 'kartu--overtime' : 'kartu--aktif'}`}>
          {/* Garis status di atas */}
          <div className={`rincian-sesi__status-bar ${isOvertime ? 'rincian-sesi__status-bar--overtime' : 'rincian-sesi__status-bar--aktif'}`}
            aria-hidden="true" />

          {/* Header: ID slot & badge status */}
          <div className="rincian-sesi__kartu-header">
            <div>
              <h1 className="rincian-sesi__slot-id">{pemesanan.slotId}</h1>
              <p className="rincian-sesi__zona-info">
                Zona {slot?.zona ?? '?'} — {
                  { A: 'Premium Dalam Ruangan', B: 'Standar Terbuka', C: 'Reguler', D: 'Ukuran Besar' }[slot?.zona ?? 'A']
                }
              </p>
            </div>

            {sudahSelesai ? (
              <span className="badge-selesai" role="status">
                <span className="material-symbols-outlined" aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Sesi Selesai
              </span>
            ) : isOvertime ? (
              <span className="badge-overtime" role="status">
                <span className="material-symbols-outlined" aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                Overtime
              </span>
            ) : (
              <span className="badge-aktif" role="status">
                <span className="material-symbols-outlined" aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Sesi Aktif
              </span>
            )}
          </div>

          {/* Info kendaraan & jadwal */}
          <div className="rincian-sesi__info-grid">
            {/* Info kendaraan */}
            <div className="rincian-sesi__info-blok">
              <div className="rincian-sesi__info-ikon" aria-hidden="true">
                <span className="material-symbols-outlined">directions_car</span>
              </div>
              <div>
                <p className="rincian-sesi__info-label">Kendaraan</p>
                <p className="rincian-sesi__plat">{pemesanan.nomorPlat}</p>
                <p className="rincian-sesi__info-sub">
                  {pemesanan.namaPemesan} · {pemesanan.tipeKendaraan}
                </p>
              </div>
            </div>

            {/* Info jadwal */}
            <div className="rincian-sesi__info-blok">
              <div className="rincian-sesi__info-ikon" aria-hidden="true">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <p className="rincian-sesi__info-label">Jadwal</p>
                <p className="rincian-sesi__jadwal">
                  {formatTanggalIndo(pemesanan.waktuMulai)}
                </p>
                <p className="rincian-sesi__info-sub">
                  Berakhir: {formatTanggalIndo(pemesanan.waktuSelesai)}
                </p>
              </div>
            </div>
          </div>

          {/* Timer & Progress Bar */}
          {!sudahSelesai && (
            <div className={`rincian-sesi__timer-section ${isOvertime ? 'rincian-sesi__timer-section--overtime' : ''}`}>
              <div className="rincian-sesi__timer-info">
                <p className={`rincian-sesi__timer-label ${isOvertime ? 'rincian-sesi__timer-label--overtime' : ''}`}>
                  {isOvertime ? (
                    <>
                      <span className="badge-inline-overtime">OVERTIME</span>
                    </>
                  ) : (
                    'Sisa Waktu'
                  )}
                </p>
                <div
                  className={`rincian-sesi__timer ${isOvertime ? 'rincian-sesi__timer--overtime' : 'rincian-sesi__timer--normal'}`}
                  aria-live="polite"
                  aria-label={isOvertime ? `Overtime: ${formatWaktu(Math.abs(selisihDetik))}` : `Sisa waktu: ${formatWaktu(selisihDetik)}`}
                >
                  {isOvertime ? '+' : ''}{formatWaktu(Math.abs(selisihDetik))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="rincian-sesi__progress-wrapper">
                <div className="rincian-sesi__progress-labels">
                  <span>0%</span>
                  <span>{persenTerpakai}% Terpakai</span>
                  <span>100%</span>
                </div>
                <div className="rincian-sesi__progress-track" role="progressbar"
                  aria-valuenow={persenTerpakai} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${persenTerpakai} persen waktu terpakai`}>
                  <div
                    className={`rincian-sesi__progress-fill ${isOvertime ? 'rincian-sesi__progress-fill--overtime' : 'rincian-sesi__progress-fill--normal'}`}
                    style={{ width: `${persenTerpakai}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Ringkasan Biaya ── */}
        <div className="kartu kartu--half">
          <h2 className="kartu__judul">Ringkasan Biaya</h2>
          <div className="biaya-list">
            <div className="biaya-list__baris">
              <span>Tarif dasar ({pemesanan.durasiJam} jam × {formatRupiah(pemesanan.tarifPerJam)}/jam)</span>
              <span>{formatRupiah(pemesanan.totalBiaya)}</span>
            </div>
            {isOvertime && (
              <div className="biaya-list__baris biaya-list__baris--overtime">
                <span>Denda overtime ({(Math.abs(selisihDetik) / 3600).toFixed(2)} jam × {formatRupiah(pemesanan.tarifPerJam * FAKTOR_DENDA)}/jam)</span>
                <span>{formatRupiah(totalBiayaKini - pemesanan.totalBiaya)}</span>
              </div>
            )}
            <div className="biaya-list__baris biaya-list__baris--total">
              <span>{sudahSelesai ? 'Total Akhir' : 'Estimasi Total'}</span>
              <span className="biaya-list__nilai-total">{formatRupiah(totalBiayaKini)}</span>
            </div>
          </div>
        </div>

        {/* ── Tombol Aksi ── */}
        {!sudahSelesai && (
          <div className="kartu kartu--half kartu--aksi">
            <p className="kartu--aksi__deskripsi">
              Mengakhiri sesi akan merilis slot dan menghitung biaya akhir.
            </p>

            {!konfirmasiAkhir ? (
              <>
                <button
                  id="btn-akhiri-sesi"
                  className="btn btn--danger btn--full"
                  onClick={() => setKonfirmasiAkhir(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">stop_circle</span>
                  Akhiri Sesi Parkir
                </button>
                <button
                  id="btn-tambah-waktu"
                  className="btn btn--outline btn--full"
                  onClick={() => navigate(`/pesan?slot=${pemesanan.slotId}`)}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">add_alarm</span>
                  Tambah Waktu
                </button>
              </>
            ) : (
              <div className="konfirmasi-akhir">
                <p className="konfirmasi-akhir__teks">
                  Yakin ingin mengakhiri sesi ini?
                </p>
                <div className="konfirmasi-akhir__actions">
                  <button
                    id="btn-batal-akhir"
                    className="btn btn--outline"
                    onClick={() => setKonfirmasiAkhir(false)}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-konfirmasi-akhir"
                    className="btn btn--danger"
                    onClick={handleAkhiriSesi}
                    type="button"
                  >
                    Ya, Akhiri
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Jika sudah selesai, tampilkan tombol kembali */}
        {sudahSelesai && (
          <div className="kartu kartu--half kartu--aksi">
            <p className="kartu--aksi__deskripsi">Sesi ini telah berakhir.</p>
            <button
              id="btn-lihat-riwayat"
              className="btn btn--primary btn--full"
              onClick={() => navigate('/riwayat')}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">history</span>
              Lihat Riwayat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RincianSesi;
