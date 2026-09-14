#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty')

if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts | *.tsx | *.astro) ;;
  *)
    exit 0
    ;;
esac

if [[ "$file_path" == *node_modules* ]] || [[ "$file_path" == *dist/* ]]; then
  exit 0
fi

cd "${CURSOR_PROJECT_DIR:-.}"

if ! output=$(npx astro check 2>&1); then
  echo "$output"
  exit 2
fi

exit 0
