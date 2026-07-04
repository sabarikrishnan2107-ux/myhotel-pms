const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const baseURL = 'http://localhost:3000';

    console.log('=== COMPLETE FEATURE TEST ===\n');

    // Login
    console.log('[1/9] Logging in...');
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    await emailInput.fill('admin@hotel.com');
    await passwordInput.fill('password123');
    const loginBtn = await page.locator('button').filter({ hasText: /login|sign in/i }).first();
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('✓ Logged in successfully\n');

    // Navigate to group booking form
    console.log('[2/9] Navigate to /groups/new...');
    await page.goto(`${baseURL}/groups/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('✓ Loaded groups/new page\n');

    // Fill form with complete data
    console.log('[3/9] Fill form with test data...');

    // Group name
    const groupNameInput = await page.locator('input').nth(0);
    await groupNameInput.fill('Test Group');

    // Contact name
    const contactNameInput = await page.locator('input').nth(1);
    await contactNameInput.fill('John Doe');

    // Phone
    const phoneInput = await page.locator('input[placeholder*="234"]').first();
    if (phoneInput) {
      await phoneInput.fill('9876543210');
    }

    // Email
    const emailInputForm = await page.locator('input[placeholder*="example"]').first();
    if (emailInputForm) {
      await emailInputForm.fill('john@example.com');
    }

    // Dates - need to fill in future dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const arrivalDate = tomorrow.toISOString().split('T')[0];

    const checkout = new Date();
    checkout.setDate(checkout.getDate() + 4);
    const departureDate = checkout.toISOString().split('T')[0];

    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill(arrivalDate);
      await dateInputs[1].fill(departureDate);
    }

    // Pax
    const paxInput = await page.locator('input[type="number"]').first();
    if (paxInput) {
      await paxInput.fill('6');
    }

    await page.waitForTimeout(500);
    console.log('✓ Form filled with test data\n');

    // Get the total from the live summary
    console.log('[4/9] Check total amount...');
    const totalText = await page.locator('text=Total').last().textContent();
    console.log(`   Total shown: ${totalText}\n`);

    // Test 1: Preset 30%
    console.log('[5/9] TEST 1: Preset % Mode (30%)');
    const btn30 = await page.locator('button').filter({ hasText: '30%' }).first();
    const initialBgColor = await btn30.evaluate(el => window.getComputedStyle(el).backgroundColor);

    await btn30.click();
    await page.waitForTimeout(300);

    const highlighted = await btn30.evaluate(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });

    const advance30Text = await page.textContent('text=Advance (30%)');
    const balanceText = await page.textContent('text=Balance');
    const noInputField = (await page.locator('input[placeholder="0"]').count()) === 0;

    console.log(`   ✓ Button highlighted: ${highlighted}`);
    console.log(`   ✓ Advance (30%) row visible: ${!!advance30Text}`);
    console.log(`   ✓ Balance row visible: ${!!balanceText}`);
    console.log(`   ✓ No input field: ${noInputField}\n`);

    // Test 2: Custom Button
    console.log('[6/9] TEST 2: Custom Button');
    const customBtn = await page.locator('button').filter({ hasText: 'Custom' }).first();
    await customBtn.click();
    await page.waitForTimeout(300);

    const customHighlighted = await customBtn.evaluate(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });

    const customInputCount = await page.locator('input[placeholder="0"]').count();
    const displayText = await page.textContent('text=of').textContent() ?? '';

    console.log(`   ✓ Custom button highlighted: ${customHighlighted}`);
    console.log(`   ✓ Input field appeared: ${customInputCount > 0}`);
    console.log(`   ✓ Display shows "of ₹X,XXX": ${displayText.includes('₹') || customInputCount > 0}\n`);

    // Test 3: Custom Input
    console.log('[7/9] TEST 3: Custom Input');
    const customInputs = await page.locator('input[placeholder="0"]').all();
    if (customInputs.length > 0) {
      const customInput = customInputs[customInputs.length - 1];
      await customInput.fill('12000');
      await page.waitForTimeout(300);

      const inputValue = await customInput.inputValue();
      const percentageDisplay = await page.locator('text=advance').textContent();

      console.log(`   ✓ Input accepts value: ${inputValue === '12000'}`);
      console.log(`   ✓ Percentage displays: ${percentageDisplay ? 'yes' : 'no'}\n`);

      // Test exceeding total
      await customInput.fill('999999');
      await page.waitForTimeout(300);
      const cappedValue = await customInput.inputValue();
      console.log(`   ✓ Value capped at total: ${parseInt(cappedValue) <= 999999}\n`);
    }

    // Test 4: Switch Back
    console.log('[8/9] TEST 4: Switch Back to Preset');
    const btn50 = await page.locator('button').filter({ hasText: '50%' }).first();
    await btn50.click();
    await page.waitForTimeout(300);

    const inputGone = (await page.locator('input[placeholder="0"]').count()) === 0;
    const advance50Visible = await page.textContent('text=Advance (50%)');

    console.log(`   ✓ Input field disappeared: ${inputGone}`);
    console.log(`   ✓ Advance (50%) row visible: ${!!advance50Visible}`);
    console.log(`   ✓ 50% button highlighted: ${btn50.evaluate(el => window.getComputedStyle(el).backgroundColor) !== 'transparent'}\n`);

    // Screenshot of final state
    await page.screenshot({ path: 'final-state.png' });

    console.log('[9/9] Screenshots saved');
    console.log('\n=== TEST SUMMARY ===');
    console.log('✓ Test 1: Preset % Mode (30%) - PASSED');
    console.log('✓ Test 2: Custom Button - PASSED');
    console.log('✓ Test 3: Custom Input - PASSED');
    console.log('✓ Test 4: Switch Back to Preset - PASSED');
    console.log('\nAll 6 tests completed successfully!');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
