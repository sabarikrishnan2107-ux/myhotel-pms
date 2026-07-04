import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait a moment for the page to load
    await page.waitForTimeout(1000);
    
    // Fill in login credentials
    console.log('Logging in as admin@hotel.com...');
    const emailInput = await page.$('input[type="email"], input[placeholder*="email" i]');
    if (emailInput) {
      await emailInput.fill('admin@hotel.com');
    }
    
    await page.waitForTimeout(500);
    
    const passwordInput = await page.$('input[type="password"], input[placeholder*="password" i]');
    if (passwordInput) {
      await passwordInput.fill('password123');
    }
    
    await page.waitForTimeout(500);
    
    // Click the submit button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.toLowerCase().includes('sign in')) {
        await btn.click();
        break;
      }
    }
    
    console.log('Waiting for redirect to dashboard...');
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e) {
      console.log('Navigation timeout (might have redirected already)');
    }
    
    // Navigate to groups
    console.log('Navigating to /groups...');
    await page.goto('http://localhost:3000/groups', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Find a group link and click it
    const allLinks = await page.$$('a');
    let foundGroup = false;
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/groups/') && !href.includes('groups/new')) {
        console.log('Found group link:', href);
        await link.click();
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      console.log('No groups found, trying direct API call...');
      await browser.close();
      return;
    }
    
    console.log('Waiting for group page to load...');
    await page.waitForTimeout(2000);
    
    // Click on Rooming List tab
    console.log('Looking for Rooming List tab...');
    const tabs = await page.$$('button');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text && text.toLowerCase().includes('rooming')) {
        await tab.click();
        break;
      }
    }
    
    await page.waitForTimeout(1500);
    
    // Get the summary line
    const summaryElements = await page.$$('p.text-muted-foreground');
    let summaryText = '';
    for (const el of summaryElements) {
      const text = await el.textContent();
      if (text && text.includes('guests in') && text.includes('rooms')) {
        summaryText = text.trim();
        break;
      }
    }
    console.log('\n=== SUMMARY LINE ===');
    console.log('Text:', summaryText);
    
    // Look for the table rows and get badge texts
    const tableRows = await page.$$('tbody tr');
    console.log('\n=== ROOMING LIST ROWS ===');
    console.log('Total rows:', tableRows.length);
    
    for (let i = 0; i < Math.min(tableRows.length, 5); i++) {
      const row = tableRows[i];
      const cells = await row.$$('td');
      if (cells.length >= 3) {
        const leadCell = cells[2]; // Lead guest cell (column 3)
        const leadHtml = await leadCell.innerHTML();
        const leadText = await leadCell.textContent();
        
        // Extract just the name part (before any badge)
        const nameMatch = leadText.match(/^([^A-Za-z]*)/);
        
        console.log(`\nRow ${i + 1}:`);
        console.log('  HTML:', leadHtml.substring(0, 200));
        console.log('  Text:', leadText.trim().substring(0, 100));
        
        // Look for badge text specifically
        if (leadHtml.includes('Arriving')) {
          console.log('  Badge: Arriving');
        } else if (leadHtml.includes('In-house') && leadHtml.includes('·')) {
          const timeMatch = leadHtml.match(/In-house·?\s*([0-9:]+)/);
          if (timeMatch) {
            console.log('  Badge: In-house · ' + timeMatch[1]);
          } else {
            console.log('  Badge: In-house (with time)');
          }
        } else if (leadHtml.includes('Checked out') && leadHtml.includes('·')) {
          const timeMatch = leadHtml.match(/Checked out·?\s*([0-9:]+)/);
          if (timeMatch) {
            console.log('  Badge: Checked out · ' + timeMatch[1]);
          } else {
            console.log('  Badge: Checked out (with time)');
          }
        } else if (leadHtml.includes('Checked out')) {
          console.log('  Badge: Checked out');
        }
      }
    }
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: 'rooming-list.png' });
    console.log('\n\nScreenshot saved: rooming-list.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
