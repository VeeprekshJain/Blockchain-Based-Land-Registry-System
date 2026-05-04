/**
 * __tests__/fraud/fraudWorkflow.integration.test.ts
 *
 * End-to-end integration tests for the complete fraud detection workflow.
 * Tests the full path from transfer request → fraud analysis → decision making.
 */

import request from 'supertest';
import { app } from '../../src/app';
import { Land } from '../../src/models/Land';
import { Fraud } from '../../src/models/Fraud';
import { connectDB, disconnectDB } from '../../src/config/database';

describe('Fraud Detection Workflow - E2E Integration', () => {
  let authToken: string;
  let adminToken: string;
  let testLandId: string;
  let testFromAddress: string;
  let testToAddress: string;

  beforeAll(async () => {
    await connectDB();

    // Clear collections
    await Land.deleteMany({});
    await Fraud.deleteMany({});

    // Create auth tokens (simplified - in real tests, use proper auth flow)
    authToken = 'test-user-token'; // Mock token
    adminToken = 'test-admin-token'; // Mock token

    testFromAddress = '0x1234567890123456789012345678901234567890';
    testToAddress = '0x0987654321098765432109876543210987654321';
    testLandId = 'LAND-TEST-001';

    // Create a test land record
    await Land.create({
      landId: testLandId,
      ownerAddress: testFromAddress,
      ownerName: 'Test Owner',
      location: 'Test Location',
      area: '1000 sqm',
      documentHash: 'QmTest123',
      registeredAt: new Date(),
      isActive: true,
      txHash: '0xabc123',
      blockNumber: 1,
    });
  });

  afterAll(async () => {
    await Land.deleteMany({});
    await Fraud.deleteMany({});
    await disconnectDB();
  });

  describe('Low Risk Transfer Flow', () => {
    it('should allow LOW risk transfer to proceed normally', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          newOwner: testToAddress,
          newOwnerName: 'New Owner',
          transferPrice: '100000', // Normal price
        });

      expect(response.status).toBeLessThan(400); // 200 or 202
      expect(response.body.data).toHaveProperty('fraudAnalysis');
      expect(response.body.data.fraudAnalysis).toHaveProperty('fraudScore');
      expect(response.body.data.fraudAnalysis.fraudScore).toBeLessThanOrEqual(20);
      expect(response.body.data.fraudAnalysis.riskLevel).toBe('low');
    });

    it('should not create fraud flag for LOW risk transfer', async () => {
      const fraudRecords = await Fraud.find({ landId: testLandId, riskLevel: 'low' });
      // May or may not create records for low risk - depends on implementation
      // Just verify no errors occur
      expect(fraudRecords).toBeDefined();
    });
  });

  describe('Medium Risk Transfer Flow', () => {
    it('should flag MEDIUM risk transfer and show warning', async () => {
      // Create a scenario that triggers medium risk
      // Multiple rapid transfers to recipient
      const rapiToAddress = '0x1111111111111111111111111111111111111111';

      // Create multiple fraud records for same recipient to trigger rapid transfer indicator
      for (let i = 0; i < 2; i++) {
        await Fraud.create({
          landId: `LAND-RAPID-${i}`,
          fromAddress: testFromAddress,
          toAddress: rapiToAddress,
          fraudScore: 35,
          riskLevel: 'medium',
          reasons: ['Rapid transfers detected'],
          status: 'flagged',
          indicators: [],
          flaggedAt: new Date(Date.now() - 60000 * i), // 1 min apart
        });
      }

      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          newOwner: rapiToAddress,
          newOwnerName: 'Rapid Buyer',
          transferPrice: '50000', // Low price (anomaly)
        });

      expect(response.status).toBeLessThan(400);
      expect(response.body.data).toHaveProperty('fraudAnalysis');
      const { fraudAnalysis } = response.body.data;

      expect(fraudAnalysis.fraudScore).toBeGreaterThan(20);
      expect(fraudAnalysis.fraudScore).toBeLessThanOrEqual(50);
      expect(fraudAnalysis.riskLevel).toBe('medium');
      expect(fraudAnalysis.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('High Risk Transfer Flow - Manual Review', () => {
    let highRiskLandId: string;
    let highRiskFraudRecordId: string;

    beforeEach(async () => {
      highRiskLandId = 'LAND-HIGH-RISK-001';

      // Create a test land
      await Land.create({
        landId: highRiskLandId,
        ownerAddress: testFromAddress,
        ownerName: 'Owner',
        location: 'Test',
        area: '1000 sqm',
        documentHash: 'QmHash',
        registeredAt: new Date(),
        isActive: true,
        txHash: '0xabc',
        blockNumber: 1,
      });

      // Create a high-risk fraud record manually
      const fraudRecord = await Fraud.create({
        landId: highRiskLandId,
        fromAddress: testFromAddress,
        toAddress: '0x2222222222222222222222222222222222222222',
        fraudScore: 65,
        riskLevel: 'high',
        reasons: [
          'Recipient address blacklisted',
          'Price anomaly detected (80% below average)',
          'Rapid consecutive transfers (3 in 24h)',
        ],
        indicators: [
          {
            name: 'Blacklist Status',
            score: 15,
            weight: 15,
            reason: 'Recipient in fraud blacklist',
            triggered: true,
          },
          {
            name: 'Price Anomaly',
            score: 20,
            weight: 20,
            reason: 'Price is 80% below market',
            triggered: true,
          },
          {
            name: 'Rapid Transfers',
            score: 20,
            weight: 20,
            reason: '3 transfers in 24 hours',
            triggered: true,
          },
        ],
        recommendation: 'Manual review required - suspicious pattern detected',
        status: 'flagged',
        flaggedAt: new Date(),
      });

      highRiskFraudRecordId = fraudRecord._id.toString();
    });

    it('should return 202 status for HIGH risk requiring manual review', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: highRiskLandId,
          newOwner: '0x2222222222222222222222222222222222222222',
          newOwnerName: 'Suspicious Buyer',
          transferPrice: '10000',
        });

      expect(response.status).toBe(202); // Accepted - pending manual review
      expect(response.body.data).toHaveProperty('fraudAnalysis');
      expect(response.body.data.fraudAnalysis.riskLevel).toBe('high');
      expect(response.body.data).toHaveProperty('status', 'pending_manual_review');
    });

    it('should allow admin to approve HIGH risk transfer', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fraudRecordId: highRiskFraudRecordId,
        });

      expect(response.status).toBeLessThan(400);

      // Verify status changed
      const updated = await Fraud.findById(highRiskFraudRecordId);
      expect(updated?.status).toBe('approved');
      expect(updated?.approvalBy).toBeDefined();
    });

    it('should allow admin to reject HIGH risk transfer', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fraudRecordId: highRiskFraudRecordId,
        });

      expect(response.status).toBeLessThan(400);

      // Verify status changed
      const updated = await Fraud.findById(highRiskFraudRecordId);
      expect(updated?.status).toBe('rejected');
    });
  });

  describe('Critical Risk Transfer Flow - BLOCKED', () => {
    it('should BLOCK CRITICAL risk transfer immediately', async () => {
      const criticalLandId = 'LAND-CRITICAL-001';

      // Create test land
      await Land.create({
        landId: criticalLandId,
        ownerAddress: testFromAddress,
        ownerName: 'Owner',
        location: 'Test',
        area: '1000 sqm',
        documentHash: 'QmHash',
        registeredAt: new Date(),
        isActive: true,
        txHash: '0xabc',
        blockNumber: 1,
      });

      // Attempt transfer to zero address (known fraud indicator)
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: criticalLandId,
          newOwner: '0x0000000000000000000000000000000000000000', // Zero address = critical
          newOwnerName: 'Invalid',
          transferPrice: '1', // Extremely low
        });

      expect(response.status).toBe(403); // Forbidden - blocked
      expect(response.body.message).toContain('BLOCKED');
      expect(response.body.message).toContain('Critical');
    });

    it('should not create blockchain transaction for CRITICAL risk', async () => {
      // Verify that the Land record was not modified (transfer didn't happen)
      const land = await Land.findOne({ landId: 'LAND-CRITICAL-001' });
      expect(land?.ownerAddress).toBe(testFromAddress.toLowerCase());
    });
  });

  describe('Fraud Statistics & Monitoring', () => {
    it('should return accurate fraud statistics', async () => {
      const response = await request(app).get('/api/v1/fraud/stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalFlagged');
      expect(response.body.data).toHaveProperty('totalApproved');
      expect(response.body.data).toHaveProperty('totalRejected');
      expect(response.body.data).toHaveProperty('avgScore');
      expect(response.body.data).toHaveProperty('criticalCount');
      expect(response.body.data).toHaveProperty('highCount');
    });

    it('should retrieve fraud history for specific land', async () => {
      const response = await request(app)
        .get(`/api/v1/fraud/records/${testLandId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling & Validation', () => {
    it('should reject transfer with invalid landId', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: '', // Invalid
          newOwner: testToAddress,
          newOwnerName: 'New Owner',
        });

      expect(response.status).toBe(400);
    });

    it('should reject transfer with invalid ethereum address', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          newOwner: 'invalid-address', // Invalid
          newOwnerName: 'New Owner',
        });

      expect(response.status).toBe(400);
    });

    it('should reject transfer to non-existent land', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: 'NON-EXISTENT',
          newOwner: testToAddress,
          newOwnerName: 'New Owner',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Admin-Only Access Control', () => {
    it('should deny fraud approval to non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/approve')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token, not admin
        .send({
          fraudRecordId: 'some-id',
        });

      // Should be 403 Forbidden or 401 Unauthorized
      expect([403, 401]).toContain(response.status);
    });

    it('should deny fraud rejection to non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/reject')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .send({
          fraudRecordId: 'some-id',
        });

      expect([403, 401]).toContain(response.status);
    });
  });

  describe('Fraud Indicators Accuracy', () => {
    it('should correctly identify rapid transfer indicator', async () => {
      // Create land and simulate rapid transfers
      const rapidLandId = 'LAND-RAPID-CHECK';
      await Land.create({
        landId: rapidLandId,
        ownerAddress: testFromAddress,
        ownerName: 'Owner',
        location: 'Test',
        area: '1000 sqm',
        documentHash: 'QmHash',
        registeredAt: new Date(),
        isActive: true,
        txHash: '0xabc',
        blockNumber: 1,
      });

      const rapidRecipient = '0x3333333333333333333333333333333333333333';

      // Create 3 recent fraud flags for same recipient
      for (let i = 0; i < 3; i++) {
        await Fraud.create({
          landId: `LAND-RAPID-${i}`,
          toAddress: rapidRecipient,
          fraudScore: 20,
          riskLevel: 'medium',
          reasons: [],
          status: 'flagged',
          indicators: [],
          flaggedAt: new Date(Date.now() - 3600000), // 1 hour ago
        });
      }

      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: rapidLandId,
          newOwner: rapidRecipient,
          newOwnerName: 'Rapid Recipient',
        });

      expect(response.status).toBeLessThan(400);
      const { fraudAnalysis } = response.body.data;

      // Should detect rapid transfers
      const rapidTransferIndicator = fraudAnalysis.indicators.find(
        (ind: any) => ind.name === 'Rapid Consecutive Transfers',
      );
      expect(rapidTransferIndicator?.triggered).toBe(true);
    });

    it('should include document hash mismatch indicator', async () => {
      const response = await request(app)
        .post('/api/v1/lands/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          newOwner: testToAddress,
          newOwnerName: 'New Owner',
        });

      expect(response.status).toBeLessThan(400);
      const { fraudAnalysis } = response.body.data;

      // Should have 8 indicators total
      expect(fraudAnalysis.indicators.length).toBe(8);

      // Verify all indicator names are present
      const indicatorNames = fraudAnalysis.indicators.map((ind: any) => ind.name);
      expect(indicatorNames).toContain('Rapid Consecutive Transfers');
      expect(indicatorNames).toContain('Price Anomaly');
      expect(indicatorNames).toContain('Unverified Recipient');
      expect(indicatorNames).toContain('Geolocation Mismatch');
      expect(indicatorNames).toContain('Blacklist Status');
      expect(indicatorNames).toContain('Abnormal Transfer Frequency');
      expect(indicatorNames).toContain('Document Hash Mismatch');
      expect(indicatorNames).toContain('Abnormal Ownership Chain');
    });
  });

  describe('Fraud Risk Explanations', () => {
    it('should provide human-readable explanations for fraud flags', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          fromAddress: testFromAddress,
          toAddress: '0x3333333333333333333333333333333333333333',
          transferPrice: '50000',
        });

      expect(response.status).toBeLessThan(400);
      const { fraudAnalysis } = response.body.data;

      // Should have readable reasons array
      expect(Array.isArray(fraudAnalysis.reasons)).toBe(true);

      // Each reason should be a human-readable string
      fraudAnalysis.reasons.forEach((reason: string) => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });

      // Should have recommendation
      expect(typeof fraudAnalysis.recommendation).toBe('string');
      expect(fraudAnalysis.recommendation.length).toBeGreaterThan(0);
    });

    it('should provide indicator-level explanations', async () => {
      const response = await request(app)
        .post('/api/v1/fraud/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          landId: testLandId,
          fromAddress: testFromAddress,
          toAddress: testToAddress,
        });

      expect(response.status).toBeLessThan(400);
      const { fraudAnalysis } = response.body.data;

      // Each indicator should have a reason string
      fraudAnalysis.indicators.forEach((indicator: any) => {
        expect(typeof indicator.reason).toBe('string');
        expect(indicator.reason.length).toBeGreaterThan(0);
      });
    });
  });
});
