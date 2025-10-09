from playwright.sync_api import sync_playwright
import json

BOARD_URL = "https://www.pinterest.com/lawsons415/surrealism/"

def extract_best_src(img_el):
    srcset = img_el.get_attribute("srcset") or ""
    if srcset:
        # pick the highest-res URL (last in the srcset list)
        urls = [part.strip().split(" ")[0] for part in srcset.split(",")]
        return urls[-1]
    return img_el.get_attribute("src")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 2400})
        page.goto(BOARD_URL, wait_until="domcontentloaded")

        # Try to dismiss cookie or sign-in prompts if they appear
        for text in ["Accept", "I agree", "Allow all", "Not now", "Close"]:
            try:
                page.locator(f"button:has-text('{text}')").first.click(timeout=1500)
            except:
                pass

        seen, urls = set(), []

        def collect_from_dom():
            imgs = page.locator("img.hCL[src], img.hCL[srcset]")
            n = imgs.count()
            added = 0
            for i in range(n):
                u = extract_best_src(imgs.nth(i))
                if u and u not in seen:
                    seen.add(u)
                    urls.append(u)
                    # live print each new image url as soon as we see it
                    print(u, flush=True)
                    added += 1
            return added

        # Incremental collection while scrolling, to avoid virtualized DOM losses
        no_new_rounds = 0
        last_height = 0
        max_rounds = 80  # safety cap
        for _ in range(max_rounds):
            added = collect_from_dom()

            # Scroll to bottom
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            try:
                page.wait_for_load_state("networkidle", timeout=2500)
            except:
                pass
            page.wait_for_timeout(800)

            # Check height growth and new items
            height = page.evaluate("document.body.scrollHeight")
            if added == 0 and height == last_height:
                no_new_rounds += 1
            else:
                no_new_rounds = 0
            last_height = height

            if no_new_rounds >= 5:
                break

        # Final sweep
        collect_from_dom()

        print(f"Collected {len(urls)} image URLs")
        for u in urls:
            print(u)

        with open("pinterest_surrealism_urls.json", "w") as f:
            json.dump(urls, f, indent=2)

        browser.close()

if __name__ == "__main__":
    main()