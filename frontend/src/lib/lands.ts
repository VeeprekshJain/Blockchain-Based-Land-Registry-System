/**
 * lib/lands.ts — API service for land operations.
 */
import { apiClient } from './api';

export interface Land {
  id: string;
  landId: string;
  ownerAddress: string;
  ownerName: string;
  location: string;
  area: string;
  documentHash: string;
  txHash: string;
  blockNumber: number;
  isActive: boolean;
  registeredAt: string;
  lastTransferAt: string;
  createdAt: string;
  liveOwnerAddress?: string;
  liveOwnerName?: string;
  liveLastTransferAt?: string;
  liveIsActive?: boolean;
}

export interface PaginatedLands {
  success: boolean;
  data: Land[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface LandResponse {
  success: boolean;
  data: { land: Land; txHash: string; blockNumber: number };
  message: string;
}

export const landsApi = {
  list: (page = 1, limit = 20, active?: boolean, q?: string) =>
    apiClient
      .get<PaginatedLands>('/lands', {
        params: { page, limit, ...(active !== undefined ? { active } : {}), ...(q ? { q } : {}) },
      })
      .then((r) => r.data),

  get: (landId: string) =>
    apiClient.get<{ success: boolean; data: Land }>(`/lands/${landId}`).then((r) => r.data),

  register: (body: {
    landId: string;
    ownerAddress: string;
    ownerName: string;
    location: string;
    area: string;
    documentHash: string;
  }) => apiClient.post<LandResponse>('/lands', body).then((r) => r.data),

  transfer: (body: { landId: string; newOwner: string; newOwnerName: string }) =>
    apiClient.post<LandResponse>('/lands/transfer', body).then((r) => r.data),

  deactivate: (landId: string) =>
    apiClient.patch<LandResponse>(`/lands/${landId}/deactivate`).then((r) => r.data),

  reactivate: (landId: string) =>
    apiClient.patch<LandResponse>(`/lands/${landId}/reactivate`).then((r) => r.data),
};
