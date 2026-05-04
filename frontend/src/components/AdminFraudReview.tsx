'use client';

/**
 * components/AdminFraudReview.tsx — Admin panel for reviewing flagged transfers.
 *
 * Displays list of transfers flagged for manual review with details and approval/rejection UI.
 * Shows fraud statistics and allows admins to make decisions on high-risk transfers.
 */

import { useEffect, useState } from 'react';
import { FraudRiskCard } from './FraudRiskCard';

interface FraudRecord {
  id: string;
  landId: string;
  fromAddress: string;
  toAddress: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  status: 'flagged' | 'approved' | 'rejected' | 'expired';
  indicators: Array<{
    name: string;
    score: number;
    weight: number;
    reason: string;
    triggered: boolean;
  }>;
  recommendation: string;
  flaggedAt: string;
  approvalBy?: string;
  approvedAt?: string;
}

interface AdminFraudReviewProps {
  onLoadStatistics?: (stats: any) => void;
  isAdmin?: boolean;
}

export function AdminFraudReview({ onLoadStatistics, isAdmin = true }: AdminFraudReviewProps) {
  const [fraudRecords, setFraudRecords] = useState<FraudRecord[]>([]);
  const [stats, setStats] = useState({
    totalFlagged: 0,
    totalApproved: 0,
    totalRejected: 0,
    avgScore: 0,
    criticalCount: 0,
    highCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'flagged' | 'approved' | 'rejected' | 'all'>('flagged');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load fraud records and stats
  useEffect(() => {
    loadFraudData();
  }, []);

  const loadFraudData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { getAuthToken } = await import('../lib/authToken');
      const token = getAuthToken();
      // Fetch statistics
      const statsResponse = await fetch('/api/v1/fraud/stats', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
        onLoadStatistics?.(statsData.data);
      }

      // Fetch flagged records (would need pagination in production)
      const recordsResponse = await fetch('/api/v1/fraud/records?limit=50', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setFraudRecords(recordsData.data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fraud data';
      setError(errorMessage);
      console.error('[AdminFraudReview] Error loading data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (recordId: string) => {
    setProcessingId(recordId);

    try {
      const { getAuthToken } = await import('../lib/authToken');
      const token = getAuthToken();
      const response = await fetch('/api/v1/fraud/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fraudRecordId: recordId }),
      });

      if (response.ok) {
        // Refresh data after approval
        await loadFraudData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to approve transfer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AdminFraudReview] Approval error:', errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (recordId: string) => {
    setProcessingId(recordId);

    try {
      const { getAuthToken } = await import('../lib/authToken');
      const token = getAuthToken();
      const response = await fetch('/api/v1/fraud/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fraudRecordId: recordId }),
      });

      if (response.ok) {
        // Refresh data after rejection
        await loadFraudData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reject transfer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AdminFraudReview] Rejection error:', errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRecords = fraudRecords.filter((record) => (filter === 'all' ? true : record.status === filter));

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">🔒 Access Denied</p>
        <p className="text-sm mt-1">Only administrators can access the fraud review panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Fraud Review Dashboard</h2>
          <p className="text-gray-600 mt-2">Review and approve high-risk transfer flags</p>
        </div>
        <button
          onClick={loadFraudData}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Pending Review" value={stats.totalFlagged} icon="⏳" color="yellow" />
        <StatCard title="Approved" value={stats.totalApproved} icon="✓" color="green" />
        <StatCard title="Rejected" value={stats.totalRejected} icon="✗" color="red" />
        <StatCard title="Critical Risk" value={stats.criticalCount} icon="🚨" color="critical" />
        <StatCard title="High Risk" value={stats.highCount} icon="🔴" color="high" />
        <StatCard title="Avg Score" value={`${stats.avgScore.toFixed(1)}/100`} icon="📊" color="blue" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {(['flagged', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              filter === status ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({filteredRecords.length})
          </button>
        ))}
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-600">Loading fraud records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p className="text-lg font-medium">No {filter === 'all' ? '' : filter} fraud records found</p>
          <p className="text-sm mt-1">All transfers are processing smoothly! ✓</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Left: Details */}
                <div className="lg:col-span-2 p-4 border-b lg:border-b-0 lg:border-r border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-600">Land ID</p>
                        <p className="text-base font-mono text-gray-900">{record.landId}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'flagged'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {record.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">From</p>
                        <p className="font-mono text-gray-900 truncate">{record.fromAddress}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">To</p>
                        <p className="font-mono text-gray-900 truncate">{record.toAddress}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600">
                      Flagged: {new Date(record.flaggedAt).toLocaleDateString()} {new Date(record.flaggedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Right: Fraud Card (compact) */}
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="text-center">
                      <span className="text-3xl">
                        {record.riskLevel === 'low'
                          ? '🟢'
                          : record.riskLevel === 'medium'
                            ? '🟡'
                            : record.riskLevel === 'high'
                              ? '🔴'
                              : '🚨'}
                      </span>
                      <p className="text-2xl font-bold text-gray-900">{record.fraudScore}</p>
                      <p className="text-xs text-gray-600 capitalize">{record.riskLevel} Risk</p>
                    </div>

                    <p className="text-xs text-gray-700 italic">{record.recommendation}</p>

                    {/* Action Buttons */}
                    {record.status === 'flagged' && (
                      <div className="flex gap-2 mt-4 pt-2 border-t">
                        <button
                          onClick={() => handleApprove(record.id)}
                          disabled={processingId === record.id}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs font-semibold py-1.5 rounded transition"
                        >
                          {processingId === record.id ? '...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(record.id)}
                          disabled={processingId === record.id}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs font-semibold py-1.5 rounded transition"
                        >
                          {processingId === record.id ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper: Statistics Card Component
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    critical: 'bg-red-100 border-red-300',
    high: 'bg-orange-100 border-orange-300',
    blue: 'bg-blue-50 border-blue-200',
  };

  const textColorClasses = {
    yellow: 'text-yellow-800',
    green: 'text-green-800',
    red: 'text-red-800',
    critical: 'text-red-900',
    high: 'text-orange-900',
    blue: 'text-blue-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs text-gray-600 font-medium">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${textColorClasses[color as keyof typeof textColorClasses]}`}>{value}</p>
    </div>
  );
}

export default AdminFraudReview;
