'use client';

/**
 * components/FraudRiskMeter.tsx — Visual fraud risk meter with animated gauge.
 *
 * Displays fraud score 0-100 with color-coded risk levels:
 * 🟢 Low (0-20)
 * 🟡 Medium (21-50)
 * 🔴 High (51-80)
 * 🚨 Critical (81-100)
 */

interface FraudRiskMeterProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function FraudRiskMeter({
  score,
  riskLevel,
  size = 'md',
  interactive = false,
}: FraudRiskMeterProps) {
  // Get colors based on risk level
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'from-green-400 to-green-600';
      case 'medium':
        return 'from-yellow-400 to-yellow-600';
      case 'high':
        return 'from-orange-400 to-orange-600';
      case 'critical':
        return 'from-red-500 to-red-700';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-50 border-green-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskEmoji = (level: string) => {
    switch (level) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      case 'critical':
        return '🚨';
      default:
        return '⚪';
    }
  };

  const sizeClasses = {
    sm: 'h-32 w-32',
    md: 'h-48 w-48',
    lg: 'h-64 w-64',
  };

  const textSizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Calculate rotation (0-100 maps to 0-270 degrees for a 3/4 gauge)
  const rotation = (score / 100) * 270 - 135;
  const percentage = (score / 100) * 100;

  return (
    <div className={`flex flex-col items-center gap-4 ${interactive ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}>
      {/* Gauge Container */}
      <div className={`${sizeClasses[size]} relative`}>
        {/* Background arc */}
        <div className={`absolute inset-0 rounded-full border-8 border-gray-200`} />

        {/* Animated arc based on score */}
        <div
          className={`absolute inset-0 rounded-full border-8 border-transparent bg-gradient-to-r ${getRiskColor(
            riskLevel,
          )} bg-clip-border transition-all duration-500 ease-out`}
          style={{
            borderTop: `8px solid currentColor`,
            background: `conic-gradient(from 135deg, transparent 0deg, var(--color-start) 0deg, var(--color-end) ${percentage * 2.7}deg, transparent ${percentage * 2.7}deg)`,
            backgroundSize: '100% 100%',
          }}
        />

        {/* Inner circle with score */}
        <div className={`absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center shadow-md`}>
          <span className="text-3xl mb-1">{getRiskEmoji(riskLevel)}</span>
          <div className={`${textSizeClasses[size]} font-bold text-gray-900`}>{score}</div>
          <div className={`${labelSizeClasses[size]} text-gray-600 font-medium`}>/ 100</div>
        </div>

        {/* Needle */}
        <div
          className="absolute top-1/2 left-1/2 w-1.5 h-1/3 bg-gray-900 origin-top -translate-x-1/2 -translate-y-0 transition-transform duration-500 ease-out"
          style={{ transform: `translate(-50%, 0) rotate(${rotation}deg)` }}
        />

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-full shadow-md" />
      </div>

      {/* Risk Level Label */}
      <div className={`text-center ${getRiskBgColor(riskLevel)} px-4 py-2 rounded-lg border`}>
        <div className="font-bold text-gray-900 capitalize">{riskLevel} Risk</div>
        <div className="text-xs text-gray-600 mt-0.5">
          {riskLevel === 'low' && 'Safe to proceed'}
          {riskLevel === 'medium' && 'Review recommended'}
          {riskLevel === 'high' && 'Manual review required'}
          {riskLevel === 'critical' && 'Transfer blocked'}
        </div>
      </div>
    </div>
  );
}

export default FraudRiskMeter;
