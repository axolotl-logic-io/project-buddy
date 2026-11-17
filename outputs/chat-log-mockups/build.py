from pathlib import Path

out = Path(__file__).resolve().parent
css = '''
:root { color-scheme: light dark; --pb-paper:var(--background,Canvas); --pb-ink:var(--foreground,CanvasText); --pb-muted:color-mix(in srgb,var(--pb-ink) 70%,var(--pb-paper)); --pb-line:color-mix(in srgb,var(--pb-ink) 24%,var(--pb-paper)); --pb-accent:var(--primary,CanvasText); --pb-field:var(--card,Canvas); --pb-soft:color-mix(in srgb,var(--pb-accent) 7%,var(--pb-paper)); --pb-serif:Georgia,'Times New Roman',serif; --pb-sans:var(--font-sans,system-ui,sans-serif); }
* { box-sizing:border-box; }
html,body { margin:0; padding:0; background:transparent; }
body { color:var(--pb-ink); font-family:var(--pb-sans); }
button,textarea { font:inherit; }
button { cursor:pointer; }
button:focus-visible,textarea:focus-visible { outline:2px solid var(--pb-accent); outline-offset:3px; }
[hidden] { display:none !important; }
.variants { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 16px; }
.variants button { padding:10px 14px; min-height:44px; border:1px solid var(--pb-line); border-radius:6px; color:var(--pb-ink); background:var(--pb-paper); }
.variants button[aria-selected=true] { background:var(--pb-accent); color:var(--primary-foreground,Canvas); border-color:var(--pb-accent); }
.design-note { margin:0 0 16px; color:var(--pb-muted); font-size:13px; line-height:1.6; max-width:65ch; }
.product { background:var(--pb-paper); padding:20px 24px 16px; border-radius:var(--radius,8px); min-width:0; }
.product-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--pb-line); }
.breadcrumb { font-size:12px; color:var(--pb-muted); margin:0 0 7px; }
h1 { margin:0; font:500 25px/1.2 var(--pb-serif); }
.construct { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--pb-muted); }
.avatar { display:inline-grid; place-items:center; width:25px; height:25px; flex-shrink:0; border:1px solid var(--pb-line); border-radius:50%; font:italic 17px var(--pb-serif); color:var(--pb-accent); background:var(--pb-paper); }
.log { list-style:none; padding:0; margin:22px 0 24px; }
.turn { min-width:0; margin:0; }
.speaker { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:0 0 7px; font:600 13px/1.5 var(--pb-sans); color:var(--pb-accent); }
.reply-to { font-size:11px; font-weight:400; color:var(--pb-muted); }
.prose { font:16px/1.65 var(--pb-serif); overflow-wrap:anywhere; }
.prose p { margin:0; }
.prose p+p { margin-top:8px; }
.prose ul { padding-left:20px; margin:8px 0 0; }
.change { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:12px; padding:8px 0 0; border-top:1px solid var(--pb-line); color:var(--pb-muted); font:12px/1.5 var(--pb-sans); }
.change strong { color:var(--pb-ink); font-weight:500; }
.pending { display:flex; align-items:center; gap:9px; color:var(--pb-muted); font:14px/1.6 var(--pb-sans); }
.dots { letter-spacing:2px; font-weight:700; }
.composer { border-top:1px solid var(--pb-line); padding-top:14px; }
.composer label { display:block; font-size:12px; margin-bottom:8px; color:var(--pb-muted); }
.draft { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--pb-line); border-radius:6px; background:var(--pb-field); }
.draft textarea { resize:none; min-width:0; width:100%; border:0; background:transparent; color:var(--pb-ink); line-height:1.5; font-size:16px; }
.draft button { border:0; border-radius:4px; background:var(--pb-soft); color:var(--pb-muted); padding:10px; cursor:default; font-size:12px; }
.hint { margin:8px 0 0; color:var(--pb-muted); font:11px/1.5 var(--pb-sans); }
/* Each card contains the human message AND its reply. */
.cards .turn { border:1px solid var(--pb-line); border-radius:8px; overflow:hidden; margin-bottom:20px; }
.cards .human { background:var(--pb-soft); padding:14px 18px; }
.cards .reply { padding:14px 18px 18px; }
/* A rail ends with its reply; open space marks the next exchange. */
.rail .turn { position:relative; border-left:2px solid var(--pb-line); padding-left:22px; margin:0 0 30px 5px; }
.rail .human:before { content:''; width:10px; height:10px; border:2px solid var(--pb-accent); border-radius:50%; position:absolute; left:-6px; top:5px; background:var(--pb-paper); }
.rail .human { padding-bottom:13px; }
.rail .reply { padding-top:0; }
.rail .reply .speaker:before { content:'↳'; font-size:18px; font-weight:400; }
.rail .reply .avatar { display:none; }
/* One row is one exchange; read left to right, then move down. */
.columns .turn { display:grid; grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr); gap:22px; padding:20px 0; border-bottom:1px solid var(--pb-line); }
.columns .turn:first-child { padding-top:0; }
.columns .turn:last-child { border-bottom:0; padding-bottom:0; }
.columns .human { border-left:3px solid var(--pb-accent); padding-left:12px; }
.columns .reply { padding-left:18px; border-left:1px solid var(--pb-line); }
.columns .prose { font-size:15px; }
.columns .reply-to { flex-basis:100%; }
.columns .reply .speaker { gap:5px 8px; }
@media(max-width:520px) {
 .product { padding:16px 12px; }
 .product-header { align-items:flex-start; gap:8px; }
 .construct { font-size:12px; }
 h1 { font-size:22px; }
 .cards .human,.cards .reply { padding:12px; }
 .columns .turn { display:block; padding:22px 0; }
 .columns .reply { border-left:1px solid var(--pb-line); margin:12px 0 0 14px; padding-left:15px; }
 .columns .reply-to { flex-basis:auto; }
 .prose,.columns .prose { font-size:16px; }
 .variants { gap:6px; }
 .variants button { padding:9px 10px; font-size:12px; }
}
'''

messages = [
 ('You', 'I have 20 minutes. Help me make a start on the garden.',
  '<p>Keep today small: clear one planter and make it ready for seeds. Leave the rest for another day.</p><ul><li>Gather a bag and your gloves.</li><li>Clear the planter nearest the door.</li></ul>', 'reply'),
 ('You', 'Make clearing that planter my next task.',
  '<p>Added <strong>Clear the planter nearest the door</strong> to Tasks. Start there when you’re ready.</p><div class="change"><span aria-hidden="true">✓</span><strong>Tasks updated</strong><span>· 1 task added</span></div>', 'reply'),
 ('You', 'What should I do if I run out of time?', '', 'pending')
]

def turns():
    result=[]
    for author, prompt, content, state in messages:
        body=content
        if state=='pending':
            body='<p class="pending"><span class="dots" aria-hidden="true">···</span>Vellum is thinking…</p>'
        result.append(f'''<li class="turn" aria-label="{author}’s message and Vellum’s reply"><div class="human"><p class="speaker">{author}</p><div class="prose"><p>{prompt}</p></div></div><div class="reply"><p class="speaker"><span class="avatar" aria-hidden="true">V</span>Vellum<span class="reply-to">Reply to {author.lower()}</span></p><div class="prose">{body}</div></div></li>''')
    return '\n'.join(result)

def product(kind):
    return f'''<div class="product {kind}"><header class="product-header"><div><p class="breadcrumb">Quests / Garden</p><h1>Garden</h1></div><div class="construct"><span class="avatar" aria-hidden="true">V</span>Vellum</div></header><ol class="log" aria-label="Conversation">{turns()}</ol><div class="composer"><label for="draft-{kind}">Message</label><div class="draft"><textarea id="draft-{kind}" rows="1" placeholder="Write a message…" aria-label="Preview message draft"></textarea><button type="button" disabled>Send</button></div><p class="hint">Mockup · Sending is unavailable</p></div></div>'''

variants=[('cards','Shared card','One boundary contains a human message and its reply. Space separates each exchange.'),('rail','Connecting rail','A continuous line connects each message to its reply, then stops before the next exchange.'),('columns','Paired columns','Each row pairs the message on the left with its reply on the right. On phones, the reply nests below.')]

def document(title,body,script=''):
    return f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style></head><body>{body}<script>{script}</script></body></html>\n'

for kind,name,note in variants:
    (out/f'{kind}.html').write_text(document(name,product(kind)))

tabs=[]
panels=[]
for i,(kind,name,note) in enumerate(variants):
    selected=str(i==0).lower()
    hidden=' hidden' if i else ''
    tabs.append(f'<button id="tab-{kind}" type="button" role="tab" aria-selected="{selected}" aria-controls="panel-{kind}">{name}</button>')
    panels.append(f'<section id="panel-{kind}" role="tabpanel" aria-labelledby="tab-{kind}"{hidden}><p class="design-note">{note}</p>{product(kind)}</section>')
script='''
const tabs=Array.from(document.querySelectorAll('[role="tab"]'));
function activate(tab) {
  for (const item of tabs) {
    const selected=item===tab;
    item.setAttribute('aria-selected',String(selected));
    document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;
  }
}
for (const tab of tabs) {
  tab.addEventListener('click',()=>activate(tab));
  tab.addEventListener('keydown',event=>{
    let index=tabs.indexOf(tab);
    if(event.key==='ArrowRight') index=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft') index=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home') index=0;
    else if(event.key==='End') index=tabs.length-1;
    else return;
    event.preventDefault(); tabs[index].focus(); activate(tabs[index]);
  });
}
'''
(out/'index.html').write_text(document('Chat log alternatives','<main id="chat-alternatives"><nav class="variants" role="tablist" aria-label="Chat log alternatives">'+''.join(tabs)+'</nav>'+''.join(panels)+'</main>',script))
print('Created three standalone mockups and index.html')
