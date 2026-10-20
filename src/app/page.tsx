"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Gamepad2,
  Download,
  Play,
  Copy,
  Check,
  RefreshCw,
  WifiOff,
  Sparkles,
  Power,
  ChevronUp,
  ChevronDown,
  Upload,
  Smartphone,
  GitBranch,
  Flame,
  Film,
  Music,
  Server,
  Compass,
  Sun,
  Grid,
  Settings,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SidebarAppItem {
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

interface G3ModConfig {
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

const APP_PRESETS = [
  { id: "tld.wolfdenos.home", label: "wolfdenOS / wolf OS Custom Home" },
  { id: "org.webosbrew.youtube.leanback.v4", label: "YouTube AdFree (Homebrew)" },
  { id: "org.jellyfin.webos", label: "Jellyfin" },
  { id: "org.moonfin.webos", label: "Moonfin (Jellyfin Client)" },
  { id: "cdp-30", label: "Plex" },
  { id: "com.limelight.webos", label: "Moonlight (Game Stream)" },
  { id: "org.xbmc.kodi", label: "Kodi" },
  { id: "org.webosbrew.hbchannel", label: "Homebrew Channel" },
  { id: "com.webos.app.hdmi1", label: "HDMI 1 Input" },
  { id: "com.webos.app.hdmi2", label: "HDMI 2 (eARC) Input" },
  { id: "com.webos.app.hdmi3", label: "HDMI 3 Input" },
  { id: "com.webos.app.hdmi4", label: "HDMI 4 Input" },
  { id: "spotify-beehive", label: "Spotify" },
];

const FALL_LEAVES = [
  { left: "14%", delay: "0s", duration: "11s", size: 12, rot: 25 },
  { left: "28%", delay: "2.2s", duration: "13s", size: 10, rot: -40 },
  { left: "44%", delay: "1.1s", duration: "9.5s", size: 14, rot: 15 },
  { left: "62%", delay: "3.4s", duration: "12s", size: 11, rot: 60 },
  { left: "78%", delay: "0.7s", duration: "10.5s", size: 13, rot: -20 },
  { left: "89%", delay: "2.8s", duration: "14s", size: 9, rot: 45 },
];

const AUTUMN_AMBIENT_SHELF = [
  {
    title: "Seaside Halloween Coffee Shop",
    channel: "Little Lofi Cute · 4K OLED",
    badge: "AUTUMN AMBIENCE",
    gradient: "from-orange-900/90 via-amber-950 to-zinc-950",
  },
  {
    title: "Warm Autumn Cabin Fireplace",
    channel: "Warm Melody · Dolby Atmos",
    badge: "COZY HARVEST",
    gradient: "from-amber-800/90 via-red-950 to-zinc-950",
  },
  {
    title: "Misty Coastal Drive · Big Sur",
    channel: "CleanFrame 4K60 HDR",
    badge: "SCENIC",
    gradient: "from-teal-900/80 via-slate-900 to-zinc-950",
  },
];

function renderAppIcon(iconKey: string, className = "w-4 h-4") {
  switch (iconKey) {
    case "youtube":
      return <Play className={`${className} fill-current`} />;
    case "netflix":
    case "disney":
    case "hulu":
    case "hbomax":
    case "paramount":
    case "crunchyroll":
    case "peacock":
    case "tubi":
    case "plutotv":
    case "sling":
    case "orka":
    case "prime":
    case "appletv":
      return <Film className={className} />;
    case "jellyfin":
    case "plex":
    case "mediaplayer":
      return <Server className={className} />;
    case "spotify":
      return <Music className={className} />;
    case "gamepad":
    case "xbox":
    case "moonlight":
      return <Gamepad2 className={className} />;
    default:
      return <Compass className={className} />;
  }
}

const INITIAL_SIDEBAR_APPS: SidebarAppItem[] = [
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
];

const INITIAL_CONFIG: G3ModConfig = {
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
    greetingSubtitle: "Horizontal Glass Dock · Installed TV Apps · Hard-Press OK to Reorder/Delete",
    ambientParticles: true,
    turnOnAnimation: true,
    sidebarPosition: "left",
    sidebarStyle: "frosted-glass",
    showContentShelves: false,
    oledBrightness: 88,
    autoHideSidebarSec: 15,
    customWallpaperUrl: "",
  },
  sidebarApps: INITIAL_SIDEBAR_APPS,
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
    hijackHomeButton: true,
    mappings: {
      home: {
        buttonName: "HOME Button (773)",
        uinputCode: "773",
        action: "launch",
        targetAppId: "tld.slopbro.g3mod",
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

export default function G3StudioPage() {
  const [config, setConfig] = useState<G3ModConfig>(INITIAL_CONFIG);
  const [generatedXml, setGeneratedXml] = useState<string>(`<?xml version="1.0" encoding="utf-8"?>
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
</home>`);
  const [generatedKeybinds, setGeneratedKeybinds] = useState<string>(
    JSON.stringify(
      {
        "773": { action: "launch", id: "tld.slopbro.g3mod" },
        "1037": { action: "launch", id: "org.webosbrew.youtube.leanback.v4" },
        "1039": { action: "launch", id: "org.jellyfin.webos" },
        "1043": { action: "ignore" },
        "1047": { action: "launch", id: "cdp-30" },
        "1125": { action: "ignore" },
        "1126": { action: "launch", id: "com.limelight.webos" },
      },
      null,
      2
    )
  );
  const [debloatScript, setDebloatScript] = useState<string>(
    "# Loading debloat_home.sh..."
  );
  const [previewCompareMode, setPreviewCompareMode] = useState<
    "sidebar-seasonal" | "stock-debloated" | "stock-bloat"
  >("sidebar-seasonal");
  const [selectedSidebarIdx, setSelectedSidebarIdx] = useState<number>(0);
  const [reorderDockMode, setReorderDockMode] = useState<boolean>(false);
  const [tvPowerState, setTvPowerState] = useState<"on" | "turning-on" | "launched">("on");
  const [activeLaunchedApp, setActiveLaunchedApp] = useState<SidebarAppItem | null>(null);
  const [inspoVideoUrl, setInspoVideoUrl] = useState<string | null>(null);
  const [inspoVideoName, setInspoVideoName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string>(
    "[ready] Repo: github.com/james-lopez/lgOS-wolfdenOS\n[ready] Target: LG OLED65G3PUA @ 192.168.97.141 (webOS 25 / 10.3.0-2504)\n[ready] Paradigms: wolfdenOS Purplish Horizontal Glass Dock + wolf OS Core Patcher"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/slopbro")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config);
          setGeneratedXml(data.generatedXml || "");
          setGeneratedKeybinds(data.generatedKeybinds || "");
          setDebloatScript(data.debloatScript || "");
        }
      });
  }, []);

  const enabledApps = (config?.sidebarApps || []).filter((a) => a.enabled);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (previewCompareMode !== "sidebar-seasonal" || enabledApps.length === 0) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveLaunchedApp(null);
        setSelectedSidebarIdx((prev) => (prev + 1) % enabledApps.length);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveLaunchedApp(null);
        setSelectedSidebarIdx(
          (prev) => (prev - 1 + enabledApps.length) % enabledApps.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const chosen = enabledApps[selectedSidebarIdx] || enabledApps[0];
        if (chosen) {
          setActiveLaunchedApp(chosen);
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        setActiveLaunchedApp(null);
      }
    },
    [previewCompareMode, enabledApps, selectedSidebarIdx]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const triggerTurnOnAnimation = () => {
    setActiveLaunchedApp(null);
    setTvPowerState("turning-on");
    setTimeout(() => {
      setTvPowerState("on");
    }, 1200);
  };

  const syncConfig = async (nextConfig: G3ModConfig) => {
    setConfig(nextConfig);
    setSaving(true);
    try {
      const res = await fetch("/api/slopbro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", config: nextConfig }),
      });
      const data = await res.json();
      if (data.generatedXml) setGeneratedXml(data.generatedXml);
      if (data.generatedKeybinds) setGeneratedKeybinds(data.generatedKeybinds);
      if (data.debloatScript) setDebloatScript(data.debloatScript);
    } finally {
      setSaving(false);
    }
  };

  const moveSidebarApp = (index: number, direction: -1 | 1) => {
    if (!config) return;
    const list = [...config.sidebarApps];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    syncConfig({ ...config, sidebarApps: list });
  };

  const handleRunSlopbro = async () => {
    if (!config) return;
    setRunning(true);
    setTerminalLog(
      `[exec] Saving wolfdenOS payload to wwwroot/debloat_home.sh and rebuilding dist/woldenOs_packed.py...\n[exec] Running: python3 woldenOs.py --debug --webos-version 10 ${config.tvIp}\n[wait] Connecting to wss://${config.tvIp}:3001 ...`
    );
    try {
      const res = await fetch("/api/slopbro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-slopbro", config }),
      });
      const data = await res.json();
      if (data.runResult) {
        const { exitCode, stdout, stderr } = data.runResult;
        setTerminalLog(
          `Command: ${data.command}\nExit Code: ${exitCode}\n\n--- STDERR / STATUS ---\n${
            stderr || "(none)"
          }\n--- STDOUT ---\n${
            stdout || "(none)"
          }\n\nNote: This Cloud VM is not on your home 192.168.97.x Wi-Fi/LAN. Run the exact command shown in Step 2 below on your laptop/Mac/PC on the same Wi-Fi as your OLED65G3PUA!`
        );
      }
    } catch (e: unknown) {
      setTerminalLog(
        `Error: ${e instanceof Error ? e.message : "Failed to run"}`
      );
    } finally {
      setRunning(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInspoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInspoVideoUrl(url);
    setInspoVideoName(file.name);
  };

  const focusedApp =
    enabledApps[selectedSidebarIdx] || enabledApps[0] || config.sidebarApps[0];
  const season = config.launcherTheme.activeSeason;
  const paradigm = config.launcherTheme.uiParadigm || "cleanframe-list";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500/30">
      {/* Top Header Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-950/50">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-semibold text-base sm:text-lg tracking-tight text-white">
                  lgOS-wolfdenOS
                </h1>
                <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-xs font-mono">
                  github.com/{config.githubOwner}/{config.repoName}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs">
                  OLED65G3PUA · webOS 25 (10.3.0-2504)
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                CleanFrame Typography List + @iampiny Brand-Tile Sidebar + Seasonal Fall/Pumpkin Turn-On
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerTurnOnAnimation}
              className="border-orange-500/40 bg-orange-950/30 hover:bg-orange-900/40 text-orange-200 gap-2"
            >
              <Power className="w-4 h-4 text-orange-400" />
              Simulate TV Turn-On
            </Button>
            <a href="/api/download?file=packed" download="woldenOs_packed.py">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download Single-File (.py)
              </Button>
            </a>
            <Button
              size="sm"
              onClick={handleRunSlopbro}
              disabled={running}
              className="bg-orange-600 hover:bg-orange-500 text-white gap-2 font-medium"
            >
              {running ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Test Probe ({config.tvIp})
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* DESIGN STUDY LAB BAR (Inspired directly by CleanFrame & @iampiny) */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mr-1">
              LAYOUT PARADIGM:
            </span>
            {[
              {
                id: "horizontal-glass-dock" as const,
                label: "Iteration 2 · Horizontal Glass Dock",
              },
              {
                id: "cleanframe-list" as const,
                label: "CleanFrame Photo List (Typography)",
              },
              {
                id: "piny-tiles" as const,
                label: "Piny Brand Tiles (@iampiny)",
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPreviewCompareMode("sidebar-seasonal");
                  syncConfig({
                    ...config,
                    launcherTheme: {
                      ...config.launcherTheme,
                      uiParadigm: item.id,
                    },
                  });
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  paradigm === item.id && previewCompareMode === "sidebar-seasonal"
                    ? "bg-white text-black shadow-sm"
                    : "bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              WALLPAPER:
            </span>
            {[
              { id: "purplish-nebula" as const, label: "Purplish Nebula (Default)" },
              { id: "fall-pumpkin" as const, label: "Harvest Pumpkins" },
              { id: "misty-autumn-coast" as const, label: "Misty Autumn Coast" },
              { id: "midnight-oled" as const, label: "Pure OLED" },
            ].map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() =>
                  syncConfig({
                    ...config,
                    launcherTheme: {
                      ...config.launcherTheme,
                      activeSeason: wp.id,
                    },
                  })
                }
                className={`px-2.5 py-1 rounded-md text-xs transition ${
                  season === wp.id
                    ? "bg-orange-600 text-white font-medium"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {wp.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                syncConfig({
                  ...config,
                  launcherTheme: {
                    ...config.launcherTheme,
                    showContentShelves: !config.launcherTheme.showContentShelves,
                  },
                })
              }
              className={`px-2.5 py-1 rounded-md text-xs transition border ${
                config.launcherTheme.showContentShelves
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {config.launcherTheme.showContentShelves
                ? "Ambient Shelf: ON"
                : "Pure Canvas (No Shelves)"}
            </button>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Interactive OLED65G3PUA TV Simulator + Remote + Inspo Reference */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden shadow-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    OLED65G3PUA Interactive TV Preview
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Remote keys active: <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">↑</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">↓</kbd>{" "}
                    move · <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">Enter</kbd> = OK ·{" "}
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">Esc</kbd> = Back
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewCompareMode("sidebar-seasonal")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      previewCompareMode === "sidebar-seasonal"
                        ? "bg-orange-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Custom Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCompareMode("stock-debloated")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      previewCompareMode === "stock-debloated"
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Debloated XML Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCompareMode("stock-bloat")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      previewCompareMode === "stock-bloat"
                        ? "bg-rose-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Stock webOS 25
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5">
                {/* 16:9 LG OLED65G3PUA Bezel */}
                <div
                  className="relative aspect-video w-full rounded-xl border-[5px] border-zinc-800 bg-black shadow-2xl overflow-hidden select-none"
                  style={{
                    filter: `brightness(${
                      0.45 + (config.launcherTheme.oledBrightness || 82) * 0.0055
                    })`,
                  }}
                >
                  {/* Turn-On OLED Curtain Transition */}
                  {tvPowerState === "turning-on" && (
                    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center animate-pulse">
                      <div className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3">
                        <Flame className="w-10 h-10 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium tracking-widest uppercase text-orange-200">
                        OLED65G3PUA · Launching Custom Home...
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-1">
                        0 Ads · 0 Telemetry · Instant Sidebar Ready
                      </p>
                    </div>
                  )}

                  {previewCompareMode === "sidebar-seasonal" ? (
                    <div className="relative w-full h-full flex overflow-hidden">
                      {/* =================================================
                         BACKGROUND SCENE LAYER (Fall Pumpkins / Misty Coast / Moody OLED)
                         ================================================= */}
                      {season === "fall-pumpkin" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#120703] via-[#261005] to-[#090402]">
                          <div
                            className="absolute -top-16 right-12 w-72 h-72 rounded-full opacity-45 blur-3xl pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(249,115,22,0.68) 0%, rgba(180,83,9,0.22) 60%, transparent 100%)",
                            }}
                          />
                          <svg
                            viewBox="0 0 1200 675"
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90"
                            preserveAspectRatio="xMidYMid slice"
                          >
                            <defs>
                              <radialGradient id="harvestMoon" cx="78%" cy="22%" r="16%">
                                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
                                <stop offset="45%" stopColor="#f97316" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                              </radialGradient>
                              <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2e1307" />
                                <stop offset="100%" stopColor="#140803" />
                              </linearGradient>
                              <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#1c0b04" />
                                <stop offset="100%" stopColor="#080301" />
                              </linearGradient>
                              <radialGradient id="pumpkinGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#fef08a" />
                                <stop offset="60%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#9a3412" />
                              </radialGradient>
                            </defs>
                            <circle cx="930" cy="150" r="175" fill="url(#harvestMoon)" />
                            <circle cx="930" cy="150" r="52" fill="#fef3c7" fillOpacity="0.88" />
                            <path
                              d="M0,470 Q320,380 650,455 T1200,420 L1200,675 L0,675 Z"
                              fill="url(#hillBack)"
                            />
                            <path
                              d="M0,535 Q420,470 820,530 T1200,505 L1200,675 L0,675 Z"
                              fill="url(#hillFront)"
                            />
                            <g transform="translate(880, 485)">
                              <ellipse cx="0" cy="48" rx="68" ry="14" fill="#000" opacity="0.55" />
                              <path d="M-10,-32 Q-4,-48 8,-44 Q4,-30 6,-22 Z" fill="#3f230f" />
                              <ellipse cx="-24" cy="10" rx="28" ry="34" fill="#c2410c" />
                              <ellipse cx="24" cy="10" rx="28" ry="34" fill="#c2410c" />
                              <ellipse cx="-12" cy="12" rx="26" ry="36" fill="#ea580c" />
                              <ellipse cx="12" cy="12" rx="26" ry="36" fill="#ea580c" />
                              <ellipse cx="0" cy="12" rx="22" ry="37" fill="#f97316" />
                              <polygon points="-18,2 -8,-10 -2,2" fill="url(#pumpkinGlow)" />
                              <polygon points="18,2 8,-10 2,2" fill="url(#pumpkinGlow)" />
                              <path
                                d="M-22,18 Q0,34 22,18 Q12,24 0,24 Q-12,24 -22,18 Z"
                                fill="url(#pumpkinGlow)"
                              />
                            </g>
                            <g transform="translate(975, 512) scale(0.72)">
                              <ellipse cx="0" cy="45" rx="52" ry="11" fill="#000" opacity="0.5" />
                              <ellipse cx="-18" cy="10" rx="24" ry="30" fill="#9a3412" />
                              <ellipse cx="18" cy="10" rx="24" ry="30" fill="#9a3412" />
                              <ellipse cx="0" cy="11" rx="24" ry="32" fill="#d97706" />
                            </g>
                          </svg>
                          {/* Scrim for CleanFrame left typography legibility */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent pointer-events-none" />
                        </div>
                      )}

                      {season === "misty-autumn-coast" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1d2b32] via-[#2b3938] to-[#121614]">
                          <svg
                            viewBox="0 0 1200 675"
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            preserveAspectRatio="xMidYMid slice"
                          >
                            <defs>
                              <linearGradient id="mistSky" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#354f59" />
                                <stop offset="55%" stopColor="#5c7278" />
                                <stop offset="100%" stopColor="#26353a" />
                              </linearGradient>
                            </defs>
                            <rect width="1200" height="675" fill="url(#mistSky)" />
                            {/* Misty Sea Stacks & Autumn Headlands (CleanFrame style) */}
                            <path
                              d="M0,180 Q280,260 440,390 L520,675 L0,675 Z"
                              fill="#241c15"
                            />
                            <path
                              d="M0,340 Q260,420 580,675 L0,675 Z"
                              fill="#3b2614"
                            />
                            <polygon points="560,455 620,395 685,460" fill="#1d2426" />
                            <polygon points="735,445 795,380 850,450" fill="#171e20" />
                          </svg>
                          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent pointer-events-none" />
                        </div>
                      )}

                      {season === "moody-forest-oled" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "radial-gradient(circle at 62% 48%, #16261d 0%, #0b120e 48%, #040504 100%)",
                          }}
                        />
                      )}

                      {season === "purplish-nebula" && (
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{
                            background:
                              "radial-gradient(125% 95% at 18% 15%, rgba(91, 33, 182, 0.56) 0%, rgba(46, 16, 101, 0.36) 42%, transparent 74%), radial-gradient(110% 85% at 82% 24%, rgba(147, 51, 234, 0.44) 0%, rgba(88, 28, 135, 0.28) 46%, transparent 76%), radial-gradient(95% 75% at 50% 85%, rgba(192, 38, 211, 0.34) 0%, rgba(59, 7, 100, 0.38) 52%, transparent 82%), linear-gradient(160deg, #070312 0%, #120726 38%, #1d0b3a 68%, #090314 100%)",
                          }}
                        >
                          <div
                            className="absolute -top-16 -left-12 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-65"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(168, 85, 247, 0.55) 0%, rgba(126, 34, 206, 0.18) 62%, transparent 100%)",
                            }}
                          />
                          <div
                            className="absolute -bottom-20 right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-60"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(217, 70, 239, 0.42) 0%, rgba(107, 33, 168, 0.16) 65%, transparent 100%)",
                            }}
                          />
                        </div>
                      )}

                      {season === "midnight-oled" && (
                        <div className="absolute inset-0 bg-black" />
                      )}

                      {/* Floating Autumn Leaves */}
                      {config.launcherTheme.ambientParticles &&
                        FALL_LEAVES.map((leaf, i) => (
                          <div
                            key={i}
                            className="absolute pointer-events-none text-orange-400/50 animate-pulse"
                            style={{
                              left: leaf.left,
                              top: `${18 + ((i * 13) % 55)}%`,
                              transform: `rotate(${leaf.rot}deg)`,
                            }}
                          >
                            <span
                              className="inline-block rounded-tl-full rounded-br-full bg-gradient-to-br from-orange-400/70 to-amber-600/40"
                              style={{
                                width: `${leaf.size}px`,
                                height: `${leaf.size}px`,
                              }}
                            />
                          </div>
                        ))}

                      {/* =================================================
                         PARADIGM A: CLEANFRAME PHOTO LIST (Typography-First)
                         ================================================= */}
                      {paradigm === "cleanframe-list" && (
                        <div className="relative z-10 w-full h-full flex flex-col justify-between px-8 py-6">
                          {/* Top Bar: 9:41 Clock on Left + CleanFrame 3 Minimal Outline Icons on Right */}
                          <div className="flex items-center justify-between">
                            <div className="text-3xl sm:text-4xl font-light tracking-tight text-white/95">
                              9:41
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                              <button
                                type="button"
                                onClick={() =>
                                  syncConfig({
                                    ...config,
                                    launcherTheme: {
                                      ...config.launcherTheme,
                                      activeSeason:
                                        season === "fall-pumpkin"
                                          ? "misty-autumn-coast"
                                          : "fall-pumpkin",
                                    },
                                  })
                                }
                                title="Switch Wallpaper"
                                className="p-2 rounded-lg hover:bg-white/10 transition"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  syncConfig({
                                    ...config,
                                    launcherTheme: {
                                      ...config.launcherTheme,
                                      uiParadigm: "piny-tiles",
                                    },
                                  })
                                }
                                title="Switch to Brand Tiles"
                                className="p-2 rounded-lg hover:bg-white/10 transition"
                              >
                                <Grid className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  syncConfig({
                                    ...config,
                                    launcherTheme: {
                                      ...config.launcherTheme,
                                      showContentShelves:
                                        !config.launcherTheme.showContentShelves,
                                    },
                                  })
                                }
                                title="Toggle Ambient Shelf"
                                className="p-2 rounded-lg hover:bg-white/10 transition"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Main Middle: Large Monochrome Icon + Bold Sans Typography List */}
                          <div className="my-auto flex items-center justify-between gap-6">
                            <div className="space-y-1.5 sm:space-y-2">
                              {enabledApps.slice(0, 6).map((app, idx) => {
                                const isSelected = idx === selectedSidebarIdx;
                                return (
                                  <button
                                    key={app.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSidebarIdx(idx);
                                      setActiveLaunchedApp(null);
                                    }}
                                    onDoubleClick={() => setActiveLaunchedApp(app)}
                                    className={`group flex items-center gap-3.5 text-left transition-all duration-150 ${
                                      config.launcherTheme.focusTreatment === "glass" &&
                                      isSelected
                                        ? "bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/25"
                                        : "px-1 py-0.5"
                                    }`}
                                  >
                                    <span
                                      className={`transition-opacity ${
                                        isSelected
                                          ? "text-white opacity-100 scale-110"
                                          : "text-white/55 opacity-60 group-hover:opacity-85"
                                      }`}
                                    >
                                      {renderAppIcon(app.iconKey, "w-5 h-5 sm:w-6 sm:h-6")}
                                    </span>
                                    <span
                                      className={`text-xl sm:text-3xl font-semibold tracking-tight transition-all ${
                                        isSelected
                                          ? "text-white drop-shadow-[0_4px_24px_rgba(249,115,22,0.55)]"
                                          : "text-white/55 group-hover:text-white/80"
                                      }`}
                                    >
                                      {app.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Optional Ambient Content Shelf or Active Launch Overlay */}
                            {activeLaunchedApp ? (
                              <div className="max-w-xs rounded-2xl bg-black/80 backdrop-blur-xl border border-orange-400/50 p-4 text-center space-y-2.5 shadow-2xl">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-orange-300">
                                  luna://com.webos.applicationManager/launch
                                </p>
                                <h3 className="text-base font-semibold text-white">
                                  Opening {activeLaunchedApp.name}
                                </h3>
                                <p className="text-[11px] text-zinc-400 font-mono">
                                  {activeLaunchedApp.id}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveLaunchedApp(null)}
                                  className="h-7 text-xs border-zinc-700 bg-zinc-900 text-zinc-200"
                                >
                                  Esc / Back to Home
                                </Button>
                              </div>
                            ) : config.launcherTheme.showContentShelves ? (
                              <div className="hidden sm:flex flex-col gap-2.5 max-w-md bg-black/45 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                                <div className="text-xs font-medium text-white/90">
                                  Recommended Autumn Ambience for You
                                </div>
                                <div className="grid grid-cols-3 gap-2.5">
                                  {AUTUMN_AMBIENT_SHELF.map((card, i) => (
                                    <div
                                      key={card.title}
                                      className={`rounded-xl p-2.5 bg-gradient-to-br ${
                                        card.gradient
                                      } border ${
                                        i === 0
                                          ? "border-white/80 scale-[1.03]"
                                          : "border-white/10 opacity-80"
                                      }`}
                                    >
                                      <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/50 text-orange-200">
                                        {card.badge}
                                      </span>
                                      <p className="text-[11px] font-medium text-white mt-3 line-clamp-2">
                                        {card.title}
                                      </p>
                                      <p className="text-[9px] text-zinc-300 mt-0.5 truncate">
                                        {card.channel}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Bottom Minimal Seasonal Pill */}
                          <div className="flex items-center justify-between text-[11px] text-white/70">
                            <span>
                              {config.launcherTheme.greetingTitle} ·{" "}
                              <strong className="text-white">{focusedApp?.name}</strong>{" "}
                              ({focusedApp?.subtitle})
                            </span>
                            <span className="font-mono text-[10px] text-white/60">
                              Enter opens selected app
                            </span>
                          </div>
                        </div>
                      )}

                      {/* =================================================
                         PARADIGM B: @IAMPINY BRAND-TILE SQUIRCLE SIDEBAR
                         ================================================= */}
                      {paradigm === "piny-tiles" && (
                        <div className="relative z-10 w-full h-full flex justify-between px-6 py-5">
                          {/* Left Column: Squircle Brand Tiles + Bottom Utility Links */}
                          <div className="flex flex-col justify-between h-full">
                            <div className="flex flex-col gap-2.5">
                              {enabledApps.slice(0, 5).map((app, idx) => {
                                const isSelected = idx === selectedSidebarIdx;
                                return (
                                  <button
                                    key={app.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSidebarIdx(idx);
                                      setActiveLaunchedApp(null);
                                    }}
                                    onDoubleClick={() => setActiveLaunchedApp(app)}
                                    style={{
                                      backgroundColor: app.tileBgColor || "#1f2326",
                                      color: app.tileTextColor || "#ffffff",
                                    }}
                                    className={`relative w-28 sm:w-32 h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center px-2 transition-all duration-150 ${
                                      isSelected
                                        ? "scale-105 ring-2 ring-white shadow-[0_-8px_25px_rgba(255,255,255,0.65)] z-10"
                                        : "opacity-75 hover:opacity-95"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm tracking-tight">
                                      {renderAppIcon(app.iconKey, "w-4 h-4")}
                                      <span className="truncate max-w-[82px]">
                                        {app.name}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* @iampiny Bottom Left Utility Links (Artwork, Apps, Settings, webOS UI) */}
                            <div className="hidden sm:flex flex-col gap-1 pt-2 text-[11px] text-zinc-300">
                              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/10 text-white">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Artwork · Fall Harvest</span>
                              </div>
                              <div className="flex items-center gap-2 px-2 py-0.5 text-zinc-400">
                                <Grid className="w-3.5 h-3.5" />
                                <span>Apps ({enabledApps.length})</span>
                              </div>
                            </div>
                          </div>

                          {/* Center Area: Optional Autumn Lofi / Continue Watching Rows (from @iampiny frames 2-4) */}
                          {config.launcherTheme.showContentShelves && (
                            <div className="my-auto flex-1 px-6 space-y-3">
                              <div className="text-xs font-medium text-zinc-200">
                                Recommended for you · Autumn OLED Ambience
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {AUTUMN_AMBIENT_SHELF.map((card, i) => (
                                  <div
                                    key={card.title}
                                    className={`rounded-2xl p-3 bg-gradient-to-br ${
                                      card.gradient
                                    } border transition ${
                                      i === 0
                                        ? "border-white shadow-lg scale-[1.02]"
                                        : "border-white/10 opacity-85"
                                    }`}
                                  >
                                    <div className="text-[9px] font-mono text-orange-200">
                                      {card.badge}
                                    </div>
                                    <div className="text-xs font-semibold text-white mt-4">
                                      {card.title}
                                    </div>
                                    <div className="text-[10px] text-zinc-300 mt-0.5">
                                      {card.channel}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Right Edge: Top-Right Clock (0:16) + Vertical OLED Brightness Slider (@iampiny frames 5-7) */}
                          <div className="flex flex-col items-end justify-between h-full">
                            <div className="text-xl sm:text-2xl font-light tracking-wider text-white/90">
                              0:16
                            </div>

                            <div className="flex items-center gap-2 my-auto">
                              <button
                                type="button"
                                onClick={() =>
                                  syncConfig({
                                    ...config,
                                    launcherTheme: {
                                      ...config.launcherTheme,
                                      oledBrightness:
                                        config.launcherTheme.oledBrightness >= 95
                                          ? 65
                                          : config.launcherTheme.oledBrightness + 10,
                                    },
                                  })
                                }
                                title="Adjust OLED Brightness"
                                className="w-7 h-7 rounded-full bg-zinc-900/80 border border-white/15 flex items-center justify-center text-white/80 hover:text-white"
                              >
                                <Sun className="w-3.5 h-3.5" />
                              </button>
                              <div className="h-28 w-5 rounded-full bg-black/60 border border-white/15 flex flex-col items-center justify-between py-1.5">
                                <Sun className="w-2.5 h-2.5 text-white/70" />
                                <div className="relative w-0.5 flex-1 bg-white/25 my-1 rounded-full">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full bg-white -left-1 absolute shadow"
                                    style={{
                                      bottom: `${config.launcherTheme.oledBrightness}%`,
                                    }}
                                  />
                                </div>
                                <Sun className="w-2 h-2 text-white/40" />
                              </div>
                            </div>

                            <div className="text-[10px] text-zinc-400">
                              Enter opens {focusedApp?.name}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* =================================================
                         PARADIGM C: ITERATION 2 — HORIZONTAL GLASS DOCK
                         ================================================= */}
                      {paradigm === "horizontal-glass-dock" && (
                        <div className="relative z-10 w-full h-full flex flex-col justify-between px-8 py-6">
                          {/* Top Row: 9:41 Clock on Left + 3 Minimal Translucent Utility Icons on Right */}
                          <div className="flex items-center justify-between">
                            <div className="text-2xl sm:text-3xl font-normal tracking-tight text-white/95 drop-shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
                              9:41
                            </div>
                            <div className="flex items-center gap-2.5 text-white/75">
                              <button
                                type="button"
                                onClick={() =>
                                  syncConfig({
                                    ...config,
                                    launcherTheme: {
                                      ...config.launcherTheme,
                                      activeSeason:
                                        season === "purplish-nebula"
                                          ? "fall-pumpkin"
                                          : "purplish-nebula",
                                    },
                                  })
                                }
                                title="Cycle Purplish Gradient / Wallpaper"
                                className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReorderDockMode((prev) => !prev)}
                                title="All Installed TV Apps & Arrange Dock"
                                className={`p-2 rounded-lg transition ${
                                  reorderDockMode
                                    ? "bg-purple-500/30 text-purple-100 border border-purple-400/50"
                                    : "hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Grid className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReorderDockMode((prev) => !prev)}
                                title="Toggle Hard-Press Move / Delete Mode"
                                className={`p-2 rounded-lg transition ${
                                  reorderDockMode
                                    ? "bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-400/50"
                                    : "hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Center: Launched App Overlay or Subtle Reorder Pill */}
                          <div className="my-auto flex flex-col items-center justify-center pointer-events-none">
                            {activeLaunchedApp && (
                              <div className="pointer-events-auto rounded-2xl bg-black/75 backdrop-blur-xl border border-purple-400/35 px-5 py-3.5 shadow-2xl flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center text-white">
                                  {renderAppIcon(activeLaunchedApp.iconKey, "w-5 h-5")}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-white">
                                    Launching {activeLaunchedApp.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-purple-200/80">
                                    luna://com.webos.applicationManager/launch · {activeLaunchedApp.id}
                                  </div>
                                </div>
                              </div>
                            )}
                            {reorderDockMode && !activeLaunchedApp && (
                              <div className="pointer-events-auto rounded-full bg-purple-950/80 border border-purple-400/45 px-4 py-1.5 text-[11px] text-purple-100 shadow-lg flex items-center gap-2">
                                <span className="font-semibold text-fuchsia-300">
                                  Hard-Press Arrange Active:
                                </span>
                                <span>Use ◀ / ▶ below icon to move order · ✕ to remove from dock</span>
                              </div>
                            )}
                          </div>

                          {/* Bottom Horizontal Frosted Glass Dock + Centered App Title Below */}
                          <div className="flex flex-col items-center pb-1">
                            <div
                              className="w-full max-w-[92%] rounded-[26px] px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-4 border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)]"
                              style={{
                                background:
                                  "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
                                backdropFilter: "blur(28px) saturate(150%)",
                              }}
                            >
                              {enabledApps.slice(0, 9).map((app, idx) => {
                                const isSelected = idx === selectedSidebarIdx;
                                const realIndex = config.apps.findIndex(
                                  (a) => a.id === app.id
                                );
                                return (
                                  <div
                                    key={app.id}
                                    className="relative flex flex-col items-center group"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSidebarIdx(idx);
                                        setActiveLaunchedApp(null);
                                      }}
                                      onDoubleClick={() => setActiveLaunchedApp(app)}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        setSelectedSidebarIdx(idx);
                                        setReorderDockMode((prev) => !prev);
                                      }}
                                      title={`${app.name} (${app.id}) · Double-click to launch · Right-click or hold OK on TV to move/delete`}
                                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                                        isSelected
                                          ? reorderDockMode
                                            ? "text-white opacity-100 scale-125 -translate-y-1.5 bg-purple-500/30 ring-2 ring-purple-300 shadow-[0_10px_28px_rgba(168,85,247,0.55)]"
                                            : "text-white opacity-100 scale-125 -translate-y-0.5 drop-shadow-[0_6px_18px_rgba(255,255,255,0.5)]"
                                          : "text-white/55 opacity-55 hover:opacity-85 hover:text-white/85"
                                      }`}
                                    >
                                      {renderAppIcon(
                                        app.iconKey,
                                        "w-6 h-6 sm:w-8 sm:h-8"
                                      )}
                                    </button>

                                    {/* Hard-Press Move / Delete Controls when Reorder Mode is active on selected icon */}
                                    {reorderDockMode && isSelected && (
                                      <div className="absolute -top-7 flex items-center gap-1 bg-zinc-950/95 border border-purple-400/50 rounded-full px-1.5 py-0.5 shadow-lg z-20">
                                        <button
                                          type="button"
                                          onClick={() => moveApp(realIndex, "up")}
                                          title="Move Left"
                                          className="text-[10px] text-purple-200 hover:text-white px-1"
                                        >
                                          ◀
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleApp(app.id)}
                                          title="Remove from Dock"
                                          className="text-[10px] text-rose-400 hover:text-rose-200 px-1 font-bold"
                                        >
                                          ✕
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveApp(realIndex, "down")}
                                          title="Move Right"
                                          className="text-[10px] text-purple-200 hover:text-white px-1"
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Focused App Label Centered Directly Underneath the Glass Dock (Disney+ style) */}
                            <div className="mt-3 h-6 flex items-center justify-center gap-2">
                              <span className="text-sm sm:text-base font-medium tracking-tight text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                                {focusedApp?.name ?? ""}
                              </span>
                              {reorderDockMode && (
                                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200">
                                  Hold OK · Move / Delete
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : previewCompareMode === "stock-debloated" ? (
                    <div className="w-full h-full flex flex-col justify-between p-5 bg-black">
                      <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                        <span>webOS 10.3.0 Flutter Home (home.xml Stripped Overlay)</span>
                        <span>globalline: 0x0 · recommendedShelf: removed</span>
                      </div>
                      <div className="my-auto text-center text-xs font-mono text-zinc-600">
                        [Pure OLED Pitch-Black Canvas — Only Bottom App Bar Active]
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {enabledApps.slice(0, 7).map((app, idx) => (
                          <div
                            key={app.id}
                            className={`rounded-lg p-2.5 text-center border ${
                              idx === 0
                                ? "bg-zinc-900 border-emerald-400"
                                : "bg-zinc-950 border-zinc-800"
                            }`}
                          >
                            <div className="text-[11px] font-medium text-white truncate">
                              {app.name}
                            </div>
                            <div className="text-[9px] text-zinc-500 truncate mt-0.5">
                              {app.category}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between p-4 bg-zinc-950">
                      <div className="h-28 rounded-lg bg-gradient-to-r from-indigo-950 via-purple-950 to-rose-950 border border-rose-500/40 p-3 flex flex-col justify-between">
                        <div className="flex justify-between text-[10px] text-rose-200">
                          <span>SPONSORED BANNER AD (lgad.cjpowercast.com)</span>
                          <span>Search · Profile · Notifications · globalline</span>
                        </div>
                        <div className="text-xs font-semibold text-white">
                          Watch Live Shopping & Sponsored Channels Now!
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {["ShopTime", "LG Channels", "Sports Alert", "Home Hub", "Game Card"].map(
                          (q) => (
                            <div
                              key={q}
                              className="p-2 rounded bg-zinc-900 border border-rose-500/30 text-[10px] text-zinc-300"
                            >
                              {q} (Q-Card)
                            </div>
                          )
                        )}
                      </div>
                      <div className="h-24 rounded-lg bg-rose-950/30 border border-rose-500/40 p-2.5 text-[11px] text-rose-200">
                        recommendedShelf (531px Tall · Dynamic Ad Rows & Telemetry)
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Remote Control Bar */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">
                      Remote keys active:
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 gap-1"
                      onClick={() => {
                        setActiveLaunchedApp(null);
                        setSelectedSidebarIdx(
                          (prev) =>
                            (prev - 1 + enabledApps.length) %
                            Math.max(1, enabledApps.length)
                        );
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs bg-zinc-900 border-zinc-700 text-zinc-200 gap-1"
                      onClick={() => {
                        setActiveLaunchedApp(null);
                        setSelectedSidebarIdx(
                          (prev) =>
                            (prev + 1) % Math.max(1, enabledApps.length)
                        );
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white"
                      onClick={() => {
                        if (focusedApp) setActiveLaunchedApp(focusedApp);
                      }}
                    >
                      OK
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs bg-zinc-900 border-zinc-700 text-zinc-300"
                      onClick={() => {
                        setPreviewCompareMode("sidebar-seasonal");
                        setActiveLaunchedApp(null);
                      }}
                    >
                      Back
                    </Button>
                  </div>

                  <div className="text-xs text-zinc-400">
                    {saving ? (
                      <span className="text-orange-400 font-mono">
                        Rebuilding debloat_home.sh & slopbro_packed.py...
                      </span>
                    ) : (
                      <span>
                        Focus:{" "}
                        <strong className="text-orange-300 font-mono">
                          home.app.{focusedApp?.name.toLowerCase()}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* STEP-BY-STEP DIRECTIONS TO ROOT & DEPLOY ON YOUR LAN */}
            <Card className="bg-zinc-900/80 border-emerald-500/30 shadow-xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  Step-by-Step Directions: Root & Deploy on Your LG OLED65G3PUA (192.168.97.141)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Run these exact commands from any laptop/computer on your home Wi-Fi (`192.168.97.x`)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Step 1: Publish to GitHub */}
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">
                      Step 1 — Repository (`github.com/james-lopez/lgOS-wolfdenOS`)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Hosted at <code className="text-orange-300">github.com/james-lopez/lgOS-wolfdenOS</code>.
                  </p>
                </div>

                {/* Step 2: Clone & Run woldenOs.py over Wi-Fi */}
                <div className="rounded-lg bg-zinc-950 border border-orange-500/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-orange-300">
                      Step 2 — Run the wolfdenOS & wolf OS Installer on Your Laptop
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-zinc-300 hover:text-white gap-1.5"
                      onClick={() =>
                        copyText(
                          "runlan",
                          `git clone https://github.com/${config.githubOwner}/${config.repoName}.git\ncd ${config.repoName}\npython3 -m pip install websockets\npython3 woldenOs.py --debug --webos-version 10 ${config.tvIp}`
                        )
                      }
                    >
                      {copiedKey === "runlan" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy Commands
                    </Button>
                  </div>
                  <pre className="text-xs font-mono text-orange-200 bg-black p-3 rounded border border-zinc-800 overflow-x-auto">
                    {`git clone https://github.com/${config.githubOwner}/${config.repoName}.git
cd ${config.repoName}
python3 -m pip install websockets
python3 woldenOs.py --debug --webos-version 10 ${config.tvIp}`}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    When prompted on your LG G3 screen, click <strong className="text-white">Accept / Allow</strong> on the TV remote. SlopBro will root the TV, install Homebrew Channel, deploy your <code className="text-zinc-200">tld.slopbro.g3mod</code> custom launcher + stripped <code className="text-zinc-200">home.xml</code>, block all 28 LG ad/ACR domains, and bind your Magic Remote <strong className="text-white">HOME (773)</strong> button.
                  </p>
                </div>

                {/* Step 3: Revert / Safety */}
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300">
                      Optional — Instant Revert to Stock webOS 25 Anytime
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-zinc-400 hover:text-white gap-1"
                      onClick={() =>
                        copyText(
                          "revertcmd",
                          `ssh root@${config.tvIp} "/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert"`
                        )
                      }
                    >
                      {copiedKey === "revertcmd" ? "Copied!" : "Copy Revert"}
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono text-zinc-400 bg-black p-2 rounded border border-zinc-800 overflow-x-auto">
                    {`ssh root@${config.tvIp} "/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert"`}
                  </pre>
                </div>

                {/* Generated Files Inspector */}
                <Tabs defaultValue="debloatsh">
                  <TabsList className="bg-zinc-950 border border-zinc-800 mb-2">
                    <TabsTrigger value="debloatsh" className="text-xs">
                      debloat_home.sh
                    </TabsTrigger>
                    <TabsTrigger value="homexml" className="text-xs">
                      home.xml
                    </TabsTrigger>
                    <TabsTrigger value="keybinds" className="text-xs">
                      keybinds.json
                    </TabsTrigger>
                    <TabsTrigger value="log" className="text-xs">
                      Probe Output
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="debloatsh">
                    <pre className="text-xs font-mono text-cyan-300 bg-black p-3 rounded-lg border border-zinc-800 overflow-x-auto max-h-56">
                      {debloatScript}
                    </pre>
                  </TabsContent>
                  <TabsContent value="homexml">
                    <pre className="text-xs font-mono text-emerald-300 bg-black p-3 rounded-lg border border-zinc-800 overflow-x-auto max-h-56">
                      {generatedXml}
                    </pre>
                  </TabsContent>
                  <TabsContent value="keybinds">
                    <pre className="text-xs font-mono text-amber-300 bg-black p-3 rounded-lg border border-zinc-800 overflow-x-auto max-h-56">
                      {generatedKeybinds}
                    </pre>
                  </TabsContent>
                  <TabsContent value="log">
                    <pre className="text-xs font-mono text-zinc-300 bg-black p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {terminalLog}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right 5 Columns: Two-Zone Home App Editor, Theme, Privacy & Remote Customizer */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  B · Home Editor & webOS 25 Customizer
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Two-zone app editor (&quot;On Home&quot; vs &quot;Recently Removed&quot;), seasonal themes, and privacy shields
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <Tabs defaultValue="sidebar">
                  <TabsList className="grid grid-cols-5 bg-zinc-950 border border-zinc-800 mb-4">
                    <TabsTrigger value="sidebar" className="text-xs">
                      Apps
                    </TabsTrigger>
                    <TabsTrigger value="season" className="text-xs">
                      Theme
                    </TabsTrigger>
                    <TabsTrigger value="home" className="text-xs">
                      XML
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="text-xs">
                      Privacy
                    </TabsTrigger>
                    <TabsTrigger value="remote" className="text-xs">
                      Remote
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: TWO-ZONE APP EDITOR (CleanFrame B - Home editor in Settings) */}
                  <TabsContent value="sidebar" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                          On Home ({enabledApps.length}) &amp; Available Apps
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Reorder with arrows or toggle apps on/off Home
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {config.sidebarApps.map((app, index) => (
                        <div
                          key={app.id}
                          className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                              style={{
                                backgroundColor: app.tileBgColor || app.accentColor,
                                color: app.tileTextColor || "#fff",
                              }}
                            >
                              {renderAppIcon(app.iconKey, "w-3.5 h-3.5")}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {index + 1}. {app.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono truncate">
                                {app.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveSidebarApp(index, -1)}
                              disabled={index === 0}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSidebarApp(index, 1)}
                              disabled={index === config.sidebarApps.length - 1}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <Switch
                              checked={app.enabled}
                              onCheckedChange={(v) => {
                                const updated = config.sidebarApps.map((item, i) =>
                                  i === index ? { ...item, enabled: v } : item
                                );
                                syncConfig({ ...config, sidebarApps: updated });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* TAB 2: SEASONAL & PARADIGM THEME */}
                  <TabsContent value="season" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-300 uppercase tracking-wider">
                        Focus Treatment (CleanFrame)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["type", "glass", "glow"] as const).map((ft) => (
                          <button
                            key={ft}
                            type="button"
                            onClick={() =>
                              syncConfig({
                                ...config,
                                launcherTheme: {
                                  ...config.launcherTheme,
                                  focusTreatment: ft,
                                },
                              })
                            }
                            className={`py-1.5 px-2 rounded border text-xs capitalize ${
                              config.launcherTheme.focusTreatment === ft
                                ? "bg-orange-600 border-orange-500 text-white"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400"
                            }`}
                          >
                            {ft}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-300">
                        Turn-On Welcome Heading
                      </Label>
                      <Input
                        value={config.launcherTheme.greetingTitle}
                        onChange={(e) =>
                          syncConfig({
                            ...config,
                            launcherTheme: {
                              ...config.launcherTheme,
                              greetingTitle: e.target.value,
                            },
                          })
                        }
                        className="bg-zinc-950 border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Floating Autumn Leaves & Embers
                        </p>
                        <p className="text-xs text-zinc-400">
                          Subtle ambient particles across the background
                        </p>
                      </div>
                      <Switch
                        checked={config.launcherTheme.ambientParticles}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            launcherTheme: {
                              ...config.launcherTheme,
                              ambientParticles: v,
                            },
                          })
                        }
                      />
                    </div>
                  </TabsContent>

                  {/* TAB 3: FLUTTER HOME.XML OVERLAY */}
                  <TabsContent value="home" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Remove Recommended Shelf (531px)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Strips <code>recommendedShelf</code> from <code>home.xml</code>
                        </p>
                      </div>
                      <Switch
                        checked={config.homeLayout.removeRecommendedShelf}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            homeLayout: {
                              ...config.homeLayout,
                              removeRecommendedShelf: v,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Remove Q-Card Bloat Row
                        </p>
                        <p className="text-xs text-zinc-400">
                          Strips <code>qcardList</code> above the app bar
                        </p>
                      </div>
                      <Switch
                        checked={config.homeLayout.removeQCardList}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            homeLayout: {
                              ...config.homeLayout,
                              removeQCardList: v,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Hide Top-Right Global Navigation Icons
                        </p>
                        <p className="text-xs text-zinc-400">
                          Sets <code>globalline</code> to <code>0x0</code>
                        </p>
                      </div>
                      <Switch
                        checked={config.homeLayout.hideGlobalLine}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            homeLayout: {
                              ...config.homeLayout,
                              hideGlobalLine: v,
                            },
                          })
                        }
                      />
                    </div>
                  </TabsContent>

                  {/* TAB 4: PRIVACY, ADS & BLOATWARE */}
                  <TabsContent value="privacy" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                          <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                          Sinkhole LG Ad & ACR Domains (/etc/hosts)
                        </p>
                        <p className="text-xs text-zinc-400">
                          28 ad, LivePlus, SmartClip & RDX domains to 0.0.0.0
                        </p>
                      </div>
                      <Switch
                        checked={config.privacy.blockAdHosts}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            privacy: { ...config.privacy, blockAdHosts: v },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Disable LivePlus ACR (Screen Recognition)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Forces <code>livePlus: &quot;off&quot;</code> and <code>personalizedAd: &quot;off&quot;</code>
                        </p>
                      </div>
                      <Switch
                        checked={config.privacy.disableLivePlusAcr}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            privacy: {
                              ...config.privacy,
                              disableLivePlusAcr: v,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Block LG OTA Firmware Updates
                        </p>
                        <p className="text-xs text-zinc-400">
                          Protects root across reboots
                        </p>
                      </div>
                      <Switch
                        checked={config.privacy.blockOtaUpdates}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            privacy: {
                              ...config.privacy,
                              blockOtaUpdates: v,
                            },
                          })
                        }
                      />
                    </div>
                  </TabsContent>

                  {/* TAB 5: MAGIC REMOTE REMAPPING */}
                  <TabsContent value="remote" className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div>
                        <p className="text-xs font-medium text-white">
                          Syspoke lginputhook v1.5.0 (webOS 25)
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Hijacks HOME (773) &amp; remaps sponsored buttons
                        </p>
                      </div>
                      <Switch
                        checked={config.keybinds.installInputHook}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            keybinds: {
                              ...config.keybinds,
                              installInputHook: v,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {Object.entries(config.keybinds.mappings).map(
                        ([key, mapping]) => (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white">
                                {mapping.buttonName}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                uinput: {mapping.uinputCode}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={mapping.action}
                                onChange={(e) => {
                                  const action = e.target.value as
                                    | "unchanged"
                                    | "disable"
                                    | "launch";
                                  syncConfig({
                                    ...config,
                                    keybinds: {
                                      ...config.keybinds,
                                      mappings: {
                                        ...config.keybinds.mappings,
                                        [key]: { ...mapping, action },
                                      },
                                    },
                                  });
                                }}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                              >
                                <option value="launch">Launch App</option>
                                <option value="disable">Disable</option>
                                <option value="unchanged">Default</option>
                              </select>

                              {mapping.action === "launch" && (
                                <select
                                  value={mapping.targetAppId}
                                  onChange={(e) =>
                                    syncConfig({
                                      ...config,
                                      keybinds: {
                                        ...config.keybinds,
                                        mappings: {
                                          ...config.keybinds.mappings,
                                          [key]: {
                                            ...mapping,
                                            targetAppId: e.target.value,
                                          },
                                        },
                                      },
                                    })
                                  }
                                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-orange-300"
                                >
                                  {APP_PRESETS.map((app) => (
                                    <option key={app.id} value={app.id}>
                                      {app.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Loaded Inspiration Assets Card */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-2 border-b border-zinc-800/80">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-400" />
                  Synced Inspiration Reference (@iampiny + CleanFrame)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3 text-xs text-zinc-400">
                <p>
                  Both inspirations are now built directly into your launcher and packaged into <code className="text-zinc-200">tld.slopbro.g3mod</code>:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>
                    <strong className="text-white">CleanFrame Photo List</strong>: Top-left <code className="text-zinc-200">9:41</code> clock, large monochrome icon + bold sans-serif typography list on the left third, top-right quick icons, and two-zone Home editor.
                  </li>
                  <li>
                    <strong className="text-white">@iampiny Video UI</strong>: High-contrast brand squircle tiles (YouTube, Netflix, Plex, Spotify, GeForce/Moonlight), top-right <code className="text-zinc-200">0:16</code> clock, right-edge OLED brightness slider, and optional autumn lofi content shelf.
                  </li>
                </ul>
                <label className="cursor-pointer rounded-lg border border-dashed border-zinc-700 hover:border-orange-500/60 bg-zinc-950 p-2.5 flex items-center justify-center gap-2 text-center transition">
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] text-zinc-300">
                    {inspoVideoName
                      ? `Loaded: ${inspoVideoName}`
                      : "Drop additional video/image to compare"}
                  </span>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleInspoUpload}
                    className="hidden"
                  />
                </label>
                {inspoVideoUrl && (
                  <video
                    src={inspoVideoUrl}
                    controls
                    loop
                    muted
                    className="w-full max-h-48 rounded-lg object-contain bg-black"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
