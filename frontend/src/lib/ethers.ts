/**
 * ethers.ts — Ethers.js provider and contract instance helpers.
 * Actual contract ABIs and addresses will be imported after deployment.
 */
import { BrowserProvider, Contract, JsonRpcSigner, type Eip1193Provider, type InterfaceAbi } from 'ethers';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export async function getProvider(): Promise<BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet detected. Please install MetaMask.');
  }
  return new BrowserProvider(window.ethereum);
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = await getProvider();
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

export async function getContract(address: string, abi: InterfaceAbi): Promise<Contract> {
  const signer = await getSigner();
  return new Contract(address, abi, signer);
}

export async function getConnectedAddress(): Promise<string> {
  const signer = await getSigner();
  return signer.getAddress();
}
