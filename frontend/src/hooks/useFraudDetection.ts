"use client";

/**
 * hooks/useFraudDetection.ts — Custom hook for fraud risk analysis.
 *
 * Handles API calls to fraud detection endpoint and manages loading/error states.
 */

import { useState, useCallback } from 'react';
import { getAuthToken } from '../lib/authToken';

interface FraudIndicator {
  name: string;
  score: number;
  weight: number;
  reason: string;
  triggered: boolean;
}

export interface FraudAnalysis {
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  indicators: FraudIndicator[];
  recommendation: string;
  flaggedRecord?: {
    id: string;
    status: string;
  };
}

interface UseFraudDetectionReturn {
  fraudAnalysis: FraudAnalysis | null;
  isLoading: boolean;
  error: string | null;
  checkFraud: (landId: string, fromAddress: string, toAddress: string, transferPrice?: string) => Promise<FraudAnalysis | null>;
  approveFraud: (fraudRecordId: string) => Promise<void>;
  rejectFraud: (fraudRecordId: string) => Promise<void>;
  clear: () => void;
}

export function useFraudDetection(): UseFraudDetectionReturn {
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkFraud = useCallback(
    async (landId: string, fromAddress: string, toAddress: string, transferPrice?: string): Promise<FraudAnalysis | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const response = await fetch('/api/v1/fraud/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            landId,
            fromAddress,
            toAddress,
            transferPrice,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Fraud check failed');
        }

        const data = await response.json();
        const analysis = data.data;

        setFraudAnalysis(analysis);
        return analysis;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('[useFraudDetection] Error:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const approveFraud = useCallback(async (fraudRecordId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/v1/fraud/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fraudRecordId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approval failed');
      }

      setFraudAnalysis(null); // Clear the analysis after approval
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useFraudDetection] Approval error:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectFraud = useCallback(async (fraudRecordId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/v1/fraud/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fraudRecordId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Rejection failed');
      }

      setFraudAnalysis(null); // Clear the analysis after rejection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useFraudDetection] Rejection error:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setFraudAnalysis(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    fraudAnalysis,
    isLoading,
    error,
    checkFraud,
    approveFraud,
    rejectFraud,
    clear,
  };
}

export default useFraudDetection;
