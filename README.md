# lgOS-wolfdenOS (`github.com/james-lopez/lgOS-wolfdenOS`)

A replacement home screen and privacy patcher for rooted LG webOS TVs, built
and proven on an **LG `OLED65G3PUA` (`webOS 25 / 10.3.0-2504`)** on top of
[`throwaway96/slopbro`](https://github.com/throwaway96/slopbro).

This is not a launcher app you open from LG's Home. The TV's HOME button opens
**`tld.wolfdenos.qmlhome`**, a native QML app in `qmlhome/`, because the OS is
told it is the home app (`applicationManager/setDefaultApp`, the same switch
LG uses for Senior Home). LG's Home stays installed underneath, debloated and
de-adverted by the same boot hook, and every escape hatch hands HOME back to
it. `NOTES.md` has how and why. The web launcher that preceded it
(`launcher/`) is kept as source but no longer installed.

---

## Before you start

- Check your model and firmware at https://cani.rootmy.tv first. The root
  method here only applies where that page says it does.
- Make the USB kill switch (see "Safety" below) before the first deploy.
- The patched `libapp.so`, the banner sizes and the default dock ids are
  specific to the G3 this was built on; `NOTES.md` says which parts travel.

## Gotchas

The ones that cost real time, each with the full story in `NOTES.md`:

- Never mask `com.webos.app.adoverlayex`: deploys stage through it
  ("Safety" below; NOTES, "Pitfalls").
- Keep the default `--log-wait`; a short wait strands the TV on LG's Home
  (NOTES, "The dev loop").
- A QML load error kills the home app silently and LG's Home comes back;
  `tools/push_qmlhome.py` prints the only trace, and `--trace` survives
  LG's log throttle (NOTES, "console.warn gets throttled").
- SAM re-registers system apps only at boot: a mask/unmask needs a power
  cycle to show (NOTES, "App updates go through LG's Content Store").
- `hdmi connected` from eim means the port is enabled, not that a cable is
  in (NOTES, "Inputs come from eim").

## Quick Start (Deploy to TV over LAN)

Run from your macOS **Terminal** (which has macOS Local Network permission for your LAN):

```bash
python3 wolfdenOS.py --debug --webos-version 10 <tv-ip>
```

`--root-only` stops after root and Homebrew Channel (no home screen, no
patches), which is the right first run on a TV you have not seen before.

To query all currently installed launch points and apps directly from the TV over SSAP:

```bash
python3 tools/list_tv_apps.py <tv-ip>
```

To iterate on the home screen without deploying (strongly preferred -- seconds
instead of minutes, and it prints qml-runner's warnings, which are the only
feedback a broken QML file gives):

```bash
python3 tools/push_qmlhome.py --capture shot.png
```

To revert all modifications back to factory stock webOS:

> **Note:** SSH is not reachable on this TV — port 22 is closed and the
> Homebrew Channel SSH toggle did not bring it up, so the `ssh root@...` form
> this README used to recommend does not work. Use the USB kill switch
> (an empty `wolfden-disable` file at the top level of a stick) to disable the
> modifications on the next boot, then redeploy with `--revert` wired in, or
> delete the init hook at
> `/var/lib/webosbrew/init.d/49-g3-debloat-home`.

---

## Safety: `apply.sh` Runs on Every Boot

A bad change re-applies itself at startup, so a power cycle does not clear it.
There are two escapes, both verified on the device, neither needing SSH or a
working Home screen:

1. **USB kill switch.** Put an empty file named `wolfden-disable` at the top
   level of a USB stick and plug it in. All modifications are skipped that boot.
   *Make this stick before experimenting.*
2. **Boot-failure counter.** The count in `/media/internal/.wolfden/incomplete_boots`
   is incremented before any work and cleared only when the script finishes.
   After three incomplete runs it stops applying and logs the file to delete.

The `libapp.so` bind-mount additionally verifies the patched file is byte-identical
in size to the stock library, at both download and mount, and discards it
otherwise.

Recovery note: deploys run through `com.webos.app.adoverlayex`, not the Home
app, so a fix can still be pushed with the Home screen broken.

**Which is exactly why that app must never be masked.** It was in the first
version of `mask_bloat_apps` -- it is an ad overlay, it looked like bloat --
and masking worked perfectly: the next deploy sat on *"waiting for TV to pull
all payload files"* forever, because the staging app it launches had no
`index.html` any more. Nothing in the deploy output says why. The TV was only
recoverable because telnet was open; without it the only way back would have
been the USB kill switch. Masking anything on the recovery path turns a
reversible change into a one-way door, and the list in `apply.sh` carries a
comment saying so.

---

## Lab notebook

Everything that broke, why, and what finally worked lives in
[NOTES.md](NOTES.md): SAM registration, the web-app sandbox, the Flutter
reverse engineering, the two days of persistence pitfalls, the connectivity
probe, the QML home's gotchas, the banner measurement, the overlay dead end
and the follow-up notes. Read it before touching the device.
