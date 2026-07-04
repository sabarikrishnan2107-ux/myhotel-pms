const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('error', err => console.log(`[ERROR] ${err.message}`));

  try {
    await page.goto('http://localhost:3000');
    await page.fill('input[type="email"]', 'admin@hotel.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto('http://localhost:3000/groups/GRP-2401');
    await page.waitForTimeout(2000);

    // Click Rooming List tab
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Rooming')) {
          btn.click();
          break;
        }
      }
    });

    await page.waitForTimeout(2000);

    console.log("\n=== ROOMING DATA IN PAGE ===");
    const roomingData = await page.evaluate(() => {
      // Try to extract the rooming state from React
      const tables = document.querySelectorAll('table');
      const roomingTable = Array.from(tables).find(t => {
        const headers = t.querySelectorAll('th');
        return Array.from(headers).some(h => h.textContent.includes('Lead Guest'));
      });

      if (!roomingTable) return { error: "Rooming table not found" };

      const rows = roomingTable.querySelectorAll('tbody tr');
      return {
        rowCount: rows.length,
        firstRow: {
          cells: Array.from(rows[0].querySelectorAll('td')).map((c, i) => ({
            index: i,
            text: c.textContent.trim().substring(0, 50),
            hasButton: c.querySelector('button') != null
          }))
        }
      };
    });

    console.log(JSON.stringify(roomingData, null, 2));

    console.log("\n=== ATTEMPTING MENU INTERACTION ===");

    // Click the menu button in the first row
    const menuClicked = await page.evaluate(() => {
      const table = document.querySelector('table');
      const firstRow = table.querySelector('tbody tr');
      const lastCell = firstRow.querySelectorAll('td')[firstRow.querySelectorAll('td').length - 1];
      const menuBtn = lastCell.querySelector('button');

      console.log("Menu button HTML:", menuBtn.outerHTML.substring(0, 200));
      
      if (menuBtn) {
        // Dispatch click with more detail
        const rect = menuBtn.getBoundingClientRect();
        console.log("Menu button position:", { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
        
        menuBtn.click();
        return true;
      }
      return false;
    });

    if (menuClicked) {
      await page.waitForTimeout(1500);

      console.log("\n=== PORTAL STATE ===");
      const portalState = await page.evaluate(() => {
        const portal = document.querySelector('[data-row-menu]');
        if (!portal) return { exists: false };

        return {
          exists: true,
          html: portal.innerHTML.substring(0, 1000),
          childCount: portal.children.length,
          allChildren: Array.from(portal.children).map(child => ({
            tag: child.tagName,
            class: child.className.substring(0, 100),
            textContent: child.textContent.trim().substring(0, 50)
          }))
        };
      });

      console.log(JSON.stringify(portalState, null, 2));

      // Try to check if there's a React error or the component isn't mounted
      const menuVisible = await page.evaluate(() => {
        const portal = document.querySelector('[data-row-menu]');
        if (!portal) return { visible: false };

        const style = window.getComputedStyle(portal);
        return {
          visible: style.display !== 'none' && style.visibility !== 'hidden',
          display: style.display,
          visibility: style.visibility,
          hasButtons: portal.querySelectorAll('button').length > 0
        };
      });

      console.log("\nPortal visibility:", menuVisible);
    }

  } catch (error) {
    console.log("ERROR:", error.message);
  } finally {
    await browser.close();
  }
})();
