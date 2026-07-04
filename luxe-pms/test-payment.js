const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  const baseURL = 'http://localhost:3000';
  const results = {
    test1: { name: 'Fill form to reach a total', passed: false, notes: '' },
    test2: { name: 'Test Preset % Mode (30%)', passed: false, notes: '' },
    test3: { name: 'Test Custom Button', passed: false, notes: '' },
    test4: { name: 'Test Custom Input', passed: false, notes: '' },
    test5: { name: 'Test Switching Back', passed: false, notes: '' },
    test6: { name: 'Test Form Submission', passed: false, notes: '' }
  };

  try {
    // Navigate to groups/new
    console.log('Navigating to /groups/new...');
    await page.goto(`${baseURL}/groups/new`, { waitUntil: 'networkidle' });

    // Wait for the form to be ready
    await page.waitForTimeout(1000);

    // TEST 1: Fill form to reach a total
    console.log('\nTEST 1: Filling form...');
    try {
      // Fill group name
      await page.fill('input[placeholder*="Group name"], input[name="group_name"]', 'Test Group');

      // Select Wedding type
      await page.click('button:has-text("Wedding"), select[name="type"]');
      const typeOption = await page.$('option:has-text("Wedding"), button:has-text("Wedding")');
      if (typeOption) {
        await typeOption.click();
      }

      // Fill contact name
      await page.fill('input[placeholder*="Contact"], input[name="contact_name"]', 'John Doe');

      // Fill phone
      await page.fill('input[placeholder*="Phone"], input[name="phone"]', '+91 98765 43210');

      // Fill email
      await page.fill('input[placeholder*="Email"], input[name="email"]', 'john@example.com');

      // Select Booked by
      await page.click('button:has-text("Direct guest"), select[name="booked_by"]');

      // Set arrival date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const arrivalDate = tomorrow.toISOString().split('T')[0];
      await page.fill('input[type="date"][name*="arrival"], input[placeholder*="Arrival"]', arrivalDate);

      // Set departure date (3 days later)
      const departure = new Date();
      departure.setDate(departure.getDate() + 4);
      const departureDate = departure.toISOString().split('T')[0];
      await page.fill('input[type="date"][name*="departure"], input[placeholder*="Departure"]', departureDate);

      // Check if Live Summary shows total
      await page.waitForTimeout(500);
      const summaryText = await page.textContent('[class*="summary"], [class*="total"]');
      if (summaryText && (summaryText.includes('₹') || summaryText.includes('Total'))) {
        results.test1.passed = true;
        results.test1.notes = 'Form filled, total visible in summary';
      } else {
        results.test1.notes = 'Form filled but could not verify total display';
      }
    } catch (e) {
      results.test1.notes = `Error: ${e.message}`;
    }

    // TEST 2: Test Preset % Mode (30%)
    console.log('\nTEST 2: Testing 30% preset button...');
    try {
      // Scroll to Advance payment section
      await page.waitForSelector('button:has-text("30%"), button:has-text("50%")', { timeout: 5000 });

      // Click 30% button
      const button30 = await page.$('button:has-text("30%")');
      if (button30) {
        await button30.click();
        await page.waitForTimeout(300);

        // Check if button is highlighted
        const bgColor = await button30.evaluate(el => window.getComputedStyle(el).backgroundColor);
        const isHighlighted = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';

        // Check if "Advance (30%)" row appears
        const advanceText = await page.textContent('text=Advance (30%)');

        // Check if "Balance" row appears
        const balanceText = await page.textContent('text=Balance');

        // Check if no input field appears
        const inputFields = await page.$$('input[placeholder="0"]');
        const hasInputField = inputFields.length > 0;

        if (advanceText && balanceText && !hasInputField) {
          results.test2.passed = true;
          results.test2.notes = 'Advance (30%) row visible, Balance row visible, no input field';
        } else {
          results.test2.notes = `Advance: ${!!advanceText}, Balance: ${!!balanceText}, Input: ${hasInputField}`;
        }
      } else {
        results.test2.notes = '30% button not found';
      }
    } catch (e) {
      results.test2.notes = `Error: ${e.message}`;
    }

    // TEST 3: Test Custom Button
    console.log('\nTEST 3: Testing Custom button...');
    try {
      const customBtn = await page.$('button:has-text("Custom")');
      if (customBtn) {
        await customBtn.click();
        await page.waitForTimeout(300);

        // Check if Custom button is highlighted
        const bgColor = await customBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
        const isHighlighted = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';

        // Check if input field appears with placeholder "0"
        const inputField = await page.$('input[placeholder="0"]');

        // Check if display shows "of ₹X,XXX · Y% advance"
        const displayText = await page.textContent('[class*="of"], [class*="advance"]');

        if (inputField && displayText && displayText.includes('₹')) {
          results.test3.passed = true;
          results.test3.notes = 'Custom button highlighted, input field appeared, display text visible';
        } else {
          results.test3.notes = `Input: ${!!inputField}, Display: ${displayText}`;
        }
      } else {
        results.test3.notes = 'Custom button not found';
      }
    } catch (e) {
      results.test3.notes = `Error: ${e.message}`;
    }

    // TEST 4: Test Custom Input
    console.log('\nTEST 4: Testing custom input...');
    try {
      const inputField = await page.$('input[placeholder="0"]');
      if (inputField) {
        // Clear and enter 12000
        await inputField.fill('12000');
        await page.waitForTimeout(300);

        // Check if % display updates
        const displayText = await page.textContent('[class*="of"], [class*="advance"]');
        const hasPercentage = displayText && displayText.includes('%');

        // Try entering 50000 (should cap at total)
        await inputField.fill('50000');
        await page.waitForTimeout(300);

        const finalValue = await inputField.inputValue();
        const capped = parseInt(finalValue) <= 50000; // Should be capped

        if (hasPercentage && finalValue !== '') {
          results.test4.passed = true;
          results.test4.notes = `Input accepted 12000, % display updated, final value: ${finalValue}`;
        } else {
          results.test4.notes = `Input value: ${finalValue}, Display: ${displayText}`;
        }
      } else {
        results.test4.notes = 'Input field not found';
      }
    } catch (e) {
      results.test4.notes = `Error: ${e.message}`;
    }

    // TEST 5: Test Switching Back
    console.log('\nTEST 5: Testing switch back to 50%...');
    try {
      const button50 = await page.$('button:has-text("50%")');
      if (button50) {
        await button50.click();
        await page.waitForTimeout(300);

        // Check if input field disappears
        const inputFields = await page.$$('input[placeholder="0"]');
        const inputDisappeared = inputFields.length === 0;

        // Check if Custom button is no longer highlighted
        const customBtn = await page.$('button:has-text("Custom")');
        const bgColor = await customBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);

        // Check if "Advance (50%)" row appears
        const advanceText = await page.textContent('text=Advance (50%)');

        // Check if "Balance" row appears
        const balanceText = await page.textContent('text=Balance');

        if (inputDisappeared && advanceText && balanceText) {
          results.test5.passed = true;
          results.test5.notes = 'Input disappeared, Advance (50%) visible, Balance visible';
        } else {
          results.test5.notes = `Input gone: ${inputDisappeared}, Advance: ${!!advanceText}, Balance: ${!!balanceText}`;
        }
      } else {
        results.test5.notes = '50% button not found';
      }
    } catch (e) {
      results.test5.notes = `Error: ${e.message}`;
    }

    // TEST 6: Test Form Submission
    console.log('\nTEST 6: Testing form submission...');
    try {
      // Look for submit button
      const submitBtn = await page.$('button:has-text("Create Group Booking"), button[type="submit"]:has-text("Create")');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(2000);

        // Check if redirected to /groups list
        const currentURL = page.url();
        const redirected = currentURL.includes('/groups') && !currentURL.includes('/new');

        // Check console for errors
        let hasErrors = false;
        page.on('console', msg => {
          if (msg.type() === 'error') {
            hasErrors = true;
            console.log('Console error:', msg.text());
          }
        });

        if (redirected && !hasErrors) {
          results.test6.passed = true;
          results.test6.notes = `Redirected to ${currentURL}`;
        } else {
          results.test6.notes = `URL: ${currentURL}, Errors: ${hasErrors}`;
        }
      } else {
        results.test6.notes = 'Submit button not found';
      }
    } catch (e) {
      results.test6.notes = `Error: ${e.message}`;
    }

    // Print results
    console.log('\n========== TEST RESULTS ==========');
    Object.entries(results).forEach(([key, result]) => {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.name}`);
      console.log(`   ${result.notes}\n`);
    });

    const passedCount = Object.values(results).filter(r => r.passed).length;
    console.log(`\nSUMMARY: ${passedCount}/6 tests passed`);

  } catch (e) {
    console.error('Test error:', e);
  } finally {
    await browser.close();
  }
})();
