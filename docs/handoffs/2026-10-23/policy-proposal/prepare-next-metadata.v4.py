"""Exact local typegen preparation; loaded only from guard-verified bytes.

The sidecar is generated build metadata, not a native receipt, source authority
or Security proof. Callers must quiesce writers; lstat/hash checks are not locks.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile


VERSION = "pb-next-metadata-v4"
ROUTING_ROOTS = ("app", "pages", "src/app", "src/pages")
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}
APP_ENTRIES = {"page", "route", "layout", "default", "not-found"}
METADATA_NAME = r"(?:favicon|icon\d*|apple-icon\d*|opengraph-image\d*|twitter-image\d*|sitemap|robots|manifest)"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def present(path):
    # lexists/lstat, never follows a generated-file or dotenv symlink.
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False


def check_ancestry(root, path, refuse):
    for parent in path.parents:
        if parent == root:
            break
        if present(parent) and not stat.S_ISDIR(parent.lstat().st_mode):
            refuse("non-directory or symlink metadata ancestry: " + str(parent))


def output_hashes(root, paths, regular, refuse):
    result = {}
    for relative in paths:
        data = regular(root / relative)
        if not data:
            refuse("empty generated output: " + relative)
        result[relative] = digest(data)
    return result


def routing_inputs(root, tracked, regular, refuse):
    # Record discovery names and only Next route/metadata entry contents, not
    # an invented all-production/all-tests compatibility freeze.
    import re
    inventory = []
    entries = {}
    web = root / "apps/web"
    for relative_root in ROUTING_ROOTS:
        directory = web / relative_root
        if not present(directory):
            inventory.append(relative_root + ":absent")
            continue
        if not stat.S_ISDIR(directory.lstat().st_mode):
            refuse("non-directory routing root")
        inventory.append(relative_root + "/")
        for current, dirs, files in os.walk(directory, followlinks=False):
            for name in sorted(dirs + files):
                path = Path(current) / name
                mode = path.lstat().st_mode
                relative = path.relative_to(root).as_posix()
                if stat.S_ISDIR(mode):
                    inventory.append(relative + "/")
                elif stat.S_ISREG(mode):
                    inventory.append(relative)
                    stem, suffix = path.stem, path.suffix
                    is_page = relative_root.endswith("pages") and suffix in EXTENSIONS
                    is_app = stem in APP_ENTRIES and suffix in EXTENSIONS
                    is_metadata = re.fullmatch(METADATA_NAME, stem) is not None
                    if is_page or is_app or is_metadata:
                        data = regular(path)
                        blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
                        if tracked.get(relative) not in {("100644", blob), ("100755", blob)}:
                            refuse("generation input is not index-equal: " + relative)
                        entries[relative] = digest(data)
                else:
                    refuse("nonregular routing input: " + relative)
    return {"inventory": sorted(inventory), "entrySha256": entries}


def source_inputs(root, profile, revalidate, regular, refuse):
    context = revalidate(True)
    return {
        "version": VERSION,
        "kind": profile["metadata"]["kind"],
        "checkout": str(root),
        "head": context["head"],
        "profileSha256": context["profileSha256"],
        "guardSha256": context["guardSha256"],
        "helperSha256": context["helperSha256"],
        "executionVectorSha256": digest(json.dumps(profile["paths"], sort_keys=True).encode()),
        "tools": profile["toolchain"],
        "installedMetadata": profile["installedMetadata"],
        "preparationFiles": profile["preparationFiles"],
        "routing": routing_inputs(root, context["tracked"], regular, refuse),
    }


def inspect_outputs(root, profile, regular, refuse):
    metadata = profile["metadata"]
    outputs = metadata["primary"] + metadata["ancillary"]
    sidecar = root / metadata["provenance"]
    attempt = root / metadata["attempt"]
    for relative in outputs + [metadata["provenance"], metadata["attempt"]]:
        check_ancestry(root, root / relative, refuse)
    types = root / "apps/web/.next/types"
    if present(types):
        if not stat.S_ISDIR(types.lstat().st_mode):
            refuse("non-directory generated types")
        expected = {Path(path).name for path in outputs if "/.next/types/" in path}
        if any(child.name not in expected or not stat.S_ISREG(child.lstat().st_mode)
               for child in types.iterdir()):
            refuse("unknown generated types; inspection required")
    flags = [present(root / path) for path in outputs]
    if not any(flags) and not present(sidecar) and not present(attempt):
        return "absent"
    if not all(flags) or not present(sidecar) or not present(attempt):
        refuse("partial or unknown generated metadata; no repair permitted")
    regular(sidecar)
    return "complete"


def metadata(root, profile, phase, revalidate, regular, refuse):
    state = inspect_outputs(root, profile, regular, refuse)
    outputs = profile["metadata"]["primary"] + profile["metadata"]["ancillary"]
    sidecar = root / profile["metadata"]["provenance"]
    attempt = root / profile["metadata"]["attempt"]
    if state == "complete":
        inputs = source_inputs(root, profile, revalidate, regular, refuse)
        attempt_bytes = regular(attempt)
        if len(attempt_bytes) > 131072 or json.loads(attempt_bytes) != {"inputs": inputs}:
            refuse("unknown generation-attempt metadata")
        expected = {"inputs": inputs, "outputs": output_hashes(root, outputs, regular, refuse),
                    "attemptSha256": digest(attempt_bytes)}
        data = regular(sidecar)
        if len(data) > 131072 or json.loads(data) != expected:
            refuse("stale or mismatched generation provenance; no regeneration permitted")
        print("PB metadata=compatible-prior-generation (not regenerated)")
        return
    if phase == "check":
        refuse("generated metadata absent; verification never generates")
    if phase == "setup":
        # Pre-npm proof permits a truly fresh checkout, not partial/stale output.
        print("PB metadata=all-absent; preparation required after locked dependencies")
        return
    if phase != "prepare":
        refuse("invalid metadata phase")
    inputs = source_inputs(root, profile, revalidate, regular, refuse)
    if os.uname().sysname != "Darwin" or os.uname().machine != "arm64":
        refuse("unsupported installed native platform")
    # Repeat proof immediately before effects; neither proof is an OS sandbox.
    if inspect_outputs(root, profile, regular, refuse) != "absent":
        refuse("metadata changed before generation")
    isolation = Path(tempfile.mkdtemp(prefix="pb-typegen-v4.", dir="/private/tmp"))
    isolation.chmod(0o700)
    for name in ("npm-userconfig", "npm-globalconfig"):
        with (isolation / name).open("xb"):
            pass
    env = {
        "PATH": "/Users/axolotl-logic/.local/share/mise/installs/node/24.21.0/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "HOME": str(isolation), "TMPDIR": "/private/tmp",
        "NPM_CONFIG_USERCONFIG": str(isolation / "npm-userconfig"),
        "NPM_CONFIG_GLOBALCONFIG": str(isolation / "npm-globalconfig"),
        "NPM_CONFIG_CACHE": str(isolation / "npm-cache"),
        "NPM_CONFIG_OFFLINE": "true", "NPM_CONFIG_IGNORE_SCRIPTS": "true",
        "NPM_CONFIG_AUDIT": "false", "NPM_CONFIG_FUND": "false",
        "NPM_CONFIG_UPDATE_NOTIFIER": "false", "NEXT_TELEMETRY_DISABLED": "1",
        "NEXT_DISABLE_SWC_WASM": "1", "NODE_ENV": "production", "CI": "1",
        "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "1",
    }
    # This immutable build marker also holds a failed zero-output invocation.
    # It is not a lease/receipt and never enters any native state directory.
    attempt.parent.mkdir(exist_ok=True)
    attempt_bytes = (json.dumps({"inputs": inputs}, sort_keys=True, indent=2) + "\n").encode()
    with attempt.open("xb") as stream:
        stream.write(attempt_bytes)
    if source_inputs(root, profile, revalidate, regular, refuse) != inputs:
        refuse("inputs changed before native preload; leave build marker for inspection")
    print("PB metadata=conditional-local-typegen isolation=" + str(isolation), flush=True)
    # Node preloads the exact native file BEFORE evaluating the Next CLI. An
    # absent/unloadable native module terminates Node before Next can fall back.
    subprocess.run([
        profile["toolchain"]["nodePath"], "--require",
        str(root / "node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node"),
        str(root / "node_modules/next/dist/bin/next"), "typegen",
    ], cwd=root / "apps/web", env=env, check=True)
    after = source_inputs(root, profile, revalidate, regular, refuse)
    if after != inputs:
        refuse("HEAD or generation inputs changed during typegen; leave outputs for inspection")
    if present(sidecar):
        refuse("unexpected generation sidecar; never overwrite")
    # Validate all actual outputs, including Next's root-params/cache-life files.
    hashes = output_hashes(root, outputs, regular, refuse)
    inspect_outputs_without_sidecar = [child.name for child in (root / "apps/web/.next/types").iterdir()]
    if set(inspect_outputs_without_sidecar) != {Path(path).name for path in outputs if "/.next/types/" in path}:
        refuse("unexpected post-generation types; leave outputs for inspection")
    with sidecar.open("xb") as stream:
        stream.write((json.dumps({"inputs": inputs, "outputs": hashes,
                                  "attemptSha256": digest(attempt_bytes)}, sort_keys=True, indent=2) + "\n").encode())
    print("PB metadata=generated-and-bound; build metadata only, not a gate pass")
