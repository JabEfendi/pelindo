/**
 * Komponen chip status untuk menampilkan status slot secara visual.
 * Menggunakan warna yang konsisten dengan peta Konva.
 */

import type { StatusSlot } from '../../types';

interface StatusChipProps {
  status: StatusSlot;
  /** Ukuran chip, default 'md' */
  ukuran?: 'sm' | 'md';
}

const LABEL_STATUS: Record<StatusSlot, string> = {
  tersedia: 'Tersedia',
  terisi: 'Terisi',
  overtime: 'Overtime',
  dipesan: 'Dipesan',
};

const StatusChip = ({ status, ukuran = 'md' }: StatusChipProps) => {
  return (
    <span
      className={`status-chip status-chip--${status} status-chip--${ukuran}`}
      role="status"
      aria-label={`Status: ${LABEL_STATUS[status]}`}
    >
      {LABEL_STATUS[status]}
    </span>
  );
};

export default StatusChip;
