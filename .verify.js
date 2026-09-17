const { chromium } = require('playwright');
const URLS = [
  'http://localhost:8111/deep/nested/path/',          // 디렉터리 (슬래시 O)
  'http://localhost:8111/deep/nested/path/index.html' // 파일 직접 (슬래시 X)
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const url of URLS) {
    const ctx = await b.newContext({
      viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    });
    const page = await ctx.newPage();
    const errs = [], failed = [];
    page.on('pageerror', e => errs.push('' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', r => failed.push(r.url().slice(0, 60)));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('text=팝캣 OIIA 파티', { timeout: 15000 });
    await page.waitForTimeout(1200);

    const start = await page.getByTestId('mood-value').innerText();
    // 터치로 먹이기 (모바일 제스처)
    await page.getByLabel(/치킨 먹이기/).tap();
    await page.waitForTimeout(1400);
    const afterFeed = await page.getByTestId('mood-value').innerText();

    // MAX 까지 올려 파티 확인
    for (let i = 0; i < 8; i++) {
      await page.getByLabel(/치킨 먹이기/).tap();
      await page.waitForTimeout(1300);
      if (await page.getByText('OIIA OIIA').count()) break;
    }
    const partied = (await page.getByText('OIIA OIIA').count()) > 0;
    await page.waitForTimeout(9500);
    const afterParty = await page.getByTestId('mood-value').innerText();

    // 새로고침 후 복원 확인
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('text=팝캣 OIIA 파티', { timeout: 15000 });
    await page.waitForTimeout(1200);
    const restored = await page.getByTestId('mood-value').innerText();

    console.log(`\n=== ${url}`);
    console.log(`  시작=${start}  먹인뒤=${afterFeed}  파티발생=${partied}  파티후=${afterParty}  새로고침후=${restored}`);
    console.log(`  네트워크 실패: ${failed.length ? failed.join(', ') : '없음'}`);
    console.log(`  에러: ${errs.length ? errs.join(' | ') : '없음'}`);
    await ctx.close();
  }
  await b.close();
})();
