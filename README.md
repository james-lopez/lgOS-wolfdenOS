# lgOS-wolfdenOS (`github.com/james-lopez/lgOS-wolfdenOS`)

A plug-and-play **wolfdenOS** custom launcher & **wolf OS** core patcher for **LG `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)**, built on [`throwaway96/slopbro`](https://github.com/throwaway96/slopbro).

---

## Quick Start (Deploy to TV over LAN)

Run from your macOS **Terminal** (which has macOS Local Network permission for `192.168.97.x`):

```bash
python3 woldenOs.py --debug --webos-version 10 192.168.97.141
```

To query all currently installed launch points and apps directly from the TV over SSAP:

```bash
python3 tools/list_tv_apps.py 192.168.97.141
```

To revert all modifications back to 100% factory stock webOS at any time:

```bash
ssh root@192.168.97.141 "/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert"
```

---

## Where We Are At (Current State)

### 1. Target Hardware & Root Persistence
- **TV Model**: LG `OLED65G3PUA` (`webOS 25` / firmware `10.3.0-2504`, `sdkVersion: 10.3.0`)
- **LAN Address**: `192.168.97.141` (`living.room.lg.lan`)
- **SSAP Client Key**: Saved locally in `192.168.97.141.key` (paired; no TV prompt required on subsequent runs)
- **Root & Persistence**:
  - Rooted via `com.webos.service.jsserver/run` privilege escalation (`woldenOs.py` -> `wwwroot/index.html` -> `wwwroot/autoroot.sh`).
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

## Pitfalls & Notes for Follow-Up Sessions

### 1. `com.webos.service.jsserver` Service-Slot Persistence & QuickStart+ Standby
- **Symptom**: Running `python3 woldenOs.py ...` a second or third time shows `GET /autoroot.sh 200` and `GET /debloat_home.sh 200` in the Python HTTP log, but the new script changes do not take effect on the TV even after powering off/on with the remote.
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
- **Root Cause**: `woldenOs.py` opens the staging page in `com.webos.app.adoverlayex` pointing to the laptop's temporary HTTP server. When `woldenOs.py` exits, the HTTP server shuts down; if `com.webos.app.adoverlayex` remains open or reloads, Chromium shows `-102` (`ERR_CONNECTION_REFUSED`).
- **Fix Implemented**: `apply.sh` and `wwwroot/index.html` cleanly close `com.webos.app.adoverlayex` (`luna://com.webos.applicationManager/closeByAppId` + `window.close()`) and immediately launch `tld.wolfdenos.home`.

### 6. Flutter `i18n` Symlink & Apostrophe Variants in `com.webos.app.home`
- **Symptom**: Stock banner image is gone, but `"Enjoy the device's smart functions by connecting to a network."` still appears.
- **Root Cause**:
  1. `/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets/i18n` is a symlink to `/usr/palm/applications/com.webos.app.home/resources`.
  2. The apostrophe in `device's` can be ASCII `'` or UTF-8 right single quotation mark `’`.
- **Fix Implemented**: Dereference `i18n` with `readlink -f`, copy the real JSON files into `/tmp/weboshome-merged/i18n`, bind-mount over both `assets` and `resources`, and use `sed -i 's/Enjoy the device[^"]*network[^"]*/wolf OS/g'`.

### 7. macOS Local Network Permission (`Errno 65: No route to host`)
- **Symptom**: Running `python3 woldenOs.py 192.168.97.141` from inside a sandboxed IDE child process fails with `OSError: [Errno 65] No route to host`.
- **Root Cause**: macOS Sequoia/Tahoe grants Local Network (`192.168.x.x`) socket permissions per parent application bundle; `Terminal.app` has permission while sandboxed IDE helper processes do not.
- **Workaround**: Always run `python3 woldenOs.py --debug --webos-version 10 192.168.97.141` directly from your macOS **Terminal**.
