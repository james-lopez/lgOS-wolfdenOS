# lgOS-wolfdenOS — lab notebook

Findings, pitfalls and dead ends from working on the LG OLED65G3PUA, in the
order they were hit. The README says what the project is and how to deploy
it; this file says what it cost to find out. Add new findings next to the
subsystem they belong to, in the same voice: what was tried, what the log
said, what actually works.

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

## Day 3: The TV Was Never Offline

The Home screen's hero banner kept showing LG's "connect to a network" card --
the sentence, the art and a **Network Settings** button that we had blanked to
an empty rounded box. Blanking the label was treating the symptom.

`connectionmanager/getStatus` explains it:

```
"onInternet":"no", "isInternetConnectionAvailable":false
```

on a TV that was streaming YouTube at the time. webOS decides this with
connman's online check, and `/etc/connman/main.conf` says what it probes:

```
Ipv4StatusUrl=http://lgtvonline.lge.com/
Ipv6StatusUrl=http://lgtvonline.lge.com/
TakeDnsIpResolutionAsOnline=true
```

`lgtvonline.lge.com` does not resolve. Not sinkholed by us -- `NXDOMAIN`, the
host is simply gone. So every webOS 25 TV on this firmware believes it is
offline, and the Home screen has been drawing the no-network card over it.

The fix is three pieces, all in `apply.sh`:

1. A three-line node server on `127.0.0.1:80` answering `200 OK`. node ships
   with webOS at `/usr/bin/node`; busybox here has no `httpd` applet.
2. `/etc/connman/main.conf` rewritten to probe `http://127.0.0.1/` and
   bind-mounted over the read-only original, the same trick as `/etc/hosts`.
   It is generated from the live file, so the rest of LG's config carries over.
3. A delayed `systemctl restart connman`, because connman reads main.conf once
   at start and is long up by the time `init.d` runs. Wifi drops and
   reassociates in about twenty seconds.

No DNS lookup, no outbound request, and the check passes whether or not the TV
can reach anything of LG's. Afterwards: `onInternet":"yes"`.

What this does **not** do is remove the button. Coming online swaps the card
from the no-network variant to a promo variant, so the box now reads "Go to
Apps". The hero banner draws a card whenever it has no ad content to show, and
the card is compiled Flutter layout -- neither `home.xml` nor the i18n strings
can take it away:

- Deleting `<item id="herobanner">` from `home.xml` blanks the entire screen,
  app row included.
- Collapsing it to `itemHeight="2"` moves the app row to the top but the card
  still draws, now overlapping the tiles.
- Blanking the label leaves the box outline, because the button is drawn
  regardless of its text.

The remaining route is to give the banner content of our own: stand up a luna
service answering `requestBannerInfoWithoutContextIndex` with our own payload,
the way `hbchannel` registers its service. That is the next real piece of work
on this screen.

### Nothing under `/usr` can be deleted

```
/dev/mmcblk0p27 on / type squashfs (ro,relatime)
overlay on /usr type overlay (ro,relatime,lowerdir=/overlay/bsppart/bsp/usr:/usr)
```

`/` is squashfs and `/usr` is a read-only overlay. All 148 system apps in
`/usr/palm/applications` are on it, and `appInstallService/dev/remove` only
handles apps installed under `/media/developer`. Hard deletion needs a reflash.

What works instead is masking: an empty directory bind-mounted over each app's
directory, so SAM finds no `appinfo.json` and the app cannot start. 21 are
masked (`mask_bloat_apps`), promo and ad containers only. The ACR apps and the
per-input overlay containers are deliberately left alone -- they sit in the
HDMI input path.

**Masking does not unregister anything.** Verified after a reboot: SAM still
answers `getAppInfo` for every masked app, because it scans before
`/var/lib/webosbrew/init.d` runs. The apps are unlaunchable, not absent.

Their tiles are a separate problem, and the earlier reading of it was wrong.
The launch-point list looked clean for days -- 15 entries, no LG promo tiles --
and that was taken as proof the `removeLaunchPoint` sweep worked. It was not.
It was the offline state hiding them. The moment the TV came online, Alexa,
Camera, Home Hub, Always Ready, Media Player, Multi View, Sports, the content
store, the browser and LG Channels all came back, and `removeLaunchPoint`
answers:

```
{"errorCode":1,"returnValue":false,"errorText":"this launch point cannot be removable"}
```

System tiles cannot be removed through that API on webOS 25. `updateLaunchPoint`
accepts `removable: true` and returns `returnValue: true`, but the removal then
fails one layer deeper with `"com.webos.app.discovery is not removable"`. And
masking the app directory does not take the tile away either -- SAM keeps
listing it.

**The right call is on a different service.** LG's own Home Edit screen hides
tiles through `com.webos.service.homelaunchpoints`, not through
`applicationManager`, and it accepts every one of them:

```
luna://com.webos.service.homelaunchpoints/hideLaunchPoint
    {"launchPointId":"com.webos.app.discovery_default"}   -> {"returnValue":true}
```

19 tiles are hidden this way on every boot (`prune_launch_points`). The app row
is now the streaming apps, live TV, Homebrew Channel and wolf OS, with the TV
online. Two sibling methods exist and are worth knowing about:
`unhideLaunchPoint` to put one back, and `listAvailableLaunchPoints` to see
what is hideable.

Three of the apps are not under `/usr/palm/applications` at all, which is why
they survived every earlier sweep:

| App | Lives on |
| --- | --- |
| `com.webos.app.discovery` (content store) | `/mnt/otncabi/usr/palm/applications` |
| `com.webos.app.browser` | `/mnt/otncabi/usr/palm/applications` |
| `com.webos.app.lgchannels` | `/media/system/apps/usr/palm/applications` |

`mask_bloat_apps` walks all four app roots, which makes these apps
unlaunchable; `prune_launch_points` takes their tiles off the row. Masking
excludes `com.webos.app.adoverlayex` deliberately -- see the pitfall below.

### Ad and telemetry survey

State of the TV after the earlier passes, read off the device rather than
assumed:

| Surface | State |
| --- | --- |
| Launch points | 15, after `hideLaunchPoint` on 19 tiles; the earlier clean list was the offline state, not a sweep |
| `livePlus` (ACR) | `off` |
| `com.webos.service.admanager` | `AD.ERR.00` on every call; four endpoints patched to dead URIs |
| `com.webos.service.acr` | on disk, not running |
| `rdxd` (crash upload) | enabled but inactive; `apply.sh` kills it each boot |
| `uploadd` | running, LG's generic uploader |
| `kadpd` | running, LG's ad platform daemon |
| `/etc/hosts` sinkhole | effective through `getaddrinfo` -- `ngfts.lge.com` resolves to `127.0.0.1` |

Two gaps found and closed. The sinkhole was IPv4-only while the TV holds a
global IPv6 address and asks for AAAA records, so every blocked host was still
reachable over v6; `::` twins are now in `hosts.block`. And `nslookup` is
useless for checking any of this -- it queries the resolver directly and never
reads `/etc/hosts`. Use `ping`, which goes through `getaddrinfo`.

`kadpd` and `uploadd` are still running. Neither can be masked persistently:
`/etc` is read-only, so `systemctl disable` cannot write, and killing them at
boot is all `apply.sh` can do.


---

## The Native Home Screen (`qmlhome/`): things that cost real time

**The luna role appinstalld writes is wrong for QML apps.** It sets `exeName`
to the app's `main.qml`. The process on the bus is `/usr/bin/qml-runner`, so
the hub rejects the registration and every `Service` call in the app is
silently dead -- the only trace is one line in `/var/log/dbg-log`:

```
Failed to initialize LunaServiceManager instance for appId: "tld.wolfdenos.qmlhome"
```

LG's own QML apps are covered by `roles.d/com.webos.app.qmlrunner.role.json`
plus a `containers.d` entry naming qml-runner as a trusted container. A dev
app gets neither. `grant_qmlhome_bus` in `apply.sh` writes what Homebrew
Channel's `elevate-service` writes for its own service, adapted: an
`appId`-keyed role in `/var/luna-service2-dev/roles.d`, client permissions for
every ACG group, a manifest, the legacy `/var/palm/ls2-dev/roles` files with
`exeName` corrected, then `ls-control scan-services`. The name the app
actually registers is `<appId>-<pid>`, so `allowedNames` must carry
`"<appId>-*"`. It runs after every install, because `dev/install` rewrites
appinstalld's files.

**The `Service` element's API is not what it looks like.** Found by printing
`typeof` on the device, since there is no `.qmltypes` for it:

- The payload is the **argument of the `callSuccess` signal** --
  `arguments[0]` in the handler, already an object.
- `response` is a *method*, not a property. `onResponseChanged` is a load-time
  error that kills the app.
- There is no `callError` signal. Same failure.
- One `Service` per method is fine (the double-registration theory was wrong);
  the app uses one object and switches `method` per call anyway.

**Video is on the hardware plane.** QtMultimedia plays through LG's uMedia
pipeline onto the video plane, which sits *below* the graphics plane. The
`Video` item draws nothing; it punches a transparent hole. So the window must
be transparent and nothing opaque may sit under the `Video`, or the footage is
covered. The idle still is stacked above it and faded in. The compositor's own
capture (`captureCompositorOutput`) shows the hole as flat white; the video
plane is read with `com.webos.service.capture/executeOneShot`.

**Qt is 5.12.** `import QtQuick 2.4` hides `Gradient.orientation` (2.12), and
inline `component` syntax is 5.15. Import 2.12 and use a separate `Tile.qml`.
`Keys` cannot attach to `WebOSWindow` (a Window, not an Item).

**Only `console.warn` reaches the log.** `console.log` from QML goes nowhere
useful; warnings land in `/var/log/dbg-log` tagged `qml-runner [] <appId>`.

**BACK and EXIT do not reach the app by default, and leaving is a trap.**
The compositor's key filter (`/usr/lib/qml/KeyFilters/systemUi.js`,
`activeSurfaceAcceptsBackKey`) delivers BACK only if the surface carries the
window property `_WEBOS_ACCESS_POLICY_KEYS_BACK = "true"`; otherwise it shows
its own "Do you want to exit the app?" alert and `closeByAppId`s the app. The
`keyMask` on `WebOSWindow` was not enough on its own. LG's QML apps assign
`root.windowProperties._WEBOS_ACCESS_POLICY_KEYS_BACK = true` (and `_EXIT`),
which qml-runner accepts with a deprecation warning; `setWindowProperty()` is
not invokable from QML. `main.qml` sets both in `Component.onCompleted`.

Why it matters: when the home app closes for any reason, SAM's last-app
fallback (`LAUNCH_LASTAPP {"app_id":"","reason":"in_mode"}` in `dbg-log`)
launches **`com.webos.app.home`, hard-coded**, not `defaultApps.home`. Tested:
close ours → LG Home; close LG Home while it is foreground → LG Home again.
So the home screen never quits itself: BACK on the dock is a no-op, BACK in
All Apps closes the grid, and HOME from anywhere goes through
`launchDefaultApp {"category":"home"}` back to ours. The "Exit" prompt is also
what the remote's EXIT key produces, which is why `_EXIT` is claimed too.

**LG's Home keeps running underneath.** It is `keepAlive` and a
`BootTimeApps` entry in `/etc/palm/sam-conf-tv.json`, so it sits in SAM's
running list behind ours. That is fine: HOME from LG's Home goes through
`launchDefaultApp` and lands on ours (verified with the remote), and closing
LG's Home only makes SAM relaunch it.

**Boot went LG Home → LG Home → ours, and the HOME key was never the
reason.** On a power-on the TV showed stock LG Home, then the patched LG Home,
and reached ours only after an app had been opened and HOME pressed. The
timeline from `/var/log/bootd.log` and the rotated `dbg-log.1.gz`:

- 10s: bootd asks `com.webos.service.systemprofile/getProfiles` for
  `defaultApps` and logs `Profiles: defaultApps Home(com.webos.app.home)`.
- 13s: bootd launches that id directly: `launch {"id":"com.webos.app.home",
  "noSplash":true,"params":{"boot":true}}`. Not `launchDefaultApp`, so
  settingsservice's `defaultApps.home` (ours) plays no part at boot.
- 24-37s: `apply.sh` runs from init.d: mounts, debloat, `setDefaultApp` ours.
  Somewhere in there the foreground went empty and SAM's last-app fallback
  relaunched LG Home (the "patched" one the user saw second).
- apply.sh never launched ours; the first HOME press from an app did.

The profile bootd reads is the *generated* `/var/webos-profile/platform/profile.json`
(`profile_generator`, first boot), and systemprofile merges
`/var/webos-profile/override/*_profile.json` on top of it -- at boot and on
`luna://com.webos.service.systemprofile/debug/rescan`. `/var` is persistent
ext4. So:

```sh
echo '{"defaultApps":{"categories":{"home":"tld.wolfdenos.qmlhome","aod":"com.webos.app.lifeonscreen"}}}' \
  > /var/webos-profile/override/wolfden_profile.json
luna-send -n 1 luna://com.webos.service.systemprofile/debug/rescan '{}'
```

flips what bootd launches at 13s, and the change is already in the
generated profile.json afterwards. `set_home_app` in apply.sh writes or
deletes that file alongside `setDefaultApp`, so every fallback path (kill
switch, three strikes, `--revert`) also puts LG Home back at boot. apply.sh
now ends with `launchDefaultApp {"category":"home"}` as well, so a deploy
lands on ours instead of waiting for a key press. `homeAutoLaunch` is kept
*on* now (it used to be forced off to stop LG Home auto-opening): it is the
setting that makes bootd open the home app at all.

Related, found on the way: the same profile carries `idleApp.appId =
com.webos.app.home`, and SAM's `lastAppHandlerPolicy` is `idleApp`. That is
the hard-coded fallback seen earlier. It was left pointing at LG Home on
purpose: if ours ever fails to start, LG Home appearing is the signal, and
pointing the fallback at a broken app would loop. bootd's "Visible(true)"
log line is not `appinfo.visible` -- LG Home itself ships
`"visible": false, "class": {"hidden": true}`, the same as ours.

**The video froze after returning from an app.** `Qt.application.active`
going false pauses the `Video`; coming back called `touch()`, which sets
`idleStage = 0` -- but the stage was already 0, so `onIdleStageChanged` never
fired and nothing called `play()`. `touch()` now resumes playback itself when
the window is active and the player is not playing.

**Small Qt things that each cost a push:**

- `Qt.formatTime(d, "h:mm")` is 24-hour unless the format also has `AP`, and
  LG SlimNumber has no letters, so the 12-hour clock is computed in JS with the
  AM/PM in its own `LG Smart UI` text.
- Two `Component.onCompleted` handlers on one object is a load error
  ("Duplicate signal name"); merge them.
- `Image` has no corner radius and `clip` is rectangular. Rounded artwork is
  `OpacityMask` from `QtGraphicalEffects 1.0`, which ships on the TV in
  `/usr/lib/qml/QtGraphicalEffects`. (`Tile.qml`.)
- `setWindowProperty()` exists on `WebOSQuickWindow` but is not `Q_INVOKABLE`;
  assign through `windowProperties.<NAME>` instead.
- The compositor's own capture (`captureCompositorOutput`) shows the video as
  flat white, so "we lost the video" cannot be judged from it; use
  `com.webos.service.capture/executeOneShot` (`{"path":...,"format":"JPG","width":1280,"height":720}`),
  which composites both planes.


---

## The Home Banner: What the TV Actually Shows

The seasonal background is set by replacing LG's own `bg_banner_img.png` (and
its `_wee` and `_network` variants) inside the bind-mounted asset tree. That is
an edit of the Home screen rather than a layer over it, and it needs no second
app.

The stock assets are all the same shape and none of them is 16:9:

| Asset size | Ratio |
| --- | --- |
| 1264x326 | 3.88:1 |
| 1746x450 | 3.88:1 |
| 1896x489 | 3.88:1 |
| 3492x900 | 3.88:1 |
| 3792x978 | 3.88:1 |

Cropping a 16:9 photograph into 3.88:1 throws away more than half its height,
which is how the pumpkins fell out of the Halloween art. But that crop was
never necessary, and the reason is worth measuring rather than guessing.

A calibration image was built at every stock size -- vertical bands labelled
`x0`..`x100` across the width, rules every 10% of height, and three true
circles -- then put on screen and captured. The result:

- **The circles came back round.** Nothing is stretched; the asset keeps its
  aspect ratio.
- **The visible window ran from about x22 to x77** -- the centre **55%** of the
  asset's width, cropped equally either side, at full height.
- 0.55 x 3.88:1 = **2.13:1**, which is exactly the shape of the screen area
  between the top and the app row.

So only the middle 55% of the asset is ever seen, and the picture that has to
fill it is **2.13:1**, not 3.88:1 and not 16:9. `build_from_image` fits the
source to that window and fills the dead margins either side with a blurred
stretch of the same picture, so nothing jarring appears if another resolution
shows slightly more.

**Supply seasonal artwork at 2.13:1** -- 3840x1800 is a good target, since the
visible part of the largest asset is 0.55 x 3792 = 2086px wide and anything
smaller gets upscaled. A 16:9 source works too and loses about 17% of its
height; `--crop-y` chooses which band survives (0.0 top, 1.0 bottom).

```sh
python3 tools/build_banner.py --image wwwroot/season-halloween.jpg --crop-y 0.5
```

Keep the right-hand side quiet: LG draws its own headline and button there, and
no framing moves the art away from them while that card exists.


---

## Dead End: The Home-Screen Overlay

**Not shipped.** `overlay/` and `tools/build_overlay_ipk.py` are kept because
what they proved is worth keeping, but nothing installs them and the TV does
not run them. The approach was abandoned on purpose: an overlay is a second
app drawn on top of LG's Home, not an edit of it, and that shows -- a sliver of
LG's own banner stayed visible underneath, focus behaved oddly, and anything
that dropped the overlay left the original Home screen looking untouched,
because it was. The seasonal background is now set in LG's own banner assets
instead, which is a real edit and needs no second app.

What it cost: the clock and date. Those were only possible because the overlay
was our own web page. LG's Home draws no clock, and adding a widget to a
compiled Dart snapshot is not something string patching reaches.

The findings below still hold and are the reason this section survives.

The hero banner's promo card -- a headline and a button under it -- is the last
thing on the Home screen we had no handle on. It is compiled Flutter layout,
and all three obvious attacks were tried on the device and failed:

| Attempt | Result |
| --- | --- |
| Delete `<item id="herobanner">` from `home.xml` | Whole screen blank, app row included |
| Collapse it to `itemHeight="2"` | Card still drawn, now on top of the tiles |
| Blank its i18n string | Empty outlined box where the button was |

So it is covered rather than removed. `overlay/` is an ordinary web app with
two fields that matter:

```json
"transparent": true,
"defaultWindowType": "overlay"
```

which puts it above Home **without taking the foreground** --
`getForegroundAppInfo` still answers `com.webos.app.home` with the overlay
drawn. The panel spans the top 82% of the screen, stopping just above the app
row, so the tiles stay visible and focusable. Seasonal artwork fills it and the
clock and date sit top right.

Note what is *not* in that manifest: `trustLevel`. LG's own overlays set it to
`"trusted"`, and copying that field is the bug that cost hours on the launcher
-- SAM silently refuses to register a dev app that carries it, with no error
anywhere. `tools/build_overlay_ipk.py` refuses to build if it reappears.

### Two things an overlay cannot do

**It cannot ask webOS what is in the foreground.** `PalmServiceBridge` exists
in the app and the call is accepted, then comes back:

```
{"returnValue":false,"errorCode":-1,
 "errorText":"Denied method call \"getForegroundAppInfo\" for category \"/\""}
```

The permission comes from `trustLevel: "trusted"`, which we cannot have. The
way round it is to have the TV tell the app instead of the app asking the TV:
the node server `apply.sh` already runs for the connectivity probe holds the
luna subscription as root and publishes the answer on `127.0.0.1/foreground`,
and the overlay polls that every two seconds. The page fails closed -- any
answer that is not "Home is in front" hides the panel, so a dead server leaves
the screen alone rather than covering whatever is on it.

**It does not stay running by itself.** webOS reclaims a backgrounded web app,
and nothing relaunches it: the overlay came up at boot, was gone forty minutes
later, and the Home screen was back to LG's own banner with no sign anything
had failed. `getAppStatus` is no help -- it answers `"launchable"` whether the
app is running or not.

The same node server handles it, in two ways. It relaunches the overlay each
time Home comes to the front, and, because the overlay polls `/foreground`
every two seconds, it treats silence as death: no request for fifteen seconds
while Home is in front means the page is gone, so relaunch it. Using the
page's own traffic as the liveness signal avoids restarting an overlay that is
perfectly alive, which a plain timer would do constantly.

**It cannot play video.** A `<video>` element punches a flat white rectangle
through the surface the moment the element exists -- at `opacity: 0`, playing
or paused, with the app's own `transparent: true` honoured, and with a file
that plays fine in the launcher. Creating it lazily only moves when the
rectangle appears. LG's one overlay that does show video,
`com.webos.app.overlaycontainer`, asks for a video layer by name:

```json
"windowGroup": { "owner": false, "name": "com.webos.app.livetv",
                 "clientInfo": { "layer": "videoAcrLayer" } }
```

A dev-installed app has no way to claim that layer, so the background is a
still image. This was worth about an hour, and the white rectangle looks
exactly like a page that failed to load, which is the wrong place to start
debugging.

### Artwork

One image per season in `wwwroot/season-<name>.jpg`, 1920x1080 or larger, 16:9.
`object-fit: cover` anchored to the top, so roughly the bottom fifth is cropped
by the app row -- keep the subject in the upper two-thirds. The top right is
where the clock sits; there is a radial scrim behind it, but a busy corner
still fights the text. The file is served at deploy time and copied into the
app directory by `apply.sh`, because `dev/install` wipes the app directory on
every deploy.


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
- **Symptom**: Running `python3 wolfdenOS.py <tv-ip>` from inside a sandboxed IDE child process fails with `OSError: [Errno 65] No route to host`.
- **Root Cause**: macOS Sequoia/Tahoe grants Local Network (`192.168.x.x`) socket permissions per parent application bundle; `Terminal.app` has permission while sandboxed IDE helper processes do not.
- **Workaround**: Always run `python3 wolfdenOS.py --debug --webos-version 10 <tv-ip>` directly from your macOS **Terminal**.


---
