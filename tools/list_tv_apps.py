#!/usr/bin/env python3
"""
Query the LG webOS TV over SSAP (using the saved client key) to list all
installed apps, launch points, and external HDMI inputs, saving the results
to wwwroot/tv-launchpoints.json and wwwroot/tv-apps.json.
"""
import json
import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
import wolfdenOS as slopbro


REMOVED_APP_IDS = {
    "amazon.alexa.view",
    "com.webos.app.sportsteamsettings",
    "com.webos.app.homeconnect",
    "com.webos.app.lifeonscreen",
    "com.webos.app.browser",
    "com.webos.app.mediadiscovery",
    "com.webos.app.camera",
    "com.webos.app.multiviewsettings",
}


def main():
    ip = sys.argv[1] if len(sys.argv) > 1 else "192.168.97.141"
    print(f"[*] Connecting to wss://{ip}:3001 ...")
    ws = slopbro.WebSocket.connect(ip, slopbro.PORT_TLS, secure=True, timeout=8.0)
    client = slopbro.SSAPClient(ws)

    key = slopbro.load_client_key(ip)
    new_key = client.register(key, slopbro.DEFAULT_MANIFEST)
    if new_key and new_key != key:
        slopbro.save_client_key(ip, new_key)

    r_lp = client.request(
        "ssap://com.webos.applicationManager/listLaunchPoints", {}, timeout=10.0
    )
    r_apps = client.request(
        "ssap://com.webos.applicationManager/listApps", {}, timeout=10.0
    )

    wwwroot = os.path.join(ROOT_DIR, "wwwroot")
    os.makedirs(wwwroot, exist_ok=True)

    lp_file = os.path.join(wwwroot, "tv-launchpoints.json")
    apps_file = os.path.join(wwwroot, "tv-apps.json")

    lps = [
        lp
        for lp in ((r_lp.get("payload") or {}).get("launchPoints") or [])
        if lp.get("id") not in REMOVED_APP_IDS
    ]
    apps = [
        a
        for a in ((r_apps.get("payload") or {}).get("apps") or [])
        if a.get("id") not in REMOVED_APP_IDS
    ]

    if "payload" in r_lp and isinstance(r_lp["payload"], dict):
        r_lp["payload"]["launchPoints"] = lps
    if "payload" in r_apps and isinstance(r_apps["payload"], dict):
        r_apps["payload"]["apps"] = apps

    with open(lp_file, "w", encoding="utf-8") as f:
        json.dump(r_lp, f, indent=2)
    with open(apps_file, "w", encoding="utf-8") as f:
        json.dump(r_apps, f, indent=2)

    print(f"\n[+] Saved {len(lps)} launch points to wwwroot/tv-launchpoints.json")
    print(f"[+] Saved {len(apps)} apps to wwwroot/tv-apps.json\n")
    print(f"{'APP ID':<44} | {'TITLE':<28} | {'VISIBLE':<7} | {'SYSTEM'}")
    print("-" * 92)
    for lp in lps:
        app_id = str(lp.get("id", ""))
        title = str(lp.get("title", ""))
        visible = str(lp.get("visible", True))
        sys_app = str(lp.get("systemApp", False))
        print(f"{app_id:<44} | {title:<28} | {visible:<7} | {sys_app}")

    client.close()


if __name__ == "__main__":
    main()
