import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ deviceScaleFactor: 1 })

const mark = `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="3" y="3" width="58" height="58" rx="11" fill="#242421"/>
    <text x="32" y="44" text-anchor="middle" fill="#fffefa" font-family="Georgia, 'Times New Roman', serif" font-size="43" font-weight="600">Q</text>
  </svg>`

for (const [size, filename] of [
  [180, 'apple-touch-icon.png'],
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#f7f6f3}body{display:grid;place-items:center;padding:${Math.round(size * 0.12)}px}svg{width:100%;height:100%}</style>${mark}`)
  await page.screenshot({ path: `public/${filename}` })
}

await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(`<!doctype html>
<html><head><style>
  *{box-sizing:border-box} body{width:1200px;height:630px;margin:0;overflow:hidden;background:#f7f6f3;color:#242421;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .canvas{position:relative;display:flex;width:100%;height:100%;align-items:center;padding:76px 88px;background:radial-gradient(circle at 86% 16%,rgba(216,91,63,.13),transparent 28%),linear-gradient(135deg,#fffefa,#f2f0e9)}
  .canvas:after{position:absolute;right:84px;bottom:66px;width:290px;height:360px;border:1px solid #d8d5cc;border-radius:6px;background:#fffefa;box-shadow:0 28px 70px rgba(40,38,32,.14);content:"";transform:rotate(4deg)}
  .paper-lines{position:absolute;z-index:1;right:128px;bottom:137px;width:210px;height:225px;transform:rotate(4deg);background:linear-gradient(#242421 0 0) 0 0/72% 13px no-repeat,repeating-linear-gradient(to bottom,transparent 0 31px,#dad7cf 32px 33px)}
  .content{position:relative;z-index:2;width:720px}.brand{display:flex;align-items:center;gap:15px;margin-bottom:72px;font-size:24px;font-weight:750;letter-spacing:-.03em}.brand svg{width:52px;height:52px}
  .pill{display:inline-flex;align-items:center;gap:8px;margin-bottom:19px;padding:8px 13px;border:1px solid #d8d5cc;border-radius:999px;background:rgba(255,255,255,.62);color:#4f755b;font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}.dot{width:7px;height:7px;border-radius:50%;background:#4f8a61}
  h1{max-width:720px;margin:0;font-family:Georgia,"Times New Roman",serif;font-size:66px;font-weight:500;line-height:1.02;letter-spacing:-.055em}h1 em{color:#d85b3f;font-style:normal}
  p{margin:24px 0 0;color:#68665f;font-size:21px;line-height:1.45}.footer{position:absolute;bottom:57px;left:88px;color:#8a8880;font-size:15px;letter-spacing:.01em}
</style></head><body><main class="canvas"><section class="content"><div class="brand">${mark}<span>QuietMarkdown</span></div><div class="pill"><i class="dot"></i>Private by design</div><h1>Write quietly.<br/><em>Export beautifully.</em></h1><p>A fast, local Markdown editor with considered typography<br/>and customizable watermarks.</p></section><div class="paper-lines"></div><div class="footer">Markdown · PDF · HTML · PNG</div></main></body></html>`)
await page.screenshot({ path: 'public/og-image.png' })

await browser.close()
console.log('Generated QuietMarkdown icon and social assets.')
