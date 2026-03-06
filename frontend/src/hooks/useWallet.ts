/**
 * useWallet.ts — React hook for wallet connection state.
 * Actual wallet logic will be implemented in a later feature phase.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { getConnectedAddress, getProvider } from '@lib/ethers';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const INITIAL_STATE: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  error: null,
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const address = await getConnectedAddress();
      const provider = await getProvider();
      const network = await provider.getNetwork();
      setState({
        address,
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Auto-reconnect if previously connected
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      getConnectedAddress()
        .then(async (address) => {
          const provider = await getProvider();
          const network = await provider.getNetwork();
          setState({
            address,
            chainId: Number(network.chainId),
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        })
        .catch(() => {
          /* Not yet connected — silent */
        });
    }
  }, []);

  return { ...state, connect, disconnect };
}
