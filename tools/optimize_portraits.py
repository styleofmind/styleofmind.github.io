from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageOps, features

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "концеп расстановки" / "concept-4" / "v4.1" / "assets" / "portraits"
TARGETS = [
    ("olga-hero-glasses.png", [480, 840, 1123]),
    ("olga-about.png", [480, 720, 1024]),
]
QUALITY = 88
METHOD = 6
ALPHA_QUALITY = 100

def main() -> None:
    if not features.check("webp"):
        raise RuntimeError("Pillow was installed without WebP support")

    background_path = ASSETS.parent / "backgrounds" / "section-01.jpg"
    if background_path.is_file():
        with Image.open(background_path) as background:
            background.load()
            print(json.dumps({
                "heroBackground": str(background_path.name),
                "dimensions": list(background.size),
                "mode": background.mode,
                "format": background.format,
                "bytes": background_path.stat().st_size,
            }, ensure_ascii=False))

    results = []
    for source_name, widths in TARGETS:
        source_path = ASSETS / source_name
        if not source_path.is_file():
            raise FileNotFoundError(source_path)

        with Image.open(source_path) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGBA")
            source_width, source_height = image.size
            alpha = image.getchannel("A")
            alpha_range = alpha.getextrema()
            if alpha_range[0] != 0 and "hero" in source_name:
                # The hero portrait is expected to be a cut-out. Warn instead
                # of assuming that full opacity is automatically a failure.
                print(f"NOTICE: {source_name} has no fully transparent pixels: alpha range {alpha_range}")

            for requested_width in widths:
                output_width = min(requested_width, source_width)
                output_height = max(1, round(source_height * output_width / source_width))
                output = image
                if (output_width, output_height) != image.size:
                    output = image.resize(
                        (output_width, output_height),
                        resample=Image.Resampling.LANCZOS,
                    )

                output_name = f"{Path(source_name).stem}-{output_width}.webp"
                output_path = ASSETS / output_name
                output.save(
                    output_path,
                    format="WEBP",
                    quality=QUALITY,
                    method=METHOD,
                    alpha_quality=ALPHA_QUALITY,
                    exact=True,
                )

                # Reopen every output to validate decode and dimensions.
                with Image.open(output_path) as verify:
                    verify.load()
                    if verify.size != (output_width, output_height):
                        raise RuntimeError(
                            f"{output_name} dimensions {verify.size} != {(output_width, output_height)}"
                        )
                    if verify.mode not in ("RGB", "RGBA"):
                        raise RuntimeError(f"{output_name} unexpected mode: {verify.mode}")

                original_bytes = source_path.stat().st_size
                output_bytes = output_path.stat().st_size
                results.append({
                    "source": source_name,
                    "output": output_name,
                    "sourceDimensions": [source_width, source_height],
                    "outputDimensions": [output_width, output_height],
                    "originalBytes": original_bytes,
                    "outputBytes": output_bytes,
                    "reductionPercent": round((1 - output_bytes / original_bytes) * 100, 1),
                    "alphaRangeSource": list(alpha_range),
                })
                if output is not image:
                    output.close()

    print(json.dumps({"quality": QUALITY, "results": results}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
