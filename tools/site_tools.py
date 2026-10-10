from __future__ import annotations

import argparse
import json
import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PAGE = "concepts/concept-1/v1.2/index.html"
DEFAULT_REPORT_DIR = PROJECT_ROOT.parent / "site-audit"
VIEWPORTS = [
    ("desktop", 1440, 900),
    ("tablet", 768, 1024),
    ("mobile", 390, 844),
    ("small_mobile", 320, 740),
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass


def resolve_page(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    path = path.resolve()
    if not path.exists():
        raise FileNotFoundError(f"Page or directory not found: {path}")
    return path


def make_server(directory: Path, port: int = 0) -> ThreadingHTTPServer:
    handler = partial(QuietHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    server.daemon_threads = True
    return server


def run_preview(page_arg: str, port: int) -> int:
    target = resolve_page(page_arg)
    if target.is_dir():
        directory, path_part = target, "/"
    else:
        directory, path_part = target.parent, "/" + target.name

    try:
        server = make_server(directory, port)
    except OSError as exc:
        print(f"Could not start local preview server on port {port}: {exc}", file=sys.stderr)
        return 2

    url = f"http://127.0.0.1:{server.server_port}{path_part}"
    print(f"Project: {target}", flush=True)
    print(f"Preview: {url}", flush=True)
    print("Press Ctrl+C in this terminal to stop the server.", flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPreview server stopped.", flush=True)
    finally:
        server.server_close()
    return 0


def run_audit(page_arg: str, out_arg: str) -> int:
    page_file = resolve_page(page_arg)
    if page_file.is_dir():
        page_file = page_file / "index.html"
    if not page_file.is_file():
        print(f"HTML file not found: {page_file}", file=sys.stderr)
        return 2

    out_dir = Path(out_arg)
    if not out_dir.is_absolute():
        out_dir = (PROJECT_ROOT / out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    report: dict[str, Any] = {
        "page": str(page_file),
        "screenshots": [],
        "viewports": [],
        "console_errors": [],
        "page_errors": [],
        "failed_requests": [],
    }
    server = make_server(page_file.parent)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    page_url = f"http://127.0.0.1:{server.server_port}/{page_file.name}"

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for label, width, height in VIEWPORTS:
                page = browser.new_page(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                )
                page.on(
                    "console",
                    lambda message: report["console_errors"].append(message.text)
                    if message.type == "error" else None,
                )
                page.on(
                    "pageerror",
                    lambda error: report["page_errors"].append(str(error)),
                )
                page.on(
                    "requestfailed",
                    lambda request: report["failed_requests"].append(
                        {"url": request.url, "failure": request.failure}
                    ),
                )
                page.goto(page_url, wait_until="load", timeout=30000)
                page.evaluate("document.fonts.ready")
                screenshot = out_dir / f"concept-v1.2-{label}.png"
                page.screenshot(path=str(screenshot), full_page=True)

                details = page.evaluate("""() => {
                    const anchors = [...document.querySelectorAll('a[href^="#"]')]
                      .map(a => a.getAttribute('href').slice(1))
                      .filter(Boolean);
                    const images = [...document.images].map(img => ({
                      src: img.currentSrc || img.src,
                      loaded: img.complete && img.naturalWidth > 0
                    }));
                    const smallText = [...document.querySelectorAll('body *')]
                      .filter(el => el.children.length === 0)
                      .map(el => ({
                        tag: el.tagName.toLowerCase(),
                        text: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 90),
                        fontSize: parseFloat(getComputedStyle(el).fontSize)
                      }))
                      .filter(el => el.text && el.fontSize < 12)
                      .slice(0, 40);
                    return {
                      title: document.title,
                      viewport: window.innerWidth,
                      documentWidth: document.documentElement.scrollWidth,
                      bodyWidth: document.body.scrollWidth,
                      pageHeight: document.documentElement.scrollHeight,
                      h1: document.querySelector('h1')?.innerText || null,
                      linkCount: document.querySelectorAll('a').length,
                      brokenAnchors: [...new Set(anchors)].filter(id => !document.getElementById(id)),
                      brokenImages: images.filter(img => !img.loaded),
                      smallTextSamples: smallText
                    };
                }""")
                details["label"] = label
                details["horizontal_overflow"] = (
                    details["documentWidth"] > width or details["bodyWidth"] > width
                )
                details["screenshot"] = str(screenshot)
                report["screenshots"].append(str(screenshot))
                report["viewports"].append(details)
                page.close()
            browser.close()
    except (PlaywrightError, OSError) as exc:
        report["fatal_error"] = str(exc)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    report_path = out_dir / "browser-smoke-test.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"REPORT={report_path}")
    print(f"SCREENSHOTS={out_dir}")
    for view in report["viewports"]:
        status = "FAIL" if view["horizontal_overflow"] or view["brokenAnchors"] or view["brokenImages"] else "OK"
        print(
            f"{status:4} {view['label']:12} viewport={view['viewport']} "
            f"document={view['documentWidth']} height={view['pageHeight']} "
            f"broken_anchors={len(view['brokenAnchors'])} broken_images={len(view['brokenImages'])}"
        )
    print(
        f"Browser console errors: {len(report['console_errors'])}; "
        f"page errors: {len(report['page_errors'])}; "
        f"failed requests: {len(report['failed_requests'])}"
    )

    problems = (
        report.get("fatal_error")
        or report["console_errors"]
        or report["page_errors"]
        or any(
            v["horizontal_overflow"] or v["brokenAnchors"] or v["brokenImages"]
            for v in report["viewports"]
        )
    )
    if report.get("fatal_error"):
        print(f"FATAL: {report['fatal_error']}", file=sys.stderr)
    return 1 if problems else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Open a local site preview or run a responsive Chromium smoke test."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    preview = subparsers.add_parser("preview", help="serve a local page and open it in the default browser")
    preview.add_argument("--page", default="concepts/concept-1/v1.2", help="site directory or HTML file, relative to the project root")
    preview.add_argument("--port", type=int, default=8000, help="local HTTP port (default: 8000)")

    audit = subparsers.add_parser("audit", help="check layout in Chromium and save screenshots plus a JSON report")
    audit.add_argument("--page", default=DEFAULT_PAGE, help="HTML file or site directory, relative to the project root")
    audit.add_argument("--out-dir", default=str(DEFAULT_REPORT_DIR), help="report and screenshot output directory")

    args = parser.parse_args()
    if args.command == "preview":
        return run_preview(args.page, args.port)
    return run_audit(args.page, args.out_dir)


if __name__ == "__main__":
    raise SystemExit(main())
