import Link from 'next/link';
import type { Land } from '../lib/lands';
import StatusBadge from './StatusBadge';

export default function LandCard({ land }: { land: Land }) {
  const ownerName = land.liveOwnerName ?? land.ownerName;
  const ownerAddress = land.liveOwnerAddress ?? land.ownerAddress;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-gray-400">{land.landId}</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-gray-900">{ownerName}</h3>
        </div>
        <StatusBadge active={land.liveIsActive ?? land.isActive} />
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{land.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📐</span>
          <span>{land.area}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔑</span>
          <span className="truncate font-mono">{ownerAddress.slice(0, 10)}…{ownerAddress.slice(-6)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Block #{land.blockNumber}
        </span>
        <Link
          href={`/lands/${land.landId}`}
          className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
