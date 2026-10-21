# lgOS-wolfdenOS (`github.com/james-lopez/lgOS-wolfdenOS`)

A replacement **home screen** and **wolf OS** core patcher for **LG `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)**, built on [`throwaway96/slopbro`](https://github.com/throwaway96/slopbro).

This is not a launcher app you open from LG's Home. The TV's HOME button opens
**`tld.wolfdenos.qmlhome`**, a native QML app in `qmlhome/`, because the OS is
told it is the home app (`applicationManager/setDefaultApp`, the same switch
LG uses for Senior Home). LG's Home stays installed underneath, debloated and
de-adverted by the same boot hook, and every escape hatch hands HOME back to
it. See "The Native Home Screen" below for how and why; the web launcher that
preceded it (`launcher/`) is kept as source but no longer installed.

---

## Quick Start (Deploy to TV over LAN)

Run from your macOS **Terminal** (which has macOS Local Network permission for your LAN):

```bash
python3 wolfdenOS.py --debug --webos-version 10 <tv-ip>
```

To query all currently installed launch points and apps directly from the TV over SSAP:

```bash
python3 tools/list_tv_apps.py <tv-ip>
```

To iterate on the home screen without deploying (strongly preferred -- seconds
instead of minutes, and it prints qml-runner's warnings, which are the only
feedback a broken QML file gives):

```bash
python3 tools/push_qmlhome.py --capture shot.png
```

To revert all modifications back to factory stock webOS:

> **Note:** SSH is not reachable on this TV — port 22 is closed and the
> Homebrew Channel SSH toggle did not bring it up, so the `ssh root@...` form
> this README used to recommend does not work. Use the USB kill switch
> (an empty `wolfden-disable` file at the top level of a stick) to disable the
> modifications on the next boot, then redeploy with `--revert` wired in, or
> delete the init hook at
> `/var/lib/webosbrew/init.d/49-g3-debloat-home`.

---

## Where We Are At (Current State)

### 1. Target Hardware & Root Persistence
- **TV Model**: LG `OLED65G3PUA` (`webOS 25` / firmware `10.3.0-2504`, `sdkVersion: 10.3.0`)
- **LAN Address**: the TV sits on its own quarantined VLAN; pass its address as `<tv-ip>` to every tool (the defaults in `tools/` are set per machine, not committed as yours).
- **SSAP Client Key**: Saved locally in `<tv-ip>.key` (gitignored) (paired; no TV prompt required on subsequent runs)
- **Root & Persistence**:
  - Rooted via `com.webos.service.jsserver/run` privilege escalation (`wolfdenOS.py` -> `wwwroot/index.html` -> `wwwroot/autoroot.sh`).
  - Homebrew Channel (`org.webosbrew.hbchannel` `v0.7.3`) installed & elevated (`/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service`).
  - Persistent boot hook symlinked at `/var/lib/webosbrew/init.d/49-g3-debloat-home` -> `/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh`.

### 2. The wolfdenOS Home Screen (`tld.wolfdenos.qmlhome`)
- A `"type": "qml"` app at
  `/media/developer/apps/usr/palm/applications/tld.wolfdenos.qmlhome`, run by
  `/usr/bin/qml-runner` as root, unjailed, ~200ms to the screen.
- `general.defaultApps.home` in settingsservice points at it, asserted by
  `apply.sh` on every boot. HOME from any app, including LG's Home, opens it
  through `launchDefaultApp {"category":"home"}`.
- Live video background (`home-bg.mp4`, hardware video plane) with an OLED
  idle guard (still after 2 min, black with a drifting dim clock after 5),
  12-hour clock and date top right, a neutral glass dock of four apps plus
  an All Apps tile, and an All Apps grid. Tiles are the app's own artwork edge
  to edge. Apps come live from SAM's `listLaunchPoints` subscription.
- BACK closes All Apps and is otherwise a no-op; EXIT is swallowed. The home
  screen never quits itself (NOTES.md, "things that cost real time", says why).
- **The old web launcher (`tld.wolfdenos.home`, `launcher/`) is not
  installed.** `WOLFDEN_INSTALL_LAUNCHER=0` in `debloat_home.sh` closes,
  removes and unpins it on deploy. The source and `tools/dev_launcher.py` are
  kept for reference; the feature list below is what it had.
- **Legacy launcher UI & Remote Navigation** (not installed):
  - Deep purplish-black OLED ambient gradient (`#1e0b36` -> `#0c0414` -> `#05020a`) with frosted glass dock (`backdrop-filter: blur(24px)`).
  - **15 Real Installed User Apps** on the main dock (with crisp monochrome SVG brand icons + native webOS `file://` icon fallback):
    1. `youtube.leanback.v4` (`YouTube`)
    2. `com.disney.disneyplus-prod` (`Disney+`)
    3. `hulu` (`Hulu`)
    4. `com.apple.appletv` (`Apple TV`)
    5. `com.wbd.stream` (`HBO Max`)
    6. `amazon` (`Prime Video`)
    7. `com.cbs-all-access.webapp.prod` (`Paramount+`)
    8. `com.crunchyroll.webapp` (`Crunchyroll`)
    9. `com.peacock.tv` (`Peacock`)
    10. `com.microsoft.xbox` (`Xbox`)
    11. `com.tubitv.ott.tubi` (`Tubi`)
    12. `com.plutotv.app` (`Pluto TV`)
    13. `com.movenetworks.app.sling-tv-sling-production` (`Sling TV`)
    14. `tv.orka.lgtv` (`OrkaTV`)
    15. `org.webosbrew.hbchannel` (`Homebrew Channel`)
  - **Top-Right 3 Minimalist Glass Buttons**:
    1. **Background Theme Cycle**: Cycles between Purplish Nebula, Deep Amethyst, and Pure OLED Black.
    2. **All Apps Drawer**: Opens a glass modal drawer of all installed apps (`listLaunchPoints` + `tv-launchpoints.json` snapshot) to toggle apps onto or off the main dock.
    3. **Rearrange & Delete Mode**: Also triggered by holding **OK (`Enter`) for 650ms** on any dock tile (`Left`/`Right` moves the app, `Down` removes it from the dock, `OK`/`Back` saves to `localStorage`).

### 3. Native LG Home (`com.webos.app.home`) Core Modifications (`wolf OS`)
- **Non-Destructive RAM Bind-Mount Overlay**:
  - Copies `/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets` to `/tmp/weboshome-merged` and bind-mounts it over `assets` (and `/tmp/weboshome-merged/i18n` over `/usr/palm/applications/com.webos.app.home/resources`).
- **Stock LG Banner Image Removed**:
  - Overwrites `images/{hd,2k,4k}/bg_banner_img.png` and `*banner*.png` / `*default*.png` with a 1×1 pitch-black PNG (`black.png`).
- **Offline / Promo Text Replaced with `wolf OS`**:
  - Dereferences the `i18n` symlink and rewrites `"Enjoy the device's smart functions by connecting to a network."`, `"Start a new experience with webOS"`, and related banner strings across all locale JSON files to **`"wolf OS"`**.
- **Promo & Ad Apps Masked, Not Removed**:
  - `/usr` is a read-only overlay over squashfs, so nothing in
    `/usr/palm/applications` can be deleted (`dev/remove` only reaches apps
    under `/media/developer`). `mask_bloat_apps` bind-mounts an empty directory
    over 21 promo and ad app directories instead, which leaves them
    unlaunchable but still registered with SAM. `prune_launch_points` removes
    their tiles. See "Day 3" in NOTES.md for what this does and does not achieve.
- **Ad, LivePlus ACR & Telemetry Sinkhole**:
  - Bind-mounts `/tmp/hosts.slopbro` over `/etc/hosts`, blocking the LG ad,
    SmartClip, Yume, LivePlus ACR, `rdx2` and OTA update domains over both
    IPv4 and IPv6.
- **Connectivity check answered locally**:
  - LG's probe host no longer exists, so the TV reported itself offline and the
    Home screen drew the no-network banner over everything. A local responder
    plus a `connman` config override fixes it. See "Day 3" in NOTES.md.

---

## How It Is Built and Deployed

- `qmlhome/` is the home screen: `appinfo.json`, `main.qml`, `Tile.qml`,
  icons. `tools/build_ipk.py qmlhome -o wwwroot/wolfdenos-qmlhome.ipk
  --exclude splash.png` packages it (needed only when `appinfo.json`
  changes); `tools/push_qmlhome.py` pushes the `.qml` files straight onto the
  TV and relaunches, which is the dev loop. The background video and still
  (`wwwroot/home-bg.mp4`, `home-bg-still.jpg`, gitignored third-party art)
  are served at deploy time and copied into the app directory by `apply.sh`.
- `launcher/` holds the retired web launcher as ordinary files (`index.html`,
  `appinfo.json`, `launcher-config.json`, icons, `splash.png`). Earlier
  revisions duplicated the HTML inside a heredoc in `debloat_home.sh`; do not
  reintroduce that, it drifts.
- `tools/build_launcher_ipk.py` packages `launcher/` into
  `wwwroot/wolfdenos.ipk` (not installed while `WOLFDEN_INSTALL_LAUNCHER=0`).
  `tools/build_icon.py` generates the app icon, and
  `tools/build_banner.py` builds LG's own Home banner assets -- pass
  `--image <picture>` for a seasonal background and `--crop-y` to choose which
  band of it survives the crop into those wide strips.
  `tools/patch_libapp.py` rewrites strings inside LG's compiled Flutter
  library. (`tools/build_overlay_ipk.py` belongs to the abandoned overlay; see
  "Dead End: The Home-Screen Overlay" in NOTES.md.)
- `tools/dev_launcher.py` serves `launcher/` on the laptop with a
  `PalmServiceBridge` stub backed by the real launch-point snapshot. It was
  the web launcher's dev loop; the QML home has `push_qmlhome.py` instead.
- `python3 wolfdenOS.py --debug --webos-version 10 <ip>` deploys. The payload
  POSTs its own stdout back to the laptop (`--log-wait` holds the server open),
  which is the only reason any of the findings in NOTES.md were discoverable.
- `tools/tv_shell.py` runs a command on the TV over Homebrew Channel's telnet
  port and prints the output, and `--pull` copies a file back. A deploy is
  minutes; this is seconds, and it is how everything in NOTES.md's "Day 3" was
  found. Deploys still go through `wolfdenOS.py` -- this is for looking.

  ```sh
  python3 tools/tv_shell.py 'mount | grep /usr'
  python3 tools/tv_shell.py --pull /tmp/shot.png -o shot.png
  ```

  Two things make it work at all, both learned the hard way. The telnet tty
  truncates input lines past a couple of hundred characters, so the script is
  sent as short base64 chunks and reassembled on the TV. And a script piped
  into `sh` inherits the spent pipe as stdin, which makes `luna-send` exit 0
  with no reply -- it has to run from a file with stdin closed.

---

## The Native Home Screen (`qmlhome/`)

wolfdenOS is now a native QML app that *is* the TV's home screen. LG's Home is
untouched and still installed underneath; the TV is simply told to open ours.

### How the OS was repointed

`com.webos.app.home` is `"type": "flutter"` -- there is no binary to swap, a
system runner (`/usr/bin/flutter-client`) loads its Dart snapshot. And SAM does
**not** re-read `appinfo.json`: a bind-mounted copy with the title changed to
`HomeProbe` still came back as `Home`. So editing LG's manifest is a dead end.

What works is the switch LG uses for its own Senior Home. `com.webos.app.home`
and `com.webos.app.seniorhome` both carry `"appCategory": ["home"]`, and the
compositor's QML (`StarfishHomeView.qml`) opens the home screen with:

```
luna://com.webos.applicationManager/launchDefaultApp  {"category":"home"}
```

The default is settable, and persists as `general.defaultApps.home` in
settingsservice:

```
luna://com.webos.applicationManager/setDefaultApp  {"category":"home","appId":"tld.wolfdenos.qmlhome"}
```

(The schema is in `/etc/palm/schemas/sam/applicationManager.setDefaultApp.schema`;
`"id"` is rejected, it is `"appId"`.) `apply.sh` asserts this on every boot,
and every exit path that gives up on the modifications -- the USB kill switch,
the three-strike counter, `--revert` -- hands HOME back to `com.webos.app.home`
first. A home app that cannot start would otherwise stay the home app across
power cycles. The failure mode is shallow regardless: if ours exits, SAM falls
back to LG's.

### Why QML

`"type": "qml"` is a first-class app type here: Qt 5.12 with QtWayland, LG's
own `Eos.Window` / `WebOSServices` modules, and a `qml-runner` that handles the
Wayland shell. A dev-installed QML app runs **as root, unjailed**
(`/proc/<pid>/root` is `/`), and reaches the screen in ~200ms. The whole
launch chain was proven with a 25-line test card before this was written.

Rust is viable on this box too -- `armv7-unknown-linux-gnueabi` cross-linked
with `zig cc -target arm-linux-gnueabi.2.35` ran first try (`glibc 2.35`,
soft-float, `/lib/ld-linux.so.3`) -- but a Rust *UI* means speaking
`wl_webos_shell` and EGL yourself. The protocol is two small interfaces
(public, Apache-2.0, in `webosose/webos-wayland-extensions`), so it is
tractable, just weeks of plumbing before a tile. QML gives the launcher's data
layer for free. Rust's place, if it earns one, is a native luna service behind
the UI.

### The dev loop

```sh
python3 tools/push_qmlhome.py --capture shot.png
```

pushes `qmlhome/*.qml` into the app directory over telnet, relaunches the home
app, and prints qml-runner's warnings. Seconds, against minutes for a deploy.

**Deploys need `--log-wait` of about 240 now** (the default). The TV pulls
the ipk, the patched library, the background video and the home's media
through the laptop's server during that window; one deploy with `60` ended
before the TV reached the QML home's ipk, the app was simply absent
afterwards, and `apply.sh`'s failsafe quietly handed HOME back to LG. Nothing
in the laptop's output said why -- the TV's remaining log lines had nowhere to
go either.
`appinfo.json` changes still need a deploy (`tools/build_ipk.py qmlhome -o
wwwroot/wolfdenos-qmlhome.ipk`, then `wolfdenOS.py`).

The live background is `wwwroot/home-bg.mp4` (1080p, no audio) with
`home-bg-still.jpg` as the idle fallback; both are served at deploy time and
copied into the app directory by `apply.sh`, since `dev/install` wipes it.

---

## Safety: `apply.sh` Runs on Every Boot

A bad change re-applies itself at startup, so a power cycle does not clear it.
There are two escapes, both verified on the device, neither needing SSH or a
working Home screen:

1. **USB kill switch.** Put an empty file named `wolfden-disable` at the top
   level of a USB stick and plug it in. All modifications are skipped that boot.
   *Make this stick before experimenting.*
2. **Boot-failure counter.** The count in `/media/internal/.wolfden/incomplete_boots`
   is incremented before any work and cleared only when the script finishes.
   After three incomplete runs it stops applying and logs the file to delete.

The `libapp.so` bind-mount additionally verifies the patched file is byte-identical
in size to the stock library, at both download and mount, and discards it
otherwise.

Recovery note: deploys run through `com.webos.app.adoverlayex`, not the Home
app, so a fix can still be pushed with the Home screen broken.

**Which is exactly why that app must never be masked.** It was in the first
version of `mask_bloat_apps` -- it is an ad overlay, it looked like bloat --
and masking worked perfectly: the next deploy sat on *"waiting for TV to pull
all payload files"* forever, because the staging app it launches had no
`index.html` any more. Nothing in the deploy output says why. The TV was only
recoverable because telnet was open; without it the only way back would have
been the USB kill switch. Masking anything on the recovery path turns a
reversible change into a one-way door, and the list in `apply.sh` carries a
comment saying so.

---

## Replacing the Home App: Done

The idea this section used to describe -- bind-mount our own manifest over
`/usr/palm/applications/com.webos.app.home/` -- was tried and does not work:
SAM caches manifests at boot and ignored the mount. What worked instead is
`setDefaultApp`, documented in "The Native Home Screen" above. The LG Home
patches (banner, strings, `libapp.so`) still apply and still matter, because
LG's Home is what every escape hatch returns to.

What is actually next, none of it started:

- BACK on the dock could return to the app HOME was pressed from (needs the
  previous foreground app; SAM's relaunch params do not carry it).
- A `keepAlive`/`defaultWindowType: "home"` experiment for the QML app, so a
  relaunch is a show rather than a start.
- `general.lastAppHandlerPolicy` (currently `idleApp`) is the setting SAM
  subscribes to for its last-app fallback; whether a value exists that makes
  the fallback respect `defaultApps.home` is untested.

---
## Lab notebook

Everything that broke, why, and what finally worked lives in
[NOTES.md](NOTES.md): SAM registration, the web-app sandbox, the Flutter
reverse engineering, the two days of persistence pitfalls, the connectivity
probe, the QML home's gotchas, the banner measurement, the overlay dead end
and the follow-up notes. Read it before touching the device.
