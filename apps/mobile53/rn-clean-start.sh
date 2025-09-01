#!/usr/bin/env bash
set -euo pipefail

# rn-clean-start.sh
# One-shot cleaner/initializer for React Native (Expo or Bare).
# macOS only. No sudo. Keeps everything in user space.

### ---- helpers ----
die(){ echo "❌ $*" >&2; exit 1; }
ok(){ echo "✅ $*"; }
info(){ echo "▶ $*"; }

cmd_exists(){ command -v "$1" >/dev/null 2>&1; }

load_nvm(){
  if [ -z "${NVM_DIR:-}" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    ok "Loaded nvm from $NVM_DIR"
  fi
}

ensure_node(){
  if cmd_exists nvm; then
    info "Using nvm to ensure Node..."
    nvm install --lts >/dev/null
    nvm use --lts >/dev/null
    ok "Node $(node -v), npm $(npm -v)"
  else
    info "nvm not found; using system Node ($(node -v || true))."
    cmd_exists node || die "Node not installed. Install nvm or Node LTS first."
  fi
}

disable_corepack(){
  if cmd_exists corepack; then
    info "Disabling Corepack (yarn/pnpm shims)..."
    corepack disable || true
    ok "Corepack disabled"
  fi
}

clean_locks_in(){
  local dir="$1"
  info "Cleaning locks in $dir"
  rm -f "$dir/yarn.lock" "$dir/pnpm-lock.yaml" || true
  ok "Removed yarn.lock / pnpm-lock.yaml (if any)"
}

npm_health(){
  npm config set registry https://registry.npmjs.org/ >/dev/null
  npm config set ignore-scripts false >/dev/null
  npm ping >/dev/null || die "npm cannot reach registry. Check VPN/proxy/.npmrc."
  ok "npm registry reachable"
}

pods_if_needed(){
  if [ -d "ios" ]; then
    if cmd_exists pod; then
      info "Running CocoaPods install..."
      (cd ios && pod install)
      ok "CocoaPods done"
    else
      info "CocoaPods not found. For iOS builds: 'sudo gem install cocoapods'"
    fi
  fi
}

### ---- actions ----
init_expo(){
  local target="$1"
  local name="$2"
  info "Scaffolding Expo app at $target/$name"
  mkdir -p "$target"
  (cd "$target" && npx create-expo-app@latest "$name" --yes)
  clean_locks_in "$target/$name"
  (cd "$target/$name" && npm install)
  npm_health
  info "Adding navigation deps (Expo will pin compatible versions)..."
  (cd "$target/$name" && npx expo install \
    @react-navigation/native \
    @react-navigation/native-stack \
    react-native-screens \
    react-native-safe-area-context \
    react-native-gesture-handler)
  ok "Expo app ready at $target/$name (run: cd $target/$name && npx expo start)"
}

init_bare(){
  local target="$1"
  local name="$2"
  info "Scaffolding Bare RN app at $target/$name"
  mkdir -p "$target"
  (cd "$target" && npx react-native@latest init "$name" --version latest)
  clean_locks_in "$target/$name"
  (cd "$target/$name" && npm install)
  npm_health
  info "Adding navigation + required deps..."
  (cd "$target/$name" && npm i -E \
    @react-navigation/native \
    @react-navigation/native-stack \
    react-native-screens \
    react-native-safe-area-context@4.11.5 \
    react-native-gesture-handler)
  (cd "$target/$name" && pods_if_needed)
  ok "Bare RN app ready at $target/$name (run: cd $target/$name && npx react-native run-ios|run-android)"
}

reset_existing_ui(){
  local dir="$1"
  [ -d "$dir" ] || die "Directory not found: $dir"
  info "Resetting existing UI project at $dir"

  disable_corepack
  clean_locks_in "$dir"

  info "Removing node_modules & iOS pods..."
  rm -rf "$dir/node_modules" "$dir/package-lock.json" "$dir/ios/Pods" "$dir/ios/Podfile.lock" 2>/dev/null || true

  (cd "$dir" && npm cache verify >/dev/null)
  npm_health

  info "Base install..."
  (cd "$dir" && npm install)

  # Ensure the usual RN navigation deps are present
  info "Reinstalling RN navigation deps cleanly..."
  (cd "$dir" && npm i -E \
    @react-navigation/native \
    @react-navigation/native-stack \
    react-native-screens \
    react-native-safe-area-context@4.11.5 \
    react-native-gesture-handler)

  (cd "$dir" && pods_if_needed)

  ok "Reset complete. Try building from: $dir"
}

### ---- argument parsing ----
usage(){
cat <<EOF
Usage:
  $0 --expo  --target ~/cleanstart --name MyApp
  $0 --bare  --target ~/cleanstart --name MyApp
  $0 --reset-existing --path /path/to/monorepo/apps/mobile

Notes:
- Use --expo for a fresh Expo app (easiest path).
- Use --bare for a fresh bare React Native app (you manage native builds).
- Use --reset-existing to clean/reset an existing UI project inside a monorepo.
EOF
}

MODE=""
TARGET="$HOME/cleanstart"
NAME="MyApp"
EXISTING_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --expo) MODE="expo"; shift ;;
    --bare) MODE="bare"; shift ;;
    --reset-existing) MODE="reset"; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --path) EXISTING_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

[ -n "$MODE" ] || { usage; exit 1; }

# prep
load_nvm
ensure_node
disable_corepack

case "$MODE" in
  expo)  init_expo "$TARGET" "$NAME" ;;
  bare)  init_bare "$TARGET" "$NAME" ;;
  reset)
    [ -n "$EXISTING_PATH" ] || die "--path is required for --reset-existing"
    reset_existing_ui "$EXISTING_PATH"
    ;;
  *) die "Unknown mode" ;;
esac
