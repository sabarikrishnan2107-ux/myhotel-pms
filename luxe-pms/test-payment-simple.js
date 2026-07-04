const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const baseURL = 'http://localhost:3000';

    // Navigate to groups/new
    console.log('Navigating to /groups/new...');
    await page.goto(`${baseURL}/groups/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Screenshot for debugging
    await page.screenshot({ path: 'step0-initial.png' });

    // Fill form with test data
    console.log('\n=== FILLING FORM ===');
    try {
      // Look for input fields and fill them
      const inputs = await page.locator('input[placeholder*="name"], input:visible').all();
      console.log(`Found ${inputs.length} visible input fields`);

      // Get all text inputs on page
      const allInputs = await page.locator('input').all();
      console.log(`Total inputs on page: ${allInputs.length}`);

      // Fill in text fields by label or position
      const groupNameField = await page.locator('input').first();
      if (groupNameField) {
        await groupNameField.fill('Test Group');
        console.log('Filled group name');
      }

      // Wait and take screenshot
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'step1-form-filled.png' });

      // Scroll to find advance payment section
      console.log('\n=== FINDING ADVANCE PAYMENT SECTION ===');
      const advanceSection = await page.locator('text=Advance payment, text=Advance').first();
      if (advanceSection) {
        await advanceSection.scrollIntoViewIfNeeded();
        console.log('Scrolled to advance section');
      }

      await page.waitForTimeout(500);
      await page.screenshot({ path: 'step2-advance-section.png' });

      // Look for percentage buttons
      console.log('\n=== TESTING PRESET BUTTONS ===');
      const buttons = await page.locator('button:has-text("%")').all();
      console.log(`Found ${buttons.length} buttons with %`);

      // Get all buttons on page
      const allButtons = await page.locator('button').all();
      console.log(`Total buttons on page: ${allButtons.length}`);

      // Print button labels for debugging
      for (let i = 0; i < Math.min(15, allButtons.length); i++) {
        try {
          const text = await allButtons[i].textContent();
          console.log(`  Button ${i}: "${text}"`);
        } catch (e) {
          console.log(`  Button ${i}: (error reading text)`);
        }
      }

      // Try clicking buttons with percentage text
      const percentButtons = await page.locator('button').filter({ hasText: /^\d+%/ }).all();
      console.log(`\nFound ${percentButtons.length} percentage buttons`);

      if (percentButtons.length >= 2) {
        // Test clicking 30% button
        await percentButtons[0].click();
        console.log('Clicked first percentage button');
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'step3-after-30pct.png' });

        // Test clicking Custom button
        const customButtons = await page.locator('button').filter({ hasText: /^Custom/ }).all();
        if (customButtons.length > 0) {
          await customButtons[0].click();
          console.log('Clicked Custom button');
          await page.waitForTimeout(300);
          await page.screenshot({ path: 'step4-custom-mode.png' });

          // Test entering custom value
          const numberInputs = await page.locator('input[type="number"]').all();
          console.log(`Found ${numberInputs.length} number inputs`);

          // Look for the custom advance input (not the first one which might be room qty)
          for (let i = numberInputs.length - 1; i >= 0; i--) {
            const input = numberInputs[i];
            try {
              const placeholder = await input.getAttribute('placeholder');
              const value = await input.getAttribute('value');
              console.log(`Input ${i}: placeholder="${placeholder}", value="${value}"`);

              if (placeholder === '0' || !value) {
                await input.fill('12000');
                console.log(`Filled input ${i} with 12000`);
                break;
              }
            } catch (e) {
              // ignore
            }
          }

          await page.waitForTimeout(300);
          await page.screenshot({ path: 'step5-custom-filled.png' });

          // Click back to 50%
          const last50Button = percentButtons[percentButtons.length - 1];
          try {
            const text = await last50Button.textContent();
            if (text.includes('50')) {
              await last50Button.click();
              console.log('Clicked 50% button');
            }
          } catch (e) {
            console.log('Could not find 50% button');
          }

          await page.waitForTimeout(300);
          await page.screenshot({ path: 'step6-back-to-preset.png' });
        }
      }

      console.log('\n=== SCREENSHOTS SAVED ===');
      console.log('Check: step0-initial.png through step6-back-to-preset.png');

    } catch (e) {
      console.error('Error during test:', e.message);
      await page.screenshot({ path: 'error.png' });
    }

  } catch (e) {
    console.error('Fatal error:', e);
  } finally {
    if (browser) await browser.close();
  }
})();
