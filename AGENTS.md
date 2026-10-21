# lgOS-wolfdenOS — instructions for agents

A replacement home screen and core patcher for one rooted LG OLED65G3PUA
(webOS 25). The TV's HOME button opens `tld.wolfdenos.qmlhome` (`qmlhome/`),
a native QML app, because `apply.sh` sets it as the OS's default home app.
LG's Home stays installed underneath. The Next.js app in `src/` is the
SlopBro G3 Studio web UI (`npm run dev`); the TV work is Python, shell and
QML and does not touch it.

Read `README.md` (what it is, how to deploy, current state, safety) and then
`NOTES.md` before changing anything. `NOTES.md` is the lab notebook: every
section records something that broke on the device and why. New findings go
there, next to the subsystem they belong to, in the same voice (what was
tried, what the log said, what actually works). The README stays short.

## Hard rules

- `wwwroot/libapp.so` and `uploads/libapp.so` are LG's binary. Never commit
  them. `wwwroot/home-bg.*`, `qmlhome/home-bg.*` and the seasonal artwork are
  third-party and gitignored; they are served at deploy time only.
- Never mask, remove or hide `com.webos.app.adoverlayex`. Deploys stage
  through it; masking it hangs every future deploy ("waiting for TV to pull
  all payload files"). `mask_bloat_apps` in `wwwroot/debloat_home.sh` carries
  the comment.
- Every path that gives up on the modifications (USB kill switch, three-strike
  counter, `--revert`) must call `set_home_app com.webos.app.home` before it
  stops. A home app that cannot start would otherwise be the home app forever.
- Do not reintroduce HTML or QML inside heredocs in `debloat_home.sh`.
  `qmlhome/` and `launcher/` are the sources; the ipk builders package them.
- The TV is on a quarantined VLAN; its address lives only in the gitignored
  `.tv-ip` (or `WOLFDEN_TV`), never in docs or committed defaults: this repo
  is public. SSH is closed; the
  only shell is Homebrew Channel's telnet (`tools/tv_shell.py`). Do not open
  anything else on it.
- Git: stage files by name, show the commit message first, no
  `Co-Authored-By`.

## Working on the home screen

```sh
python3 tools/push_qmlhome.py --capture shot.png   # push qmlhome/*.qml, relaunch, print qml-runner warnings
python3 tools/tv_shell.py 'luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo {}'
```

- A QML load error kills the app silently and SAM brings LG's Home back; the
  only trace is a `qml-runner [] tld.wolfdenos.qmlhome` line in
  `/var/log/dbg-log`, which `push_qmlhome.py` prints. `console.warn` reaches
  that log; `console.log` does not.
- The TV's Qt is 5.12: `import QtQuick 2.12`, no inline `component`, no
  `Keys` on `WebOSWindow`. The `Service` element's payload is `arguments[0]`
  of `callSuccess`; there is no `callError`.
- The video is on the hardware plane below the graphics plane. Nothing opaque
  may sit under the `Video`. `captureCompositorOutput` shows it as white; use
  `com.webos.service.capture/executeOneShot` to see both planes.
- `appinfo.json` changes need a real install: `python3 tools/build_ipk.py
  qmlhome -o wwwroot/wolfdenos-qmlhome.ipk --exclude splash.png`, then a
  deploy. Deploys are `python3 wolfdenOS.py --debug --webos-version 10
  <tv-ip>` with the default `--log-wait 240`; a shorter wait ends the
  deploy before the TV has fetched everything and leaves the TV on LG's Home.

## Before experimenting

Make the USB kill switch first: an empty file named `wolfden-disable` at the
top level of a USB stick disables all modifications on the next boot. The
`README.md` "Safety" section has the rest.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
