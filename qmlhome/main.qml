// 2.12, not 2.4: the import version gates the API, and Gradient.orientation
// (the horizontal scrim behind the clock) is a 2.12 property. The TV's Qt is
// 5.12, so this is the newest version it has.
import QtQuick 2.12
import QtMultimedia 5.12
import Eos.Window 0.1
import WebOSServices 1.0
import Qt.labs.settings 1.0
import QtGraphicalEffects 1.0

// wolfdenOS home screen, native.
//
// This is the launcher that used to be a web app (launcher/index.html),
// rebuilt as a QML app so the TV runs it through qml-runner: GPU-composited,
// ~200ms to the screen, and installed as the HOME app through the same
// switch LG uses for its own Senior Home (applicationManager/setDefaultApp,
// see apply.sh). LG's Home is untouched underneath.
//
// Layout, top to bottom: live video background, clock and date top right, a
// glass dock of four apps plus an All Apps tile along the bottom, and an All
// Apps grid that slides over everything.
//
// How video works here, because it is not obvious: QtMultimedia on webOS
// plays through LG's media pipeline onto the hardware video plane, which sits
// BELOW the graphics plane. The Video item draws nothing itself; it punches a
// transparent hole so the plane shows through. So the window must be
// transparent and nothing opaque may sit under the Video, or the footage is
// simply covered. The idle still is stacked ABOVE it and faded in instead.
//
// Burn-in guard: the video stops fifteen minutes after the last key press and
// the still takes over; twenty minutes in, the screen goes black with a dim
// clock that drifts. Any key brings it all back. Pure black is pixels off on an
// OLED, which is the point.

WebOSWindow {
    id: root
    width: 1920
    height: 1080
    visible: true
    color: "transparent"
    appId: "tld.wolfdenos.qmlhome"
    title: "wolfdenOS"
    keyMask: WebOSWindow.KeyMaskDefault | WebOSWindow.KeyMaskBack

    // keyMask alone is not enough for BACK and EXIT. The compositor's key
    // filter (KeyFilters/systemUi.js, activeSurfaceAcceptsBackKey) looks at
    // the surface's _WEBOS_ACCESS_POLICY_KEYS_* window properties, and when
    // BACK is not "true" there it never reaches the app: the compositor pops
    // its own "Do you want to exit the app?" alert and closeByAppId's us,
    // and SAM's last-app fallback then brings LG's Home back. Both keys are
    // claimed here, so the only thing that closes the home screen is SAM.
    // (Set in Component.onCompleted below.)

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    // The dock starts with these four. Holding OK on a tile in All Apps adds
    // it to (or removes it from) the dock; holding OK on a dock tile removes
    // it. The result is kept in QSettings under /home/root/.config, which is
    // persistent and outside the app directory that dev/install wipes.
    readonly property var defaultDockIds: [
        "youtube.leanback.v4",
        "com.disney.disneyplus-prod",
        "hulu",
        "amazon"
    ]
    readonly property int dockMax: 6
    property var dockIds: defaultDockIds
    Settings {
        id: prefs
        // An explicit file: qml-runner sets no organizationName, and without
        // one QSettings refuses to initialise ("Status code is: 1").
        fileName: "/home/root/.config/wolfdenos/home.conf"
        category: "dock"
        property string ids: ""
        property string trace: ""
    }
    // Debug channel that survives LG's log throttle: pmlog blocks qml-runner
    // after a burst (NL_LOG_BLOCKED), and the video client alone bursts. The
    // last lines go into the settings file, readable over telnet.
    property var traceLines: []
    property string traceUrl: ""
    function dbg(msg) {
        console.warn("wolfdenOS: " + msg);
        if (traceUrl) {
            try { var x = new XMLHttpRequest(); x.open("POST", traceUrl, true); x.send(msg); } catch (e) {}
        }
        // concat, not push: a var property hands out a copy of its array.
        var lines = traceLines.concat([Qt.formatTime(new Date(), "hh:mm:ss") + " " + msg]);
        if (lines.length > 24) { lines.shift(); }
        traceLines = lines;
        prefs.trace = lines.join(" | ");
    }
    function loadDock() {
        root.dbg("prefs.ids = " + JSON.stringify(prefs.ids));
        try {
            var saved = prefs.ids ? JSON.parse(prefs.ids) : null;
            if (saved && saved.length !== undefined) { dockIds = saved; }
        } catch (e) { console.warn("wolfdenOS: dock prefs unreadable, using defaults"); }
    }
    function saveDock() { prefs.ids = JSON.stringify(dockIds); }
    function isDocked(id) { return dockIds.indexOf(id) !== -1; }
    function toggleDock(id) {
        var ids = dockIds.slice();
        var at = ids.indexOf(id);
        if (at !== -1) { ids.splice(at, 1); }
        else if (ids.length < dockMax) { ids.push(id); }
        else { return false; }
        dockIds = ids;
        saveDock();
        rebuild();
        return true;
    }
    // Never shown anywhere: our own apps and leftovers from earlier passes.
    readonly property var hiddenIds: [
        "tld.wolfdenos.qmlhome", "tld.wolfdenos.qmltest", "tld.wolfdenos.home",
        "tld.wolfdenos.overlay", "tld.slopbro.g3mod"
    ]

    readonly property int idlePauseMs: 15 * 60 * 1000
    readonly property int idleBlackMs: 20 * 60 * 1000
    readonly property int idleDriftMs: 30 * 1000

    readonly property string appDir: "/media/developer/apps/usr/palm/applications/tld.wolfdenos.qmlhome/"
    readonly property int tileSize: 124
    readonly property int tileGap: 18

    // ------------------------------------------------------------------
    // Data: launch points straight from SAM, kept live by subscription.
    // ------------------------------------------------------------------

    property var allApps: []
    property var dockApps: []
    property var gridApps: []
    property int dockIndex: 0       // 0..dockApps.length; the last is All Apps
    property int gridIndex: 0
    property bool gridOpen: false

    // One Service object, not one per method. Each Service registers on the
    // luna bus under the app's id, and a second registration of the same name
    // fails ("Failed to initialize LunaServiceManager instance"), which left
    // every call silently dead. So the method is switched per call and the
    // replies are told apart by shape: only the launch-point list carries
    // "launchPoints".
    Service {
        id: luna
        appId: root.appId
        service: "com.webos.applicationManager"
        method: "listLaunchPoints"
        onCallSuccess: {
            // The payload is the signal's argument. "response" on this element
            // is a method, not a property -- found by printing typeof.
            var res = arguments.length ? arguments[0] : luna.response();
            if (typeof res === "string") {
                try { res = JSON.parse(res); } catch (e) { console.warn("luna: bad JSON"); return; }
            }
            if (!res) { return; }
            if (res.launchPoints !== undefined) { root.ingestLaunchPoints(res); }
        }
    }

    // The Service element keeps ONE live call: a second callService() on it
    // silently ends the first subscription (found when a second one left the
    // first mute). So the list comes from a single subscription to LG's own
    // homelaunchpoints/listLaunchPoints -- the launch points after the hides
    // apply.sh makes, i.e. what LG's Home would show, with full icon fields --
    // preceded by one plain call to listAvailableLaunchPoints, which answers
    // with the hidden ones, so Homebrew Channel (hidden by LG, wanted here)
    // can be kept. The subscription is renewed whenever the home comes back
    // to the front, since launching an app is a call on the same object.
    readonly property var alwaysShow: ["org.webosbrew.hbchannel"]
    property var keptHidden: []
    property bool hiddenFetched: false
    function subscribeLaunchPoints() {
        luna.service = "com.webos.service.homelaunchpoints";
        if (!hiddenFetched) {
            luna.method = "listAvailableLaunchPoints";
            luna.callService({});
            return;
        }
        luna.method = "listLaunchPoints";
        luna.callService({ subscribe: true });
    }

    function ingestLaunchPoints(res) {
        var visible = [], hidden = [];
        for (var i = 0; i < res.launchPoints.length; i++) {
            var lp = res.launchPoints[i];
            if (hiddenIds.indexOf(lp.id) !== -1 || lp.id.indexOf("tld.wolfdenos.") === 0) { continue; }
            (lp.hidden ? hidden : visible).push(lp);
        }
        if (!hiddenFetched) {
            // The one-shot reply: remember the hidden apps we still want, then
            // start the real subscription.
            hiddenFetched = true;
            keptHidden = hidden.filter(function (lp) { return alwaysShow.indexOf(lp.id) !== -1; });
            console.warn("wolfdenOS: " + hidden.length + " hidden launch points, keeping " + keptHidden.length);
            subscribeLaunchPoints();
            if (visible.length === 0) { return; }
        }
        // A late one-shot reply (hidden entries only) must not wipe the grid.
        if (visible.length === 0 && hidden.length > 0) { return; }
        root.dbg(visible.length + " visible launch points");
        allApps = visible.concat(keptHidden);
        storeInstalled = findApp(storeId) !== null;
        rebuild();
    }

    function findApp(id) {
        for (var i = 0; i < allApps.length; i++) { if (allApps[i].id === id) { return allApps[i]; } }
        return null;
    }

    function rebuild() {
        var dock = [];
        for (var i = 0; i < dockIds.length; i++) {
            var a = findApp(dockIds[i]);
            if (a) { dock.push(a); }
        }
        var every = allApps.slice();
        every.sort(function (a, b) { return (a.title || "").localeCompare(b.title || ""); });
        root.dbg("rebuild: " + allApps.length + " apps, dockIds " + JSON.stringify(dockIds) + " -> dock " + dock.length);
        dockApps = dock;
        gridApps = every;
        if (dockIndex > dockApps.length) { dockIndex = dockApps.length; }
        if (gridIndex >= gridApps.length) { gridIndex = Math.max(0, gridApps.length - 1); }
    }

    function iconFor(lp) {
        var p = lp.largeIcon || lp.mediumLargeIcon || lp.icon || "";
        if (p.indexOf("/") === 0) { return "file://" + p; }
        return p;
    }

    function launchApp(id) {
        luna.service = "com.webos.applicationManager";
        luna.method = "launch";
        luna.callService({ id: id, params: {} });
    }

    // App updates come from LG's Content Store (com.webos.app.discovery, the
    // "Apps" tile), which is a thin loader for a page LG hosts; it reads its
    // own launch params there. It is left installed for exactly this.
    readonly property string storeId: "com.webos.app.discovery"
    property bool storeInstalled: false
    function launchStore(app) {
        luna.service = "com.webos.applicationManager";
        luna.method = "launch";
        luna.callService({ id: storeId, params: { query: "featured", appId: app ? app.id : "" } });
    }

    // ------------------------------------------------------------------
    // Idle / burn-in guard
    // ------------------------------------------------------------------

    property int idleStage: 0   // 0 live, 1 video paused + still, 2 black

    Timer { id: idlePause; interval: root.idlePauseMs; onTriggered: root.idleStage = 1 }
    Timer { id: idleBlack; interval: root.idleBlackMs; onTriggered: root.idleStage = 2 }
    Timer {
        id: idleDrift; interval: root.idleDriftMs; repeat: true; running: root.idleStage === 2
        onTriggered: {
            dimClock.x = 120 + Math.random() * (root.width - dimClock.width - 240);
            dimClock.y = 120 + Math.random() * (root.height - dimClock.height - 240);
        }
    }

    function touch() {
        idleStage = 0;
        idlePause.restart();
        idleBlack.restart();
        // Not left to onIdleStageChanged: the stage is already 0 while another
        // app is in front (only the video was paused), so coming back would
        // fire no change and the footage stayed frozen behind the dock.
        if (Qt.application.active && bgVideo.playbackState !== MediaPlayer.PlayingState) { bgVideo.play(); }
    }

    onIdleStageChanged: {
        if (idleStage === 0) { if (Qt.application.active) { bgVideo.play(); } }
        else { bgVideo.pause(); }
    }

    // The wall is the floor, the footage is the ceiling. The video plane is
    // black whenever the pipeline is not delivering frames -- at launch,
    // coming back from another app, after a reload -- and the player's state
    // says nothing useful about that (it reports PlayingState over a black
    // plane). So "live" means position actually advanced since the last
    // pulse, and the type wall is shown whenever that is not the case, with a
    // cross-fade either way. The earlier version compared position for
    // inequality, so a reload (position back to 0) counted as "moving" and
    // dropped the wall onto a black plane: three backgrounds in a row.
    property bool videoLive: false
    property int lastVideoPos: -1
    property int stalledPulses: 0
    property bool videoRetried: false
    Timer {
        id: videoPulse
        interval: 1000; repeat: true
        running: root.idleStage === 0 && Qt.application.active
        onTriggered: {
            var pos = bgVideo.position;
            var advanced = root.lastVideoPos >= 0 && pos > root.lastVideoPos
                           && bgVideo.playbackState === MediaPlayer.PlayingState;
            root.lastVideoPos = pos;
            if (advanced) {
                if (!root.videoLive) { root.dbg("video live at " + pos); }
                root.videoLive = true; root.stalledPulses = 0; root.videoRetried = false;
                return;
            }
            root.stalledPulses++;
            if (root.videoLive) { root.dbg("video stalled at " + pos + " (state " + bgVideo.playbackState + ", status " + bgVideo.status + ")"); }
            root.videoLive = false;
            // One reload after a few seconds of nothing, then leave it to the wall.
            if (root.stalledPulses >= 4 && !root.videoRetried) {
                root.videoRetried = true;
                root.dbg("reloading video");
                var src = bgVideo.source; bgVideo.source = ""; bgVideo.source = src;
                bgVideo.play();
            }
        }
    }

    // The app menu: two actions for the focused app, opened with the 0 key
    // (a long press on OK was not reliably distinguishable from a tap on the
    // Magic Remote). Focus moves to it while it is open and returns to
    // whatever was underneath when it closes.
    property var menuApp: null
    property int menuIndex: 0
    property bool menuOpen: menuApp !== null
    function openMenu(app) { menuIndex = 0; menuApp = app; appMenu.forceActiveFocus(); root.dbg("menu for " + app.id); }
    function closeMenu() {
        menuApp = null;
        if (gridOpen) { grid.forceActiveFocus(); } else { dock.forceActiveFocus(); }
    }

    // Pause while another app is in front: nothing to see, and a looping
    // decode in the background is just heat. Coming back also renews the
    // launch-point subscription (launching was a call on the same Service).
    Connections {
        target: Qt.application
        onActiveChanged: {
            if (Qt.application.active) { root.touch(); root.subscribeLaunchPoints(); }
            else { bgVideo.pause(); }
        }
    }

    Component.onCompleted: {
        // Assigned, not setWindowProperty(): that one is not invokable from
        // QML. This is how LG's own QML apps do it. See the note at the top.
        root.windowProperties._WEBOS_ACCESS_POLICY_KEYS_BACK = true;
        root.windowProperties._WEBOS_ACCESS_POLICY_KEYS_EXIT = true;
        // push_qmlhome.py --trace drops debug.url next to main.qml; absent in
        // a normal install, so this is a no-op there.
        try {
            var r = new XMLHttpRequest();
            r.open("GET", "file://" + root.appDir + "debug.url", false); r.send();
            if (r.status === 200 || r.status === 0) { traceUrl = (r.responseText || "").trim(); }
        } catch (e) {}
        loadDock();
        subscribeLaunchPoints();
        touch();
        dock.forceActiveFocus();
    }

    // ------------------------------------------------------------------
    // Clock source
    // ------------------------------------------------------------------

    property date now: new Date()
    Timer { interval: 1000; running: true; repeat: true; onTriggered: root.now = new Date() }

    // 12-hour, no leading zero. Qt's "h" is 24-hour unless "AP" is in the
    // format, and the AP goes in its own Text: LG SlimNumber is numerals only.
    function clockText(d) {
        var h = d.getHours() % 12; if (h === 0) { h = 12; }
        var m = d.getMinutes();
        return h + ":" + (m < 10 ? "0" + m : m);
    }
    function meridiem(d) { return d.getHours() < 12 ? "AM" : "PM"; }

    // ------------------------------------------------------------------
    // Background (see the note at the top on plane order)
    // ------------------------------------------------------------------

    Video {
        id: bgVideo
        anchors.fill: parent
        source: "file://" + root.appDir + "home-bg.mp4"
        autoPlay: true
        loops: MediaPlayer.Infinite
        muted: true
        fillMode: VideoOutput.PreserveAspectCrop
        onStatusChanged: { if (status === MediaPlayer.InvalidMedia) { root.videoLive = false; } }
        onErrorChanged: { if (error !== MediaPlayer.NoError) { root.videoLive = false; } }
    }

    // Fallback background: a wall of type-case cells with neon outlines that
    // drift and change colour, one fullscreen fragment shader. It sits above
    // the Video (anything under the Video covers the footage, see the top
    // note) and is only composited while visible.
    ShaderEffect {
        id: typeWall
        anchors.fill: parent
        visible: opacity > 0
        opacity: (!root.videoLive && root.idleStage === 0) ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 500 } }
        property real t: 0
        property real aspect: width / height
        NumberAnimation on t { from: 0; to: 3600; duration: 3600000; loops: Animation.Infinite; running: typeWall.visible }
        fragmentShader: "
            varying highp vec2 qt_TexCoord0;
            uniform lowp float qt_Opacity;
            uniform highp float t;
            uniform highp float aspect;
            highp float hash(highp vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            highp vec3 neon(highp float h) { return 0.55 + 0.45 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67))); }
            void main() {
                highp vec2 uv = vec2(qt_TexCoord0.x * aspect, qt_TexCoord0.y) * 22.0;
                highp vec2 g = floor(uv);
                highp vec2 f = fract(uv);
                highp float r = hash(g);
                highp float r2 = hash(g + 17.3);
                highp vec2 d = abs(f - 0.5);
                highp float e = max(d.x, d.y);
                highp float frame = smoothstep(0.38, 0.41, e) - smoothstep(0.46, 0.49, e);
                highp float inner = 0.0;
                if (r2 < 0.33) { inner = (smoothstep(0.10, 0.13, d.x) - smoothstep(0.17, 0.20, d.x)) * step(d.y, 0.30); }
                else if (r2 < 0.66) { inner = (smoothstep(0.10, 0.13, d.y) - smoothstep(0.17, 0.20, d.y)) * step(d.x, 0.30); }
                else { inner = smoothstep(0.17, 0.20, e) - smoothstep(0.25, 0.28, e); }
                highp float stroke = max(frame, inner * 0.8);
                highp float wave = sin(t * (0.35 + 0.5 * r) + r * 60.0) * 0.5 + 0.5;
                highp float lit = smoothstep(0.80, 0.97, wave) * step(0.55, hash(g + 3.1));
                highp vec3 hue = neon(r + t * 0.03);
                highp vec3 col = mix(vec3(0.13, 0.13, 0.14), hue, lit);
                highp float glow = lit * smoothstep(0.52, 0.41, e) * 0.25;
                highp vec3 bg = vec3(0.03, 0.03, 0.035) + hue * glow;
                gl_FragColor = vec4(mix(bg, col, stroke), 1.0) * qt_Opacity;
            }"
    }

    // Idle still, above the video. Faded in when the video is paused so the
    // last decoded frame never sits there as a burn-in risk of its own.
    Image {
        id: bgStill
        anchors.fill: parent
        source: "file://" + root.appDir + "home-bg-still.jpg"
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        opacity: root.idleStage >= 1 ? 1 : 0
        visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 800 } }
    }

    // Scrims: enough to keep the dock and clock legible over footage, no more.
    Rectangle {
        anchors.left: parent.left; anchors.top: parent.top; anchors.bottom: parent.bottom
        width: 560
        gradient: Gradient {
            orientation: Gradient.Horizontal
            GradientStop { position: 0.0; color: "#d9050506" }
            GradientStop { position: 1.0; color: "#00050506" }
        }
    }
    Rectangle {
        anchors.right: parent.right; anchors.top: parent.top
        width: 760; height: 340
        gradient: Gradient {
            orientation: Gradient.Horizontal
            GradientStop { position: 0.0; color: "#00050506" }
            GradientStop { position: 1.0; color: "#99050506" }
        }
    }

    // ------------------------------------------------------------------
    // Clock, top right
    // ------------------------------------------------------------------

    Column {
        anchors.right: parent.right; anchors.rightMargin: 84
        anchors.top: parent.top; anchors.topMargin: 56
        spacing: 2
        Row {
            anchors.right: parent.right
            spacing: 14
            Text {
                text: root.clockText(root.now)
                color: "white"
                font.family: "LG SlimNumber"; font.weight: Font.Light; font.pixelSize: 112
                style: Text.Raised; styleColor: "#80000000"
            }
            Text {
                anchors.baseline: parent.children[0].baseline
                text: root.meridiem(root.now)
                color: "#e6e6e6"
                font.family: "LG Smart UI"; font.pixelSize: 34; font.weight: Font.DemiBold
                style: Text.Raised; styleColor: "#80000000"
            }
        }
        Text {
            anchors.right: parent.right
            text: Qt.formatDate(root.now, "dddd, MMMM d")
            color: "#e6e6e6"
            font.family: "LG Smart UI"; font.pixelSize: 36
            style: Text.Raised; styleColor: "#80000000"
        }
    }

    // ------------------------------------------------------------------
    // Dock
    // ------------------------------------------------------------------

    Item {
        id: dock
        focus: !root.gridOpen
        // Out of the way while All Apps is up: the panel is not fully opaque
        // and the dock showed through it.
        visible: !root.gridOpen
        anchors.left: parent.left; anchors.leftMargin: 72
        anchors.verticalCenter: parent.verticalCenter
        width: root.tileSize + 56
        height: dockColumn.height + 56

        Rectangle {
            anchors.fill: parent
            radius: 38
            color: "#66101012"
            border.color: "#40ffffff"; border.width: 2
        }

        Column {
            id: dockColumn
            anchors.centerIn: parent
            spacing: root.tileGap

            Repeater {
                model: root.dockApps.length
                delegate: Tile {
                    app: root.dockApps[index]
                    icon: app ? root.iconFor(app) : ""
                    size: root.tileSize
                    focused: !root.gridOpen && root.dockIndex === index
                }
            }

            // All Apps
            Item {
                id: allAppsTile
                width: root.tileSize; height: root.tileSize
                property bool focused: !root.gridOpen && root.dockIndex === root.dockApps.length
                scale: focused ? 1.12 : 1.0
                Behavior on scale { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
                Rectangle {
                    anchors.fill: parent; radius: 30
                    color: allAppsTile.focused ? "#66ffffff" : "#2effffff"
                    border.color: allAppsTile.focused ? "#ffffff" : "#40ffffff"
                    border.width: allAppsTile.focused ? 3 : 1
                }
                Grid {
                    anchors.centerIn: parent; columns: 2; spacing: 10
                    Repeater { model: 4; Rectangle { width: 22; height: 22; radius: 6; color: "white" } }
                }
            }
        }

        Keys.onPressed: {
            root.touch();
            switch (event.key) {
            case Qt.Key_Up:
                if (root.dockIndex > 0) { root.dockIndex--; }
                event.accepted = true; break;
            case Qt.Key_Down:
                if (root.dockIndex < root.dockApps.length) { root.dockIndex++; }
                event.accepted = true; break;
            case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Select:
                if (event.isAutoRepeat) { event.accepted = true; break; }
                if (root.dockIndex === root.dockApps.length) { root.gridOpen = true; grid.forceActiveFocus(); }
                else if (root.dockApps[root.dockIndex]) { root.launchApp(root.dockApps[root.dockIndex].id); }
                event.accepted = true; break;
            case Qt.Key_0:
                if (!event.isAutoRepeat && root.dockApps[root.dockIndex]) { root.openMenu(root.dockApps[root.dockIndex]); }
                event.accepted = true; break;
            case Qt.Key_Back: case 0x01200003:
                // The home screen is the floor: BACK here goes nowhere. Quitting
                // instead hands the screen to SAM's last-app fallback, which is
                // LG's Home regardless of defaultApps.home (tested).
                event.accepted = true; break;
            }
        }
    }

    // The focused tile's name, beside the dock at the tile's height.
    Text {
        visible: !root.gridOpen
        x: dock.x + dock.width + 26
        y: dock.y + 28 + root.dockIndex * (root.tileSize + root.tileGap) + root.tileSize / 2 - height / 2
        Behavior on y { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }
        text: root.dockIndex === root.dockApps.length ? "All Apps"
              : (root.dockApps[root.dockIndex] ? root.dockApps[root.dockIndex].title : "")
        color: "white"
        font.family: "LG Smart UI"; font.pixelSize: 30; font.weight: Font.DemiBold
        style: Text.Raised; styleColor: "#80000000"
    }

    // ------------------------------------------------------------------
    // All Apps grid
    // ------------------------------------------------------------------

    Rectangle {
        id: gridPanel
        anchors.fill: parent
        color: "#e6070708"
        visible: opacity > 0
        opacity: root.gridOpen ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 180 } }

        Text {
            id: gridTitle
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top; anchors.topMargin: 64
            text: "All Apps"
            color: "white"
            font.family: "LG Smart UI"; font.pixelSize: 44; font.weight: Font.DemiBold
        }

        GridView {
            id: grid
            anchors.top: gridTitle.bottom; anchors.topMargin: 48
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom; anchors.bottomMargin: 48
            width: cellWidth * 6
            cellWidth: 270; cellHeight: 230
            clip: true
            model: root.gridApps.length
            currentIndex: root.gridIndex
            highlightFollowsCurrentItem: true
            keyNavigationWraps: false
            delegate: Item {
                width: grid.cellWidth; height: grid.cellHeight
                property var app: root.gridApps[index]
                property bool focused: root.gridOpen && !root.menuOpen && root.gridIndex === index
                Rectangle {
                    anchors.fill: parent; anchors.margins: 12; radius: 22
                    color: focused ? "#40ffffff" : "#14ffffff"
                    border.color: focused ? "#ffffff" : "#26ffffff"; border.width: focused ? 3 : 1
                }
                // In-dock marker: a blue halo around the artwork. Reads
                // root.dockIds so it follows a toggle immediately.
                property bool docked: app ? root.dockIds.indexOf(app.id) !== -1 : false
                Rectangle {
                    id: halo
                    anchors.fill: iconPlate; anchors.margins: -7
                    radius: 29
                    color: "#2e60a5fa"
                    border.color: "#d960a5fa"; border.width: 3
                    visible: docked
                }
                Glow {
                    anchors.fill: halo
                    source: halo
                    radius: 18; samples: 25; spread: 0.2
                    color: "#9960a5fa"
                    visible: docked
                }
                Tile {
                    id: iconPlate
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.top: parent.top; anchors.topMargin: 30
                    size: 118; radius: 22
                    app: parent.app
                    icon: app ? root.iconFor(app) : ""
                }
                Text {
                    anchors.top: iconPlate.bottom; anchors.topMargin: 16
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: parent.width - 40
                    text: app ? app.title : ""
                    color: "white"; elide: Text.ElideRight; horizontalAlignment: Text.AlignHCenter
                    font.family: "LG Smart UI"; font.pixelSize: 22
                }
            }

            Keys.onPressed: {
                root.touch();
                var cols = 6, n = root.gridApps.length;
                switch (event.key) {
                case Qt.Key_Left:  if (root.gridIndex > 0) { root.gridIndex--; } break;
                case Qt.Key_Right: if (root.gridIndex < n - 1) { root.gridIndex++; } break;
                case Qt.Key_Up:    if (root.gridIndex - cols >= 0) { root.gridIndex -= cols; } break;
                case Qt.Key_Down:  if (root.gridIndex + cols < n) { root.gridIndex += cols; } break;
                case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Select:
                    if (!event.isAutoRepeat && root.gridApps[root.gridIndex]) { root.launchApp(root.gridApps[root.gridIndex].id); }
                    break;
                case Qt.Key_0:
                    if (!event.isAutoRepeat && root.gridApps[root.gridIndex]) { root.openMenu(root.gridApps[root.gridIndex]); }
                    break;
                case Qt.Key_Back: case 0x01200003:
                    root.gridOpen = false; dock.forceActiveFocus(); break;
                default: return;
                }
                event.accepted = true;
            }
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom; anchors.bottomMargin: 14
            text: {
                var a = root.gridApps[root.gridIndex];
                if (!a) { return ""; }
                return "Press OK to open.   Press 0 for options.";
            }
            color: "#b3ffffff"
            font.family: "LG Smart UI"; font.pixelSize: 22
        }
    }

    // ------------------------------------------------------------------
    // App menu (hold OK on a tile)
    // ------------------------------------------------------------------

    Item {
        id: appMenu
        anchors.fill: parent
        // Visible the instant it opens (forceActiveFocus is refused on an
        // invisible item; the opacity Behavior starts at 0), fades on close.
        visible: root.menuOpen || opacity > 0
        opacity: root.menuOpen ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 140 } }

        Rectangle { anchors.fill: parent; color: "#80000000" }

        Rectangle {
            id: menuPanel
            anchors.centerIn: parent
            width: 620; height: menuColumn.height + 64
            radius: 28
            color: "#f2141416"
            border.color: "#40ffffff"; border.width: 2

            Column {
                id: menuColumn
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top; anchors.topMargin: 32
                spacing: 18

                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 22
                    Tile {
                        size: 96; radius: 20
                        app: root.menuApp
                        icon: root.menuApp ? root.iconFor(root.menuApp) : ""
                    }
                    Text {
                        anchors.verticalCenter: parent.verticalCenter
                        text: root.menuApp ? root.menuApp.title : ""
                        color: "white"; elide: Text.ElideRight; width: 380
                        font.family: "LG Smart UI"; font.pixelSize: 34; font.weight: Font.DemiBold
                    }
                }

                Item { width: 1; height: 6 }

                Repeater {
                    model: 2
                    Rectangle {
                        width: 540; height: 76; radius: 18
                        anchors.horizontalCenter: parent.horizontalCenter
                        property bool current: root.menuIndex === index
                        property bool enabled: index === 0 ? root.storeInstalled
                                               : !!(root.menuApp && (root.isDocked(root.menuApp.id) || root.dockIds.length < root.dockMax))
                        color: current ? "#40ffffff" : "#14ffffff"
                        border.color: current ? "#ffffff" : "#26ffffff"; border.width: current ? 3 : 1
                        opacity: enabled ? 1 : 0.4
                        Text {
                            anchors.centerIn: parent
                            text: index === 0 ? (root.storeInstalled ? "Check for Update" : "Check for Update (store unavailable)")
                                  : (root.menuApp && root.isDocked(root.menuApp.id) ? "Remove from Dock"
                                     : (root.dockIds.length >= root.dockMax ? "Add to Dock (dock is full)" : "Add to Dock"))
                            color: "white"
                            font.family: "LG Smart UI"; font.pixelSize: 28; font.weight: Font.DemiBold
                        }
                    }
                }
            }
        }

        Keys.onPressed: {
            root.touch();
            if (!root.menuOpen) { return; }
            switch (event.key) {
            case Qt.Key_Up:   if (root.menuIndex > 0) { root.menuIndex--; } break;
            case Qt.Key_Down: if (root.menuIndex < 1) { root.menuIndex++; } break;
            case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Select:
                if (event.isAutoRepeat) { break; }
                if (root.menuIndex === 0) {
                    if (root.storeInstalled) { var a = root.menuApp; root.closeMenu(); root.launchStore(a); }
                } else {
                    var id = root.menuApp.id;
                    if (root.toggleDock(id)) { root.closeMenu(); }
                }
                break;
            case Qt.Key_Back: case 0x01200003:
                root.closeMenu(); break;
            default: return;
            }
            event.accepted = true;
        }
    }

    // ------------------------------------------------------------------
    // Blackout
    // ------------------------------------------------------------------

    Rectangle {
        anchors.fill: parent
        color: "black"
        visible: opacity > 0
        opacity: root.idleStage === 2 ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 1200 } }
        Text {
            id: dimClock
            x: 160; y: 160
            text: root.clockText(root.now)
            color: "#30ffffff"
            font.family: "LG SlimNumber"; font.weight: Font.Light; font.pixelSize: 96
        }
    }

    // (No Keys handler on the window itself: WebOSWindow is a Window, not an
    // Item, and the attached property does not exist there. The dock and the
    // grid each call touch() first thing in theirs.)
}
