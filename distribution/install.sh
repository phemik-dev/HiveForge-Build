#!/bin/sh
set -eu

repository=${HIVEFORGE_REPOSITORY:-phemik-dev/HiveForge-Build}
tag=${HIVEFORGE_RELEASE_TAG:-latest}
os=$(uname -s)
arch=$(uname -m)
case "$os:$arch" in
  Linux:x86_64) target=linux-x64 ;;
  Linux:aarch64|Linux:arm64) target=linux-arm64 ;;
  Darwin:arm64) target=macos-arm64 ;;
  *) echo "HiveForge does not yet provide a bundle for $os $arch" >&2; exit 1 ;;
esac
if [ -n "${HIVEFORGE_DOWNLOAD_BASE:-}" ]; then
  base=${HIVEFORGE_DOWNLOAD_BASE%/}
elif [ "$tag" = latest ]; then
  base="https://github.com/$repository/releases/latest/download"
else
  base="https://github.com/$repository/releases/download/$tag"
fi
archive_name="hiveforge-harness-$target.tar.gz"
temp=$(mktemp -d "${TMPDIR:-/tmp}/hiveforge-install.XXXXXX")
trap 'rm -rf "$temp"' EXIT INT TERM

curl -fsSL "$base/$archive_name" -o "$temp/$archive_name"
curl -fsSL "$base/$archive_name.sha256" -o "$temp/$archive_name.sha256"
(
  cd "$temp"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$archive_name.sha256"
  else
    shasum -a 256 -c "$archive_name.sha256"
  fi
)
mkdir "$temp/unpacked"
tar -xzf "$temp/$archive_name" -C "$temp/unpacked"
version=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$temp/unpacked/hiveforge/manifest.json" | head -1)
[ -n "$version" ] || { echo 'HiveForge archive manifest has no version' >&2; exit 1; }

root=${HIVEFORGE_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/hiveforge}
version_dir="$root/$version"
incoming="$version_dir.incoming"
mkdir -p "$root" "$HOME/.local/bin"
rm -rf "$incoming"
mv "$temp/unpacked/hiveforge" "$incoming"
rm -rf "$version_dir"
mv "$incoming" "$version_dir"
if [ -z "${HIVEFORGE_SKIP_PATH_UPDATE:-}" ]; then
  ln -sfn "$version_dir/dsh" "$HOME/.local/bin/dsh"
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) echo "Add $HOME/.local/bin to PATH, then run: dsh web" ;;
  esac
fi
"$version_dir/dsh" --version
echo 'HiveForge installed. Run: dsh web'
