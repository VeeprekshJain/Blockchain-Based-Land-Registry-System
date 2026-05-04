'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAddress } from 'ethers';
import type { ChangeEvent, FormEvent } from 'react';
import {
  getBlockchainError,
  getContractAddress,
  getExpectedChainId,
  getExplorerTxUrl,
  getMetaMaskProvider,
  getSignerContract,
  isConfiguredContractAddress,
  readLandDetails,
  switchOrAddExpectedNetwork,
} from '../../lib/landRegistry';
import { useFraudDetection } from '../../hooks/useFraudDetection';

type TransferStatus =
  | 'idle'
  | 'checking-wallet'
  | 'checking-land'
  | 'waiting-confirmation'
  | 'transaction-submitted'
  | 'waiting-confirmations'
  | 'success'
  | 'failed';

type DebugState = {
  contractLoaded: boolean;
  currentChainId: number | null;
  connectedWallet: string;
  currentOwner: string;
  currentOwnerName: string;
  walletIsCurrentOwner: boolean | null;
  landExists: boolean | null;
  currentOwnerAddressValid: boolean | null;
};

export default function TransferPage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ landId: '', newOwner: '', newOwnerName: '' });
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    txHash: string;
    blockNumber: number;
    oldOwner: string;
    newOwner: string;
    explorerUrl: string;
  } | null>(null);
  const [debug, setDebug] = useState<DebugState>({
    contractLoaded: isConfiguredContractAddress(),
    currentChainId: null,
    connectedWallet: '',
    currentOwner: '',
    currentOwnerName: '',
    walletIsCurrentOwner: null,
    landExists: null,
    currentOwnerAddressValid: null,
  });
  const { fraudAnalysis, isLoading: isFraudLoading, checkFraud, clear } = useFraudDetection();

  const contractAddress = getContractAddress();
  const expectedChainId = getExpectedChainId();
  const isDev = process.env.NODE_ENV !== 'production';
  const isNewOwnerValid = isAddress(form.newOwner.trim());

  useEffect(() => {
    const landIdFromUrl = searchParams.get('landId');
    if (landIdFromUrl) {
      setForm((prev) => ({ ...prev, landId: landIdFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function syncWalletPreview() {
      try {
        if (typeof window === 'undefined' || !window.ethereum) {
          if (!cancelled) {
            setDebug((prev) => ({ ...prev, contractLoaded: isConfiguredContractAddress() }));
          }
          return;
        }

        const provider = await getMetaMaskProvider();
        const accounts = (await provider.send('eth_accounts', [])) as string[];
        const network = await provider.getNetwork();

        if (!cancelled) {
          setDebug((prev) => ({
            ...prev,
            contractLoaded: isConfiguredContractAddress(),
            currentChainId: Number(network.chainId),
            connectedWallet: accounts[0] ?? '',
          }));
        }
      } catch {
        if (!cancelled) {
          setDebug((prev) => ({ ...prev, contractLoaded: isConfiguredContractAddress() }));
        }
      }
    }

    void syncWalletPreview();

    const handleAccountsChanged = (accounts: string[]) => {
      setDebug((prev) => ({ ...prev, connectedWallet: accounts[0] ?? '' }));
    };

    const handleChainChanged = (chainId: string) => {
      setDebug((prev) => ({ ...prev, currentChainId: Number.parseInt(chainId, 16) }));
    };

    window.ethereum?.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum?.on?.('chainChanged', handleChainChanged);

    return () => {
      cancelled = true;
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function previewLandState() {
      const landId = form.landId.trim();
      if (!landId || !isConfiguredContractAddress()) {
        setDebug((prev) => ({
          ...prev,
          landExists: null,
          currentOwner: '',
          currentOwnerName: '',
          walletIsCurrentOwner: null,
          currentOwnerAddressValid: null,
        }));
        return;
      }

      try {
        const details = await readLandDetails(landId);
        const connectedWallet = debug.connectedWallet;

        if (!cancelled) {
          setDebug((prev) => ({
            ...prev,
            landExists: true,
            currentOwner: details.owner,
            currentOwnerName: details.ownerName,
            walletIsCurrentOwner: connectedWallet
              ? details.owner.toLowerCase() === connectedWallet.toLowerCase()
              : null,
            currentOwnerAddressValid: isAddress(details.owner),
          }));
        }
      } catch {
        if (!cancelled) {
          setDebug((prev) => ({
            ...prev,
            landExists: false,
            currentOwner: '',
            currentOwnerName: '',
            walletIsCurrentOwner: null,
            currentOwnerAddressValid: null,
          }));
        }
      }
    }

    void previewLandState();

    return () => {
      cancelled = true;
    };
  }, [form.landId, debug.connectedWallet]);

  function setField(key: 'landId' | 'newOwner' | 'newOwnerName') {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function ensureExpectedNetwork() {
    const provider = await getMetaMaskProvider();
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    setDebug((prev) => ({ ...prev, currentChainId }));

    if (currentChainId === expectedChainId) {
      return;
    }

    await switchOrAddExpectedNetwork();
    const refreshedProvider = await getMetaMaskProvider();
    const refreshedNetwork = await refreshedProvider.getNetwork();
    const refreshedChainId = Number(refreshedNetwork.chainId);

    setDebug((prev) => ({ ...prev, currentChainId: refreshedChainId }));

    if (refreshedChainId !== expectedChainId) {
      throw new Error(`Wrong network selected. Please switch MetaMask to chain ID ${expectedChainId}.`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const landId = form.landId.trim();
    const newOwner = form.newOwner.trim();
    const newOwnerName = form.newOwnerName.trim();

    setError('');
    setSuccess(null);

    try {
      if (!landId) {
        throw new Error('Land ID is required');
      }

      if (!isAddress(newOwner)) {
        throw new Error('New owner address must be a valid Ethereum address');
      }

      if (!newOwnerName) {
        throw new Error('New owner name is required');
      }

      if (!isConfiguredContractAddress()) {
        throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid');
      }

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask to continue.');
      }

      setStatus('checking-wallet');
      await ensureExpectedNetwork();

      const provider = await getMetaMaskProvider();
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const connectedWallet = await signer.getAddress();

      setDebug((prev) => ({
        ...prev,
        connectedWallet,
        currentChainId: expectedChainId,
      }));

      setStatus('checking-land');
      const contract = getSignerContract(signer);
      const landExists = await contract.landExists(landId);
      setDebug((prev) => ({ ...prev, contractLoaded: true, landExists }));

      if (!landExists) {
        throw new Error(`Land "${landId}" not found on the blockchain`);
      }

      const details = (await contract.getLandDetails(landId)) as {
        owner: string;
        ownerName: string;
      };
      const currentOwner = details.owner;
      const walletIsCurrentOwner = currentOwner.toLowerCase() === connectedWallet.toLowerCase();

      setDebug((prev) => ({
        ...prev,
        currentOwner,
        currentOwnerName: details.ownerName,
        walletIsCurrentOwner,
        currentOwnerAddressValid: isAddress(currentOwner),
      }));

      if (!walletIsCurrentOwner) {
        throw new Error('Connected wallet is not the current owner of this land. Please switch MetaMask account.');
      }

      // Run fraud analysis before allowing transfer (visible to user)
      try {
        const analysis = await checkFraud(landId, currentOwner, newOwner);
        // If critical risk, block the transfer
        if (analysis && analysis.riskLevel === 'critical') {
          throw new Error(`Transfer blocked by fraud analyzer: ${analysis.reasons.join('; ')}`);
        }
      } catch (fraudErr) {
        // If fraud check failed due to network or auth, show message; otherwise surface reasons
        throw fraudErr;
      }

      setStatus('waiting-confirmation');
      const tx = await contract.transferOwnership(landId, newOwner, newOwnerName);
      setStatus('transaction-submitted');

      setStatus('waiting-confirmations');
      const receipt = await tx.wait(2);
      const blockNumber = Number(receipt?.blockNumber ?? 0);
      const explorerUrl = getExplorerTxUrl(tx.hash);

      setSuccess({
        txHash: tx.hash,
        blockNumber,
        oldOwner: currentOwner,
        newOwner,
        explorerUrl,
      });
      setStatus('success');

      void readLandDetails(landId)
        .then((chain) => {
          setDebug((prev) => ({
            ...prev,
            currentOwner: chain.owner,
            currentOwnerName: chain.ownerName,
            landExists: true,
            walletIsCurrentOwner: chain.owner.toLowerCase() === connectedWallet.toLowerCase(),
          }));
        })
        .catch(() => undefined);
    } catch (submitError: unknown) {
      setStatus('failed');
      setError(getBlockchainError(submitError));
    }
  }

  const statusMessage =
    status === 'checking-wallet'
      ? 'Checking wallet and network...'
      : status === 'checking-land'
        ? 'Checking land on blockchain...'
        : status === 'waiting-confirmation'
          ? 'Waiting for MetaMask confirmation...'
          : status === 'transaction-submitted'
            ? 'Transaction submitted...'
            : status === 'waiting-confirmations'
              ? 'Waiting for block confirmations...'
              : status === 'success'
                ? 'Transfer successful'
                : status === 'failed'
                  ? 'Transfer failed'
                  : '';

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Transfer Ownership</h1>
          <p className="mt-1 text-sm text-gray-500">
            Transfer a land parcel directly from MetaMask using the deployed smart contract.
          </p>
          <div className="mt-2 inline-flex items-center rounded border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700">
            ✅ MetaMask flow enabled
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Contract: <span className="font-mono">{contractAddress || 'Not configured'}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Expected chain ID: <span className="font-mono">{expectedChainId}</span>
          </div>
        </div>

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">✅ Transfer successful</p>
            <div className="mt-2 space-y-1 text-xs text-green-600">
              <p>
                Tx Hash: <span className="font-mono break-all">{success.txHash}</span>
              </p>
              <p>Block: #{success.blockNumber}</p>
              <p>
                Old owner: <span className="font-mono break-all">{success.oldOwner}</span>
              </p>
              <p>
                New owner: <span className="font-mono break-all">{success.newOwner}</span>
              </p>
              {success.explorerUrl && (
                <a
                  href={success.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
                >
                  View on Explorer
                </a>
              )}
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-md border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            {statusMessage}
          </div>
        )}

        {isFraudLoading && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            Running fraud analysis...
          </div>
        )}

        {fraudAnalysis && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
            <div className="font-semibold">Fraud analysis</div>
            <div className="mt-2 text-xs">
              Risk: <strong>{fraudAnalysis.riskLevel.toUpperCase()}</strong> • Score: <strong>{fraudAnalysis.fraudScore}</strong>
            </div>
            {fraudAnalysis.reasons?.length > 0 && (
              <div className="mt-2 text-xs">
                Reasons: {fraudAnalysis.reasons.join('; ')}
              </div>
            )}
            {fraudAnalysis.recommendation && (
              <div className="mt-2 text-xs">Recommendation: {fraudAnalysis.recommendation}</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Land ID</label>
              <input
                required
                value={form.landId}
                onChange={setField('landId')}
                placeholder="e.g. TEST-001"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Current chain owner: <span className="font-mono">{debug.currentOwner || 'Not loaded yet'}</span>
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Owner Address</label>
              <input
                required
                value={form.newOwner}
                onChange={setField('newOwner')}
                placeholder="0x..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Owner Name</label>
              <input
                required
                value={form.newOwnerName}
                onChange={setField('newOwnerName')}
                placeholder="Full legal name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
            ⚠️ This action is <strong>irreversible</strong>. The ownership record will be permanently written to the blockchain.
          </div>

          <button
            type="submit"
            disabled={status === 'checking-wallet' || status === 'checking-land' || status === 'waiting-confirmation' || status === 'waiting-confirmations'}
            className="mt-6 w-full rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60 transition"
          >
            {status === 'checking-wallet'
              ? 'Checking wallet...'
              : status === 'checking-land'
                ? 'Checking land...'
                : status === 'waiting-confirmation'
                  ? 'Waiting for MetaMask...'
                  : status === 'waiting-confirmations'
                    ? 'Waiting for confirmations...'
                    : 'Transfer Ownership'}
          </button>
        </form>

        {isDev && (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-xs text-gray-600">
            <div className="mb-2 font-semibold text-gray-700">Debug panel</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                Contract address: <span className="font-mono">{contractAddress || 'Not configured'}</span>
              </div>
              <div>
                Expected chain ID: <span className="font-mono">{expectedChainId}</span>
              </div>
              <div>
                Current chain ID: <span className="font-mono">{debug.currentChainId ?? 'Unknown'}</span>
              </div>
              <div>
                Connected wallet: <span className="font-mono break-all">{debug.connectedWallet || 'Not connected'}</span>
              </div>
              <div>
                Land ID: <span className="font-mono">{form.landId || '—'}</span>
              </div>
              <div>
                New owner address valid: <span className="font-mono">{String(isNewOwnerValid)}</span>
              </div>
              <div>
                Contract loaded: <span className="font-mono">{String(debug.contractLoaded)}</span>
              </div>
              <div>
                Land exists on-chain: <span className="font-mono">{debug.landExists === null ? 'Unknown' : String(debug.landExists)}</span>
              </div>
              <div>
                Current owner from blockchain: <span className="font-mono break-all">{debug.currentOwner || 'Not loaded'}</span>
              </div>
              <div>
                Current owner name: <span className="font-mono break-all">{debug.currentOwnerName || 'Not loaded'}</span>
              </div>
              <div>
                Current owner address valid: <span className="font-mono">{debug.currentOwnerAddressValid === null ? 'Unknown' : String(debug.currentOwnerAddressValid)}</span>
              </div>
              <div>
                Is connected wallet current owner: <span className="font-mono">{debug.walletIsCurrentOwner === null ? 'Unknown' : String(debug.walletIsCurrentOwner)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}