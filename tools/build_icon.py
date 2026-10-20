#!/usr/bin/env python3
"""
Generate the wolf OS app icons: a purple gradient background with the wolf mark
knocked out in white, at the sizes webOS asks for in appinfo.json.

    python3 tools/build_icon.py                      # uses launcher/wolf-mark.svg
    python3 tools/build_icon.py --logo wolf.png      # trace a raster logo

With --logo, the image is expected to be a light mark on a dark background (the
original artwork): luminance is thresholded to build a mask, so whatever is
bright becomes the white wolf and the dark background is discarded.

Writes launcher/icon80.png, icon130.png, icon160.png and icon.png.
"""
import argparse
import os
import subprocess
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAUNCHER_DIR = os.path.join(ROOT_DIR, "launcher")
DEFAULT_MARK = os.path.join(LAUNCHER_DIR, "wolf-mark.svg")

# webOS reads these three; icon.png stays as a compatibility alias.
SIZES = {"icon80.png": 80, "icon130.png": 130, "icon160.png": 160}
ALIAS = ("icon.png", 80)

# Gradient stops. Kept here rather than in the shell script so the icon and the
# launcher's own theme can be tuned side by side.
GRAD_TOP = "#a855f7"
GRAD_BOTTOM = "#3b0764"
HIGHLIGHT = "#c084fc"

# Fraction of the icon the mark occupies, leaving breathing room in the tile.
MARK_SCALE = 0.72

# Luminance window mapped to alpha when tracing a raster logo.
LEVEL_LOW = "22%"
LEVEL_HIGH = "46%"


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "%s failed: %s" % (cmd[0], proc.stderr.decode("utf-8", "replace").strip())
        )
    return proc


def magick(args):
    return run(["magick"] + args)


def build_background(size, out_path):
    """Vertical gradient with a soft off-centre highlight, like the dock."""
    big = size * 4  # render large, downsample: keeps the highlight smooth
    magick([
        "-size", "%dx%d" % (big, big),
        "gradient:%s-%s" % (GRAD_TOP, GRAD_BOTTOM),
        "(",
        "-size", "%dx%d" % (big, big),
        "radial-gradient:%s-none" % HIGHLIGHT,
        "-resize", "150%",
        "-gravity", "northwest",
        "-crop", "%dx%d+0+0" % (big, big), "+repage",
        "-alpha", "set", "-channel", "A", "-evaluate", "multiply", "0.55", "+channel",
        ")",
        "-compose", "over", "-composite",
        "-resize", "%dx%d" % (size, size),
        out_path,
    ])


def mark_to_white_mask(logo_path, size, out_path):
    """
    Turn the artwork into a white-on-transparent mark.

    SVG renders directly. A raster logo is a light mark on a dark field, so its
    luminance becomes the alpha channel: bright pixels stay, dark ones vanish.
    """
    target = int(size * MARK_SCALE)
    if logo_path.lower().endswith(".svg"):
        magick([
            "-background", "none",
            "-density", "600",
            logo_path,
            "-resize", "%dx%d" % (target, target),
            out_path,
        ])
        return
    magick([
        logo_path,
        "-colorspace", "sRGB",
        "-alpha", "off",
        # luminance -> alpha, so the dark background drops out
        "(", "+clone", "-colorspace", "Gray", "-auto-level",
        # Steep, not binary: the artwork's silver gradient must land fully
        # opaque (a wide range left it see-through over the tile), while the
        # narrow ramp still keeps edges antialiased at 80px.
        "-level", LEVEL_LOW + "," + LEVEL_HIGH, ")",
        "-alpha", "off", "-compose", "copy_opacity", "-composite",
        # everything that survives is painted flat white
        "-fill", "white", "-colorize", "100",
        "-trim", "+repage",
        "-resize", "%dx%d" % (target, target),
        out_path,
    ])


def compose(bg_path, mark_path, size, out_path):
    magick([
        bg_path,
        mark_path,
        "-gravity", "center",
        "-compose", "over", "-composite",
        "-strip",
        out_path,
    ])


def build(logo_path, out_dir):
    if not os.path.isfile(logo_path):
        raise RuntimeError("logo not found: %s" % logo_path)
    os.makedirs(out_dir, exist_ok=True)
    tmp_bg = os.path.join(out_dir, ".bg.png")
    tmp_mark = os.path.join(out_dir, ".mark.png")

    produced = []
    try:
        for name, size in list(SIZES.items()) + [ALIAS]:
            build_background(size, tmp_bg)
            mark_to_white_mask(logo_path, size, tmp_mark)
            out_path = os.path.join(out_dir, name)
            compose(tmp_bg, tmp_mark, size, out_path)
            produced.append((name, size, os.path.getsize(out_path)))
    finally:
        for tmp in (tmp_bg, tmp_mark):
            if os.path.exists(tmp):
                os.remove(tmp)

    print("built icons from %s" % os.path.relpath(logo_path, ROOT_DIR))
    for name, size, nbytes in produced:
        print("  %-14s %3dx%-3d %6d bytes" % (name, size, size, nbytes))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument(
        "--logo", default=DEFAULT_MARK,
        help="source artwork (.svg, or a light-on-dark raster)",
    )
    parser.add_argument("--out-dir", default=LAUNCHER_DIR)
    args = parser.parse_args(argv)
    try:
        return build(args.logo, args.out_dir)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
