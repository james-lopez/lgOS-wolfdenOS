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

# Luna endpoints to neutralise. Each is rewritten to a same-length URI under a
# service that does not exist, so the call fails instead of fetching an ad.
# Padded with 'x' rather than spaces: these are URIs, not display text.
DEAD_ENDPOINT_BASE = b"luna://com.wolfden.disabled/"
DEAD_ENDPOINTS = (
    b"luna://com.webos.service.admanager/requestBannerInfoWithoutContextIndex",
    b"luna://com.webos.service.admanager/sendImpressionTracker",
    b"luna://com.webos.service.admanager/handleClickBanner",
    b"luna://com.webos.service.admanager/launchCMPApp",
    b"luna://com.webos.service.admanager/requestAssetClickInfo",
)


def dead_uri(original):
    out = DEAD_ENDPOINT_BASE + original.rsplit(b"/", 1)[-1]
    if len(out) > len(original):
        return out[:len(original)]
    return out + b"x" * (len(original) - len(out))


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


def real_string_offsets(data, needle):
    """
    Offsets where `needle` is a standalone Dart string, not log text.

    The same URI appears inside log messages, where the preceding four bytes
    are ASCII rather than a Smi length. Only offsets whose header matches the
    string's own length are real objects the code actually calls.
    """
    hits, i = [], data.find(needle)
    while i != -1:
        if i >= 4 and int.from_bytes(data[i - 4:i], "little") == smi(len(needle)):
            hits.append(i)
        i = data.find(needle, i + 1)
    return hits


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
    jobs = [(o, r, True) for o, r in REPLACEMENTS.items()]
    jobs += [(e, dead_uri(e), False) for e in DEAD_ENDPOINTS]

    for original, replacement, centre in jobs:
        real = real_string_offsets(out, original)
        if not real:
            print("  skip (no standalone string object): %r"
                  % original[:46].decode("utf-8", "replace"), file=sys.stderr)
            continue
        if len(real) > 1:
            print("  skip (%d standalone copies, ambiguous): %r"
                  % (len(real), original[:46].decode("utf-8", "replace")),
                  file=sys.stderr)
            continue

        offset = real[0]
        padded = (centre_pad(replacement, len(original)) if centre
                  else replacement)
        if len(padded) != len(original):
            print("  skip (replacement length %d != %d): %r"
                  % (len(padded), len(original), original[:46]), file=sys.stderr)
            continue

        out[offset:offset + len(original)] = padded
        applied.append((offset, original, replacement, len(original)))
        if verbose:
            shown = padded.decode("utf-8", "replace").strip() or "<blank>"
            print("  @%-9d %-3d bytes  %-46s -> %s"
                  % (offset, len(original),
                     original[:46].decode("utf-8", "replace"), shown[:46]))

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
