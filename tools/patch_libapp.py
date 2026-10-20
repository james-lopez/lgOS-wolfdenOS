#!/usr/bin/env python3
"""
Patch the strings LG compiles into com.webos.app.home's Flutter library.

The Home screen's banner text and its button label are not in the i18n JSON --
they are inside lib/libapp.so, in the Dart AOT snapshot. Each one is laid out
as:

    [4-byte LE length][ASCII bytes][padding]

where the length field is a Dart Smi, i.e. the character count shifted left by
one (62 chars -> 0x7c, 16 -> 0x20, 34 -> 0x44; all three verified against the
real library).

So the replacement must be EXACTLY the same number of bytes and the length
field must not change. Writing a shorter string and shrinking the length would
move every object after it and desync the whole snapshot. Instead the text is
padded with spaces, split evenly either side so centred text stays centred.

    python3 tools/patch_libapp.py uploads/libapp.so -o wwwroot/libapp.so
"""
import argparse
import os
import sys

# original (exact bytes in the library) -> what to show instead
REPLACEMENTS = {
    b"Enjoy the device's smart functions by connecting to a network.": b"wolfdenOS",
    b"Start a new experience with webOS.": b"wolfdenOS",
    # Blanked rather than removed: the button is part of the compiled layout.
    b"Network Settings": b"",
}


def smi(value):
    """Dart small-integer encoding: the value shifted left by one."""
    return value << 1


def centre_pad(text, width):
    if len(text) > width:
        raise ValueError("replacement %r longer than the %d bytes available"
                         % (text, width))
    spare = width - len(text)
    left = spare // 2
    return b" " * left + text + b" " * (spare - left)


def patch(data, verbose=True):
    out = bytearray(data)
    applied = []
    for original, replacement in REPLACEMENTS.items():
        offset = out.find(original)
        if offset == -1:
            print("  skip (not found): %r" % original[:42], file=sys.stderr)
            continue
        if out.find(original, offset + 1) != -1:
            print("  skip (ambiguous, >1 match): %r" % original[:42], file=sys.stderr)
            continue

        # Confirm the length field really is this string's Smi before touching
        # anything; if it is not, the layout is not what we think it is.
        header = int.from_bytes(out[offset - 4:offset], "little")
        if header != smi(len(original)):
            print("  skip (length field %d != expected %d): %r"
                  % (header, smi(len(original)), original[:42]), file=sys.stderr)
            continue

        out[offset:offset + len(original)] = centre_pad(replacement, len(original))
        applied.append((offset, original, replacement, len(original)))
        if verbose:
            shown = replacement.decode() if replacement else "<blank>"
            print("  @%-9d %-2d bytes  %-34s -> %s"
                  % (offset, len(original), original[:34].decode(), shown))

    if len(out) != len(data):
        raise RuntimeError("patched size changed; refusing to continue")
    return bytes(out), applied


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("source", help="libapp.so pulled off the TV")
    parser.add_argument("-o", "--out", required=True)
    args = parser.parse_args(argv)

    with open(args.source, "rb") as fh:
        data = fh.read()
    print("source: %s (%d bytes)" % (args.source, len(data)))

    patched, applied = patch(data)
    if not applied:
        print("error: nothing was patched", file=sys.stderr)
        return 1

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "wb") as fh:
        fh.write(patched)

    changed = sum(1 for _ in applied)
    print("wrote %s (%d bytes, %d strings patched, size identical)"
          % (args.out, len(patched), changed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
