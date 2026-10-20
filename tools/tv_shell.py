#!/usr/bin/env python3
"""
Run a command on the TV over Homebrew Channel's telnet port and print the output.

Homebrew Channel leaves port 23 on an unauthenticated root shell, which is a far
faster loop than a full deploy when all you want is to look at something. Deploys
still go through wolfdenOS.py -- this is for reading, surveying and one-off checks.

    python3 tools/tv_shell.py 'mount | grep /usr'
    python3 tools/tv_shell.py -f survey.sh
"""
import argparse
import base64
import socket
import sys
import time
import uuid

DEFAULT_HOST = "192.168.97.141"
IAC = 255

# Input lines longer than this come back truncated over the Homebrew telnet tty.
CHUNK = 180


def strip_telnet(data):
    """Drop IAC negotiation sequences; we never accept an option."""
    out, i = bytearray(), 0
    while i < len(data):
        if data[i] == IAC:
            if i + 1 < len(data) and data[i + 1] in (250,):   # SB ... SE
                end = data.find(b"\xff\xf0", i)
                i = len(data) if end == -1 else end + 2
                continue
            i += 3 if i + 2 < len(data) else len(data)
            continue
        out.append(data[i])
        i += 1
    return bytes(out)


def run(host, port, script, timeout):
    # A unique sentinel is the only reliable end-of-output marker: busybox's
    # prompt string also appears in command output often enough to matter.
    tag = uuid.uuid4().hex[:12]
    start, done = "__WOLFDEN_BEGIN_%s__" % tag, "__WOLFDEN_DONE_%s__" % tag
    sock = socket.create_connection((host, port), timeout)
    sock.settimeout(1.0)
    time.sleep(0.6)
    try:
        sock.recv(65536)
    except socket.timeout:
        pass

    # The script is sent base64-encoded, in short lines, and assembled into a
    # file on the TV before it runs. Two reasons: the shell echoes back whatever
    # is typed, so a multi-line script's echo is indistinguishable from its
    # output, and this tty mangles any input line past a couple of hundred
    # characters -- a long single line came back truncated and never ran.
    payload = "echo %s\n%s\necho %s\n" % (start, script, done)
    blob = base64.b64encode(payload.encode()).decode()

    sock.sendall(b"rm -f /tmp/wolfden_cmd.b64\n")
    for i in range(0, len(blob), CHUNK):
        sock.sendall(("printf %%s %s >> /tmp/wolfden_cmd.b64\n"
                      % blob[i:i + CHUNK]).encode())
        time.sleep(0.05)
    # Decoded to a file and run with stdin closed. Piping the script straight
    # into sh leaves stdin attached to the spent pipe, and luna-send exits
    # immediately with status 0 and no reply when it inherits that.
    sock.sendall(b"base64 -d /tmp/wolfden_cmd.b64 > /tmp/wolfden_cmd.sh"
                 b" && sh /tmp/wolfden_cmd.sh < /dev/null\n")

    buf, deadline = bytearray(), time.time() + timeout
    while time.time() < deadline:
        try:
            chunk = sock.recv(65536)
        except socket.timeout:
            continue
        if not chunk:
            break
        buf += chunk
        if done.encode() in strip_telnet(bytes(buf)):
            break
    sock.close()

    text = strip_telnet(bytes(buf)).decode("utf-8", "replace")
    # The shell echoes back everything typed, wrapped at the terminal width, so
    # the only dependable cut points are the two sentinels. The start sentinel
    # appears twice: once echoed, once as output -- take the text after the last.
    if done in text:
        text = text.rsplit(done, 1)[0]
    if start in text:
        text = text.rsplit(start, 1)[1]
    return text.replace("\r\n", "\n").strip("\n")


def pull(host, remote_path, out_path, timeout):
    """
    Copy a file off the TV by having it POST to a one-shot server here.

    Base64 over the telnet session works but crawls once a file is more than a
    few kilobytes, and a screenshot is a couple of hundred.
    """
    import http.server
    import threading

    received = {}

    class Receiver(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            received["body"] = self.rfile.read(length)
            self.send_response(200)
            self.end_headers()

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("0.0.0.0", 0), Receiver)
    port = server.server_address[1]
    threading.Thread(target=server.handle_request, daemon=True).start()

    sock = socket.create_connection((host, 23), 5)
    local_ip = sock.getsockname()[0]
    sock.close()

    run(host, 23, "curl -s -m %d --data-binary @%s http://%s:%d/"
        % (int(timeout), remote_path, local_ip, port), timeout)

    body = received.get("body")
    if not body:
        print("error: the TV sent nothing back", file=sys.stderr)
        return 1
    with open(out_path, "wb") as fh:
        fh.write(body)
    print("%s -> %s (%d bytes)" % (remote_path, out_path, len(body)))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("command", nargs="?", help="shell command to run")
    parser.add_argument("-f", "--file", help="read the script from a file instead")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=23)
    parser.add_argument("--timeout", type=float, default=45.0)
    parser.add_argument("--pull", metavar="REMOTE",
                        help="copy a file off the TV instead of running a command")
    parser.add_argument("-o", "--out", help="where --pull writes")
    args = parser.parse_args(argv)

    if args.pull:
        if not args.out:
            parser.error("--pull needs -o/--out")
        return pull(args.host, args.pull, args.out, args.timeout)

    if args.file:
        with open(args.file, "r", encoding="utf-8") as fh:
            script = fh.read()
    elif args.command:
        script = args.command
    else:
        script = sys.stdin.read()

    try:
        print(run(args.host, args.port, script, args.timeout))
    except OSError as exc:
        print("error: cannot reach %s:%d (%s)" % (args.host, args.port, exc),
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
