'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { landsApi } from '../../lib/lands';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  selectedAddress?: string;
};

type Field = { id: string; label: string; placeholder: string; type?: string };

const fields: Field[] = [
  { id: 'landId',       label: 'Land ID',          placeholder: 'e.g. PLOT-MH-2024-001' },
  { id: 'ownerAddress', label: 'Owner Address',     placeholder: '0x...', type: 'text' },
  { id: 'ownerName',    label: 'Owner Name',        placeholder: 'Full legal name' },
  { id: 'location',     label: 'Location',          placeholder: 'Survey No. 42, Pune, Maharashtra' },
  { id: 'area',         label: 'Area',              placeholder: 'e.g. 1200 sq ft' },
  { id: 'documentHash', label: 'IPFS Document Hash', placeholder: 'QmXyz... (IPFS CID)' },
];

type FormData = Record<string, string>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm]             = useState<FormData>({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState<{ txHash: string; blockNumber: number } | null>(null);
  const [hasToken, setHasToken]     = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [hasMetaMask, setHasMetaMask]     = useState(false);

  useEffect(() => {
    const token = (async () => null)();
    // use centralized token helper
    // eslint-disable-next-line import/no-named-as-default-member
    const { getAuthToken, maskTokenForLog, isValidJwtShape } = require('../../lib/authToken');
    const raw = localStorage.getItem('accessToken');
    const t = getAuthToken();
    setHasToken(!!t);
    // If there was a raw value but it's invalid, show clear message
    if (raw && !isValidJwtShape(raw)) {
      setError('Invalid token stored. Please login again.');
    }
    // eslint-disable-next-line no-console
    console.debug('[Register] has valid token?', !!t, 'token=', maskTokenForLog(t));
    setHasMetaMask(typeof window !== 'undefined' && !!window.ethereum);
    // Auto-detect if wallet already connected
    const provider = typeof window !== 'undefined' ? (window.ethereum as EthereumProvider | undefined) : undefined;
    if (provider?.selectedAddress) {
      const addr = provider.selectedAddress;
      setWalletAddress(addr);
      setForm(prev => ({ ...prev, ownerAddress: addr }));
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not found. Install it from https://metamask.io or paste your address manually.');
      return;
    }
    try {
      const provider = window.ethereum as EthereumProvider;
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const addr = accounts[0];
      setWalletAddress(addr);
      setForm(prev => ({ ...prev, ownerAddress: addr }));
    } catch {
      setError('Wallet connection cancelled.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const res = await landsApi.register({
        landId:       form['landId']       ?? '',
        ownerAddress: form['ownerAddress'] ?? '',
        ownerName:    form['ownerName']    ?? '',
        location:     form['location']     ?? '',
        area:         form['area']         ?? '',
        documentHash: form['documentHash'] ?? '',
      });
      // debug
      // eslint-disable-next-line no-console
      console.debug('[Register] POST /lands response meta/data keys:', Object.keys(res));
      setSuccess({ txHash: res.data.txHash, blockNumber: res.data.blockNumber });
      setForm({});
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; data?: string; error?: string } } })?.response?.data;
      // Backend Zod errors are returned in the `error` field; prefer that, then `data`, then `message`.
      const msg = resp?.error
        ? `${resp.message}: ${resp.error}`
        : resp?.data
        ? `${resp.message}: ${resp.data}`
        : resp?.message ?? 'Registration failed. Check the admin JWT token and backend.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Register Land Parcel</h1>
          <p className="mt-1 text-sm text-gray-500">
            This will create an on-chain record via the LandRegistry smart contract.
          </p>
          <div className={`mt-2 inline-block rounded border px-3 py-1.5 text-xs ${hasToken ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {hasToken
              ? '✅ Admin JWT detected in localStorage'
              : '⚠️ Requires admin JWT — set accessToken in localStorage first.'}
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">✅ Land registered on blockchain!</p>
            <div className="mt-2 space-y-1 text-xs text-green-600">
              <p>Tx Hash: <span className="font-mono break-all">{success.txHash}</span></p>
              <p>Block: #{success.blockNumber}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition"
            >
              View Dashboard →
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-5">
            {fields.map(({ id, label, placeholder }) => (
              <div key={id}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">{label}</label>
                  {id === 'ownerAddress' && (
                    walletAddress ? (
                      <span className="text-xs text-green-600 font-medium">🦊 Wallet connected</span>
                    ) : (
                      <button
                        type="button"
                        onClick={connectWallet}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500 underline underline-offset-2"
                      >
                        {hasMetaMask ? '🦊 Connect MetaMask' : 'No wallet? Paste address manually'}
                      </button>
                    )
                  )}
                </div>
                <input
                  required
                  value={form[id] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {loading ? 'Submitting to blockchain…' : 'Register Land Parcel'}
          </button>
        </form>
      </div>
    </div>
  );
}
