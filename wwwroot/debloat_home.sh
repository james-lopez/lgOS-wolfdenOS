#!/bin/sh
# ==============================================================================
# wolfdenOS — Iteration 2 (Purplish Glass Dock + wolf OS Core Patcher)
# Built for LG OLED65G3PUA (10.3.0-2504 (webOS 25))
# Target IP: 192.168.97.141
# ==============================================================================

set -e

MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
WOLF_DIR="/media/developer/apps/usr/palm/applications/tld.wolfdenos.home"
INITD_DIR="/var/lib/webosbrew/init.d"
INITD_LINK="${INITD_DIR}/49-g3-debloat-home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
LOG_FILE="/tmp/wolfdenos.log"

if [ "${1}" = "--revert" ] || [ "${1}" = "--uninstall" ]; then
    echo "[*] Reverting all wolfdenOS customizations..."
    rm -f "${INITD_LINK}"
    pkill -9 -f inputhook 2>/dev/null || true
    pkill -9 -f home-guard 2>/dev/null || true
    umount "${FLUTTER_ASSETS}" 2>/dev/null || true
    umount /usr/palm/applications/com.webos.app.home/resources 2>/dev/null || true
    umount /etc/hosts 2>/dev/null || true
    umount /usr/palm/applications/com.webos.app.home/lib/libapp.so 2>/dev/null || true
    rm -rf /tmp/weboshome-merged /tmp/hosts.slopbro
    pkill -f com.webos.app.home 2>/dev/null || true
    echo "[+] Reverted to stock webOS."
    exit 0
fi

# Per-script execution guard so concurrent triggers within the same run don't collide,
# while never blocking future runs
rm -f /tmp/autoroot.lock 2>/dev/null || true
RUN_LOCK="/tmp/debloat_$(basename -- "${0}")"
if [ "$(basename -- "${0}")" != "debloat_home.sh" ]; then
    [ -f "${RUN_LOCK}" ] && exit 0
    touch "${RUN_LOCK}"
fi

# Immediately restore native physical HOME button if any prior inputhook or home-guard process is in RAM
pkill -9 -f inputhook 2>/dev/null || true
pkill -9 -f home-guard 2>/dev/null || true
rm -rf /home/root/.config/lginputhook 2>/dev/null || true

# Filled in by the laptop's HTTP server when it serves this script. At boot time
# the laptop is gone, so every use must fail harmlessly.
WOLFDEN_LOG_URL="__WOLFDEN_LOG_URL__"
WOLFDEN_BASE_URL="__WOLFDEN_BASE_URL__"

remote_log() {
    case "${WOLFDEN_LOG_URL}" in
        http://*|https://*) ;;
        *) return 0 ;;
    esac
    if ! curl -s -m 2 -X POST --data-binary "${1}" "${WOLFDEN_LOG_URL}" >/dev/null 2>&1; then
        # Nobody listening (the normal case at boot). Stop trying, so we don't
        # add a 2s curl timeout to every remaining line.
        WOLFDEN_LOG_URL=""
    fi
    return 0
}

log() {
    msg="[$(date '+%H:%M:%S')] ${1}"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
    remote_log "${msg}"
}

# Run a luna-send and report what it actually returned. The registration calls
# used to discard this, which is why a failed install looked identical to a
# successful one from the laptop.
luna_try() {
    luna_label="${1}"
    shift
    if luna_out="$(luna-send -w 3000 -n 1 "$@" 2>&1)"; then
        log "luna ${luna_label}: ${luna_out:-<empty>}"
    else
        log "luna ${luna_label}: FAILED: ${luna_out:-<no output>}"
    fi
}

toast() {
    payload="$(printf '{"sourceId":"com.webos.service.secondscreen.gateway","message":"<h3>wolfdenOS</h3>%s"}' "${1}")"
    luna-send -w 1000 -n 1 -a 'com.webos.service.secondscreen.gateway' 'luna://com.webos.notification/createToast' "${payload}" >/dev/null 2>&1 || true
}

log "Applying wolfdenOS Dashboard & wolf OS Core Patcher..."
mkdir -p "${MOD_DIR}/assets/images/hd" \
         "${MOD_DIR}/assets/images/2k" \
         "${MOD_DIR}/assets/images/4k" \
         "${MOD_DIR}/assets/i18n" \
         "${WOLF_DIR}" \
         "${INITD_DIR}"

# 0. The wolf OS launcher app itself lives in launcher/ and ships as
# wwwroot/wolfdenos.ipk (built by tools/build_launcher_ipk.py). It is
# installed via appInstallService/dev/install below, not written here.
# Older revisions duplicated the launcher HTML in this script; do not
# reintroduce that, it drifts from the copy that actually ships.
# We register tld.wolfdenos.home as a fresh app ID with an 80x80 vibrant purple "W" icon
# so webOS SAM creates a bright, visible "wolf OS" tile right on the default LG Home screen app row!

cat > "${MOD_DIR}/appinfo.json" << 'APPINFO_EOF'
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


# Snapshot all currently installed launch points directly from webOS SAM into tv-launchpoints.json
luna-send -n 1 'luna://com.webos.applicationManager/listLaunchPoints' '{}' > "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null || true
cp "${MOD_DIR}/tv-launchpoints.json" "${WOLF_DIR}/tv-launchpoints.json" 2>/dev/null || true

# Save sidebar & seasonal theme manifest

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

# 1b. Generate 80x80 vibrant purple "W" PNG icon for the "wolf OS" tile on the default LG screen,
# and a separate 1x1 pitch-black PNG (black.png) to blank out the stock LG default home banner image
generate_wolf_icon_png() {
    base64 -d > "${1}" << 'ICON_B64_EOF'
iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAABc2XMiAAABhUlEQVR4nO3aMW7CMBiG4d9NWVmZunTp0qN34AicgTNwBM5QunTpU7AydYBlhYqQEiA2tZ34vGe4sZ9f8S87tNfrdYC/bXcH8J0JDAwMDAwMDAwMDAwM7L17PB7Hcbxcr9M0vT7bbrdpmp7neVmW9x73CWdgq9Uqz/PlcrlcLsmyPJ9/+jhJkiiK5nkeRRFnV/DmbbfbOI7btn1+HcdxVVVxHO92ux887hNnq8iyrK7rXq+XpunrVZZlfd9XVRWG4cfPe+dsFUVRNE1zOp0GgwF45Qxsv98fDodxHAdBeL1edV0f96y1zjmOoygKw/BsNtvtdi8X5Qysbdu2bTnnf8/atpVSKqWcc9ba15tzBtZ13f1+//KgaRrO+WazUUr1fb9er7/+R0/OwLwfOAMDAwMDAwMDAwMD855SSvT9/f14PKSUWms3E0JYa7XWUsqP33tF18C6rquqSimVJMlms/noWa/XOeeHw8E5V9f11/de0U8tHoG9sAU+MQYGBgYGBgYGBgYGBvYLFhlxU0I3t9gAAAAASUVORK5CYII=
ICON_B64_EOF
}

generate_black_png() {
    printf '\211PNG\r\n\032\n\000\000\000\rIHDR\000\000\000\001\000\000\000\001\010\002\000\000\000\220wS\336\000\000\000\014IDATx\234c```\000\000\000\004\000\001\366\0278U\000\000\000\000IEND\256B`\202' > "${1}"
}

generate_wolf_icon_png "${MOD_DIR}/icon.png"
generate_black_png "${MOD_DIR}/black.png"

# Warm "nude" gradient banner with the wordmark baked in, replacing LG's stock
# art. Fetched at deploy time and kept in MOD_DIR, which apply.sh copies into
# the overlay on every boot.
fetch_home_banner() {
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    got=0
    for bsize in 1264x326 1746x450 3492x900 3792x978 1896x489 1920x1080; do
        if curl -s -m 90 -o "${MOD_DIR}/home-banner-${bsize}.png" \
                "${WOLFDEN_BASE_URL}home-banner-${bsize}.png" \
                && [ -s "${MOD_DIR}/home-banner-${bsize}.png" ]; then
            got=$((got + 1))
        else
            rm -f "${MOD_DIR}/home-banner-${bsize}.png" 2>/dev/null || true
        fi
    done
    curl -s -m 90 -o "${MOD_DIR}/home-banner.png" "${WOLFDEN_BASE_URL}home-banner.png" 2>/dev/null || true
    log "home banners downloaded: ${got} sized variants"
    [ "${got}" -gt 0 ] && return 0
    log "home banner download failed; keeping the black fill"
    return 1
}
fetch_home_banner || true

# Send libapp.so up to the laptop for analysis. Deploy-time only: at boot the
# laptop is gone and a long curl here would stall startup.
upload_libapp() {
    lib="/usr/palm/applications/com.webos.app.home/lib/libapp.so"
    [ -f "${lib}" ] || return 1
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    if curl -s -m 240 -X POST --data-binary "@${lib}" \
            "${WOLFDEN_BASE_URL}upload/libapp.so" >/dev/null 2>&1; then
        log "libapp.so uploaded ($(wc -c < "${lib}" 2>/dev/null | tr -d ' ') bytes)"
        return 0
    fi
    log "libapp.so upload failed"
    return 1
}
upload_libapp || true

# Send a few dock icons up so their real artwork can be inspected on the
# laptop: knowing whether they are square, padded or transparent decides how
# the launcher should frame them.
upload_dock_icons() {
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    for sample in youtube.leanback.v4 com.disney.disneyplus-prod hulu amazon; do
        for variant in icon largeIcon; do
            src=$(sed -n "s/.*\"id\":\"${sample}\"[^}]*\"${variant}\":\"\([^\"]*\)\".*/\1/p" \
                "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null | head -1)
            [ -z "${src}" ] && src=$(tr '{' '\n' < "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null \
                | grep "\"${sample}\"" | sed -n "s/.*\"${variant}\":\"\([^\"]*\)\".*/\1/p" | head -1)
            if [ -n "${src}" ] && [ -f "${src}" ]; then
                curl -s -m 45 -X POST --data-binary "@${src}" \
                    "${WOLFDEN_BASE_URL}upload/${sample}_${variant}.png" >/dev/null 2>&1 || true
            fi
        done
    done
    log "dock icon samples uploaded"
}
upload_dock_icons || true

# Restart any wedged streaming app. SSAP refuses system.launcher/close (403),
# but closeByAppId over luna as root does work.
restart_stalled_apps() {
    for stalled in youtube.leanback.v4; do
        luna-send -w 4000 -n 1 'luna://com.webos.applicationManager/closeByAppId' \
            "{\"id\":\"${stalled}\"}" >/dev/null 2>&1 || true
        pkill -f "${stalled}" 2>/dev/null || true
        log "restarted ${stalled}"
    done
}
restart_stalled_apps || true

# Patched Flutter library: the Home banner text and button label live inside
# libapp.so, not in i18n, so they are rewritten in place (same byte length,
# same Dart length fields) and the result is bind-mounted over the original.
fetch_patched_libapp() {
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    stock="/usr/palm/applications/com.webos.app.home/lib/libapp.so"
    [ -f "${stock}" ] || return 1
    stock_size=$(wc -c < "${stock}" 2>/dev/null | tr -d ' ')
    rm -f "${MOD_DIR}/libapp.so" 2>/dev/null || true
    if ! curl -s -m 240 -o "${MOD_DIR}/libapp.so" "${WOLFDEN_BASE_URL}libapp.so"; then
        log "patched libapp.so download failed"
        rm -f "${MOD_DIR}/libapp.so" 2>/dev/null || true
        return 1
    fi
    got_size=$(wc -c < "${MOD_DIR}/libapp.so" 2>/dev/null | tr -d ' ')
    # A different size means a truncated download or a bad patch. Mounting
    # that would leave the TV with no Home screen on every boot, so delete it.
    if [ "${got_size}" != "${stock_size}" ]; then
        log "patched libapp.so size ${got_size} != stock ${stock_size}; discarding"
        rm -f "${MOD_DIR}/libapp.so" 2>/dev/null || true
        return 1
    fi
    log "patched libapp.so staged (${got_size} bytes, matches stock)"
    return 0
}
fetch_patched_libapp || true

# Background video, copied in beside the launcher so it loads from the app's
# own directory (the sandbox blocks reading elsewhere, same as the icons).
# A local file avoids the certificate and embed problems the YouTube path hit.
fetch_background_video() {
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *) return 1 ;;
    esac
    mkdir -p "${WOLF_DIR}" 2>/dev/null || true
    if curl -s -m 600 -o "${WOLF_DIR}/bg.mp4" "${WOLFDEN_BASE_URL}bg.mp4" \
            && [ -s "${WOLF_DIR}/bg.mp4" ]; then
        cp "${WOLF_DIR}/bg.mp4" "${MOD_DIR}/bg.mp4" 2>/dev/null || true
        log "background video staged ($(wc -c < "${WOLF_DIR}/bg.mp4" 2>/dev/null | tr -d ' ') bytes)"
        return 0
    fi
    rm -f "${WOLF_DIR}/bg.mp4" 2>/dev/null || true
    log "background video download failed"
    return 1
}
fetch_background_video || true

# Earlier builds wrote a 1x1 black PNG here and apply.sh copies this directory
# over the overlay, so the stock bg_banner_img.png kept reading back as 1x1 and
# could never be size-matched. Clear the leftovers.
for stale in hd 2k 4k; do
    rm -f "${MOD_DIR}/assets/images/${stale}/bg_banner_img.png" 2>/dev/null || true
done

# 2. Write /etc/hosts Ad, ACR & Telemetry sinkhole
cat > "${MOD_DIR}/hosts.block" << 'EOF'
# === wolfdenOS LG webOS 25 Ad, ACR (LivePlus) & Telemetry Sinkhole ===
# Ads, ACR and telemetry only.
#
# ibs.lgappstv.com, us.ibs.lgappstv.com, edgesuite.net.lgappstv.com,
# lgtvcommon.com and us.lgtvsdp.com were removed from this list: they are the
# Content Store's own backend, and null-routing them is what made the "Apps"
# app fail with "network unstable, check your connection". The ad hosts under
# those same domains stay blocked individually below.
0.0.0.0 ad.lgappstv.com
0.0.0.0 lgad.cjpowercast.com
0.0.0.0 yumenetworks.com
0.0.0.0 smartclip.net
0.0.0.0 smartclip.com
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
WOLF_DIR="/media/developer/apps/usr/palm/applications/tld.wolfdenos.home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
HOME_RESOURCES="/usr/palm/applications/com.webos.app.home/resources"
APPLY_LOG="/tmp/wolfdenos_apply.log"

# Baked in when the laptop served debloat_home.sh. Unreachable at boot, by design.
WOLFDEN_LOG_URL="__WOLFDEN_LOG_URL__"

remote_log() {
    case "${WOLFDEN_LOG_URL}" in
        http://*|https://*) ;;
        *) return 0 ;;
    esac
    if ! curl -s -m 2 -X POST --data-binary "${1}" "${WOLFDEN_LOG_URL}" >/dev/null 2>&1; then
        # Nobody listening (the normal case at boot). Stop trying, so we don't
        # add a 2s curl timeout to every remaining line.
        WOLFDEN_LOG_URL=""
    fi
    return 0
}

alog() {
    msg="[apply $(date '+%H:%M:%S')] ${1}"
    echo "${msg}" >> "${APPLY_LOG}" 2>/dev/null || true
    remote_log "${msg}"
}

luna_try() {
    luna_label="${1}"
    shift
    if luna_out="$(luna-send -w 3000 -n 1 "$@" 2>&1)"; then
        alog "luna ${luna_label}: ${luna_out:-<empty>}"
    else
        alog "luna ${luna_label}: FAILED: ${luna_out:-<no output>}"
    fi
}

alog "apply.sh starting (pid $$)"

# --- Failsafes -------------------------------------------------------------
# This script runs from init.d on every boot, so a bad change re-applies itself
# and a power cycle does not clear it. There are two ways out that need neither
# SSH nor a working Home screen.
#
# 1. Kill switch. Put an empty file named "wolfden-disable" at the top level of
#    a USB stick and plug it in: every modification is skipped on that boot.
WOLFDEN_STATE_DIR="/media/internal/.wolfden"
mkdir -p "${WOLFDEN_STATE_DIR}" 2>/dev/null || true

for kill_switch in /tmp/usb/*/*/wolfden-disable /tmp/usb/*/wolfden-disable \
                   /media/usb*/wolfden-disable /media/*/wolfden-disable \
                   /media/internal/wolfden-disable; do
    if [ -e "${kill_switch}" ]; then
        alog "KILL SWITCH found at ${kill_switch}; skipping all modifications"
        exit 0
    fi
done

# 2. Boot-failure counter. The count is bumped before any work and cleared only
#    once the script reaches the end. If three boots in a row never finish,
#    something is wedging us, so stop applying rather than loop forever.
BOOT_COUNT_FILE="${WOLFDEN_STATE_DIR}/incomplete_boots"
boot_fails=$(cat "${BOOT_COUNT_FILE}" 2>/dev/null || echo 0)
case "${boot_fails}" in
    ''|*[!0-9]*) boot_fails=0 ;;
esac
if [ "${boot_fails}" -ge 3 ]; then
    alog "DISABLED: ${boot_fails} incomplete runs in a row. Delete ${BOOT_COUNT_FILE} to re-enable."
    exit 0
fi
echo $((boot_fails + 1)) > "${BOOT_COUNT_FILE}" 2>/dev/null || true
alog "failsafes ok (incomplete-run count now $((boot_fails + 1)) of 3)"
# Settle whether /usr/palm is actually read-only (the reason we bind-mount
# instead of writing in place) rather than assuming it.
alog "rootfs mounts: $(mount 2>/dev/null | grep -E ' / | /usr' | tr '\n' ' ')"

# Clean up any old HOME button interceptors so the physical HOME button works 100% natively
pkill -9 -f inputhook 2>/dev/null || true
pkill -9 -f home-guard 2>/dev/null || true
rm -rf "${MOD_DIR}/home-guard.sh" /home/root/.config/lginputhook 2>/dev/null || true
luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' '{"id":"org.webosbrew.inputhook","subscribe":false}' >/dev/null 2>&1 || true

# Refresh installed apps snapshot on boot
luna-send -n 1 'luna://com.webos.applicationManager/listLaunchPoints' '{}' > "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null || true
cp "${MOD_DIR}/tv-launchpoints.json" "${WOLF_DIR}/tv-launchpoints.json" 2>/dev/null || true

# A. Bind-mount /etc/hosts sinkhole
if [ -f "${MOD_DIR}/hosts.block" ]; then
    umount /etc/hosts 2>/dev/null || true
    cp /etc/hosts /tmp/hosts.slopbro
    grep -q "wolfdenOS" /tmp/hosts.slopbro || cat "${MOD_DIR}/hosts.block" >> /tmp/hosts.slopbro
    mount --bind /tmp/hosts.slopbro /etc/hosts 2>/dev/null || true
fi

# B. Bind-mount customized core webOS 10.3.0 Flutter Home assets (wolf OS + stock image removed)
if [ -d "${FLUTTER_ASSETS}" ]; then
    umount "${FLUTTER_ASSETS}" 2>/dev/null || true
    umount "${HOME_RESOURCES}" 2>/dev/null || true
    REAL_I18N="$(readlink -f "${FLUTTER_ASSETS}/i18n" 2>/dev/null || echo "${HOME_RESOURCES}")"

    rm -rf /tmp/weboshome-merged
    mkdir -p /tmp/weboshome-merged
    cp -RP "${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/ 2>/dev/null || cp -R "${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/ 2>/dev/null || true

    # Replace i18n symlink with real directory and rewrite all offline/promo banner strings to "wolf OS"
    rm -rf /tmp/weboshome-merged/i18n
    mkdir -p /tmp/weboshome-merged/i18n
    if [ -n "${REAL_I18N}" ] && [ -d "${REAL_I18N}" ]; then
        cp -RP "${REAL_I18N}"/. /tmp/weboshome-merged/i18n/ 2>/dev/null || cp -R "${REAL_I18N}"/* /tmp/weboshome-merged/i18n/ 2>/dev/null || true
    fi
    find /tmp/weboshome-merged -type f -name "*.json" | while IFS= read -r jf; do
        # Only the banner sentences are rebranded. The button labels below the
        # banner ("Go to Apps", "Check Network Connection", "Network Settings")
        # are deliberately left alone -- rewriting them put "wolf OS" on the
        # button itself, which is not what the banner text is for.
        # The wordmark is no longer baked into the image (it collided with the
        # text and button LG draws on top), so this is the wordmark now.
        sed -i 's/Enjoy the device[^"]*network[^"]*/wolfdenOS/g' "${jf}" 2>/dev/null || true
        sed -i 's/Start a new experience with webOS[^"]*/wolfdenOS/g' "${jf}" 2>/dev/null || true
        # Blank the button label. The button itself is part of the compiled
        # Flutter layout and cannot be removed, only emptied.
        sed -i 's/"Network Settings"[[:space:]]*:[[:space:]]*"[^"]*"/"Network Settings": " "/g' "${jf}" 2>/dev/null || true
        sed -i 's/"Go to Network Settings"[[:space:]]*:[[:space:]]*"[^"]*"/"Go to Network Settings": " "/g' "${jf}" 2>/dev/null || true
    done

    # Apply stripped home.xml (no recommendedShelf, no qcardList, no globalline)
    cp "${MOD_DIR}/assets/home.xml" /tmp/weboshome-merged/home.xml
    if [ -f /tmp/weboshome-merged/home_layoutShelfView.xml ]; then
        sed -i '/<item id="recommendedShelf"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
        sed -i '/<item id="qcardList"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
    fi

    # Bind-mount the patched Flutter library over the stock one. Guarded on an
    # exact size match: if anything is off we leave the original alone rather
    # than risk a Home screen that cannot start on every boot.
    stock_lib="/usr/palm/applications/com.webos.app.home/lib/libapp.so"
    if [ -s "${MOD_DIR}/libapp.so" ] && [ -f "${stock_lib}" ]; then
        if ! mount | grep -q "${stock_lib}"; then
            stock_sz=$(wc -c < "${stock_lib}" 2>/dev/null | tr -d ' ')
            ours_sz=$(wc -c < "${MOD_DIR}/libapp.so" 2>/dev/null | tr -d ' ')
            if [ "${stock_sz}" = "${ours_sz}" ]; then
                if mount --bind "${MOD_DIR}/libapp.so" "${stock_lib}" 2>/dev/null; then
                    alog "patched libapp.so mounted (${ours_sz} bytes)"
                else
                    alog "libapp.so bind-mount failed; stock library left in place"
                fi
            else
                alog "libapp.so size mismatch (${ours_sz} vs ${stock_sz}); not mounting"
            fi
        else
            alog "libapp.so already mounted"
        fi
    fi

    # Replace LG's stock banner art. The nude gradient (with the wordmark baked
    # in, since the Flutter layout cannot be re-centred) is used when it was
    # fetched; otherwise fall back to the old black fill.
    cp -R "${MOD_DIR}/assets/images"/. /tmp/weboshome-merged/images/ 2>/dev/null || true
    banner_src="${MOD_DIR}/black.png"
    if [ -s "${MOD_DIR}/home-banner.png" ]; then
        banner_src="${MOD_DIR}/home-banner.png"
    fi
    alog "banner source: ${banner_src}"
    alog "i18n dir: $(ls /tmp/weboshome-merged/i18n 2>/dev/null | head -8 | tr '\n' ' ')"
    alog "files still containing the stock sentence: $(grep -rl 'Enjoy the device' /tmp/weboshome-merged/ 2>/dev/null | head -4 | tr '\n' ' ')"
    alog "sentence anywhere under the app: $(grep -rl 'Enjoy the device' /usr/palm/applications/com.webos.app.home/ 2>/dev/null | head -4 | tr '\n' ' ')"

    # --- libapp.so string discovery -----------------------------------------
    # Before patching anything, report exactly what is in the binary: how many
    # occurrences, at what byte offsets, and the surrounding bytes so the true
    # length (and any Dart length prefix) can be read off rather than guessed.
    LIBAPP="/usr/palm/applications/com.webos.app.home/lib/libapp.so"
    if [ -f "${LIBAPP}" ]; then
        alog "libapp.so size: $(wc -c < "${LIBAPP}" 2>/dev/null | tr -d ' ') bytes"
        alog "Enjoy occurrences: $(grep -abo 'Enjoy the device' "${LIBAPP}" 2>/dev/null | wc -l | tr -d ' ')"
        for off in $(grep -abo 'Enjoy the device' "${LIBAPP}" 2>/dev/null | cut -d: -f1 | head -2); do
            alog "offset ${off} raw: $(dd if="${LIBAPP}" bs=1 skip=$((off - 8)) count=110 2>/dev/null | od -c | head -8 | tr '\n' '|')"
        done
        alog "NetworkSettings occurrences: $(grep -abo 'Network Settings' "${LIBAPP}" 2>/dev/null | wc -l | tr -d ' ')"
        for noff in $(grep -abo 'Network Settings' "${LIBAPP}" 2>/dev/null | cut -d: -f1 | head -1); do
            alog "netsettings ${noff} raw: $(dd if="${LIBAPP}" bs=1 skip=$((noff - 8)) count=48 2>/dev/null | od -c | head -4 | tr '\n' '|')"
        done
    else
        alog "libapp.so not found at ${LIBAPP}"
    fi

    # PNG dimensions straight from the IHDR header (4-byte big-endian width at
    # offset 16, height at 20). The replacement must match the stock asset's
    # size or LG's own scaling crops it.
    png_dims() {
        od -An -tu1 -j16 -N8 "${1}" 2>/dev/null | awk '{
            printf "%dx%d", ($1*16777216+$2*65536+$3*256+$4), ($5*16777216+$6*65536+$7*256+$8)
        }'
    }

    # What do the launch points actually give us for icons? The dock tiles
    # still fall back to glyphs, so the real field value needs seeing.
    # The launcher is sandboxed to its own directory, so it cannot load
    # file:///media/cryptofs/... directly: every tile fell back to a glyph.
    # Copy each app's real artwork in beside the app, where it can be loaded
    # with a relative path.
    mkdir -p "${WOLF_DIR}/icons" 2>/dev/null || true
    icons_copied=0
    tr '{' '\n' < "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null | while IFS= read -r lp_obj; do
        lp_id=$(printf '%s' "${lp_obj}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
        lp_icon=$(printf '%s' "${lp_obj}" | sed -n 's/.*"largeIcon":"\([^"]*\)".*/\1/p')
        [ -z "${lp_icon}" ] && lp_icon=$(printf '%s' "${lp_obj}" | sed -n 's/.*"icon":"\([^"]*\)".*/\1/p')
        if [ -n "${lp_id}" ] && [ -n "${lp_icon}" ] && [ -f "${lp_icon}" ]; then
            cp "${lp_icon}" "${WOLF_DIR}/icons/${lp_id}.png" 2>/dev/null || true
        fi
    done
    # dev/install replaces the app directory, so put the video back.
    if [ -s "${MOD_DIR}/bg.mp4" ] && [ ! -s "${WOLF_DIR}/bg.mp4" ]; then
        cp "${MOD_DIR}/bg.mp4" "${WOLF_DIR}/bg.mp4" 2>/dev/null || true
        alog "background video restored into app dir"
    fi

    alog "icons copied into app: $(ls "${WOLF_DIR}/icons" 2>/dev/null | wc -l | tr -d ' ')"

    alog "icon fields: $(grep -o '\"icon\":\"[^\"]*\"' "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null | head -4 | tr '\n' ' ')"
    alog "largeIcon fields: $(grep -o '\"largeIcon\":\"[^\"]*\"' "${MOD_DIR}/tv-launchpoints.json" 2>/dev/null | head -3 | tr '\n' ' ')"
    for img_dir in /tmp/weboshome-merged/images/hd /tmp/weboshome-merged/images/2k /tmp/weboshome-merged/images/4k; do
        if [ -d "${img_dir}" ]; then
            # Report what is actually in here: if the black screen turns out to
            # be a different asset, this is how we find its real name.
            alog "assets in ${img_dir}: $(ls "${img_dir}" 2>/dev/null | grep -iE 'banner|bg_|default|empty|offline' | tr '\n' ' ')"
            # Only the home and network banners. The old globs (*banner*,
            # *default*, *bg_*) also swallowed bg_banner_settings,
            # bg_banner_tv_guide, bg_banner_user_guide, bg_hdmi, bg_input,
            # bg_livetv, bg_qcard_*, bg_quickguide* and bg_wowcast, which would
            # stamp the wordmark across Settings, the TV guide and every input
            # tile. bg_banner_img_network*.png is the "connect to a network"
            # screen specifically.
            for banner_png in \
                "${img_dir}/bg_banner_img.png" \
                "${img_dir}/bg_banner_img_wee.png" \
                "${img_dir}/bg_banner_img_network.png" \
                "${img_dir}/bg_banner_img_network_wee.png"; do
                if [ -f "${banner_png}" ]; then
                    stock_dims="$(png_dims "${banner_png}")"
                    sized="${MOD_DIR}/home-banner-${stock_dims}.png"
                    if [ -s "${sized}" ]; then
                        alog "$(basename "${banner_png}") ${stock_dims}: using matching banner"
                        cp "${sized}" "${banner_png}" 2>/dev/null || true
                    else
                        # No exact match: scaling a different aspect into these
                        # wide strips is what made the gradient look cropped.
                        alog "$(basename "${banner_png}") ${stock_dims}: no sized banner, leaving stock"
                    fi
                fi
            done
            # Ad placeholders stay blacked out rather than branded.
            for ad_png in "${img_dir}"/img_ad_default*.png; do
                [ -f "${ad_png}" ] && cp "${MOD_DIR}/black.png" "${ad_png}" 2>/dev/null || true
            done
        fi
    done

    mount --bind /tmp/weboshome-merged "${FLUTTER_ASSETS}" 2>/dev/null || true
    if [ -d "${HOME_RESOURCES}" ]; then
        mount --bind /tmp/weboshome-merged/i18n "${HOME_RESOURCES}" 2>/dev/null || true
    fi
    pkill -f com.webos.app.home 2>/dev/null || true
fi

# C. Enforce Luna privacy & home settings
luna-send -n 1 'luna://com.webos.settingsservice/setSystemSettings' '{"category":"option","settings":{"livePlus":"off","homePromotion":"off","homeAutoLaunch":"off","personalizedAd":"off"}}' >/dev/null 2>&1 || true

# Close any ad/ACR overlay cleanly without crashing an active staging webview into error -102
for proc in com.webos.app.adoverlay com.webos.app.acroverlay; do
    luna-send -n 1 'luna://com.webos.applicationManager/closeByAppId' "{\"id\":\"${proc}\"}" >/dev/null 2>&1 || true
done

pkill -f rdxd 2>/dev/null || true

# Ensure Homebrew Channel SSH & Telnet are enabled and running
mkdir -p /var/luna/preferences
touch /var/luna/preferences/webosbrew_ssh_enabled /var/luna/preferences/webosbrew_telnet_enabled 2>/dev/null || true
if [ -x /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/startup.sh ]; then
    /media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service/startup.sh >/dev/null 2>&1 &
fi

# Report what is actually on disk before touching SAM, so a missing app
# directory can be told apart from a registration that SAM rejected.
if [ -f "${WOLF_DIR}/appinfo.json" ]; then
    alog "WOLF_DIR present: $(ls "${WOLF_DIR}" 2>&1 | tr '\n' ' ')"
else
    alog "WOLF_DIR MISSING appinfo.json at ${WOLF_DIR}"
fi

# Remove old invisible black-icon launch point and register the new purple "wolf OS" tile at position #1 on the default LG screen!
luna_try "removeLaunchPoint g3mod" -a com.webos.app.home 'luna://com.webos.applicationManager/removeLaunchPoint' '{"launchPointId":"tld.slopbro.g3mod_default"}'
luna_try "dev/listApps" 'luna://com.webos.applicationManager/dev/listApps' '{}'
sleep 1
# Pins the tile to the front of the LG Home app row. The key is "position";
# "index" is rejected as invalid parameters on webOS 25.
luna_try "moveLaunchPoint" -a com.webos.app.home 'luna://com.webos.applicationManager/moveLaunchPoint' '{"launchPointId":"tld.wolfdenos.home_default","position":0}'

# Does SAM know the app at all? This is the question the old code never asked.
# State a verdict rather than leaving a raw response to be interpreted.
if luna-send -w 3000 -n 1 'luna://com.webos.applicationManager/getAppInfo' \
        '{"id":"tld.wolfdenos.home"}' 2>&1 | grep -q '"returnValue":true'; then
    alog "VERDICT: SAM knows tld.wolfdenos.home - tile should be present"
else
    alog "VERDICT: SAM does NOT know tld.wolfdenos.home - app is not installed"
fi

# Close the staging overlay (com.webos.app.adoverlayex) cleanly so it never shows error -102,
# and immediately open the wolfdenOS Purplish Glass Dock dashboard!
luna_try "closeByAppId adoverlayex" 'luna://com.webos.applicationManager/closeByAppId' '{"id":"com.webos.app.adoverlayex"}'
luna_try "launch wolfdenos" 'luna://com.webos.applicationManager/launch' '{"id":"tld.wolfdenos.home"}'

# Reached the end intact, so this boot counts as healthy.
echo 0 > "${BOOT_COUNT_FILE}" 2>/dev/null || true
alog "apply.sh completed; incomplete-run count reset"

# Free any previously stuck jsserver node slots in the background after completion
(sleep 2; pkill -f "run-js-service-no-cgroup" 2>/dev/null || true) &
APPLY_EOF

chmod +x "${MOD_DIR}/apply.sh"
ln -sf "${MOD_DIR}/apply.sh" "${INITD_LINK}"

# 4. Remove & hide selected promotional / system bloatware apps
for bloat_id in com.webos.app.discovery amazon.alexa.view com.webos.app.sportsteamsettings com.webos.app.homeconnect com.webos.app.lifeonscreen com.webos.app.browser com.webos.app.mediadiscovery com.webos.app.camera com.webos.app.multiviewsettings com.lgshop.app com.webos.app.lgchannels love.fubo com.rakuten.tv com.webos.app.sportsalert; do
    luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' "{\"id\":\"${bloat_id}\",\"subscribe\":false}" >/dev/null 2>&1 || true
    luna-send -n 1 -a com.webos.app.home 'luna://com.webos.applicationManager/removeLaunchPoint' "{\"launchPointId\":\"${bloat_id}_default\"}" >/dev/null 2>&1 || true
done

# 5. Register the launcher with SAM.
#
# Copying files into /media/developer/apps does NOT create an app: SAM keeps its
# own registry, so dev/listApps ignored the directory and launch returned -101
# "not exist". appInstallService/dev/install is the only route that registers an
# app, and it is how autoroot.sh installs Homebrew Channel. The install persists
# across reboots, so this runs at deploy time only -- apply.sh does not reinstall.
install_launcher_ipk() {
    case "${WOLFDEN_BASE_URL}" in
        http://*|https://*) ;;
        *)
            log "no base URL was substituted; cannot fetch launcher ipk"
            return 1
        ;;
    esac

    ipk_url="${WOLFDEN_BASE_URL}wolfdenos.ipk"
    ipk_path="/media/internal/downloads/wolfdenos.ipk"
    rm -f "${ipk_path}" 2>/dev/null || true

    # This script writes WOLF_DIR itself earlier in the run, so appinstalld
    # finds the target directory already populated and answers with
    # downgrade:true, unpacking nothing while still reporting "installed".
    # Clear both the directory and any stale registry entry so the install
    # is a genuinely fresh one.
    luna-send -w 5000 -n 1 'luna://com.webos.appInstallService/dev/remove' \
        '{"id":"tld.wolfdenos.home","subscribe":false}' >/dev/null 2>&1 || true
    rm -rf "${WOLF_DIR}" 2>/dev/null || true
    sleep 1

    if ! curl -s -m 60 -o "${ipk_path}" "${ipk_url}"; then
        log "launcher ipk download FAILED from ${ipk_url}"
        return 1
    fi
    if [ ! -s "${ipk_path}" ]; then
        log "launcher ipk downloaded but is empty: ${ipk_path}"
        return 1
    fi
    log "launcher ipk downloaded ($(wc -c < "${ipk_path}" 2>/dev/null) bytes)"

    # dev/install is subscription-based: a plain -n 1 returns before the install
    # finishes, so read the subscription until it reports a terminal state.
    fifo_path="/tmp/wolfden_install_fifo"
    rm -f "${fifo_path}" 2>/dev/null || true
    if ! mkfifo "${fifo_path}" 2>/dev/null; then
        log "could not create install fifo"
        return 1
    fi

    inst_payload="$(printf '{"id":"com.ares.defaultName","ipkUrl":"%s","subscribe":true}' "${ipk_path}")"
    luna-send -w 60000 -i 'luna://com.webos.appInstallService/dev/install' "${inst_payload}" > "${fifo_path}" &
    inst_pid="${!}"

    if inst_result="$(grep -m 1 -e 'installed' -e 'failed' -e 'Unknown method' "${fifo_path}")"; then
        log "dev/install: ${inst_result}"
    else
        inst_result=""
        log "dev/install timed out with no terminal response"
    fi

    kill -TERM "${inst_pid}" 2>/dev/null || true
    rm -f "${fifo_path}" 2>/dev/null || true

    case "${inst_result}" in
        *installed*) ;;
        *) return 1 ;;
    esac

    # A response of state "installed" is not proof. appinstalld has answered
    # "installed" with totalSize/unpackFileSize of 0 while registering nothing,
    # so ask SAM whether the app actually exists now.
    sleep 2
    if luna-send -w 3000 -n 1 'luna://com.webos.applicationManager/getAppInfo' \
            '{"id":"tld.wolfdenos.home"}' 2>&1 | grep -q '"returnValue":true'; then
        return 0
    fi
    log "dev/install reported success but SAM still does not know the app"
    return 1
}

LAUNCHER_INSTALLED=0
if install_launcher_ipk; then
    LAUNCHER_INSTALLED=1
    log "launcher registered with SAM as tld.wolfdenos.home"
else
    log "LAUNCHER INSTALL FAILED - the wolf OS tile will not appear"
fi

sh "${MOD_DIR}/apply.sh"

# Only claim success when the launcher actually installed. This used to be
# unconditional, which is why five failed luna calls still ended in a
# "complete!" log line and a success toast.
if [ "${LAUNCHER_INSTALLED}" = "1" ]; then
    # No success toast: the launcher itself coming up is the confirmation, and
    # a toast on top of it is just noise on the TV.
    log "wolfdenOS & wolf OS installation complete!"
else
    log "wolfdenOS core patches applied, but the launcher app did NOT install"
fi
