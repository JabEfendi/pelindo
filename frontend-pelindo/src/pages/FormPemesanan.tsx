/**
 * Halaman Formulir Pemesanan.
 *
 * Alur kerja:
 * 1. User mengisi nama, plat kendaraan, tipe kendaraan, dan durasi
 * 2. Jika dibuka dari peta (ada ?slot=XXX di URL), slot langsung terpilih
 * 3. Jika tidak ada slot dari URL, user memilih slot dari dropdown
 * 4. Setelah submit, data disimpan via context (→ localStorage)
 * 5. Modal konfirmasi muncul dengan ringkasan pemesanan
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useParkirContext, TARIF } from '../context/ParkirContext';
import ModalKonfirmasi from '../components/ui/ModalKonfirmasi';
import type { TipeKendaraan, Pemesanan } from '../types';
import { formatRupiah } from '../utils/formatRupiah';

// Opsi durasi yang tersedia
const OPSI_DURASI = [
  { label: '1 Jam', nilai: 1 },
  { label: '2 Jam', nilai: 2 },
  { label: '3 Jam', nilai: 3 },
  { label: '4 Jam', nilai: 4 },
  { label: '6 Jam', nilai: 6 },
  { label: '8 Jam (Seharian)', nilai: 8 },
  { label: '12 Jam', nilai: 12 },
  { label: '24 Jam (Menginap)', nilai: 24 },
];

const FormPemesanan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slots, buatPemesanan } = useParkirContext();

  // Ambil slot dari URL query parameter (jika dibuka dari peta)
  const slotDariUrl = searchParams.get('slot') ?? '';

  // State formulir
  const [namaForm, setNamaForm] = useState('');
  const [platForm, setPlatForm] = useState('');
  const [tipeForm, setTipeForm] = useState<TipeKendaraan>('Mobil');
  const [durasiForm, setDurasiForm] = useState(2);
  const [slotDipilih, setSlotDipilih] = useState(slotDariUrl);

  // State UI
  const [kesalahan, setKesalahan] = useState<Record<string, string>>({});
  const [pemesananBerhasil, setPemesananBerhasil] = useState<Pemesanan | null>(null);

  // Isi slot otomatis jika ada query parameter
  useEffect(() => {
    if (slotDariUrl) setSlotDipilih(slotDariUrl);
  }, [slotDariUrl]);

  // Hanya tampilkan slot yang tersedia untuk dipilih
  const slotTersedia = useMemo(
    () => slots.filter((s) => s.status === 'tersedia'),
    [slots]
  );

  // Kalkulasi estimasi biaya secara real-time
  const estimasiBiaya = useMemo(
    () => TARIF[tipeForm] * durasiForm,
    [tipeForm, durasiForm]
  );

  // Validasi formulir sebelum submit
  const validasi = (): boolean => {
    const err: Record<string, string> = {};

    if (!namaForm.trim()) err.nama = 'Nama pemesan wajib diisi.';
    if (!platForm.trim()) err.plat = 'Nomor plat wajib diisi.';
    else if (!/^[A-Za-z0-9\s-]+$/.test(platForm))
      err.plat = 'Format plat tidak valid. Contoh: B 1234 XYZ';
    if (!slotDipilih) err.slot = 'Pilih slot parkir terlebih dahulu.';

    setKesalahan(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validasi()) return;

    // Buat pemesanan baru melalui context (otomatis tersimpan ke localStorage)
    const pemesananBaru = buatPemesanan({
      slotId: slotDipilih,
      namaPemesan: namaForm.trim(),
      nomorPlat: platForm.trim(),
      tipeKendaraan: tipeForm,
      durasiJam: durasiForm,
    });

    setPemesananBerhasil(pemesananBaru);
  };

  const handleModalTutup = () => {
    setPemesananBerhasil(null);
    navigate('/');
  };

  return (
    <div className="halaman halaman--centered">
      {/* Modal konfirmasi (tampil setelah submit berhasil) */}
      {pemesananBerhasil && (
        <ModalKonfirmasi
          pemesanan={pemesananBerhasil}
          onTutup={handleModalTutup}
        />
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button
          className="breadcrumb__btn"
          onClick={() => navigate('/')}
          type="button"
          aria-label="Kembali ke Dasbor"
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Dasbor
        </button>
        <span className="breadcrumb__separator" aria-hidden="true">/</span>
        <span className="breadcrumb__aktif">Pemesanan Baru</span>
      </div>

      {/* Kartu formulir */}
      <div className="form-card">
        {/* Header kartu */}
        <div className="form-card__header">
          <div>
            <h1 className="form-card__judul">Reservasi Slot Parkir</h1>
            <p className="form-card__deskripsi">
              Isi data di bawah untuk memesan tempat parkir. Data disimpan secara lokal.
            </p>
          </div>
          <div className="badge-lokal" aria-label="Data disimpan lokal">
            <span className="material-symbols-outlined" aria-hidden="true">cloud_done</span>
            Sinkron Lokal
          </div>
        </div>

        {/* Formulir */}
        <form className="form-card__body" onSubmit={handleSubmit} noValidate>

          {/* ── Pilih Slot Parkir ── */}
          <div className="form-group">
            <label htmlFor="select-slot" className="form-label">
              Slot Parkir <span className="form-label__wajib" aria-hidden="true">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon material-symbols-outlined" aria-hidden="true">
                local_parking
              </span>
              <select
                id="select-slot"
                className={`input ${kesalahan.slot ? 'input--error' : ''}`}
                value={slotDipilih}
                onChange={(e) => setSlotDipilih(e.target.value)}
                aria-describedby={kesalahan.slot ? 'error-slot' : undefined}
                aria-invalid={!!kesalahan.slot}
              >
                <option value="">-- Pilih slot tersedia --</option>
                {slotTersedia.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — Zona {s.zona}
                  </option>
                ))}
              </select>
            </div>
            {kesalahan.slot && (
              <p id="error-slot" className="form-error" role="alert">{kesalahan.slot}</p>
            )}
          </div>

          {/* ── Data Pribadi ── */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="input-nama" className="form-label">
                Nama Lengkap <span className="form-label__wajib" aria-hidden="true">*</span>
              </label>
              <input
                id="input-nama"
                type="text"
                className={`input ${kesalahan.nama ? 'input--error' : ''}`}
                placeholder="Contoh: Budi Santoso"
                value={namaForm}
                onChange={(e) => setNamaForm(e.target.value)}
                aria-describedby={kesalahan.nama ? 'error-nama' : undefined}
                aria-invalid={!!kesalahan.nama}
                autoComplete="name"
              />
              {kesalahan.nama && (
                <p id="error-nama" className="form-error" role="alert">{kesalahan.nama}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="input-plat" className="form-label">
                Nomor Plat <span className="form-label__wajib" aria-hidden="true">*</span>
              </label>
              <input
                id="input-plat"
                type="text"
                className={`input input--uppercase ${kesalahan.plat ? 'input--error' : ''}`}
                placeholder="Contoh: B 1234 XYZ"
                value={platForm}
                onChange={(e) => setPlatForm(e.target.value.toUpperCase())}
                aria-describedby={kesalahan.plat ? 'error-plat' : undefined}
                aria-invalid={!!kesalahan.plat}
                autoComplete="off"
              />
              {kesalahan.plat && (
                <p id="error-plat" className="form-error" role="alert">{kesalahan.plat}</p>
              )}
            </div>
          </div>

          {/* ── Tipe Kendaraan ── */}
          <div className="form-group">
            <label className="form-label">Tipe Kendaraan</label>
            <div
              className="tipe-kendaraan-grid"
              role="radiogroup"
              aria-label="Pilih tipe kendaraan"
            >
              {(['Mobil', 'SUV', 'Motor'] as TipeKendaraan[]).map((tipe) => (
                <label
                  key={tipe}
                  className={`kartu-tipe ${tipeForm === tipe ? 'kartu-tipe--terpilih' : ''}`}
                  htmlFor={`radio-${tipe}`}
                >
                  <input
                    id={`radio-${tipe}`}
                    type="radio"
                    name="tipe_kendaraan"
                    value={tipe}
                    checked={tipeForm === tipe}
                    onChange={() => setTipeForm(tipe)}
                    className="kartu-tipe__radio"
                  />
                  <span className="material-symbols-outlined kartu-tipe__ikon" aria-hidden="true">
                    {tipe === 'Mobil' ? 'directions_car' : tipe === 'SUV' ? 'rv_hookup' : 'two_wheeler'}
                  </span>
                  <span className="kartu-tipe__label">{tipe}</span>
                  <span className="kartu-tipe__tarif">{formatRupiah(TARIF[tipe])}/jam</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Durasi Parkir ── */}
          <div className="form-group">
            <label htmlFor="select-durasi" className="form-label">
              Durasi Parkir
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon material-symbols-outlined" aria-hidden="true">
                schedule
              </span>
              <select
                id="select-durasi"
                className="input"
                value={durasiForm}
                onChange={(e) => setDurasiForm(Number(e.target.value))}
              >
                {OPSI_DURASI.map((opsi) => (
                  <option key={opsi.nilai} value={opsi.nilai}>
                    {opsi.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Estimasi Biaya (real-time) ── */}
          <div className="estimasi-biaya" aria-live="polite" aria-label="Estimasi biaya parkir">
            <div className="estimasi-biaya__baris">
              <span>Tarif</span>
              <span>{formatRupiah(TARIF[tipeForm])}/jam</span>
            </div>
            <div className="estimasi-biaya__baris">
              <span>Durasi</span>
              <span>{durasiForm} jam</span>
            </div>
            <div className="estimasi-biaya__baris estimasi-biaya__baris--total">
              <span>Estimasi Total</span>
              <span className="estimasi-biaya__nilai">{formatRupiah(estimasiBiaya)}</span>
            </div>
          </div>

          {/* ── Tombol Aksi ── */}
          <div className="form-actions">
            <button
              id="btn-batal"
              type="button"
              className="btn btn--outline"
              onClick={() => navigate('/')}
            >
              Batal
            </button>
            <button
              id="btn-konfirmasi-pesan"
              type="submit"
              className="btn btn--primary"
            >
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
              Konfirmasi Pemesanan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormPemesanan;
