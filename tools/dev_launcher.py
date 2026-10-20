#!/usr/bin/env python3
"""
Serve launcher/ on this laptop so the wolf OS launcher can be developed in a
browser instead of through a full TV deploy.

A PalmServiceBridge stub is injected into index.html, backed by the real
launch-point snapshot in wwwroot/tv-launchpoints.json, so the dock renders with
the TV's actual app list. Launches are logged to the page instead of happening.

    python3 tools/dev_launcher.py           # http://127.0.0.1:8800/
    python3 tools/dev_launcher.py --port N

Nothing here ships: tools/build_launcher_ipk.py packages launcher/ untouched.
"""
import argparse
import json
import os
import posixpath
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlsplit

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAUNCHER_DIR = os.path.join(ROOT_DIR, "launcher")
SNAPSHOT = os.path.join(ROOT_DIR, "wwwroot", "tv-launchpoints.json")

# Mirrors the subset of PalmServiceBridge the launcher actually uses:
# listLaunchPoints and launch. Responses are delivered asynchronously, as they
# are on the TV, so dev behaviour matches ordering on the device.
STUB = """
<script>
(function () {
  if (window.PalmServiceBridge) { return; }
  var LAUNCH_POINTS = __LAUNCH_POINTS__;

  function banner(text) {
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;'
      + 'background:rgba(109,40,217,.92);color:#fff;font:16px -apple-system,sans-serif;'
      + 'padding:10px 18px;text-align:center;';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function PalmServiceBridge() { this.onservicecallback = null; }

  PalmServiceBridge.prototype.call = function (uri, payload) {
    var self = this;
    var params = {};
    try { params = JSON.parse(payload || '{}'); } catch (e) {}

    setTimeout(function () {
      if (uri.indexOf('listLaunchPoints') !== -1) {
        if (self.onservicecallback) {
          self.onservicecallback(JSON.stringify({
            returnValue: true,
            launchPoints: LAUNCH_POINTS
          }));
        }
        return;
      }
      if (uri.indexOf('/launch') !== -1) {
        banner('[dev] would launch: ' + (params.id || '?'));
        if (self.onservicecallback) {
          self.onservicecallback(JSON.stringify({ returnValue: true }));
        }
        return;
      }
      if (self.onservicecallback) {
        self.onservicecallback(JSON.stringify({ returnValue: true }));
      }
    }, 120);
  };

  PalmServiceBridge.prototype.cancel = function () {};
  window.PalmServiceBridge = PalmServiceBridge;
  window.__WOLFDEN_DEV__ = true;
  console.log('[dev] PalmServiceBridge stub active, '
    + LAUNCH_POINTS.length + ' launch points');
})();
</script>
"""


def load_launch_points():
    try:
        with open(SNAPSHOT, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return []
    payload = data.get("payload", data)
    return payload.get("launchPoints", [])


def make_handler(launch_points):
    stub = STUB.replace("__LAUNCH_POINTS__", json.dumps(launch_points))

    class DevHandler(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            rel = unquote(urlsplit(path).path).lstrip("/")
            rel = posixpath.normpath(rel) if rel else "index.html"
            if rel in ("", ".", "/"):
                rel = "index.html"
            if rel.startswith(".."):
                return LAUNCHER_DIR
            # The launcher fetches this at runtime; on the TV apply.sh drops it
            # next to the app, so serve the snapshot in its place.
            if rel == "tv-launchpoints.json":
                return SNAPSHOT
            return os.path.join(LAUNCHER_DIR, rel.replace("/", os.sep))

        def send_head(self):
            rel = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
            if rel not in ("index.html", ""):
                return SimpleHTTPRequestHandler.send_head(self)
            try:
                with open(os.path.join(LAUNCHER_DIR, "index.html"),
                          "r", encoding="utf-8") as fh:
                    html = fh.read()
            except OSError:
                self.send_error(404, "launcher/index.html not found")
                return None
            if "</head>" in html:
                html = html.replace("</head>", stub + "</head>", 1)
            else:
                html = stub + html
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            import io
            return io.BytesIO(body)

    return DevHandler


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--port", type=int, default=8800)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args(argv)

    if not os.path.isdir(LAUNCHER_DIR):
        print("error: %s does not exist" % LAUNCHER_DIR, file=sys.stderr)
        return 1

    launch_points = load_launch_points()
    server = HTTPServer((args.host, args.port), make_handler(launch_points))
    print("launcher dev server: http://%s:%d/" % (args.host, args.port))
    print("serving %s with %d stubbed launch points"
          % (LAUNCHER_DIR, len(launch_points)))
    print("edit launcher/index.html and reload; nothing is deployed")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
