const { chromium } = require('playwright');

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
    await page.fill('input[placeholder*="email" i], input[type="email"]', 'admin@hotel.com');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="password" i], input[type="password"]', 'password123');
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
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Navigate to groups
    console.log('Navigating to /groups...');
    await page.goto('http://localhost:3000/groups', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Find a group link and click it
    const groupLinks = await page.$$('a[href*="/groups/"]');
    if (groupLinks.length === 0) {
      console.log('No groups found. Trying to find any link with group code...');
      const allLinks = await page.$$('a');
      for (const link of allLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('/groups/')) {
          console.log('Found group link:', href);
          await link.click();
          break;
        }
      }
    } else {
      console.log('Clicking first group link...');
      await groupLinks[0].click();
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
    const summaryText = await page.textContent('p.text-muted-foreground');
    console.log('Summary line text:', summaryText);
    
    // Find all badge elements and their content
    const badges = await page.$$('[role="status"], .inline-flex');
    console.log('Total interactive elements found:', badges.length);
    
    // Look for the table rows and get badge texts
    const tableRows = await page.$$('tbody tr');
    console.log('Total rooming list rows:', tableRows.length);
    
    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i];
      const cells = await row.$$('td');
      if (cells.length >= 3) {
        const leadCell = cells[2]; // Lead guest cell
        const leadText = await leadCell.textContent();
        
        // Get all badge elements within this cell
        const badgeElements = await leadCell.$$('button, span, div');
        let badgeText = '';
        for (const el of badgeElements) {
          const text = await el.textContent();
          if (text && (text.includes('Arriving') || text.includes('In-house') || text.includes('Checked out'))) {
            badgeText = text.trim();
            break;
          }
        }
        
        console.log(`Row ${i + 1}: "${leadText ? leadText.trim().substring(0, 50) : 'N/A'}" | Badge: "${badgeText}"`);
      }
    }
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: 'rooming-list.png' });
    console.log('Screenshot saved: rooming-list.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
