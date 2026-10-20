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

const APP_PRESETS = [
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

function renderAppIcon(iconKey: string) {
  switch (iconKey) {
    case "youtube":
      return <Play className="w-4 h-4 fill-current" />;
    case "netflix":
    case "disney":
    case "prime":
      return <Film className="w-4 h-4" />;
    case "jellyfin":
    case "plex":
      return <Server className="w-4 h-4" />;
    case "spotify":
      return <Music className="w-4 h-4" />;
    case "gamepad":
    case "moonlight":
      return <Gamepad2 className="w-4 h-4" />;
    default:
      return <Compass className="w-4 h-4" />;
  }
}

const INITIAL_SIDEBAR_APPS: SidebarAppItem[] = [
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

const INITIAL_CONFIG: G3ModConfig = {
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
  const [tvPowerState, setTvPowerState] = useState<"on" | "turning-on" | "launched">("on");
  const [activeLaunchedApp, setActiveLaunchedApp] = useState<SidebarAppItem | null>(null);
  const [inspoVideoUrl, setInspoVideoUrl] = useState<string | null>(null);
  const [inspoVideoName, setInspoVideoName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string>(
    "[ready] Repo: github.com/james-lopez/lgOS-getSlopped\n[ready] Target: LG OLED65G3PUA @ 192.168.97.141 (webOS 25 / 10.3.0-2504)\n[ready] Theme: Fall & Pumpkin Harvest Turn-On + Seamless Sidebar Launcher"
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

  // Allow keyboard Up/Down/Enter navigation inside the interactive TV preview
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (previewCompareMode !== "sidebar-seasonal" || enabledApps.length === 0) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveLaunchedApp(null);
        setSelectedSidebarIdx((prev) => (prev + 1) % enabledApps.length);
      } else if (e.key === "ArrowUp") {
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
    }, 1400);
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
      `[exec] Saving lgOS-getSlopped payload to wwwroot/debloat_home.sh and rebuilding dist/slopbro_packed.py...\n[exec] Running: python3 slopbro.py --debug --webos-version 10 ${config.tvIp}\n[wait] Connecting to wss://${config.tvIp}:3001 ...`
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
          }\n\nNote: When you are ready to run this on your LAN (${
            config.tvIp
          }), download the single-file script or run from github.com/${
            config.githubOwner
          }/${config.repoName}.`
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500/30">
      {/* Top Header Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-950/50">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-semibold text-base sm:text-lg tracking-tight text-white">
                  lgOS-getSlopped
                </h1>
                <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-xs font-mono">
                  github.com/{config.githubOwner}/{config.repoName}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs">
                  OLED65G3PUA · webOS 25 (10.3.0)
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Interactive Sidebar Launcher + Seasonal Fall/Pumpkin Turn-On Ambience + Plug-and-Play SlopBro Root Suite
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
            <a href="/api/download?file=packed" download="lgOS-getSlopped.py">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download Plug-and-Play (.py)
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
              Deploy to {config.tvIp}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Interactive OLED65G3PUA TV Simulator + Remote + Inspo Video Compare */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden shadow-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Interactive OLED65G3PUA Launcher Playground
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Use <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">↑</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">↓</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-200">Enter</kbd>{" "}
                    or click any app in the sidebar to test navigation & turn-on feel
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
                    Sidebar + Fall Theme
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
                    Minimal Bottom Bar
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

              <CardContent className="p-5">
                {/* 16:9 LG OLED65G3PUA Bezel */}
                <div className="relative aspect-video w-full rounded-xl border-[5px] border-zinc-800 bg-black shadow-2xl overflow-hidden select-none">
                  {/* Turn-On OLED Curtain Transition */}
                  {tvPowerState === "turning-on" && (
                    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center animate-pulse">
                      <div className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3">
                        <Flame className="w-10 h-10 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium tracking-widest uppercase text-orange-200">
                        OLED65G3PUA · Warming Up Fall Harvest Scene...
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-1">
                        0 Ads · 0 Telemetry · Instant Sidebar Ready
                      </p>
                    </div>
                  )}

                  {previewCompareMode === "sidebar-seasonal" ? (
                    /* =========================================================
                       MODE 1: SEAMLESS SIDEBAR + SEASONAL FALL & PUMPKIN SCENE
                       ========================================================= */
                    <div className="relative w-full h-full flex overflow-hidden">
                      {/* Seasonal Background Layer */}
                      {season === "fall-pumpkin" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#120703] via-[#261005] to-[#090402]">
                          {/* Warm Autumn Moon & Lantern Glows */}
                          <div
                            className="absolute -top-16 right-12 w-72 h-72 rounded-full opacity-40 blur-3xl pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(249,115,22,0.65) 0%, rgba(180,83,9,0.2) 60%, transparent 100%)",
                            }}
                          />
                          <div
                            className="absolute bottom-0 right-1/4 w-96 h-56 rounded-full opacity-35 blur-3xl pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(circle, rgba(245,158,11,0.5) 0%, rgba(124,45,18,0.15) 70%, transparent 100%)",
                            }}
                          />

                          {/* Vector Autumn Hills, Forest & Glowing Pumpkins SVG */}
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

                            {/* Harvest Moon */}
                            <circle cx="930" cy="150" r="175" fill="url(#harvestMoon)" />
                            <circle cx="930" cy="150" r="52" fill="#fef3c7" fillOpacity="0.88" />

                            {/* Distant Autumn Hills */}
                            <path
                              d="M0,470 Q320,380 650,455 T1200,420 L1200,675 L0,675 Z"
                              fill="url(#hillBack)"
                            />
                            {/* Foreground Silhouette Ridge */}
                            <path
                              d="M0,535 Q420,470 820,530 T1200,505 L1200,675 L0,675 Z"
                              fill="url(#hillFront)"
                            />

                            {/* Warm Glowing Jack-O'-Lantern / Pumpkins Cluster on Right Ridge */}
                            {/* Large Main Pumpkin */}
                            <g transform="translate(880, 485)">
                              <ellipse cx="0" cy="48" rx="68" ry="14" fill="#000" opacity="0.55" />
                              <path
                                d="M-10,-32 Q-4,-48 8,-44 Q4,-30 6,-22 Z"
                                fill="#3f230f"
                              />
                              <ellipse cx="-24" cy="10" rx="28" ry="34" fill="#c2410c" />
                              <ellipse cx="24" cy="10" rx="28" ry="34" fill="#c2410c" />
                              <ellipse cx="-12" cy="12" rx="26" ry="36" fill="#ea580c" />
                              <ellipse cx="12" cy="12" rx="26" ry="36" fill="#ea580c" />
                              <ellipse cx="0" cy="12" rx="22" ry="37" fill="#f97316" />
                              {/* Warm Carved Eyes & Smile Glow */}
                              <polygon points="-18,2 -8,-10 -2,2" fill="url(#pumpkinGlow)" />
                              <polygon points="18,2 8,-10 2,2" fill="url(#pumpkinGlow)" />
                              <path
                                d="M-22,18 Q0,34 22,18 Q12,24 0,24 Q-12,24 -22,18 Z"
                                fill="url(#pumpkinGlow)"
                              />
                            </g>

                            {/* Second Cozy Pumpkin */}
                            <g transform="translate(975, 512) scale(0.72)">
                              <ellipse cx="0" cy="45" rx="52" ry="11" fill="#000" opacity="0.5" />
                              <path
                                d="M-6,-28 Q0,-42 10,-38 Q5,-26 6,-18 Z"
                                fill="#3f230f"
                              />
                              <ellipse cx="-18" cy="10" rx="24" ry="30" fill="#9a3412" />
                              <ellipse cx="18" cy="10" rx="24" ry="30" fill="#9a3412" />
                              <ellipse cx="0" cy="11" rx="24" ry="32" fill="#d97706" />
                            </g>

                            {/* Third Small Gourd */}
                            <g transform="translate(805, 520) scale(0.58)">
                              <ellipse cx="0" cy="42" rx="45" ry="10" fill="#000" opacity="0.5" />
                              <ellipse cx="-15" cy="10" rx="22" ry="28" fill="#b45309" />
                              <ellipse cx="15" cy="10" rx="22" ry="28" fill="#b45309" />
                              <ellipse cx="0" cy="11" rx="20" ry="29" fill="#f59e0b" />
                            </g>
                          </svg>

                          {/* Floating Autumn Leaves & Embers */}
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
                                  className="inline-block rounded-tl-full rounded-br-full bg-gradient-to-br from-orange-400/70 to-amber-600/40 shadow-sm shadow-orange-500/30"
                                  style={{
                                    width: `${leaf.size}px`,
                                    height: `${leaf.size}px`,
                                  }}
                                />
                              </div>
                            ))}
                        </div>
                      )}

                      {season === "winter-aurora" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#020813] via-[#061c2e] to-[#020409]" />
                      )}

                      {season === "midnight-oled" && (
                        <div className="absolute inset-0 bg-black" />
                      )}

                      {/* Main Layout Container (Left or Right Sidebar) */}
                      <div
                        className={`relative z-10 w-full h-full flex ${
                          config.launcherTheme.sidebarPosition === "right"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        {/* SEAMLESS SIDEBAR DOCK */}
                        <div
                          className={`w-64 sm:w-72 h-full flex flex-col justify-between p-3.5 transition-all ${
                            config.launcherTheme.sidebarStyle === "pure-oled"
                              ? "bg-black/95 border-r border-zinc-900"
                              : "bg-black/65 backdrop-blur-xl border-r border-orange-500/20"
                          }`}
                        >
                          {/* Sidebar Header */}
                          <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-sm shadow-orange-400" />
                              <span className="text-xs font-semibold tracking-wide text-orange-100">
                                Quick Apps
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-orange-300/80">
                              HOME · 773
                            </span>
                          </div>

                          {/* Major Apps Vertical Rail */}
                          <div className="my-2 flex-1 space-y-1 overflow-y-auto pr-1">
                            {enabledApps.map((app, idx) => {
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
                                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all duration-150 ${
                                    isSelected
                                      ? "bg-gradient-to-r from-orange-500/30 via-amber-500/15 to-transparent border border-orange-400/60 shadow-lg shadow-orange-950/60 scale-[1.01]"
                                      : "hover:bg-white/5 border border-transparent text-zinc-400"
                                  }`}
                                >
                                  <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow"
                                    style={{
                                      backgroundColor: isSelected
                                        ? app.accentColor
                                        : "rgba(39,39,42,0.85)",
                                    }}
                                  >
                                    {renderAppIcon(app.iconKey)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className={`text-xs font-medium truncate ${
                                        isSelected ? "text-white" : "text-zinc-300"
                                      }`}
                                    >
                                      {app.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {app.subtitle}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-200 border border-orange-400/30">
                                      OK
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Sidebar Footer Status */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between px-2 text-[10px] text-zinc-400">
                            <span>eARC: Atmos Ready</span>
                            <span className="text-emerald-400 font-mono">
                              ACR/Ads: 0
                            </span>
                          </div>
                        </div>

                        {/* RIGHT AMBIENT CANVAS STAGE */}
                        <div className="flex-1 h-full flex flex-col justify-between p-6 relative">
                          {/* Top Clock & Autumn Weather Pill */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-950/60 border border-orange-500/30 text-[10px] text-orange-200">
                                <Flame className="w-3 h-3 text-orange-400" />
                                <span>{config.launcherTheme.greetingTitle}</span>
                              </div>
                              <p className="text-[11px] text-orange-100/70 pl-1 pt-0.5">
                                {config.launcherTheme.greetingSubtitle}
                              </p>
                            </div>

                            <div className="text-right bg-black/45 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                              <div className="text-2xl font-light tracking-wider text-amber-50">
                                8:45 PM
                              </div>
                              <div className="text-[10px] text-orange-200/80">
                                Oct 20 · 54°F Crisp Autumn Night
                              </div>
                            </div>
                          </div>

                          {/* Center / Bottom Focused App Card or Launched App View */}
                          {activeLaunchedApp ? (
                            <div className="my-auto mx-auto w-full max-w-md rounded-2xl bg-black/80 backdrop-blur-xl border border-orange-400/50 p-5 text-center space-y-3 shadow-2xl">
                              <div
                                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
                                style={{
                                  backgroundColor: activeLaunchedApp.accentColor,
                                }}
                              >
                                {renderAppIcon(activeLaunchedApp.iconKey)}
                              </div>
                              <div>
                                <p className="text-xs font-mono uppercase tracking-widest text-orange-300">
                                  luna://com.webos.applicationManager/launch
                                </p>
                                <h3 className="text-lg font-semibold text-white mt-0.5">
                                  Launching {activeLaunchedApp.name}...
                                </h3>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                  appId: &quot;{activeLaunchedApp.id}&quot;
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveLaunchedApp(null)}
                                className="border-zinc-700 bg-zinc-900 text-xs text-zinc-200"
                              >
                                Press HOME (Back to Sidebar)
                              </Button>
                            </div>
                          ) : (
                            focusedApp && (
                              <div className="mt-auto max-w-md rounded-2xl bg-black/55 backdrop-blur-md border border-orange-400/25 p-4 flex items-center justify-between gap-4 shadow-xl">
                                <div className="flex items-center gap-3.5">
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                                    style={{
                                      backgroundColor: focusedApp.accentColor,
                                    }}
                                  >
                                    {renderAppIcon(focusedApp.iconKey)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-white">
                                        {focusedApp.name}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] border-orange-400/30 text-orange-200"
                                      >
                                        {focusedApp.category}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-300 mt-0.5">
                                      {focusedApp.subtitle}
                                    </p>
                                    <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                      ID: {focusedApp.id}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setActiveLaunchedApp(focusedApp)}
                                  className="bg-orange-600 hover:bg-orange-500 text-white text-xs shrink-0"
                                >
                                  Launch
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : previewCompareMode === "stock-debloated" ? (
                    /* =========================================================
                       MODE 2: DEBLOATED NATIVE BOTTOM BAR (home.xml OVERLAY)
                       ========================================================= */
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
                    /* =========================================================
                       MODE 3: STOCK UNMODIFIED WEBOS 25 (WITH BLOAT & ADS)
                       ========================================================= */
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

                {/* Interactive D-Pad Remote Bar under the TV */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">
                      Test Remote Control:
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
                      <ChevronUp className="w-3.5 h-3.5" /> Up
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
                      <ChevronDown className="w-3.5 h-3.5" /> Down
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white"
                      onClick={() => {
                        if (focusedApp) setActiveLaunchedApp(focusedApp);
                      }}
                    >
                      OK / Launch
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
                      HOME (773)
                    </Button>
                  </div>

                  <div className="text-xs text-zinc-400">
                    {saving ? (
                      <span className="text-orange-400 font-mono">
                        Syncing payload...
                      </span>
                    ) : (
                      <span>
                        Focused:{" "}
                        <strong className="text-orange-300">
                          {focusedApp?.name || "None"}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inspiration Video Dropzone + Phone Remote Session Control Helper */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-400" />
                  Phone Inspiration Video Upload & Side-by-Side Reference
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Attach your inspiration video directly in the Cursor chat from your phone, or drop it right here to compare side-by-side with the TV simulator above.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-700 hover:border-orange-500/60 bg-zinc-950/70 p-4 flex flex-col items-center justify-center text-center transition">
                    <Upload className="w-6 h-6 text-orange-400 mb-2" />
                    <span className="text-xs font-medium text-white">
                      Drop or Select Inspiration Video / Image (.mp4, .mov, .webm, .png)
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-1">
                      {inspoVideoName
                        ? `Loaded: ${inspoVideoName}`
                        : "Test locally in the studio or attach in Cursor chat so the agent can inspect every frame"}
                    </span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleInspoUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 text-xs space-y-1.5">
                    <div className="font-semibold text-orange-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      Uploading from Your Phone in Cursor
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      1. Open <strong className="text-zinc-200">cursor.com/agents</strong> on your phone (or the Cursor mobile app) and open this session.
                    </p>
                    <p className="text-zinc-400 leading-relaxed">
                      2. Tap the <strong className="text-zinc-200">+ / attachment</strong> icon in the message box to upload your inspiration video directly from your camera roll—I can analyze the video frames and match the exact sidebar animation, spacing, and transitions!
                    </p>
                  </div>
                </div>

                {inspoVideoUrl && (
                  <div className="rounded-xl overflow-hidden border border-orange-500/30 bg-black p-2">
                    <p className="text-xs font-mono text-orange-300 mb-2 px-1">
                      Reference Inspiration Preview ({inspoVideoName})
                    </p>
                    <video
                      src={inspoVideoUrl}
                      controls
                      loop
                      muted
                      className="w-full max-h-64 rounded-lg object-contain bg-black"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GitHub Repo Push & Plug-and-Play Community Installer Card */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  Publish to{" "}
                  <code className="text-emerald-300">
                    github.com/{config.githubOwner}/{config.repoName}
                  </code>{" "}
                  & Plug-and-Play CLI
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  One-click repository creation or terminal push so anyone can clone and customize their own LG webOS TV
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Tabs defaultValue="github">
                  <TabsList className="bg-zinc-950 border border-zinc-800 mb-3">
                    <TabsTrigger value="github" className="text-xs">
                      Push to GitHub ({config.repoName})
                    </TabsTrigger>
                    <TabsTrigger value="plugplay" className="text-xs">
                      Plug & Play Run
                    </TabsTrigger>
                    <TabsTrigger value="debloatsh" className="text-xs">
                      debloat_home.sh
                    </TabsTrigger>
                    <TabsTrigger value="homexml" className="text-xs">
                      home.xml
                    </TabsTrigger>
                    <TabsTrigger value="keybinds" className="text-xs">
                      keybinds.json
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="github" className="space-y-3">
                    <div className="rounded-lg bg-zinc-950 border border-emerald-500/30 p-3 space-y-2">
                      <p className="text-xs font-semibold text-emerald-300">
                        Method A (Easiest in Cursor): Click the &quot;Create repo&quot; Pill
                      </p>
                      <p className="text-xs text-zinc-400">
                        Because this session started as a new project without a linked GitHub repository, click the{" "}
                        <strong className="text-white">Create repo</strong> pill at the top of your Cursor agent view and name it{" "}
                        <code className="text-orange-300">lgOS-getSlopped</code> under{" "}
                        <code className="text-orange-300">james-lopez</code>. All commits on <code className="text-zinc-200">main</code> will immediately publish there.
                      </p>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">
                          Method B: Push Directly via Git Remote
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-zinc-400 hover:text-white gap-1.5"
                          onClick={() =>
                            copyText(
                              "ghpush",
                              `git remote add github https://github.com/${config.githubOwner}/${config.repoName}.git\ngit push -u github main`
                            )
                          }
                        >
                          {copiedKey === "ghpush" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copy Commands
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-emerald-400 bg-black/60 p-2.5 rounded border border-zinc-800/80 overflow-x-auto">
                        {`git remote add github https://github.com/${config.githubOwner}/${config.repoName}.git\ngit push -u github main`}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="plugplay" className="space-y-3">
                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">
                          Plug-and-Play Single Command (For You or Any Community User)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-zinc-400 hover:text-white gap-1.5"
                          onClick={() =>
                            copyText(
                              "cmd1",
                              `git clone https://github.com/${config.githubOwner}/${config.repoName}.git\ncd ${config.repoName}\npython3 slopbro.py --debug --webos-version 10 ${config.tvIp}`
                            )
                          }
                        >
                          {copiedKey === "cmd1" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copy
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-orange-300 bg-black/60 p-2.5 rounded border border-zinc-800/80 overflow-x-auto">
                        {`git clone https://github.com/${config.githubOwner}/${config.repoName}.git\ncd ${config.repoName}\npython3 slopbro.py --debug --webos-version 10 ${config.tvIp}`}
                      </pre>
                    </div>

                    <div className="rounded-lg bg-black border border-zinc-800 p-3">
                      <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {terminalLog}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="debloatsh">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 h-7 text-xs bg-zinc-900 border-zinc-700"
                        onClick={() => copyText("sh", debloatScript)}
                      >
                        {copiedKey === "sh" ? "Copied!" : "Copy Script"}
                      </Button>
                      <pre className="text-xs font-mono text-cyan-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-72">
                        {debloatScript}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="homexml">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 h-7 text-xs bg-zinc-900 border-zinc-700"
                        onClick={() => copyText("xml", generatedXml)}
                      >
                        {copiedKey === "xml" ? "Copied!" : "Copy XML"}
                      </Button>
                      <pre className="text-xs font-mono text-emerald-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-72">
                        {generatedXml}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="keybinds">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 h-7 text-xs bg-zinc-900 border-zinc-700"
                        onClick={() => copyText("kb", generatedKeybinds)}
                      >
                        {copiedKey === "kb" ? "Copied!" : "Copy JSON"}
                      </Button>
                      <pre className="text-xs font-mono text-amber-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-72">
                        {generatedKeybinds}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right 5 Columns: Sidebar Apps, Seasonal Theme, Privacy & Remote Customizer */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white">
                  Sidebar, Seasonal Theme & OS Customizer
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Play with the sidebar apps, Fall/Pumpkin turn-on visuals, and privacy shields before running on{" "}
                  <code className="text-zinc-200">{config.tvIp}</code>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <Tabs defaultValue="sidebar">
                  <TabsList className="grid grid-cols-5 bg-zinc-950 border border-zinc-800 mb-4">
                    <TabsTrigger value="sidebar" className="text-xs">
                      Sidebar
                    </TabsTrigger>
                    <TabsTrigger value="season" className="text-xs">
                      Fall BG
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

                  {/* TAB 1: SIDEBAR APPS & NAVIGATION */}
                  <TabsContent value="sidebar" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                          Major Apps in Sidebar Rail
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Toggle or reorder apps in the vertical sidebar
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded border border-zinc-800">
                        <button
                          type="button"
                          onClick={() =>
                            syncConfig({
                              ...config,
                              launcherTheme: {
                                ...config.launcherTheme,
                                sidebarPosition: "left",
                              },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            config.launcherTheme.sidebarPosition === "left"
                              ? "bg-orange-600 text-white"
                              : "text-zinc-400"
                          }`}
                        >
                          Left Dock
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            syncConfig({
                              ...config,
                              launcherTheme: {
                                ...config.launcherTheme,
                                sidebarPosition: "right",
                              },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            config.launcherTheme.sidebarPosition === "right"
                              ? "bg-orange-600 text-white"
                              : "text-zinc-400"
                          }`}
                        >
                          Right Dock
                        </button>
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
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: app.accentColor }}
                            >
                              {renderAppIcon(app.iconKey)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {app.name}
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

                  {/* TAB 2: SEASONAL FALL & PUMPKIN BACKGROUND */}
                  <TabsContent value="season" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-300 uppercase tracking-wider">
                        Turn-On Seasonal Backdrop
                      </Label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          {
                            id: "fall-pumpkin" as const,
                            title: "Autumn Harvest & Glowing Pumpkins (Active)",
                            desc: "Warm harvest moon, carved jack-o'-lantern glow & drifting autumn leaves on OLED dark canvas",
                          },
                          {
                            id: "winter-aurora" as const,
                            title: "Winter Midnight Aurora",
                            desc: "Deep arctic blue & emerald aurora borealis gradient",
                          },
                          {
                            id: "midnight-oled" as const,
                            title: "Pure Pitch-Black OLED (0% APL)",
                            desc: "Complete pixel-off background with floating sidebar rail",
                          },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              syncConfig({
                                ...config,
                                launcherTheme: {
                                  ...config.launcherTheme,
                                  activeSeason: preset.id,
                                },
                              })
                            }
                            className={`p-3 rounded-lg border text-left transition ${
                              config.launcherTheme.activeSeason === preset.id
                                ? "bg-orange-950/40 border-orange-500/60 text-white"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <div className="text-xs font-semibold text-orange-200">
                              {preset.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              {preset.desc}
                            </div>
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

                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-300">
                        Subheading / Ambience Caption
                      </Label>
                      <Input
                        value={config.launcherTheme.greetingSubtitle}
                        onChange={(e) =>
                          syncConfig({
                            ...config,
                            launcherTheme: {
                              ...config.launcherTheme,
                              greetingSubtitle: e.target.value,
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

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Frosted Glass Sidebar Backdrop
                        </p>
                        <p className="text-xs text-zinc-400">
                          Translucent blur over the pumpkin harvest scene
                        </p>
                      </div>
                      <Switch
                        checked={
                          config.launcherTheme.sidebarStyle === "frosted-glass"
                        }
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            launcherTheme: {
                              ...config.launcherTheme,
                              sidebarStyle: v ? "frosted-glass" : "pure-oled",
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
                          Sets <code>globalline</code> to <code>0x0</code> after <code>herobanner</code>
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

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Strip Hero Promo Text (i18n Override)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Blanks &quot;Start a new experience with webOS&quot;
                        </p>
                      </div>
                      <Switch
                        checked={config.homeLayout.blankPromoText}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            homeLayout: {
                              ...config.homeLayout,
                              blankPromoText: v,
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
                          Kill AdOverlay & RDXD Daemons in RAM
                        </p>
                        <p className="text-xs text-zinc-400">
                          Terminates <code>adoverlay</code>, <code>acroverlay</code>, and <code>rdxd</code>
                        </p>
                      </div>
                      <Switch
                        checked={config.privacy.killAdOverlays}
                        onCheckedChange={(v) =>
                          syncConfig({
                            ...config,
                            privacy: {
                              ...config.privacy,
                              killAdOverlays: v,
                              killRdxdTelemetry: v,
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
                          Remaps physical sponsored remote buttons via uinput_code
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
          </div>
        </div>
      </main>
    </div>
  );
}
