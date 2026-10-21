import QtQuick 2.12
import QtGraphicalEffects 1.0

// One dock tile: the app's own artwork edge to edge, rounded, with a lift and
// a bright ring when focused. Its own file because the TV's Qt is 5.12, which
// has no inline components.
//
// The rounding goes through OpacityMask: Image has no radius, and clip: true
// clips to the rectangle. QtGraphicalEffects ships on the TV
// (/usr/lib/qml/QtGraphicalEffects).
Item {
    id: tile
    property var app
    property bool focused: false
    property int size: 172
    property int radius: 30
    property url icon

    width: size
    height: size
    scale: focused ? 1.12 : 1.0
    Behavior on scale { NumberAnimation { duration: 140; easing.type: Easing.OutCubic } }

    Image {
        id: art
        anchors.fill: parent
        source: tile.icon
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        smooth: true
        visible: false
    }
    Rectangle {
        id: shape
        anchors.fill: parent
        radius: tile.radius
        visible: false
    }
    OpacityMask {
        anchors.fill: parent
        source: art
        maskSource: shape
    }
    Rectangle {
        anchors.fill: parent
        radius: tile.radius
        color: "transparent"
        border.color: tile.focused ? "#ffffff" : "#40000000"
        border.width: tile.focused ? 4 : 1
    }
}
