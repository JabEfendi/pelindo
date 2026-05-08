/**
 * Halaman Riwayat Pemesanan.
 *
 * Fitur:
 * - Tampilkan semua pemesanan (aktif, selesai, dibatalkan)
 * - Filter berdasarkan kata kunci (nama, plat, slot ID)
 * - Filter berdasarkan zona, tipe kendaraan, dan rentang waktu
 * - Pencarian didukung dari URL query parameter (?cari=...)
 * - Paginasi sederhana (10 item per halaman)
 * - Tombol ekspor (simulasi unduh CSV)
 *
 * Ini adalah halaman bonus yang mengimplementasikan fitur pencarian
 * berdasarkan kriteria lokasi/zona dan ukuran kendaraan.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useParkirContext } from '../context/ParkirContext';
import type { FilterRiwayat } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatRupiah';

const ITEM_PER_HALAMAN = 10;

const Riwayat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pemesananList } = useParkirContext();

  // State filter pencarian
  const [filter, setFilter] = useState<FilterRiwayat>({
    kata: searchParams.get('cari') ?? '',
    zona: '',
    tipeKendaraan: '',
    rentangWaktu: '30hari',
  });

  const [halamanAktif, setHalamanAktif] = useState(1);

  // Sinkronkan filter dari URL query parameter
  useEffect(() => {
    const cariDariUrl = searchParams.get('cari');
    if (cariDariUrl) {
      setFilter((prev) => ({ ...prev, kata: cariDariUrl }));
    }
  }, [searchParams]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setHalamanAktif(1);
  }, [filter]);

  // Hitung batas waktu berdasarkan filter rentang
  const batasWaktu = useMemo(() => {
    const sekarang = Date.now();
    switch (filter.rentangWaktu) {
      case '7hari': return sekarang - 7 * 24 * 60 * 60 * 1000;
      case 'bulanIni': {
        const awalBulan = new Date();
        awalBulan.setDate(1);
        awalBulan.setHours(0, 0, 0, 0);
        return awalBulan.getTime();
      }
      default: return sekarang - 30 * 24 * 60 * 60 * 1000;
    }
  }, [filter.rentangWaktu]);

  // Filter dan urutkan data pemesanan
  const pemesananTerfilter = useMemo(() => {
    return pemesananList
      .filter((p) => {
        const tglMulai = new Date(p.waktuMulai).getTime();
        if (tglMulai < batasWaktu) return false;
        if (filter.kata) {
          const q = filter.kata.toLowerCase();
          if (
            !p.namaPemesan.toLowerCase().includes(q) &&
            !p.nomorPlat.toLowerCase().includes(q) &&
            !p.slotId.toLowerCase().includes(q)
          ) return false;
        }
        if (filter.zona && !p.slotId.startsWith(filter.zona)) return false;
        if (filter.tipeKendaraan && p.tipeKendaraan !== filter.tipeKendaraan) return false;
        return true;
      })
      .sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime());
  }, [pemesananList, filter, batasWaktu]);

  // Paginasi
  const totalHalaman = Math.max(1, Math.ceil(pemesananTerfilter.length / ITEM_PER_HALAMAN));
  const pemesananHalaman = pemesananTerfilter.slice(
    (halamanAktif - 1) * ITEM_PER_HALAMAN,
    halamanAktif * ITEM_PER_HALAMAN
  );

  // Simulasi ekspor CSV
  const handleEkspor = () => {
    const header = 'ID,Slot,Nama,Plat,Tipe,Durasi (jam),Mulai,Biaya,Status\n';
    const baris = pemesananTerfilter
      .map((p) =>
        [p.id, p.slotId, p.namaPemesan, p.nomorPlat, p.tipeKendaraan,
         p.durasiJam, formatTanggalIndo(p.waktuMulai), p.totalBiaya, p.status].join(',')
      )
      .join('\n');

    const blob = new Blob([header + baris], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat-parkir-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badgeStatus = (status: string) => {
    switch (status) {
      case 'aktif': return <span className="badge-aktif badge-aktif--kecil">Aktif</span>;
      case 'selesai': return <span className="badge-selesai badge-selesai--kecil">Selesai</span>;
      case 'dibatalkan': return <span className="badge-batal badge-batal--kecil">Dibatalkan</span>;
      default: return null;
    }
  };

  return (
    <div className="halaman">
      {/* Header */}
      <div className="halaman__header">
        <div>
          <h1 className="halaman__judul">Riwayat Parkiran</h1>
          <p className="halaman__subjudul">
            Tinjau dan ekspor semua catatan pemesanan.
          </p>
        </div>
        <button
          id="btn-ekspor-csv"
          className="btn btn--secondary"
          onClick={handleEkspor}
          type="button"
          disabled={pemesananTerfilter.length === 0}
          aria-label="Ekspor riwayat sebagai CSV"
        >
          <span className="material-symbols-outlined" aria-hidden="true">download</span>
          Ekspor CSV
        </button>
      </div>

      {/* ── Panel Pencarian & Filter ── */}
      <section className="kartu filter-panel" aria-label="Filter dan pencarian">
        <div className="filter-grid">
          {/* Pencarian kata kunci */}
          <div className="form-group">
            <label htmlFor="input-cari" className="form-label form-label--sm">
              Cari Catatan
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon material-symbols-outlined" aria-hidden="true">search</span>
              <input
                id="input-cari"
                type="search"
                className="input input--sm"
                placeholder="Nama, plat, ID slot..."
                value={filter.kata}
                onChange={(e) => setFilter((f) => ({ ...f, kata: e.target.value }))}
                aria-label="Cari berdasarkan nama, plat, atau ID slot"
              />
            </div>
          </div>

          {/* Filter rentang waktu */}
          <div className="form-group">
            <label htmlFor="select-rentang" className="form-label form-label--sm">
              Rentang Waktu
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
              <select
                id="select-rentang"
                className="input input--sm"
                value={filter.rentangWaktu}
                onChange={(e) => setFilter((f) => ({ ...f, rentangWaktu: e.target.value }))}
              >
                <option value="7hari">7 Hari Terakhir</option>
                <option value="30hari">30 Hari Terakhir</option>
                <option value="bulanIni">Bulan Ini</option>
              </select>
            </div>
          </div>

          {/* Filter zona (BONUS: pencarian berdasarkan lokasi) */}
          <div className="form-group">
            <label htmlFor="select-zona" className="form-label form-label--sm">
              Zona Parkir
            </label>
            <select
              id="select-zona"
              className="input input--sm"
              value={filter.zona}
              onChange={(e) => setFilter((f) => ({ ...f, zona: e.target.value }))}
              aria-label="Filter berdasarkan zona"
            >
              <option value="">Semua Zona</option>
              <option value="A">Zona A — Premium Dalam Ruangan</option>
              <option value="B">Zona B — Standar Terbuka</option>
              <option value="C">Zona C — Reguler</option>
              <option value="D">Zona D — Ukuran Besar</option>
            </select>
          </div>

          {/* Filter tipe kendaraan (BONUS: pencarian berdasarkan ukuran) */}
          <div className="form-group">
            <label htmlFor="select-tipe-kendaraan" className="form-label form-label--sm">
              Tipe Kendaraan
            </label>
            <select
              id="select-tipe-kendaraan"
              className="input input--sm"
              value={filter.tipeKendaraan}
              onChange={(e) => setFilter((f) => ({ ...f, tipeKendaraan: e.target.value }))}
              aria-label="Filter berdasarkan tipe kendaraan"
            >
              <option value="">Semua Tipe</option>
              <option value="Mobil">Mobil</option>
              <option value="SUV">SUV</option>
              <option value="Motor">Motor</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Tabel Riwayat ── */}
      <section className="kartu tabel-section" aria-label="Daftar catatan pemesanan">
        <div className="tabel-section__header">
          <h2 className="tabel-section__judul">Catatan Pemesanan</h2>
          <span className="tabel-section__jumlah" aria-live="polite">
            {pemesananTerfilter.length} catatan ditemukan
          </span>
        </div>

        {pemesananHalaman.length === 0 ? (
          <div className="kosong-state kosong-state--kecil">
            <span className="material-symbols-outlined kosong-state__ikon" aria-hidden="true">
              folder_off
            </span>
            <p>Tidak ada catatan yang sesuai dengan filter ini.</p>
          </div>
        ) : (
          <>
            {/* Tampilan tabel untuk desktop */}
            <div className="tabel-wrapper" role="region" aria-label="Tabel riwayat pemesanan" tabIndex={0}>
              <table className="tabel">
                <thead>
                  <tr>
                    <th scope="col">Tanggal &amp; Waktu</th>
                    <th scope="col">ID Slot</th>
                    <th scope="col">Plat Kendaraan</th>
                    <th scope="col">Pemesan</th>
                    <th scope="col">Tipe</th>
                    <th scope="col">Durasi</th>
                    <th scope="col">Biaya</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="tabel__th--kanan">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pemesananHalaman.map((p) => (
                    <tr key={p.id} className="tabel__baris">
                      <td>
                        <div className="tabel__tgl">{formatTanggalIndo(p.waktuMulai)}</div>
                      </td>
                      <td>
                        <div className="tabel__slot-id">
                          <div className="tabel__slot-aksen" aria-hidden="true" />
                          {p.slotId}
                        </div>
                      </td>
                      <td className="tabel__plat">{p.nomorPlat}</td>
                      <td>{p.namaPemesan}</td>
                      <td>{p.tipeKendaraan}</td>
                      <td>{p.durasiJam}j</td>
                      <td className="tabel__biaya">{formatRupiah(p.totalBiaya)}</td>
                      <td>{badgeStatus(p.status)}</td>
                      <td className="tabel__aksi">
                        {p.status === 'aktif' && (
                          <button
                            id={`btn-detail-${p.id}`}
                            className="btn btn--ikon"
                            onClick={() => navigate(`/rincian/${p.id}`)}
                            type="button"
                            aria-label={`Lihat rincian sesi ${p.slotId}`}
                          >
                            <span className="material-symbols-outlined">open_in_new</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu untuk mobile */}
            <div className="kartu-list-mobile">
              {pemesananHalaman.map((p) => (
                <div key={p.id} className="kartu-riwayat-mobile">
                  <div className="kartu-riwayat-mobile__header">
                    <span className="kartu-riwayat-mobile__slot">{p.slotId}</span>
                    {badgeStatus(p.status)}
                  </div>
                  <p className="kartu-riwayat-mobile__nama">{p.namaPemesan} · {p.nomorPlat}</p>
                  <p className="kartu-riwayat-mobile__info">
                    {p.tipeKendaraan} · {p.durasiJam} jam · {formatRupiah(p.totalBiaya)}
                  </p>
                  <p className="kartu-riwayat-mobile__tanggal">{formatTanggalIndo(p.waktuMulai)}</p>
                  {p.status === 'aktif' && (
                    <button
                      className="btn btn--secondary btn--sm btn--full"
                      onClick={() => navigate(`/rincian/${p.id}`)}
                      type="button"
                    >
                      Lihat Rincian
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Paginasi */}
            {totalHalaman > 1 && (
              <div className="paginasi" role="navigation" aria-label="Navigasi halaman">
                <span className="paginasi__info" aria-live="polite">
                  Halaman {halamanAktif} dari {totalHalaman}
                  ({pemesananTerfilter.length} catatan)
                </span>
                <div className="paginasi__controls">
                  <button
                    id="btn-prev-halaman"
                    className="btn btn--ikon"
                    onClick={() => setHalamanAktif((h) => Math.max(1, h - 1))}
                    disabled={halamanAktif === 1}
                    type="button"
                    aria-label="Halaman sebelumnya"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                  </button>

                  {Array.from({ length: totalHalaman }, (_, i) => i + 1)
                    .filter((h) => Math.abs(h - halamanAktif) <= 2)
                    .map((h) => (
                      <button
                        key={h}
                        id={`btn-halaman-${h}`}
                        className={`btn btn--ikon ${h === halamanAktif ? 'btn--halaman-aktif' : ''}`}
                        onClick={() => setHalamanAktif(h)}
                        type="button"
                        aria-label={`Halaman ${h}`}
                        aria-current={h === halamanAktif ? 'page' : undefined}
                      >
                        {h}
                      </button>
                    ))}

                  <button
                    id="btn-next-halaman"
                    className="btn btn--ikon"
                    onClick={() => setHalamanAktif((h) => Math.min(totalHalaman, h + 1))}
                    disabled={halamanAktif === totalHalaman}
                    type="button"
                    aria-label="Halaman berikutnya"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Riwayat;
