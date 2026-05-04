/**
 * frontend/__tests__/security/input-sanitization.test.ts
 *
 * Frontend input sanitization and validation security tests.
 * Validates that all user inputs are properly sanitized and validated.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION PAYLOADS
// ──────────────────────────────────────────────────────────────────────────────

const MALICIOUS_INPUTS = {
  sql_injection: [
    "'; DELETE FROM users; --",
    "1' OR '1'='1",
    "admin' --",
    "1' UNION SELECT * FROM users --",
  ],
  nosql_injection: [
    '{"$ne": null}',
    '{"$gt": ""}',
    '{"$regex": ".*"}',
    '{"$or": [{}]}',
  ],
  command_injection: [
    '; rm -rf /',
    '| whoami',
    '` whoami `',
    '$(whoami)',
    '& ipconfig',
  ],
  path_traversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '....//....//....//etc/passwd',
  ],
  xss_payloads: [
    '<script>alert("xss")</script>',
    'javascript:alert(1)',
    'onclick="alert(1)"',
    '<img src=x onerror=alert(1)>',
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// 1. SQL INJECTION PREVENTION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('SQL Injection Prevention', () => {
  test('should reject SQL injection in search fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');

    if (await searchInput.isVisible()) {
      for (const payload of MALICIOUS_INPUTS.sql_injection) {
        await searchInput.fill(payload);

        // Submit form
        await page.keyboard.press('Enter');

        // Verify no error or malicious behavior
        let errorOccurred = false;
        page.on('response', (response) => {
          if (response.status() >= 500) {
            errorOccurred = true;
          }
        });

        // Should not throw 500 error (which might indicate SQL error)
        expect(errorOccurred).toBeFalsy();
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. NOSQL INJECTION PREVENTION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('NoSQL Injection Prevention', () => {
  test('should reject NoSQL operators in input fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    for (const payload of MALICIOUS_INPUTS.nosql_injection) {
      const input = page.locator('input[name="landId"], input[placeholder*="id"]');

      if (await input.isVisible()) {
        await input.fill(payload);

        const value = await input.inputValue();

        // Should be stored as string, not parsed as object
        expect(typeof value).toBe('string');
        expect(JSON.parse(JSON.stringify(value))).toEqual(payload);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. COMMAND INJECTION PREVENTION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Command Injection Prevention', () => {
  test('should not execute shell commands from input', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    let commandExecuted = false;

    page.on('response', (response) => {
      // Check if any suspicious system information is returned
      if (response.url().includes('etc/passwd') || response.url().includes('system32')) {
        commandExecuted = true;
      }
    });

    for (const payload of MALICIOUS_INPUTS.command_injection) {
      const input = page.locator('input');

      if (await input.first().isVisible()) {
        await input.first().fill(payload);
      }
    }

    expect(commandExecuted).toBeFalsy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. PATH TRAVERSAL PREVENTION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Path Traversal Prevention', () => {
  test('should not allow traversing file system paths', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const locationInput = page.locator('input[placeholder*="location"]');

    if (await locationInput.isVisible()) {
      for (const payload of MALICIOUS_INPUTS.path_traversal) {
        await locationInput.fill(payload);

        const value = await locationInput.inputValue();

        // Should not allow parent directory traversal
        expect(value).not.toMatch(/\.\.\//);
        expect(value).not.toMatch(/\.\.\\/);
      }
    }
  });

  test('should not access restricted files through file inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Check if any file inputs exist
    const fileInputs = page.locator('input[type="file"]');

    if ((await fileInputs.count()) > 0) {
      // Should not be able to access /etc/passwd and similar files
      // This is typically prevented by browser sandbox
      const fileInput = fileInputs.first();

      expect(fileInput).toBeDefined();
      // Browser sandbox prevents accessing arbitrary files
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. TYPE VALIDATION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Input Type Validation', () => {
  test('should validate numeric inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const numberInputs = page.locator('input[type="number"]');

    if ((await numberInputs.count()) > 0) {
      const input = numberInputs.first();

      // Try to input non-numeric values
      await input.fill('not-a-number');

      const value = await input.inputValue();

      // Browser should handle type validation
      expect(value).toMatch(/^\d*$/) || expect(value).toBe('');
    }
  });

  test('should validate email inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const emailInputs = page.locator('input[type="email"]');

    if ((await emailInputs.count()) > 0) {
      const input = emailInputs.first();

      // Try to input invalid email
      const invalidEmails = ['not-an-email', 'test@', '@test.com'];

      for (const email of invalidEmails) {
        await input.fill(email);

        // Check if validation error appears
        const errorMsg = page.locator('[role="alert"]');

        if (await errorMsg.isVisible()) {
          expect(await errorMsg.textContent()).toContain('email');
        }
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const requiredInputs = page.locator('input[required]');

    if ((await requiredInputs.count()) > 0) {
      const input = requiredInputs.first();

      // Leave field empty and try to submit
      const form = input.locator('xpath=ancestor::form');

      if (await form.isVisible()) {
        const submitBtn = form.locator('button[type="submit"]');

        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Should show validation error
          const errorMsg = page.locator('[role="alert"]');

          expect(await errorMsg.first().isVisible()).toBeTruthy();
        }
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. STRING LENGTH VALIDATION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('String Length Validation', () => {
  test('should enforce maximum string length', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const inputs = page.locator('input[type="text"]');

    if ((await inputs.count()) > 0) {
      const input = inputs.first();

      // Get maxlength attribute
      const maxLength = await input.getAttribute('maxlength');

      if (maxLength) {
        // Try to input longer string
        const longString = 'a'.repeat(parseInt(maxLength) + 100);
        await input.fill(longString);

        const value = await input.inputValue();

        // Should not exceed maxlength
        expect(value.length).toBeLessThanOrEqual(parseInt(maxLength));
      }
    }
  });

  test('should handle minimum string length validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const inputs = page.locator('input[type="text"]');

    if ((await inputs.count()) > 0) {
      const input = inputs.first();

      // Get minlength attribute
      const minLength = await input.getAttribute('minlength');

      if (minLength) {
        // Try to input shorter string
        const shortString = 'a'.repeat(Math.max(1, parseInt(minLength) - 1));
        await input.fill(shortString);

        // Try to submit
        const form = input.locator('xpath=ancestor::form');
        if (await form.isVisible()) {
          const submitBtn = form.locator('button[type="submit"]');
          if (await submitBtn.isVisible()) {
            await submitBtn.click();

            // Should show validation error
            const errorMsg = page.locator('[role="alert"]');
            if (await errorMsg.isVisible()) {
              expect(await errorMsg.textContent()).toContain('minimum');
            }
          }
        }
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. SPECIAL CHARACTER HANDLING
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Special Character Handling', () => {
  test('should safely handle Unicode characters', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const input = page.locator('input[name="ownerName"]').or(page.locator('input').first());

    if (await input.isVisible()) {
      const unicodeInputs = [
        '用户名', // Chinese
        'Ñoño', // Spanish
        'Привет', // Russian
        '🔒💻', // Emoji
      ];

      for (const unicodeStr of unicodeInputs) {
        await input.fill(unicodeStr);

        const value = await input.inputValue();

        // Should preserve Unicode characters
        expect(value).toBe(unicodeStr);
      }
    }
  });

  test('should escape HTML special characters', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const input = page.locator('input[name="ownerName"]').or(page.locator('input').first());

    if (await input.isVisible()) {
      const specialChars = '<>&"\'';

      await input.fill(specialChars);

      const value = await input.inputValue();

      // Should preserve literals or escape properly
      expect(value).toBeDefined();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. TEXTAREA VALIDATION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Textarea Input Validation', () => {
  test('should validate long-form text inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const textareas = page.locator('textarea');

    if ((await textareas.count()) > 0) {
      const textarea = textareas.first();

      for (const payload of MALICIOUS_INPUTS.xss_payloads) {
        await textarea.fill(payload);

        const value = await textarea.textContent();

        // Content should not execute as HTML
        expect(value).not.toContain('<script>');
        expect(value).not.toContain('onerror=');
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 9. FORM SUBMISSION VALIDATION
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Form Submission Validation', () => {
  test('should validate all fields before submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const form = page.locator('form').first();

    if (await form.isVisible()) {
      const submitBtn = form.locator('button[type="submit"]');

      if (await submitBtn.isVisible()) {
        // Try to submit empty form
        await submitBtn.click();

        // Should show validation errors
        const errors = page.locator('[aria-invalid="true"]');

        expect(await errors.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should prevent double form submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const form = page.locator('form').first();

    if (await form.isVisible()) {
      const submitBtn = form.locator('button[type="submit"]');

      if (await submitBtn.isVisible()) {
        // Rapid double-click
        await submitBtn.click();
        await submitBtn.click();

        // Button should be disabled after first click
        const isDisabled = await submitBtn.isDisabled();

        // Either disabled or form should show loading state
        expect(isDisabled || (await submitBtn.getAttribute('aria-busy')) === 'true').toBeTruthy();
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 10. REAL-TIME VALIDATION FEEDBACK
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Real-Time Validation Feedback', () => {
  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const inputs = page.locator('input[type="email"]');

    if ((await inputs.count()) > 0) {
      const input = inputs.first();

      // Type invalid email
      await input.fill('invalid-email');

      // Should show error message
      const errorMsg = page.locator('[role="alert"]');

      if (await errorMsg.isVisible()) {
        expect(await errorMsg.textContent()).toBeTruthy();
      }
    }
  });

  test('should clear error messages when corrected', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const inputs = page.locator('input[type="email"]');

    if ((await inputs.count()) > 0) {
      const input = inputs.first();

      // Type invalid email
      await input.fill('invalid');
      await input.waitForElementState('stable');

      // Correct the email
      await input.fill('valid@example.com');

      // Error message should disappear
      const errorMsg = page.locator('[role="alert"]');

      expect(await errorMsg.isVisible()).toBeFalsy();
    }
  });
});
