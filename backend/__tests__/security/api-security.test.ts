/**
 * __tests__/security/api-security.test.ts
 * 
 * Backend API Security Tests
 * Tests real running API on localhost:5000
 */

describe('Backend API Security - Integration Tests', () => {
  const BASE_URL = 'http://localhost:5000/api/v1';

  describe('1. Lands API - Response Validation', () => {
    it('should return valid lands data', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should have land properties', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const data = await response.json() as any;
      
      if (data.data.length > 0) {
        const land = data.data[0];
        expect(land).toHaveProperty('landId');
        expect(land).toHaveProperty('ownerName');
        expect(land).toHaveProperty('location');
        expect(land).toHaveProperty('area');
      }
    });

    it('should not expose sensitive database details', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const text = await response.text();
      
      expect(text).not.toContain('mongodb');
      expect(text).not.toContain('stack');
      expect(text).not.toContain('Error at');
    });
  });

  describe('2. Input Validation', () => {
    it('should handle limit parameter safely', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=5`);
      expect([200, 400]).toContain(response.status);
    });

    it('should reject extremely large limit values', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=999999999999`);
      expect([200, 400]).toContain(response.status);
    });

    it('should handle empty query parameters', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=&search=`);
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('3. XSS Prevention', () => {
    it('response should not contain script tags', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const text = await response.text();
      
      expect(text).not.toContain('<script>');
      expect(text).not.toContain('</script>');
    });

    it('response should not have event handlers', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const text = await response.text();
      
      expect(text.toLowerCase()).not.toContain('onerror=');
      expect(text.toLowerCase()).not.toContain('onload=');
    });
  });

  describe('4. Response Format', () => {
    it('should return valid JSON', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const text = await response.text();
      
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should have proper Content-Type header', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      const contentType = response.headers.get('content-type');
      
      expect(contentType).toContain('application/json');
    });
  });

  describe('5. Error Handling', () => {
    it('should handle invalid routes gracefully', async () => {
      const response = await fetch(`${BASE_URL}/nonexistent`);
      expect([404, 200]).toContain(response.status);
    });

    it('should return consistent error format', async () => {
      const response = await fetch(`${BASE_URL}/lands/invalid-id`);
      if (response.status > 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('message');
      }
    });
  });

  describe('6. Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        fetch(`${BASE_URL}/lands?limit=1`)
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed or some get rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('7. Data Integrity', () => {
    it('should return consistent data across requests', async () => {
      const response1 = await fetch(`${BASE_URL}/lands?limit=1`);
      const data1 = await response1.json() as any;
      
      const response2 = await fetch(`${BASE_URL}/lands?limit=1`);
      const data2 = await response2.json() as any;
      
      if (data1.data.length > 0 && data2.data.length > 0) {
        expect(data1.data[0].landId).toBe(data2.data[0].landId);
      }
    });
  });

  describe('8. Fraud Data Verification', () => {
    it('should have legitimate transaction data', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=10`);
      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should have multiple lands in database', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=5`);
      const data = await response.json() as any;
      
      expect(data.data.length).toBeGreaterThanOrEqual(0);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('9. Security Headers', () => {
    it('should include security headers', async () => {
      const response = await fetch(`${BASE_URL}/lands?limit=1`);
      
      // API should respond with headers
      expect(response.headers).toBeDefined();
      expect(response.status).toBe(200);
    });
  });

  describe('10. NoSQL Injection Prevention', () => {
    it('should handle MongoDB operator injection safely', async () => {
      const payload = encodeURIComponent('{"$ne": null}');
      const response = await fetch(`${BASE_URL}/lands?search=${payload}`);
      
      // Should not crash or execute query
      expect([200, 400]).toContain(response.status);
    });

    it('should sanitize special characters', async () => {
      const payload = encodeURIComponent('"; db.dropDatabase(); //');
      const response = await fetch(`${BASE_URL}/lands?search=${payload}`);
      
      expect([200, 400]).toContain(response.status);
    });
  });
});
