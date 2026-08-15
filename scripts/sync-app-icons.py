from pathlib import Path
from PIL import Image
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/icons/clara-icon-512.png"
BG = (2, 6, 23, 255)


def normalize_master_icon(source: Path) -> Image.Image:
    if not source.exists():
        raise SystemExit(f"Canonical CLARA icon is missing: {source}")

    image = Image.open(source).convert("RGBA")
    if image.width <= 0 or image.height <= 0:
        raise SystemExit("Canonical CLARA icon has invalid dimensions.")

    # Keep the complete artwork. Put it on a square canvas without cropping;
    # Android applies its own launcher/adaptive masks later.
    target = 1024
    scale = min(target / image.width, target / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    normalized = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    normalized.alpha_composite(
        resized,
        ((target - resized.width) // 2, (target - resized.height) // 2),
    )
    return image, normalized


def save_png(source: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    source.resize((size, size), Image.Resampling.LANCZOS).save(
        path, format="PNG", optimize=True
    )


def generate_source_assets(normalized: Image.Image) -> None:
    resources = ROOT / "resources"
    resources.mkdir(parents=True, exist_ok=True)
    normalized.save(resources / "icon-only.png", optimize=True)
    normalized.save(resources / "icon-foreground.png", optimize=True)
    Image.new("RGBA", (1024, 1024), BG).save(
        resources / "icon-background.png", optimize=True
    )


def generate_web_assets(normalized: Image.Image) -> None:
    public_icons = ROOT / "public/icons"
    for filename, size in (
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("maskable-icon-192.png", 192),
        ("maskable-icon-512.png", 512),
        ("apple-touch-icon-180.png", 180),
    ):
        save_png(normalized, public_icons / filename, size)

    # Keep the older root /icons family synchronized so legacy install paths
    # cannot silently fall back to a different CLARA logo.
    legacy_icons = ROOT / "icons"
    legacy_icons.mkdir(parents=True, exist_ok=True)
    for size in (48, 72, 96, 128, 192, 256, 512):
        normalized.resize((size, size), Image.Resampling.LANCZOS).save(
            legacy_icons / f"icon-{size}.webp",
            format="WEBP",
            quality=95,
            method=6,
        )


def generate_play_assets(normalized: Image.Image) -> Path:
    play_store = normalized.resize((512, 512), Image.Resampling.LANCZOS)

    android_play = ROOT / "android/app/src/main/ic_launcher-playstore.png"
    android_play.parent.mkdir(parents=True, exist_ok=True)
    play_store.save(android_play, format="PNG", optimize=True)

    release_icon = ROOT / "release-assets/google-play/clara-app-icon-512.png"
    release_icon.parent.mkdir(parents=True, exist_ok=True)
    play_store.save(release_icon, format="PNG", optimize=True)

    # Google Play store-listing icon ceiling is 1 MB. Preserve full-color PNG
    # where possible; quantize only when required to meet the upload ceiling.
    if release_icon.stat().st_size > 1024 * 1024:
        indexed = play_store.convert(
            "P", palette=Image.Palette.ADAPTIVE, colors=256
        )
        indexed.save(release_icon, format="PNG", optimize=True)

    return release_icon


def sync_browser_shell() -> None:
    index_path = ROOT / "index.html"
    index = index_path.read_text(encoding="utf-8")
    icon_tag = '    <link rel="icon" type="image/png" href="./icons/icon-192.png" />'
    index = re.sub(
        r'\s*<link\s+rel="icon"[^>]*>\s*',
        "\n" + icon_tag + "\n",
        index,
        count=1,
        flags=re.IGNORECASE,
    )
    if 'rel="apple-touch-icon"' not in index:
        index = index.replace(
            icon_tag,
            icon_tag
            + '\n    <link rel="apple-touch-icon" href="./icons/apple-touch-icon-180.png" />',
            1,
        )
    index_path.write_text(index, encoding="utf-8")


def sync_manifests() -> None:
    manifest = {
        "name": "CLARA",
        "short_name": "CLARA",
        "description": "CLARA is a personal money coach for budgeting, spending awareness, and financial discipline.",
        "start_url": "./#/dashboard",
        "scope": "./",
        "display": "standalone",
        "background_color": "#020617",
        "theme_color": "#020617",
        "icons": [
            {
                "src": "./icons/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": "./icons/icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": "./icons/maskable-icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable",
            },
            {
                "src": "./icons/maskable-icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable",
            },
        ],
    }

    payload = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    for manifest_path in (
        ROOT / "manifest.json",
        ROOT / "public/manifest.json",
        ROOT / "public/manifest.webmanifest",
    ):
        manifest_path.write_text(payload, encoding="utf-8")


def main() -> None:
    original, normalized = normalize_master_icon(SOURCE)
    generate_source_assets(normalized)
    generate_web_assets(normalized)
    release_icon = generate_play_assets(normalized)
    sync_browser_shell()
    sync_manifests()

    print(f"Canonical source: {SOURCE.relative_to(ROOT)} ({original.width}x{original.height})")
    print(
        "Play release asset: "
        f"{release_icon.relative_to(ROOT)} ({release_icon.stat().st_size} bytes)"
    )


if __name__ == "__main__":
    main()
