import { NextResponse } from "next/server";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

export interface SidebarAppItem {
  id: string;
  name: string;
  subtitle: string;
  category: "Streaming" | "Media Server" | "Gaming & Inputs" | "System";
  accentColor: string;
  iconKey: string;
  enabled: boolean;
}

export interface G3ModConfig {
  repoName: string;
  githubOwner: string;
  tvIp: string;
  tvModel: string;
  webosVersion: string;
  localIpOverride: string;
  debug: boolean;
  curlInsecure: boolean;
  fakeServicePath: string;
  launcherTheme: {
    activeSeason: "fall-pumpkin" | "winter-aurora" | "midnight-oled" | "custom";
    greetingTitle: string;
    greetingSubtitle: string;
    ambientParticles: boolean;
    turnOnAnimation: boolean;
    sidebarPosition: "left" | "right";
    sidebarStyle: "frosted-glass" | "pure-oled";
    autoHideSidebarSec: number;
    customWallpaperUrl: string;
  };
  sidebarApps: SidebarAppItem[];
  homeLayout: {
    mode: "sidebar-launcher" | "stock-debloated";
    removeRecommendedShelf: boolean;
    removeQCardList: boolean;
    hideGlobalLine: boolean;
    hideQuickGuide: boolean;
    blankPromoText: boolean;
    oledBlackBanner: boolean;
    heroBannerHeight: number;
    appListHeight: number;
  };
  privacy: {
    blockAdHosts: boolean;
    disableLivePlusAcr: boolean;
    disableHomePromotion: boolean;
    disableHomeAutoLaunch: boolean;
    disablePersonalizedAds: boolean;
    killAdOverlays: boolean;
    killRdxdTelemetry: boolean;
    blockOtaUpdates: boolean;
  };
  bloatware: {
    removeLgChannels: boolean;
    removeShopTime: boolean;
    removeFubo: boolean;
    removeRakuten: boolean;
    removeSportsAlert: boolean;
  };
  keybinds: {
    installInputHook: boolean;
    mappings: Record<
      string,
      {
        buttonName: string;
        uinputCode: string;
        action: "unchanged" | "disable" | "launch";
        targetAppId: string;
      }
    >;
  };
}

export const DEFAULT_SIDEBAR_APPS: SidebarAppItem[] = [
  {
    id: "org.webosbrew.youtube.leanback.v4",
    name: "YouTube AdFree",
    subtitle: "4K HDR · SponsorBlock · 0 Ads",
    category: "Streaming",
    accentColor: "#f97316",
    iconKey: "youtube",
    enabled: true,
  },
  {
    id: "netflix",
    name: "Netflix",
    subtitle: "Dolby Vision · Atmos",
    category: "Streaming",
    accentColor: "#ef4444",
    iconKey: "netflix",
    enabled: true,
  },
  {
    id: "org.jellyfin.webos",
    name: "Jellyfin",
    subtitle: "Local Direct Play · 192.168.97.x",
    category: "Media Server",
    accentColor: "#a855f7",
    iconKey: "jellyfin",
    enabled: true,
  },
  {
    id: "cdp-30",
    name: "Plex",
    subtitle: "Cinema Library · TrueHD",
    category: "Media Server",
    accentColor: "#f59e0b",
    iconKey: "plex",
    enabled: true,
  },
  {
    id: "com.disney.disneyplus-prod",
    name: "Disney+",
    subtitle: "IMAX Enhanced · 4K",
    category: "Streaming",
    accentColor: "#3b82f6",
    iconKey: "disney",
    enabled: true,
  },
  {
    id: "amazon",
    name: "Prime Video",
    subtitle: "UHD HDR10+",
    category: "Streaming",
    accentColor: "#06b6d4",
    iconKey: "prime",
    enabled: true,
  },
  {
    id: "spotify-beehive",
    name: "Spotify",
    subtitle: "Lossless eARC Audio",
    category: "Streaming",
    accentColor: "#22c55e",
    iconKey: "spotify",
    enabled: true,
  },
  {
    id: "com.webos.app.hdmi1",
    name: "HDMI 1 · PlayStation 5",
    subtitle: "4K 120Hz · VRR · ALLM",
    category: "Gaming & Inputs",
    accentColor: "#6366f1",
    iconKey: "gamepad",
    enabled: true,
  },
  {
    id: "com.limelight.webos",
    name: "Moonlight GameStream",
    subtitle: "PC 4K 120fps · 0.8ms Decode",
    category: "Gaming & Inputs",
    accentColor: "#eab308",
    iconKey: "moonlight",
    enabled: true,
  },
  {
    id: "org.webosbrew.hbchannel",
    name: "Homebrew Channel",
    subtitle: "Root Services & System Mods",
    category: "System",
    accentColor: "#ec4899",
    iconKey: "homebrew",
    enabled: true,
  },
];

export const DEFAULT_G3_CONFIG: G3ModConfig = {
  repoName: "lgOS-getSlopped",
  githubOwner: "james-lopez",
  tvIp: "192.168.97.141",
  tvModel: "OLED65G3PUA",
  webosVersion: "10.3.0-2504 (webOS 25)",
  localIpOverride: "",
  debug: true,
  curlInsecure: false,
  fakeServicePath: "/usr/palm/services/com.palm.service.devmode",
  launcherTheme: {
    activeSeason: "fall-pumpkin",
    greetingTitle: "Autumn Harvest on G3 OLED",
    greetingSubtitle: "Cozy Fall & Pumpkin Ambience · Instant Sidebar Navigation",
    ambientParticles: true,
    turnOnAnimation: true,
    sidebarPosition: "left",
    sidebarStyle: "frosted-glass",
    autoHideSidebarSec: 15,
    customWallpaperUrl: "",
  },
  sidebarApps: DEFAULT_SIDEBAR_APPS,
  homeLayout: {
    mode: "sidebar-launcher",
    removeRecommendedShelf: true,
    removeQCardList: true,
    hideGlobalLine: true,
    hideQuickGuide: true,
    blankPromoText: true,
    oledBlackBanner: false,
    heroBannerHeight: 1803,
    appListHeight: 248,
  },
  privacy: {
    blockAdHosts: true,
    disableLivePlusAcr: true,
    disableHomePromotion: true,
    disableHomeAutoLaunch: true,
    disablePersonalizedAds: true,
    killAdOverlays: true,
    killRdxdTelemetry: true,
    blockOtaUpdates: true,
  },
  bloatware: {
    removeLgChannels: true,
    removeShopTime: true,
    removeFubo: true,
    removeRakuten: true,
    removeSportsAlert: true,
  },
  keybinds: {
    installInputHook: true,
    mappings: {
      netflix: {
        buttonName: "Netflix",
        uinputCode: "1037",
        action: "launch",
        targetAppId: "org.webosbrew.youtube.leanback.v4",
      },
      prime: {
        buttonName: "Prime Video",
        uinputCode: "1039",
        action: "launch",
        targetAppId: "org.jellyfin.webos",
      },
      disney: {
        buttonName: "Disney+",
        uinputCode: "1047",
        action: "launch",
        targetAppId: "cdp-30",
      },
      lgchannels: {
        buttonName: "LG Channels",
        uinputCode: "1043",
        action: "disable",
        targetAppId: "",
      },
      sling: {
        buttonName: "Sling / Partner 1",
        uinputCode: "1125",
        action: "disable",
        targetAppId: "",
      },
      alexa: {
        buttonName: "Alexa / Partner 2",
        uinputCode: "1126",
        action: "launch",
        targetAppId: "com.limelight.webos",
      },
    },
  },
};

export function generateHomeXml(cfg: G3ModConfig["homeLayout"]): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<home version="2.0">`,
    `<layout windowType="overlay" pageType="none" pageCount="1" defaultPage="0">`,
    `<page pageBodyType="container">`,
    `<item id="margin" itemWidth="3840" itemHeight="0" focusType="none"/>`,
    `<item id="container" hasChildren="true" itemWidth="3840" itemHeight="${cfg.heroBannerHeight}" focusType="scope">`,
    `<item id="herobanner" itemWidth="3840" itemHeight="${cfg.heroBannerHeight}" focusType="scope" autoFocus="false"/>`,
  ];

  if (cfg.hideGlobalLine) {
    lines.push(
      `<item id="globalline" itemWidth="0" itemHeight="0" focusType="scope" autoFocus="false"/>`
    );
  } else {
    lines.push(
      `<item id="globalline" itemWidth="3840" itemHeight="140" focusType="scope" autoFocus="false"/>`
    );
  }

  lines.push(`</item>`);

  if (!cfg.removeQCardList) {
    lines.push(
      `<item id="qcardList" itemWidth="3840" itemHeight="310" focusType="scope" autoFocus="false"/>`
    );
  }

  lines.push(
    `<item id="margin" itemWidth="3840" itemHeight="50" focusType="none"/>`
  );
  lines.push(
    `<item id="appList" itemWidth="3840" itemHeight="${cfg.appListHeight}" focusType="scope" autoFocus="true"/>`
  );

  if (!cfg.removeRecommendedShelf) {
    lines.push(
      `<item id="recommendedShelf" itemWidth="3840" itemHeight="531" focusType="scope" autoFocus="false"/>`
    );
  }

  lines.push(
    `<item id="margin" itemWidth="3840" itemHeight="48" focusType="none"/>`
  );

  if (cfg.hideQuickGuide) {
    lines.push(
      `<item id="quickGuide" itemX="0" itemY="0" itemWidth="0" itemHeight="0" focusType="none"/>`
    );
  } else {
    lines.push(
      `<item id="quickGuide" itemX="0" itemY="0" itemWidth="3840" itemHeight="120" focusType="scope"/>`
    );
  }

  lines.push(`</page>`, `</layout>`, `</home>`);
  return lines.join("\n");
}

export function generateKeybindsJson(cfg: G3ModConfig["keybinds"]): string {
  const obj: Record<string, { action: string; id?: string }> = {};
  for (const item of Object.values(cfg.mappings)) {
    if (item.action === "disable") {
      obj[item.uinputCode] = { action: "ignore" };
    } else if (item.action === "launch" && item.targetAppId) {
      obj[item.uinputCode] = { action: "launch", id: item.targetAppId };
    }
  }
  return JSON.stringify(obj, null, 2);
}

export function generateDebloatScript(cfg: G3ModConfig): string {
  const homeXml = generateHomeXml(cfg.homeLayout);
  const keybindsJson = generateKeybindsJson(cfg.keybinds);
  const enabledSidebarApps = (cfg.sidebarApps || DEFAULT_SIDEBAR_APPS).filter(
    (a) => a.enabled
  );

  const bloatIds: string[] = [];
  if (cfg.bloatware.removeShopTime) bloatIds.push("com.lgshop.app");
  if (cfg.bloatware.removeLgChannels) bloatIds.push("com.webos.app.lgchannels");
  if (cfg.bloatware.removeFubo) bloatIds.push("love.fubo");
  if (cfg.bloatware.removeRakuten) bloatIds.push("com.rakuten.tv");
  if (cfg.bloatware.removeSportsAlert)
    bloatIds.push("com.webos.app.sportsalert");

  const lunaOptionSettings: Record<string, string> = {};
  if (cfg.privacy.disableLivePlusAcr) lunaOptionSettings.livePlus = "off";
  if (cfg.privacy.disableHomePromotion)
    lunaOptionSettings.homePromotion = "off";
  if (cfg.privacy.disableHomeAutoLaunch)
    lunaOptionSettings.homeAutoLaunch = "off";
  if (cfg.privacy.disablePersonalizedAds)
    lunaOptionSettings.personalizedAd = "off";

  return `#!/bin/sh
# ==============================================================================
# lgOS-getSlopped (${cfg.githubOwner}/${cfg.repoName})
# Built on SlopBro for LG ${cfg.tvModel} (${cfg.webosVersion})
# Target IP: ${cfg.tvIp}
# Active Theme: ${cfg.launcherTheme.activeSeason} ("${cfg.launcherTheme.greetingTitle}")
# Sidebar Apps (${enabledSidebarApps.length}): ${enabledSidebarApps.map((a) => a.name).join(", ")}
#
# Plug-and-Play SquashFS Bind-Mount Overlay + Sidebar Launcher Configuration:
# Rebooting in failsafe mode or running with --revert cleanly restores stock OS.
# ==============================================================================

set -e

MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
INITD_DIR="/var/lib/webosbrew/init.d"
INITD_LINK="\${INITD_DIR}/49-g3-debloat-home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
LOG_FILE="/tmp/slopbro-debloat.log"

if [ "\${1}" = "--revert" ] || [ "\${1}" = "--uninstall" ]; then
    echo "[*] Reverting all lgOS-getSlopped customizations..."
    rm -f "\${INITD_LINK}"
    umount "\${FLUTTER_ASSETS}" 2>/dev/null || true
    umount /etc/hosts 2>/dev/null || true
    rm -rf /tmp/weboshome-merged /tmp/hosts.slopbro
    pkill -f com.webos.app.home 2>/dev/null || true
    echo "[+] Reverted to stock webOS."
    exit 0
fi

log() {
    msg="[\$(date '+%H:%M:%S')] \${1}"
    echo "\${msg}"
    echo "\${msg}" >> "\${LOG_FILE}"
}

toast() {
    payload="\$(printf '{"sourceId":"com.webos.service.secondscreen.gateway","message":"<h3>lgOS-getSlopped</h3>%s"}' "\${1}")"
    luna-send -w 1000 -n 1 -a 'com.webos.service.secondscreen.gateway' 'luna://com.webos.notification/createToast' "\${payload}" >/dev/null 2>&1 || true
}

log "Applying lgOS-getSlopped (${cfg.tvModel} · ${cfg.webosVersion})..."
mkdir -p "\${MOD_DIR}/assets/images/hd" \\
         "\${MOD_DIR}/assets/images/2k" \\
         "\${MOD_DIR}/assets/images/4k" \\
         "\${MOD_DIR}/assets/i18n" \\
         "\${INITD_DIR}"

# Save sidebar & seasonal theme manifest for custom launcher & overlay
cat > "\${MOD_DIR}/launcher-config.json" << 'THEME_EOF'
${JSON.stringify(
  {
    theme: cfg.launcherTheme,
    sidebarApps: enabledSidebarApps,
  },
  null,
  2
)}
THEME_EOF

# 1. Write customized Flutter home.xml
cat > "\${MOD_DIR}/assets/home.xml" << 'EOF'
${homeXml}
EOF

# 1b. Generate background banner asset
generate_black_png() {
    printf '\\211PNG\\r\\n\\032\\n\\000\\000\\000\\rIHDR\\000\\000\\000\\001\\000\\000\\000\\001\\010\\002\\000\\000\\000\\220wS\\336\\000\\000\\000\\014IDATx\\234c\`\`\`\\000\\000\\000\\004\\000\\001\\366\\0278U\\000\\000\\000\\000IEND\\256B\`\\202' > "\${1}"
}
${
  cfg.homeLayout.oledBlackBanner
    ? `generate_black_png "\${MOD_DIR}/assets/images/hd/bg_banner_img.png"
generate_black_png "\${MOD_DIR}/assets/images/2k/bg_banner_img.png"
generate_black_png "\${MOD_DIR}/assets/images/4k/bg_banner_img.png"`
    : "# Seasonal Fall & Pumpkin hero wallpaper enabled"
}

# 2. Write /etc/hosts Ad, ACR & Telemetry sinkhole
cat > "\${MOD_DIR}/hosts.block" << 'EOF'
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
${
  cfg.privacy.blockOtaUpdates
    ? `0.0.0.0 snu.lge.com
0.0.0.0 su.lge.com
0.0.0.0 su-ssl.lge.com`
    : ""
}
EOF

# 3. Write persistent boot script (\${MOD_DIR}/apply.sh)
cat > "\${MOD_DIR}/apply.sh" << 'APPLY_EOF'
#!/bin/sh
MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"

${
  cfg.privacy.blockAdHosts
    ? `# A. Bind-mount /etc/hosts sinkhole
if [ -f "\${MOD_DIR}/hosts.block" ]; then
    umount /etc/hosts 2>/dev/null || true
    cp /etc/hosts /tmp/hosts.slopbro
    grep -q "lgOS-getSlopped" /tmp/hosts.slopbro || cat "\${MOD_DIR}/hosts.block" >> /tmp/hosts.slopbro
    mount --bind /tmp/hosts.slopbro /etc/hosts 2>/dev/null || true
fi`
    : "# Hosts sinkhole disabled"
}

# B. Bind-mount stripped webOS 10.3.0 Flutter Home assets
if [ -d "\${FLUTTER_ASSETS}" ]; then
    umount "\${FLUTTER_ASSETS}" 2>/dev/null || true
    rm -rf /tmp/weboshome-merged
    mkdir -p /tmp/weboshome-merged
    cp -R --no-dereference "\${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/

    ${
      cfg.homeLayout.blankPromoText
        ? `if [ -L /tmp/weboshome-merged/i18n ]; then
        REAL_I18N="\$(readlink -f "\${FLUTTER_ASSETS}/i18n" 2>/dev/null || true)"
        rm -f /tmp/weboshome-merged/i18n
        mkdir -p /tmp/weboshome-merged/i18n
        if [ -n "\${REAL_I18N}" ] && [ -d "\${REAL_I18N}" ]; then
            cp -R "\${REAL_I18N}"/* /tmp/weboshome-merged/i18n/ 2>/dev/null || true
            for f in /tmp/weboshome-merged/i18n/*.json; do
                [ -f "\$f" ] || continue
                sed -i 's/"Start a new experience with webOS.": "[^"]*"/"Start a new experience with webOS.": ""/g' "\$f" 2>/dev/null || true
                sed -i 's/"Go to Apps": "[^"]*"/"Go to Apps": ""/g' "\$f" 2>/dev/null || true
            done
        fi
    fi`
        : ""
    }

    cp "\${MOD_DIR}/assets/home.xml" /tmp/weboshome-merged/home.xml
    if [ -f /tmp/weboshome-merged/home_layoutShelfView.xml ]; then
        ${
          cfg.homeLayout.removeRecommendedShelf
            ? `sed -i '/<item id="recommendedShelf"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true`
            : ""
        }
        ${
          cfg.homeLayout.removeQCardList
            ? `sed -i '/<item id="qcardList"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true`
            : ""
        }
    fi

    ${
      cfg.homeLayout.oledBlackBanner
        ? `cp -R "\${MOD_DIR}/assets/images"/. /tmp/weboshome-merged/images/ 2>/dev/null || true`
        : ""
    }

    mount --bind /tmp/weboshome-merged "\${FLUTTER_ASSETS}"
    pkill -f com.webos.app.home 2>/dev/null || true
fi

${
  Object.keys(lunaOptionSettings).length > 0
    ? `# C. Enforce Luna privacy & home settings
luna-send -n 1 'luna://com.webos.settingsservice/setSystemSettings' '{"category":"option","settings":${JSON.stringify(
        lunaOptionSettings
      )}}' >/dev/null 2>&1 || true`
    : ""
}

${
  cfg.privacy.killAdOverlays
    ? `for proc in com.webos.app.adoverlay com.webos.app.adoverlayex com.webos.app.acroverlay; do
    pkill -f "\${proc}" 2>/dev/null || true
done`
    : ""
}

${
  cfg.privacy.killRdxdTelemetry
    ? `pkill -f rdxd 2>/dev/null || true`
    : ""
}
APPLY_EOF

chmod +x "\${MOD_DIR}/apply.sh"
ln -sf "\${MOD_DIR}/apply.sh" "\${INITD_LINK}"

${
  bloatIds.length > 0
    ? `# 4. Remove selected promotional bloatware apps
for bloat_id in ${bloatIds.join(" ")}; do
    luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' "{\\"id\\":\\"\${bloat_id}\\",\\"subscribe\\":false}" >/dev/null 2>&1 || true
done`
    : ""
}

${
  cfg.keybinds.installInputHook
    ? `# 5. Install Syspoke lginputhook v1.5.0 (for webOS 25 / 10.3.0) & write keybinds.json
IH_IPK="/tmp/lginputhook_1.5.0.ipk"
curl -k -sSL -o "\${IH_IPK}" "https://github.com/Syspoke/lginputhook/releases/download/V1.5.0/org.webosbrew.inputhook_1.5.0_all.ipk" && \\
luna-send -w 30000 -n 1 'luna://com.webos.appInstallService/dev/install' "{\\"id\\":\\"org.webosbrew.inputhook\\",\\"ipkUrl\\":\\"\${IH_IPK}\\",\\"subscribe\\":true}" >/dev/null 2>&1 || true
rm -f /tmp/inputhook "\${IH_IPK}"
mkdir -p /home/root/.config/lginputhook
cat > /home/root/.config/lginputhook/keybinds.json << 'KEYBINDS_EOF'
${keybindsJson}
KEYBINDS_EOF
luna-send -n 1 -a org.webosbrew.inputhook luna://org.webosbrew.inputhook.service/start '{}' >/dev/null 2>&1 || true`
    : ""
}

sh "\${MOD_DIR}/apply.sh"
log "lgOS-getSlopped optimization complete!"
toast "Fall Harvest Home &amp; Privacy Armor active!"
`;
}

export async function GET() {
  const configFile = path.join(process.cwd(), "wwwroot", "g3-config.json");
  let config = DEFAULT_G3_CONFIG;
  try {
    const raw = await fs.readFile(configFile, "utf-8");
    const parsed = JSON.parse(raw);
    config = {
      ...DEFAULT_G3_CONFIG,
      ...parsed,
      launcherTheme: {
        ...DEFAULT_G3_CONFIG.launcherTheme,
        ...(parsed.launcherTheme || {}),
      },
      sidebarApps: parsed.sidebarApps || DEFAULT_SIDEBAR_APPS,
    };
  } catch {
    // use defaults
  }

  const debloatShPath = path.join(process.cwd(), "wwwroot", "debloat_home.sh");
  let debloatScript = "";
  try {
    debloatScript = await fs.readFile(debloatShPath, "utf-8");
  } catch {
    debloatScript = generateDebloatScript(config);
  }

  return NextResponse.json({
    config,
    generatedXml: generateHomeXml(config.homeLayout),
    generatedKeybinds: generateKeybindsJson(config.keybinds),
    debloatScript,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || "save";
    const config: G3ModConfig = {
      ...DEFAULT_G3_CONFIG,
      ...(body.config || {}),
      launcherTheme: {
        ...DEFAULT_G3_CONFIG.launcherTheme,
        ...(body.config?.launcherTheme || {}),
      },
      sidebarApps: body.config?.sidebarApps || DEFAULT_SIDEBAR_APPS,
    };

    const wwwroot = path.join(process.cwd(), "wwwroot");
    const configFile = path.join(wwwroot, "g3-config.json");
    const debloatShPath = path.join(wwwroot, "debloat_home.sh");

    const scriptContent = generateDebloatScript(config);
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), "utf-8");
    await fs.writeFile(debloatShPath, scriptContent, {
      encoding: "utf-8",
      mode: 0o755,
    });

    await new Promise<void>((resolve) => {
      execFile(
        "python3",
        [
          "tools/package_single_file.py",
          "--source",
          "slopbro.py",
          "--files",
          "index.html",
          "autoroot.sh",
          "package.json",
          "main.js",
          "debloat_home.sh",
          "--out",
          "dist/slopbro_packed.py",
        ],
        { cwd: process.cwd() },
        () => resolve()
      );
    });

    if (action === "run-slopbro") {
      const args: string[] = [];
      if (config.debug) args.push("--debug");
      if (config.curlInsecure) args.push("--curl-insecure");
      if (config.localIpOverride && config.localIpOverride.trim()) {
        args.push("--local-ip", config.localIpOverride.trim());
      }
      if (!config.fakeServicePath) {
        args.push("--no-fake-service-path");
      } else if (
        config.fakeServicePath !==
        "/usr/palm/services/com.palm.service.devmode"
      ) {
        args.push("--fake-service-path", config.fakeServicePath);
      }
      args.push("--webos-version", "10");
      args.push(config.tvIp || "192.168.97.141");

      const runResult = await new Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
      }>((resolve) => {
        execFile(
          "python3",
          ["slopbro.py", ...args],
          { cwd: process.cwd(), timeout: 12000 },
          (error, stdout, stderr) => {
            resolve({
              exitCode:
                error && typeof error.code === "number"
                  ? error.code
                  : error
                    ? 1
                    : 0,
              stdout: stdout || "",
              stderr: stderr || "",
            });
          }
        );
      });

      return NextResponse.json({
        saved: true,
        command: `python3 slopbro.py ${args.join(" ")}`,
        runResult,
        generatedXml: generateHomeXml(config.homeLayout),
        generatedKeybinds: generateKeybindsJson(config.keybinds),
        debloatScript: scriptContent,
      });
    }

    return NextResponse.json({
      saved: true,
      generatedXml: generateHomeXml(config.homeLayout),
      generatedKeybinds: generateKeybindsJson(config.keybinds),
      debloatScript: scriptContent,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
