import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  isAddress,
  type Eip1193Provider,
  type InterfaceAbi,
} from 'ethers';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type LandRecord = {
  owner: string;
  ownerName: string;
  location: string;
  area: string;
  documentHash: string;
  registeredAt: bigint;
  lastTransferAt: bigint;
  isActive: boolean;
};

export const LAND_REGISTRY_ABI: InterfaceAbi = [
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'landId', type: 'string' },
      { name: 'newOwner', type: 'address' },
      { name: 'newOwnerName', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'landExists',
    stateMutability: 'view',
    inputs: [{ name: 'landId', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getLandDetails',
    stateMutability: 'view',
    inputs: [{ name: 'landId', type: 'string' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'ownerName', type: 'string' },
          { name: 'location', type: 'string' },
          { name: 'area', type: 'string' },
          { name: 'documentHash', type: 'string' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'lastTransferAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
] as const;

export function getContractAddress(): string {
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '').trim();
}

export function getExpectedChainId(): number {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '31337');
  return Number.isFinite(chainId) ? chainId : 31337;
}

export function getRpcUrl(): string {
  return (process.env.NEXT_PUBLIC_RPC_URL ?? '').trim();
}

export function getExplorerBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? '').trim();
}

export function isConfiguredContractAddress(): boolean {
  return isAddress(getContractAddress());
}

export function getExplorerTxUrl(txHash: string): string {
  const baseUrl = getExplorerBaseUrl();
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/tx/${txHash}` : '';
}

export function getBlockchainError(error: unknown): string {
  // eslint-disable-next-line no-console
  console.error('Full blockchain error:', error);

  const fragments = [
    (error as { reason?: string })?.reason,
    (error as { shortMessage?: string })?.shortMessage,
    (error as { info?: { error?: { message?: string } } })?.info?.error?.message,
    (error as { data?: { message?: string } | string })?.data && typeof (error as { data?: { message?: string } | string }).data === 'object'
      ? (error as { data?: { message?: string } | string }).data?.message
      : undefined,
    (error as { message?: string })?.message,
  ]
    .filter(Boolean)
    .map((part) => String(part));

  const message = fragments.join(' | ');
  const lower = message.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('rejected the request') || lower.includes('denied transaction signature')) {
    return 'Transaction rejected in MetaMask';
  }

  if (lower.includes('insufficient funds')) {
    return 'Wallet does not have enough ETH for gas';
  }

  if (lower.includes('network changed')) {
    return 'Wrong network selected';
  }

  if (lower.includes('missing revert data')) {
    return 'Missing revert data. Check contract address, ABI, and selected network.';
  }

  if (lower.includes('execution reverted')) {
    return message || 'Transaction execution reverted';
  }

  return message || 'Unknown blockchain error';
}

export async function getMetaMaskProvider(): Promise<BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask to continue.');
  }

  return new BrowserProvider(window.ethereum);
}

export async function connectWallet(): Promise<{
  provider: BrowserProvider;
  signer: Awaited<ReturnType<BrowserProvider['getSigner']>>;
  account: string;
  chainId: number;
}> {
  const provider = await getMetaMaskProvider();
  await provider.send('eth_requestAccounts', []);
  const network = await provider.getNetwork();
  const signer = await provider.getSigner();
  const account = await signer.getAddress();

  return {
    provider,
    signer,
    account,
    chainId: Number(network.chainId),
  };
}

export async function switchOrAddExpectedNetwork(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask to continue.');
  }

  const expectedChainId = getExpectedChainId();
  const hexChainId = `0x${expectedChainId.toString(16)}`;
  const rpcUrl = getRpcUrl();
  const explorerUrl = getExplorerBaseUrl();

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
    return;
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) {
      throw error;
    }
  }

  if (!rpcUrl) {
    throw new Error(`Please switch MetaMask to chain ID ${expectedChainId}.`);
  }

  const chainConfig: Record<string, unknown> = {
    chainId: hexChainId,
    chainName: expectedChainId === 31337 ? 'Hardhat Localhost' : `Chain ${expectedChainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [rpcUrl],
  };

  if (explorerUrl) {
    chainConfig.blockExplorerUrls = [explorerUrl];
  }

  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [chainConfig],
  });
}

export function getSignerContract(signer: Awaited<ReturnType<BrowserProvider['getSigner']>>): Contract {
  const contractAddress = getContractAddress();
  if (!isAddress(contractAddress)) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid.');
  }

  return new Contract(contractAddress, LAND_REGISTRY_ABI, signer);
}

export function getReadOnlyContract(): Contract {
  const contractAddress = getContractAddress();
  const rpcUrl = getRpcUrl();

  if (!isAddress(contractAddress)) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is missing or invalid.');
  }

  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_RPC_URL is missing.');
  }

  return new Contract(contractAddress, LAND_REGISTRY_ABI, new JsonRpcProvider(rpcUrl));
}

export async function readLandDetails(landId: string): Promise<LandRecord> {
  const contract = getReadOnlyContract();
  return (await contract.getLandDetails(landId)) as LandRecord;
}
