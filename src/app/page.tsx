"use client";

import React, { useEffect, useState } from "react";
import {
  Tv,
  ShieldCheck,
  Zap,
  Trash2,
  Gamepad2,
  Terminal,
  Download,
  Play,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Lock,
  Layers,
  WifiOff,
  RotateCcw,
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
import { Separator } from "@/components/ui/separator";

interface G3ModConfig {
  tvIp: string;
  tvModel: string;
  webosVersion: string;
  localIpOverride: string;
  debug: boolean;
  curlInsecure: boolean;
  fakeServicePath: string;
  homeLayout: {
    mode: "stock-debloated" | "custom-home";
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

export default function G3StudioPage() {
  const [config, setConfig] = useState<G3ModConfig | null>(null);
  const [generatedXml, setGeneratedXml] = useState<string>("");
  const [generatedKeybinds, setGeneratedKeybinds] = useState<string>("");
  const [debloatScript, setDebloatScript] = useState<string>("");
  const [previewCompareMode, setPreviewCompareMode] = useState<
    "configured" | "stock"
  >("configured");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string>(
    "[ready] Target: LG OLED65G3PUA @ 192.168.97.141 (webOS 25 / 10.3.0-2504)\n[ready] Exploit vector: com.webos.service.jsserver + /usr/palm/services/com.palm.service.devmode bypass\n[ready] Payload files queued: index.html, autoroot.sh, package.json, main.js, debloat_home.sh"
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

  const handleRunSlopbro = async () => {
    if (!config) return;
    setRunning(true);
    setTerminalLog(
      `[exec] Saving payload to wwwroot/debloat_home.sh and rebuilding dist/slopbro_packed.py...\n[exec] Running: python3 slopbro.py --debug --webos-version 10 ${config.tvIp}\n[wait] Connecting to wss://${config.tvIp}:3001 ...`
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
          }\n\nNote: If running from a cloud workspace not on the 192.168.97.0/24 LAN, download the packed single-file script above and run: python3 slopbro_g3_packed.py ${
            config.tvIp
          }`
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

  if (!config) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Loading OLED65G3PUA SlopBro Studio...</span>
        </div>
      </div>
    );
  }

  const isStockPreview = previewCompareMode === "stock";
  const showRecShelf = isStockPreview || !config.homeLayout.removeRecommendedShelf;
  const showQCards = isStockPreview || !config.homeLayout.removeQCardList;
  const showGlobalNav = isStockPreview || !config.homeLayout.hideGlobalLine;
  const showPromoBannerText = isStockPreview || !config.homeLayout.blankPromoText;
  const useOledPitchBlack = !isStockPreview && config.homeLayout.oledBlackBanner;

  const activePrivacyCount = Object.values(config.privacy).filter(Boolean).length;
  const activeHomeSpeedups = [
    config.homeLayout.removeRecommendedShelf,
    config.homeLayout.removeQCardList,
    config.homeLayout.hideGlobalLine,
    config.homeLayout.hideQuickGuide,
    config.homeLayout.blankPromoText,
    config.homeLayout.oledBlackBanner,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Top Header Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-semibold text-base sm:text-lg tracking-tight text-white">
                  SlopBro G3 Studio
                </h1>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs">
                  OLED65G3PUA
                </Badge>
                <Badge
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 text-xs font-mono"
                >
                  webOS 25 / 10.3.0-2504
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Root Exploit + Flutter Home Debloater + ACR/Ad Sinkhole for{" "}
                <span className="font-mono text-zinc-200">{config.tvIp}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a href="/api/download?file=packed" download="slopbro_g3_packed.py">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download Single-File (.py)
              </Button>
            </a>
            <a href="/api/download?file=debloat" download="debloat_home.sh">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 gap-2"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                debloat_home.sh
              </Button>
            </a>
            <Button
              size="sm"
              onClick={handleRunSlopbro}
              disabled={running}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
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
        {/* Top Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                  Target Television
                </p>
                <p className="text-lg font-semibold font-mono text-white mt-0.5">
                  {config.tvIp}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  Flutter Home Engine (webOS 10.3.0)
                </p>
              </div>
              <Tv className="w-8 h-8 text-zinc-700" />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                  Home UI Speedup
                </p>
                <p className="text-lg font-semibold text-white mt-0.5">
                  {activeHomeSpeedups} / 6 Optimizations
                </p>
                <p className="text-xs text-cyan-400 mt-1">
                  {config.homeLayout.mode === "stock-debloated"
                    ? "Bind-Mount XML Overlay"
                    : "Custom Home Replacement"}
                </p>
              </div>
              <Zap className="w-8 h-8 text-cyan-500/40" />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                  Ad & ACR Armor
                </p>
                <p className="text-lg font-semibold text-white mt-0.5">
                  {activePrivacyCount} / 8 Shields Active
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  28 LG Ad/ACR Domains Sinkholed
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-500/40" />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                  Filesystem Safety
                </p>
                <p className="text-lg font-semibold text-white mt-0.5">
                  100% Reversible
                </p>
                <p className="text-xs text-amber-400 mt-1">
                  RAM /tmp Overlay + init.d Hook
                </p>
              </div>
              <Lock className="w-8 h-8 text-amber-500/40" />
            </CardContent>
          </Card>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Live OLED65G3PUA TV Simulator + Execution Console */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Live OLED65G3PUA Screen Preview (webOS 10.3.0 Flutter Home)
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Real-time visual simulation of{" "}
                    <code className="text-zinc-300">
                      /usr/palm/applications/com.webos.app.home/data/flutter_assets/assets/home.xml
                    </code>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewCompareMode("configured")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      previewCompareMode === "configured"
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Debloated G3
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCompareMode("stock")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      previewCompareMode === "stock"
                        ? "bg-rose-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Stock webOS 25 (Bloat)
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {/* 16:9 OLED TV Bezel */}
                <div className="relative aspect-video w-full rounded-xl border-4 border-zinc-800 bg-black shadow-2xl overflow-hidden flex flex-col justify-between p-4 select-none">
                  {config.homeLayout.mode === "custom-home" && !isStockPreview ? (
                    /* Custom Home Launcher Preview */
                    <div className="flex-1 flex flex-col justify-between bg-black text-white p-4">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-mono text-emerald-400">
                          tld.my.customhome (HOME Key 773 Intercept Active)
                        </span>
                        <span>68°F · Clear Sky</span>
                      </div>
                      <div className="my-auto text-center space-y-2">
                        <div className="text-5xl font-light tracking-widest text-white">
                          09:42
                        </div>
                        <div className="text-xs uppercase tracking-widest text-zinc-500">
                          OLED Pure Black Minimal Launcher · 0 Ads · 0 Telemetry
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-2.5 pt-4">
                        {[
                          { name: "HDMI 1 (PS5)", color: "bg-blue-950/70 border-blue-700/50" },
                          { name: "YouTube AdFree", color: "bg-red-950/70 border-red-700/50" },
                          { name: "Jellyfin", color: "bg-purple-950/70 border-purple-700/50" },
                          { name: "Plex", color: "bg-amber-950/70 border-amber-700/50" },
                          { name: "Moonlight", color: "bg-emerald-950/70 border-emerald-700/50" },
                          { name: "Homebrew", color: "bg-zinc-900 border-zinc-700" },
                        ].map((app) => (
                          <div
                            key={app.name}
                            className={`rounded-lg border p-2.5 text-center text-xs font-medium ${app.color}`}
                          >
                            {app.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Stock vs Debloated Flutter Home Preview */
                    <>
                      {/* Top Area / Hero Banner + GlobalLine */}
                      <div
                        className={`relative rounded-lg transition-all duration-300 flex flex-col justify-between p-4 ${
                          useOledPitchBlack
                            ? "bg-black border border-zinc-900/80 flex-1"
                            : "bg-gradient-to-r from-indigo-950 via-purple-950 to-rose-950 border border-purple-700/30 h-32"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                useOledPitchBlack
                                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/30"
                                  : "border-rose-400/40 text-rose-200 bg-rose-950/40"
                              }`}
                            >
                              {useOledPitchBlack
                                ? "OLED Pitch-Black (0% Pixel Draw)"
                                : "Hero Ad Banner (3840x900)"}
                            </Badge>
                          </div>

                          {showGlobalNav ? (
                            <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-zinc-300">
                              <span>Search</span>
                              <span>·</span>
                              <span>Profile</span>
                              <span>·</span>
                              <span>Notifications</span>
                              <span>·</span>
                              <span className="text-rose-400">globalline</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-600">
                              globalline: 0x0 (hidden)
                            </span>
                          )}
                        </div>

                        {showPromoBannerText ? (
                          <div className="space-y-1 my-auto">
                            <p className="text-sm font-semibold text-white">
                              SPONSORED: Watch Live Sports & ShopTime Deals on LG Channels!
                            </p>
                            <div className="inline-block text-[10px] bg-white text-black px-2 py-0.5 rounded font-medium">
                              Start a new experience with webOS · Go to Apps
                            </div>
                          </div>
                        ) : (
                          <div className="my-auto flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-mono text-zinc-600">
                              [Pure Black Canvas — Promo Strings Stripped & Ad Servers Sinkholed]
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Middle Q-Card List */}
                      {showQCards && (
                        <div className="grid grid-cols-5 gap-2 my-2">
                          {[
                            "Home Office",
                            "Game Optimizer",
                            "Music",
                            "Home Hub",
                            "Sports Alert (Bloat)",
                          ].map((qcard) => (
                            <div
                              key={qcard}
                              className="rounded bg-zinc-900/90 border border-rose-500/30 px-2 py-2 text-[11px] text-zinc-300 flex items-center justify-between"
                            >
                              <span className="truncate">{qcard}</span>
                              <span className="text-[9px] text-rose-400 font-mono">
                                QCard
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* App Bar (appList) */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-emerald-400">
                            appList (autoFocus=&quot;true&quot; · Instant D-Pad Response)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            height: {config.homeLayout.appListHeight}px
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {[
                            { name: "YouTube AdFree", badge: "Clean" },
                            { name: "Jellyfin", badge: "Media" },
                            { name: "Plex", badge: "Media" },
                            { name: "HDMI 1 (PS5)", badge: "2.1" },
                            { name: "Moonlight", badge: "120Hz" },
                            { name: "Netflix", badge: "App" },
                            { name: "Homebrew", badge: "Root" },
                          ].map((app, idx) => (
                            <div
                              key={app.name}
                              className={`rounded-lg p-2 text-center border transition ${
                                idx === 0
                                  ? "bg-zinc-800 border-emerald-400 ring-2 ring-emerald-500/30"
                                  : "bg-zinc-900/90 border-zinc-800"
                              }`}
                            >
                              <div className="text-[11px] font-medium text-white truncate">
                                {app.name}
                              </div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">
                                {app.badge}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Recommended Shelf (Bloat) */}
                      {showRecShelf && (
                        <div className="mt-2 rounded-lg bg-rose-950/30 border border-rose-500/40 p-2.5">
                          <div className="flex items-center justify-between text-[10px] text-rose-300 mb-1.5">
                            <span className="font-semibold">
                              recommendedShelf (531px Tall · Loaded from lgad.cjpowercast.com)
                            </span>
                            <span className="font-mono">Heavy GPU/Network Lag</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              "Trending Now Ad #1",
                              "LG Channels Live Ad",
                              "ShopTime Promo",
                              "Sponsored Partner",
                            ].map((ad) => (
                              <div
                                key={ad}
                                className="h-10 rounded bg-rose-950/60 border border-rose-700/40 flex items-center justify-center text-[10px] text-rose-200"
                              >
                                {ad}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Comparison Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Cold-Press Home Latency:{" "}
                      <strong className="text-white">
                        {isStockPreview ? "~1.8s (Network + Shelf Fetch)" : "< 0.25s (Local App Bar Only)"}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      OLED APL (Average Picture Level):{" "}
                      <strong className="text-white">
                        {isStockPreview ? "~42%" : useOledPitchBlack ? "~4% (Near Zero Power)" : "~18%"}
                      </strong>
                    </span>
                  </div>
                  {saving && (
                    <span className="text-emerald-400 font-mono">
                      Saving to wwwroot/debloat_home.sh...
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generated Scripts & SlopBro Terminal Card */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  SlopBro Execution & Generated Payload Inspector
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Run directly against <code className="text-zinc-200">{config.tvIp}</code> or inspect the generated{" "}
                  <code className="text-zinc-200">home.xml</code>,{" "}
                  <code className="text-zinc-200">keybinds.json</code>, and{" "}
                  <code className="text-zinc-200">debloat_home.sh</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs defaultValue="console">
                  <TabsList className="bg-zinc-950 border border-zinc-800 mb-3">
                    <TabsTrigger value="console" className="text-xs">
                      Deploy & Console
                    </TabsTrigger>
                    <TabsTrigger value="homexml" className="text-xs">
                      Flutter home.xml
                    </TabsTrigger>
                    <TabsTrigger value="debloatsh" className="text-xs">
                      debloat_home.sh
                    </TabsTrigger>
                    <TabsTrigger value="keybinds" className="text-xs">
                      keybinds.json
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="console" className="space-y-3">
                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">
                          Option 1: Run SlopBro (Roots TV + Automatically Runs{" "}
                          <code>debloat_home.sh</code>)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-zinc-400 hover:text-white gap-1.5"
                          onClick={() =>
                            copyText(
                              "cmd1",
                              `python3 slopbro.py --debug --webos-version 10 ${config.tvIp}`
                            )
                          }
                        >
                          {copiedKey === "cmd1" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copy Command
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-emerald-400 bg-black/60 p-2.5 rounded border border-zinc-800/80 overflow-x-auto">
                        python3 slopbro.py --debug --webos-version 10 {config.tvIp}
                      </pre>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">
                          Option 2: Already Rooted? Push & Apply{" "}
                          <code>debloat_home.sh</code> Over SSH
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-zinc-400 hover:text-white gap-1.5"
                          onClick={() =>
                            copyText(
                              "cmd2",
                              `ssh root@${config.tvIp} "sh -s" < wwwroot/debloat_home.sh`
                            )
                          }
                        >
                          {copiedKey === "cmd2" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copy SSH One-Liner
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-cyan-400 bg-black/60 p-2.5 rounded border border-zinc-800/80 overflow-x-auto">
                        ssh root@{config.tvIp} &quot;sh -s&quot; &lt; wwwroot/debloat_home.sh
                      </pre>
                    </div>

                    <div className="rounded-lg bg-black border border-zinc-800 p-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5 font-mono">
                        <span>SLOPBRO OUTPUT LOG</span>
                        <span>SSAP Port 3001 (TLS)</span>
                      </div>
                      <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {terminalLog}
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
                      <pre className="text-xs font-mono text-emerald-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-80">
                        {generatedXml}
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
                      <pre className="text-xs font-mono text-cyan-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-80">
                        {debloatScript}
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
                      <pre className="text-xs font-mono text-amber-300 bg-black p-4 rounded-lg border border-zinc-800 overflow-x-auto max-h-80">
                        {generatedKeybinds}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right 5 Columns: Configuration Controls */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white">
                  OLED65G3PUA Control & Customization
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Every toggle immediately updates{" "}
                  <code className="text-zinc-300">wwwroot/debloat_home.sh</code> and{" "}
                  <code className="text-zinc-300">dist/slopbro_packed.py</code>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <Tabs defaultValue="home">
                  <TabsList className="grid grid-cols-4 bg-zinc-950 border border-zinc-800 mb-4">
                    <TabsTrigger value="home" className="text-xs">
                      Home UI
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="text-xs">
                      Ads & ACR
                    </TabsTrigger>
                    <TabsTrigger value="remote" className="text-xs">
                      Remote
                    </TabsTrigger>
                    <TabsTrigger value="target" className="text-xs">
                      Target TV
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: HOME MENU SPEEDUP */}
                  <TabsContent value="home" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-300 uppercase tracking-wider">
                        Home Modification Strategy
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            syncConfig({
                              ...config,
                              homeLayout: {
                                ...config.homeLayout,
                                mode: "stock-debloated",
                              },
                            })
                          }
                          className={`p-3 rounded-lg border text-left transition ${
                            config.homeLayout.mode === "stock-debloated"
                              ? "bg-emerald-950/40 border-emerald-500/60 text-white"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            Debloat Stock Home
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Bind-mounts stripped <code>home.xml</code> over webOS 10.3.0 Flutter Home. Fast & native.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            syncConfig({
                              ...config,
                              homeLayout: {
                                ...config.homeLayout,
                                mode: "custom-home",
                              },
                            })
                          }
                          className={`p-3 rounded-lg border text-left transition ${
                            config.homeLayout.mode === "custom-home"
                              ? "bg-emerald-950/40 border-emerald-500/60 text-white"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-cyan-400" />
                            Custom Home Takeover
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Installs <code>tld.my.customhome</code> & intercepts HOME button (773).
                          </p>
                        </button>
                      </div>
                    </div>

                    <Separator className="bg-zinc-800" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Remove Recommended Shelf (531px)
                          </p>
                          <p className="text-xs text-zinc-400">
                            Strips <code>&lt;item id=&quot;recommendedShelf&quot;/&gt;</code> from <code>home.xml</code>
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
                            Strips <code>&lt;item id=&quot;qcardList&quot;/&gt;</code> above the app bar
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
                            Pure Pitch-Black OLED Hero Banner
                          </p>
                          <p className="text-xs text-zinc-400">
                            Replaces <code>bg_banner_img.png</code> (HD/2K/4K) with 67-byte 1x1 black PNG
                          </p>
                        </div>
                        <Switch
                          checked={config.homeLayout.oledBlackBanner}
                          onCheckedChange={(v) =>
                            syncConfig({
                              ...config,
                              homeLayout: {
                                ...config.homeLayout,
                                oledBlackBanner: v,
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
                            Sets <code>globalline</code> to <code>0x0</code> after <code>herobanner</code> (prevents black screen)
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
                            Strip Hero Promo Text (i18n Symlink Override)
                          </p>
                          <p className="text-xs text-zinc-400">
                            Blanks &quot;Start a new experience with webOS&quot; & &quot;Go to Apps&quot;
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
                    </div>
                  </TabsContent>

                  {/* TAB 2: PRIVACY, ADS & BLOATWARE */}
                  <TabsContent value="privacy" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-1.5">
                            <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                            Sinkhole LG Ad & ACR Domains (/etc/hosts)
                          </p>
                          <p className="text-xs text-zinc-400">
                            Bind-mounts 28 ad, LivePlus, SmartClip & RDX telemetry domains to 0.0.0.0
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
                            Disable LivePlus ACR (Screen Recognition Spyware)
                          </p>
                          <p className="text-xs text-zinc-400">
                            Forces <code>livePlus: &quot;off&quot;</code> and <code>personalizedAd: &quot;off&quot;</code> via Luna
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
                            Kill AdOverlay & ACR Daemons in RAM
                          </p>
                          <p className="text-xs text-zinc-400">
                            Terminates <code>adoverlay</code>, <code>adoverlayex</code>, <code>acroverlay</code>, and <code>rdxd</code>
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
                            Disable Home Auto-Launch & Promotions on Boot
                          </p>
                          <p className="text-xs text-zinc-400">
                            Sets <code>homeAutoLaunch: &quot;off&quot;</code> & <code>homePromotion: &quot;off&quot;</code>
                          </p>
                        </div>
                        <Switch
                          checked={config.privacy.disableHomeAutoLaunch}
                          onCheckedChange={(v) =>
                            syncConfig({
                              ...config,
                              privacy: {
                                ...config.privacy,
                                disableHomeAutoLaunch: v,
                                disableHomePromotion: v,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Block LG OTA Firmware Update Servers
                          </p>
                          <p className="text-xs text-zinc-400">
                            Blocks <code>snu.lge.com</code> & <code>su-ssl.lge.com</code> so LG cannot patch root
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
                    </div>

                    <Separator className="bg-zinc-800" />

                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Uninstall Promotional Apps
                      </p>
                      {[
                        {
                          key: "removeShopTime" as const,
                          label: "LG ShopTime (com.lgshop.app)",
                        },
                        {
                          key: "removeLgChannels" as const,
                          label: "LG Channels (com.webos.app.lgchannels)",
                        },
                        {
                          key: "removeSportsAlert" as const,
                          label: "Sports Alert (com.webos.app.sportsalert)",
                        },
                        {
                          key: "removeFubo" as const,
                          label: "FuboTV / Partner Promo (love.fubo)",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-zinc-300">{item.label}</span>
                          <Switch
                            checked={config.bloatware[item.key]}
                            onCheckedChange={(v) =>
                              syncConfig({
                                ...config,
                                bloatware: {
                                  ...config.bloatware,
                                  [item.key]: v,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* TAB 3: MAGIC REMOTE BUTTON REMAPPING */}
                  <TabsContent value="remote" className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                          <Gamepad2 className="w-4 h-4 text-amber-400" />
                          Install lginputhook v1.5.0 (webOS 25 Fix)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Uses Syspoke&apos;s v1.5.0 <code>inputhookpp</code> build required for webOS 10.3.0 / 25
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

                    <div className="space-y-2.5">
                      {Object.entries(config.keybinds.mappings).map(
                        ([key, mapping]) => (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white">
                                {mapping.buttonName} Button
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-zinc-700 text-zinc-400"
                              >
                                uinput_code: {mapping.uinputCode}
                              </Badge>
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
                                <option value="launch">Launch Custom App</option>
                                <option value="disable">
                                  Disable Button (Ignore)
                                </option>
                                <option value="unchanged">
                                  Keep Default Behavior
                                </option>
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
                                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-emerald-300"
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

                  {/* TAB 4: TARGET TV & SLOPBRO SETTINGS */}
                  <TabsContent value="target" className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">
                        LG TV LAN IPv4 Address
                      </Label>
                      <Input
                        value={config.tvIp}
                        onChange={(e) =>
                          syncConfig({ ...config, tvIp: e.target.value })
                        }
                        className="bg-zinc-950 border-zinc-800 font-mono text-sm text-white"
                        placeholder="192.168.97.141"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">
                        Local Machine IPv4 Override (Optional, for{" "}
                        <code>--local-ip</code>)
                      </Label>
                      <Input
                        value={config.localIpOverride}
                        onChange={(e) =>
                          syncConfig({
                            ...config,
                            localIpOverride: e.target.value,
                          })
                        }
                        className="bg-zinc-950 border-zinc-800 font-mono text-sm text-white"
                        placeholder="Auto-detect route toward 192.168.97.141"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-300">
                        Fake Service Path (<code>jsserver</code> Patch Bypass)
                      </Label>
                      <Input
                        value={config.fakeServicePath}
                        onChange={(e) =>
                          syncConfig({
                            ...config,
                            fakeServicePath: e.target.value,
                          })
                        }
                        className="bg-zinc-950 border-zinc-800 font-mono text-xs text-zinc-300"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Enable Debug Output (<code>--debug</code>)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Logs detailed status on TV screen and{" "}
                          <code>/tmp/autoroot.log</code>
                        </p>
                      </div>
                      <Switch
                        checked={config.debug}
                        onCheckedChange={(v) =>
                          syncConfig({ ...config, debug: v })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Allow Insecure Curl (<code>--curl-insecure</code>)
                        </p>
                        <p className="text-xs text-zinc-400">
                          Use if TV clock is out of sync or LG SDP is already blocked
                        </p>
                      </div>
                      <Switch
                        checked={config.curlInsecure}
                        onCheckedChange={(v) =>
                          syncConfig({ ...config, curlInsecure: v })
                        }
                      />
                    </div>

                    <Separator className="bg-zinc-800" />

                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Instant Emergency Revert / Stock Restore
                      </div>
                      <p className="text-xs text-zinc-400">
                        Because all modifications use a RAM bind-mount over{" "}
                        <code>/usr/palm/applications/com.webos.app.home</code>, you can revert to 100% factory stock at any time without unrooting:
                      </p>
                      <pre className="text-[11px] font-mono text-zinc-300 bg-black p-2 rounded border border-zinc-800 overflow-x-auto">
                        ssh root@{config.tvIp} &quot;/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod/apply.sh --revert&quot;
                      </pre>
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
