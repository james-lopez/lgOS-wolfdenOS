# SlopBro G3 Studio — LG OLED65G3PUA (`webOS 25 / 10.3.0-2504`)

This repository integrates [`throwaway96/slopbro`](https://github.com/throwaway96/slopbro) with a tailored **webOS 25 (`10.3.0-2504`) Home Speedup, Debloat & Privacy Suite** and a **Next.js Control & Preview Studio** pre-configured for **LG OLED65G3PUA (`192.168.97.141`)**.

---

## What It Does on Your `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)

1. **Root & Homebrew Channel via `slopbro.py`**:
   - Connects to `192.168.97.141` over SSAP (`wss://192.168.97.141:3001`), launches a privileged system WAM app (`com.webos.app.adoverlayex` / `adoverlay`), downloads the payload to `/media/internal/downloads`, and uses the `com.webos.service.jsserver/run` exploit (with `/usr/palm/services/com.palm.service.devmode` patch bypass) to run `autoroot.sh` as `uid=0(root)`.
   - Installs & elevates **Homebrew Channel** (`org.webosbrew.hbchannel`) and automatically executes `wwwroot/debloat_home.sh`.

2. **Speeds Up & Debloats the webOS 25 (10.3.0) Flutter Home Menu**:
   - On webOS 25 (`10.3.0`), `com.webos.app.home` is a **Flutter** application whose layout is driven by `/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets/home.xml`.
   - `debloat_home.sh` builds a non-destructive RAM overlay in `/tmp/weboshome-merged` and bind-mounts it over the read-only SquashFS assets directory:
     - Strips `<item id="recommendedShelf"/>` (the 531px dynamic recommendation/ad shelf).
     - Strips `<item id="qcardList"/>` (the Q-Card bloat strip above the app bar).
     - Sets `globalline` and `quickGuide` to `0x0` (positioned after `herobanner` so the Flutter layout never black-screens).
     - Dereferences the `i18n` locale symlink and blanks out the promotional hero text (`"Start a new experience with webOS."`, `"Go to Apps"`).
     - Replaces `bg_banner_img.png` (`hd`, `2k`, `4k`) with a 67-byte `1x1` pure pitch-black PNG for zero OLED pixel wear and instant Home rendering.
   - Alternatively, you can switch to **Custom Home Takeover** mode (`tld.my.customhome`) which intercepts the physical `HOME` key (`code 773`) and boots into a clean OLED launcher.

3. **Kills Ads, LivePlus ACR (Screen Spyware), & Telemetry**:
   - Bind-mounts `/etc/hosts` sinkholing 28 LG ad, SmartClip, Yume, LivePlus ACR, RDX2 analytics, and OTA firmware update domains to `0.0.0.0`.
   - Forces `livePlus: "off"`, `homePromotion: "off"`, `homeAutoLaunch: "off"`, and `personalizedAd: "off"` via `luna://com.webos.settingsservice/setSystemSettings`.
   - Terminates background ad/telemetry daemons (`com.webos.app.adoverlay`, `com.webos.app.adoverlayex`, `com.webos.app.acroverlay`, `rdxd`).

4. **Remaps Sponsored Magic Remote Buttons (webOS 25 Compatible)**:
   - Installs Syspoke's `lginputhook v1.5.0` (`inputhookpp` backend required for webOS 24/25) and configures `/home/root/.config/lginputhook/keybinds.json` using `uinput_code` (`1037` Netflix, `1039` Prime, `1047` Disney+, `1043` LG Channels, `1125`, `1126`).

5. **100% Reversible & Failsafe**:
   - Persists across reboots via `/var/lib/webosbrew/init.d/49-g3-debloat-home`.
   - Never modifies the signed SquashFS root partition on disk. Run with `--revert` at any time to unmount overlays and return to stock webOS.

---

## Quick Start

### 1. Run the Web Configurator & Live TV Preview Studio

```bash
npm install
npm run dev -- -p 43188
```

Open `http://127.0.0.1:43188` to preview the `OLED65G3PUA` screen layout (Debloated vs. Stock webOS 25), toggle optimizations, customize remote buttons, or download the standalone single-file script.

### 2. Run `slopbro.py` Against `192.168.97.141` (From Any Machine on Your LAN)

```bash
python3 slopbro.py --debug --webos-version 10 192.168.97.141
```

Or use the single-file packed bundle (which embeds `index.html`, `autoroot.sh`, `package.json`, `main.js`, and your customized `debloat_home.sh` inside a single Python script with zero external files):

```bash
make dist
python3 dist/slopbro_packed.py --debug --webos-version 10 192.168.97.141
```

### 3. Already Rooted with SSH Enabled? Apply or Update Directly

```bash
ssh root@192.168.97.141 "sh -s" < wwwroot/debloat_home.sh
```

To revert all Home/hosts overlays back to factory stock:

```bash
ssh root@192.168.97.141 "/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert"
```

---

## Running Tests

```bash
python3 -m unittest discover -s tests -v
```
