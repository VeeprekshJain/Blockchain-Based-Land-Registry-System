'use client';
import { useState } from 'react';
import { landsApi } from '../../lib/lands';

export default function TransferPage() {
  const [form, setForm] = useState({ landId: '', newOwner: '', newOwnerName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState<{ txHash: string; blockNumber: number } | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const res = await landsApi.transfer(form);
      setSuccess({ txHash: res.data.txHash, blockNumber: res.data.blockNumber });
      setForm({ landId: '', newOwner: '', newOwnerName: '' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Transfer failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Transfer Ownership</h1>
          <p className="mt-1 text-sm text-gray-500">
            Transfer a land parcel to a new owner on-chain.
          </p>
          <div className="mt-2 inline-block rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            ⚠️ Requires admin JWT — set <code>accessToken</code> in localStorage first.
          </div>
        </div>

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">✅ Ownership transferred!</p>
            <div className="mt-2 space-y-1 text-xs text-green-600">
              <p>Tx Hash: <span className="font-mono break-all">{success.txHash}</span></p>
              <p>Block: #{success.blockNumber}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Land ID</label>
              <input
                required
                value={form.landId}
                onChange={set('landId')}
                placeholder="e.g. PLOT-MH-2024-001"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Owner Address</label>
              <input
                required
                value={form.newOwner}
                onChange={set('newOwner')}
                placeholder="0x..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Owner Name</label>
              <input
                required
                value={form.newOwnerName}
                onChange={set('newOwnerName')}
                placeholder="Full legal name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
            ⚠️ This action is <strong>irreversible</strong>. The ownership record will be permanently
            written to the blockchain.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60 transition"
          >
            {loading ? 'Submitting to blockchain…' : 'Transfer Ownership'}
          </button>
        </form>
      </div>
    </div>
  );
}
