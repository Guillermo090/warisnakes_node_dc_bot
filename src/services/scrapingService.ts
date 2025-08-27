import puppeteer from 'puppeteer';

export class ScrapingService {

  static async getDromeTime(): Promise<string> {

    const url = 'https://tibia.fandom.com/wiki/Tibiadrome/Rotation';
    const xpath = '/html/body/div[4]/div[4]/div[2]/main/div[3]/div/div/center/table/tbody/tr[3]/td/b';

    try {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Se usa `waitForSelector` con el prefijo 'xpath/' para esperar el elemento.
      const element = await page.waitForSelector(`xpath/${xpath}`);
      let text = 'No encontrado';
      if (element) {
        // Se obtiene el texto del elemento.
        text = await page.evaluate(el => el.textContent, element);
      }

      await browser.close();
      return text;
    } catch (error) {
      console.error('Error al obtener el tiempo del Drome:', error);
      return 'No encontrado';
    }
  }
}