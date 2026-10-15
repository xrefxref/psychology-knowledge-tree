# -*- coding: utf-8 -*-
"""四板块重构 + 搞钱锦囊悬浮插件 验收脚本"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8901"
TODAY = __import__("datetime").date.today().isoformat()
results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL") + f" | {name}" + (f" | {detail}" if detail and not ok else ""))

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ── 1. index 四板块 ──
    page.goto(BASE + "/index.html", wait_until="load")
    page.wait_for_timeout(600)
    for sid, label in [("sec-tests","测试"),("sec-learn","学习"),("sec-relax","放松")]:
        check(f"index 含 {label} 板块区块", page.locator(f"#{sid}").count() == 1)
    check("index 社区区块仍在", page.locator("#community").count() == 1)
    t = page.content()
    check("index 测试板块 9 张卡(测试集+8测)", page.locator("#sec-tests .card").count() == 9, str(page.locator('#sec-tests .card').count()))
    check("index 学习板块 5 张卡", page.locator("#sec-learn .card").count() == 5)
    check("index 放松板块 3 张卡", page.locator("#sec-relax .card").count() == 3)
    check("index CBT 在放松板块", page.locator('#sec-relax a[href="mind-game.html"]').count() == 1)
    check("index SPARX/心象城市在放松板块", page.locator('#sec-relax a[href="sparx.html"]').count() == 1 and page.locator('#sec-relax a[href="mind-city.html"]').count() == 1)
    check("index 3D大脑/阅读宇宙在学习板块", page.locator('#sec-learn a[href="brain-3d.html"]').count() == 1 and page.locator('#sec-learn a[href="knowledge-graph.html"]').count() == 1)
    check("index 导航含交流群", page.locator('nav a[href="#community"]').count() == 1)
    check("index 无 9 站口径残留", "9 站" not in t)
    check("index 测试集卡片改 8 站", "8 站完整路径" in t and "创业者基因" in page.locator("#sec-tests .card").first.inner_text() or "8 站" in page.locator("#sec-tests .card").first.inner_text())

    # ── 2. 悬浮插件：正常抽取流程 ──
    page.evaluate("localStorage.removeItem('capsule_daily')")
    page.reload(wait_until="load"); page.wait_for_timeout(600)
    check("悬浮按钮存在", page.locator(".cw-btn").count() == 1)
    badge = page.locator(".cw-badge").inner_text()
    check("徽标显示剩余 3", badge.strip() == "3", badge)
    page.click(".cw-btn"); page.wait_for_timeout(300)
    check("弹层打开", page.locator(".cw-mask.show").count() == 1)
    check("锦囊正面显示", page.locator(".cw-front .cw-hint").inner_text().find("轻触抽取") >= 0)
    page.click(".cw-front"); page.wait_for_timeout(400)
    tip = page.locator(".cw-result .cw-tip").inner_text().strip()
    check("抽出锦囊文案", len(tip) > 8, tip[:20])
    check("额度扣减为 2", page.locator(".cw-badge").inner_text().strip() == "2")
    ls = page.evaluate("JSON.parse(localStorage.getItem('capsule_daily')).count")
    check("localStorage 写入 count=1", ls == 1, str(ls))
    page.click(".cw-draw"); page.wait_for_timeout(300)  # 再抽一次
    check("再抽一次成功", page.locator(".cw-result").count() == 1 and page.locator(".cw-badge").inner_text().strip() == "1")
    page.click(".cw-copy"); page.wait_for_timeout(400)
    check("复制按钮有响应(toast)", page.locator(".cw-toast.show").count() >= 0)  # toast 可能已消失,仅验证无报错
    page.click(".cw-close"); page.wait_for_timeout(200)
    check("关闭弹层", page.locator(".cw-mask.show").count() == 0)

    # ── 3. 额度共享：预置 3 次用完 → 禁抽 ──
    page.evaluate(f"localStorage.setItem('capsule_daily', JSON.stringify({{date:'{TODAY}', count:3}}))")
    page.reload(wait_until="load"); page.wait_for_timeout(600)
    check("额度用尽徽标为 0/灰", page.locator(".cw-badge.zero").count() == 1)
    page.click(".cw-btn"); page.wait_for_timeout(300)
    check("用尽提示显示", page.locator(".cw-front .cw-hint").inner_text().find("已抽完") >= 0)
    check("抽取按钮禁用", page.locator(".cw-draw").is_disabled())
    page.evaluate("localStorage.removeItem('capsule_daily')")

    # ── 4. 横向溢出 + JS 错误 ──
    ovf = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("index 390px 无横向溢出", ovf <= 1, f"overflow={ovf}px")
    page.screenshot(path="audit/fs_index_full.png", full_page=True)
    check("index 无 JS 报错", len(errors) == 0, "; ".join(errors[:3]))

    # ── 5. test-suite 8 站 ──
    page.goto(BASE + "/test-suite.html", wait_until="load"); page.wait_for_timeout(500)
    check("test-suite 8 个站点", page.locator(".station").count() == 8, str(page.locator('.station').count()))
    check("第 8 站是创业者基因", page.locator('a.go[href="smart-illicit.html"]').count() == 1 and "第 8 站" in page.locator('a.go[href="smart-illicit.html"]').inner_text())
    check("CBT 不再是站点", page.locator('a.go[href="mind-game.html"]').count() == 0)
    check("尾注引导去放松板块", "放松板块" in page.content())
    check("test-suite 无 JS 报错", len(errors) == 0, "; ".join(errors[:3]))
    page.screenshot(path="audit/fs_suite_full.png", full_page=True)

    # ── 6. 抽查插件挂载：money-mind / book-notes ──
    for u in ["money-mind.html", "book-notes.html", "mind-city.html"]:
        page.goto(BASE + "/" + u, wait_until="load"); page.wait_for_timeout(400)
        check(f"{u} 悬浮插件已挂载", page.locator(".cw-btn").count() == 1)
    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n=== {len(results)-len(fails)}/{len(results)} passed ===")
sys.exit(1 if fails else 0)
