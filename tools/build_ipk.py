#!/usr/bin/env python3
"""
Package any app directory into a webOS ipk.

Third app, so the launcher- and overlay-specific builders give way to one that
reads an app directory as it is: every regular file ships, dotfiles and
anything named with --exclude do not. The packaging rules are the ones learned
on the launcher (see build_launcher_ipk.py, whose helpers this reuses):

  * an ar archive written by hand, because BSD ar adds members opkg rejects;
  * Installed-Size in the control file, or appinstalld unpacks nothing while
    still answering "installed";
  * no "trustLevel" in appinfo.json -- SAM silently refuses to register a
    dev app that carries it.

    python3 tools/build_ipk.py qmlhome -o wwwroot/wolfdenos-qmlhome.ipk
    python3 tools/build_ipk.py qmlhome -o out.ipk --exclude home-bg.mp4
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_launcher_ipk import ar_member, make_tar_gz  # noqa: E402

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def collect(app_dir, exclude):
    files = {}
    for dirpath, dirnames, filenames in os.walk(app_dir):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
        for name in sorted(filenames):
            if name.startswith(".") or name in exclude:
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, app_dir).replace(os.sep, "/")
            with open(path, "rb") as fh:
                files[rel] = fh.read()
    return files


def build(app_dir, out_path, exclude):
    files = collect(app_dir, set(exclude))
    if "appinfo.json" not in files:
        raise RuntimeError("no appinfo.json in %s" % app_dir)
    appinfo = json.loads(files["appinfo.json"].decode("utf-8"))
    app_id = appinfo.get("id")
    version = appinfo.get("version", "0.0.0")
    if not app_id:
        raise RuntimeError("appinfo.json has no id")
    if "trustLevel" in appinfo:
        raise RuntimeError("appinfo.json carries trustLevel; SAM will refuse it")
    main = appinfo.get("main", "")
    if main and "://" not in main and main not in files:
        raise RuntimeError("appinfo.json main=%r is not in the app directory" % main)

    mtime = int(os.environ.get("SOURCE_DATE_EPOCH", 0)) or int(time.time())
    base = "usr/palm/applications/%s" % app_id
    data_tar = make_tar_gz(
        [("%s/%s" % (base, rel), body, 0o644) for rel, body in sorted(files.items())],
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
    ) % (app_id, version, sum(len(b) for b in files.values()))
    control_tar = make_tar_gz([("control", control.encode("utf-8"), 0o644)], mtime)

    blob = b"!<arch>\n"
    blob += ar_member("debian-binary", b"2.0\n", mtime)
    blob += ar_member("control.tar.gz", control_tar, mtime)
    blob += ar_member("data.tar.gz", data_tar, mtime)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "wb") as fh:
        fh.write(blob)
    print("built %s" % out_path)
    print("  app:     %s %s" % (app_id, version))
    print("  payload: %s" % ", ".join(sorted(files)))
    print("  size:    %d bytes" % len(blob))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("app_dir", help="directory holding appinfo.json and the app")
    parser.add_argument("-o", "--out", required=True)
    parser.add_argument("--exclude", action="append", default=[],
                        help="file name to leave out (repeatable)")
    args = parser.parse_args(argv)
    try:
        return build(args.app_dir, args.out, args.exclude)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
