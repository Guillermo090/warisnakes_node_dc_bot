import puppeteer from 'puppeteer';

export class ScrapingService {

  static async getDaysForDrome(): Promise<string> {
    const dromeTime = await this.getDromeTime();

    if (dromeTime === "No encontrado"){
      return dromeTime;
    }

    const daysSegmento = dromeTime.split(' ')[0]; 
    return daysSegmento;
  }

  static async getDromeTime(): Promise<string> {
    const url = 'https://tibia.fandom.com/wiki/Tibiadrome/Rotation';
    const xpath = '/html/body/div[4]/div[4]/div[2]/main/div[3]/div/div/center/table/tbody/tr[3]/td/b';
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        // Argumentos para optimizar en entornos con pocos recursos y evitar errores de sandbox
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Crítico para entornos con poca memoria
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Puede ayudar en entornos con poca memoria
          '--disable-gpu'
        ]
      });
      const page = await browser.newPage();
      // Aumentamos el timeout a 60 segundos
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      const element = await page.waitForSelector(`xpath/${xpath}`);
      let text = 'No encontrado';
      if (element) {
        text = await page.evaluate(el => el?.textContent ?? 'No encontrado', element);
      }

      await browser.close();
      return text;
    } catch (error) {
      console.error('Error al obtener el tiempo del Drome:', error);
      // Asegurarse de que el navegador se cierre si hay un error
      if (browser) {
        await browser.close();
      }
      return 'No encontrado';
    }
  }
}