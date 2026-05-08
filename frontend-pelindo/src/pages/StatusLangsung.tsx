/**
 * Halaman Status Langsung (Live Status).
 * Menampilkan daftar semua sesi parkir yang sedang aktif.
 * User bisa klik kartu sesi untuk melihat rincian.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParkirContext } from '../context/ParkirContext';
import { formatRupiah, formatTanggalIndo } from '../utils/formatRupiah';

const StatusLangsung = () => {
  const navigate = useNavigate();
  const { pemesananList, slots } = useParkirContext();

  // Filter hanya sesi aktif, urutkan berdasarkan waktu mulai terbaru
  const sesiAktif = useMemo(() =>
    pemesananList
      .filter((p) => p.status === 'aktif')
      .sort((a, b) => new Date(b.waktuMulai).getTime() - new Date(a.waktuMulai).getTime()),
    [pemesananList]
  );

  const totalTersedia = useMemo(
    () => slots.filter((s) => s.status === 'tersedia').length,
    [slots]
  );

  return (
    <div className="halaman">
      {/* Header halaman */}
      <div className="halaman__header">
        <div>
          <h1 className="halaman__judul">Status Langsung</h1>
          <p className="halaman__subjudul">
            {sesiAktif.length} sesi aktif · {totalTersedia} slot tersedia
          </p>
        </div>
        <button
          id="btn-pesan-dari-status"
          className="btn btn--primary"
          onClick={() => navigate('/pesan')}
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">add_box</span>
          Pesan Baru
        </button>
      </div>

      {/* Daftar sesi aktif */}
      {sesiAktif.length === 0 ? (
        <div className="kosong-state">
          <span className="material-symbols-outlined kosong-state__ikon" aria-hidden="true">
            local_parking
          </span>
          <h2>Tidak Ada Sesi Aktif</h2>
          <p>Semua slot parkir sedang kosong. Buat pemesanan baru untuk memulai.</p>
          <button
            id="btn-pesan-kosong"
            className="btn btn--primary"
            onClick={() => navigate('/pesan')}
            type="button"
          >
            Pesan Sekarang
          </button>
        </div>
      ) : (
        <div className="sesi-aktif-list">
          {sesiAktif.map((p) => {
            const selesai = new Date(p.waktuSelesai).getTime();
            const sisaMs = selesai - Date.now();
            const isOvertime = sisaMs < 0;

            return (
              <div
                key={p.id}
                className={`kartu-sesi ${isOvertime ? 'kartu-sesi--overtime' : ''}`}
                onClick={() => navigate(`/rincian/${p.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Sesi slot ${p.slotId} atas nama ${p.namaPemesan}, klik untuk lihat rincian`}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/rincian/${p.id}`)}
              >
                {/* Aksen kiri berwarna */}
                <div className={`kartu-sesi__aksen ${isOvertime ? 'kartu-sesi__aksen--overtime' : 'kartu-sesi__aksen--normal'}`}
                  aria-hidden="true" />

                <div className="kartu-sesi__konten">
                  <div className="kartu-sesi__header">
                    <span className="kartu-sesi__slot">{p.slotId}</span>
                    {isOvertime ? (
                      <span className="badge-overtime badge-overtime--kecil">Overtime</span>
                    ) : (
                      <span className="badge-aktif badge-aktif--kecil">Aktif</span>
                    )}
                  </div>

                  <div className="kartu-sesi__info">
                    <div className="kartu-sesi__baris">
                      <span className="material-symbols-outlined kartu-sesi__ikon-kecil" aria-hidden="true">person</span>
                      <span>{p.namaPemesan}</span>
                    </div>
                    <div className="kartu-sesi__baris">
                      <span className="material-symbols-outlined kartu-sesi__ikon-kecil" aria-hidden="true">pin</span>
                      <span className="kartu-sesi__plat">{p.nomorPlat}</span>
                    </div>
                    <div className="kartu-sesi__baris">
                      <span className="material-symbols-outlined kartu-sesi__ikon-kecil" aria-hidden="true">schedule</span>
                      <span>Mulai: {formatTanggalIndo(p.waktuMulai)}</span>
                    </div>
                    <div className="kartu-sesi__baris">
                      <span className="material-symbols-outlined kartu-sesi__ikon-kecil" aria-hidden="true">payments</span>
                      <span>{formatRupiah(p.totalBiaya)} · {p.durasiJam} jam</span>
                    </div>
                  </div>
                </div>

                <div className="kartu-sesi__arrow" aria-hidden="true">
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatusLangsung;
