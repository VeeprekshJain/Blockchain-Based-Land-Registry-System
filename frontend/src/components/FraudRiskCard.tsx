'use client';

/**
 * components/FraudRiskCard.tsx — Fraud risk analysis card with detailed breakdown.
 *
 * Shows fraud score, risk level, triggered indicators, and recommendations.
 * Color-coded for risk level and includes indicator breakdown.
 */

import { FraudRiskMeter } from './FraudRiskMeter';

interface FraudIndicator {
  name: string;
  score: number;
  weight: number;
  reason: string;
  triggered: boolean;
}

interface FraudAnalysisCardProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  indicators: FraudIndicator[];
  recommendation: string;
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

export function FraudRiskCard({
  score,
  riskLevel,
  reasons,
  indicators,
  recommendation,
  onApprove,
  onReject,
  isLoading = false,
  showActions = false,
}: FraudAnalysisCardProps) {
  // Get styling based on risk level
  const getCardStyle = (level: string) => {
    switch (level) {
      case 'low':
        return 'border-green-200 bg-green-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getHeaderBg = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 border-green-300';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300';
      case 'high':
        return 'bg-orange-100 border-orange-300';
      case 'critical':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getIndicatorColor = (triggered: boolean, score: number) => {
    if (!triggered) return 'bg-gray-100 text-gray-600 border-gray-300';
    if (score >= 15) return 'bg-red-100 text-red-800 border-red-300';
    if (score >= 10) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const triggeredIndicators = indicators.filter((ind) => ind.triggered);

  return (
    <div className={`rounded-lg border-2 ${getCardStyle(riskLevel)} overflow-hidden shadow-md`}>
      {/* Header */}
      <div className={`${getHeaderBg(riskLevel)} border-b-2 p-4 flex items-start justify-between`}>
        <div>
          <h3 className="font-bold text-lg text-gray-900">Fraud Risk Analysis</h3>
          <p className="text-sm text-gray-700 mt-1">Pre-transfer security assessment</p>
        </div>
        <div className="text-3xl">{riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : riskLevel === 'high' ? '🔴' : '🚨'}</div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Risk Score Section */}
        <div className="flex flex-col items-center gap-4">
          <FraudRiskMeter score={score} riskLevel={riskLevel} size="md" />
        </div>

        {/* Recommendation */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400">
          <p className="text-sm font-semibold text-gray-900">Recommendation:</p>
          <p className="text-sm text-gray-700 mt-2">{recommendation}</p>
        </div>

        {/* Top Risk Reasons */}
        {reasons.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Top Risk Factors:</h4>
            <ul className="space-y-2">
              {reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-lg">⚠️</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {reasons.length > 3 && <p className="text-xs text-gray-600 mt-2">+ {reasons.length - 3} more factors</p>}
          </div>
        )}

        {/* Indicators Breakdown */}
        {triggeredIndicators.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Triggered Indicators ({triggeredIndicators.length}/{indicators.length}):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {triggeredIndicators.map((ind, idx) => (
                <div key={idx} className={`rounded p-3 border ${getIndicatorColor(ind.triggered, ind.score)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ind.name}</p>
                      <p className="text-xs mt-1 opacity-80">{ind.reason}</p>
                    </div>
                    <span className="text-lg font-bold">{ind.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Indicators at a Glance */}
        <details className="group cursor-pointer">
          <summary className="text-sm font-semibold text-gray-900 select-none group-open:mb-3">
            View All {indicators.length} Indicators
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {indicators.map((ind, idx) => (
              <div key={idx} className={`rounded p-2 border ${ind.triggered ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={ind.triggered ? 'font-medium text-gray-900' : 'text-gray-600'}>{ind.name}</span>
                  <span className={`font-bold ${ind.triggered ? 'text-gray-900' : 'text-gray-400'}`}>{ind.score}</span>
                </div>
              </div>
            ))}
          </div>
        </details>

        {/* Action Buttons (for admin review screen) */}
        {showActions && (riskLevel === 'high' || riskLevel === 'critical') && (
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
            >
              {isLoading ? 'Processing...' : '✓ Approve Transfer'}
            </button>
            <button
              onClick={onReject}
              disabled={isLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
            >
              {isLoading ? 'Processing...' : '✗ Reject Transfer'}
            </button>
          </div>
        )}

        {/* Status Messages */}
        {riskLevel === 'low' && (
          <div className="bg-green-100 border border-green-300 rounded p-3 text-sm text-green-800">
            ✓ Low fraud risk - Transfer can proceed normally
          </div>
        )}
        {riskLevel === 'medium' && (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
            ⚠ Medium fraud risk - Please review the details before proceeding
          </div>
        )}
        {riskLevel === 'high' && (
          <div className="bg-orange-100 border border-orange-300 rounded p-3 text-sm text-orange-800">
            ⚠ High fraud risk - This transfer requires manual review by a land officer
          </div>
        )}
        {riskLevel === 'critical' && (
          <div className="bg-red-100 border border-red-300 rounded p-3 text-sm text-red-800 font-semibold">
            🚨 CRITICAL FRAUD RISK - Transfer BLOCKED. Contact support immediately.
          </div>
        )}
      </div>
    </div>
  );
}

export default FraudRiskCard;
