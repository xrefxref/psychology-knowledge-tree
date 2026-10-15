# -*- coding: utf-8 -*-
"""暗黑极客风全站截图 + 基础体检"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8901"
PAGES = [
    ("index", "index.html"),
    ("test-suite", "test-suite.html"),
    ("holland", "holland-test.html"),
    ("book-notes", "book-notes.html"),
    ("note-n001", "notes/n001.html"),
    ("mind-game", "mind-game.html"),
    ("mind-city", "mind-city.html"),
    ("money-mind", "money-mind.html"),
    ("mbti", "mbti-test.html"),
    ("smart-illicit", "smart-illicit.html"),
    ("strengths", "strengths.html"),
    ("personal-bmc", "personal-bmc.html"),
]
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1280,"height":860})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    report = []
    for name, path in PAGES:
        errs.clear()
        pg.goto(BASE + "/" + path, wait_until="load")
        pg.wait_for_timeout(1600)
        bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
        dark = pg.evaluate("""() => {
            const c = document.elementFromPoint(640, 500);
            if (!c) return false;
            const s = getComputedStyle(c);
            const bgc = s.backgroundColor || 'rgba(0, 0, 0, 0)';
            const m = bgc.match(/\\d+/g) || [0,0,0];
            const lum = 0.299*m[0] + 0.587*m[1] + 0.114*m[2];
            return lum < 110;
        }""")
        ovf = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        report.append((name, dark, ovf, len(errs)))
        print(f"{'PASS' if dark else 'WARN'} | {name:14s} body={bg[:28]:28s} 暗底={dark} 溢出={ovf}px err={len(errs)}")
        pg.screenshot(path=f"audit/rc_{name}_desk.png")
        if errs:
            print("   errors:", "; ".join(errs[:2])[:150])
    # 移动端重点 3 页
    mctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, user_agent=UA)
    mp = mctx.new_page()
    for name, path in [("index","index.html"),("test-suite","test-suite.html"),("note-n001","notes/n001.html")]:
        mp.goto(BASE + "/" + path, wait_until="load")
        mp.wait_for_timeout(1400)
        ovf = mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print(f"MOBILE {name:14s} 溢出={ovf}px")
        mp.screenshot(path=f"audit/rc_{name}_mob.png")
    b.close()
