/**
 * services/fraudService.ts — Fraud detection engine with 8-indicator analysis.
 *
 * Analyzes ownership transfers for suspicious patterns and returns an explainable
 * fraud score (0-100) with risk classification and recommended actions.
 */
import { Fraud, type IFraudDocument } from '../models/Fraud';
import { Land } from '../models/Land';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FraudAnalysisRequest {
  landId: string;
  fromAddress: string;
  toAddress: string;
  txHash?: string;
  transferPrice?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface FraudIndicatorScore {
  name: string;
  score: number;
  weight: number;
  reason: string;
  triggered: boolean;
}

export interface FraudAnalysisResult {
  fraudScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  indicators: FraudIndicatorScore[];
  recommendation: string;
  flaggedRecord?: IFraudDocument;
}

// ─── Configuration ────────────────────────────────────────────────────────────

// Thresholds for risk levels
const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 20 },
  MEDIUM: { min: 21, max: 50 },
  HIGH: { min: 51, max: 80 },
  CRITICAL: { min: 81, max: 100 },
};

// Blacklisted addresses (known fraud cases)
const BLACKLISTED_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000', // Zero address
]);

// High-risk countries by IP pattern (simplified; in production use MaxMind GeoIP)
const HIGH_RISK_COUNTRY_PATTERNS = [
  /^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/i, // Reserved IPs
];

// ─── Indicator functions ──────────────────────────────────────────────────────

/**
 * Indicator 1: RAPID CONSECUTIVE TRANSFERS
 * Score up to 20 points if recipient has 3+ transfers in last 24 hours
 */
async function checkRapidTransfers(toAddress: string): Promise<FraudIndicatorScore> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentTransfers = await Fraud.countDocuments({
    toAddress: toAddress.toLowerCase(),
    flaggedAt: { $gte: oneDayAgo },
    status: 'flagged',
  });

  const triggered = recentTransfers >= 3;
  const score = triggered ? Math.min(20, recentTransfers * 5) : 0;

  return {
    name: 'Rapid Consecutive Transfers',
    score,
    weight: 20,
    reason: `${recentTransfers} flagged transfers in last 24 hours`,
    triggered,
  };
}

/**
 * Indicator 2: PRICE ANOMALY
 * Score up to 20 points if transfer price differs significantly from comparable sales
 * Simplified: check if price difference > 65% below or 80% above (would need ML in production)
 */
async function checkPriceAnomaly(
  _landId: string,
  transferPrice?: string,
): Promise<FraudIndicatorScore> {
  // In production, would compute expected price from historical sales
  // For now, simplified check: if price is extremely low or high
  if (!transferPrice) {
    return {
      name: 'Price Anomaly',
      score: 0,
      weight: 20,
      reason: 'No price data available',
      triggered: false,
    };
  }

  const priceNum = parseFloat(transferPrice);
  if (isNaN(priceNum) || priceNum <= 0) {
    return {
      name: 'Price Anomaly',
      score: 15,
      weight: 20,
      reason: 'Invalid or zero transfer price',
      triggered: true,
    };
  }

  // Placeholder: would need historical comparable sales
  const triggered = false;
  const score = triggered ? 15 : 0;

  return {
    name: 'Price Anomaly',
    score,
    weight: 20,
    reason: 'Price within normal range or insufficient data',
    triggered,
  };
}

/**
 * Indicator 3: UNVERIFIED RECIPIENT
 * Score up to 15 points if recipient has zero prior transaction history
 */
async function checkUnverifiedRecipient(toAddress: string): Promise<FraudIndicatorScore> {
  const priorTransfers = await Fraud.countDocuments({
    toAddress: toAddress.toLowerCase(),
  });

  const firstTimeTransfer = priorTransfers === 0;
  const score = firstTimeTransfer ? 8 : 0; // 8/15 for unverified recipient

  return {
    name: 'Unverified Recipient',
    score,
    weight: 15,
    reason: firstTimeTransfer
      ? 'Recipient has no prior transaction history'
      : `Recipient has ${priorTransfers} prior transfers`,
    triggered: firstTimeTransfer,
  };
}

/**
 * Indicator 4: GEOLOCATION MISMATCH
 * Score up to 15 points if request from high-risk country
 */
async function checkGeolocationMismatch(ipAddress?: string): Promise<FraudIndicatorScore> {
  if (!ipAddress) {
    return {
      name: 'Geolocation Mismatch',
      score: 0,
      weight: 15,
      reason: 'No IP address provided',
      triggered: false,
    };
  }

  const isHighRisk = HIGH_RISK_COUNTRY_PATTERNS.some((pattern) => pattern.test(ipAddress));
  const score = isHighRisk ? 10 : 0;

  return {
    name: 'Geolocation Mismatch',
    score,
    weight: 15,
    reason: isHighRisk ? `High-risk IP: ${ipAddress}` : `Normal IP: ${ipAddress}`,
    triggered: isHighRisk,
  };
}

/**
 * Indicator 5: BLACKLIST STATUS
 * Score up to 15 points if recipient is in blacklist
 */
async function checkBlacklistStatus(toAddress: string): Promise<FraudIndicatorScore> {
  const normalizedAddr = toAddress.toLowerCase();
  const isBlacklisted = BLACKLISTED_ADDRESSES.has(normalizedAddr);

  // Also check if recipient has multiple rejected fraud flags
  const rejectedFlags = await Fraud.countDocuments({
    toAddress: normalizedAddr,
    status: 'rejected',
  });

  const triggered = isBlacklisted || rejectedFlags >= 5;
  const score = triggered ? 12 : 0;

  return {
    name: 'Blacklist Status',
    score,
    weight: 15,
    reason: triggered
      ? `Flagged: ${rejectedFlags} prior rejections or blacklisted`
      : 'Recipient not blacklisted',
    triggered,
  };
}

/**
 * Indicator 6: ABNORMAL TRANSFER FREQUENCY
 * Score up to 10 points if transfer velocity is 3x the historical baseline
 */
async function checkAbnormalFrequency(toAddress: string): Promise<FraudIndicatorScore> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentCount = await Fraud.countDocuments({
    toAddress: toAddress.toLowerCase(),
    flaggedAt: { $gte: thirtyDaysAgo },
  });

  // If recipient has 10+ transfers in last 30 days, flag as abnormal
  const isAbnormal = recentCount >= 10;
  const score = isAbnormal ? Math.min(10, recentCount) : 0;

  return {
    name: 'Abnormal Transfer Frequency',
    score,
    weight: 10,
    reason: `${recentCount} transfers in last 30 days`,
    triggered: isAbnormal,
  };
}

/**
 * Indicator 7: DOCUMENT HASH MISMATCH
 * Score up to 3 points if blockchain hash ≠ MongoDB hash
 */
async function checkDocumentHashMismatch(
  landId: string,
  blockchainHash?: string,
): Promise<FraudIndicatorScore> {
  try {
    const land = await Land.findOne({ landId }).lean();
    if (!land || !blockchainHash) {
      return {
        name: 'Document Hash Mismatch',
        score: 0,
        weight: 3,
        reason: 'Insufficient data for verification',
        triggered: false,
      };
    }

    const mismatch = land.documentHash !== blockchainHash;
    const score = mismatch ? 3 : 0;

    return {
      name: 'Document Hash Mismatch',
      score,
      weight: 3,
      reason: mismatch ? 'Document hashes do not match' : 'Document hashes match',
      triggered: mismatch,
    };
  } catch (error) {
    logger.warn('[fraudService] Error checking document hash:', error);
    return {
      name: 'Document Hash Mismatch',
      score: 0,
      weight: 3,
      reason: 'Unable to verify document hash',
      triggered: false,
    };
  }
}

/**
 * Indicator 8: ABNORMAL OWNERSHIP CHAIN
 * Score up to 2 points if land has 5+ rapid consecutive owners in last 30 days
 */
async function checkAbnormalOwnershipChain(landId: string): Promise<FraudIndicatorScore> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentOwnershipChanges = await Fraud.countDocuments({
    landId,
    flaggedAt: { $gte: thirtyDaysAgo },
  });

  const isAbnormal = recentOwnershipChanges >= 5;
  const score = isAbnormal ? 2 : 0;

  return {
    name: 'Abnormal Ownership Chain',
    score,
    weight: 2,
    reason: `${recentOwnershipChanges} ownership changes in last 30 days`,
    triggered: isAbnormal,
  };
}

// ─── Main fraud analysis function ──────────────────────────────────────────────

/**
 * Analyze a transfer for fraud risk.
 * Returns comprehensive fraud score with explainable indicators.
 */
export async function analyzeFraud(
  request: FraudAnalysisRequest,
): Promise<FraudAnalysisResult> {
  const { landId, fromAddress, toAddress, txHash = '', transferPrice, ipAddress } = request;

  try {
    // ── Run all 8 indicators in parallel ────────────────────────────────────
    const [
      rapidTransfers,
      priceAnomaly,
      unverifiedRecipient,
      geolocationMismatch,
      blacklistStatus,
      abnormalFrequency,
      documentHashMismatch,
      abnormalOwnershipChain,
    ] = await Promise.all([
      checkRapidTransfers(toAddress),
      checkPriceAnomaly(landId, transferPrice),
      checkUnverifiedRecipient(toAddress),
      checkGeolocationMismatch(ipAddress),
      checkBlacklistStatus(toAddress),
      checkAbnormalFrequency(toAddress),
      checkDocumentHashMismatch(landId),
      checkAbnormalOwnershipChain(landId),
    ]);

    const indicators = [
      rapidTransfers,
      priceAnomaly,
      unverifiedRecipient,
      geolocationMismatch,
      blacklistStatus,
      abnormalFrequency,
      documentHashMismatch,
      abnormalOwnershipChain,
    ];

    // ── Calculate weighted fraud score ─────────────────────────────────────
    const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    const weightedSum = indicators.reduce((sum, ind) => sum + (ind.score * ind.weight) / 100, 0);
    const fraudScore = Math.round((weightedSum / totalWeight) * 100);

    // ── Determine risk level ───────────────────────────────────────────────
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (fraudScore >= RISK_THRESHOLDS.CRITICAL.min) riskLevel = 'critical';
    else if (fraudScore >= RISK_THRESHOLDS.HIGH.min) riskLevel = 'high';
    else if (fraudScore >= RISK_THRESHOLDS.MEDIUM.min) riskLevel = 'medium';

    // ── Collect reasons ────────────────────────────────────────────────────
    const reasons = indicators
      .filter((ind) => ind.triggered)
      .map((ind) => ind.name.toLowerCase().replace(/\s+/g, '_'));

    // ── Generate recommendation ────────────────────────────────────────────
    const recommendation = (() => {
      if (fraudScore >= 81)
        return '🚨 CRITICAL: Immediately escalate to admin. Block transfer pending review.';
      if (fraudScore >= 51)
        return '🔴 HIGH RISK: Flag for officer review. Require additional documentation.';
      if (fraudScore >= 21)
        return '⚠️ MEDIUM RISK: Monitor closely. May allow with additional verification.';
      return '✅ LOW RISK: Proceed with transfer. Standard approval workflow.';
    })();

    // ── Create or update fraud record if flagged ────────────────────────────
    let flaggedRecord: IFraudDocument | undefined;
    if (fraudScore >= 21) {
      flaggedRecord = await Fraud.findOneAndUpdate(
        { txHash: txHash || `temp-${Date.now()}` },
        {
          landId,
          fromAddress: fromAddress.toLowerCase(),
          toAddress: toAddress.toLowerCase(),
          txHash: txHash || `temp-${Date.now()}`,
          fraudScore,
          riskLevel,
          reasons,
          rapidTransfersScore: rapidTransfers.score,
          priceAnomalyScore: priceAnomaly.score,
          unverifiedRecipientScore: unverifiedRecipient.score,
          geolocationMismatchScore: geolocationMismatch.score,
          blacklistStatusScore: blacklistStatus.score,
          abnormalFrequencyScore: abnormalFrequency.score,
          documentHashMismatchScore: documentHashMismatch.score,
          abnormalOwnershipChainScore: abnormalOwnershipChain.score,
          status: 'flagged',
          ipAddress,
          transferPrice,
          transactionHistory: {
            previousTransfers: await Fraud.countDocuments({ toAddress: toAddress.toLowerCase() }),
            recentTransfers: await Fraud.countDocuments({
              toAddress: toAddress.toLowerCase(),
              flaggedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
          },
        },
        { upsert: true, new: true },
      );

      logger.warn(
        `[fraudService] Fraud flagged: ${fraudScore} score for land ${landId}`,
      );
    }

    return {
      fraudScore,
      riskLevel,
      reasons,
      indicators,
      recommendation,
      flaggedRecord,
    };
  } catch (error) {
    logger.error('[fraudService] Error analyzing fraud:', error);
    throw new AppError(500, 'Failed to analyze transfer for fraud risk');
  }
}

/**
 * Get fraud records for a land parcel with optional status filter.
 */
export async function getFraudRecords(
  landId: string,
  status?: string,
  limit: number = 10,
): Promise<IFraudDocument[]> {
  const query: Record<string, any> = { landId };
  if (status) query.status = status;

  return Fraud.find(query).sort({ flaggedAt: -1 }).limit(limit).lean() as any;
}

/**
 * Approve a fraud flag (admin action).
 */
export async function approveFraudFlag(
  fraudId: string,
  approvedBy: string,
): Promise<IFraudDocument> {
  const updated = await Fraud.findByIdAndUpdate(
    fraudId,
    {
      status: 'approved',
      approvedBy: approvedBy.toLowerCase(),
      approvedAt: new Date(),
    },
    { new: true },
  );

  if (!updated) throw new AppError(404, 'Fraud record not found');
  logger.info(`[fraudService] Fraud flag approved by ${approvedBy}`);
  return updated;
}

/**
 * Reject a fraud flag with reason (admin action).
 */
export async function rejectFraudFlag(
  fraudId: string,
  rejectionReason: string,
): Promise<IFraudDocument> {
  const updated = await Fraud.findByIdAndUpdate(
    fraudId,
    {
      status: 'rejected',
      rejectionReason,
    },
    { new: true },
  );

  if (!updated) throw new AppError(404, 'Fraud record not found');
  logger.info(`[fraudService] Fraud flag rejected: ${rejectionReason}`);
  return updated;
}

/**
 * Get fraud statistics (admin dashboard).
 */
export async function getFraudStats(): Promise<{
  total: number;
  flagged: number;
  approved: number;
  rejected: number;
  byRiskLevel: Record<string, number>;
  recentFlaggedCount: number;
}> {
  const [total, flagged, approved, rejected] = await Promise.all([
    Fraud.countDocuments({}),
    Fraud.countDocuments({ status: 'flagged' }),
    Fraud.countDocuments({ status: 'approved' }),
    Fraud.countDocuments({ status: 'rejected' }),
  ]);

  const byRiskLevel = await Fraud.aggregate([
    { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentFlaggedCount = await Fraud.countDocuments({
    status: 'flagged',
    flaggedAt: { $gte: thirtyDaysAgo },
  });

  return {
    total,
    flagged,
    approved,
    rejected,
    byRiskLevel: byRiskLevel.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      },
      {},
    ),
    recentFlaggedCount,
  };
}
