#!/usr/bin/env python3
"""
Build wwwroot/home-banner.png, the image that replaces LG's stock banner art on
the native Home screen (com.webos.app.home).

That screen is a compiled Flutter app: its strings and images can be swapped
through the bind-mount overlay, but its layout cannot. So the wordmark is
rendered into the image itself, which is the only way to get it centred.

    python3 tools/build_banner.py
    python3 tools/build_banner.py --text "wolfdenOS" --no-text
"""
import argparse
import os
import subprocess
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT_DIR, "wwwroot", "home-banner.png")

# The stock banners are wide strips, not 16:9, and the sizes differ per asset
# and per hd/2k/4k directory. Measured off the TV; a 1920x1080 image scaled
# into these always cropped. apply.sh picks the file matching each asset.
SIZES = (
    (1264, 326),
    (1746, 450),
    (3492, 900),
    (3792, 978),
    (1896, 489),
    (1920, 1080),
)

# Warm neutral "nude" ramp: soft blush through tan, dark enough at the edges
# that LG's own white text stays readable wherever it lands.
GRAD_TOP = "#e7cdb9"
GRAD_BOTTOM = "#6b4b3b"
VIGNETTE = "#2b1b14"

TEXT_FILL = "#fffaf5"

# ImageMagick here has no font list configured, so a font is given by file
# path. First one that exists wins.
FONT_CANDIDATES = (
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Avenir Next.ttc",
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
)


def find_font():
    for path in FONT_CANDIDATES:
        if os.path.isfile(path):
            return path
    return None


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace").strip())
    return proc


def build_one(out_path, width, height, text, draw_text):
    args = [
        "magick",
        "-size", "%dx%d" % (width, height),
        "gradient:%s-%s" % (GRAD_TOP, GRAD_BOTTOM),
        # Soft vignette so the panel's corners fall off rather than banding.
        "(",
        "-size", "%dx%d" % (width, height),
        "radial-gradient:none-%s" % VIGNETTE,
        "-alpha", "set", "-channel", "A", "-evaluate", "multiply", "0.55", "+channel",
        ")",
        "-compose", "over", "-composite",
    ]

    font = find_font() if draw_text else None
    if draw_text and font is None:
        print("warning: no usable font found; writing gradient only",
              file=sys.stderr)
        draw_text = False

    if draw_text:
        args += [
            "-gravity", "center",
            "-font", font,
            "-pointsize", str(max(48, int(height * 0.22))),
            "-fill", TEXT_FILL,
            "-annotate", "+0+0", text,
        ]

    args += ["-strip", out_path]
    run(args)
    return os.path.getsize(out_path)


def build(out_dir, text, draw_text):
    base = os.path.join(out_dir, "home-banner")
    for width, height in SIZES:
        path = "%s-%dx%d.png" % (base, width, height)
        size = build_one(path, width, height, text, draw_text)
        print("  %-28s %5dx%-4d %8d bytes"
              % (os.path.basename(path), width, height, size))
    # Generic fallback for any asset whose size we have not measured.
    build_one(base + ".png", 1920, 1080, text, draw_text)
    print("  %-28s fallback" % "home-banner.png")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--out-dir", default=os.path.join(ROOT_DIR, "wwwroot"))
    parser.add_argument("--text", default="wolfdenOS")
    # Default is gradient only: LG draws its own banner text and button over
    # this image, and a baked-in wordmark collided with them.
    parser.add_argument("--text-in-image", dest="draw_text", action="store_true",
                        help="bake the wordmark into the image (overlaps LG's own text)")
    args = parser.parse_args(argv)
    try:
        return build(args.out_dir, args.text, args.draw_text)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
