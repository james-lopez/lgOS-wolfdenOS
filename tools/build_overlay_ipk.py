#!/usr/bin/env python3
"""
Build wwwroot/wolfdenos-overlay.ipk, the installable package for the overlay
that draws over LG's Home screen.

Same packaging rules as the launcher (see build_launcher_ipk.py, whose helpers
this reuses): an ar archive written by hand, and a control file carrying
Installed-Size. Two things are specific to this app and worth not losing:

  * appinfo.json must NOT carry "trustLevel". LG's own overlay manifests set
    it to "trusted", and copying that field is what silently blocks SAM
    registration for a dev-installed app -- no error, the app simply never
    exists. This cost hours on the launcher.
  * The season artwork is deliberately not packaged. It is large, it is not
    ours, and apply.sh copies it into the app directory at deploy time, the
    same way the launcher's background video is handled.

    python3 tools/build_overlay_ipk.py
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_launcher_ipk import app_version, ar_member, make_tar_gz  # noqa: E402

APP_ID = "tld.wolfdenos.overlay"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OVERLAY_DIR = os.path.join(ROOT_DIR, "overlay")
PAYLOAD_FILES = ("appinfo.json", "index.html", "icon.png")


def build(overlay_dir, out_path):
    files = {}
    for name in PAYLOAD_FILES:
        path = os.path.join(overlay_dir, name)
        if not os.path.isfile(path):
            raise RuntimeError("missing overlay source: %s" % path)
        with open(path, "rb") as fh:
            files[name] = fh.read()

    appinfo = files["appinfo.json"].decode("utf-8")
    if APP_ID not in appinfo:
        raise RuntimeError("appinfo.json is not for %s" % APP_ID)
    if "trustLevel" in appinfo:
        raise RuntimeError("appinfo.json carries trustLevel; SAM will refuse it")
    version = app_version(appinfo)

    mtime = int(os.environ.get("SOURCE_DATE_EPOCH", 0)) or int(time.time())
    app_dir = "usr/palm/applications/%s" % APP_ID
    data_tar = make_tar_gz(
        [("%s/%s" % (app_dir, name), body, 0o644)
         for name, body in sorted(files.items())],
        mtime,
    )

    control = (
        "Package: %s\n"
        "Version: %s\n"
        "Section: misc\n"
        "Priority: optional\n"
        "Architecture: all\n"
        "Installed-Size: %d\n"
        "Maintainer: N/A <nobody@example.com>\n"
        "Description: This is a webOS application.\n"
        "webOS-Package-Format-Version: 2\n"
        "webOS-Packager-Version: x.y.x\n"
    ) % (APP_ID, version, sum(len(body) for body in files.values()))
    control_tar = make_tar_gz([("control", control.encode("utf-8"), 0o644)], mtime)

    blob = b"!<arch>\n"
    blob += ar_member("debian-binary", b"2.0\n", mtime)
    blob += ar_member("control.tar.gz", control_tar, mtime)
    blob += ar_member("data.tar.gz", data_tar, mtime)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as fh:
        fh.write(blob)

    print("built %s" % out_path)
    print("  app:     %s %s" % (APP_ID, version))
    print("  payload: %s" % ", ".join(sorted(files)))
    print("  size:    %d bytes" % len(blob))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--overlay", default=OVERLAY_DIR)
    parser.add_argument(
        "--out",
        default=os.path.join(ROOT_DIR, "wwwroot", "wolfdenos-overlay.ipk"),
    )
    args = parser.parse_args(argv)
    try:
        return build(args.overlay, args.out)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
