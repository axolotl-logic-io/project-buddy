// Samples apps/web/public/textures/espresso-leather.webp: pixel and 16 px
// block luminance percentiles. Run from the repository root:
//   node outputs/theme-redesign/themes/espresso-leather/tools/sample-texture.mjs

import { chromium } from "../../../../../node_modules/playwright/index.mjs";
import fs from "node:fs";
const tex = fs.readFileSync(new URL("../../../../../apps/web/public/textures/espresso-leather.webp", import.meta.url)).toString("base64");
const b = await chromium.launch(); const p = await b.newPage();
const r = await p.evaluate(async (src) => {
  const img = new Image(); img.src = "data:image/webp;base64," + src; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const px = []; let sr=0,sg=0,sb=0;
  for (let i = 0; i < d.length; i += 4) { const L = 0.2126*lin(d[i])+0.7152*lin(d[i+1])+0.0722*lin(d[i+2]); px.push([L,d[i],d[i+1],d[i+2]]); sr+=d[i];sg+=d[i+1];sb+=d[i+2]; }
  // also 16px block averages (text sits over areas, not single pixels)
  const blocks=[]; const B=16;
  for (let y=0;y+B<=c.height;y+=B) for (let x=0;x+B<=c.width;x+=B){let R=0,G=0,Bl=0;for(let yy=0;yy<B;yy++)for(let xx=0;xx<B;xx++){const i=((y+yy)*c.width+x+xx)*4;R+=d[i];G+=d[i+1];Bl+=d[i+2];}const n=B*B;R/=n;G/=n;Bl/=n;blocks.push([0.2126*lin(R)+0.7152*lin(G)+0.0722*lin(Bl),R|0,G|0,Bl|0]);}
  px.sort((a,b)=>a[0]-b[0]); blocks.sort((a,b)=>a[0]-b[0]);
  const pick = (arr,q) => arr[Math.min(arr.length-1, Math.floor(q*arr.length))];
  const n = px.length;
  return { size:[c.width,c.height], mean:[sr/n|0,sg/n|0,sb/n|0],
    px: Object.fromEntries([0,0.01,0.05,0.5,0.95,0.99,0.999,1].map(q=>[q,pick(px,q)])),
    blocks: Object.fromEntries([0,0.01,0.5,0.99,1].map(q=>[q,pick(blocks,q)])) };
}, tex);
console.log(JSON.stringify(r, null, 1));
await b.close();
