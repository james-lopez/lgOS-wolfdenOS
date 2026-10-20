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


# How much of a banner asset the TV actually shows.
#
# Measured, not guessed: a calibration grid with labelled bands and true
# circles was built at every stock size and put on screen. The circles came
# back round, so nothing is stretched, and the visible window ran from 22% to
# 77% of the asset's width with its full height -- the centre 55%, cropped
# equally either side. 0.55 x 3.88:1 gives 2.13:1, which is exactly the shape
# of the area between the top of the screen and the app row.
#
# This is why cropping a 16:9 source into the raw 3.88:1 strip threw away more
# than half the picture for nothing. Only the middle has to carry it.
VISIBLE_FRACTION = 0.55


def source_size(path):
    out = run(["magick", "identify", "-format", "%w %h", path]).stdout
    w, h = out.decode().split()
    return int(w), int(h)


def build_from_image(out_path, width, height, source, crop_y):
    """
    Fill one stock-sized strip from a photograph.

    The picture is fitted to the visible window -- the centre 55% of the strip
    at full height, about 2.13:1 -- and the dead margins either side are filled
    with a blurred stretch of the same picture, so anything that does bleed in
    at another resolution still looks like part of the image.

    crop_y picks which band of the source survives the fit, 0.0 being the top
    and 1.0 the bottom.
    """
    vis_w = int(round(width * VISIBLE_FRACTION))
    src_w, src_h = source_size(source)

    # Scale to cover the visible window, then slide vertically.
    scale_w = vis_w if (vis_w / float(height)) > (src_w / float(src_h)) else None
    if scale_w:
        scaled_w, scaled_h = vis_w, int(round(vis_w * src_h / float(src_w)))
        resize = "%dx" % vis_w
    else:
        scaled_h, scaled_w = height, int(round(height * src_w / float(src_h)))
        resize = "x%d" % height
    off_y = max(0, int(round((scaled_h - height) * crop_y)))
    off_x = max(0, (scaled_w - vis_w) // 2)

    run([
        "magick",
        "(", source, "-resize", "%dx%d!" % (width, height),
        "-blur", "0x30", "-modulate", "70", ")",
        "(", source, "-resize", resize,
        "-crop", "%dx%d+%d+%d" % (vis_w, height, off_x, off_y), "+repage", ")",
        "-gravity", "center", "-compose", "over", "-composite",
        "-strip", out_path,
    ])
    return os.path.getsize(out_path)


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


def build(out_dir, text, draw_text, source=None, crop_y=1.0):
    base = os.path.join(out_dir, "home-banner")
    for width, height in SIZES:
        path = "%s-%dx%d.png" % (base, width, height)
        if source:
            size = build_from_image(path, width, height, source, crop_y)
        else:
            size = build_one(path, width, height, text, draw_text)
        print("  %-28s %5dx%-4d %8d bytes"
              % (os.path.basename(path), width, height, size))
    # Generic fallback for any asset whose size we have not measured.
    if source:
        build_from_image(base + ".png", 1920, 1080, source, crop_y)
    else:
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
    parser.add_argument(
        "--image",
        help="fill the banner from this picture instead of the gradient",
    )
    parser.add_argument(
        "--crop-y", type=float, default=1.0,
        help="which band of the picture to keep: 0.0 top, 1.0 bottom "
             "(default 1.0, which is what shows the foreground)",
    )
    args = parser.parse_args(argv)
    try:
        return build(args.out_dir, args.text, args.draw_text, args.image,
                     args.crop_y)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
