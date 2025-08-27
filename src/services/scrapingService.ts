// import puppeteer from 'puppeteer';

export class ScrapingService {

  // static async getDromeTime(): Promise<string> {
  //   const url = 'https://tibia.fandom.com/wiki/Tibiadrome/Rotation';
  //   const xpath = '/html/body/div[4]/div[4]/div[2]/main/div[3]/div/div/center/table/tbody/tr[3]/td/b';
  //   let browser;

  //   try {
  //     browser = await puppeteer.launch({
  //       headless: true,
  //       executablePath: '/usr/bin/chromium-browser',
  //       args: [
  //         '--no-sandbox',
  //         '--disable-setuid-sandbox',
  //         '--disable-dev-shm-usage',
  //         '--disable-gpu',
  //         '--single-process'
  //       ]
  //     });
  //     const page = await browser.newPage();
  //     // Aumentamos el timeout a 60 segundos
  //     await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  //     const element = await page.waitForSelector(`xpath/${xpath}`);
  //     let text = 'No encontrado';
  //     if (element) {
  //       text = await page.evaluate(el => el?.textContent ?? 'No encontrado', element);
  //     }

  //     await browser.close();
  //     return text;
  //   } catch (error) {
  //     console.error('Error al obtener el tiempo del Drome:', error);
  //     // Asegurarse de que el navegador se cierre si hay un error
  //     if (browser) {
  //       await browser.close();
  //     }
  //     return 'No encontrado';
  //   }
  // }
}