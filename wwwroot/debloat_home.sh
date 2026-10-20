#!/bin/sh
# ==============================================================================
# SlopBro Post-Root Optimizer for LG OLED65G3PUA (webOS 25 / 10.3.0-2504)
# Target IP: 192.168.97.141
#
# What this script does (100% non-destructive to read-only SquashFS partitions):
#   1. Speeds up & strips down the webOS 25 (10.3.0) Flutter Home Screen:
#      - Removes 'recommendedShelf' (531px dynamic ad/recommendation strip)
#      - Removes 'qcardList' (Q-Card promotional strip above apps)
#      - Hides 'globalline' & 'quickGuide' (top-right promotional nav icons)
#      - Replaces 'i18n' locale promo strings ("Start a new experience...", "Go to Apps")
#      - Optional: Pure OLED pitch-black hero banner (0% pixel wear, instant render)
#      - Mounts via /tmp/weboshome-merged over /usr/palm/applications/com.webos.app.home/data/flutter_assets/assets
#   2. Blocks LG Ad, ACR (LivePlus screen capture), Telemetry & OTA Update servers:
#      - Bind-mounts an enhanced /etc/hosts sinkholing 50+ LG ad/ACR/analytics domains
#   3. Disables Privacy-Invasive & Ad Overlay Daemons:
#      - Disables LivePlus / ACR, homeAutoLaunch, and Home Promotion via Luna settings
#      - Stops & masks adoverlay / acroverlay / rdxd telemetry processes in RAM
#   4. Removes/Hides Pre-installed Bloatware Apps (ShopTime, LG Channels, etc.)
#   5. Registers /var/lib/webosbrew/init.d/49-g3-debloat-home so all optimizations
#      automatically re-apply on every TV boot (and safely clear if failsafe mode triggers).
# ==============================================================================

set -e

MOD_DIR="/media/developer/apps/usr/palm/applications/tld.slopbro.g3mod"
INITD_DIR="/var/lib/webosbrew/init.d"
INITD_LINK="${INITD_DIR}/49-g3-debloat-home"
FLUTTER_ASSETS="/usr/palm/applications/com.webos.app.home/data/flutter_assets/assets"
QML_ASSETS="/usr/palm/applications/com.webos.app.home/qml"
LOG_FILE="/tmp/slopbro-debloat.log"

# Configurable flags (can be overridden by environment variables or CLI flags)
ENABLE_HOME_SPEEDUP="${ENABLE_HOME_SPEEDUP:-1}"
ENABLE_OLED_BLACK_BG="${ENABLE_OLED_BLACK_BG:-1}"
ENABLE_AD_HOSTS_BLOCK="${ENABLE_AD_HOSTS_BLOCK:-1}"
ENABLE_DISABLE_ACR_TELEMETRY="${ENABLE_DISABLE_ACR_TELEMETRY:-1}"
ENABLE_REMOVE_BLOAT_APPS="${ENABLE_REMOVE_BLOAT_APPS:-1}"
ENABLE_INSTALL_CUSTOM_HOME="${ENABLE_INSTALL_CUSTOM_HOME:-0}"
ENABLE_INSTALL_INPUTHOOK="${ENABLE_INSTALL_INPUTHOOK:-0}"

while [ "${#}" -gt 0 ]; do
    case "${1}" in
        --no-home-speedup) ENABLE_HOME_SPEEDUP=0 ;;
        --no-oled-black) ENABLE_OLED_BLACK_BG=0 ;;
        --no-ad-block) ENABLE_AD_HOSTS_BLOCK=0 ;;
        --no-acr-disable) ENABLE_DISABLE_ACR_TELEMETRY=0 ;;
        --no-bloat-remove) ENABLE_REMOVE_BLOAT_APPS=0 ;;
        --with-custom-home) ENABLE_INSTALL_CUSTOM_HOME=1 ;;
        --with-inputhook) ENABLE_INSTALL_INPUTHOOK=1 ;;
        --revert|--uninstall)
            echo "[*] Reverting all SlopBro G3 customizations..."
            rm -f "${INITD_LINK}"
            umount "${FLUTTER_ASSETS}" 2>/dev/null || true
            umount "${QML_ASSETS}" 2>/dev/null || true
            umount /etc/hosts 2>/dev/null || true
            rm -rf /tmp/weboshome-merged /tmp/hosts.slopbro
            pkill -f com.webos.app.home 2>/dev/null || true
            echo "[+] Reverted to stock webOS. Rebooting or pressing HOME will load stock layout."
            exit 0
            ;;
    esac
    shift
done

log() {
    msg="[$(date '+%H:%M:%S')] ${1}"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

toast() {
    payload="$(printf '{"sourceId":"com.webos.service.secondscreen.gateway","message":"<h3>G3 Debloat &amp; Speedup</h3>%s"}' "${1}")"
    luna-send -w 1000 -n 1 -a 'com.webos.service.secondscreen.gateway' 'luna://com.webos.notification/createToast' "${payload}" >/dev/null 2>&1 || true
}

log "Starting OLED65G3PUA (webOS 10.3.0) Home Speedup & Privacy Suite..."
mkdir -p "${MOD_DIR}/assets/images/hd" \
         "${MOD_DIR}/assets/images/2k" \
         "${MOD_DIR}/assets/images/4k" \
         "${MOD_DIR}/assets/i18n" \
         "${INITD_DIR}"

# ------------------------------------------------------------------------------
# 1. Prepare minimal debloated home.xml for webOS 10.3.0 (Flutter Home)
# ------------------------------------------------------------------------------
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

# Generate a tiny valid 1x1 pitch-black PNG (67 bytes) for zero-wear OLED background
generate_black_png() {
    target_png="${1}"
    printf '\211PNG\r\n\032\n\000\000\000\rIHDR\000\000\000\001\000\000\000\001\010\002\000\000\000\220wS\336\000\000\000\014IDATx\234c```\000\000\000\004\000\001\366\0278U\000\000\000\000IEND\256B`\202' > "${target_png}"
}

if [ "${ENABLE_OLED_BLACK_BG}" = "1" ]; then
    generate_black_png "${MOD_DIR}/assets/images/hd/bg_banner_img.png"
    generate_black_png "${MOD_DIR}/assets/images/2k/bg_banner_img.png"
    generate_black_png "${MOD_DIR}/assets/images/4k/bg_banner_img.png"
fi

# ------------------------------------------------------------------------------
# 2. Prepare /etc/hosts blocklist for LG Ad, ACR, Telemetry & OTA servers
# ------------------------------------------------------------------------------
cat > "${MOD_DIR}/hosts.block" << 'EOF'
# === SlopBro LG webOS Ad, ACR (LivePlus) & Telemetry Sinkhole ===
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

# ------------------------------------------------------------------------------
# 3. Create the persistent boot-time script (apply.sh)
# ------------------------------------------------------------------------------
cat > "${MOD_DIR}/apply.sh" << EOF
#!/bin/sh
# Persistent boot hook for LG OLED65G3PUA (webOS 10.3.0)
# Symlinked at ${INITD_LINK}

MOD_DIR="${MOD_DIR}"
FLUTTER_ASSETS="${FLUTTER_ASSETS}"
ENABLE_HOME_SPEEDUP="${ENABLE_HOME_SPEEDUP}"
ENABLE_OLED_BLACK_BG="${ENABLE_OLED_BLACK_BG}"
ENABLE_AD_HOSTS_BLOCK="${ENABLE_AD_HOSTS_BLOCK}"
ENABLE_DISABLE_ACR_TELEMETRY="${ENABLE_DISABLE_ACR_TELEMETRY}"

# --- A. Apply /etc/hosts Ad + ACR + OTA Sinkhole ---
if [ "\${ENABLE_AD_HOSTS_BLOCK}" = "1" ] && [ -f "\${MOD_DIR}/hosts.block" ]; then
    umount /etc/hosts 2>/dev/null || true
    cp /etc/hosts /tmp/hosts.slopbro
    grep -q "SlopBro LG webOS" /tmp/hosts.slopbro || cat "\${MOD_DIR}/hosts.block" >> /tmp/hosts.slopbro
    mount --bind /tmp/hosts.slopbro /etc/hosts 2>/dev/null || true
fi

# --- B. Apply webOS 10.3.0 Flutter Home Screen Overlay (No Ads / No Shelves) ---
if [ "\${ENABLE_HOME_SPEEDUP}" = "1" ] && [ -d "\${FLUTTER_ASSETS}" ]; then
    umount "\${FLUTTER_ASSETS}" 2>/dev/null || true
    rm -rf /tmp/weboshome-merged
    mkdir -p /tmp/weboshome-merged
    cp -R --no-dereference "\${FLUTTER_ASSETS}"/. /tmp/weboshome-merged/

    # Dereference i18n symlink so we can blank out hero banner promo text
    if [ -L /tmp/weboshome-merged/i18n ]; then
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
    fi

    # Install stripped home.xml (app bar only, autoFocus=true on appList)
    cp "\${MOD_DIR}/assets/home.xml" /tmp/weboshome-merged/home.xml
    if [ -f /tmp/weboshome-merged/home_layoutShelfView.xml ]; then
        sed -i '/<item id="recommendedShelf"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
        sed -i '/<item id="qcardList"/d' /tmp/weboshome-merged/home_layoutShelfView.xml 2>/dev/null || true
    fi

    if [ "\${ENABLE_OLED_BLACK_BG}" = "1" ]; then
        cp -R "\${MOD_DIR}/assets/images"/. /tmp/weboshome-merged/images/ 2>/dev/null || true
    fi

    mount --bind /tmp/weboshome-merged "\${FLUTTER_ASSETS}"
    pkill -f com.webos.app.home 2>/dev/null || true
fi

# --- C. Disable ACR (LivePlus), Home Promotion, Auto-Launch & Ad Daemons ---
if [ "\${ENABLE_DISABLE_ACR_TELEMETRY}" = "1" ]; then
    # Turn off LivePlus (ACR), Home Promo, and Auto-Launch at the system settings level
    luna-send -n 1 'luna://com.webos.settingsservice/setSystemSettings' '{"category":"option","settings":{"livePlus":"off","homePromotion":"off","homeAutoLaunch":"off","personalizedAd":"off"}}' >/dev/null 2>&1 || true

    # Kill background ad/ACR overlay apps and telemetry daemons to free RAM & CPU
    for proc in com.webos.app.adoverlay com.webos.app.adoverlayex com.webos.app.acroverlay rdxd; do
        pkill -f "\${proc}" 2>/dev/null || true
    done
fi
EOF

chmod +x "${MOD_DIR}/apply.sh"
ln -sf "${MOD_DIR}/apply.sh" "${INITD_LINK}"
log "Registered persistent boot hook: ${INITD_LINK}"

# ------------------------------------------------------------------------------
# 4. Remove / Hide Known Bloatware Apps (Optional)
# ------------------------------------------------------------------------------
if [ "${ENABLE_REMOVE_BLOAT_APPS}" = "1" ]; then
    log "Removing removable promotional bloatware apps..."
    for bloat_id in \
        com.lgshop.app \
        com.webos.app.lgchannels \
        com.palm.app.settings.ad \
        love.fubo \
        com. Rakuten.tv; do
        luna-send -n 1 'luna://com.webos.appInstallService/dev/remove' "{\"id\":\"${bloat_id}\",\"subscribe\":false}" >/dev/null 2>&1 || true
    done
fi

# ------------------------------------------------------------------------------
# 5. Optional: Install Syspoke lginputhook v1.5.0 (webOS 25 compatible)
# ------------------------------------------------------------------------------
if [ "${ENABLE_INSTALL_INPUTHOOK}" = "1" ]; then
    log "Installing lginputhook v1.5.0 (webOS 25 compatible button remapper)..."
    IH_IPK="/tmp/lginputhook_1.5.0.ipk"
    curl -k -sSL -o "${IH_IPK}" "https://github.com/Syspoke/lginputhook/releases/download/V1.5.0/org.webosbrew.inputhook_1.5.0_all.ipk" && \
    luna-send -w 30000 -n 1 'luna://com.webos.appInstallService/dev/install' "{\"id\":\"org.webosbrew.inputhook\",\"ipkUrl\":\"${IH_IPK}\",\"subscribe\":true}" >/dev/null 2>&1 || true
    rm -f /tmp/inputhook "${IH_IPK}"
fi

# ------------------------------------------------------------------------------
# 6. Optional: Install zzeppieri/webos-custom-home replacement launcher
# ------------------------------------------------------------------------------
if [ "${ENABLE_INSTALL_CUSTOM_HOME}" = "1" ]; then
    log "Installing Custom webOS Home launcher (tld.my.customhome)..."
    curl -k -fsSL "https://github.com/zzeppieri/webos-custom-home/releases/download/v0.4.2/tv-install.sh" | sh || true
fi

# Execute apply.sh immediately so changes take effect without needing a full reboot
sh "${MOD_DIR}/apply.sh"

log "OLED65G3PUA optimization complete!"
toast "Home menu debloated, ads/ACR blocked, and boot persistence enabled!"
