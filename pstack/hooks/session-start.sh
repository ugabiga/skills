#!/bin/sh
set -eu

# Resolve this plugin's root: CLAUDE_PLUGIN_ROOT when the host supplies it,
# otherwise the directory above this script. The hooks files keep the literal
# "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh ..." form so static readers
# can follow them; this fallback only covers direct execution.
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  plugin_root=$CLAUDE_PLUGIN_ROOT
else
  script_dir=$(dirname "$0")
  plugin_root=$(cd -- "$script_dir/.." && pwd -P)
fi
reader=$plugin_root/skills/setup-pstack/scripts/read-sheet.sh

# Each runtime's hooks file passes its own name. Both hosts share one sheet.
case "${1:-}" in
  claude|codex)
    ;;
  *)
    echo "session-start.sh: unknown runtime '${1:-}' (expected claude or codex)" >&2
    exit 2
    ;;
esac

# Single shared sheet. No per-host fallback.
sheet="${XDG_CONFIG_HOME:-$HOME/.config}/pstack/models.md"

# A sheet that cannot be decoded counts as missing, so injection stays on.
if ! { [ -f "$sheet" ] && [ -r "$sheet" ] && normalized=$(sh "$reader" "$sheet"); }; then
  normalized=
fi
if printf '%s\n' "$normalized" | grep -qx 'session hook: off'; then
  exit 0
fi

cat "$plugin_root/hooks/session-start-context.md"
