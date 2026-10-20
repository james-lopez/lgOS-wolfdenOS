# lgOS-getSlopped (`github.com/james-lopez/lgOS-getSlopped`)

A plug-and-play LG webOS TV customization & root suite built on [`throwaway96/slopbro`](https://github.com/throwaway96/slopbro).

Designed and pre-configured for **LG `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)**, and built so anyone in the community can clone, customize their own **Sidebar App Launcher**, pick a **Seasonal Turn-On Background** (starting with **Autumn Harvest & Glowing Pumpkins**), strip LG's bloatware/ads/LivePlus ACR telemetry, and deploy with a single command.

---

## Highlights

1. **Seamless Sidebar Navigation (`Quick Apps` Rail)**:
   - Vertical left or right frosted-glass (or pure OLED black) sidebar with instant D-pad `Up` / `Down` / `OK` navigation across your major apps (`YouTube AdFree`, `Netflix`, `Jellyfin`, `Plex`, `Disney+`, `Prime Video`, `Spotify`, `HDMI 1 / PS5`, `Moonlight`, `Homebrew Channel`).
2. **Seasonal Turn-On Experience (Fall & Pumpkin Harvest Edition)**:
   - Welcomes you on TV turn-on with a warm OLED-friendly **Autumn Harvest & Glowing Jack-O'-Lantern** backdrop, floating autumn embers/leaves, time & crisp weather pill, and zero sponsored clutter.
3. **webOS 25 (`10.3.0`) Flutter Home Debloat + Privacy Armor**:
   - Non-destructive RAM bind-mount overlay (`/tmp/weboshome-merged`) over `/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets` removing `recommendedShelf`, `qcardList`, promotional `i18n` text, and `globalline` bloat.
   - OS-level `/etc/hosts` sinkhole blocking 28 LG ad, SmartClip, Yume, LivePlus ACR, `rdx2` telemetry, and OTA firmware update domains.
   - Automatic Magic Remote button remapping via Syspoke's `lginputhook v1.5.0` (`inputhookpp` for webOS 25).
4. **Plug-and-Play Single-File Distribution**:
   - Anyone can customize their sidebar apps, seasonal theme, and privacy toggles in the visual studio or `wwwroot/g3-config.json`, then run `make dist` to generate a single zero-dependency Python file (`dist/slopbro_packed.py`).

---

## Plug-and-Play Quick Start (For Any LG webOS TV)

### Option A: One-Command CLI Run (Over Home Wi-Fi / LAN)

```bash
git clone https://github.com/james-lopez/lgOS-getSlopped.git
cd lgOS-getSlopped
python3 -m pip install websockets
python3 slopbro.py --debug --webos-version 10 192.168.97.141
```

### Option B: Launch the Interactive UI Playground & Customizer First

```bash
npm install
npm run dev -- -p 43188
```

Open `http://127.0.0.1:43188` to:
- Test the **Sidebar + Fall/Pumpkin Turn-On UI** with your keyboard arrow keys or on-screen remote before running anything on your TV.
- Upload or compare side-by-side with an inspiration video.
- Reorder/toggle sidebar apps, customize the seasonal theme, and click **Download Plug-and-Play (`.py`)**.

---

## Instant Revert to Factory Stock

Because all OS modifications use a RAM bind-mount overlay and a `/var/lib/webosbrew/init.d/49-g3-debloat-home` hook without touching the signed SquashFS root partition, you can revert to 100% factory stock at any time:

```bash
ssh root@192.168.97.141 "/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert"
```
