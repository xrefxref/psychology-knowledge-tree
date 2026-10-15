# -*- coding: utf-8 -*-
"""Smart & Illicit 创业者基因测评 验收脚本"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8901"
results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL") + f" | {name}" + (f" | {detail}" if detail and not ok else ""))

def answer_all(page, pattern):
    """pattern: list of 'a'/'b' for 10 questions"""
    page.goto(BASE + "/smart-illicit.html", wait_until="load")
    page.wait_for_selector("#q-opts .opt", timeout=5000)
    for i, v in enumerate(pattern):
        page.click(f'.opt[data-v="{v}"]')
        page.wait_for_timeout(450)
    page.wait_for_selector("#result:not([hidden])", timeout=5000)

def get_state(page):
    return page.evaluate("""() => ({
        title: document.getElementById('r-title').textContent.trim(),
        s: document.getElementById('r-s').textContent,
        i: document.getElementById('r-i').textContent,
        concl: document.getElementById('r-concl').textContent.trim(),
        tags: document.getElementById('r-tags').children.length,
        hit: (document.querySelector('.mx.hit')||{}).id || null
    })""")

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38")
    page = ctx.new_page()

    # 1. 静态检查
    page.goto(BASE + "/smart-illicit.html", wait_until="load")
    check("页面加载 200 + 理论区", page.locator("#theory-sec").is_visible())
    check("OG 标签存在", page.evaluate("document.head.innerHTML.includes('og:title') && document.head.innerHTML.includes('og:image')"))
    check("题目加载", page.locator("#q-text").inner_text().strip() not in ("", "加载中…"))

    # 2. 全 A → LS_LI
    answer_all(page, ["a"]*10)
    st = get_state(page)
    check("全A → 0/0 分", st["s"]=="0" and st["i"]=="0", json.dumps(st, ensure_ascii=False))
    check("全A → 命中 LS_LI 象限", st["hit"]=="mx-ls-li", st["hit"])
    check("全A → 有称号与结论", len(st["title"])>1 and len(st["concl"])>5)

    # 3. 重新测试 → 全 B → HS_HI
    page.click("#btn-retry")
    page.wait_for_selector("#quiz-sec", state="visible", timeout=5000)
    answer_all(page, ["b"]*10)
    st = get_state(page)
    check("重测生效 + 全B → 10/10", st["s"]=="10" and st["i"]=="10", json.dumps(st, ensure_ascii=False))
    check("全B → 命中 HS_HI 象限", st["hit"]=="mx-hs-hi", st["hit"])

    # 4. 混合 HS_LI: Q1-5 B,B,B,A,A (S=6); Q6-10 B,A,A,A,A (I=2)
    answer_all(page, ["b","b","b","a","a","b","a","a","a","a"])
    st = get_state(page)
    check("混合1 → 6/2", st["s"]=="6" and st["i"]=="2", json.dumps(st, ensure_ascii=False))
    check("混合1 → 命中 HS_LI", st["hit"]=="mx-hs-li", st["hit"])

    # 5. 混合 LS_HI: Q1-5 B,B,A,A,A (S=4); Q6-10 B,B,B,B,A (I=8)
    answer_all(page, ["b","b","a","a","a","b","b","b","b","a"])
    st = get_state(page)
    check("混合2 → 4/8", st["s"]=="4" and st["i"]=="8", json.dumps(st, ensure_ascii=False))
    check("混合2 → 命中 LS_HI", st["hit"]=="mx-ls-hi", st["hit"])
    check("标签气泡 ≥1", st["tags"]>=1)

    # 6. 上一题回退
    page.click("#btn-retry"); page.wait_for_timeout(400)
    page.wait_for_selector("#q-opts .opt", timeout=5000)
    for _ in range(3): page.click('.opt[data-v="b"]'); page.wait_for_timeout(400)
    page.click("#q-prev"); page.wait_for_timeout(400)
    page.click("#q-prev"); page.wait_for_timeout(400)
    cnt = page.locator("#q-count").inner_text()
    check("上一题回退（答3题后回退2次→第2题）", cnt.strip()=="2", cnt)

    # 7. 分享卡片 canvas
    answer_all(page, ["b"]*5 + ["a"]*5)  # S=10, I=0 → HS_LI
    st = get_state(page)
    page.click("#btn-share")
    page.wait_for_timeout(600)
    src = page.evaluate("document.getElementById('share-img').src || ''")
    check("分享卡片生成(canvas→dataURL)", src.startswith("data:image"), src[:40])
    check("分享区可见", page.locator("#share-wrap").is_visible())

    # 8. 横向溢出检查
    ovf = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("390px 无横向溢出", ovf <= 1, f"overflow={ovf}px")

    # 9. 截图留档
    page.goto(BASE + "/smart-illicit.html"); page.wait_for_timeout(500)
    page.screenshot(path="audit/si_home.png", full_page=False)
    answer_all(page, ["b"]*10)
    page.screenshot(path="audit/si_result.png", full_page=True)

    # 10. index / test-suite 挂载检查
    page.goto(BASE + "/index.html", wait_until="load")
    check("index 导航含创业者基因", page.locator('nav a[href="smart-illicit.html"]').count() >= 1)
    check("index 含创业者基因卡片", page.locator('.card a[href="smart-illicit.html"]').count() >= 1)
    check("index 测试集卡片 9 站", "9 站" in page.content())
    page.goto(BASE + "/test-suite.html", wait_until="load")
    check("test-suite 含第 9 站链接", page.locator('a.go[href="smart-illicit.html"]').count() >= 1)

    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n=== {len(results)-len(fails)}/{len(results)} passed ===")
sys.exit(1 if fails else 0)
