#!/usr/bin/env python3
"""
Build wwwroot/wolfdenos.ipk, the installable package for the wolf OS launcher.

Writing an app directory into /media/developer/apps does NOT register it with
SAM -- dev/listApps ignores it and launching returns -101 "not exist". The only
way an app becomes real is appInstallService/dev/install with an ipk, which is
exactly how Homebrew Channel gets installed in autoroot.sh.

The launcher's source lives in launcher/ as ordinary files so it can be opened,
edited and previewed in a browser (see tools/dev_launcher.py) without going
through a TV deploy.
"""
import argparse
import gzip
import io
import os
import re
import sys
import tarfile
import time

APP_ID = "tld.wolfdenos.home"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LAUNCHER_DIR = os.path.join(ROOT_DIR, "launcher")
# Everything in launcher/ ships inside the app directory.
PAYLOAD_FILES = (
    "appinfo.json", "index.html", "launcher-config.json",
    # appinfo.json points at the three sizes; icon.png stays as an alias.
    "icon.png", "icon80.png", "icon130.png", "icon160.png",
    "splash.png",
)


def read_payload(launcher_dir):
    files = {}
    for name in PAYLOAD_FILES:
        path = os.path.join(launcher_dir, name)
        if not os.path.isfile(path):
            raise RuntimeError("missing launcher source: %s" % path)
        with open(path, "rb") as fh:
            files[name] = fh.read()
    return files


def app_version(appinfo_text):
    match = re.search(r'"version"\s*:\s*"([^"]+)"', appinfo_text)
    return match.group(1) if match else "0.0.0"


def make_tar_gz(entries, mtime):
    """entries: list of (arcname, bytes, mode). Returns gzipped tar bytes."""
    raw = io.BytesIO()
    # Deterministic output: fixed mtime, no gzip filename/timestamp field.
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.GNU_FORMAT) as tar:
        seen_dirs = set()
        for arcname, data, mode in entries:
            parts = arcname.split("/")
            for i in range(1, len(parts)):
                d = "/".join(parts[:i])
                if d and d not in seen_dirs:
                    seen_dirs.add(d)
                    info = tarfile.TarInfo(d)
                    info.type = tarfile.DIRTYPE
                    info.mode = 0o755
                    info.mtime = mtime
                    tar.addfile(info)
            info = tarfile.TarInfo(arcname)
            info.size = len(data)
            info.mode = mode
            info.mtime = mtime
            tar.addfile(info, io.BytesIO(data))
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", mtime=0) as gz:
        gz.write(raw.getvalue())
    return out.getvalue()


def ar_member(name, data, mtime):
    """
    One ar archive member. Written by hand because BSD ar on macOS can add
    symbol-table members and long-name extensions that opkg does not expect.
    All three of our names fit in 16 bytes, so no extension is needed.
    """
    if len(name) > 16:
        raise RuntimeError("ar member name too long: %s" % name)
    header = (
        name.ljust(16)
        + str(mtime).ljust(12)
        + "0".ljust(6)
        + "0".ljust(6)
        + "100644".ljust(8)
        + str(len(data)).ljust(10)
        + "`\n"
    ).encode("ascii")
    if len(header) != 60:
        raise RuntimeError("bad ar header length %d" % len(header))
    padding = b"\n" if len(data) % 2 else b""
    return header + data + padding


def build(launcher_dir, out_path):
    files = read_payload(launcher_dir)

    appinfo = files["appinfo.json"].decode("utf-8")
    if APP_ID not in appinfo:
        raise RuntimeError("extracted appinfo.json is not for %s" % APP_ID)
    version = app_version(appinfo)

    mtime = int(os.environ.get("SOURCE_DATE_EPOCH", 0)) or int(time.time())

    app_dir = "usr/palm/applications/%s" % APP_ID
    data_entries = [
        ("%s/%s" % (app_dir, name), body, 0o644)
        for name, body in sorted(files.items())
    ]
    data_tar = make_tar_gz(data_entries, mtime)

    # Field set matched against the Homebrew Channel ipk, which is known to
    # install on this TV. Installed-Size matters: without it appinstalld
    # reported totalSize/unpackFileSize of 0 and unpacked nothing while still
    # answering state "installed".
    installed_size = sum(len(body) for body in files.values())
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
    ) % (APP_ID, version, installed_size)
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
    parser.add_argument(
        "--launcher", default=LAUNCHER_DIR,
        help="directory holding the launcher source files",
    )
    parser.add_argument(
        "--out", default=os.path.join(ROOT_DIR, "wwwroot", "wolfdenos.ipk"),
        help="output ipk path",
    )
    args = parser.parse_args(argv)
    try:
        return build(args.launcher, args.out)
    except RuntimeError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
