'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { landsApi, type Land } from '../../../lib/lands';
import StatusBadge from '../../../components/StatusBadge';

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 break-all sm:max-w-xs sm:text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function LandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [land, setLand]       = useState<Land | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    landsApi
      .get(id)
      .then((res) => setLand(res.data))
      .catch(() => setError('Land parcel not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !land) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="text-5xl">❌</div>
        <h2 className="text-lg font-semibold text-gray-700">{error || 'Not found'}</h2>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-6">
        {/* Back */}
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-400">{land.landId}</p>
              <h1 className="mt-1 text-xl font-bold text-gray-900">{land.ownerName}</h1>
            </div>
            <StatusBadge active={land.isActive} />
          </div>

          {/* Divider */}
          <hr className="my-4 border-gray-100" />

          {/* Details */}
          <div className="divide-y divide-gray-100">
            <Row label="Owner Address" value={land.ownerAddress} mono />
            <Row label="Location"      value={land.location} />
            <Row label="Area"          value={land.area} />
            <Row label="Document Hash" value={land.documentHash} mono />
            <Row label="Tx Hash"       value={land.txHash} mono />
            <Row label="Block Number"  value={`#${land.blockNumber}`} />
            <Row label="Registered At" value={new Date(land.registeredAt).toLocaleString()} />
            <Row label="Last Transfer" value={new Date(land.lastTransferAt).toLocaleString()} />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Link
            href={`/transfer?landId=${land.landId}`}
            className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-orange-500 transition"
          >
            Transfer Ownership
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Back to List
          </Link>
        </div>
      </div>
    </div>
  );
}
