# -*- coding: utf-8 -*-
"""暗黑对齐：capsule-widget 弹层 + site-nav 配色"""
import io

p = 'capsule-widget.js'
s = io.open(p, encoding='utf-8').read()
rep = [
  (".cw-modal{width:100%;max-width:340px;background:linear-gradient(180deg,#fffdf6,#f7f0e0);",
   ".cw-modal{width:100%;max-width:340px;background:linear-gradient(180deg,#151823,#10121b);"),
  ("color:#3a3226;", "color:#f2f4f8;"),
  (".cw-quota{text-align:center;font-size:11px;color:#8a7f6d;letter-spacing:2px;margin-bottom:14px;}",
   ".cw-quota{text-align:center;font-size:11px;color:#8a94a6;letter-spacing:2px;margin-bottom:14px;}"),
  (".cw-quota b{color:#b3432b;}", ".cw-quota b{color:#ffb347;}"),
  ("linear-gradient(180deg,#fffdf6,#f9f3e4);", "linear-gradient(180deg,#12141d,#10121b);"),
  ("border:1px solid #e6dcc4;box-shadow:0 10px 26px rgba(58,50,38,.12);}",
   "border:1px solid #232634;box-shadow:0 10px 26px rgba(0,0,0,.5);}"),
  (".cw-result .cw-label{font-size:10px;letter-spacing:5px;color:#b98a2f;}",
   ".cw-result .cw-label{font-size:10px;letter-spacing:5px;color:#ffb347;}"),
  (".cw-result .cw-seal{width:30px;height:2px;background:#b3432b;margin:10px auto 14px;}",
   ".cw-result .cw-seal{width:30px;height:2px;background:linear-gradient(90deg,#7c5cff,#ff4d6d,#ffb347);margin:10px auto 14px;}"),
  (".cw-copy,.cw-full{background:transparent;color:#8a7f6d;", ".cw-copy,.cw-full{background:transparent;color:#8a94a6;"),
  ("border:1px solid #cfc4ac;}", "border:1px solid #2a3040;}"),
  (".cw-close{position:absolute;top:10px;right:12px;border:none;background:none;font-size:20px;color:#8a7f6d;",
   ".cw-close{position:absolute;top:10px;right:12px;border:none;background:none;font-size:20px;color:#8a94a6;"),
  (".cw-foot{text-align:center;font-size:10px;color:#8a7f6d;", ".cw-foot{text-align:center;font-size:10px;color:#697080;"),
  (".cw-foot a{color:#b3432b;", ".cw-foot a{color:#ffb347;"),
  ("background:rgba(58,50,38,.92);color:#f7ecd8;font-size:12px;", "background:rgba(18,20,29,.95);color:#f2f4f8;font-size:12px;"),
]
n = 0
for a, b in rep:
    if a in s:
        s = s.replace(a, b); n += 1
    else:
        print('MISS capsule:', a[:60])
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('capsule replaced:', n, '/', len(rep))

p = 'site-nav.js'
s = io.open(p, encoding='utf-8').read()
rep2 = [
  ("background:rgba(15,23,42,.9);", "background:rgba(10,11,16,.88);"),
  ("border-bottom:1px solid #1e293b;z-index:99970;", "border-bottom:1px solid #1c202e;z-index:99970;"),
  ("background:rgba(15,23,42,.97);border:1px solid #1e293b;border-radius:10px;padding:8px 0;",
   "background:rgba(13,14,21,.98);border:1px solid #232634;border-radius:10px;padding:8px 0;"),
  ("background:rgba(15,23,42,.97);", "background:rgba(13,14,21,.98);"),
  ("border-bottom:1px solid #1e293b;}", "border-bottom:1px solid #1c202e;}"),
]
n = 0
for a, b in rep2:
    if a in s:
        s = s.replace(a, b); n += 1
    else:
        print('MISS nav:', a[:60])
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('site-nav replaced:', n, '/', len(rep2))
