'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { landsApi, type Land } from '../../lib/lands';
import LandCard from '../../components/LandCard';
import { getAuthToken, maskTokenForLog } from '../../lib/authToken';
import { getContractAddress, isConfiguredContractAddress, readLandDetails } from '../../lib/landRegistry';

export default function DashboardPage() {
  const [lands, setLands]     = useState<Land[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');

  const limit = 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const active = filter === 'all' ? undefined : filter === 'active';
    // Debug info
    // eslint-disable-next-line no-console
    console.debug('[Dashboard] API base:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1');
    // eslint-disable-next-line no-console
    console.debug('[Dashboard] endpoint: /lands', 'page', page, 'limit', limit, 'filterActive', active, 'q', query || '<none>');
    const token = getAuthToken();
    // eslint-disable-next-line no-console
    console.debug('[Dashboard] has valid token?', !!token, 'token=', maskTokenForLog(token));

    // If an invalid placeholder token was present, getAuthToken already removed it.
    // But if raw invalid content exists (rare), inform the user and skip fetch.
    const raw = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (raw && raw.trim().length > 0 && !token) {
      setLoading(false);
      setError('Invalid token stored. Please login again.');
      return;
    }

    landsApi
      .list(page, limit, active, query || undefined)
      .then(async (res) => {
        // eslint-disable-next-line no-console
        console.debug('[Dashboard] API Response:', { status: 200, meta: res.meta });

        const baseLands = res.data || [];

        if (!isConfiguredContractAddress()) {
          if (!cancelled) {
            setLands(baseLands);
            setTotal(res.meta?.total || 0);
          }
          return;
        }

        const merged = await Promise.all(
          baseLands.map(async (land) => {
            try {
              const chain = await readLandDetails(land.landId);
              return {
                ...land,
                liveOwnerAddress: chain.owner,
                liveOwnerName: chain.ownerName,
                liveLastTransferAt: new Date(Number(chain.lastTransferAt) * 1000).toISOString(),
                liveIsActive: chain.isActive,
              } as Land;
            } catch {
              return land;
            }
          }),
        );

        if (!cancelled) {
          setLands(merged);
          setTotal(res.meta?.total || 0);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[Dashboard] Failed to load lands:', err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load land records.';
        if (!cancelled) setError(errorMsg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, filter, query]);

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function clearSearch() {
    setSearch('');
    setQuery('');
    setPage(1);
  }

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
              {isConfiguredContractAddress() && (
                <p className="mt-1 text-xs text-gray-400">Live chain view: {getContractAddress()}</p>
              )}
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              + Register Parcel
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex w-full gap-2 sm:w-auto">
              <input
                aria-label="Search lands"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Land ID, owner, location or IPFS hash"
                className="rounded-lg border px-3 py-2 text-sm shadow-sm"
              />
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Search</button>
              <button type="button" onClick={clearSearch} className="rounded-lg bg-gray-100 px-3 py-2 text-sm">Clear</button>
            </form>

            <div className="mt-2 sm:mt-0">
              <div className="flex gap-2">
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
