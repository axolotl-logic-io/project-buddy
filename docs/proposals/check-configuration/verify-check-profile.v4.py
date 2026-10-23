"""Proposal only: validate execution controls before setup or verification effects.

This is not full-source, target, Security, dependency-tree or runtime attestation.
The parent must bind these external bytes and the final committed subject first.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import types
from urllib.parse import urlsplit


PROFILE_SHA256 = "b58406892f276ec38e28b6f6214d6313ddefc0f16b77bea8e787f78fd47b8b60"
HELPER_SHA256 = "7bc718f4299fa8c26f507dc9618fbdafaad5926f22a0def6d42fd71e777a0a5c"


def refuse(message):
    print("pb-current-fast-v4: " + message, file=sys.stderr)
    raise SystemExit(2)


def regular(path):
    for parent in reversed(path.parents):
        if not stat.S_ISDIR(parent.lstat().st_mode):
            refuse("non-directory or symlink ancestry: " + str(parent))
    if not stat.S_ISREG(path.lstat().st_mode):
        refuse("not a regular file: " + str(path))
    return path.read_bytes()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def configuration(name, relative):
    return (
        name in {"package.json", ".npmrc", ".gitignore", "biome.json", "biome.jsonc",
                 "tsconfig.json", "jsconfig.json", "mise.toml", "mise.local.toml"}
        or name.startswith((".mise", "vite.config.", "vitest.config.",
                            "vitest.server.config.", "vitest.workspace.",
                            "next.config.", "playwright.config."))
        or relative.startswith((".config/mise/", ".mise/"))
    )


def validate(phase, stage, require_installed=False):
    if stage not in {"fast", "integration"} or (phase in {"setup", "prepare"} and stage != "fast"):
        refuse("invalid phase/stage")
    root = Path.cwd()
    for parent in (root, *root.parents):
        if not stat.S_ISDIR(parent.lstat().st_mode):
            refuse("symlink or non-directory checkout ancestry")
    here = Path(__file__).absolute().parent
    regular(Path(__file__).absolute())
    if sha256(regular(here / "prepare-next-metadata.v4.py")) != HELPER_SHA256:
        refuse("preparation companion mismatch")
    profile_bytes = regular(here / "check-profile.v4.json")
    if sha256(profile_bytes) != PROFILE_SHA256:
        refuse("profile companion mismatch")
    profile = json.loads(profile_bytes)
    if profile["version"] != "pb-current-fast-v4":
        refuse("wrong profile version")
    # Reject discovered configurations; never load or inspect their contents.
    found = set()
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [name for name in dirs if name not in {".git", "node_modules", ".next"}]
        for name in dirs:
            if (Path(directory) / name).is_symlink():
                refuse("symlink directory in source configuration search")
        for name in files:
            path = Path(directory) / name
            relative = path.relative_to(root).as_posix()
            if path.is_symlink():
                refuse("symlink source file: " + relative)
            if configuration(name, relative):
                found.add(relative)
    if found != set(profile["configurationPaths"]):
        refuse("unexpected or missing repository configuration paths")
    for parent in root.parents:
        for child in parent.iterdir():
            if child.name != ".gitignore" and configuration(child.name, child.name):
                refuse("unexpected configuration ancestry: " + str(child))
    git_env = {"PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
               "GIT_OPTIONAL_LOCKS": "0", "GIT_NO_LAZY_FETCH": "1",
               "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_SYSTEM": "/dev/null",
               "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_NO_REPLACE_OBJECTS": "1"}
    staged = subprocess.check_output(
        ["/usr/bin/git", "-c", "core.fsmonitor=false", "-c", "core.useReplaceRefs=false",
         "ls-files", "--stage", "-z"], cwd=root, env=git_env
    )
    tracked = {}
    for record in staged.split(b"\0"):
        if not record:
            continue
        identity, name = record.split(b"\t", 1)
        mode, blob, index_stage = identity.decode().split()
        if index_stage != "0":
            refuse("unmerged index")
        tracked[os.fsdecode(name)] = (mode, blob)
    for entry in profile["paths"]:
        relative = entry["path"]
        if relative not in tracked or tracked[relative][0] not in {"100644", "100755"}:
            refuse("profile path is not a regular tracked file: " + relative)
        data = regular(root / relative)
        blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if sha256(data) != entry["sha256"] or blob != tracked[relative][1]:
            refuse("profile or index mismatch: " + relative)
    # Stat only: no dotenv contents, including examples, enter this guard.
    for base in (root, root / "apps/web"):
        for name in (".env", ".env.local", ".env.production", ".env.production.local",
                     ".env.development", ".env.development.local", ".env.test", ".env.test.local"):
            path = base / name
            try:
                mode = path.lstat().st_mode
            except FileNotFoundError:
                continue
            if phase == "check" and stage == "integration" and path == root / "apps/web/.env.test":
                if not stat.S_ISREG(mode):
                    refuse("integration environment is not a regular file")
            else:
                refuse("unexpected dotenv candidate: " + str(path.relative_to(root)))
    if stage == "integration":
        path = root / "apps/web/.env.test"
        if not path.exists():
            refuse("integration requires the separately supplied local mock/test environment")
    lock = json.loads(regular(root / "package-lock.json"))
    for package in lock["packages"].values():
        if package.get("link") or not package.get("resolved"):
            continue
        url = urlsplit(package["resolved"])
        if (url.scheme != "https" or url.netloc != "registry.npmjs.org"
                or url.query or url.fragment
                or re.fullmatch(r"sha512-[A-Za-z0-9+/]+={0,2}", package.get("integrity", "")) is None):
            refuse("lock contains a non-public-registry or unreviewed integrity input")
    for key in ("node", "npmCli"):
        toolchain = profile["toolchain"]
        if sha256(regular(Path(toolchain[key + "Path"]))) != toolchain[key + "Sha256"]:
            refuse("pinned local tool mismatch: " + key)
    if require_installed:
        for relative, expected in profile["installedMetadata"].items():
            data = regular(root / relative)
            if sha256(data) != expected["sha256"] or json.loads(data)["version"] != expected["version"]:
                refuse("installed metadata mismatch: " + relative)
        for relative, expected in profile["preparationFiles"].items():
            if sha256(regular(root / relative)) != expected:
                refuse("installed preparation entry mismatch: " + relative)
        # Require the inspected root-hoisted resolution, not a shadow package,
        # alternative TS compiler or local-built SWC/native resolver branch.
        packages = ("next", "typescript", "@types/react", "@types/node", "@types/react-dom",
                    "@next/swc", "@next/swc-darwin-arm64", "@typescript/native-preview")
        for base in (root / "apps/web/node_modules", root / "apps/node_modules",
                     root / "node_modules/next/node_modules",
                     root / "node_modules/next/dist/node_modules",
                     root / "node_modules/next/dist/build/node_modules",
                     root / "node_modules/next/dist/build/swc/node_modules",
                     root / "node_modules/next/dist/cli/node_modules",
                     root / "node_modules/next/dist/lib/node_modules"):
            for package in packages:
                if os.path.lexists(base / package):
                    refuse("shadow preparation dependency: " + str(base / package))
        for package in ("@next/swc", "@typescript/native-preview"):
            if os.path.lexists(root / "node_modules" / package):
                refuse("alternate native/compiler resolution: " + package)
    head = subprocess.check_output(
        ["/usr/bin/git", "-c", "core.fsmonitor=false", "-c", "core.useReplaceRefs=false",
         "rev-parse", "--verify", "HEAD"], cwd=root, env=git_env).decode().strip()
    if re.fullmatch(r"[0-9a-f]{40}", head) is None:
        refuse("unsupported HEAD identity")
    return root, profile, {"head": head, "tracked": tracked, "profileSha256": sha256(profile_bytes),
                           "guardSha256": sha256(regular(Path(__file__).absolute())),
                           "helperSha256": HELPER_SHA256}


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in {"setup", "prepare", "check"}:
        refuse("expected setup|prepare|check and fast|integration")
    phase, stage = sys.argv[1:]
    here = Path(__file__).absolute().parent
    # Load only exact regular reviewed companion bytes. No Python path lookup,
    # site startup, neighboring imports or bytecode cache supplies this helper.
    helper_bytes = regular(here / "prepare-next-metadata.v4.py")
    if sha256(helper_bytes) != HELPER_SHA256:
        refuse("preparation companion mismatch")
    root, profile, context = validate(phase, stage, phase != "setup")
    helper = types.ModuleType("pb_next_metadata_v4")
    exec(compile(helper_bytes, str(here / "prepare-next-metadata.v4.py"), "exec"), helper.__dict__)
    def revalidate(installed):
        return validate(phase, stage, installed)[2]
    helper.metadata(root, profile, phase, revalidate, regular, refuse)
    print("PB compatibility=pb-current-fast-v4 phase=" + phase + " stage=" + stage)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as error:
        refuse("profile validation failed (" + type(error).__name__ + ")")
