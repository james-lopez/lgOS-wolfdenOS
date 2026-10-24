// 2.12, not 2.4: the import version gates the API, and Gradient.orientation
// (the horizontal scrim behind the clock) is a 2.12 property. The TV's Qt is
// 5.12, so this is the newest version it has.
import QtQuick 2.12
import QtMultimedia 5.12
import Eos.Window 0.1
import WebOSServices 1.0

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

    // The dock starts with these four; everything else installed lives in
    // the All Apps grid.
    readonly property var dockIds: [
        "youtube.leanback.v4",
        "com.disney.disneyplus-prod",
        "hulu",
        "amazon"
    ]
    // Never shown anywhere: our own apps and leftovers from earlier passes.
    readonly property var hiddenIds: [
        "tld.wolfdenos.qmlhome", "tld.wolfdenos.qmltest", "tld.wolfdenos.home",
        "tld.wolfdenos.overlay", "tld.slopbro.g3mod"
    ]

    readonly property int idlePauseMs: 15 * 60 * 1000
    readonly property int idleBlackMs: 20 * 60 * 1000
    readonly property int idleDriftMs: 30 * 1000

    readonly property string appDir: "/media/developer/apps/usr/palm/applications/tld.wolfdenos.qmlhome/"
    readonly property int tileSize: 172
    readonly property int tileGap: 26

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
            if (res.launchPoints !== undefined || res.change !== undefined) { root.ingestLaunchPoints(res); }
        }
    }

    function subscribeLaunchPoints() {
        luna.method = "listLaunchPoints";
        luna.callService({ subscribe: true });
    }

    function ingestLaunchPoints(res) {
        if (res.launchPoints === undefined) {
            // An incremental change (added/removed/updated). Re-request the
            // whole list rather than mirroring SAM's diff protocol.
            subscribeLaunchPoints();
            return;
        }
        console.warn("wolfdenOS: " + res.launchPoints.length + " launch points from SAM");
        var list = [];
        for (var i = 0; i < res.launchPoints.length; i++) {
            var lp = res.launchPoints[i];
            if (hiddenIds.indexOf(lp.id) !== -1) { continue; }
            if (lp.id.indexOf("tld.wolfdenos.") === 0) { continue; }
            list.push(lp);
        }
        allApps = list;
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
        var rest = allApps.filter(function (lp) { return dockIds.indexOf(lp.id) === -1; });
        rest.sort(function (a, b) { return (a.title || "").localeCompare(b.title || ""); });
        dockApps = dock;
        gridApps = rest;
        if (dockIndex > dockApps.length) { dockIndex = dockApps.length; }
    }

    function iconFor(lp) {
        var p = lp.largeIcon || lp.mediumLargeIcon || lp.icon || "";
        if (p.indexOf("/") === 0) { return "file://" + p; }
        return p;
    }

    function launchApp(id) {
        luna.method = "launch";
        luna.callService({ id: id, params: {} });
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

    // Pause while another app is in front: nothing to see, and a looping
    // decode in the background is just heat.
    Connections {
        target: Qt.application
        onActiveChanged: {
            if (Qt.application.active) { root.touch(); }
            else { bgVideo.pause(); }
        }
    }

    Component.onCompleted: {
        // Assigned, not setWindowProperty(): that one is not invokable from
        // QML. This is how LG's own QML apps do it.
        root.windowProperties._WEBOS_ACCESS_POLICY_KEYS_BACK = true;
        root.windowProperties._WEBOS_ACCESS_POLICY_KEYS_EXIT = true;
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
        anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom
        height: 420
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#00050506" }
            GradientStop { position: 1.0; color: "#d9050506" }
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
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom; anchors.bottomMargin: 96
        width: dockRow.width + 64
        height: root.tileSize + 64

        Rectangle {
            anchors.fill: parent
            radius: 38
            color: "#66101012"
            border.color: "#40ffffff"; border.width: 2
        }

        Row {
            id: dockRow
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
                    anchors.centerIn: parent; columns: 2; spacing: 14
                    Repeater { model: 4; Rectangle { width: 30; height: 30; radius: 8; color: "white" } }
                }
            }
        }

        Keys.onPressed: {
            root.touch();
            switch (event.key) {
            case Qt.Key_Left:
                if (root.dockIndex > 0) { root.dockIndex--; }
                event.accepted = true; break;
            case Qt.Key_Right:
                if (root.dockIndex < root.dockApps.length) { root.dockIndex++; }
                event.accepted = true; break;
            case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Select:
                if (root.dockIndex === root.dockApps.length) { root.gridOpen = true; grid.forceActiveFocus(); }
                else if (root.dockApps[root.dockIndex]) { root.launchApp(root.dockApps[root.dockIndex].id); }
                event.accepted = true; break;
            case Qt.Key_Back: case 0x01200003:
                // The home screen is the floor: BACK here goes nowhere. Quitting
                // instead hands the screen to SAM's last-app fallback, which is
                // LG's Home regardless of defaultApps.home (tested).
                event.accepted = true; break;
            }
        }
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom; anchors.bottomMargin: 40
        text: root.gridOpen ? ""
              : (root.dockIndex === root.dockApps.length ? "All Apps"
                 : (root.dockApps[root.dockIndex] ? root.dockApps[root.dockIndex].title : ""))
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
                property bool focused: root.gridOpen && root.gridIndex === index
                Rectangle {
                    anchors.fill: parent; anchors.margins: 12; radius: 22
                    color: focused ? "#40ffffff" : "#14ffffff"
                    border.color: focused ? "#ffffff" : "#26ffffff"; border.width: focused ? 3 : 1
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
                    if (root.gridApps[root.gridIndex]) { root.launchApp(root.gridApps[root.gridIndex].id); }
                    break;
                case Qt.Key_Back: case 0x01200003:
                    root.gridOpen = false; dock.forceActiveFocus(); break;
                default: return;
                }
                event.accepted = true;
            }
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
