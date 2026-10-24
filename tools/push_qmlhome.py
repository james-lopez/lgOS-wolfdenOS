#!/usr/bin/env python3
"""
Push qmlhome/*.qml straight onto the TV, relaunch the home app, and print what
qml-runner said about it.

A deploy is minutes; this is about fifteen seconds, and it is how the home
screen was iterated on. QML errors only ever surface as qml-runner warnings in
/var/log/dbg-log on the TV -- an app that fails to load exits silently and SAM
falls back to LG's Home -- so the warnings are the whole feedback loop.

Only QML files are pushed: appinfo.json changes need a real install, and the
media is placed by apply.sh.

    python3 tools/push_qmlhome.py
    python3 tools/push_qmlhome.py --capture shot.png     # graphics plane
"""
import argparse
import functools
import glob
import http.server
import os
import socket
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tv_shell  # noqa: E402

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QMLHOME_DIR = os.path.join(ROOT_DIR, "qmlhome")
APP_ID = "tld.wolfdenos.qmlhome"
APP_DIR = "/media/developer/apps/usr/palm/applications/" + APP_ID

# qml-runner is chatty about Wayland and media; these lines are never the
# problem.
NOISE = ("XKB keymap", "window_id assigned", "handleWindowIdAssignment",
         "WebOSExported", "WebOSForeign", "uMediaClient", "play is called",
         "stop is called", "Window ID from LSM")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--host", default=tv_shell.DEFAULT_HOST, required=tv_shell.DEFAULT_HOST is None,
                        help="TV address (default: $WOLFDEN_TV or .tv-ip)")
    parser.add_argument("--capture", help="also pull a graphics-plane capture to this path")
    parser.add_argument("--wait", type=int, default=9, help="seconds to give the app after launch")
    parser.add_argument("--trace", type=int, default=0, metavar="SECONDS",
                        help="after the relaunch, keep serving and print the app's dbg() POSTs for this long")
    args = parser.parse_args(argv)

    qml_files = sorted(os.path.basename(p) for p in glob.glob(os.path.join(QMLHOME_DIR, "*.qml")))
    if not qml_files:
        print("error: no .qml files in %s" % QMLHOME_DIR, file=sys.stderr)
        return 1

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_POST(self):
            n = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(n).decode("utf-8", "replace")
            print("  [tv] " + body, flush=True)
            self.send_response(204); self.end_headers()
    handler = functools.partial(Handler, directory=QMLHOME_DIR)
    server = http.server.HTTPServer(("0.0.0.0", 0), handler)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    probe = socket.create_connection((args.host, 23), 5)
    local_ip = probe.getsockname()[0]
    probe.close()

    fetch = "\n".join("curl -s -m 30 -o %s/%s http://%s:%d/%s" % (APP_DIR, f, local_ip, port, f)
                      for f in qml_files)
    # debug.url makes main.qml POST its dbg() lines back here. It is removed
    # again unless --trace asked for it, so a plain push leaves nothing behind.
    if args.trace:
        fetch += "\necho 'http://%s:%d/trace' > %s/debug.url" % (local_ip, port, APP_DIR)
    else:
        fetch += "\nrm -f %s/debug.url" % APP_DIR
    script = """
%s
echo "pushed: %s"
luna-send -w 5000 -n 1 'luna://com.webos.applicationManager/closeByAppId' '{"id":"%s"}' >/dev/null 2>&1; sleep 1
luna-send -w 5000 -n 1 'luna://com.webos.service.tvpower/power/turnOnScreen' '{}' >/dev/null 2>&1
luna-send -w 8000 -n 1 'luna://com.webos.applicationManager/launchDefaultApp' '{"category":"home"}' >/dev/null 2>&1
sleep %d
echo "foreground: $(luna-send -w 4000 -n 1 'luna://com.webos.applicationManager/getForegroundAppInfo' '{}' 2>&1 | grep -o '"appId":"[^"]*"')"
echo "--- qml-runner, newest ---"
grep -hE "qml-runner \\[\\] %s" /var/log/dbg-log 2>/dev/null | tail -40 | cut -c1-320
""" % (fetch, " ".join(qml_files), APP_ID, args.wait, APP_ID)
    if args.capture:
        script += ("rm -f /tmp/push.png; luna-send -w 10000 -n 1 "
                   "'luna://com.webos.surfacemanager/captureCompositorOutput' "
                   "'{\"output\":\"/tmp/push.png\",\"format\":\"PNG\"}' >/dev/null 2>&1\n")

    out = tv_shell.run(args.host, 23, script, 120)
    for line in out.splitlines():
        if any(n in line for n in NOISE):
            continue
        print(line)

    if args.trace:
        import time
        print("--- tracing for %ds (dbg() lines from the TV) ---" % args.trace, flush=True)
        time.sleep(args.trace)
    if args.capture:
        return tv_shell.pull(args.host, "/tmp/push.png", args.capture, 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
