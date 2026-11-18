# WCAG contrast of the Espresso Leather palette against the sampled
# texture and the surfaces. Run: python3 tools/contrast.py

import json,sys
def lin(c):
    c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(rgb): r,g,b=rgb; return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    la,lb=sorted([L(a),L(b)],reverse=True); return (la+0.05)/(lb+0.05)
P=dict(
 tex_dark=(20,6,0), tex_mean=(40,25,18), tex_p99=(52,38,27), tex_p999=(59,44,36), tex_max=(78,63,56),
 background=(36,24,17), surface=(46,33,23), field=(27,19,13), raised=(58,42,29),
 foreground=(246,228,192), muted=(212,184,142), line=(178,140,88), primary=(234,190,112), accent=(218,166,88),
 rubric=(238,140,108), danger=(255,160,130), focus=(250,213,139),
 on_primary=(42,27,14), action_fill=(234,190,112), on_action=(42,27,14), action_paper=(46,33,23), action_ink=(246,228,192),
 danger_fill=(255,160,130), on_danger=(42,22,14),
)
pairs=[
 # text on texture (body text on the bare page: headings, trail, empty state)
 *[(t,g,4.5) for t in ['foreground','muted','primary','accent','rubric','danger'] for g in ['tex_dark','tex_mean','tex_p999','tex_max']],
 *[(t,g,4.5) for t in ['foreground','muted','primary','accent','rubric','danger'] for g in ['surface','field','background','raised']],
 *[('line',g,3) for g in ['tex_dark','tex_mean','tex_p999','tex_max','surface','field']],
 *[('focus',g,3) for g in ['tex_dark','tex_max','surface','field','action_fill']],
 ('on_action','action_fill',4.5),('action_ink','action_paper',4.5),('on_danger','danger_fill',4.5),('on_primary','primary',4.5),
 ('action_fill','tex_max',3),('action_fill','surface',3),('danger_fill','surface',3),
]
bad=0
for a,b,need in pairs:
    v=cr(P[a],P[b]); ok=v>=need; bad+=not ok
    print(f"{a:12} on {b:12} {v:5.2f} need {need} {'ok' if ok else 'FAIL'}")
print("fails",bad)
