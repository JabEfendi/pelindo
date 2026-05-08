/**
 * Popover informasi slot yang muncul saat user mengklik slot di peta.
 * Menampilkan detail slot beserta opsi untuk membuat pemesanan
 * atau melihat detail pemesanan aktif.
 */

import type { SlotParkir, Pemesanan } from '../../types';
import { formatRupiah, formatTanggalIndo } from '../../utils/formatRupiah';
import StatusChip from '../ui/StatusChip';

interface SlotPopoverProps {
  slot: SlotParkir;
  pemesananAktif?: Pemesanan;
  onPesan: (slotId: string) => void;
  onLihatRincian: (pemesananId: string) => void;
  onTutup: () => void;
}

const SlotPopover = ({
  slot,
  pemesananAktif,
  onPesan,
  onLihatRincian,
  onTutup,
}: SlotPopoverProps) => {
  const namaZona: Record<string, string> = {
    A: 'Zona A — Premium Dalam Ruangan',
    B: 'Zona B — Standar Terbuka',
    C: 'Zona C — Reguler',
    D: 'Zona D — Ukuran Besar',
  };

  return (
    <div className="slot-popover" role="dialog" aria-label={`Informasi slot ${slot.id}`}>
      {/* Header popover */}
      <div className="slot-popover__header">
        <div>
          <span className="slot-popover__slot-id">Slot {slot.id}</span>
          <p className="slot-popover__zona">{namaZona[slot.zona]}</p>
        </div>
        <div className="slot-popover__header-right">
          <StatusChip status={slot.status} />
          <button
            className="slot-popover__tutup"
            onClick={onTutup}
            aria-label="Tutup popover"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      {/* Detail pemesanan aktif (jika slot sedang terisi) */}
      {pemesananAktif && (
        <div className="slot-popover__detail">
          <div className="slot-popover__baris">
            <span className="slot-popover__label">Pemesan</span>
            <span className="slot-popover__nilai">{pemesananAktif.namaPemesan}</span>
          </div>
          <div className="slot-popover__baris">
            <span className="slot-popover__label">Plat</span>
            <span className="slot-popover__nilai slot-popover__nilai--plat">
              {pemesananAktif.nomorPlat}
            </span>
          </div>
          <div className="slot-popover__baris">
            <span className="slot-popover__label">Durasi</span>
            <span className="slot-popover__nilai">{pemesananAktif.durasiJam} jam</span>
          </div>
          <div className="slot-popover__baris">
            <span className="slot-popover__label">Mulai</span>
            <span className="slot-popover__nilai">
              {formatTanggalIndo(pemesananAktif.waktuMulai)}
            </span>
          </div>
          <div className="slot-popover__baris">
            <span className="slot-popover__label">Tarif</span>
            <span className="slot-popover__nilai">
              {formatRupiah(pemesananAktif.tarifPerJam)}/jam
            </span>
          </div>
        </div>
      )}

      {/* Slot tersedia: tampilkan tombol pesan */}
      {slot.status === 'tersedia' && (
        <p className="slot-popover__tersedia-teks">
          Slot ini tersedia. Klik di bawah untuk melakukan pemesanan.
        </p>
      )}

      {/* Tombol aksi */}
      <div className="slot-popover__actions">
        {slot.status === 'tersedia' ? (
          <button
            id={`btn-pesan-${slot.id}`}
            className="btn btn--primary btn--sm"
            onClick={() => onPesan(slot.id)}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
            Pesan Slot Ini
          </button>
        ) : pemesananAktif ? (
          <button
            id={`btn-lihat-${slot.id}`}
            className="btn btn--secondary btn--sm"
            onClick={() => onLihatRincian(pemesananAktif.id)}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            Lihat Rincian
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SlotPopover;
