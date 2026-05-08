/**
 * Modal konfirmasi yang muncul setelah pemesanan berhasil dibuat.
 * Menampilkan ringkasan pemesanan dan dua tombol aksi:
 * tutup (kembali ke dashboard) atau lihat rincian sesi.
 */

import { useNavigate } from 'react-router-dom';
import type { Pemesanan } from '../../types';
import { formatRupiah, formatTanggalIndo } from '../../utils/formatRupiah';

interface ModalKonfirmasiProps {
  pemesanan: Pemesanan;
  onTutup: () => void;
}

const ModalKonfirmasi = ({ pemesanan, onTutup }: ModalKonfirmasiProps) => {
  const navigate = useNavigate();

  const handleLihatRincian = () => {
    onTutup();
    navigate(`/rincian/${pemesanan.id}`);
  };

  // Cegah klik di luar modal langsung menutup
  const handleBackdropKlik = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onTutup();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropKlik}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-judul"
    >
      <div className="modal-konten">
        {/* Ikon sukses */}
        <div className="modal-konten__ikon-sukses" aria-hidden="true">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
        </div>

        {/* Judul & deskripsi */}
        <h3 id="modal-judul" className="modal-konten__judul">
          Pemesanan Berhasil!
        </h3>
        <p className="modal-konten__deskripsi">
          Slot <strong>{pemesanan.slotId}</strong> telah berhasil dipesan.
        </p>

        {/* Ringkasan pemesanan */}
        <div className="modal-konten__ringkasan">
          <div className="modal-konten__baris">
            <span>Pemesan</span>
            <span>{pemesanan.namaPemesan}</span>
          </div>
          <div className="modal-konten__baris">
            <span>Plat Kendaraan</span>
            <span className="modal-konten__plat">{pemesanan.nomorPlat}</span>
          </div>
          <div className="modal-konten__baris">
            <span>Jenis Kendaraan</span>
            <span>{pemesanan.tipeKendaraan}</span>
          </div>
          <div className="modal-konten__baris">
            <span>Durasi</span>
            <span>{pemesanan.durasiJam} jam</span>
          </div>
          <div className="modal-konten__baris">
            <span>Waktu Mulai</span>
            <span>{formatTanggalIndo(pemesanan.waktuMulai)}</span>
          </div>
          <div className="modal-konten__baris modal-konten__baris--total">
            <span>Total Biaya</span>
            <span className="modal-konten__total">
              {formatRupiah(pemesanan.totalBiaya)}
            </span>
          </div>
        </div>

        {/* Tombol aksi */}
        <div className="modal-konten__actions">
          <button
            id="btn-modal-tutup"
            className="btn btn--outline"
            onClick={onTutup}
            type="button"
          >
            Tutup
          </button>
          <button
            id="btn-modal-rincian"
            className="btn btn--secondary"
            onClick={handleLihatRincian}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              info
            </span>
            Lihat Rincian
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalKonfirmasi;
