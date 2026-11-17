from pathlib import Path
import base64
import json

root = Path.cwd()
out = root / 'outputs/quick-note-mockups'
fonts = ''
for name, file in [('PanelSans', 'nunito/nunito-latin-wght-normal.woff2'), ('PanelSerif', 'source-serif-4/source-serif-4-latin-wght-normal.woff2')]:
    data = base64.b64encode((root / 'apps/web/src/themes/fonts' / file).read_bytes()).decode()
    fonts += f'@font-face{{font-family:{name};src:url(data:font/woff2;base64,{data}) format("woff2");font-weight:200 900;font-display:swap;}}'

palette = '''
:root { --background:rgb(244 236 216); --foreground:rgb(53 33 17); --muted-foreground:rgb(103 72 40); --card:rgb(250 229 185); --secondary:rgb(255 243 215); --border:rgb(134 96 50); --primary:rgb(128 80 20); --primary-foreground:rgb(255 244 220); --ring:rgb(115 65 18); --radius:12px; }
'''
css = '''
@layer mockup {
* { box-sizing:border-box; }
[hidden] { display:none !important; }
html,body { margin:0; padding:0; }
:root { --pb-paper:var(--background,Canvas); --pb-ink:var(--foreground,CanvasText); --pb-muted:var(--muted-foreground,GrayText); --pb-surface:var(--card,Canvas); --pb-field:var(--secondary,Canvas); --pb-rule:var(--border,GrayText); --pb-brass:var(--primary,CanvasText); --pb-on-brass:var(--primary-foreground,Canvas); --pb-focus:var(--ring,Highlight); }
body { color:var(--pb-ink); font:16px/1.4 PanelSans,system-ui,sans-serif; }
button,input,select,textarea { font:inherit; }
button,a,select { -webkit-tap-highlight-color:transparent; }
button { cursor:pointer; }
a { color:inherit; }
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:2px dashed var(--pb-focus); outline-offset:3px; }
svg { width:20px; height:20px; stroke:currentColor; fill:none; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; }
.gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.option { min-width:0; }
.option-title { margin:0 0 6px; font:600 19px/1.3 PanelSerif,Georgia,serif; }
.description { margin:0 0 18px; font-size:13px; line-height:1.5; color:var(--pb-muted); min-height:60px; }
.site-panel { padding:0 16px 16px; background:var(--pb-surface); background-image:linear-gradient(110deg,transparent,color-mix(in srgb,var(--pb-brass) 5%,transparent)); border:1px solid var(--pb-rule); border-radius:var(--radius,12px); overflow:hidden; }
.site-panel-heading { display:flex; align-items:center; gap:16px; border-bottom:1px solid var(--pb-rule); margin:0 -16px 12px; }
.panel-toggle { display:grid; place-items:center; min-width:44px; min-height:52px; border:0; background:transparent; color:var(--pb-ink); }
.header-title { margin:0; font:600 20px/1.3 PanelSerif,Georgia,serif; }
nav,section { display:flex; flex-direction:column; }
.panel-link { display:flex; align-items:center; gap:8px; width:100%; min-height:44px; border:0; border-radius:2px; padding:8px; text-decoration:none; color:var(--pb-ink); background:transparent; text-align:left; }
a.panel-link:hover { background:var(--pb-field); text-decoration:underline; text-underline-offset:4px; }
ul { list-style:none; padding:0; margin:0; }
.panel-label { padding:8px 8px 4px; margin:0; font:400 12px/1.4 PanelSerif,Georgia,serif; letter-spacing:.04em; color:var(--pb-muted); }
.panel-rule { border:0; height:1px; margin:8px 4px; background:linear-gradient(to right,transparent,var(--pb-rule),transparent); }
.note-action { font:600 16px/1.4 PanelSerif,Georgia,serif; min-height:48px; padding:10px 12px; border:1px solid var(--pb-brass); border-radius:2px; color:var(--pb-ink); }
.note-action:hover { box-shadow:0 2px 5px color-mix(in srgb,var(--pb-ink) 18%,transparent); }
.note-action:active { box-shadow:inset 0 1px 2px color-mix(in srgb,var(--pb-ink) 20%,transparent); }
.brass .note-action { background:var(--pb-brass); color:var(--pb-on-brass); }
.paper .note-action { background:var(--pb-field); }
.capture-card { padding:12px; border:1px solid var(--pb-rule); border-left:3px solid var(--pb-brass); border-radius:2px; background:var(--pb-field); }
.capture-card .note-action { border:0; background:transparent; min-height:44px; padding:0; }
.capture-card p { font-size:12px; color:var(--pb-muted); margin:0 0 4px; line-height:1.5; }
.capture-card .mark { margin-left:auto; width:16px; }
.panel-modes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:36px 8px 0; }
.panel-mode { display:block; min-width:0; position:relative; padding:4px; border:1px solid transparent; border-radius:10px; }
.panel-mode:has(:checked) { border-color:var(--pb-brass); }
.panel-mode input { position:absolute; inset:0; opacity:0; width:100%; height:100%; cursor:pointer; margin:0; }
.panel-mode:focus-within { outline:2px dashed var(--pb-focus); outline-offset:2px; }
.theme-swatch { display:block; height:64px; border-radius:7px; background-size:cover; }
.single { max-width:288px; margin:0 auto; }
.mockup-dialog { width:min(420px,calc(100% - 32px)); border:1px solid var(--pb-rule); border-radius:var(--radius,12px); padding:24px; background:var(--pb-paper); color:var(--pb-ink); }
.mockup-dialog::backdrop { background:color-mix(in srgb,var(--pb-ink) 30%,transparent); }
.mockup-dialog h2 { font:600 24px PanelSerif,Georgia,serif; margin:0 0 8px; }
.mockup-dialog p { font-size:14px; color:var(--pb-muted); }
.mockup-dialog label { display:block; font-size:14px; margin-top:16px; }
.mockup-dialog select,.mockup-dialog textarea { width:100%; padding:10px; margin-top:6px; background:var(--pb-field); color:var(--pb-ink); border:1px solid var(--pb-rule); border-radius:6px; }
.mockup-dialog textarea { min-height:100px; resize:vertical; }
.dialog-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
.dialog-actions button { min-height:44px; padding:8px 12px; background:var(--pb-field); color:var(--pb-ink); border:1px solid var(--pb-rule); border-radius:2px; font-family:PanelSerif,Georgia,serif; }
.dialog-actions button[type=submit] { background:var(--pb-brass); color:var(--pb-on-brass); }
@media(max-width:600px) { .gallery { grid-template-columns:1fr; gap:28px; } .option { max-width:288px; width:100%; margin:auto; } .description { min-height:0; } }
}
'''
# Keep the real appearance textures, embedded so each HTML file is portable.
for key, file in [('ivory','ivory-vellum.webp'),('soot','soot-brass.webp'),('espresso','espresso-leather.webp')]:
    data = base64.b64encode((root / 'apps/web/public/textures' / file).read_bytes()).decode()
    css += f'@layer mockup {{ .swatch-{key} {{ background-image:url(data:image/webp;base64,{data}); }} }}'

pencil = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5M4 16l4 4"/></svg>'
plus = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
arrow = '<svg aria-hidden="true" class="mark" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
handle = '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m-3-9v2"/></svg>'
variants = [
    ('brass','1 · Brass action','Strongest emphasis. A filled Letterpress action stands apart from every navigation link.', f'<button class="panel-link note-action" type="button" data-note>{plus}Quick Note</button>'),
    ('paper','2 · Paper action','A quieter distinction. A fine frame and pencil make Quick Note read as an action.', f'<button class="panel-link note-action" type="button" data-note>{pencil}Quick Note</button>'),
    ('capture','3 · Capture card','A separate space for capturing a thought, with a short explanation of where it goes.', f'<div class="capture-card"><button class="panel-link note-action" type="button" data-note>{pencil}Quick Note{arrow}</button><p>Save a thought to a quest.</p></div>')
]

def panel(key, action):
    groups = ''
    for label, links in [('Places',[('Quests','/quests'),('Spellbook','/spellbook'),('Timer','/timer'),('Graveyard','/retirement')]),('You',[('Profile','/profile'),('Settings','/settings')])]:
        groups += f'<hr class="panel-rule"><p class="panel-label" id="{key}-{label}">{label}</p><ul aria-labelledby="{key}-{label}">' + ''.join(f'<li><a class="panel-link" href="{url}" data-navigation>{text}</a></li>' for text,url in links) + '</ul>'
    swatches = ''.join(f'<label class="panel-mode" title="{name}"><input type="radio" name="{key}-theme" value="{theme}" aria-label="{name}" '+ ('checked' if theme == 'ivory' else '') + f'><span aria-hidden="true" class="theme-swatch swatch-{theme}"></span></label>' for theme,name in [('ivory','Ivory Vellum'),('soot','Soot & Brass'),('espresso','Espresso Leather')])
    return f'<aside class="site-panel {key}" aria-label="Site panel"><div class="site-panel-heading"><button class="panel-toggle" type="button" aria-label="Close site panel" data-close-panel>{handle}</button><h2 class="header-title">Site panel</h2></div><nav aria-label="Site panel">{action}{groups}</nav><hr class="panel-rule"><section aria-labelledby="{key}-appearance"><h3 class="panel-label" id="{key}-appearance">Appearance</h3><p class="panel-label">Theme</p><div class="panel-modes">{swatches}</div></section><hr class="panel-rule"><a class="panel-link" href="/credits" data-navigation>Credits</a></aside>'

dialog = '''<dialog class="mockup-dialog" aria-labelledby="dialog-title"><form><h2 id="dialog-title">Quick Note</h2><p>Mockup only. Nothing is saved.</p><label>Quick Note for<select><option>Dailies</option><option>Plan the garden</option></select></label><label>Quick Note<textarea required maxlength="1000" placeholder="Write a thought…"></textarea></label><p role="status" id="note-status"></p><div class="dialog-actions"><button type="submit">Save Quick Note</button><button type="button" data-cancel>Close</button></div></form></dialog>'''
script = '''
const dialog = document.querySelector('.mockup-dialog');
document.querySelectorAll('[data-note]').forEach(button => button.addEventListener('click', () => { dialog.showModal(); }));
document.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); document.querySelector('#note-status').textContent = 'Preview complete. No Quick Note was saved.'; });
document.querySelectorAll('[data-navigation]').forEach(link => link.addEventListener('click', event => event.preventDefault()));
document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', () => { const panel = button.closest('.site-panel'); const content = [...panel.children].slice(1); const collapsed = button.getAttribute('aria-expanded') === 'false'; content.forEach(child => child.hidden = !collapsed); button.setAttribute('aria-expanded', String(collapsed)); let label = 'Open site panel'; if (collapsed) { label = 'Close site panel'; } button.setAttribute('aria-label', label); }));
const palettes = { ivory:['rgb(244 236 216)','rgb(53 33 17)','rgb(103 72 40)','rgb(250 229 185)','rgb(255 243 215)','rgb(134 96 50)','rgb(128 80 20)','rgb(255 244 220)'], soot:['rgb(33 23 26)','rgb(238 228 210)','rgb(199 187 169)','rgb(41 30 34)','rgb(41 36 38)','rgb(162 147 126)','rgb(205 179 124)','rgb(40 34 22)'], espresso:['rgb(36 27 19)','rgb(250 229 185)','rgb(209 178 132)','rgb(49 36 24)','rgb(30 23 16)','rgb(173 135 82)','rgb(237 190 106)','rgb(45 30 16)'] };
const tokens = ['--pb-paper','--pb-ink','--pb-muted','--pb-surface','--pb-field','--pb-rule','--pb-brass','--pb-on-brass'];
document.querySelectorAll('.panel-mode input').forEach(input => input.addEventListener('change', () => { const panel = input.closest('.site-panel'); tokens.forEach((token,i) => panel.style.setProperty(token,palettes[input.value][i])); panel.style.setProperty('--pb-focus',palettes[input.value][6]); }));
'''
# HTML mockups adapted from SitePanel, AccountLinks and QuickNote; links are inert.
def document(content, title, standalone=True):
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+ (palette if standalone else '') +fonts+css+'</style><body>'+content+dialog+'<script>'+script+'</script></body></html>'

for key,title,desc,action in variants:
    (out / f'{key}.html').write_text(document('<main class="single">'+panel(key,action)+'</main>',title))
gallery = '<main class="gallery">'+''.join(f'<article class="option"><h1 class="option-title">{title}</h1><p class="description">{desc}</p>{panel(key,action)}</article>' for key,title,desc,action in variants)+'</main>'
(out / 'index.html').write_text(document(gallery,'Quick Note · Three options'))
(out / 'inline.html').write_text(document(gallery,'Quick Note · Three options',False))
print(json.dumps({'files':[str(out/f'{key}.html') for key,*_ in variants], 'gallery':str(out/'index.html')}))
