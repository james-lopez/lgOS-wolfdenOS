# lgOS-wolfdenOS (`github.com/james-lopez/lgOS-wolfdenOS`)

A plug-and-play **wolfdenOS** custom launcher & **wolf OS** core patcher for **LG `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)**, built on [`throwaway96/slopbro`](https://github.com/throwaway96/slopbro).

---

## Quick Start (Deploy to TV over LAN)

Run from your macOS **Terminal** (which has macOS Local Network permission for `192.168.97.x`):

```bash
python3 wolfdenOS.py --debug --webos-version 10 192.168.97.141
```

To query all currently installed launch points and apps directly from the TV over SSAP:

```bash
python3 tools/list_tv_apps.py 192.168.97.141
```

To iterate on the launcher UI without deploying (strongly preferred):

```bash
python3 tools/dev_launcher.py
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
- **LAN Address**: `192.168.97.141` (`living.room.lg.lan`)
- **SSAP Client Key**: Saved locally in `192.168.97.141.key` (paired; no TV prompt required on subsequent runs)
- **Root & Persistence**:
  - Rooted via `com.webos.service.jsserver/run` privilege escalation (`wolfdenOS.py` -> `wwwroot/index.html` -> `wwwroot/autoroot.sh`).
  - Homebrew Channel (`org.webosbrew.hbchannel` `v0.7.3`) installed & elevated (`/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/elevate-service`).
  - Persistent boot hook symlinked at `/var/lib/webosbrew/init.d/49-g3-debloat-home` -> `/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh`.

### 2. Custom `wolfdenOS` Purplish Horizontal Glass Dock (`tld.wolfdenos.home`)
- Installed as a native webOS web application at:
  - `/media/developer/apps/usr/palm/applications/tld.wolfdenos.home` (Primary — titled **`wolf OS`** with an 80×80 vibrant purple `W` icon `#6d28d9`, pinned at **`index: 0`** on the default LG Home screen app bar so it is always visible on power-on/power-off or when returning to the default LG screen).
  - `/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod` (Mirror — titled **`wolfdenOS`**).
- **UI & Remote Navigation**:
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
- **8 System Bloat Apps Stripped**:
  - Removed via `luna://com.webos.appInstallService/dev/remove` and `luna://com.webos.applicationManager/removeLaunchPoint`, and filtered from `INTERNAL_STUBS`:
    - `amazon.alexa.view` (`Alexa`)
    - `com.webos.app.sportsteamsettings` (`Sports Portal`)
    - `com.webos.app.homeconnect` (`Home Hub`)
    - `com.webos.app.lifeonscreen` (`Always Ready`)
    - `com.webos.app.browser` (`Web Browser`)
    - `com.webos.app.mediadiscovery` (`Media Player`)
    - `com.webos.app.camera` (`Camera`)
    - `com.webos.app.multiviewsettings` (`Multi View`)
- **Ad, LivePlus ACR & Telemetry Sinkhole**:
  - Bind-mounts `/tmp/hosts.slopbro` over `/etc/hosts` blocking 28 LG ad, SmartClip, Yume, LivePlus ACR, `rdx2`, and OTA update domains.

---

## How the Launcher Is Built and Deployed

- `launcher/` holds the wolf OS app as ordinary files (`index.html`,
  `appinfo.json`, `launcher-config.json`, icons, `splash.png`). This is the
  single source of truth. Earlier revisions duplicated the HTML inside a
  heredoc in `debloat_home.sh`; do not reintroduce that, it drifts.
- `tools/build_launcher_ipk.py` packages `launcher/` into
  `wwwroot/wolfdenos.ipk`. `tools/build_icon.py` and `tools/build_banner.py`
  generate artwork. `tools/patch_libapp.py` rewrites strings inside LG's
  compiled Flutter library.
- `tools/dev_launcher.py` serves `launcher/` on the laptop with a
  `PalmServiceBridge` stub backed by the real launch-point snapshot, so the UI
  can be iterated in a browser without deploying. **Use this.** A deploy cycle
  is minutes; a reload is instant.
- `python3 wolfdenOS.py --debug --webos-version 10 <ip>` deploys. The payload
  POSTs its own stdout back to the laptop (`--log-wait` holds the server open),
  which is the only reason any of the findings below were discoverable.

---

## Findings: Things That Cost Hours

### Registering an app with SAM

**Copying an app directory into `/media/developer/apps` does not install it.**
SAM keeps its own registry. `dev/listApps` ignores the directory, `getAppInfo`
answers "Invalid appId", and `launch` returns `-101 "not exist"`. The only route
is `luna://com.webos.appInstallService/dev/install` with a real `.ipk`, which is
how `autoroot.sh` installs Homebrew Channel. This is an API boundary, not a
permissions problem; root does not help.

**`"trustLevel": "trusted"` in `appinfo.json` silently prevents registration.**
This was the single hardest bug in the project. The ipk installed, files
unpacked, `dev/install` answered `state: "installed"` — and SAM still refused to
register the app. Homebrew Channel ships no `trustLevel` at all and registers as
`"default"`. Removing the field fixed it immediately. There is no error message
anywhere; the only symptom is an app that does not exist.

**The ipk `control` file needs `Installed-Size`.** Without it, appinstalld
reports `unpackFileSize: 0`, `totalSize: 0` and unpacks nothing, while still
answering `state: "installed"`. Match the field set of a known-good ipk.

**`state: "installed"` is not proof of anything.** Always verify with
`getAppInfo` and check `returnValue`. The installer lies in at least two
distinct failure modes.

**`moveLaunchPoint` takes `position`, not `index`.** On webOS 25 `index` is
rejected as `errorCode 2 "invalid parameters"`, with a correct `launchPointId`.

**`"handlesRelaunch": true` makes the Home tile appear dead.** webOS sends a
relaunch event rather than foregrounding the app; if nothing handles it, nothing
happens. Set it `false` unless you actually implement the handler.

### Web app sandbox

**A webOS web app cannot load `file://` paths outside its own directory.**
`listLaunchPoints` returns real filesystem paths
(`/media/cryptofs/apps/.../icon.png`) and they are correct, but the app cannot
read them. `apply.sh` copies each app's artwork to `icons/<id>.png` inside the
app directory, and the launcher loads them relatively.

**`dev/install` replaces the app directory.** Anything `apply.sh` copies in
(icons, `bg.mp4`) must be restored after every install, which is why `apply.sh`
re-copies them on each boot.

### The native Home app (`com.webos.app.home`)

**`/usr` is read-only.** Confirmed by `mount`: `/` is squashfs `ro`, `/usr` is a
read-only overlay. All modifications are RAM bind-mounts re-applied each boot by
`apply.sh` — nothing is written in place.

**The banner text is not in the i18n JSON.** "Enjoy the device's smart functions
by connecting to a network." and the "Network Settings" button label are
compiled into `lib/libapp.so`. Every `sed` against the locale files was a no-op.
`grep -rl` finds the string in the library; `grep -abo` on the TV reports zero
offsets because of busybox's binary handling, so analysis has to happen off the
device (see the upload endpoint).

**Patching `libapp.so` is safe only at identical byte length.** The Dart AOT
snapshot stores each string as `[4-byte LE length][ASCII]`, where the length is
a Smi — the character count shifted left by one (62 chars -> `0x7c`, 16 ->
`0x20`, 34 -> `0x44`, all verified). Shrinking the declared length would move
every object after it and desync the snapshot. `tools/patch_libapp.py` keeps the
length field untouched and pads the replacement with spaces, split evenly either
side so centred text stays centred. It verifies the length field matches before
writing and refuses if the file size changes.

**Flutter AOT cannot be decompiled to source.** There is no JADX equivalent and
cannot be; the source-level structure is not in the binary. `blutter` recovers
class and method names and annotated arm64 assembly, which tells you *which*
function draws something — changing it still means patching machine code, and it
breaks on every firmware update. Older LG firmware does not help: different
Dart/Flutter versions use different snapshot formats.

**Banner assets are wide strips, not 16:9, and differ per directory.**
Measured: `bg_banner_img_network.png` is 1264x326 (hd), 1746x450 (2k), 3492x900
(4k). A single 1920x1080 replacement always crops. `build_banner.py` generates
one file per measured size and `apply.sh` picks by reading the PNG IHDR header.

**Do not glob `*banner*`, `*default*` or `*bg_*`.** Those also match
`bg_banner_settings`, `bg_banner_tv_guide`, `bg_banner_user_guide`, `bg_hdmi`,
`bg_input`, `bg_livetv`, `bg_qcard_*`, `bg_quickguide*` and `bg_wowcast` —
stamping the wordmark across Settings, the TV guide and every input tile. Only
`bg_banner_img{,_wee,_network,_network_wee}.png` are the home banners.

### Backgrounds, time and the network

**A wrong system clock breaks TLS.** The TV was six hours off local (no timezone
explains that), and every HTTPS request produced "server certificate has
expired / check current time setting" (`-201`). Setting the time manually fixed
it. Check the *date*, not just the time.

**YouTube embeds cannot work here (`error 153`).** The launcher runs from a
`file://` origin with no valid HTTP referrer, and the embed refuses it. This is
a property of the embed, not a setting. Use a local file: `bg.mp4` is copied
into the app directory and played by a muted looping `<video>`. No network, no
certificates, no branding overlays.

**`ssap://system.launcher/close` is `403` for remote clients.** To restart a
wedged app, use `luna://com.webos.applicationManager/closeByAppId` as root.

**The LG Content Store ("Apps") was removed, not fixed.** It failed with
"network unstable" even after unblocking its backends
(`ibs.lgappstv.com`, `us.lgtvsdp.com`, `lgtvcommon.com` and others) while
keeping 22 ad/ACR hosts sinkholed. Whether the sinkhole was ever the cause was
never established. If you want the store back, bisect `hosts.block` properly
rather than assuming.

### UI bugs worth remembering

**Rebuilding the DOM on every keypress kills both animation and scrolling.**
The dock used to `innerHTML = ""` and recreate every tile per arrow press, then
call smooth `scrollIntoView` on a brand-new node. Fresh elements have no prior
state, so CSS transitions never ran, and the in-flight scroll restarted from a
relaid-out row — the "not snappy" feel and the sideways shift. Structure is now
rebuilt only when the dock contents change; navigation only moves a class.

**Only call `scrollIntoView` when the row actually overflows.** Calling it on a
dock that already fits still nudges the container.

**A cache signature must include everything that is rendered.** The dock
signature was `id` only. The fallback list and the real launch points share the
same ids, so when the real artwork arrived the signature was unchanged, the dock
was never rebuilt, and every tile kept its placeholder glyph. Icon path is now
part of the signature.

---

## Reverse Engineering the Home App: What We Learned

### The target is not what Flutter tooling expects

```
kernel   : aarch64 (Linux 5.4.268 ptl4tv)
userland : 32-bit ARM, soft-float (armel)
loader   : /lib/ld-linux.so.3        (armhf would be ld-linux-armhf.so.3)
snapshot : d20a1be77c3d3c41b2a5accaee1ce549
flags    : product, arm, linux, no-compressed-pointers, null-safety
```

A 64-bit kernel running a 32-bit userland. This single fact closes most of the
published tooling:

- **blutter does not work.** It ships only `CodeAnalyzer_arm64.cpp` and
  `Disassembler_arm64.cpp`, and its architecture detection asserts on anything
  that is not AArch64 or x64. Check the target architecture *before* building
  it; the build is long and the answer is in the ELF header.
- **Frida has no armel server.** Releases carry `linux-armhf`,
  `linux-armhf-musl`, `arm64`, `arm64be` and `armbe8`, but no soft-float arm.
  The static `arm64-musl` server might run on the aarch64 kernel, but Frida
  injects an agent matching the *target* process, and the Home app is 32-bit.
- Published Flutter RE write-ups assume arm64 Android. The object-pool register
  details in them (X27/X15) do not transfer.

Do not take `libapp.so`'s own ELF flags as the system ABI: it is emitted by
`gen_snapshot` and describes that output. Pull a real system binary
(`/bin/busybox`) and read its interpreter instead.

### LG did not obfuscate

The snapshot carries 1,608 unique Dart source paths, 695 of them LG's own:

```
package:home/homewidgets/
  recommendedshelves 229   app_list 122   qcardList 69   herobanner 49
  globalline 30   recent_apps 30   options_popup 24   quickguide 22
```

State is Riverpod. `herobanner/lscall/` holds the Luna Service calls
(`admanager_api.dart`, `hero_banner_api.dart`, `screen_status_api.dart`), and
`herobanner/config/dimens_config/` plus `text_style_config/` hold layout and
typography as data rather than code.

### The native plugins are not where the action is

`com.webos.app.home/lib/` contains `libplover_platform_webos_plugin.so`,
`libvideo_player_webos_plugin.so`, `libflutter_ilib_plugin.so`,
`libwebos_plugin_interface.so` and `libfastdev_quickjs_runtime.so`. They are
unstripped ordinary ARM ELF libraries, but each exports a single
`*RegisterWithRegistrar` symbol and contains **zero** `luna://` strings: they
are generated Flutter MethodChannel scaffolding. Build paths leak
`git/build/webos/arm/release` and `git/webos/flutter/ephemeral`, i.e. LG
maintains its own webOS Flutter embedder. There is no `libflutter.so` here.

### Finding real strings, not log text

The 89 unique `luna://` URIs live in the Dart snapshot. **Most occurrences of a
given URI are inside log messages**, e.g. `[AdManagerApi] luna://...`, where the
preceding bytes are ASCII rather than a length field.

Only an occurrence whose preceding 4-byte Smi equals `len * 2` is a real string
object the code calls. `requestBannerInfoWithoutContextIndex` has one real
object and five embedded in log text. A naive find-and-replace corrupts debug
strings and leaves the actual call site untouched. `tools/patch_libapp.py`
selects by header and refuses anything ambiguous — which is why it correctly
declined `handleClickBanner`, whose only occurrences are log text.

URIs are stored whole, not concatenated: the bare service name and bare method
name have no standalone objects of their own.

### Ads are disabled at the source

Four endpoints are rewritten to same-length URIs under a service that does not
exist, so the calls fail instead of fetching:

```
requestBannerInfoWithoutContextIndex   @3213140   71 bytes
sendImpressionTracker                  @3145420   56 bytes
launchCMPApp                           @2688028   47 bytes
requestAssetClickInfo                  @3368548   56 bytes
```

This is more surgical than the DNS sinkhole, which is what broke the Content
Store. `com.webos.service.homelaunchpoints` has 11 endpoints if the app row is
ever worth the same treatment.

---

## Pitfalls Found the Hard Way (Day 2)

**Never `rm` a file that is a bind-mount source.** Deleting
`${MOD_DIR}/libapp.so` and re-downloading it orphans the inode the mount points
at: the mount keeps serving the old, unlinked copy while the new file sits at
the same path as a different inode. The symptoms are baffling —
`cmp` reports a permanent difference, `umount` says *target is busy* because the
Home app has the old inode mapped, and `mount --bind` fails with *ENOENT*
because the original source is gone. Overwrite in place instead
(`cat new > target`), which preserves the inode so a live mount picks the new
bytes up immediately. Stop the Home app first; it has the library mapped.

**A stale mount needs a real reboot.** Once a bind-mount is wedged, nothing
clears it but dropping the mount table. QuickStart+ means powering off with the
remote suspends to RAM and does *not* reboot the kernel. `apply.sh` has a
`WOLFDEN_REBOOT_AFTER_DEPLOY` one-shot for this; leave it at `0`.

**A looping `<video>` suppresses the screen saver.** Continuous media playback
keeps webOS awake, so the dock stayed lit all night — a burn-in risk on OLED.
The launcher now pauses the video after 2 minutes idle so the TV's own saver
can engage, and blacks the panel out itself at 5 minutes with a drifting dim
clock. Note `energySaving` reads `off` on this TV.

**Deploys need the network in both directions.** The TV downloads the payload
from the laptop and POSTs its logs back, so laptop-to-TV reachability is not
enough. Across VLANs the TV could not reach `laptop:8080` and the deploy hung
at "launching stage". `nc -z` reporting a port open proves only that something
completed a TCP handshake, not that a session works.

**`--log-wait` must outlast `apply.sh`.** Setting it to 25s closed the log
server mid-run and lost everything `apply.sh` printed, including the reason a
step failed. 60–90s is a safer floor.

**The SSAP handshake can time out on a healthy TV.** `--connect-timeout` exists
for this; 60s gets through when the default 10s does not. This happens
on-subnet too, so it is not purely a latency effect.

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

---

## Next Step: Replacing the Home App

The remaining idea is to stop patching LG's Home screen and replace it: bind-mount
a directory over `/usr/palm/applications/com.webos.app.home/` containing our own
`appinfo.json` (`type: web`) and the launcher HTML, so the HOME button opens
wolfdenOS directly. That gives full layout control with no binary patching.

Two unknowns: SAM caches app type and metadata, so switching a native app to a
web app may not take without a SAM restart or cache clear; and if it does not
take, there is no Home screen until the next deploy. Attempt it with the USB
kill switch already made.

---

## Pitfalls & Notes for Follow-Up Sessions

### 1. `com.webos.service.jsserver` Service-Slot Persistence & QuickStart+ Standby
- **Symptom**: Running `python3 wolfdenOS.py ...` a second or third time shows `GET /autoroot.sh 200` and `GET /debloat_home.sh 200` in the Python HTTP log, but the new script changes do not take effect on the TV even after powering off/on with the remote.
- **Root Cause**:
  1. LG OLED TVs with **QuickStart+** enabled do not reboot the Linux kernel when powered off/on with the remote; they enter suspend-to-RAM standby.
  2. Upstream `wwwroot/main.js` had `//process.exit(0);` commented out, so the Node.js service spawned by `luna://com.webos.service.jsserver/run` stayed alive in RAM. Once a `fakeServicePath` (e.g., `/usr/palm/services/com.palm.service.devmode`) is already running in `jsserver`, subsequent `/run` calls using that same service path do not spawn a new `main.js` process.
- **Fix Implemented**:
  - Enabled `process.exit(0)` in `wwwroot/main.js`.
  - Updated `wwwroot/index.html` to invoke **both** `luna://org.webosbrew.hbchannel.service/exec` (which runs `/bin/sh /media/internal/downloads/debloat_home_<runStamp>.sh` directly as root via Homebrew Channel) **and** `luna://com.webos.service.jsserver/run` across 3 distinct service paths (`com.webos.service.secondscreen.gateway`, `com.palm.service.locale`, `com.palm.service.devmode`).
  - Added `(sleep 2; pkill -f "run-js-service-no-cgroup" 2>/dev/null || true) &` at the end of `apply.sh` to free any lingering `jsserver` slots.

### 2. `flock` File Descriptor Inheritance Blocking Subsequent Runs
- **Symptom**: `autoroot.sh` exits immediately with exit code `2` (`Another instance of this script is currently running`) on all subsequent runs.
- **Root Cause**: `create_lockfile '/tmp/autoroot.lock'` opened FD `200` (`exec 200>"/tmp/autoroot.lock"`) and acquired an exclusive kernel `flock`. Any background daemon started later in the script (`startup.sh &`, `home-guard.sh &`, `inputhook`) inherited open FD `200`, holding `/tmp/autoroot.lock` locked indefinitely in the kernel even after `autoroot.sh` exited and unlinked the path.
- **Fix Implemented**: Removed `flock` on `/tmp/autoroot.lock`, unlinked `/tmp/autoroot.lock` at startup, and switched to per-run timestamped scripts (`autoroot_<runStamp>.sh` and `debloat_home_<runStamp>.sh`).

### 3. Magic Remote `HOME` Button (`keycode 773`) Deadlock with `lginputhook`
- **Symptom**: Pressing the physical `HOME` button on the Magic Remote does nothing at all.
- **Root Cause**: Installing `org.webosbrew.inputhook` (`lginputhook`) with keycode `773` mapped in `/home/root/.config/lginputhook/keybinds.json` swallows raw keycode `773` at the `/dev/input` layer on webOS 25 (`10.3.0-2504`), preventing webOS from receiving native `HOME` presses.
- **Fix Implemented**: Removed `lginputhook` installation and added `pkill -9 -f inputhook`, `pkill -9 -f home-guard`, and `rm -rf /home/root/.config/lginputhook` at the very top of both `autoroot.sh` and `debloat_home.sh` so the physical `HOME` button always works 100% natively.

### 4. Invisible Fallback Tile on Default LG Home Screen (`1×1` Black PNG Cache)
- **Symptom**: `tld.slopbro.g3mod` appeared in `tv-launchpoints.json` (at the far right of the launch bar), but was invisible on the default LG Home screen.
- **Root Cause**: `debloat_home.sh` originally used `generate_black_png` (a 1×1 pitch-black pixel) for both `bg_banner_img.png` and `${MOD_DIR}/icon.png`. Furthermore, webOS SAM (`com.webos.applicationManager`) caches launch point icons by `launchPointId`.
- **Fix Implemented**:
  - Kept `black.png` strictly for blanking out `bg_banner_img.png`.
  - Created `generate_wolf_icon_png` (an 80×80 vibrant purple `#6d28d9` PNG with a white `W` emblem).
  - Registered a fresh app ID `tld.wolfdenos.home` (`title: "wolf OS"`), removed the old `tld.slopbro.g3mod_default` launch point, called `luna://com.webos.applicationManager/dev/listApps`, and moved `tld.wolfdenos.home_default` to **`index: 0`** via `luna://com.webos.applicationManager/moveLaunchPoint`.

### 5. Staging Overlay `Error Code -102` (`Check Network Connection`)
- **Symptom**: After the Python script finishes on the laptop, the TV shows a `Check Network Connection (Error -102)` screen with `Retry` and `Exit App` buttons.
- **Root Cause**: `wolfdenOS.py` opens the staging page in `com.webos.app.adoverlayex` pointing to the laptop's temporary HTTP server. When `wolfdenOS.py` exits, the HTTP server shuts down; if `com.webos.app.adoverlayex` remains open or reloads, Chromium shows `-102` (`ERR_CONNECTION_REFUSED`).
- **Fix Implemented**: `apply.sh` and `wwwroot/index.html` cleanly close `com.webos.app.adoverlayex` (`luna://com.webos.applicationManager/closeByAppId` + `window.close()`) and immediately launch `tld.wolfdenos.home`.

### 6. Flutter `i18n` Symlink & Apostrophe Variants in `com.webos.app.home`
- **Symptom**: Stock banner image is gone, but `"Enjoy the device's smart functions by connecting to a network."` still appears.
- **Root Cause**:
  1. `/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets/i18n` is a symlink to `/usr/palm/applications/com.webos.app.home/resources`.
  2. The apostrophe in `device's` can be ASCII `'` or UTF-8 right single quotation mark `’`.
- **Fix Implemented**: Dereference `i18n` with `readlink -f`, copy the real JSON files into `/tmp/weboshome-merged/i18n`, bind-mount over both `assets` and `resources`, and use `sed -i 's/Enjoy the device[^"]*network[^"]*/wolf OS/g'`.

### 7. macOS Local Network Permission (`Errno 65: No route to host`)
- **Symptom**: Running `python3 wolfdenOS.py 192.168.97.141` from inside a sandboxed IDE child process fails with `OSError: [Errno 65] No route to host`.
- **Root Cause**: macOS Sequoia/Tahoe grants Local Network (`192.168.x.x`) socket permissions per parent application bundle; `Terminal.app` has permission while sandboxed IDE helper processes do not.
- **Workaround**: Always run `python3 wolfdenOS.py --debug --webos-version 10 192.168.97.141` directly from your macOS **Terminal**.
