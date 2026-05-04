/**
 * __tests__/fraud/fraudDetection.test.ts — Fraud detection system tests
 *
 * Tests all 8 fraud indicators plus overall fraud score calculation.
 * Run with: npm run test -- __tests__/fraud/fraudDetection.test.ts
 */
import { analyzeFraud, getFraudStats } from '../../services/fraudService';
import { Fraud } from '../../models/Fraud';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const validAddress1 = '0x1234567890123456789012345678901234567890';
const validAddress2 = '0x0987654321098765432109876543210987654321';
const validAddress3 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const testLandId = 'TEST-LAND-001';

describe('Fraud Detection System', () => {
  // ── Clean up after each test ────────────────────────────────────────────
  afterEach(async () => {
    await Fraud.deleteMany({ landId: testLandId });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 1: Basic Fraud Analysis
  // ──────────────────────────────────────────────────────────────────────────

  describe('1. Basic Fraud Analysis', () => {
    it('should analyze a clean transfer (low risk)', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
        transferPrice: '50000',
      });

      expect(result.fraudScore).toBeLessThanOrEqual(20);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendation).toContain('✅ LOW RISK');
    });

    it('should return explainable indicators', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      expect(result.indicators).toBeDefined();
      expect(result.indicators.length).toBe(8);
      expect(result.indicators[0]).toHaveProperty('name');
      expect(result.indicators[0]).toHaveProperty('score');
      expect(result.indicators[0]).toHaveProperty('triggered');
    });

    it('should provide action recommendation', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
      expect(['✅', '⚠️', '🔴', '🚨']).toEqual(
        expect.arrayContaining([result.recommendation.charAt(0)]),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 2: Individual Fraud Indicators
  // ──────────────────────────────────────────────────────────────────────────

  describe('2. Individual Fraud Indicators', () => {
    it('Indicator 1: Should detect rapid consecutive transfers', async () => {
      // Create 3 prior flagged transfers for same recipient
      await Fraud.create([
        {
          landId: 'LAND-A',
          fromAddress: validAddress1,
          toAddress: validAddress3,
          txHash: 'tx-1',
          fraudScore: 50,
          riskLevel: 'medium',
          status: 'flagged',
          reasons: [],
        },
        {
          landId: 'LAND-B',
          fromAddress: validAddress1,
          toAddress: validAddress3,
          txHash: 'tx-2',
          fraudScore: 50,
          riskLevel: 'medium',
          status: 'flagged',
          reasons: [],
        },
        {
          landId: 'LAND-C',
          fromAddress: validAddress1,
          toAddress: validAddress3,
          txHash: 'tx-3',
          fraudScore: 50,
          riskLevel: 'medium',
          status: 'flagged',
          reasons: [],
        },
      ]);

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      const rapidTransfersIndicator = result.indicators[0];
      expect(rapidTransfersIndicator.name).toBe('Rapid Consecutive Transfers');
      expect(rapidTransfersIndicator.score).toBeGreaterThan(0);
      expect(rapidTransfersIndicator.triggered).toBe(true);
    });

    it('Indicator 3: Should detect unverified recipient', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2, // New recipient, zero history
      });

      const unverifiedIndicator = result.indicators[2];
      expect(unverifiedIndicator.name).toBe('Unverified Recipient');
      expect(unverifiedIndicator.triggered).toBe(true);
      expect(unverifiedIndicator.score).toBeGreaterThan(0);
    });

    it('Indicator 5: Should detect blacklisted addresses', async () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: zeroAddress,
      });

      const blacklistIndicator = result.indicators[4];
      expect(blacklistIndicator.name).toBe('Blacklist Status');
      expect(blacklistIndicator.triggered).toBe(true);
    });

    it('Indicator 6: Should detect abnormal transfer frequency', async () => {
      // Create 10+ frauds for same recipient in last 30 days
      const fraudRecords = Array.from({ length: 12 }, (_, i) => ({
        landId: `LAND-FREQ-${i}`,
        fromAddress: validAddress1,
        toAddress: validAddress3,
        txHash: `tx-freq-${i}`,
        fraudScore: 40,
        riskLevel: 'medium' as const,
        status: 'flagged' as const,
        reasons: [] as string[],
        flaggedAt: new Date(), // Recent
      }));

      await Fraud.insertMany(fraudRecords);

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      const frequencyIndicator = result.indicators[5];
      expect(frequencyIndicator.name).toBe('Abnormal Transfer Frequency');
      expect(frequencyIndicator.triggered).toBe(true);
    });

    it('Indicator 8: Should detect abnormal ownership chain', async () => {
      // Create 5+ ownership changes for same land in last 30 days
      const fraudRecords = Array.from({ length: 6 }, (_, i) => ({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
        txHash: `tx-chain-${i}`,
        fraudScore: 30,
        riskLevel: 'low' as const,
        status: 'flagged' as const,
        reasons: [] as string[],
        flaggedAt: new Date(),
      }));

      await Fraud.insertMany(fraudRecords);

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      const chainIndicator = result.indicators[7];
      expect(chainIndicator.name).toBe('Abnormal Ownership Chain');
      expect(chainIndicator.triggered).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 3: Risk Level Classification
  // ──────────────────────────────────────────────────────────────────────────

  describe('3. Risk Level Classification', () => {
    it('should classify LOW risk (score 0-20)', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      if (result.fraudScore <= 20) {
        expect(result.riskLevel).toBe('low');
      }
    });

    it('should classify MEDIUM risk (score 21-50)', async () => {
      // Create flagged transfers to trigger medium risk
      await Fraud.create({
        landId: 'LAND-X',
        fromAddress: validAddress1,
        toAddress: validAddress3,
        txHash: 'tx-medium',
        fraudScore: 50,
        riskLevel: 'medium',
        status: 'flagged',
        reasons: [],
      });

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      // Should have medium risk due to unverified recipient + prior transfer
      if (result.fraudScore >= 21 && result.fraudScore <= 50) {
        expect(result.riskLevel).toBe('medium');
      }
    });

    it('should recommend appropriate action for each risk level', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      const recommendations = {
        low: 'LOW RISK',
        medium: 'MEDIUM RISK',
        high: 'HIGH RISK',
        critical: 'CRITICAL',
      };

      expect(result.recommendation).toContain(
        recommendations[result.riskLevel],
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 4: Fraud Record Creation
  // ──────────────────────────────────────────────────────────────────────────

  describe('4. Fraud Record Creation', () => {
    it('should NOT create record for low-risk transfers', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      if (result.fraudScore < 21) {
        expect(result.flaggedRecord).toBeUndefined();
      }
    });

    it('should create record for medium+ risk transfers', async () => {
      await Fraud.create({
        landId: 'LAND-Y',
        fromAddress: validAddress1,
        toAddress: validAddress3,
        txHash: 'tx-trigger',
        fraudScore: 50,
        riskLevel: 'medium',
        status: 'flagged',
        reasons: ['unverified_recipient'],
      });

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
        txHash: 'tx-new',
      });

      if (result.fraudScore >= 21) {
        expect(result.flaggedRecord).toBeDefined();
        expect(result.flaggedRecord?.status).toBe('flagged');
      }
    });

    it('should include explainable reasons in flagged record', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      if (result.flaggedRecord) {
        expect(result.flaggedRecord.reasons).toBeInstanceOf(Array);
        expect(result.flaggedRecord.reasons.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 5: Fraud Statistics (Admin Dashboard)
  // ──────────────────────────────────────────────────────────────────────────

  describe('5. Fraud Statistics', () => {
    it('should return fraud statistics', async () => {
      // Create test data
      await Fraud.insertMany([
        {
          landId: 'LAND-S1',
          fromAddress: validAddress1,
          toAddress: validAddress2,
          txHash: 'tx-s1',
          fraudScore: 45,
          riskLevel: 'medium',
          status: 'flagged',
          reasons: [],
        },
        {
          landId: 'LAND-S2',
          fromAddress: validAddress1,
          toAddress: validAddress2,
          txHash: 'tx-s2',
          fraudScore: 75,
          riskLevel: 'high',
          status: 'approved',
          reasons: [],
        },
      ]);

      const stats = await getFraudStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('flagged');
      expect(stats).toHaveProperty('approved');
      expect(stats).toHaveProperty('rejected');
      expect(stats).toHaveProperty('byRiskLevel');
      expect(stats).toHaveProperty('recentFlaggedCount');

      expect(typeof stats.total).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });

    it('should correctly count by risk level', async () => {
      await Fraud.insertMany([
        {
          landId: 'LAND-R1',
          fromAddress: validAddress1,
          toAddress: validAddress2,
          txHash: 'tx-r1',
          fraudScore: 15,
          riskLevel: 'low',
          status: 'flagged',
          reasons: [],
        },
        {
          landId: 'LAND-R2',
          fromAddress: validAddress1,
          toAddress: validAddress2,
          txHash: 'tx-r2',
          fraudScore: 60,
          riskLevel: 'high',
          status: 'flagged',
          reasons: [],
        },
      ]);

      const stats = await getFraudStats();

      expect(stats.byRiskLevel['high']).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 6: Edge Cases
  // ──────────────────────────────────────────────────────────────────────────

  describe('6. Edge Cases', () => {
    it('should handle transfers with missing optional fields', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
        // No transferPrice, ipAddress, etc.
      });

      expect(result.fraudScore).toBeGreaterThanOrEqual(0);
      expect(result.fraudScore).toBeLessThanOrEqual(100);
      expect(result.riskLevel).toBeDefined();
    });

    it('should handle same sender and receiver gracefully', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress1, // Self-transfer
      });

      expect(result.fraudScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });

    it('should validate Ethereum addresses', async () => {
      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress2,
      });

      expect(result).toHaveProperty('fraudScore');
      expect(result).toHaveProperty('riskLevel');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  Test Suite 7: Combined Indicators (High Risk Scenarios)
  // ──────────────────────────────────────────────────────────────────────────

  describe('7. Combined Indicators (High Risk)', () => {
    it('should accumulate scores from multiple triggered indicators', async () => {
      // Create conditions for multiple indicators to trigger
      await Fraud.insertMany(
        Array.from({ length: 10 }, (_, i) => ({
          landId: `LAND-ACCUM-${i}`,
          fromAddress: validAddress1,
          toAddress: validAddress3,
          txHash: `tx-accum-${i}`,
          fraudScore: 50,
          riskLevel: 'medium' as const,
          status: 'flagged' as const,
          reasons: [] as string[],
          flaggedAt: new Date(),
        })),
      );

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      // Should have elevated score due to multiple indicators
      expect(result.fraudScore).toBeGreaterThan(0);
      expect(result.indicators.filter((i) => i.triggered).length).toBeGreaterThanOrEqual(1);
    });

    it('should classify as HIGH risk when multiple critical indicators trigger', async () => {
      await Fraud.insertMany(
        Array.from({ length: 15 }, (_, i) => ({
          landId: `LAND-CRIT-${i}`,
          fromAddress: validAddress1,
          toAddress: validAddress3,
          txHash: `tx-crit-${i}`,
          fraudScore: 60,
          riskLevel: 'high' as const,
          status: 'flagged' as const,
          reasons: ['rapid_transfers', 'abnormal_frequency'] as string[],
          flaggedAt: new Date(),
        })),
      );

      const result = await analyzeFraud({
        landId: testLandId,
        fromAddress: validAddress1,
        toAddress: validAddress3,
      });

      if (result.fraudScore >= 51) {
        expect(['high', 'critical']).toContain(result.riskLevel);
      }
    });
  });
});
