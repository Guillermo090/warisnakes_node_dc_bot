import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());

export class ScrapingService {

  static async getHighscores(world: string, category: string, profession: string, totalPages: number = 1): Promise<void> {
    const url = 'https://www.tibia.com/community/?subtopic=highscores';
    let browser;

    try {
      console.log(`Starting scrape for World: ${world}, Category: ${category}, Profession: ${profession}, Pages: ${totalPages}`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
        ]
      });
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      
      // Navigate to initial page
      // Add extra headers to look like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      });

      console.log('Navigating to URL...');
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log(`Navigation complete. Status: ${response?.status()} ${response?.statusText()}`);
      console.log(`Page Title: ${await page.title()}`);

      // -- IMMEDIATE DEBUG SNAPSHOT --
      try {
          const debugDir = path.resolve(__dirname, '../../debug');
          if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          await page.screenshot({ path: path.join(debugDir, `nav_immediate_${timestamp}.png`), fullPage: true });
          fs.writeFileSync(path.join(debugDir, `nav_immediate_${timestamp}.html`), await page.content());
          console.log('Saved immediate navigation snapshot.');
      } catch (e) { console.warn('Failed to save immediate snapshot', e); }

      // -- HANDLE COOKIE CONSENT --
      try {
        const cookieButtonSelector = '.cmpbox-btn.cmpbox-btn-green'; // Common selector for Tibia cookie consent
        if (await page.$(cookieButtonSelector)) {
          console.log('Cookie consent found. Accepting...');
          await page.click(cookieButtonSelector);
          // Wait a bit for the overlay to disappear
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (cookieErr) {
        console.warn('Error handling cookie consent (ignoring):', cookieErr);
      }

      // -- FORM SELECTION START --
      // Wait for World selector
      await page.waitForSelector('select[name="world"]', { timeout: 60000 });
      await page.select('select[name="world"]', world);

      // Select Profession (Vocations)
      const professionValue = await page.evaluate((profText) => {
        const select = document.querySelector('select[name="profession"]') || document.querySelector('select[name="vocation"]'); 
        if (!select) return null;
        
        const options = Array.from(select.querySelectorAll('option'));
        const option = options.find(opt => {
            const text = opt.textContent?.trim().toLowerCase() || '';
            const search = profText.toLowerCase();
            return text === search || text.includes(search);
        });
        return option ? option.value : null;
      }, profession);

      if (professionValue) {
        await page.evaluate((val) => {
             const select = (document.querySelector('select[name="profession"]') || document.querySelector('select[name="vocation"]')) as HTMLSelectElement;
             if(select) select.value = val;
        }, professionValue);
      } else {
         console.warn(`Profession "${profession}" not found. Proceeding with default/current.`);
      }

      // Select Category
      const categoryValue = await page.evaluate((catText) => {
        const select = document.querySelector('select[name="category"]') || document.querySelector('select[name="list"]'); 
        if (!select) return null;
        
        const options = Array.from(select.querySelectorAll('option'));
        const option = options.find(opt => opt.textContent?.trim() === catText);
        return option ? option.value : null;
      }, category);

      if (categoryValue) {
        await page.evaluate((val) => {
             const select = (document.querySelector('select[name="category"]') || document.querySelector('select[name="list"]')) as HTMLSelectElement;
             if(select) select.value = val;
        }, categoryValue);
      } else {
        console.error(`Could not find category value for: ${category}`);
        return;
      }

      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
        page.evaluate(() => {
             const forms = document.querySelectorAll('form');
             for(const form of Array.from(forms)) {
                 if(form.querySelector('select[name="world"]')) {
                     form.submit();
                     return;
                 }
             }
        })
      ]);
      // -- FORM SELECTION END --

      // -- PAGINATION LOOP --
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        console.log(`--- Processing Page ${currentPage} ---`);
        
        // Parse Results
        await page.waitForSelector('.TableContent', { timeout: 60000 });

        const chars = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.TableContent tr'));
            const data: { rank: string, name: string, points: string }[] = [];
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const rank = cells[0].textContent?.trim() || '';
                    const name = cells[1].textContent?.trim() || '';
                    const points = cells[cells.length - 1].textContent?.trim() || '';

                    if (/^\d+\.?$/.test(rank) && name) {
                        data.push({ rank, name, points });
                    }
                }
            });
            return data;
        });

        // Output Results
        chars.forEach(c => {
            console.log(`[Page ${currentPage}] Ranking: ${c.rank}, Nombre: ${c.name}, Points: ${c.points}`);
        });

        // Next Page Logic
        if (currentPage < totalPages) {
            console.log(`Attempting to navigate to page ${currentPage + 1}...`);
            const nextPageNum = currentPage + 1;
            
            // Try Strategy 1: "Next" text
            // Try Strategy 2: "2", "3" text
            const navigated = await page.evaluate((pageNum) => {
                const allLinks = Array.from(document.querySelectorAll('a'));
                
                // Strategy 1: Exact page number (highest confidence if unique)
                // BUT Tibia pagination might repeat numbers? Unlikely for pages.
                
                // Match "Next"
                const nextLink = allLinks.find(a => a.textContent?.includes('Next') || a.textContent?.includes('>>'));
                if (nextLink) {
                    nextLink.click();
                    return true;
                }

                // Match Page Number
                const pageLink = allLinks.find(a => a.textContent?.trim() === String(pageNum));
                if (pageLink) {
                    pageLink.click();
                    return true;
                }
                
                return false;
            }, nextPageNum);

            if (navigated) {
                 await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            } else {
                 console.log(`Could not find link for Next page or Page ${nextPageNum}. Checking page content for debugging.`);
                 break;
            }
        }
      }

    } catch (error) {
      console.error('Error in ScrapingService.getHighscores:', error);
      
      if (browser) {
        try {
            const debugDir = path.resolve(__dirname, '../../debug');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : null;
            if (page) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await page.screenshot({ path: path.join(debugDir, `error_screenshot_${timestamp}.png`), fullPage: true });
                const html = await page.content();
                fs.writeFileSync(path.join(debugDir, `error_page_${timestamp}.html`), html);
                console.log(`Saved debug screenshot and HTML to ${debugDir}`);
            }
        } catch (debugError) {
            console.error('Failed to save debug info:', debugError);
        }
      }

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}