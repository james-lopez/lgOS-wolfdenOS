#!/bin/sh
# ==============================================================================
# lgOS-getSlopped (james-lopez/lgOS-getSlopped)
# Built on SlopBro for LG OLED65G3PUA (10.3.0-2504 (webOS 25))
# Target IP: 192.168.97.141
# UI Paradigm: cleanframe-list · Focus: type
# Active Season: fall-pumpkin ("Autumn Harvest on G3 OLED")
# Sidebar Apps (10): YouTube, Netflix, Plex, Jellyfin, Disney+, Spotify, GeForce / Moonlight, Apple TV, Prime Video, HDMI 1 · PS5
#
# Plug-and-Play Custom TV Launcher (tld.slopbro.g3mod) + SquashFS Home Overlay:
# Rebooting in failsafe mode or running with --revert cleanly restores stock OS.
# ==============================================================================

set -e

MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
INITD_DIR="/var/lib/webosbrew/init.d"
INITD_LINK="${INITD_DIR}/49-g3-debloat-home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
LOG_FILE="/tmp/slopbro-debloat.log"

if [ "${1}" = "--revert" ] || [ "${1}" = "--uninstall" ]; then
    echo "[*] Reverting all lgOS-getSlopped customizations..."
    rm -f "${INITD_LINK}"
    umount "${FLUTTER_ASSETS}" 2>/dev/null || true
    umount /etc/hosts 2>/dev/null || true
    rm -rf /tmp/weboshome-merged /tmp/hosts.slopbro
    pkill -f com.webos.app.home 2>/dev/null || true
    echo "[+] Reverted to stock webOS."
    exit 0
fi

log() {
    msg="[$(date '+%H:%M:%S')] ${1}"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

toast() {
    payload="$(printf '{"sourceId":"com.webos.service.secondscreen.gateway","message":"<h3>lgOS-getSlopped</h3>%s"}' "${1}")"
    luna-send -w 1000 -n 1 -a 'com.webos.service.secondscreen.gateway' 'luna://com.webos.notification/createToast' "${payload}" >/dev/null 2>&1 || true
}

log "Applying lgOS-getSlopped (OLED65G3PUA · 10.3.0-2504 (webOS 25))..."
mkdir -p "${MOD_DIR}/assets/images/hd" \
         "${MOD_DIR}/assets/images/2k" \
         "${MOD_DIR}/assets/images/4k" \
         "${MOD_DIR}/assets/i18n" \
         "${INITD_DIR}"

# 0. Write Standalone Custom webOS TV Launcher App (tld.slopbro.g3mod)
cat > "${MOD_DIR}/appinfo.json" << 'APPINFO_EOF'
{
  "id": "tld.slopbro.g3mod",
  "version": "2.0.0",
  "vendor": "lgOS-getSlopped",
  "type": "web",
  "main": "index.html",
  "title": "lgOS-getSlopped Home",
  "icon": "icon.png",
  "transparent": false,
  "handlesRelaunch": true,
  "disableBackHistoryAPI": true
}
APPINFO_EOF

cat > "${MOD_DIR}/index.html" << 'LAUNCHER_HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1920, height=1080, initial-scale=1.0" />
<title>lgOS-getSlopped Custom TV Launcher</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  html, body {
    width: 100vw; height: 100vh; overflow: hidden;
    background: #070403; color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  #stage {
    position: relative; width: 100%; height: 100%;
    display: flex; align-items: stretch; justify-content: space-between;
    padding: 56px 72px;
    background: radial-gradient(circle at 75% 22%, rgba(249,115,22,0.28) 0%, rgba(38,16,5,0.88) 48%, #060302 100%);
  }
  .clock-tl {
    font-size: 46px; font-weight: 300; letter-spacing: 0.04em;
    color: rgba(255,255,255,0.92); margin-bottom: 36px;
  }
  .cleanframe-list {
    display: flex; flex-direction: column; gap: 18px;
  }
  .cf-item {
    display: flex; align-items: center; gap: 22px;
    font-size: 54px; font-weight: 600; letter-spacing: -0.02em;
    color: rgba(255,255,255,0.38); transition: all 0.16s ease;
    cursor: pointer;
  }
  .cf-item.focused {
    color: #ffffff; transform: translateX(8px) scale(1.03);
    text-shadow: 0 8px 32px rgba(249,115,22,0.45);
  }
  .piny-rail {
    display: flex; flex-direction: column; gap: 14px;
  }
  .piny-tile {
    width: 132px; height: 92px; border-radius: 22px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 800; letter-spacing: -0.02em;
    opacity: 0.55; transition: all 0.16s ease;
  }
  .piny-tile.focused {
    opacity: 1; transform: scale(1.06);
    box-shadow: 0 -10px 30px rgba(255,255,255,0.65), 0 12px 32px rgba(0,0,0,0.8);
    outline: 3px solid rgba(255,255,255,0.9);
  }
</style>
</head>
<body>
<div id="stage">
  <div id="left-col">
    <div class="clock-tl" id="clock">9:41</div>
    <div id="app-container"></div>
  </div>
</div>
<script>
  const APPS = [{"id":"org.webosbrew.youtube.leanback.v4","name":"YouTube","subtitle":"AdFree 4K HDR · SponsorBlock","category":"Streaming","accentColor":"#ef4444","tileBgColor":"#ffffff","tileTextColor":"#111111","iconKey":"youtube","enabled":true},{"id":"netflix","name":"Netflix","subtitle":"Dolby Vision · Atmos","category":"Streaming","accentColor":"#e50914","tileBgColor":"#ffffff","tileTextColor":"#e50914","iconKey":"netflix","enabled":true},{"id":"cdp-30","name":"Plex","subtitle":"Cinema Library · TrueHD","category":"Media Server","accentColor":"#e5a00d","tileBgColor":"#1f2326","tileTextColor":"#ffffff","iconKey":"plex","enabled":true},{"id":"org.jellyfin.webos","name":"Jellyfin","subtitle":"Direct Play · 192.168.97.x","category":"Media Server","accentColor":"#a855f7","tileBgColor":"#1b1429","tileTextColor":"#ffffff","iconKey":"jellyfin","enabled":true},{"id":"com.disney.disneyplus-prod","name":"Disney+","subtitle":"IMAX Enhanced · 4K","category":"Streaming","accentColor":"#38bdf8","tileBgColor":"#061539","tileTextColor":"#ffffff","iconKey":"disney","enabled":true},{"id":"spotify-beehive","name":"Spotify","subtitle":"Lossless eARC Audio","category":"Streaming","accentColor":"#1ed760","tileBgColor":"#1ed760","tileTextColor":"#000000","iconKey":"spotify","enabled":true},{"id":"com.limelight.webos","name":"GeForce / Moonlight","subtitle":"PC 4K 120Hz · 0.8ms","category":"Gaming & Inputs","accentColor":"#76b900","tileBgColor":"#1a1c1e","tileTextColor":"#ffffff","iconKey":"moonlight","enabled":true},{"id":"com.apple.appletv","name":"Apple TV","subtitle":"4K Dolby Vision","category":"Streaming","accentColor":"#e4e4e7","tileBgColor":"#18181b","tileTextColor":"#ffffff","iconKey":"appletv","enabled":true},{"id":"amazon","name":"Prime Video","subtitle":"UHD HDR10+","category":"Streaming","accentColor":"#00a8e1","tileBgColor":"#0f172a","tileTextColor":"#ffffff","iconKey":"prime","enabled":true},{"id":"com.webos.app.hdmi1","name":"HDMI 1 · PS5","subtitle":"4K 120Hz · VRR · ALLM","category":"Gaming & Inputs","accentColor":"#6366f1","tileBgColor":"#171926","tileTextColor":"#ffffff","iconKey":"gamepad","enabled":true}];
  const THEME = {"uiParadigm":"cleanframe-list","focusTreatment":"type","materialStyle":"clear-tint","activeSeason":"fall-pumpkin","greetingTitle":"Autumn Harvest on G3 OLED","greetingSubtitle":"CleanFrame Typography + Piny Squircle Sidebar · Fall & Pumpkin Edition","ambientParticles":true,"turnOnAnimation":true,"sidebarPosition":"left","sidebarStyle":"frosted-glass","showContentShelves":false,"oledBrightness":82,"autoHideSidebarSec":15,"customWallpaperUrl":""};
  let idx = 0;

  function updateClock() {
    const d = new Date();
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    document.getElementById("clock").textContent = h + ":" + m;
  }
  setInterval(updateClock, 5000);
  updateClock();

  function launchApp(appId) {
    if (window.webOS && window.webOS.service) {
      window.webOS.service.request("luna://com.webos.applicationManager", {
        method: "launch",
        parameters: { id: appId }
      });
    } else if (window.PalmSystem && window.PalmServiceBridge) {
      const b = new PalmServiceBridge();
      b.call("luna://com.webos.applicationManager/launch", JSON.stringify({ id: appId }));
    }
  }

  function render() {
    const root = document.getElementById("app-container");
    root.className = THEME.uiParadigm === "piny-tiles" ? "piny-rail" : "cleanframe-list";
    root.innerHTML = "";
    APPS.forEach((app, i) => {
      const el = document.createElement("div");
      if (THEME.uiParadigm === "piny-tiles") {
        el.className = "piny-tile" + (i === idx ? " focused" : "");
        el.style.background = app.tileBgColor || "#1f2326";
        el.style.color = app.tileTextColor || "#ffffff";
        el.textContent = app.name;
      } else {
        el.className = "cf-item" + (i === idx ? " focused" : "");
        el.textContent = app.name;
      }
      el.onclick = () => { idx = i; render(); launchApp(app.id); };
      root.appendChild(el);
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.keyCode === 40) {
      idx = (idx + 1) % APPS.length; render();
    } else if (e.key === "ArrowUp" || e.keyCode === 38) {
      idx = (idx - 1 + APPS.length) % APPS.length; render();
    } else if (e.key === "Enter" || e.keyCode === 13) {
      if (APPS[idx]) launchApp(APPS[idx].id);
    }
  });
  render();
</script>
</body>
</html>
LAUNCHER_HTML_EOF

# Save sidebar & seasonal theme manifest
cat > "${MOD_DIR}/launcher-config.json" << 'THEME_EOF'
{
  "theme": {
    "uiParadigm": "cleanframe-list",
    "focusTreatment": "type",
    "materialStyle": "clear-tint",
    "activeSeason": "fall-pumpkin",
    "greetingTitle": "Autumn Harvest on G3 OLED",
    "greetingSubtitle": "CleanFrame Typography + Piny Squircle Sidebar · Fall & Pumpkin Edition",
    "ambientParticles": true,
    "turnOnAnimation": true,
    "sidebarPosition": "left",
    "sidebarStyle": "frosted-glass",
    "showContentShelves": false,
    "oledBrightness": 82,
    "autoHideSidebarSec": 15,
    "customWallpaperUrl": ""
  },
  "sidebarApps": [
    {
      "id": "org.webosbrew.youtube.leanback.v4",
      "name": "YouTube",
      "subtitle": "AdFree 4K HDR · SponsorBlock",
      "category": "Streaming",
      "accentColor": "#ef4444",
      "tileBgColor": "#ffffff",
      "tileTextColor": "#111111",
      "iconKey": "youtube",
      "enabled": true
    },
    {
      "id": "netflix",
      "name": "Netflix",
      "subtitle": "Dolby Vision · Atmos",
      "category": "Streaming",
      "accentColor": "#e50914",
      "tileBgColor": "#ffffff",
      "tileTextColor": "#e50914",
      "iconKey": "netflix",
      "enabled": true
    },
    {
      "id": "cdp-30",
      "name": "Plex",
      "subtitle": "Cinema Library · TrueHD",
      "category": "Media Server",
      "accentColor": "#e5a00d",
      "tileBgColor": "#1f2326",
      "tileTextColor": "#ffffff",
      "iconKey": "plex",
      "enabled": true
    },
    {
      "id": "org.jellyfin.webos",
      "name": "Jellyfin",
      "subtitle": "Direct Play · 192.168.97.x",
      "category": "Media Server",
      "accentColor": "#a855f7",
      "tileBgColor": "#1b1429",
      "tileTextColor": "#ffffff",
      "iconKey": "jellyfin",
      "enabled": true
    },
    {
      "id": "com.disney.disneyplus-prod",
      "name": "Disney+",
      "subtitle": "IMAX Enhanced · 4K",
      "category": "Streaming",
      "accentColor": "#38bdf8",
      "tileBgColor": "#061539",
      "tileTextColor": "#ffffff",
      "iconKey": "disney",
      "enabled": true
    },
    {
      "id": "spotify-beehive",
      "name": "Spotify",
      "subtitle": "Lossless eARC Audio",
      "category": "Streaming",
      "accentColor": "#1ed760",
      "tileBgColor": "#1ed760",
      "tileTextColor": "#000000",
      "iconKey": "spotify",
      "enabled": true
    },
    {
      "id": "com.limelight.webos",
      "name": "GeForce / Moonlight",
      "subtitle": "PC 4K 120Hz · 0.8ms",
      "category": "Gaming & Inputs",
      "accentColor": "#76b900",
      "tileBgColor": "#1a1c1e",
      "tileTextColor": "#ffffff",
      "iconKey": "moonlight",
      "enabled": true
    },
    {
      "id": "com.apple.appletv",
      "name": "Apple TV",
      "subtitle": "4K Dolby Vision",
      "category": "Streaming",
      "accentColor": "#e4e4e7",
      "tileBgColor": "#18181b",
      "tileTextColor": "#ffffff",
      "iconKey": "appletv",
      "enabled": true
    },
    {
      "id": "amazon",
      "name": "Prime Video",
      "subtitle": "UHD HDR10+",
      "category": "Streaming",
      "accentColor": "#00a8e1",
      "tileBgColor": "#0f172a",
      "tileTextColor": "#ffffff",
      "iconKey": "prime",
      "enabled": true
    },
    {
      "id": "com.webos.app.hdmi1",
      "name": "HDMI 1 · PS5",
      "subtitle": "4K 120Hz · VRR · ALLM",
      "category": "Gaming & Inputs",
      "accentColor": "#6366f1",
      "tileBgColor": "#171926",
      "tileTextColor": "#ffffff",
      "iconKey": "gamepad",
      "enabled": true
    }
  ]
}
THEME_EOF

# 1. Write customized Flutter home.xml
cat > "${MOD_DIR}/assets/home.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<home version="2.0">
<layout windowType="overlay" pageType="none" pageCount="1" defaultPage="0">
<page pageBodyType="container">
<item id="margin" itemWidth="3840" itemHeight="0" focusType="none"/>
<item id="container" hasChildren="true" itemWidth="3840" itemHeight="1803" focusType="scope">
<item id="herobanner" itemWidth="3840" itemHeight="1803" focusType="scope" autoFocus="false"/>
<item id="globalline" itemWidth="0" itemHeight="0" focusType="scope" autoFocus="false"/>
</item>
<item id="margin" itemWidth="3840" itemHeight="50" focusType="none"/>
<item id="appList" itemWidth="3840" itemHeight="248" focusType="scope" autoFocus="true"/>
<item id="margin" itemWidth="3840" itemHeight="48" focusType="none"/>
<item id="quickGuide" itemX="0" itemY="0" itemWidth="0" itemHeight="0" focusType="none"/>
</page>
</layout>
</home>
EOF

# 1b. Generate background banner asset
generate_black_png() {
    printf '\211PNG\r\n\032\n\000\000\000\rIHDR\000\000\000\001\000\000\000\001\010\002\000\000\000\220wS\336\000\000\000\014IDATx\234c```\000\000\000\004\000\001\366\0278U\000\000\000\000IEND\256B`\202' > "${1}"
}
generate_black_png "${MOD_DIR}/icon.png"
# Seasonal Fall & Pumpkin hero wallpaper enabled

# 2. Write /etc/hosts Ad, ACR & Telemetry sinkhole
cat > "${MOD_DIR}/hosts.block" << 'EOF'
# === lgOS-getSlopped LG webOS 25 Ad, ACR (LivePlus) & Telemetry Sinkhole ===
0.0.0.0 ad.lgappstv.com
0.0.0.0 ibs.lgappstv.com
0.0.0.0 lgad.cjpowercast.com
0.0.0.0 edgesuite.net.lgappstv.com
0.0.0.0 yumenetworks.com
0.0.0.0 smartclip.net
0.0.0.0 smartclip.com
0.0.0.0 lgtvcommon.com
0.0.0.0 us.lgtvsdp.com
0.0.0.0 us.ibs.lgappstv.com
0.0.0.0 us.info.lgsmartad.com
0.0.0.0 us.ad.lgsmartad.com
0.0.0.0 info.lgsmartad.com
0.0.0.0 ad.lgsmartad.com
0.0.0.0 cdpbeacon.lgtvcommon.com
0.0.0.0 cdpsvc.lgtvcommon.com
0.0.0.0 homeprv.lgtvcommon.com
0.0.0.0 nudge.lgtvcommon.com
0.0.0.0 rdx2.lgtvsdp.com
0.0.0.0 us.rdx2.lgtvsdp.com
0.0.0.0 eu.rdx2.lgtvsdp.com
0.0.0.0 AIC.ngfts.lge.com
0.0.0.0 aic.ngfts.lge.com
0.0.0.0 aic-ngfts.lge.com
0.0.0.0 ngfts.lge.com
0.0.0.0 snu.lge.com
0.0.0.0 su.lge.com
0.0.0.0 su-ssl.lge.com
EOF

# 3. Write persistent boot script (${MOD_DIR}/apply.sh)
cat > "${MOD_DIR}/apply.sh" << 'APPLY_EOF'
#!/bin/sh
MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"

# A. Bind-mount /etc/hosts sinkhole
if [ -f "${MOD_DIR}/hosts.block" ]; then
    umount /etc/hosts 2>/dev/null || true
    cp /etc/hosts /tmp/hosts.slopbro
    grep -q "lgOS-getSlopped" /tmp/hosts.slopbro || cat "${MOD_DIR}/hosts.block" >> /tmp/hosts.slopbro
    mount --bind /tmp/hosts.slopbro /etc/hosts 2>/dev/null || true
fi

# B. Bind-mount stripped webOS 10.3.0 Flutter Home assets
if [ -d "${FLUTTER_ASSETS}" ]; then
    umount "${FLUTTER_ASSETS}" 2>/dev/null || true
    rm -rf /tmp/weboshome-merged
    mkdir -p /tmp/weboshome-merged
    cp -R --no-dereference "${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/

    if [ -L /tmp/weboshome-merged/i18n ]; then
        REAL_I18N="$(readlink -f "${FLUTTER_ASSETS}/i18n" 2>/dev/null || true)"
        rm -f /tmp/weboshome-merged/i18n
        mkdir -p /tmp/weboshome-merged/i18n
        if [ -n "${REAL_I18N}" ] && [ -d "${REAL_I18N}" ]; then
            cp -R "${REAL_I18N}"/* /tmp/weboshome-merged/i18n/ 2>/dev/null || true
            for f in /tmp/weboshome-merged/i18n/*.json; do
                [ -f "$f" ] || continue
                sed -i 's/"Start a new experience with webOS.": "[^"]*"/"Start a new experience with webOS.": ""/g' "$f" 2>/dev/null || true
                sed -i 's/"Go to Apps": "[^"]*"/"Go to Apps": ""/g' "$f" 2>/dev/null || true
            done
        fi
    fi

    cp "${MOD_DIR}/assets/home.xml" /tmp/weboshome-merged/home.xml
    if [ -f /tmp/weboshome-merged/home_layoutShelfView.xml ]; then
        sed -i '/<item id="recommendedShelf"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
        sed -i '/<item id="qcardList"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
    fi

    

    mount --bind /tmp/weboshome-merged "${FLUTTER_ASSETS}"
    pkill -f com.webos.app.home 2>/dev/null || true
fi

# C. Enforce Luna privacy & home settings
luna-send -n 1 'luna://com.webos.settingsservice/setSystemSettings' '{"category":"option","settings":{"livePlus":"off","homePromotion":"off","homeAutoLaunch":"off","personalizedAd":"off"}}' >/dev/null 2>&1 || true

for proc in com.webos.app.adoverlay com.webos.app.adoverlayex com.webos.app.acroverlay; do
    pkill -f "${proc}" 2>/dev/null || true
done

pkill -f rdxd 2>/dev/null || true

# Re-scan developer apps so tld.slopbro.g3mod is registered with SAM
luna-send -n 1 'luna://com.webos.applicationManager/dev/listApps' '{}' >/dev/null 2>&1 || true
APPLY_EOF

chmod +x "${MOD_DIR}/apply.sh"
ln -sf "${MOD_DIR}/apply.sh" "${INITD_LINK}"

# 4. Remove selected promotional bloatware apps
for bloat_id in com.lgshop.app com.webos.app.lgchannels love.fubo com.rakuten.tv com.webos.app.sportsalert; do
    luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' "{\"id\":\"${bloat_id}\",\"subscribe\":false}" >/dev/null 2>&1 || true
done

# 5. Install Syspoke lginputhook v1.5.0 (for webOS 25 / 10.3.0) & write keybinds.json
IH_IPK="/tmp/lginputhook_1.5.0.ipk"
curl -k -sSL -o "${IH_IPK}" "https://github.com/Syspoke/lginputhook/releases/download/V1.5.0/org.webosbrew.inputhook_1.5.0_all.ipk" && \
luna-send -w 30000 -n 1 'luna://com.webos.appInstallService/dev/install' "{\"id\":\"org.webosbrew.inputhook\",\"ipkUrl\":\"${IH_IPK}\",\"subscribe\":true}" >/dev/null 2>&1 || true
rm -f /tmp/inputhook "${IH_IPK}"
mkdir -p /home/root/.config/lginputhook
cat > /home/root/.config/lginputhook/keybinds.json << 'KEYBINDS_EOF'
{
  "773": {
    "action": "launch",
    "id": "tld.slopbro.g3mod"
  },
  "1037": {
    "action": "launch",
    "id": "org.webosbrew.youtube.leanback.v4"
  },
  "1039": {
    "action": "launch",
    "id": "org.jellyfin.webos"
  },
  "1043": {
    "action": "ignore"
  },
  "1047": {
    "action": "launch",
    "id": "cdp-30"
  },
  "1125": {
    "action": "ignore"
  },
  "1126": {
    "action": "launch",
    "id": "com.limelight.webos"
  }
}
KEYBINDS_EOF
luna-send -n 1 -a org.webosbrew.inputhook luna://org.webosbrew.inputhook.service/start '{}' >/dev/null 2>&1 || true

sh "${MOD_DIR}/apply.sh"
log "lgOS-getSlopped optimization complete!"
toast "CleanFrame + Piny Custom Home &amp; Privacy Armor active!"
