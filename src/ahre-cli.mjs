#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSTALL_ROOT = path.resolve(__dirname, '..');
const VERSION = '0.9.0';
const COMMANDS = ['list','find','help','code','inspect','doctor'];
const GLOBAL_OPTIONS = new Set(['json','root','quality']);
const json = (v) => process.stdout.write(JSON.stringify(v,null,2)+'\n');
const readJson = (p) => JSON.parse(fs.readFileSync(p,'utf8'));
const exists = (p) => fs.existsSync(p);
const rel = (root,p) => path.relative(root,p).split(path.sep).join('/') || '.';
const now = () => new Date().toISOString();

function parse(argv){
  const pos=[]; const flags={};
  for(let i=0;i<argv.length;i++){
    const t=argv[i];
    if(t.startsWith('--')){
      const k=t.slice(2);
      if(k==='json'){ flags.json=true; continue; }
      const n=argv[i+1];
      if(n===undefined || n.startsWith('--')) flags[k]=true;
      else {flags[k]=n;i++;}
    } else pos.push(t);
  }
  return {pos,flags};
}

function fail(command, code, extra={}){
  return {status:'FAILED',error:{code,command,...extra,availableCommands:COMMANDS}};
}

function packRoots(root){
  return [path.join(root,'packs'),path.join(root,'.ahre','packs'),path.join(INSTALL_ROOT,'packs')];
}
function discover(root){
  const byId=new Map();
  for(const pr of packRoots(root)){
    if(!exists(pr)) continue;
    for(const packName of fs.readdirSync(pr)){
      const cr=path.join(pr,packName,'capabilities');
      if(!exists(cr)) continue;
      const walk=(d)=>{
        for(const e of fs.readdirSync(d,{withFileTypes:true})){
          const p=path.join(d,e.name);
          if(e.isDirectory()) walk(p);
          else if(e.name==='capability.json'){
            try { const c=readJson(p); if(c.id && !byId.has(c.id)) byId.set(c.id,{...c,__file:p,__dir:path.dirname(p),__pack:packName}); } catch {}
          }
        }
      }; walk(cr);
    }
  }
  return byId;
}
function tokenize(s){return String(s||'').toLowerCase().match(/[a-z0-9._-]+/g)||[];}
function metadataTerms(c){return new Set(tokenize([c.id,...(c.aliases||[]),...(c.tags||[]),c.description].join(' ')));}
function publicCap(c){return {id:c.id,description:c.description||'',required:Object.entries(c.arguments||{}).filter(([,v])=>v.required).map(([k])=>k),tags:c.tags||[],example:c.example||usage(c)};}
function usage(c){ const a=Object.entries(c.arguments||{}).filter(([,v])=>v.required).map(([k])=>`--${k} <${k}>`).join(' '); return `ahre code ${c.id}${a?' '+a:''} --json`; }
function render(s,args){return String(s).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g,(_,k)=>args[k]??`{{${k}}}`);}
function collectVars(s){return [...String(s).matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map(m=>m[1]);}
function pascal(v){return String(v).split(/[^A-Za-z0-9]+/).filter(Boolean).map(x=>x[0].toUpperCase()+x.slice(1)).join('');}
function kebab(v){return String(v).replace(/^\/+|\/+$/g,'').replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/[^A-Za-z0-9]+/g,'-').toLowerCase();}
function normalizeArg(name,v,m){
  let out=String(v); const c=m.case;
  if(c==='PascalCase') out=pascal(out);
  if(c==='kebab-case') out=name==='route'?'/'+kebab(out):kebab(out);
  return out;
}
function validateValue(name,v,m){
  if(m.type==='identifier' && !/^[A-Za-z][A-Za-z0-9]*$/.test(v)) return 'INVALID_IDENTIFIER';
  if(m.type==='route' && !/^\/[a-z0-9/_-]*$/.test(v)) return 'INVALID_ROUTE';
  return null;
}
function stateRoot(root){return path.join(root,'.ahre');}
function record(root,op){
  const d=stateRoot(root); fs.mkdirSync(d,{recursive:true});
  const full={timestamp:now(),...op};
  fs.writeFileSync(path.join(d,'last-operation.json'),JSON.stringify(full,null,2)+'\n');
  fs.appendFileSync(path.join(d,'operations.jsonl'),JSON.stringify(full)+'\n');
}
function loadLast(root){const p=path.join(stateRoot(root),'last-operation.json'); return exists(p)?readJson(p):null;}

function resolveDag(id,caps){
  const out=[]; const seen=new Set(); const stack=new Set();
  function visit(x){
    if(stack.has(x)) throw new Error(`CYCLE:${x}`);
    if(seen.has(x)) return;
    const c=caps.get(x); if(!c) throw new Error(`MISSING_CAPABILITY:${x}`);
    stack.add(x); for(const r of c.requires||[]) visit(r); stack.delete(x); seen.add(x); out.push(c);
  } visit(id); return out;
}
function declaredArgs(dag){const m={}; for(const c of dag) Object.assign(m,c.arguments||{}); return m;}
function unknownOptions(flags,args){return Object.keys(flags).filter(k=>!GLOBAL_OPTIONS.has(k) && !(k in args));}

function resolveTargetRoot(repoRoot,cap,args,cliRoot){
  if(cliRoot) return path.resolve(repoRoot,cliRoot);
  if(cap.targetRoot) return path.resolve(repoRoot,render(cap.targetRoot,args));
  return repoRoot;
}
function packageJsonAt(root){const p=path.join(root,'package.json'); return exists(p)?readJson(p):null;}
function tsconfigAt(root){const p=path.join(root,'tsconfig.json'); return exists(p)?readJson(p):null;}
function getProp(obj,dotted){return dotted.split('.').reduce((a,k)=>a?.[k],obj);}
function preflight(repoRoot,targetRoot,dag,args){
  const issues=[]; const planned=[];
  for(const c of dag){
    for(const f of c.files||[]){
      const src=path.join(c.__dir,f.source); const trg=path.join(targetRoot,render(f.target,args));
      if(!exists(src)) issues.push({code:'MISSING_SOURCE',capability:c.id,source:f.source});
      else if(exists(trg)){
        const wanted=render(fs.readFileSync(src,'utf8'),args); const current=fs.readFileSync(trg,'utf8');
        if(wanted!==current) issues.push({code:'FILE_CONFLICT',file:rel(repoRoot,trg),capability:c.id});
      }
      planned.push({capability:c.id,source:src,target:trg,targetDisplay:rel(repoRoot,trg)});
    }
    for(const p of c.preconditions||[]){
      if(p.type==='package'){
        const pkg=packageJsonAt(targetRoot); const ok=!!(pkg?.dependencies?.[p.name]||pkg?.devDependencies?.[p.name]);
        if(!ok) issues.push({code:'MISSING_DEPENDENCY',dependency:p.name,capability:c.id});
      } else if(p.type==='tsconfig'){
        const cfg=tsconfigAt(targetRoot); const got=getProp(cfg?.compilerOptions||{},p.property);
        if(got!==p.equals) issues.push({code:'TSCONFIG_MISMATCH',property:p.property,expected:p.equals,received:got,capability:c.id});
      } else if(p.type==='artifact'){
        const pp=path.join(targetRoot,render(p.path||'',args));
        if(!exists(pp)) issues.push({code:'MISSING_ARTIFACT',kind:p.kind,path:rel(repoRoot,pp),capability:c.id});
      }
    }
  }
  return {issues,planned};
}
function applyFiles(repoRoot,targetRoot,planned,args){
  const created=[],existing=[];
  for(const x of planned){
    const content=render(fs.readFileSync(x.source,'utf8'),args);
    if(exists(x.target)){existing.push(x.targetDisplay);continue;}
    fs.mkdirSync(path.dirname(x.target),{recursive:true}); fs.writeFileSync(x.target,content); created.push(x.targetDisplay);
  }
  return {created,existing};
}
function slotsFor(dag,args,targetRoot,repoRoot){
  const out=[];
  for(const c of dag) for(const s of c.slots||[]) out.push({...s,id:render(s.id,args),file:rel(repoRoot,path.join(targetRoot,render(s.file,args))),capability:c.id});
  return out;
}
function suggestionsFor(c,args,caps){
  return (c.suggests||[]).map(s=>{const x=caps.get(s.capability); return {capability:s.capability,when:render(s.when||'',args),example:x?render(x.example||usage(x),args):undefined};});
}
function commandAvailable(cmd,cwd){return spawnSync(cmd,['--version'],{cwd,encoding:'utf8',shell:false}).status===0;}
function runQuality(targetRoot,changed,mode){
  if(mode==='off') return {status:'SKIPPED',mode:'off',reason:'Disabled by --quality off.'};
  const pkg=packageJsonAt(targetRoot); if(!pkg) return {status:'SKIPPED',mode,reason:'No package.json found.'};
  const nm=path.join(targetRoot,'node_modules'); if(!exists(nm)) return {status:'SKIPPED',mode,reason:'node_modules is missing; run npm install.'};
  const checks={}; const diagnostics=[];
  const run=(name,script,args=[])=>{
    if(!pkg.scripts?.[script]) return {status:'SKIPPED',reason:`Missing npm script: ${script}.`};
    const r=spawnSync('npm',['run',script,'--',...args],{cwd:targetRoot,encoding:'utf8'});
    const status=r.status===0?'OK':'FAILED';
    if(status==='FAILED') diagnostics.push({tool:name,message:(r.stderr||r.stdout||'').trim().slice(0,2000)});
    return {status,exitCode:r.status,command:`npm run ${script}${args.length?' -- '+args.join(' '):''}`};
  };
  checks.format=run('format','format'); checks.lint=run('lint','lint',['--format','json']); checks.typecheck=run('typecheck','typecheck');
  if(mode==='full'){checks.test=run('test','test');checks.coverage=run('coverage','coverage');}
  const failed=Object.values(checks).some(x=>x.status==='FAILED');
  return {status:failed?'FAILED':'OK',mode,changedFiles:changed,checks,diagnostics};
}

function validateDoctor(root,caps){
  const errors=[],warnings=[];
  for(const c of caps.values()){
    if(!c.description) errors.push({code:'MISSING_DESCRIPTION',capability:c.id});
    if(!c.arguments || typeof c.arguments!=='object') errors.push({code:'MISSING_ARGUMENT_CONTRACT',capability:c.id});
    const declared=new Set(Object.keys(c.arguments||{}));
    for(const r of c.requires||[]) if(!caps.has(r)) errors.push({code:'MISSING_REFERENCE',capability:c.id,reference:r,relation:'requires'});
    for(const s of c.suggests||[]) if(!caps.has(s.capability)) errors.push({code:'MISSING_REFERENCE',capability:c.id,reference:s.capability,relation:'suggests'});
    for(const [k,vs] of Object.entries(c.alternatives||{})) for(const v of vs) if(!caps.has(v)) errors.push({code:'MISSING_REFERENCE',capability:c.id,reference:v,relation:`alternatives.${k}`});
    for(const f of c.files||[]){
      const src=path.join(c.__dir,f.source); if(!exists(src)) errors.push({code:'MISSING_SOURCE',capability:c.id,source:f.source});
      for(const v of [...collectVars(f.target),...(exists(src)?collectVars(fs.readFileSync(src,'utf8')):[])]) if(!declared.has(v) && !Object.values(caps).some(()=>false)) {
        // variables may be supplied by parent capability; validate globally below
      }
    }
    const allVars=new Set();
    for(const f of c.files||[]){for(const v of collectVars(f.target)) allVars.add(v); const src=path.join(c.__dir,f.source); if(exists(src)) for(const v of collectVars(fs.readFileSync(src,'utf8'))) allVars.add(v);}
    for(const s of c.slots||[]) for(const v of [...collectVars(s.id),...collectVars(s.file)]) allVars.add(v);
    const dag=(()=>{try{return resolveDag(c.id,caps)}catch(e){errors.push({code:String(e.message).split(':')[0],capability:c.id,detail:e.message});return[]}})();
    const inherited=new Set(Object.keys(declaredArgs(dag)));
    for(const v of allVars) if(!inherited.has(v)) errors.push({code:'UNDECLARED_VARIABLE',capability:c.id,variable:v});
    const req=Object.entries(c.arguments||{}).filter(([,m])=>m.required).map(([k])=>k);
    for(const r of req) if(!String(c.example||'').includes(`--${r} `)) errors.push({code:'INVALID_EXAMPLE',capability:c.id,missingArgument:r});
    if(!String(c.example||'').startsWith(`ahre code ${c.id}`)) errors.push({code:'INVALID_EXAMPLE',capability:c.id,example:c.example});
  }
  return {status:errors.length?'FAILED':'OK',version:VERSION,counts:{capabilities:caps.size},errors,warnings};
}

export function main(argv=process.argv.slice(2)){
  const {pos,flags}=parse(argv); const command=pos[0]; const repoRoot=path.resolve(flags.root||process.cwd()); const caps=discover(repoRoot);
  let out;
  if(!command || command==='--help') out={status:'OK',version:VERSION,commands:COMMANDS,usage:['ahre list --json','ahre find "<query>" --json','ahre help [capability] --json','ahre code <capability> [flags] --json','ahre inspect [last|subject] --json','ahre doctor --json']};
  else if(!COMMANDS.includes(command)) out=fail(command,'UNKNOWN_COMMAND');
  else if(command==='list'){
    let arr=[...caps.values()]; if(flags.tag) arr=arr.filter(c=>(c.tags||[]).includes(flags.tag)); if(flags.prefix) arr=arr.filter(c=>c.id.startsWith(flags.prefix));
    arr.sort((a,b)=>a.id.localeCompare(b.id)); out={status:'OK',capabilities:arr.map(publicCap),count:arr.length}; record(repoRoot,{command:'list',status:out.status,filters:{tag:flags.tag,prefix:flags.prefix},count:arr.length});
  } else if(command==='find'){
    const query=pos.slice(1).join(' '); const terms=[...new Set(tokenize(query))]; const matches=[];
    for(const c of caps.values()){
      const mt=metadataTerms(c); const covered=terms.filter(t=>mt.has(t)); if(!covered.length) continue; const unmatched=terms.filter(t=>!mt.has(t)); const coverage=terms.length?covered.length/terms.length:0; const score=Math.round(coverage*100 + (c.id===query?50:0));
      matches.push({id:c.id,type:'capability',matchedTerms:covered,unmatchedTerms:unmatched,coverage:Number(coverage.toFixed(2)),score,complete:unmatched.length===0,description:c.description});
    }
    matches.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)); const best=matches[0]; const status=!best?'NOT_FOUND':best.complete?'MATCH':'PARTIAL';
    out={status,query,terms,matches,instruction:status==='PARTIAL'?'No capability covers the complete query. Use `ahre list`, refine the search, or inspect a partial match.':status==='NOT_FOUND'?'No metadata match. Use `ahre list --json`.':'Use `ahre help <capability> --json` before execution.'};
    record(repoRoot,{command:'find',status,query,matches:matches.slice(0,10)});
  } else if(command==='help'){
    const id=pos[1];
    if(!id) out={status:'OK',commands:COMMANDS,workflow:['ahre list --json','ahre find "<task>" --json','ahre help <capability> --json','ahre code <capability> ... --json','ahre inspect last --json','ahre doctor --json']};
    else if(!caps.has(id)) out=fail('help','UNKNOWN_CAPABILITY',{capability:id,instruction:'Run `ahre list --json`.'});
    else {const c=caps.get(id); out={status:'OK',capability:{id:c.id,description:c.description,arguments:c.arguments||{},usage:c.usage||usage(c),example:c.example||usage(c),requires:c.requires||[],suggests:c.suggests||[],alternatives:c.alternatives||{},preconditions:c.preconditions||[],files:(c.files||[]).map(f=>({target:f.target})),slots:c.slots||[]}};}
    record(repoRoot,{command:'help',status:out.status,capability:id||null});
  } else if(command==='code'){
    const id=pos[1];
    if(!id || !caps.has(id)){out=fail('code','UNKNOWN_CAPABILITY',{capability:id||null,instruction:'Run `ahre list --json`.'});record(repoRoot,{command:'code',capability:id,status:'FAILED',reason:'UNKNOWN_CAPABILITY'});json(out);return 1;}
    let dag; try{dag=resolveDag(id,caps);}catch(e){out={status:'BLOCKED',reason:'INVALID_CAPABILITY_GRAPH',detail:e.message};record(repoRoot,{command:'code',capability:id,status:'BLOCKED',reason:out.reason});json(out);return 2;}
    const argDefs=declaredArgs(dag); const unknown=unknownOptions(flags,argDefs);
    if(unknown.length){out={status:'FAILED',error:{code:'UNKNOWN_OPTION',option:`--${unknown[0]}`,message:'AhRE accepts only the named flags declared by the capability.',instruction:`Run \`ahre help ${id} --json\`.`}};record(repoRoot,{command:'code',capability:id,status:'FAILED',reason:'UNKNOWN_OPTION',options:unknown});json(out);return 1;}
    const missing=Object.entries(argDefs).filter(([k,m])=>m.required && (flags[k]===undefined||flags[k]===true)).map(([k])=>k);
    if(missing.length){const c=caps.get(id);out={status:'BLOCKED',reason:'MISSING_ARGUMENTS',capability:id,missing,usage:c.usage||usage(c),example:c.example||usage(c)};record(repoRoot,{command:'code',capability:id,status:'BLOCKED',reason:'MISSING_ARGUMENTS',missing});json(out);return 2;}
    const args={}; const normalizedArguments={}; const invalid=[];
    for(const [k,m] of Object.entries(argDefs)) if(flags[k]!==undefined){const n=normalizeArg(k,flags[k],m);args[k]=n;if(n!==flags[k]) normalizedArguments[k]={received:flags[k],value:n,transform:m.case}; const er=validateValue(k,n,m);if(er) invalid.push({argument:k,code:er,value:n});}
    if(invalid.length){out={status:'BLOCKED',reason:'INVALID_ARGUMENTS',capability:id,issues:invalid,usage:caps.get(id).usage||usage(caps.get(id))};record(repoRoot,{command:'code',capability:id,status:'BLOCKED',reason:'INVALID_ARGUMENTS',issues:invalid});json(out);return 2;}
    const targetRoot=resolveTargetRoot(repoRoot,caps.get(id),args,flags.root); const pf=preflight(repoRoot,targetRoot,dag,args);
    if(pf.issues.length){out={status:'BLOCKED',reason:'PRECONDITION_FAILED',capability:id,targetRoot:rel(repoRoot,targetRoot),issues:pf.issues,suggestedCapabilities:suggestionsFor(caps.get(id),args,caps)};record(repoRoot,{command:'code',capability:id,status:'BLOCKED',reason:'PRECONDITION_FAILED',issues:pf.issues});json(out);return 2;}
    const effects=applyFiles(repoRoot,targetRoot,pf.planned,args); const slots=slotsFor(dag,args,targetRoot,repoRoot); const quality=runQuality(targetRoot,effects.created,flags.quality||'fast');
    out={status:quality.status==='FAILED'?'ACTION_REQUIRED':'OK',capability:id,targetRoot:rel(repoRoot,targetRoot),normalizedArguments,effects,execution:dag.map(c=>({id:c.id,fileCount:(c.files||[]).length})),slots,suggestedCapabilities:suggestionsFor(caps.get(id),args,caps),alternatives:caps.get(id).alternatives||{},quality,nextForLLM:['Use returned slots and diagnostics before reading generated files.','Run `ahre inspect last --json` to retrieve this operation.']};
    record(repoRoot,{command:'code',capability:id,status:out.status,targetRoot:out.targetRoot,arguments:args,normalizedArguments,effects,slots,quality});
  } else if(command==='inspect'){
    const subject=pos[1]||'last'; if(subject==='last'){const op=loadLast(repoRoot); out=op?{status:'OK',subject:'last',operation:op}:{status:'EMPTY',subject:'last'};}
    else {const hits=[]; const last=loadLast(repoRoot); if(last && JSON.stringify(last).toLowerCase().includes(subject.toLowerCase())) hits.push(last); out={status:'OK',subject,operations:hits,count:hits.length};}
  } else if(command==='doctor'){
    out=validateDoctor(repoRoot,caps); record(repoRoot,{command:'doctor',status:out.status,errors:out.errors});
  }
  json(out); return out.status==='FAILED'?1:out.status==='BLOCKED'?2:0;
}

if(import.meta.url===`file://${process.argv[1]}`) process.exitCode=main();
