# Local Site Audit Toolkit

This repository's local audit environment uses Python in `.venv` plus a small set of global Node.js tools. These tools are for local analysis; they are not downloaded into the published website.

## Python environment

Install or restore the Python dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\tools\requirements-audit.txt
.\.venv\Scripts\python.exe -m playwright install chromium firefox webkit
```

Run the existing responsive smoke test (Chromium, four viewport sizes, screenshots and JSON report):

```powershell
.\.venv\Scripts\python.exe .\tools\site_tools.py audit --page 'development/концеп расстановки/concept-1/v1.3/index.html' --out-dir "$env:TEMP\styleofmind-audit-v1.3"
```

The Python image stack includes Pillow, OpenCV, scikit-image, ImageHash, imageio, NumPy, SciPy, and pandas for image validation, dimensions, similarity/duplicate analysis, image processing and tabular reports. `exifread` reads photo metadata. `pytesseract` connects to the Tesseract OCR executable installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`; the `eng` and `rus` language data are available.

## Node.js audit tools

Installed globally for local use:

- `lighthouse` — performance, SEO, best-practices and accessibility scores.
- `html-validate` — HTML validation.
- `stylelint` + `stylelint-config-standard` — CSS linting.
- `axe-core` — accessibility rules engine to run from Playwright or another browser harness.

Install/update these tools with:

```powershell
npm install --global lighthouse html-validate stylelint stylelint-config-standard axe-core

# Local module dependencies for tools/site_browser_audit.mjs; not used by the published site
npm install --no-save --no-package-lock playwright axe-core lighthouse
```

Example Lighthouse report (save it outside the repository):

```powershell
lighthouse 'https://styleofmind.github.io/' --output html --output-path "$env:TEMP\styleofmind-lighthouse.html" --chrome-flags='--headless=new'
```

HTML validation example:

```powershell
html-validate '.\концеп расстановки\concept-1\v1.3\index.html'
```

For Stylelint, the project stylesheet should be checked using the `stylelint-config-standard` configuration; CSS lint rules may need tailoring where a stylesheet intentionally uses a project-specific pattern.

## Notes

- Playwright is the primary browser automation framework used by `tools/site_tools.py`; Selenium is also installed as an optional alternative.
- Browser tests and Lighthouse reports are local diagnostics; review the report before treating an accessibility or SEO finding as a defect.
- Keep generated screenshots and reports in `$env:TEMP` unless they are intentionally being documented in the repository.

