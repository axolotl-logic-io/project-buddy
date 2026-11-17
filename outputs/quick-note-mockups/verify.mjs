import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const output = resolve('outputs/quick-note-mockups/brass-verification');
const { PROJECT_BUDDY_SESSION } = parseEnv(readFileSync('apps/cli/.env.local', 'utf8'));
if (!PROJECT_BUDDY_SESSION) throw new Error('Local development session unavailable');
const browser = await chromium.launch();
const evidence = [];
try {
  for (const width of [1280,320]) {
    for (const mode of ['light','soot-brass','dark']) {
      const context = await browser.newContext({ viewport: {width,height:900} });
      await context.addCookies([
        {name:'session',value:PROJECT_BUDDY_SESSION,url:'http://localhost:3000'},
        {name:'theme',value:`parchment.${mode}`,url:'http://localhost:3000'}
      ]);
      const page = await context.newPage();
      await page.goto('http://localhost:3000/quests');
      const toggle = page.getByRole('button',{name:'Site panel',exact:true});
      await toggle.click();
      const panel = page.getByRole('dialog',{name:'Site panel',exact:true});
      await panel.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
      await page.evaluate(() => document.fonts.ready);
      const card = panel.getByRole('button',{name:'Quick Note',exact:true});
      await card.focus();
      const shot = `${width}-${mode}`;
      await page.screenshot({path:`${output}/${shot}-panel.png`});
      const metrics = await card.evaluate(element => ({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,description:element.textContent}));
      if (metrics.height < 44) throw new Error('Card target below 44px');
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (pageWidth > width) throw new Error('Horizontal overflow');
      await card.click();
      const dialog = page.getByRole('dialog',{name:'Quick Note',exact:true});
      await dialog.waitFor();
      await dialog.getByText('Loading your quests…',{exact:true}).waitFor({state:'hidden'});
      await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished)); });
      await page.screenshot({path:`${output}/${shot}-dialog.png`});
      const state = await dialog.innerText();
      await page.keyboard.press('Escape');
      evidence.push({width, mode, url:'http://localhost:3000/quests', panel:`${shot}-panel.png`,dialog:`${shot}-dialog.png`,metrics, state});
      await context.close();
    }
  }
  writeFileSync(`${output}/verification.json`,JSON.stringify({branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,evidence},null,2));
  console.log(`Captured ${evidence.length} appearance/viewport combinations from the running application.`);
} finally { await browser.close(); }
