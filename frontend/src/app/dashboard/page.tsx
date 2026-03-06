'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { landsApi, type Land } from '../../lib/lands';
import LandCard from '../../components/LandCard';

export default function DashboardPage() {
  const [lands, setLands]     = useState<Land[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all');

  const limit = 12;

  useEffect(() => {
    setLoading(true);
    setError('');
    const active = filter === 'all' ? undefined : filter === 'active';
    landsApi
      .list(page, limit, active)
      .then((res) => {
        setLands(res.data);
        setTotal(res.meta.total);
      })
      .catch(() => setError('Failed to load land records. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [page, filter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Land Registry Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                {total} parcel{total !== 1 ? 's' : ''} registered on the blockchain
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              + Register Parcel
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && lands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl">🏠</div>
            <h3 className="mt-4 text-lg font-semibold text-gray-700">No parcels registered yet</h3>
            <p className="mt-1 text-sm text-gray-500">Be the first to register a land parcel.</p>
            <Link
              href="/register"
              className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              Register Now
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && lands.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lands.map((land) => (
                <LandCard key={land.id} land={land} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
