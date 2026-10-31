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

# Each runtime's hooks file passes its own name.
case "${1:-}" in
  claude)
    home_sheet="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/t3-pstack-models.md"
    ;;
  codex)
    home_sheet="${CODEX_HOME:-$HOME/.codex}/t3-pstack-models.md"
    ;;
  *)
    echo "session-start.sh: unknown runtime '${1:-}' (expected claude or codex)" >&2
    exit 2
    ;;
esac

# One sheet per machine. Until the installer moves an older home's sheet
# there, that home's sheet still counts.
sheet="${XDG_CONFIG_HOME:-$HOME/.config}/t3-pstack/models.md"
[ -f "$sheet" ] || sheet=$home_sheet

# A sheet that cannot be decoded counts as missing, so injection stays on.
if ! { [ -f "$sheet" ] && [ -r "$sheet" ] && normalized=$(sh "$reader" "$sheet"); }; then
  normalized=
fi
if printf '%s\n' "$normalized" | grep -qx 'session hook: off'; then
  exit 0
fi

cat "$plugin_root/hooks/session-start-context.md"
