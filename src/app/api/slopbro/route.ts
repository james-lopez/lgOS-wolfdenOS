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
  tileBgColor: string;
  tileTextColor: string;
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
    uiParadigm: "horizontal-glass-dock" | "cleanframe-list" | "piny-tiles";
    focusTreatment: "type" | "glass" | "glow";
    materialStyle: "clear-tint" | "frost" | "soft-oled";
    activeSeason:
      | "purplish-nebula"
      | "fall-pumpkin"
      | "misty-autumn-coast"
      | "moody-forest-oled"
      | "midnight-oled";
    greetingTitle: string;
    greetingSubtitle: string;
    ambientParticles: boolean;
    turnOnAnimation: boolean;
    sidebarPosition: "left" | "right";
    sidebarStyle: "frosted-glass" | "pure-oled";
    showContentShelves: boolean;
    oledBrightness: number;
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
    hijackHomeButton: boolean;
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
    id: "youtube.leanback.v4",
    name: "YouTube",
    subtitle: "4K HDR · 60fps",
    category: "Streaming",
    accentColor: "#ef4444",
    tileBgColor: "#ffffff",
    tileTextColor: "#111111",
    iconKey: "youtube",
    enabled: true,
  },
  {
    id: "com.disney.disneyplus-prod",
    name: "Disney+",
    subtitle: "IMAX Enhanced · 4K",
    category: "Streaming",
    accentColor: "#38bdf8",
    tileBgColor: "#061539",
    tileTextColor: "#ffffff",
    iconKey: "disney",
    enabled: true,
  },
  {
    id: "hulu",
    name: "Hulu",
    subtitle: "FX · Originals · Live",
    category: "Streaming",
    accentColor: "#1ce783",
    tileBgColor: "#0b1a14",
    tileTextColor: "#1ce783",
    iconKey: "hulu",
    enabled: true,
  },
  {
    id: "com.apple.appletv",
    name: "Apple TV",
    subtitle: "4K Dolby Vision",
    category: "Streaming",
    accentColor: "#e4e4e7",
    tileBgColor: "#18181b",
    tileTextColor: "#ffffff",
    iconKey: "appletv",
    enabled: true,
  },
  {
    id: "com.wbd.stream",
    name: "HBO Max",
    subtitle: "Dolby Vision · Atmos",
    category: "Streaming",
    accentColor: "#8b5cf6",
    tileBgColor: "#160d2e",
    tileTextColor: "#ffffff",
    iconKey: "hbomax",
    enabled: true,
  },
  {
    id: "amazon",
    name: "Prime Video",
    subtitle: "UHD HDR10+",
    category: "Streaming",
    accentColor: "#00a8e1",
    tileBgColor: "#0f172a",
    tileTextColor: "#ffffff",
    iconKey: "prime",
    enabled: true,
  },
  {
    id: "com.cbs-all-access.webapp.prod",
    name: "Paramount+",
    subtitle: "Peak Streaming · CBS",
    category: "Streaming",
    accentColor: "#0064ff",
    tileBgColor: "#071633",
    tileTextColor: "#ffffff",
    iconKey: "paramount",
    enabled: true,
  },
  {
    id: "com.crunchyroll.webapp",
    name: "Crunchyroll",
    subtitle: "Anime Simulcast · 1080p",
    category: "Streaming",
    accentColor: "#f47521",
    tileBgColor: "#241104",
    tileTextColor: "#ffffff",
    iconKey: "crunchyroll",
    enabled: true,
  },
  {
    id: "com.peacock.tv",
    name: "Peacock",
    subtitle: "NBC · Live Sports & Movies",
    category: "Streaming",
    accentColor: "#facc15",
    tileBgColor: "#141418",
    tileTextColor: "#ffffff",
    iconKey: "peacock",
    enabled: true,
  },
  {
    id: "com.microsoft.xbox",
    name: "Xbox",
    subtitle: "Cloud Gaming · 60fps",
    category: "Gaming & Inputs",
    accentColor: "#107c10",
    tileBgColor: "#0c210c",
    tileTextColor: "#ffffff",
    iconKey: "xbox",
    enabled: true,
  },
  {
    id: "com.tubitv.ott.tubi",
    name: "Tubi",
    subtitle: "Free Movies & TV",
    category: "Streaming",
    accentColor: "#fa382f",
    tileBgColor: "#220918",
    tileTextColor: "#ffffff",
    iconKey: "tubi",
    enabled: true,
  },
  {
    id: "com.plutotv.app",
    name: "Pluto TV",
    subtitle: "Live Channels · On Demand",
    category: "Streaming",
    accentColor: "#fff200",
    tileBgColor: "#141414",
    tileTextColor: "#fff200",
    iconKey: "plutotv",
    enabled: true,
  },
  {
    id: "com.movenetworks.app.sling-tv-sling-production",
    name: "Sling TV",
    subtitle: "Live TV Channels",
    category: "Streaming",
    accentColor: "#0076ff",
    tileBgColor: "#0b192e",
    tileTextColor: "#ffffff",
    iconKey: "sling",
    enabled: true,
  },
  {
    id: "tv.orka.lgtv",
    name: "OrkaTV",
    subtitle: "Installed Channel App",
    category: "Streaming",
    accentColor: "#38bdf8",
    tileBgColor: "#0c1926",
    tileTextColor: "#ffffff",
    iconKey: "orka",
    enabled: true,
  },
  {
    id: "org.webosbrew.hbchannel",
    name: "Homebrew Channel",
    subtitle: "Root Services & Mods",
    category: "System",
    accentColor: "#c084fc",
    tileBgColor: "#27170c",
    tileTextColor: "#ffffff",
    iconKey: "homebrew",
    enabled: true,
  },
  {
    id: "com.webos.app.livetv",
    name: "Live TV",
    subtitle: "Tuner & Antenna",
    category: "Gaming & Inputs",
    accentColor: "#f43f5e",
    tileBgColor: "#1f1218",
    tileTextColor: "#ffffff",
    iconKey: "livetv",
    enabled: false,
  },
  {
    id: "com.webos.app.discovery",
    name: "Apps",
    subtitle: "LG Content Store",
    category: "System",
    accentColor: "#4faa6e",
    tileBgColor: "#0f2417",
    tileTextColor: "#ffffff",
    iconKey: "store",
    enabled: false,
  },
];

export const DEFAULT_G3_CONFIG: G3ModConfig = {
  repoName: "lgOS-wolfdenOS",
  githubOwner: "james-lopez",
  tvIp: "192.168.97.141",
  tvModel: "OLED65G3PUA",
  webosVersion: "10.3.0-2504 (webOS 25)",
  localIpOverride: "",
  debug: true,
  curlInsecure: false,
  fakeServicePath: "/usr/palm/services/com.palm.service.devmode",
  launcherTheme: {
    uiParadigm: "horizontal-glass-dock",
    focusTreatment: "glass",
    materialStyle: "frost",
    activeSeason: "purplish-nebula",
    greetingTitle: "Velvet Twilight on G3 OLED",
    greetingSubtitle: "Horizontal Glass Dock · Installed TV Apps · Hard-Press OK to Reorder/Remove",
    ambientParticles: true,
    turnOnAnimation: true,
    sidebarPosition: "left",
    sidebarStyle: "frosted-glass",
    showContentShelves: false,
    oledBrightness: 88,
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
    oledBlackBanner: true,
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
    installInputHook: false,
    hijackHomeButton: false,
    mappings: {
      home: {
        buttonName: "HOME Button (773) — Native Stock Home (wolf OS)",
        uinputCode: "773",
        action: "unchanged",
        targetAppId: "",
      },
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

export function generateWebosLauncherHtml(cfg: G3ModConfig): string {
  const fallbackApps = (cfg.sidebarApps || DEFAULT_SIDEBAR_APPS).filter(
    (a) => a.enabled
  );
  const fallbackJson = JSON.stringify(fallbackApps);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=1920, height=1080, initial-scale=1.0" />
<title>wolfdenOS — Glass Dock Home</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
  html, body {
    width: 100vw; height: 100vh; overflow: hidden;
    background: #090414; color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  }
  #stage {
    position: relative; width: 100%; height: 100%;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 58px 84px 64px 84px;
    background:
      radial-gradient(circle at 22% 18%, rgba(139, 92, 246, 0.36) 0%, transparent 48%),
      radial-gradient(circle at 78% 28%, rgba(192, 38, 211, 0.28) 0%, transparent 52%),
      radial-gradient(circle at 50% 78%, rgba(109, 40, 217, 0.42) 0%, rgba(30, 11, 58, 0.92) 55%, #070312 100%);
    transition: background 0.6s ease;
  }
  #stage.bg-amethyst {
    background:
      radial-gradient(circle at 65% 22%, rgba(236, 72, 153, 0.32) 0%, transparent 50%),
      radial-gradient(circle at 30% 70%, rgba(124, 58, 237, 0.48) 0%, #090214 75%);
  }
  #stage.bg-midnight {
    background:
      radial-gradient(circle at 50% 60%, rgba(88, 28, 135, 0.38) 0%, #030108 75%);
  }
  /* Subtle ambient glow orbs */
  .orb {
    position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; opacity: 0.55;
  }
  .orb-1 { width: 540px; height: 540px; left: -120px; top: -100px; background: rgba(147, 51, 234, 0.45); }
  .orb-2 { width: 640px; height: 420px; right: -80px; bottom: 80px; background: rgba(192, 38, 211, 0.35); }
  .orb-3 { width: 720px; height: 340px; left: 28%; bottom: -60px; background: rgba(99, 102, 241, 0.35); }

  /* Top Bar: Clock (left) + 3 Minimal Outline Icons (right) */
  .top-bar {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
  }
  .clock {
    font-size: 52px; font-weight: 300; letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.94);
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
  }
  .top-actions {
    display: flex; align-items: center; gap: 22px;
  }
  .top-btn {
    width: 48px; height: 48px; border-radius: 14px;
    border: 1px solid transparent; background: transparent;
    color: rgba(255, 255, 255, 0.65);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.18s ease;
  }
  .top-btn.focused, .top-btn:hover {
    color: #ffffff; background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.32);
    transform: scale(1.08);
  }
  .top-btn svg { width: 28px; height: 28px; stroke-width: 1.75; }

  /* Center Status / Edit Mode Banner */
  .center-stage {
    position: relative; z-index: 10;
    margin: auto; text-align: center;
  }
  .mode-pill {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 12px 26px; border-radius: 999px;
    background: rgba(24, 12, 48, 0.78);
    border: 1px solid rgba(192, 132, 252, 0.45);
    backdrop-filter: blur(20px);
    font-size: 20px; color: #f3e8ff;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
    opacity: 0; transform: translateY(10px); transition: all 0.2s ease;
  }
  .mode-pill.visible { opacity: 1; transform: translateY(0); }

  /* All Apps Drawer Modal */
  #drawer-modal {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(8, 3, 18, 0.86); backdrop-filter: blur(28px);
    display: none; flex-direction: column; padding: 64px 96px;
  }
  #drawer-modal.open { display: flex; }
  .drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 36px;
  }
  .drawer-title { font-size: 36px; font-weight: 500; color: #fff; }
  .drawer-sub { font-size: 18px; color: rgba(255,255,255,0.6); }
  .drawer-grid {
    display: grid; grid-template-columns: repeat(6, 1fr); gap: 22px;
    overflow-y: auto; padding-bottom: 40px;
  }
  .drawer-card {
    padding: 22px 18px; border-radius: 22px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    text-align: center; cursor: pointer; transition: all 0.16s ease;
  }
  .drawer-card.focused, .drawer-card:hover {
    background: rgba(168, 85, 247, 0.28); border-color: #e9d5ff;
    transform: scale(1.04);
  }
  .drawer-card .d-title { font-size: 19px; font-weight: 500; color: #fff; }
  .drawer-card .d-status { font-size: 13px; color: #d8b4fe; text-transform: uppercase; letter-spacing: 0.06em; }

  /* Bottom Horizontal Glass Dock Area */
  .dock-wrapper {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; align-items: center;
    width: 100%;
  }
  .glass-dock {
    display: flex; align-items: center; justify-content: center;
    gap: 28px; padding: 24px 46px;
    max-width: 92vw; overflow-x: auto; scrollbar-width: none;
    border-radius: 38px;
    background: rgba(255, 255, 255, 0.075);
    border: 1.5px solid rgba(255, 255, 255, 0.16);
    box-shadow:
      0 24px 68px rgba(0, 0, 0, 0.62),
      inset 0 1px 1px rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
  }
  .glass-dock::-webkit-scrollbar { display: none; }

  .dock-item {
    position: relative;
    width: 96px; height: 76px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 22px; cursor: pointer;
    opacity: 0.48; transform: scale(1);
    transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
    flex-shrink: 0;
  }
  .dock-item.focused {
    opacity: 1; transform: scale(1.22);
    filter: drop-shadow(0 6px 20px rgba(255, 255, 255, 0.45));
  }
  .dock-item.reordering {
    opacity: 1; transform: translateY(-14px) scale(1.26);
    background: rgba(168, 85, 247, 0.32);
    border: 2px solid #f3e8ff;
    box-shadow: 0 14px 34px rgba(168, 85, 247, 0.55);
  }
  .dock-item svg {
    width: 58px; height: 58px; fill: #ffffff; color: #ffffff;
  }
  .dock-item img.tv-icon {
    width: 54px; height: 54px; object-fit: contain;
    filter: grayscale(100%) brightness(220%) contrast(120%);
    border-radius: 12px;
  }
  .dock-item.focused img.tv-icon {
    filter: none;
  }

  /* Active App Label Row Directly Beneath Focused Icon (Outside Dock) */
  .dock-label-row {
    height: 44px; margin-top: 18px;
    display: flex; align-items: center; justify-content: center;
  }
  #active-app-label {
    font-size: 28px; font-weight: 500; letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.96);
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
    transition: all 0.15s ease;
  }
  .hint-bar {
    margin-top: 6px; font-size: 14px; color: rgba(255, 255, 255, 0.42);
    letter-spacing: 0.03em;
  }
</style>
</head>
<body>
<div id="stage">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>

  <!-- Top Bar: Clock + 3 Clean Icons -->
  <div class="top-bar">
    <div class="clock" id="clock">9:41</div>
    <div class="top-actions">
      <button class="top-btn" id="btn-theme" title="Cycle Purplish Gradient Theme">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </button>
      <button class="top-btn" id="btn-allapps" title="All Installed LG Apps">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      </button>
      <button class="top-btn" id="btn-arrange" title="Toggle Move / Delete Mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
  </div>

  <!-- Center Notification Pill for Hard-Press Reorder / Delete Mode -->
  <div class="center-stage">
    <div class="mode-pill" id="mode-pill">
      <span>Move / Edit Mode: <b>◀ ▶</b> Reorder · <b>▼</b> Remove from Dock · <b>OK</b> Save</span>
    </div>
  </div>

  <!-- Bottom Floating Glass Dock -->
  <div class="dock-wrapper">
    <div class="glass-dock" id="glass-dock"></div>
    <div class="dock-label-row">
      <div id="active-app-label">Netflix</div>
    </div>
    <div class="hint-bar" id="hint-bar">Press OK to launch · Hold OK (hard press) to move or remove</div>
  </div>

  <!-- All Installed Apps Drawer Modal -->
  <div id="drawer-modal">
    <div class="drawer-header">
      <div>
        <div class="drawer-title">wolfdenOS · Installed on LG OLED65G3PUA</div>
        <div class="drawer-sub">Press OK on any app to toggle it on/off your Horizontal Glass Dock · Press Back to close</div>
      </div>
    </div>
    <div class="drawer-grid" id="drawer-grid"></div>
  </div>
</div>

<script>
  const FALLBACK_APPS = ${fallbackJson};
  const STORAGE_ORDER_KEY = "lgos_dock_order_v2";
  const STORAGE_HIDDEN_KEY = "lgos_dock_hidden_v2";

  // Noise-free filter: exclude internal webOS background stubs & removed LG system bloat apps
  const INTERNAL_STUBS = new Set([
    "tld.slopbro.g3mod",
    "tld.wolfdenos.home",
    "com.webos.app.home",
    "com.webos.app.adoverlay",
    "com.webos.app.adoverlayex",
    "com.webos.app.acroverlay",
    "com.webos.app.notificationcenter",
    "com.webos.app.volume",
    "com.webos.app.inputcommon",
    "com.webos.app.screensaver",
    "com.webos.app.factorywin",
    "amazon.alexa.view",
    "com.webos.app.sportsteamsettings",
    "com.webos.app.homeconnect",
    "com.webos.app.lifeonscreen",
    "com.webos.app.browser",
    "com.webos.app.mediadiscovery",
    "com.webos.app.camera",
    "com.webos.app.multiviewsettings"
  ]);

  // System utility apps that are available in the All Apps drawer (middle top-right button)
  // but hidden from the main dock by default unless the user toggles them on
  const DEFAULT_DRAWER_ONLY = new Set([
    "com.webos.app.discovery",
    "com.webos.app.livetv"
  ]);

  // Clean monochrome SVG brand icons matching the Glass Dock aesthetic for all installed apps on your OLED65G3PUA
  function getBrandSvg(id, title) {
    const key = ((id || "") + " " + (title || "")).toLowerCase();
    if (key.includes("youtube")) {
      return '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
    }
    if (key.includes("disney")) {
      return '<svg viewBox="0 0 24 24"><path d="M19.5 6.5h-2v-2h-1.5v2h-2V8h2v2h1.5V8h2V6.5zM10.8 7.2c-3.8 0-6.8 2.1-6.8 4.8 0 1.9 1.6 3.5 4.2 4.3v2.7h2.2v-2.4c3.4-.2 6.1-2.1 6.1-4.6 0-2.7-2.5-4.8-5.7-4.8zm.4 7.3v-4.6c1.8.2 3.1 1.1 3.1 2.3 0 1.2-1.3 2.1-3.1 2.3z"/></svg>';
    }
    if (key.includes("hulu")) {
      return '<svg viewBox="0 0 24 24"><path d="M4.5 5.5h3.2v5.1h4.1V5.5H15v13h-3.2v-5.1H7.7v5.1H4.5v-13zm12.2 3.8h2.8v9.2h-2.8V9.3z"/></svg>';
    }
    if (key.includes("apple")) {
      return '<svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.67-.81 1.12-1.94 1-3.08-.96.04-2.13.64-2.82 1.45-.61.7-.11 1.86-.99 2.97 1.08.08 2.15-.53 2.81-1.34"/></svg>';
    }
    if (key.includes("wbd") || key.includes("hbo") || key.includes("max")) {
      return '<svg viewBox="0 0 24 24"><path d="M2 7h3v4h3V7h3v10H8v-3.5H5V17H2V7zm15 0c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5zm0 2.8c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2-1-2.2-2.2-2.2z"/></svg>';
    }
    if (key === "amazon" || key.includes("prime")) {
      return '<svg viewBox="0 0 24 24"><path d="M2.5 14.5c4.5 3.6 11.8 4.2 17.2 1.4.4-.2.8.2.5.6-2.2 2.6-6.2 4.2-10.3 4.2-3.8 0-7.1-1.5-8.1-5.5-.2-.5.3-.9.7-.7zm18.3-.6c-.4-.5-2.6-.3-3.6-.1-.3.1-.4-.2-.1-.4 1.8-1.2 4.7-.9 5 .5.3 1.4-.4 4.4-1.8 6.2-.2.3-.5.1-.4-.2.4-1.3 1.3-5.5.9-6z"/></svg>';
    }
    if (key.includes("cbs") || key.includes("paramount")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 3L2 20h20L12 3zm0 4.8l5.8 9.9H6.2L12 7.8zM12 2l1.1 2.2 2.4.3-1.7 1.7.4 2.4L12 7.5 9.8 8.6l.4-2.4-1.7-1.7 2.4-.3L12 2z"/></svg>';
    }
    if (key.includes("crunchyroll")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c4.84 0 8.87-3.44 9.8-8h-3.12c-.84 2.89-3.51 5-6.68 5-3.87 0-7-3.13-7-7s3.13-7 7-7c3.17 0 5.84 2.11 6.68 5h3.12c-.93-4.56-4.96-8-9.8-8zm1.5 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
    }
    if (key.includes("peacock")) {
      return '<svg viewBox="0 0 24 24"><path d="M7 5c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2s-2-.9-2-2V7c0-1.1.9-2 2-2zm5.5 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm5 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-5 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>';
    }
    if (key.includes("xbox")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-4.9 3.6c1.5-.9 3.1-.7 4.9.9 1.8-1.6 3.4-1.8 4.9-.9-1.3 1.4-2.5 3-3.5 4.7 1.6 2.3 2.9 4.8 3.9 7.4-1.9-1.5-3.7-3.3-5.3-5.4-1.6 2.1-3.4 3.9-5.3 5.4 1-2.6 2.3-5.1 3.9-7.4-1-1.7-2.2-3.3-3.5-4.7z"/></svg>';
    }
    if (key.includes("tubi")) {
      return '<svg viewBox="0 0 24 24"><path d="M5 6h14v3.2h-5.2V19h-3.6V9.2H5V6z"/></svg>';
    }
    if (key.includes("pluto")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zm0 2.4a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"/></svg>';
    }
    if (key.includes("sling")) {
      return '<svg viewBox="0 0 24 24"><path d="M16.5 6.5c-2.5-1.8-6.8-1.5-8.5.8-1.4 1.9-.3 4 2.8 4.8 2.4.6 3.2 1.3 2.8 2.3-.5 1.1-2.6 1.4-4.8.3L7 17.3c3 1.6 7.5 1.3 9.3-1.2 1.4-2 .2-4.2-3.1-5-2.1-.5-2.9-1.1-2.5-2 .5-.9 2.3-1.1 4.2-.1l1.6-2.5z"/></svg>';
    }
    if (key.includes("orka")) {
      return '<svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 8c0-1.1-.9-2-2-2zm0 10H3V8h18v8zm-11-7v6l5-3-5-3z"/></svg>';
    }
    if (key.includes("hbchannel") || key.includes("homebrew")) {
      return '<svg viewBox="0 0 24 24"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>';
    }
    if (key.includes("livetv")) {
      return '<svg viewBox="0 0 24 24"><path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.11-.9-2-2-2zm0 14H3V8h18v12z"/></svg>';
    }
    if (key.includes("homeconnect") || key.includes("hdmi")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>';
    }
    if (key.includes("browser")) {
      return '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
    }
    if (key.includes("netflix")) {
      return '<svg viewBox="0 0 24 24"><path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.713.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/></svg>';
    }
    if (key.includes("plex") || key.includes("cdp-30")) {
      return '<svg viewBox="0 0 24 24"><path d="M11.643 0H4.68l7.679 12L4.68 24h6.963l7.677-12-7.677-12"/></svg>';
    }
    return '<svg viewBox="0 0 24 24"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.8L18.2 12 12 18.2 5.8 12 12 5.8z"/></svg>';
  }

  let allInstalledApps = [];
  let dockApps = [];
  let hiddenIds = new Set();
  let focusZone = "dock"; // "dock" | "top" | "drawer"
  let dockIdx = 0;
  let topIdx = 0;
  let drawerIdx = 0;
  let reorderMode = false;
  let okHoldTimer = null;
  let okLongPressed = false;
  let bgThemeIdx = 0;
  const BG_THEMES = ["", "bg-amethyst", "bg-midnight"];

  let hasSavedHidden = false;
  try {
    const rawHidden = localStorage.getItem(STORAGE_HIDDEN_KEY);
    if (rawHidden !== null) {
      hasSavedHidden = true;
      hiddenIds = new Set(JSON.parse(rawHidden));
    } else {
      hiddenIds = new Set(DEFAULT_DRAWER_ONLY);
    }
  } catch (e) {
    hiddenIds = new Set(DEFAULT_DRAWER_ONLY);
  }

  function applySavedOrder(list) {
    try {
      const savedOrder = JSON.parse(localStorage.getItem(STORAGE_ORDER_KEY) || "[]");
      if (Array.isArray(savedOrder) && savedOrder.length > 0) {
        const rank = new Map(savedOrder.map((id, i) => [id, i]));
        list.sort((a, b) => {
          const ra = rank.has(a.id) ? rank.get(a.id) : 9999;
          const rb = rank.has(b.id) ? rank.get(b.id) : 9999;
          return ra - rb;
        });
      }
    } catch (e) {}
    return list;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(dockApps.map(a => a.id)));
      localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify(Array.from(hiddenIds)));
    } catch (e) {}
  }

  function rebuildDockApps() {
    const visible = allInstalledApps.filter(a => !hiddenIds.has(a.id));
    dockApps = applySavedOrder(visible);
    if (dockIdx >= dockApps.length) dockIdx = Math.max(0, dockApps.length - 1);
  }

  function ingestLaunchPoints(lps) {
    if (!Array.isArray(lps) || lps.length === 0) return;
    const mapped = [];
    const seen = new Set();
    for (const lp of lps) {
      const id = lp.id;
      if (!id || seen.has(id) || INTERNAL_STUBS.has(id)) continue;
      if (lp.visible === false) continue;
      seen.add(id);
      mapped.push({
        id: id,
        name: lp.title || id,
        iconPath: lp.icon || lp.largeIcon || ""
      });
    }
    if (mapped.length > 0) {
      allInstalledApps = mapped;
      rebuildDockApps();
      render();
    }
  }

  // 1. Load fallback list immediately, then query real TV launch points via Luna / dumped JSON
  allInstalledApps = FALLBACK_APPS.map(a => ({ id: a.id, name: a.name, iconPath: "" }));
  rebuildDockApps();

  // Attempt to load pre-dumped tv-launchpoints.json from debloat_home.sh
  fetch("./tv-launchpoints.json")
    .then(r => r.json())
    .then(data => {
      if (data && Array.isArray(data.launchPoints)) {
        ingestLaunchPoints(data.launchPoints);
      } else if (data && data.payload && Array.isArray(data.payload.launchPoints)) {
        ingestLaunchPoints(data.payload.launchPoints);
      }
    })
    .catch(() => {});

  // Also query live via PalmServiceBridge on the TV
  try {
    if (window.PalmServiceBridge) {
      const bridge = new PalmServiceBridge();
      bridge.onservicecallback = function(msg) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed && Array.isArray(parsed.launchPoints)) {
            ingestLaunchPoints(parsed.launchPoints);
          }
        } catch (e) {}
      };
      bridge.call("luna://com.webos.applicationManager/listLaunchPoints", "{}");
    }
  } catch (e) {}

  function updateClock() {
    const d = new Date();
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    document.getElementById("clock").textContent = h + ":" + m;
  }
  setInterval(updateClock, 5000);
  updateClock();

  function launchApp(appId) {
    if (window.PalmServiceBridge) {
      const b = new PalmServiceBridge();
      b.call("luna://com.webos.applicationManager/launch", JSON.stringify({ id: appId }));
    } else if (window.webOS && window.webOS.service) {
      window.webOS.service.request("luna://com.webos.applicationManager", {
        method: "launch",
        parameters: { id: appId }
      });
    }
  }

  function render() {
    // Top buttons focus state
    const topBtns = [
      document.getElementById("btn-theme"),
      document.getElementById("btn-allapps"),
      document.getElementById("btn-arrange")
    ];
    topBtns.forEach((btn, i) => {
      btn.className = "top-btn" + (focusZone === "top" && topIdx === i ? " focused" : "");
    });

    // Mode pill
    const pill = document.getElementById("mode-pill");
    pill.className = "mode-pill" + (reorderMode ? " visible" : "");

    // Dock items
    const dockEl = document.getElementById("glass-dock");
    dockEl.innerHTML = "";
    dockApps.forEach((app, i) => {
      const item = document.createElement("div");
      const isFocused = focusZone === "dock" && i === dockIdx;
      item.className = "dock-item" + (isFocused ? " focused" : "") + (isFocused && reorderMode ? " reordering" : "");
      item.innerHTML = getBrandSvg(app.id, app.name);
      item.onclick = () => {
        focusZone = "dock";
        dockIdx = i;
        if (reorderMode) {
          reorderMode = false;
          saveState();
          render();
        } else {
          render();
          launchApp(app.id);
        }
      };
      dockEl.appendChild(item);
      if (isFocused && item.scrollIntoView) {
        item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    });

    // Label below dock
    const labelEl = document.getElementById("active-app-label");
    const activeApp = dockApps[dockIdx];
    labelEl.textContent = activeApp ? activeApp.name : "No Apps in Dock";

    // Drawer modal
    const drawerModal = document.getElementById("drawer-modal");
    drawerModal.className = focusZone === "drawer" ? "open" : "";
    if (focusZone === "drawer") {
      const gridEl = document.getElementById("drawer-grid");
      gridEl.innerHTML = "";
      allInstalledApps.forEach((app, i) => {
        const card = document.createElement("div");
        const onDock = !hiddenIds.has(app.id);
        card.className = "drawer-card" + (i === drawerIdx ? " focused" : "");
        card.innerHTML =
          '<div style="width:42px;height:42px;fill:#fff">' + getBrandSvg(app.id, app.name) + '</div>' +
          '<div class="d-title">' + app.name + '</div>' +
          '<div class="d-status">' + (onDock ? "On Dock (OK to Hide)" : "Hidden (OK to Add)") + '</div>';
        card.onclick = () => {
          drawerIdx = i;
          if (hiddenIds.has(app.id)) hiddenIds.delete(app.id);
          else hiddenIds.add(app.id);
          rebuildDockApps();
          saveState();
          render();
        };
        gridEl.appendChild(card);
      });
    }
  }

  // Top bar click handlers
  document.getElementById("btn-theme").onclick = () => {
    bgThemeIdx = (bgThemeIdx + 1) % BG_THEMES.length;
    document.getElementById("stage").className = BG_THEMES[bgThemeIdx];
  };
  document.getElementById("btn-allapps").onclick = () => {
    focusZone = "drawer";
    drawerIdx = 0;
    render();
  };
  document.getElementById("btn-arrange").onclick = () => {
    focusZone = "dock";
    reorderMode = !reorderMode;
    render();
  };

  // Remote Key Handling (including Long-Press / Hard-Press OK to Move/Delete)
  window.addEventListener("keydown", (e) => {
    const code = e.keyCode || e.which;
    const isOk = e.key === "Enter" || code === 13;
    const isLeft = e.key === "ArrowLeft" || code === 37;
    const isUp = e.key === "ArrowUp" || code === 38;
    const isRight = e.key === "ArrowRight" || code === 39;
    const isDown = e.key === "ArrowDown" || code === 40;
    const isBack = e.key === "Escape" || e.key === "Backspace" || code === 461 || code === 27 || code === 8;

    if (isOk) {
      e.preventDefault();
      if (e.repeat) return;
      if (focusZone === "dock" && !okHoldTimer) {
        okLongPressed = false;
        okHoldTimer = setTimeout(() => {
          okLongPressed = true;
          reorderMode = !reorderMode;
          saveState();
          render();
        }, 520);
      }
      return;
    }

    if (focusZone === "drawer") {
      if (isRight) { drawerIdx = (drawerIdx + 1) % allInstalledApps.length; render(); }
      else if (isLeft) { drawerIdx = (drawerIdx - 1 + allInstalledApps.length) % allInstalledApps.length; render(); }
      else if (isDown) { drawerIdx = Math.min(allInstalledApps.length - 1, drawerIdx + 6); render(); }
      else if (isUp) { drawerIdx = Math.max(0, drawerIdx - 6); render(); }
      else if (isBack) { focusZone = "dock"; render(); }
      return;
    }

    if (focusZone === "top") {
      if (isRight) { topIdx = (topIdx + 1) % 3; render(); }
      else if (isLeft) { topIdx = (topIdx - 1 + 3) % 3; render(); }
      else if (isDown || isBack) { focusZone = "dock"; render(); }
      return;
    }

    // Dock zone navigation
    if (reorderMode) {
      if (isLeft && dockIdx > 0) {
        const tmp = dockApps[dockIdx - 1];
        dockApps[dockIdx - 1] = dockApps[dockIdx];
        dockApps[dockIdx] = tmp;
        dockIdx--;
        saveState();
        render();
      } else if (isRight && dockIdx < dockApps.length - 1) {
        const tmp = dockApps[dockIdx + 1];
        dockApps[dockIdx + 1] = dockApps[dockIdx];
        dockApps[dockIdx] = tmp;
        dockIdx++;
        saveState();
        render();
      } else if (isDown) {
        // Delete / remove from dock
        const removed = dockApps[dockIdx];
        if (removed && dockApps.length > 1) {
          hiddenIds.add(removed.id);
          rebuildDockApps();
          saveState();
          render();
        }
      } else if (isBack) {
        reorderMode = false;
        saveState();
        render();
      }
    } else {
      if (isRight && dockApps.length > 0) {
        dockIdx = (dockIdx + 1) % dockApps.length;
        render();
      } else if (isLeft && dockApps.length > 0) {
        dockIdx = (dockIdx - 1 + dockApps.length) % dockApps.length;
        render();
      } else if (isUp) {
        focusZone = "top";
        render();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    const code = e.keyCode || e.which;
    const isOk = e.key === "Enter" || code === 13;
    if (!isOk) return;
    e.preventDefault();
    if (okHoldTimer) {
      clearTimeout(okHoldTimer);
      okHoldTimer = null;
    }
    if (okLongPressed) {
      okLongPressed = false;
      return;
    }
    if (focusZone === "dock") {
      if (reorderMode) {
        reorderMode = false;
        saveState();
        render();
      } else if (dockApps[dockIdx]) {
        launchApp(dockApps[dockIdx].id);
      }
    } else if (focusZone === "top") {
      if (topIdx === 0) document.getElementById("btn-theme").click();
      else if (topIdx === 1) document.getElementById("btn-allapps").click();
      else if (topIdx === 2) document.getElementById("btn-arrange").click();
    } else if (focusZone === "drawer") {
      const app = allInstalledApps[drawerIdx];
      if (app) {
        if (hiddenIds.has(app.id)) hiddenIds.delete(app.id);
        else hiddenIds.add(app.id);
        rebuildDockApps();
        saveState();
        render();
      }
    }
  });

  render();
</script>
</body>
</html>`;
}

export function generateDebloatScript(cfg: G3ModConfig): string {
  const homeXml = generateHomeXml(cfg.homeLayout);
  const keybindsJson = generateKeybindsJson(cfg.keybinds);
  const launcherHtml = generateWebosLauncherHtml(cfg);
  const enabledSidebarApps = (cfg.sidebarApps || DEFAULT_SIDEBAR_APPS).filter(
    (a) => a.enabled
  );

  const bloatIds: string[] = [
    "amazon.alexa.view",
    "com.webos.app.sportsteamsettings",
    "com.webos.app.homeconnect",
    "com.webos.app.lifeonscreen",
    "com.webos.app.browser",
    "com.webos.app.mediadiscovery",
    "com.webos.app.camera",
    "com.webos.app.multiviewsettings",
  ];
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
# wolfdenOS — Iteration 2 (Purplish Glass Dock + wolf OS Core Patcher)
# Built for LG ${cfg.tvModel} (${cfg.webosVersion})
# Target IP: ${cfg.tvIp}
# ==============================================================================

set -e

MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
WOLF_DIR="/media/developer/apps/usr/palm/applications/tld.wolfdenos.home"
INITD_DIR="/var/lib/webosbrew/init.d"
INITD_LINK="\${INITD_DIR}/49-g3-debloat-home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
LOG_FILE="/tmp/wolfdenos.log"

if [ "\${1}" = "--revert" ] || [ "\${1}" = "--uninstall" ]; then
    echo "[*] Reverting all wolfdenOS customizations..."
    rm -f "\${INITD_LINK}"
    pkill -9 -f inputhook 2>/dev/null || true
    pkill -9 -f home-guard 2>/dev/null || true
    umount "\${FLUTTER_ASSETS}" 2>/dev/null || true
    umount /usr/palm/applications/com.webos.app.home/resources 2>/dev/null || true
    umount /etc/hosts 2>/dev/null || true
    rm -rf /tmp/weboshome-merged /tmp/hosts.slopbro
    pkill -f com.webos.app.home 2>/dev/null || true
    echo "[+] Reverted to stock webOS."
    exit 0
fi

# Per-script execution guard so concurrent triggers within the same run don't collide,
# while never blocking future runs
rm -f /tmp/autoroot.lock 2>/dev/null || true
RUN_LOCK="/tmp/debloat_\$(basename -- "\${0}")"
if [ "\$(basename -- "\${0}")" != "debloat_home.sh" ]; then
    [ -f "\${RUN_LOCK}" ] && exit 0
    touch "\${RUN_LOCK}"
fi

# Immediately restore native physical HOME button if any prior inputhook or home-guard process is in RAM
pkill -9 -f inputhook 2>/dev/null || true
pkill -9 -f home-guard 2>/dev/null || true
rm -rf /home/root/.config/lginputhook 2>/dev/null || true

log() {
    msg="[\$(date '+%H:%M:%S')] \${1}"
    echo "\${msg}"
    echo "\${msg}" >> "\${LOG_FILE}"
}

toast() {
    payload="\$(printf '{"sourceId":"com.webos.service.secondscreen.gateway","message":"<h3>wolfdenOS</h3>%s"}' "\${1}")"
    luna-send -w 1000 -n 1 -a 'com.webos.service.secondscreen.gateway' 'luna://com.webos.notification/createToast' "\${payload}" >/dev/null 2>&1 || true
}

log "Applying wolfdenOS Dashboard & wolf OS Core Patcher..."
mkdir -p "\${MOD_DIR}/assets/images/hd" \\
         "\${MOD_DIR}/assets/images/2k" \\
         "\${MOD_DIR}/assets/images/4k" \\
         "\${MOD_DIR}/assets/i18n" \\
         "\${WOLF_DIR}" \\
         "\${INITD_DIR}"

# 0. Write wolf OS / wolfdenOS Standalone Custom webOS TV Launcher App
# We register tld.wolfdenos.home as a fresh app ID with an 80x80 vibrant purple "W" icon
# so webOS SAM creates a bright, visible "wolf OS" tile right on the default LG Home screen app row!
cat > "\${WOLF_DIR}/appinfo.json" << 'WOLF_APPINFO_EOF'
{
  "id": "tld.wolfdenos.home",
  "version": "2.4.0",
  "vendor": "wolfdenOS",
  "type": "web",
  "main": "index.html",
  "title": "wolf OS",
  "icon": "icon.png",
  "largeIcon": "icon.png",
  "extraLargeIcon": "icon.png",
  "bgColor": "#6d28d9",
  "iconColor": "#6d28d9",
  "transparent": false,
  "handlesRelaunch": true,
  "disableBackHistoryAPI": true,
  "visible": true,
  "trustLevel": "trusted"
}
WOLF_APPINFO_EOF

cat > "\${MOD_DIR}/appinfo.json" << 'APPINFO_EOF'
{
  "id": "tld.slopbro.g3mod",
  "version": "2.4.0",
  "vendor": "wolfdenOS",
  "type": "web",
  "main": "index.html",
  "title": "wolfdenOS",
  "icon": "icon.png",
  "largeIcon": "icon.png",
  "extraLargeIcon": "icon.png",
  "bgColor": "#6d28d9",
  "iconColor": "#6d28d9",
  "transparent": false,
  "handlesRelaunch": true,
  "disableBackHistoryAPI": true,
  "visible": true,
  "trustLevel": "trusted"
}
APPINFO_EOF

cat > "\${MOD_DIR}/index.html" << 'LAUNCHER_HTML_EOF'
${launcherHtml}
LAUNCHER_HTML_EOF
cp "\${MOD_DIR}/index.html" "\${WOLF_DIR}/index.html"

# Snapshot all currently installed launch points directly from webOS SAM into tv-launchpoints.json
luna-send -n 1 'luna://com.webos.applicationManager/listLaunchPoints' '{}' > "\${MOD_DIR}/tv-launchpoints.json" 2>/dev/null || true
cp "\${MOD_DIR}/tv-launchpoints.json" "\${WOLF_DIR}/tv-launchpoints.json" 2>/dev/null || true

# Save sidebar & seasonal theme manifest
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
cp "\${MOD_DIR}/launcher-config.json" "\${WOLF_DIR}/launcher-config.json" 2>/dev/null || true

# 1. Write customized Flutter home.xml
cat > "\${MOD_DIR}/assets/home.xml" << 'EOF'
${homeXml}
EOF

# 1b. Generate 80x80 vibrant purple "W" PNG icon for the "wolf OS" tile on the default LG screen,
# and a separate 1x1 pitch-black PNG (black.png) to blank out the stock LG default home banner image
generate_wolf_icon_png() {
    base64 -d > "\${1}" << 'ICON_B64_EOF'
iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAABc2XMiAAABhUlEQVR4nO3aMW7CMBiG4d9NWVmZunTp0qN34AicgTNwBM5QunTpU7AydYBlhYqQEiA2tZ34vGe4sZ9f8S87tNfrdYC/bXcH8J0JDAwMDAwMDAwMDAwM7L17PB7Hcbxcr9M0vT7bbrdpmp7neVmW9x73CWdgq9Uqz/PlcrlcLsmyPJ9/+jhJkiiK5nkeRRFnV/DmbbfbOI7btn1+HcdxVVVxHO92ux887hNnq8iyrK7rXq+XpunrVZZlfd9XVRWG4cfPe+dsFUVRNE1zOp0GgwF45Qxsv98fDodxHAdBeL1edV0f96y1zjmOoygKw/BsNtvtdi8X5Qysbdu2bTnnf8/atpVSKqWcc9ba15tzBtZ13f1+//KgaRrO+WazUUr1fb9er7/+R0/OwLwfOAMDAwMDAwMDAwMD855SSvT9/f14PKSUWms3E0JYa7XWUsqP33tF18C6rquqSimVJMlms/noWa/XOeeHw8E5V9f11/de0U8tHoG9sAU+MQYGBgYGBgYGBgYGBvYLFhlxU0I3t9gAAAAASUVORK5CYII=
ICON_B64_EOF
}

generate_black_png() {
    printf '\\211PNG\\r\\n\\032\\n\\000\\000\\000\\rIHDR\\000\\000\\000\\001\\000\\000\\000\\001\\010\\002\\000\\000\\000\\220wS\\336\\000\\000\\000\\014IDATx\\234c\`\`\`\\000\\000\\000\\004\\000\\001\\366\\0278U\\000\\000\\000\\000IEND\\256B\`\\202' > "\${1}"
}

generate_wolf_icon_png "\${WOLF_DIR}/icon.png"
generate_wolf_icon_png "\${MOD_DIR}/icon.png"
generate_black_png "\${MOD_DIR}/black.png"
generate_black_png "\${MOD_DIR}/assets/images/hd/bg_banner_img.png"
generate_black_png "\${MOD_DIR}/assets/images/2k/bg_banner_img.png"
generate_black_png "\${MOD_DIR}/assets/images/4k/bg_banner_img.png"

# 2. Write /etc/hosts Ad, ACR & Telemetry sinkhole
cat > "\${MOD_DIR}/hosts.block" << 'EOF'
# === wolfdenOS LG webOS 25 Ad, ACR (LivePlus) & Telemetry Sinkhole ===
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
WOLF_DIR="/media/developer/apps/usr/palm/applications/tld.wolfdenos.home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
HOME_RESOURCES="/usr/palm/applications/com.webos.app.home/resources"

# Clean up any old HOME button interceptors so the physical HOME button works 100% natively
pkill -9 -f inputhook 2>/dev/null || true
pkill -9 -f home-guard 2>/dev/null || true
rm -rf "\${MOD_DIR}/home-guard.sh" /home/root/.config/lginputhook 2>/dev/null || true
luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' '{"id":"org.webosbrew.inputhook","subscribe":false}' >/dev/null 2>&1 || true

# Refresh installed apps snapshot on boot
luna-send -n 1 'luna://com.webos.applicationManager/listLaunchPoints' '{}' > "\${MOD_DIR}/tv-launchpoints.json" 2>/dev/null || true
cp "\${MOD_DIR}/tv-launchpoints.json" "\${WOLF_DIR}/tv-launchpoints.json" 2>/dev/null || true

${
  cfg.privacy.blockAdHosts
    ? `# A. Bind-mount /etc/hosts sinkhole
if [ -f "\${MOD_DIR}/hosts.block" ]; then
    umount /etc/hosts 2>/dev/null || true
    cp /etc/hosts /tmp/hosts.slopbro
    grep -q "wolfdenOS" /tmp/hosts.slopbro || cat "\${MOD_DIR}/hosts.block" >> /tmp/hosts.slopbro
    mount --bind /tmp/hosts.slopbro /etc/hosts 2>/dev/null || true
fi`
    : "# Hosts sinkhole disabled"
}

# B. Bind-mount customized core webOS 10.3.0 Flutter Home assets (wolf OS + stock image removed)
if [ -d "\${FLUTTER_ASSETS}" ]; then
    umount "\${FLUTTER_ASSETS}" 2>/dev/null || true
    umount "\${HOME_RESOURCES}" 2>/dev/null || true
    REAL_I18N="\$(readlink -f "\${FLUTTER_ASSETS}/i18n" 2>/dev/null || echo "\${HOME_RESOURCES}")"

    rm -rf /tmp/weboshome-merged
    mkdir -p /tmp/weboshome-merged
    cp -RP "\${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/ 2>/dev/null || cp -R "\${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/ 2>/dev/null || true

    # Replace i18n symlink with real directory and rewrite all offline/promo banner strings to "wolf OS"
    rm -rf /tmp/weboshome-merged/i18n
    mkdir -p /tmp/weboshome-merged/i18n
    if [ -n "\${REAL_I18N}" ] && [ -d "\${REAL_I18N}" ]; then
        cp -RP "\${REAL_I18N}"/. /tmp/weboshome-merged/i18n/ 2>/dev/null || cp -R "\${REAL_I18N}"/* /tmp/weboshome-merged/i18n/ 2>/dev/null || true
    fi
    find /tmp/weboshome-merged -type f -name "*.json" | while IFS= read -r jf; do
        sed -i 's/Enjoy the device[^"]*network[^"]*/wolf OS/g' "\${jf}" 2>/dev/null || true
        sed -i 's/Start a new experience with webOS[^"]*/wolf OS/g' "\${jf}" 2>/dev/null || true
        sed -i 's/"Go to Apps"[[:space:]]*:[[:space:]]*"[^"]*"/"Go to Apps": "wolf OS"/g' "\${jf}" 2>/dev/null || true
        sed -i 's/"Check Network Connection"[[:space:]]*:[[:space:]]*"[^"]*"/"Check Network Connection": "wolf OS"/g' "\${jf}" 2>/dev/null || true
        sed -i 's/"Network Settings"[[:space:]]*:[[:space:]]*"[^"]*"/"Network Settings": "wolf OS"/g' "\${jf}" 2>/dev/null || true
    done

    # Apply stripped home.xml (no recommendedShelf, no qcardList, no globalline)
    cp "\${MOD_DIR}/assets/home.xml" /tmp/weboshome-merged/home.xml
    if [ -f /tmp/weboshome-merged/home_layoutShelfView.xml ]; then
        sed -i '/<item id="recommendedShelf"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
        sed -i '/<item id="qcardList"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
    fi

    # Remove stock LG default home image by overwriting all banner images in hd / 2k / 4k with pitch-black PNG (black.png)
    cp -R "\${MOD_DIR}/assets/images"/. /tmp/weboshome-merged/images/ 2>/dev/null || true
    for img_dir in /tmp/weboshome-merged/images/hd /tmp/weboshome-merged/images/2k /tmp/weboshome-merged/images/4k; do
        if [ -d "\${img_dir}" ]; then
            for banner_png in "\${img_dir}"/*banner*.png "\${img_dir}"/*default*.png "\${img_dir}"/*bg_*.png; do
                [ -f "\${banner_png}" ] && cp "\${MOD_DIR}/black.png" "\${banner_png}" 2>/dev/null || true
            done
        fi
    done

    mount --bind /tmp/weboshome-merged "\${FLUTTER_ASSETS}" 2>/dev/null || true
    if [ -d "\${HOME_RESOURCES}" ]; then
        mount --bind /tmp/weboshome-merged/i18n "\${HOME_RESOURCES}" 2>/dev/null || true
    fi
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
    ? `# Close any ad/ACR overlay cleanly without crashing an active staging webview into error -102
for proc in com.webos.app.adoverlay com.webos.app.acroverlay; do
    luna-send -n 1 'luna://com.webos.applicationManager/closeByAppId' "{\\"id\\":\\"\${proc}\\"}" >/dev/null 2>&1 || true
done`
    : ""
}

${
  cfg.privacy.killRdxdTelemetry
    ? `pkill -f rdxd 2>/dev/null || true`
    : ""
}

# Ensure Homebrew Channel SSH & Telnet are enabled and running
mkdir -p /var/luna/preferences
touch /var/luna/preferences/webosbrew_ssh_enabled /var/luna/preferences/webosbrew_telnet_enabled 2>/dev/null || true
if [ -x /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/startup.sh ]; then
    /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/startup.sh >/dev/null 2>&1 &
fi

# Remove old invisible black-icon launch point and register the new purple "wolf OS" tile at position #1 on the default LG screen!
luna-send -n 1 -a com.webos.app.home 'luna://com.webos.applicationManager/removeLaunchPoint' '{"launchPointId":"tld.slopbro.g3mod_default"}' >/dev/null 2>&1 || true
luna-send -n 1 'luna://com.webos.applicationManager/dev/listApps' '{}' >/dev/null 2>&1 || true
sleep 1
luna-send -n 1 -a com.webos.app.home 'luna://com.webos.applicationManager/moveLaunchPoint' '{"launchPointId":"tld.wolfdenos.home_default","index":0}' >/dev/null 2>&1 || true

# Close the staging overlay (com.webos.app.adoverlayex) cleanly so it never shows error -102,
# and immediately open the wolfdenOS Purplish Glass Dock dashboard!
luna-send -n 1 'luna://com.webos.applicationManager/closeByAppId' '{"id":"com.webos.app.adoverlayex"}' >/dev/null 2>&1 || true
luna-send -n 1 'luna://com.webos.applicationManager/launch' '{"id":"tld.wolfdenos.home"}' >/dev/null 2>&1 || true

# Free any previously stuck jsserver node slots in the background after completion
(sleep 2; pkill -f "run-js-service-no-cgroup" 2>/dev/null || true) &
APPLY_EOF

chmod +x "\${MOD_DIR}/apply.sh"
ln -sf "\${MOD_DIR}/apply.sh" "\${INITD_LINK}"

${
  bloatIds.length > 0
    ? `# 4. Remove & hide selected promotional / system bloatware apps
for bloat_id in ${bloatIds.join(" ")}; do
    luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' "{\\"id\\":\\"\${bloat_id}\\",\\"subscribe\\":false}" >/dev/null 2>&1 || true
    luna-send -n 1 -a com.webos.app.home 'luna://com.webos.applicationManager/removeLaunchPoint' "{\\"launchPointId\\":\\"\${bloat_id}_default\\"}" >/dev/null 2>&1 || true
done`
    : ""
}

sh "\${MOD_DIR}/apply.sh"
log "wolfdenOS & wolf OS installation complete!"
toast "wolfdenOS & wolf OS active!"
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
          "woldenOs.py",
          "--files",
          "index.html",
          "autoroot.sh",
          "package.json",
          "main.js",
          "debloat_home.sh",
          "--out",
          "dist/woldenOs_packed.py",
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
          ["woldenOs.py", ...args],
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
        command: `python3 woldenOs.py ${args.join(" ")}`,
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
