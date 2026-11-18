// Renders each symbol of an ornament sprite as the component system does:
// two CSS masks, the main parts in --ornament-ink and the data-ink="accent"
// parts in --ornament-accent-ink, over the real texture and over a surface.
// Usage: node preview_ornaments.mjs SPRITE.svg TEXTURE.webp OUT.png
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const [sprite, texture, out] = process.argv.slice(2);
const svg = readFileSync(sprite, "utf8");
const tex = readFileSync(texture).toString("base64");
const html = `<!doctype html><html><head><style>
:root{--ornament-ink:rgb(134 96 50);--ornament-accent-ink:rgb(171 126 47);--surface:rgb(251 237 205)}
body{margin:0;padding:24px;font:13px Georgia,serif;color:rgb(52 32 18);background:url(data:image/webp;base64,${tex}) center/cover fixed}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}
figure{margin:0;display:grid;gap:8px;justify-items:center}
.row{display:flex;gap:14px;align-items:center}
.o{position:relative}
.o::before,.o::after{content:"";position:absolute;inset:0;mask:var(--m) center/contain no-repeat;background:var(--ornament-ink)}
.o::after{mask-image:var(--a);background:var(--ornament-accent-ink)}
.on-surface{background:var(--surface);padding:10px;border:1px solid var(--ornament-ink)}
</style></head><body><div class="grid" id="g"></div><div hidden id="s">${svg}</div><script>
const g=document.getElementById('g');
for(const sym of document.querySelectorAll('#s symbol')){
  const vb=sym.getAttribute('viewBox').split(' ').map(Number);
  const mk=(accent)=>{const c=sym.cloneNode(true);for(const el of [...c.querySelectorAll('*')]){const isA=el.getAttribute('data-ink')==='accent';if(isA!==accent)el.remove();}
    return 'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'">'+c.innerHTML+'</svg>')+'")';};
  const m=mk(false),a=mk(true);const f=document.createElement('figure');
  const ratio=vb[3]/vb[2];
  const sizes=[[vb[2]>60?120:48,1],[vb[2]>60?240:144,1]];
  f.innerHTML='<div class="row"></div><div class="row on-surface"></div><figcaption>'+sym.id+'</figcaption>';
  const rows=f.querySelectorAll('.row');
  for(const r of rows){for(const [w] of [[vb[2]<=16?16:vb[2]<=32?32:vb[2]<=64?52:120],[vb[2]<=16?64:vb[2]<=32?128:200]]){const d=document.createElement('div');d.className='o';d.style.cssText='width:'+w+'px;height:'+(w*ratio)+'px;--m:'+m+';--a:'+a;r.append(d);}}
  g.append(f);}
</script></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
