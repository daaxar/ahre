#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/../ahre-cli-v0.9.0.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"
node bin/ahre.mjs doctor --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{if(JSON.parse(s).status!=="OK")process.exit(1)})'
rm -f "$OUT"
zip -qr "$OUT" README.md package.json bin src packs skills docs tests scripts
unzip -q "$OUT" -d "$TMP/extracted"
cd "$TMP/extracted"
node bin/ahre.mjs doctor --json > "$TMP/doctor.json"
node bin/ahre.mjs list --json > "$TMP/list.json"
node bin/ahre.mjs find "http service" --json > "$TMP/find.json"
node bin/ahre.mjs help service.http --json > "$TMP/help.json"
mkdir "$TMP/work" && cd "$TMP/work"
node "$TMP/extracted/bin/ahre.mjs" code service.http --service smoke --quality off --json > "$TMP/code.json"
node "$TMP/extracted/bin/ahre.mjs" inspect last --json > "$TMP/inspect.json"
node - "$TMP" <<'NODE'
const fs=require('fs'),p=process.argv[2];
for(const [f,ok] of [['doctor','OK'],['list','OK'],['find','MATCH'],['help','OK'],['code','OK'],['inspect','OK']]){
 const x=JSON.parse(fs.readFileSync(`${p}/${f}.json`)); if(x.status!==ok) throw new Error(`${f}: ${x.status}`);
}
for(const f of ['package.json','tsconfig.json','src/index.ts','src/Kernel.ts']) if(!fs.existsSync(`${p}/work/servs/smoke/${f}`)) throw new Error(`missing target ${f}`);
for(const f of ['packs/ms-expeditions-clean-ddd/capabilities/runtime/docker/files/.env.dev.tpl','packs/ms-expeditions-clean-ddd/capabilities/runtime/docker/files/.env.test.tpl']) if(!fs.existsSync(`${p}/extracted/${f}`)) throw new Error(`missing packaged dotfile ${f}`);
NODE
echo "$OUT"
