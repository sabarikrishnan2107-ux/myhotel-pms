const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const baseURL = 'http://localhost:3000';

    console.log('=== Step 1: Navigate to login ===');
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'login-page.png' });

    // Look for email input
    console.log('Looking for login form...');
    const emailInput = await page.locator('input[type="email"], input[placeholder*="email"], input[name="email"]').first();
    if (emailInput) {
      console.log('Found email input, logging in...');
      await emailInput.fill('admin@hotel.com');

      // Look for password input
      const passwordInput = await page.locator('input[type="password"], input[placeholder*="password"]').first();
      if (passwordInput) {
        await passwordInput.fill('password123');

        // Click login button
        const loginBtn = await page.locator('button').filter({ hasText: /login|sign in|submit/i }).first();
        if (loginBtn) {
          console.log('Clicking login button...');
          await loginBtn.click();
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
          console.log('Login successful, current URL:', page.url());
          await page.screenshot({ path: 'after-login.png' });
        }
      }
    } else {
      console.log('Email input not found. Checking page content...');
      const content = await page.textContent('body');
      console.log('Page snippet:', content?.substring(0, 200));
      await page.screenshot({ path: 'login-debug.png' });
    }

    // Navigate to groups/new
    console.log('\n=== Step 2: Navigate to /groups/new ===');
    await page.goto(`${baseURL}/groups/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'groups-new-page.png' });
    console.log('Current URL:', page.url());

    // Check if we're still on login (not redirected)
    if (page.url().includes('/login')) {
      console.log('ERROR: Still on login page, authentication failed');
      process.exit(1);
    }

    console.log('\n=== Step 3: Find and inspect advance payment section ===');

    // Get all text on page to find advance section
    const pageText = await page.textContent('body');
    if (pageText?.includes('Advance')) {
      console.log('✓ Found "Advance" text on page');
    } else {
      console.log('✗ Could not find "Advance" text');
    }

    // Get all buttons
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} total buttons`);

    let percentButtons = [];
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const text = await allButtons[i].textContent();
        if (text && text.match(/^\d+%$|^Custom$|^Instalments$/)) {
          console.log(`  Button: "${text.trim()}"`);
          percentButtons.push({ index: i, text: text.trim(), element: allButtons[i] });
        }
      } catch (e) {
        // ignore
      }
    }

    console.log(`\nFound ${percentButtons.length} preset/custom buttons`);

    if (percentButtons.length > 0) {
      console.log('\n=== Step 4: Test 30% button ===');
      const btn30 = percentButtons.find(b => b.text.includes('30%'));
      if (btn30) {
        await btn30.element.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-30pct.png' });
        console.log('✓ Clicked 30% button');
      }

      console.log('\n=== Step 5: Test Custom button ===');
      const customBtn = percentButtons.find(b => b.text === 'Custom');
      if (customBtn) {
        await customBtn.element.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-custom.png' });
        console.log('✓ Clicked Custom button');

        // Look for input field
        const customInputs = await page.locator('input[placeholder="0"]').all();
        console.log(`Found ${customInputs.length} inputs with placeholder "0"`);

        if (customInputs.length > 0) {
          console.log('\n=== Step 6: Test Custom input ===');
          await customInputs[customInputs.length - 1].fill('12000');
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-custom-value.png' });
          console.log('✓ Entered custom value 12000');
        }
      }

      console.log('\n=== Step 7: Test switching back to preset ===');
      const btn50 = percentButtons.find(b => b.text.includes('50%'));
      if (btn50) {
        await btn50.element.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-back-to-preset.png' });
        console.log('✓ Clicked 50% button');
      }
    }

    console.log('\n=== SCREENSHOTS TAKEN ===');
    console.log('Screenshots saved for manual review');

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    if (browser) await browser.close();
  }
})();
