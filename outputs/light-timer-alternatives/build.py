from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent

def data(path, mime):
    return f'data:{mime};base64,' + base64.b64encode((ROOT/path).read_bytes()).decode()

fonts = ''
for family, path, weight, style in [
    ('StudyText','im-fell-english/im-fell-english-latin-400-normal.woff2','400','normal'),
    ('StudyItalic','im-fell-english/im-fell-english-latin-400-italic.woff2','400','italic'),
    ('StudyNumbers','cormorant-garamond/cormorant-garamond-latin-wght-normal.woff2','300 700','normal')]:
    fonts += "@font-face{font-family:"+family+";src:url('"+data('apps/web/src/themes/fonts/'+path,'font/woff2')+"') format('woff2');font-weight:"+weight+";font-style:"+style+";font-display:swap}"
texture = data('apps/web/public/textures/ivory-vellum.webp','image/webp')
common = fonts + '''
:root{--study-paper:rgb(244 236 216);--study-ink:rgb(53 33 17);--study-muted:rgb(103 72 40);--study-line:rgb(134 96 50);--study-gold:rgb(171 126 47);--study-pale-gold:rgb(206 180 124);--study-rubric:rgb(139 60 42);--study-water:rgb(93 119 123);--radius:3px}
*{box-sizing:border-box}html,body{margin:0;background:none}body{font-family:StudyText,Georgia,serif}.study{position:relative;isolation:isolate;overflow:hidden;min-height:570px;color:var(--study-ink);background-color:var(--study-paper);background-image:url('__TEXTURE__');background-size:cover;border-radius:var(--radius);container-type:inline-size}p,h2{margin:0}.readout{position:relative;text-align:center}.phase{font:italic 400 28px StudyItalic,Georgia,serif;line-height:1.3}.countdown{font:500 clamp(64px,15cqi,108px) StudyNumbers,Georgia,serif;font-variant-numeric:lining-nums tabular-nums;letter-spacing:-.045em;line-height:1}.next{font-size:14px;letter-spacing:.06em;color:var(--study-muted)}.preview-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-top:12px;font:12px var(--font-sans,system-ui);color:var(--muted-foreground)}.preview-controls input{flex:1;min-width:100px;max-width:280px;min-height:32px}.preview-controls output{font-variant-numeric:tabular-nums;min-width:32px}svg{display:block}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
'''.replace('__TEXTURE__',texture)
script = '''
const root=document.getElementById('__ROOT__');
const slider=root.querySelector('input[type="range"]');
function renderPreview(){const percent=Number(slider.value),fraction=percent/100;root.querySelector('output').textContent=Math.round(percent)+'%';const remaining=Math.max(0,Math.round(3000*(1-fraction)));root.querySelector('[role="timer"]').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');for(const arc of root.querySelectorAll('[data-route]'))arc.setAttribute('stroke-dasharray',percent+' 100');for(const mark of root.querySelectorAll('[data-at]')){const passed=fraction>=Number(mark.dataset.at);mark.setAttribute('data-lit',String(passed));}const top=root.querySelector('[data-sand-top]'),bottom=root.querySelector('[data-sand-bottom]');if(top){top.setAttribute('y',String(55+142*fraction));top.setAttribute('height',String(142*(1-fraction)));bottom.setAttribute('y',String(347-137*fraction));bottom.setAttribute('height',String(137*fraction));const stream=root.querySelector('[data-sand-stream]');stream.setAttribute('d','M115 203V'+String(347-137*fraction));stream.style.opacity='0';if(fraction>0&&fraction<1){stream.style.opacity='1';}}const ribbon=root.querySelector('[data-ribbon]');if(ribbon){ribbon.setAttribute('width',String(500*fraction));root.querySelector('[data-ribbon-head]').setAttribute('transform','translate('+String(100+500*fraction)+' 0)');}}
slider.addEventListener('input',renderPreview);renderPreview();
'''

def save(name,title,css,body):
    controls=f'''<div class="preview-controls"><label for="{name}-progress">Preview progress</label><input id="{name}-progress" type="range" min="0" max="100" value="51.6333333333" step="any" aria-label="Preview elapsed work"><output for="{name}-progress">52%</output></div>'''
    html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+common+css+'</style></head><body><div id="'+name+'"><section class="study" aria-label="'+title+' timer concept">'+body+'</section>'+controls+'</div><script>'+script.replace('__ROOT__',name)+'</script></body></html>'
    (OUT/(name+'.html')).write_text(html)

map_css='''
.cartography{position:absolute;inset:0;width:100%;height:100%}.terrain{fill:none;stroke:var(--study-line);stroke-width:.9;opacity:.33}.water{fill:none;stroke:var(--study-water);stroke-width:15;opacity:.22}.bank{fill:none;stroke:var(--study-water);stroke-width:1;opacity:.65}.place{fill:var(--study-muted);font-family:StudyItalic,Georgia,serif;font-style:italic;font-size:14px;letter-spacing:1px}.compass-label{font-family:StudyText,Georgia,serif;font-size:15px;fill:var(--study-ink);letter-spacing:2px}.rose-light{fill:var(--study-pale-gold);fill-opacity:.55;stroke:var(--study-line);stroke-width:.7}.rose-dark{fill:var(--study-line);fill-opacity:.28;stroke:var(--study-line);stroke-width:.7}.north-needle{fill:var(--study-rubric);fill-opacity:.85;stroke:var(--study-rubric)}.route{fill:none;stroke:var(--study-line);stroke-width:2;stroke-dasharray:3 7;opacity:.45}.journey{fill:none;stroke:var(--study-rubric);stroke-width:4;stroke-linecap:round}.waypoint{fill:var(--study-paper);stroke:var(--study-line);stroke-width:1.5}.waypoint[data-lit="true"]{fill:var(--study-rubric);stroke:var(--study-rubric)}.map-readout{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);padding:28px 40px;background:radial-gradient(ellipse,var(--study-paper) 40%,transparent 72%)}.map-readout .phase{position:absolute;bottom:calc(100% - 22px);left:0;right:0}.map-next{position:absolute;bottom:18px;left:0;right:0;text-align:center}.map-readout .countdown{white-space:nowrap}@media(max-width:460px){.study{min-height:520px}.map-readout{padding:20px 25px}.compass-label{font-size:28px}.place{display:none}.map-readout .phase{font-size:24px;bottom:calc(100% - 16px)}}
'''
map_body='''
<svg class="cartography" viewBox="0 0 720 600" aria-hidden="true">
 <g class="terrain"><path d="M-40 114C79 34 118 149 193 91S315 10 374 51 447 54 486 1M-20 140C82 63 125 170 203 113S310 45 365 76 456 87 507 16M-17 164C91 92 141 195 217 139S314 77 360 103 456 118 529 34M-10 191C110 121 151 216 231 165S317 108 355 131 461 149 552 57M-7 218C127 154 165 239 244 194S326 139 356 160 472 179 574 86"/><path d="M449 600c-46-73 50-74 30-139s17-118 98-115 128-58 170-27M475 609c-42-69 50-75 32-137s15-93 77-99 119-43 154-29M500 612c-31-68 51-74 36-131s11-73 59-81 105-28 135-26M526 613c-20-65 54-75 42-123s8-54 43-63 78-19 115-22"/><path d="M-10 410c97-82 136 15 194-22s103-21 114 17M-10 437c100-76 137 8 191-23s91-16 104 15M-4 463c102-69 135 1 182-25s82-10 94 14"/></g>
 <path class="water" d="M625-10C540 75 662 131 577 209S650 336 600 413 666 536 617 620"/><path class="bank" d="M614-10C530 77 651 133 568 207S639 335 591 411 656 535 607 620"/>
 <text class="place" x="82" y="110" transform="rotate(-8 82 110)">Quietwood</text><text class="place" x="575" y="487" transform="rotate(-10 575 487)">Westmere</text><text class="place" x="82" y="486" transform="rotate(-12 82 486)">The old road</text>
 <g transform="translate(360 288)">
  <path class="rose-light" d="M0-214 24-45 106-106 45-24 214 0 45 24 106 106 24 45 0 214-24 45-106 106-45 24-214 0-45-24-106-106-24-45Z"/>
  <path class="rose-dark" d="M0-214 0 0 24-45ZM214 0 0 0 45 24ZM0 214 0 0-24 45ZM-214 0 0 0-45-24Z"/>
  <path class="north-needle" d="M0-214-24-45 0-64Z"/>
  <path d="M0-66 93 0 0 66-93 0Z" fill="var(--study-paper)" opacity=".86"/>
 </g>
 <g class="compass-label" text-anchor="middle"><text x="360" y="55">N</text><text x="601" y="294">E</text><text x="360" y="546">S</text><text x="119" y="294">W</text></g>
 <path class="route" d="M78 503C118 419 181 478 219 416S141 323 193 265 263 258 270 181 439 174 470 124 545 93 571 51"/>
 <path class="journey" data-route pathLength="100" d="M78 503C118 419 181 478 219 416S141 323 193 265 263 258 270 181 439 174 470 124 545 93 571 51" stroke-dasharray="51.63 100"/>
 <g><circle class="waypoint" data-at="0" cx="78" cy="503" r="5"/><circle class="waypoint" data-at=".19" cx="219" cy="416" r="5"/><circle class="waypoint" data-at=".39" cx="193" cy="265" r="5"/><circle class="waypoint" data-at=".58" cx="270" cy="181" r="5"/><circle class="waypoint" data-at=".81" cx="470" cy="124" r="5"/><path class="waypoint" data-at="1" d="m571 43 7 8-7 8-7-8Z"/></g>
</svg><div class="readout map-readout"><h2 class="phase">Work</h2><p class="countdown" role="timer" aria-label="Time left">24:11</p></div><p class="next map-next">Next · Break</p>
'''
save('compass-map','The cartographer’s passage',map_css,map_body)

hour_css='''
.hour-layout{min-height:570px;display:grid;grid-template-columns:1fr 1.12fr;align-items:center;padding:40px 55px;gap:10px}.hourglass{width:100%;max-width:230px;justify-self:center}.hour-frame{fill:none;stroke:var(--study-line);stroke-width:2}.hour-wood{fill:var(--study-ink)}.glass-line{fill:none;stroke:var(--study-line);stroke-width:1.3}.sand{fill:var(--study-gold)}.sand-grain{stroke:var(--study-paper);stroke-width:.7;opacity:.35}.hour-readout{text-align:left}.hour-readout .phase{font-size:32px;margin-bottom:13px}.hour-readout .countdown{font-size:clamp(68px,16cqi,116px)}.hour-readout .next{margin-top:35px;padding-top:17px;position:relative}.hour-readout .next:before{content:'';position:absolute;left:0;top:0;width:48px;border-top:1px solid var(--study-line)}@media(max-width:460px){.hour-layout{min-height:520px;padding:40px 24px;grid-template-columns:1fr;gap:10px}.hourglass{max-width:132px}.hour-readout{text-align:center}.hour-readout .phase{font-size:25px;margin-bottom:5px}.hour-readout .countdown{font-size:68px}.hour-readout .next{margin-top:18px;padding-top:12px}.hour-readout .next:before{left:calc(50% - 24px)}}
'''
hour_body='''<div class="hour-layout"><svg class="hourglass" viewBox="0 0 230 400" aria-hidden="true"><defs><clipPath id="top-bowl"><path d="M48 55H182C182 111 164 150 115 197 66 150 48 111 48 55Z"/></clipPath><clipPath id="bottom-bowl"><path d="M115 210C66 256 48 292 48 347H182C182 292 164 256 115 210Z"/></clipPath><pattern id="sand-grain" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" class="sand"/><path class="sand-grain" d="M1 2h1m2 3h1"/></pattern></defs>
 <path class="hour-wood" d="M27 28h176v8H27ZM27 365h176v8H27Z"/><path class="hour-frame" d="M37 42h156M37 357h156M33 46v303M197 46v303M40 49h150M40 351h150"/>
 <path class="glass-line" d="M48 55C48 117 68 155 109 197V210C68 252 48 287 48 347M182 55C182 117 162 155 121 197V210C162 252 182 287 182 347"/>
 <rect data-sand-top x="48" y="128" width="134" height="69" fill="url(#sand-grain)" clip-path="url(#top-bowl)"/>
 <rect data-sand-bottom x="48" y="276" width="134" height="71" fill="url(#sand-grain)" clip-path="url(#bottom-bowl)"/>
 <path data-sand-stream d="M115 203v77" stroke="var(--study-gold)" stroke-width="1.7" stroke-dasharray="1 4"/>
 <g fill="var(--study-gold)"><path d="m32 17 4 6-4 6-4-6Zm166 0 4 6-4 6-4-6ZM32 373l4 6-4 6-4-6Zm166 0 4 6-4 6-4-6Z"/></g>
</svg><div class="readout hour-readout"><h2 class="phase">Work</h2><p class="countdown" role="timer" aria-label="Time left">24:11</p><p class="next">Next · Break</p></div></div>'''
save('scribes-hourglass','The scribe’s hourglass',hour_css,hour_body)

ribbon_css='''
.ribbon-layout{min-height:570px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:65px 28px 58px}.ribbon-readout .phase{font-size:29px;margin-bottom:16px}.ribbon-readout .countdown{font-size:clamp(84px,21cqi,150px);letter-spacing:-.055em}.ribbon-art{width:100%;max-width:600px;margin:37px auto 29px}.ribbon-track{fill:var(--study-line);opacity:.13}.ribbon-fill{fill:var(--study-line)}.ribbon-fold{fill:var(--study-pale-gold)}.ribbon-keyline{stroke:var(--study-line);stroke-width:1;fill:none}.ribbon-bead{fill:var(--study-paper);stroke:var(--study-line);stroke-width:1.5}.ribbon-bead[data-lit="true"]{fill:var(--study-ink);stroke:var(--study-ink)}.ribbon-readout:before{content:'';display:block;width:32px;margin:0 auto 26px;border-top:2px solid var(--study-rubric)}@media(max-width:460px){.ribbon-layout{min-height:520px;padding:55px 12px}.ribbon-readout .phase{font-size:26px}.ribbon-readout .countdown{font-size:84px}.ribbon-art{margin-top:35px;margin-bottom:24px}}
'''
ribbon_body='''<div class="ribbon-layout"><div class="readout ribbon-readout"><h2 class="phase">Work</h2><p class="countdown" role="timer" aria-label="Time left">24:11</p></div><svg class="ribbon-art" viewBox="0 0 700 94" aria-hidden="true"><defs><clipPath id="ribbon-body"><path d="M100 25H600V63H100Z"/></clipPath><pattern id="ribbon-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--study-line)"/><path d="M-2 8 8-2M2 12 12 2" stroke="var(--study-paper)" stroke-width=".65" opacity=".32"/></pattern></defs><path class="ribbon-fold" d="M100 25 52 16 63 43 52 72 100 63Zm500 0 48-9-11 27 11 29-48-9Z"/><path class="ribbon-keyline" d="m100 25-48-9 11 27-11 29 48-9m500-38 48-9-11 27 11 29-48-9"/>
 <rect class="ribbon-track" x="100" y="25" width="500" height="38"/><rect data-ribbon x="100" y="25" width="258" height="38" fill="url(#ribbon-hatch)" clip-path="url(#ribbon-body)"/><path class="ribbon-keyline" d="M100 20H600M100 68H600M100 20v48M600 20v48"/>
 <g data-ribbon-head transform="translate(358 0)"><path d="M0 10v68" stroke="var(--study-ink)" stroke-width="2"/><path d="m0 4 5 6-5 6-5-6Z" fill="var(--study-ink)"/></g>
 <g><path class="ribbon-bead" data-at="0" d="m100 76 4 5-4 5-4-5Z"/><path class="ribbon-bead" data-at=".25" d="m225 76 4 5-4 5-4-5Z"/><path class="ribbon-bead" data-at=".5" d="m350 76 4 5-4 5-4-5Z"/><path class="ribbon-bead" data-at=".75" d="m475 76 4 5-4 5-4-5Z"/><path class="ribbon-bead" data-at="1" d="m600 76 4 5-4 5-4-5Z"/></g></svg><p class="next">Next · Break</p></div>'''
save('folio-ribbon','The folio ribbon',ribbon_css,ribbon_body)
print('Created three self-contained timer alternatives.')
