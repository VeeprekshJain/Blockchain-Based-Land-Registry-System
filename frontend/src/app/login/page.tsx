'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [loadingDevToken, setLoadingDevToken] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existingToken = localStorage.getItem('accessToken');
    if (existingToken) {
      setToken(existingToken);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      localStorage.removeItem('accessToken');
      setSaved(false);
      return;
    }

    localStorage.setItem('accessToken', trimmedToken);
    setSaved(true);
    router.push('/register');
  };

  const handleGenerateDevToken = async () => {
    setLoadingDevToken(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/dev-auth/token');
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { accessToken?: string };
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.data?.accessToken) {
        throw new Error(payload.message ?? payload.error ?? 'Failed to generate dev token');
      }

      setToken(payload.data.accessToken);
      localStorage.setItem('accessToken', payload.data.accessToken);
      setSaved(true);
      router.push('/register');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Failed to generate dev token');
    } finally {
      setLoadingDevToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            JWT Access Token
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Set your admin token</h1>
          <p className="mt-2 text-sm text-gray-500">
            This app does not have a password login screen. Paste your JWT here so the protected
            registration and transfer actions can run.
          </p>
        </div>

        <label className="block text-sm font-medium text-gray-700">Access Token</label>
        <textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste JWT here"
          className="mt-2 min-h-40 w-full rounded-2xl border border-gray-300 px-4 py-3 font-mono text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
          >
            Save Token
          </button>
          <button
            type="button"
            onClick={handleGenerateDevToken}
            disabled={loadingDevToken}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition"
          >
            {loadingDevToken ? 'Generating…' : 'Generate Dev Token'}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('accessToken');
              setToken('');
              setSaved(false);
            }}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Clear Token
          </button>
          <Link
            href="/register"
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Go to Register
          </Link>
        </div>

        <p className={`mt-4 text-sm ${saved ? 'text-green-600' : 'text-amber-600'}`}>
          {saved ? '✅ Token saved in localStorage.' : '⚠️ No token saved yet.'}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}