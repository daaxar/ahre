import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const VERSION = '0.3.3';
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const INTENTS = [
  {
    name: 'entity.capability.ensure',
    kind: 'public-recipe',
    description: 'Ensure an entity capability across Domain, Application, Infrastructure, tests, DI placeholders, and inventory.',
    idempotent: true,
    safeByDefault: true,
    inputs: {
      entity: { required: true, description: 'Entity or aggregate name, e.g. User.' },
      context: { required: true, description: 'Bounded context name, e.g. Users.' },
      capability: { required: false, default: 'create', enum: ['create'] },
      service: { required: false, default: 'current directory or --service value' },
      transport: { required: false, default: 'http', enum: ['http', 'none'] },
      persistence: { required: false, default: 'mongo', enum: ['mongo', 'none'] },
      messaging: { required: false, default: 'domain-events', enum: ['domain-events', 'none'] }
    },
    effects: [
      'ensures context folder shape',
      'ensures aggregate skeleton',
      'ensures id value object',
      'ensures repository interface',
      'ensures create use case skeleton',
      'ensures HTTP controller skeleton when transport=http',
      'ensures Mongo repository skeleton when persistence=mongo',
      'ensures domain event skeleton when messaging=domain-events',
      'ensures Jest/API test skeletons',
      'updates semantic inventory'
    ]
  },
  {
    name: 'entity.ensure',
    kind: 'component-recipe',
    description: 'Ensure an aggregate/entity skeleton and semantic inventory entry.',
    idempotent: true,
    safeByDefault: true,
    inputs: { entity: { required: true }, context: { required: true } }
  },
  {
    name: 'method.ensure',
    kind: 'micro-intent',
    description: 'Ensure a method exists in an entity class and register it in inventory. Uses ts-morph AST patching when available.',
    idempotent: true,
    safeByDefault: true,
    inputs: {
      entity: { required: true },
      context: { required: true },
      method: { required: true },
      kind: { required: false, default: 'behavior', enum: ['factory', 'behavior', 'query', 'private-helper'] }
    }
  },
  {
    name: 'inventory.rebuild',
    kind: 'verification',
    description: 'Rebuild a lightweight semantic inventory from known generated files. MVP keeps existing custom metadata and re-scans AhRE markers.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'verify.architecture',
    kind: 'verification',
    description: 'Run low-cost architecture checks: layer import bans, cross-workspace relative import hints, and inventory freshness.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'graph.build',
    kind: 'development-cache',
    description: 'Build a file dependency graph with symbols, imports, reverse dependencies, and file hashes for cache-aware workflows.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'build.plan',
    kind: 'development-cache',
    description: 'Plan impacted files from a changed file using the dependency graph. This is the first build-cache primitive.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'search.code',
    kind: 'navigation',
    description: 'Search indexed files, symbols, classes, methods, and inventory entries using AhRE graph/inventory context.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'skill.install',
    kind: 'llm-integration',
    description: 'Install the AhRE usage SKILL into a project, global AhRE home, known agent target, or explicit path.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'skill.show',
    kind: 'llm-integration',
    description: 'Show bundled AhRE usage or authoring SKILL content. Authoring skills are not installed by default.',
    idempotent: true,
    safeByDefault: true
  }
];

const DEFAULT_POLICY = {
  name: 'clean-ddd-http-mongo',
  defaults: {
    transport: 'http',
    persistence: 'mongo',
    messaging: 'domain-events',
    testing: 'jest+cucumber',
    di: 'yaml',
    aggregateBase: 'AggregateRoot'
  }
};

function pascal(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function kebab(input) {
  return String(input || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function camel(input) {
  const p = pascal(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function exists(file) {
  return fs.existsSync(file);
}

async function loadTsMorph() {
  try {
    return await import('ts-morph');
  } catch (error) {
    return null;
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function walkFiles(dir, predicate, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (!predicate || predicate(full)) out.push(full);
  }
  return out;
}

function graphPath(root) {
  return path.join(root, '.ahre', 'graph.json');
}

function readGraph(root) {
  return readJson(graphPath(root), null);
}

function resolveImportPath(root, fromFile, specifier) {
  if (!specifier.startsWith('.')) return { kind: 'package', target: specifier };
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  const found = candidates.find((candidate) => exists(candidate));
  return { kind: 'relative', target: found ? rel(root, found) : rel(root, base), resolved: Boolean(found) };
}

function parseParamList(params) {
  if (!params) return [];
  return String(params).split(',').map((raw) => raw.trim()).filter(Boolean).map((raw) => {
    const [name, type] = raw.split(':').map((x) => x.trim());
    return { name, type: type || 'unknown' };
  });
}

function primitiveTsType(type) {
  return ['string', 'number', 'boolean', 'void', 'unknown', 'object', 'Date', 'Promise'].includes(type) || /[<>{}\[\]|&]/.test(type);
}

function writeIfMissing(file, content, effects) {
  ensureDir(path.dirname(file));
  if (exists(file)) {
    effects.existing.push(file);
    return 'EXISTS';
  }
  fs.writeFileSync(file, content);
  effects.created.push(file);
  return 'CREATED';
}

function appendIfMissing(file, marker, content, effects) {
  ensureDir(path.dirname(file));
  const current = exists(file) ? fs.readFileSync(file, 'utf8') : '';
  if (current.includes(marker)) {
    effects.existing.push(file);
    return 'EXISTS';
  }
  fs.writeFileSync(file, current ? `${current.trimEnd()}\n${content}\n` : `${content}\n`);
  effects.updated.push(file);
  return current ? 'PATCHED' : 'CREATED';
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      if (key === 'json' || key === 'dry-run' || key === 'pretty') {
        flags[key] = true;
      } else {
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) {
          flags[key] = true;
        } else {
          flags[key] = value;
          i++;
        }
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function serviceRoot(cwd, flags) {
  if (flags.root) return path.resolve(cwd, flags.root);
  if (flags.service) return path.resolve(cwd, flags.service);
  return cwd;
}

function srcRoot(root) {
  return path.join(root, 'src');
}

function inventoryPath(root) {
  return path.join(root, '.ahre', 'inventory.json');
}

function emptyInventory(root) {
  return {
    schemaVersion: 1,
    generator: 'AhRE',
    updatedAt: new Date().toISOString(),
    root: path.resolve(root),
    policy: DEFAULT_POLICY,
    contexts: {},
    entities: {},
    artifacts: {},
    todos: {},
    operations: []
  };
}

function loadInventory(root) {
  const inv = readJson(inventoryPath(root), emptyInventory(root));
  inv.schemaVersion ??= 1;
  inv.generator ??= 'AhRE';
  inv.contexts ??= {};
  inv.entities ??= {};
  inv.artifacts ??= {};
  inv.todos ??= {};
  inv.operations ??= [];
  return inv;
}

function saveInventory(root, inv) {
  inv.updatedAt = new Date().toISOString();
  writeJson(inventoryPath(root), inv);
}

function contextDirs(root, context) {
  const base = path.join(srcRoot(root), context);
  return {
    base,
    domain: path.join(base, 'Domain'),
    model: path.join(base, 'Domain', 'Model'),
    valueObject: path.join(base, 'Domain', 'ValueObject'),
    repository: path.join(base, 'Domain', 'Repository'),
    event: path.join(base, 'Domain', 'Event'),
    application: path.join(base, 'Application'),
    useCase: path.join(base, 'Application', 'UseCase'),
    infrastructure: path.join(base, 'Infrastructure'),
    persistence: path.join(base, 'Infrastructure', 'Persistence'),
    controller: path.join(base, 'Infrastructure', 'UI', 'Controller'),
    consumer: path.join(base, 'Infrastructure', 'UI', 'Consumer')
  };
}

function templateAggregate({ entity }) {
  return `import { AggregateRoot } from '../../../Shared/Domain/AggregateRoot';\nimport { ${entity}Id } from '../ValueObject/${entity}Id';\n\nexport class ${entity} extends AggregateRoot {\n  private constructor(private readonly id: ${entity}Id) {\n    super();\n  }\n\n  public static create(id: ${entity}Id): ${entity} {\n    const ${camel(entity)} = new ${entity}(id);\n    // ARCH_TODO[kind=domain-invariant artifact=${entity}.create] Define creation invariants.\n    return ${camel(entity)};\n  }\n\n  public getId(): ${entity}Id {\n    return this.id;\n  }\n\n  public toPrimitives(): { id: string } {\n    return { id: this.id.value };\n  }\n}\n`;
}

function templateAggregateRoot() {
  return `export abstract class AggregateRoot {\n  private domainEvents: unknown[] = [];\n\n  protected record(event: unknown): void {\n    this.domainEvents.push(event);\n  }\n\n  public pullDomainEvents(): unknown[] {\n    const events = [...this.domainEvents];\n    this.domainEvents = [];\n    return events;\n  }\n}\n`;
}

function templateUuidBase() {
  return `export abstract class Uuid {\n  public readonly value: string;\n\n  protected constructor(value: string) {\n    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {\n      throw new Error('Invalid UUID');\n    }\n    this.value = value;\n  }\n\n  public equals(other: Uuid): boolean {\n    return this.value === other.value;\n  }\n\n  public toString(): string {\n    return this.value;\n  }\n}\n`;
}

function templateIdVo({ entity }) {
  return `import { Uuid } from '../../../Shared/Domain/ValueObject/Uuid';\n\nexport class ${entity}Id extends Uuid {\n  public constructor(value: string) {\n    super(value);\n  }\n}\n`;
}

function templateRepositoryInterface({ entity }) {
  return `import { ${entity} } from '../Model/${entity}';\nimport { ${entity}Id } from '../ValueObject/${entity}Id';\n\nexport interface ${entity}Repository {\n  save(${camel(entity)}: ${entity}): Promise<void>;\n  search(id: ${entity}Id): Promise<${entity} | null>;\n}\n`;
}

function templateUseCase({ entity }) {
  return `import { ${entity} } from '../../../Domain/Model/${entity}';\nimport { ${entity}Repository } from '../../../Domain/Repository/${entity}Repository';\nimport { ${entity}Id } from '../../../Domain/ValueObject/${entity}Id';\n\nexport interface Create${entity}Request {\n  id: string;\n}\n\nexport class Create${entity} {\n  public constructor(private readonly repository: ${entity}Repository) {}\n\n  public async run(request: Create${entity}Request): Promise<void> {\n    const ${camel(entity)} = ${entity}.create(new ${entity}Id(request.id));\n    await this.repository.save(${camel(entity)});\n  }\n}\n`;
}

function templateController({ entity, context }) {
  const route = kebab(entity) + 's';
  return `import { Body, JsonController, Post } from 'routing-controllers';\nimport { IsUUID } from 'class-validator';\nimport { Create${entity} } from '../../../Application/UseCase/Create${entity}/Create${entity}';\n\nclass Create${entity}Body {\n  @IsUUID()\n  id!: string;\n}\n\n@JsonController('/${route}')\nexport class ${entity}Controller {\n  public constructor(private readonly create${entity}: Create${entity}) {}\n\n  @Post('/')\n  public async create(@Body() body: Create${entity}Body): Promise<{ status: 'ok' }> {\n    await this.create${entity}.run(body);\n    return { status: 'ok' };\n  }\n}\n`;
}

function templateMongoRepository({ entity }) {
  return `import { ${entity} } from '../../Domain/Model/${entity}';\nimport { ${entity}Repository } from '../../Domain/Repository/${entity}Repository';\nimport { ${entity}Id } from '../../Domain/ValueObject/${entity}Id';\n\nexport class Mongo${entity}Repository implements ${entity}Repository {\n  public async save(${camel(entity)}: ${entity}): Promise<void> {\n    // ARCH_TODO[kind=persistence artifact=Mongo${entity}Repository.save] Wire Mongo collection and mapper.\n    void ${camel(entity)};\n  }\n\n  public async search(id: ${entity}Id): Promise<${entity} | null> {\n    // ARCH_TODO[kind=persistence artifact=Mongo${entity}Repository.search] Implement Mongo query and rehydration.\n    void id;\n    return null;\n  }\n}\n`;
}

function templateEvent({ entity }) {
  return `export class ${entity}WasCreated {\n  public constructor(\n    public readonly aggregateId: string,\n    public readonly occurredOn: string = new Date().toISOString()\n  ) {}\n}\n`;
}

function templateUseCaseTest({ entity }) {
  return `import { Create${entity} } from '../../../../../src/{{context}}/Application/UseCase/Create${entity}/Create${entity}';\n\ndescribe('Create${entity}', () => {\n  it('creates a ${entity}', async () => {\n    const repository = { save: jest.fn(), search: jest.fn() };\n    const useCase = new Create${entity}(repository);\n\n    await useCase.run({ id: '00000000-0000-4000-8000-000000000000' });\n\n    expect(repository.save).toHaveBeenCalledTimes(1);\n  });\n});\n`;
}

function templateApiFeature({ entity }) {
  return `Feature: Create ${entity}\n\n  Scenario: Create a valid ${entity}\n    Given I am an authenticated user\n    When I send a POST request to /${kebab(entity)}s with a valid payload\n    Then the response status should be 200\n`;
}

function updateInventoryForEntity({ root, inv, context, entity, effects, status = 'skeleton' }) {
  const key = `${context}.${entity}`;
  inv.contexts[context] ??= { entities: [] };
  if (!inv.contexts[context].entities.includes(entity)) inv.contexts[context].entities.push(entity);
  inv.entities[key] ??= {
    kind: 'aggregate',
    context,
    name: entity,
    className: entity,
    path: `src/${context}/Domain/Model/${entity}.ts`,
    status,
    methods: {},
    valueObjects: [],
    repositories: [],
    repositoryImplementations: [],
    useCases: [],
    controllers: [],
    events: [],
    tests: [],
    capabilities: {}
  };
  const e = inv.entities[key];
  e.status = e.status === 'implemented' ? e.status : status;
  e.path = `src/${context}/Domain/Model/${entity}.ts`;
  e.methods.create ??= { kind: 'factory', visibility: 'public static', status: 'skeleton' };
  if (!e.valueObjects.includes(`${entity}Id`)) e.valueObjects.push(`${entity}Id`);
  if (!e.repositories.includes(`${entity}Repository`)) e.repositories.push(`${entity}Repository`);
  if (!e.repositoryImplementations.includes(`Mongo${entity}Repository`)) e.repositoryImplementations.push(`Mongo${entity}Repository`);
  if (!e.useCases.includes(`Create${entity}`)) e.useCases.push(`Create${entity}`);
  if (!e.controllers.includes(`${entity}Controller`)) e.controllers.push(`${entity}Controller`);
  if (!e.events.includes(`${entity}WasCreated`)) e.events.push(`${entity}WasCreated`);
  if (!e.tests.includes(`Create${entity}.test.ts`)) e.tests.push(`Create${entity}.test.ts`);
  if (!e.tests.includes(`create-${kebab(entity)}.feature`)) e.tests.push(`create-${kebab(entity)}.feature`);
  e.capabilities.create ??= { transport: 'http', persistence: 'mongo', messaging: 'domain-events', status: 'skeleton' };
  inv.artifacts[`${context}.${entity}`] = { type: 'entity', path: e.path, status: e.status };
  inv.operations.push({ at: new Date().toISOString(), intent: 'entity.capability.ensure', subject: key, effects });
}

function ensureBaseShared(root, effects) {
  const aggregateRoot = path.join(srcRoot(root), 'Shared', 'Domain', 'AggregateRoot.ts');
  const uuid = path.join(srcRoot(root), 'Shared', 'Domain', 'ValueObject', 'Uuid.ts');
  writeIfMissing(aggregateRoot, templateAggregateRoot(), effects);
  writeIfMissing(uuid, templateUuidBase(), effects);
}

function ensureContext(root, context, effects) {
  const dirs = contextDirs(root, context);
  for (const dir of Object.values(dirs)) ensureDir(dir);
  effects.existing.push(dirs.base);
}

function ensureEntityArtifacts({ root, context, entity, flags, effects }) {
  const dirs = contextDirs(root, context);
  ensureBaseShared(root, effects);
  ensureContext(root, context, effects);
  writeIfMissing(path.join(dirs.model, `${entity}.ts`), templateAggregate({ entity }), effects);
  writeIfMissing(path.join(dirs.valueObject, `${entity}Id.ts`), templateIdVo({ entity }), effects);
  writeIfMissing(path.join(dirs.repository, `${entity}Repository.ts`), templateRepositoryInterface({ entity }), effects);
  const useCaseDir = path.join(dirs.useCase, `Create${entity}`);
  writeIfMissing(path.join(useCaseDir, `Create${entity}.ts`), templateUseCase({ entity }), effects);
  if ((flags.transport ?? 'http') === 'http') {
    writeIfMissing(path.join(dirs.controller, `${entity}Controller.ts`), templateController({ entity, context }), effects);
  }
  if ((flags.persistence ?? 'mongo') === 'mongo') {
    writeIfMissing(path.join(dirs.persistence, `Mongo${entity}Repository.ts`), templateMongoRepository({ entity }), effects);
  }
  if ((flags.messaging ?? 'domain-events') === 'domain-events') {
    writeIfMissing(path.join(dirs.event, `${entity}WasCreated.ts`), templateEvent({ entity }), effects);
  }
  const unitTest = path.join(root, 'tests', 'unit', context, 'Application', 'UseCase', `Create${entity}`, `Create${entity}.test.ts`);
  writeIfMissing(unitTest, templateUseCaseTest({ entity }).replaceAll('{{context}}', context), effects);
  const feature = path.join(root, 'tests', 'api', context, `create-${kebab(entity)}.feature`);
  writeIfMissing(feature, templateApiFeature({ entity }), effects);
  const servicesYaml = path.join(root, 'config', 'container', 'services.yaml');
  appendIfMissing(
    servicesYaml,
    `# AHRE:${context}.${entity}.Create${entity}`,
    `\n# AHRE:${context}.${entity}.Create${entity}\n# TODO(di): bind ${context}.Application.Create${entity}, ${context}.Domain.${entity}Repository, ${context}.Infrastructure.Mongo${entity}Repository, and ${context}.Infrastructure.${entity}Controller.`,
    effects
  );
}

async function ensureMethod({ root, context, entity, method, kind, effects, params = '', returns = 'void' }) {
  const file = path.join(contextDirs(root, context).model, `${entity}.ts`);
  if (!exists(file)) {
    effects.blocked.push({ path: file, reason: `Entity class ${entity} does not exist. Run entity.ensure first.` });
    return { status: 'BLOCKED', engine: 'none' };
  }

  const tsMorph = await loadTsMorph();
  if (!tsMorph) {
    effects.warnings.push('ts-morph is not installed; falling back to conservative text patching. Run npm install in ahre-cli to enable AST mode.');
    return ensureMethodTextFallback({ root, context, entity, method, kind, effects, params, returns });
  }

  const { Project, Scope } = tsMorph;
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(file);
  const classDecl = sourceFile.getClass(entity);
  if (!classDecl) {
    effects.blocked.push({ path: file, reason: `Cannot find class ${entity} with ts-morph.` });
    return { status: 'BLOCKED', engine: 'ts-morph' };
  }

  const existing = classDecl.getMethod(method) || classDecl.getStaticMethod(method);
  if (existing) {
    effects.existing.push(file);
    ensureMethodTest({ root, context, entity, method, effects });
    return { status: 'EXISTS', engine: 'ts-morph' };
  }

  const parameters = parseParamList(params);
  for (const parameter of parameters) {
    if (parameter.type && !primitiveTsType(parameter.type) && parameter.type.startsWith(context.slice(0, -1)) === false) {
      // Best-effort import for local value objects. This is intentionally conservative.
      const voPath = `../ValueObject/${parameter.type}`;
      const alreadyImported = sourceFile.getImportDeclarations().some((decl) => decl.getModuleSpecifierValue() === voPath);
      if (!alreadyImported) sourceFile.addImportDeclaration({ namedImports: [parameter.type], moduleSpecifier: voPath });
    }
  }

  const scope = kind === 'private-helper' ? Scope.Private : Scope.Public;
  const isFactory = kind === 'factory';
  const returnType = isFactory ? entity : returns;
  const statements = isFactory
    ? [`// ARCH_TODO[kind=domain-factory artifact=${entity}.${method}] Implement factory rule.`, `throw new Error('Not implemented');`]
    : [`// ARCH_TODO[kind=domain-behavior artifact=${entity}.${method}] Implement business rule.`];

  classDecl.addMethod({
    name: method,
    scope,
    isStatic: isFactory,
    returnType,
    parameters,
    statements
  });

  sourceFile.saveSync();
  effects.updated.push(file);
  ensureMethodTest({ root, context, entity, method, effects });
  return { status: 'PATCHED', engine: 'ts-morph' };
}

function ensureMethodTextFallback({ root, context, entity, method, kind, effects, params = '', returns = 'void' }) {
  const file = path.join(contextDirs(root, context).model, `${entity}.ts`);
  let source = fs.readFileSync(file, 'utf8');
  const methodRegex = new RegExp(`\\b${method}\\s*\\(`);
  if (methodRegex.test(source)) {
    effects.existing.push(file);
    ensureMethodTest({ root, context, entity, method, effects });
    return { status: 'EXISTS', engine: 'text-fallback' };
  }
  const visibility = kind === 'private-helper' ? 'private' : 'public';
  const parsedParams = parseParamList(params).map((p) => `${p.name}: ${p.type}`).join(', ');
  const methodSource = `\n  ${visibility} ${method}(${parsedParams}): ${returns} {\n    // ARCH_TODO[kind=domain-behavior artifact=${entity}.${method}] Implement business rule.\n  }\n`;
  const lastBrace = source.lastIndexOf('}');
  if (lastBrace === -1) {
    effects.blocked.push({ path: file, reason: `Cannot find class closing brace for ${entity}.` });
    return { status: 'BLOCKED', engine: 'text-fallback' };
  }
  source = `${source.slice(0, lastBrace).trimEnd()}\n${methodSource}\n${source.slice(lastBrace)}`;
  fs.writeFileSync(file, source);
  effects.updated.push(file);
  ensureMethodTest({ root, context, entity, method, effects });
  return { status: 'PATCHED', engine: 'text-fallback' };
}

function ensureMethodTest({ root, context, entity, method, effects }) {
  const test = path.join(root, 'tests', 'unit', context, 'Domain', 'Model', `${entity}${pascal(method)}.test.ts`);
  writeIfMissing(test, `describe('${entity}.${method}', () => {\n  it('has a pending business rule test', () => {\n    // ARCH_TODO[kind=test artifact=${entity}.${method}] Define expected behavior.\n    expect(true).toBe(true);\n  });\n});\n`, effects);
}

function normalizeEffectPaths(root, effects) {
  const convert = (item) => typeof item === 'string' ? rel(root, item) : { ...item, path: item.path ? rel(root, item.path) : item.path };
  return {
    created: effects.created.map(convert),
    updated: effects.updated.map(convert),
    existing: [...new Set(effects.existing.map(convert))],
    skipped: effects.skipped.map(convert),
    blocked: effects.blocked.map(convert),
    warnings: effects.warnings
  };
}

function newEffects() {
  return { created: [], updated: [], existing: [], skipped: [], blocked: [], warnings: [] };
}

async function buildDependencyGraph(root) {
  const files = walkFiles(srcRoot(root), (file) => /\.tsx?$/.test(file));
  const graph = {
    schemaVersion: 1,
    generator: 'AhRE',
    engine: 'regex-fallback',
    root: path.resolve(root),
    updatedAt: new Date().toISOString(),
    files: {},
    reverseDependencies: {},
    symbols: {},
    cache: {}
  };

  const tsMorph = await loadTsMorph();
  if (tsMorph) graph.engine = 'ts-morph';

  let project = null;
  if (tsMorph) {
    project = new tsMorph.Project({ skipAddingFilesFromTsConfig: true });
    for (const file of files) project.addSourceFileAtPath(file);
  }

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = rel(root, file);
    const imports = [];
    const classes = [];
    const methods = [];
    const exports = [];

    if (tsMorph && project) {
      const sf = project.getSourceFile(file);
      if (sf) {
        for (const decl of sf.getImportDeclarations()) {
          const specifier = decl.getModuleSpecifierValue();
          imports.push({ specifier, ...resolveImportPath(root, file, specifier) });
        }
        for (const cls of sf.getClasses()) {
          const name = cls.getName();
          if (!name) continue;
          classes.push(name);
          graph.symbols[name] ??= [];
          graph.symbols[name].push({ kind: 'class', file: relative });
          for (const method of cls.getMethods()) {
            const methodName = method.getName();
            methods.push(`${name}.${methodName}`);
            graph.symbols[`${name}.${methodName}`] ??= [];
            graph.symbols[`${name}.${methodName}`].push({ kind: 'method', file: relative, className: name });
          }
          for (const method of cls.getStaticMethods()) {
            const methodName = method.getName();
            methods.push(`${name}.${methodName}`);
            graph.symbols[`${name}.${methodName}`] ??= [];
            graph.symbols[`${name}.${methodName}`].push({ kind: 'static-method', file: relative, className: name });
          }
        }
        for (const ed of sf.getExportDeclarations()) exports.push(ed.getText());
        for (const cls of sf.getClasses().filter((cls) => cls.isExported())) {
          const name = cls.getName();
          if (name) exports.push(name);
        }
      }
    } else {
      const importRegex = /import[\s\S]*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(text))) imports.push({ specifier: match[1], ...resolveImportPath(root, file, match[1]) });
      const classRegex = /export\s+class\s+(\w+)|class\s+(\w+)/g;
      while ((match = classRegex.exec(text))) {
        const name = match[1] || match[2];
        classes.push(name);
        graph.symbols[name] ??= [];
        graph.symbols[name].push({ kind: 'class', file: relative });
      }
      const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
      while ((match = methodRegex.exec(text))) methods.push(match[1]);
    }

    graph.files[relative] = {
      path: relative,
      hash: sha256(text),
      size: Buffer.byteLength(text),
      imports,
      classes,
      methods,
      exports
    };
    graph.cache[relative] = { hash: graph.files[relative].hash, buildKey: sha256(`${relative}:${graph.files[relative].hash}:${imports.map((i) => i.target).join('|')}`) };
  }

  for (const [from, info] of Object.entries(graph.files)) {
    for (const imp of info.imports) {
      if (imp.kind === 'relative' && imp.resolved) {
        graph.reverseDependencies[imp.target] ??= [];
        if (!graph.reverseDependencies[imp.target].includes(from)) graph.reverseDependencies[imp.target].push(from);
      }
    }
  }

  writeJson(graphPath(root), graph);
  const inv = loadInventory(root);
  inv.graph = { path: rel(root, graphPath(root)), engine: graph.engine, updatedAt: graph.updatedAt, fileCount: Object.keys(graph.files).length, edgeCount: Object.values(graph.reverseDependencies).reduce((sum, arr) => sum + arr.length, 0) };
  inv.operations.push({ at: new Date().toISOString(), intent: 'graph.build', graph: inv.graph });
  saveInventory(root, inv);
  return graph;
}

function collectAffected(graph, changedFile) {
  const start = changedFile.split(path.sep).join('/');
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const dependent of graph.reverseDependencies[current] || []) {
      if (!seen.has(dependent)) {
        seen.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return [...seen].sort();
}

function searchGraphAndInventory(root, query) {
  const q = String(query || '').toLowerCase();
  const graph = readGraph(root);
  const inv = loadInventory(root);
  const results = [];
  if (graph) {
    for (const [file, info] of Object.entries(graph.files || {})) {
      if (file.toLowerCase().includes(q)) results.push({ kind: 'file', file });
      for (const cls of info.classes || []) if (cls.toLowerCase().includes(q)) results.push({ kind: 'class', name: cls, file });
      for (const method of info.methods || []) if (String(method).toLowerCase().includes(q)) results.push({ kind: 'method', name: method, file });
    }
    for (const [symbol, locations] of Object.entries(graph.symbols || {})) {
      if (symbol.toLowerCase().includes(q)) results.push({ kind: 'symbol', name: symbol, locations });
    }
  }
  for (const [key, entity] of Object.entries(inv.entities || {})) {
    if (key.toLowerCase().includes(q) || entity.name?.toLowerCase().includes(q)) results.push({ kind: 'entity', key, entity });
  }
  return results.slice(0, 50);
}


function skillSourceRoot() {
  return path.join(PACKAGE_ROOT, 'skills');
}


function parseSkillFrontmatter(text) {
  if (!text.startsWith('---\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end).trim().split(/\r?\n/);
  const data = {};
  for (const line of raw) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    data[key] = value;
  }
  return { data, body: text.slice(end + 5) };
}

function listBundledSkills({ includeAuthoring = false } = {}) {
  const root = skillSourceRoot();
  const groups = includeAuthoring ? ['installable', 'authoring'] : ['installable'];
  const skills = [];
  for (const group of groups) {
    const dir = path.join(root, group);
    if (!exists(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!exists(skillFile)) continue;
      const content = fs.readFileSync(skillFile, 'utf8');
      const { data } = parseSkillFrontmatter(content);
      skills.push({
        id: group === 'authoring' ? `authoring.${entry.name.replace(/^ahre-|-authoring$/g, '')}` : entry.name.replace(/^ahre-/, ''),
        group,
        directory: entry.name,
        name: data.name || entry.name,
        description: data.description || '',
        installable: group === 'installable',
        path: rel(PACKAGE_ROOT, skillFile)
      });
    }
  }
  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

function resolveBundledSkill(id) {
  const normalized = String(id || 'usage');
  const candidates = [];
  if (normalized === 'usage' || normalized === 'ahre-usage') candidates.push(path.join(skillSourceRoot(), 'installable', 'ahre-usage', 'SKILL.md'));
  if (normalized.startsWith('authoring.')) {
    const name = normalized.slice('authoring.'.length);
    candidates.push(path.join(skillSourceRoot(), 'authoring', `ahre-${name}-authoring`, 'SKILL.md'));
  }
  candidates.push(path.join(skillSourceRoot(), 'installable', normalized, 'SKILL.md'));
  candidates.push(path.join(skillSourceRoot(), 'authoring', normalized, 'SKILL.md'));
  const found = candidates.find((file) => exists(file));
  if (!found) return null;
  const content = fs.readFileSync(found, 'utf8');
  const { data } = parseSkillFrontmatter(content);
  return {
    id: normalized,
    group: found.includes(`${path.sep}authoring${path.sep}`) ? 'authoring' : 'installable',
    file: found,
    content,
    name: data.name || path.basename(path.dirname(found)),
    description: data.description || ''
  };
}

function skillInstallDir(root, flags) {
  const target = flags.target || 'project';
  if (target === 'project') return path.join(root, '.ahre', 'skills');
  if (target === 'global') return path.join(os.homedir(), '.ahre', 'skills');
  if (target === 'path') {
    if (!flags.path && !flags.to) throw new Error('skill install --target path requires --path or --to');
    return path.resolve(root, flags.path || flags.to);
  }
  if (target === 'claude') return path.join(root, '.claude', 'skills');
  if (target === 'codex') return path.join(root, '.codex', 'skills');
  if (target === 'opencode') return path.join(root, '.opencode', 'skills');
  throw new Error(`Unknown skill target: ${target}`);
}

function skillManifestPath(rootOrTargetDir, flags = {}) {
  if (flags && flags.target && flags.target !== 'project') return path.join(rootOrTargetDir, 'manifest.json');
  return path.join(rootOrTargetDir, '.ahre', 'skills', 'manifest.json');
}

function loadSkillManifest(manifestFile) {
  const manifest = readJson(manifestFile, { schemaVersion: 1, generator: 'AhRE', installed: {} });
  manifest.schemaVersion ??= 1;
  manifest.generator ??= 'AhRE';
  manifest.installed ??= {};
  return manifest;
}

function installSkill({ root, skill, flags }) {
  if (skill.group === 'authoring' && !flags['allow-authoring-skills'] && !flags.explicit) {
    return {
      status: 'BLOCKED',
      reason: 'Authoring skills are not installable by default. Re-run with --allow-authoring-skills or --explicit if you really want to install framework-authoring guidance into this target.',
      skill: { name: skill.name, group: skill.group }
    };
  }
  const targetDir = skillInstallDir(root, flags);
  const skillDir = path.join(targetDir, skill.name);
  const dest = path.join(skillDir, 'SKILL.md');
  ensureDir(skillDir);
  const previous = exists(dest) ? fs.readFileSync(dest, 'utf8') : null;
  const status = previous === skill.content ? 'EXISTS' : previous ? 'UPDATED' : 'CREATED';
  if (previous !== skill.content) fs.writeFileSync(dest, skill.content);

  const manifestFile = path.join(targetDir, 'manifest.json');
  const manifest = loadSkillManifest(manifestFile);
  manifest.installed[skill.name] = {
    version: VERSION,
    source: 'ahre-cli',
    group: skill.group,
    target: flags.target || 'project',
    path: rel(root, dest),
    installedAt: new Date().toISOString()
  };
  writeJson(manifestFile, manifest);
  return { status: 'OK', action: status, skill: { name: skill.name, description: skill.description, group: skill.group }, installedPath: rel(root, dest), manifestPath: rel(root, manifestFile) };
}

export class AhreCli {
  constructor({ cwd }) {
    this.cwd = cwd;
  }

  async run(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv[0] === 'help') return this.help();
    if (argv.includes('--version') || argv[0] === 'version') return this.output({ status: 'OK', version: VERSION }, true);
    const { positional, flags } = parseArgs(argv);
    const [group, action, subject, maybe] = positional;

    if (group === 'intents') return this.handleIntents(action, subject, flags);
    if (group === 'recipe') return this.handleRecipe(action, subject, flags);
    if (group === 'ensure') return await this.handleEnsure(action, subject, maybe, flags);
    if (group === 'inventory') return await this.handleInventory(action, subject, maybe, flags);
    if (group === 'verify') return await this.handleVerify(action, subject, flags);
    if (group === 'code') return await this.handleCode(action, subject, maybe, flags);
    if (group === 'graph') return await this.handleGraph(action, subject, maybe, flags);
    if (group === 'build') return await this.handleBuild(action, subject, maybe, flags);
    if (group === 'search') return await this.handleSearch(action, subject, maybe, flags);
    if (group === 'skill') return this.handleSkill(action, subject, maybe, flags);
    throw new Error(`Unknown command group: ${group}`);
  }

  help() {
    console.log(`AhRE — ArcHitecture Recipe Engine CLI ${VERSION}\n\nUsage:\n  ahre intents list --json\n  ahre intents search <query> --json\n  ahre intents describe <intent> --json\n\n  ahre recipe plan entity.capability.ensure --entity User --context Users --json\n  ahre recipe apply entity.capability.ensure --entity User --context Users --json\n\n  ahre ensure entity --entity User --context Users --json\n  ahre ensure method --entity User --context Users --method changeEmail --json\n\n  ahre inventory get entity Users.User --json\n  ahre inventory list entities --json\n  ahre verify architecture --json\n\n  ahre skill list --all --json\n  ahre skill show usage --json\n  ahre skill install usage --target project --json\n  ahre skill doctor --target project --json\n`);
  }

  output(payload, asJson = false) {
    if (asJson || payload.forceJson) {
      delete payload.forceJson;
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(payload.summary ?? JSON.stringify(payload, null, 2));
    }
  }

  handleIntents(action, subject, flags) {
    if (action === 'list') {
      return this.output({ status: 'OK', intents: INTENTS.map(({ name, kind, description, idempotent, safeByDefault }) => ({ name, kind, description, idempotent, safeByDefault })) }, flags.json);
    }
    if (action === 'search') {
      const query = [subject, ...Object.keys(flags).filter((key) => flags[key] === true)].filter(Boolean).join(' ').toLowerCase();
      const found = INTENTS.filter((intent) => `${intent.name} ${intent.kind} ${intent.description}`.toLowerCase().includes(query));
      return this.output({ status: 'OK', query, intents: found }, flags.json);
    }
    if (action === 'describe') {
      const found = INTENTS.find((intent) => intent.name === subject);
      if (!found) throw new Error(`Unknown intent: ${subject}`);
      return this.output({ status: 'OK', intent: found }, flags.json);
    }
    throw new Error(`Unknown intents action: ${action}`);
  }

  handleRecipe(action, subject, flags) {
    if (!['plan', 'apply'].includes(action)) throw new Error(`Unknown recipe action: ${action}`);
    if (subject !== 'entity.capability.ensure') throw new Error(`Unknown recipe: ${subject}`);
    const root = serviceRoot(this.cwd, flags);
    const entity = pascal(flags.entity);
    const context = pascal(flags.context);
    if (!entity || !context) throw new Error('--entity and --context are required');
    const plan = this.planEntityCapability({ root, entity, context, flags });
    if (action === 'plan') return this.output({ ...plan, forceJson: flags.json }, flags.json);
    return this.applyEntityCapability({ root, entity, context, flags, plan });
  }

  planEntityCapability({ root, entity, context, flags }) {
    const dirs = contextDirs(root, context);
    const files = [
      path.join(srcRoot(root), 'Shared', 'Domain', 'AggregateRoot.ts'),
      path.join(srcRoot(root), 'Shared', 'Domain', 'ValueObject', 'Uuid.ts'),
      path.join(dirs.model, `${entity}.ts`),
      path.join(dirs.valueObject, `${entity}Id.ts`),
      path.join(dirs.repository, `${entity}Repository.ts`),
      path.join(dirs.useCase, `Create${entity}`, `Create${entity}.ts`),
      path.join(dirs.controller, `${entity}Controller.ts`),
      path.join(dirs.persistence, `Mongo${entity}Repository.ts`),
      path.join(dirs.event, `${entity}WasCreated.ts`),
      path.join(root, 'tests', 'unit', context, 'Application', 'UseCase', `Create${entity}`, `Create${entity}.test.ts`),
      path.join(root, 'tests', 'api', context, `create-${kebab(entity)}.feature`),
      path.join(root, 'config', 'container', 'services.yaml'),
      inventoryPath(root)
    ];
    const wouldCreate = files.filter((file) => !exists(file)).map((file) => rel(root, file));
    const alreadyExists = files.filter((file) => exists(file)).map((file) => rel(root, file));
    return {
      status: 'OK',
      mode: 'plan',
      recipe: 'entity.capability.ensure',
      subject: `${context}.${entity}.create`,
      root,
      policy: flags.policy ?? DEFAULT_POLICY.name,
      wouldCreate,
      wouldPatch: alreadyExists.includes('config/container/services.yaml') ? ['config/container/services.yaml'] : [],
      alreadyExists,
      conflicts: [],
      warnings: flags.schema ? [] : ['No schema provided; AhRE will generate minimal skeletons and structured TODO markers.'],
      next: [`ahre recipe apply entity.capability.ensure --entity ${entity} --context ${context} --json`]
    };
  }

  applyEntityCapability({ root, entity, context, flags, plan }) {
    const effects = newEffects();
    ensureEntityArtifacts({ root, context, entity, flags, effects });
    const inv = loadInventory(root);
    updateInventoryForEntity({ root, inv, context, entity, effects: normalizeEffectPaths(root, effects) });
    saveInventory(root, inv);
    effects.updated.push(inventoryPath(root));
    const normalized = normalizeEffectPaths(root, effects);
    const currentKnowledge = inv.entities[`${context}.${entity}`];
    const payload = {
      status: normalized.blocked.length ? 'PARTIAL' : 'OK',
      mode: 'apply',
      recipe: 'entity.capability.ensure',
      subject: `${context}.${entity}.create`,
      summary: `Ensured ${context}.${entity}.create capability.`,
      effects: normalized,
      inventoryPath: rel(root, inventoryPath(root)),
      inventoryDelta: { entities: { [`${context}.${entity}`]: currentKnowledge } },
      currentKnowledge: { entity: currentKnowledge },
      warnings: [...plan.warnings, ...normalized.warnings],
      nextSuggestedIntents: [
        `ahre ensure method --entity ${entity} --context ${context} --method <businessMethod> --json`,
        'ahre verify architecture --json',
        `ahre inventory get entity ${context}.${entity} --json`
      ]
    };
    return this.output(payload, flags.json);
  }

  async handleEnsure(action, subject, maybe, flags) {
    if (action === 'entity') {
      const root = serviceRoot(this.cwd, flags);
      const entity = pascal(flags.entity || subject);
      const context = pascal(flags.context || maybe);
      if (!entity || !context) throw new Error('ensure entity requires --entity and --context');
      const effects = newEffects();
      ensureContext(root, context, effects);
      ensureBaseShared(root, effects);
      writeIfMissing(path.join(contextDirs(root, context).model, `${entity}.ts`), templateAggregate({ entity }), effects);
      writeIfMissing(path.join(contextDirs(root, context).valueObject, `${entity}Id.ts`), templateIdVo({ entity }), effects);
      const inv = loadInventory(root);
      updateInventoryForEntity({ root, inv, context, entity, effects: normalizeEffectPaths(root, effects) });
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'entity.ensure', subject: `${context}.${entity}`, effects: normalizeEffectPaths(root, effects), currentKnowledge: { entity: inv.entities[`${context}.${entity}`] } }, flags.json);
    }
    if (action === 'method') {
      const root = serviceRoot(this.cwd, flags);
      const entity = pascal(flags.entity);
      const context = pascal(flags.context);
      const method = flags.method;
      const kind = flags.kind ?? 'behavior';
      if (!entity || !context || !method) throw new Error('ensure method requires --entity, --context, and --method');
      const effects = newEffects();
      const step = await ensureMethod({ root, context, entity, method, kind, params: flags.params ?? '', returns: flags.returns ?? 'void', effects });
      const inv = loadInventory(root);
      const key = `${context}.${entity}`;
      inv.entities[key] ??= { kind: 'aggregate', context, name: entity, className: entity, path: `src/${context}/Domain/Model/${entity}.ts`, methods: {}, valueObjects: [], repositories: [], repositoryImplementations: [], useCases: [], controllers: [], events: [], tests: [], capabilities: {} };
      inv.entities[key].methods ??= {};
      inv.entities[key].methods[method] ??= { kind, visibility: kind === 'private-helper' ? 'private' : 'public', status: 'skeleton', params: flags.params ?? '', returns: flags.returns ?? 'void', engine: step.engine };
      inv.operations.push({ at: new Date().toISOString(), intent: 'method.ensure', subject: `${key}.${method}`, step, effects: normalizeEffectPaths(root, effects) });
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      const normalized = normalizeEffectPaths(root, effects);
      return this.output({ status: normalized.blocked.length ? 'BLOCKED' : 'OK', intent: 'method.ensure', subject: `${key}.${method}`, step, effects: normalized, currentKnowledge: { entity: inv.entities[key] } }, flags.json);
    }
    throw new Error(`Unknown ensure action: ${action}`);
  }

  handleInventory(action, subject, maybe, flags) {
    const root = serviceRoot(this.cwd, flags);
    const inv = loadInventory(root);
    if (action === 'get' && subject === 'entity') {
      const entityKey = maybe || `${pascal(flags.context)}.${pascal(flags.entity)}`;
      const entity = inv.entities[entityKey];
      return this.output({ status: entity ? 'OK' : 'NOT_FOUND', entityKey, entity: entity ?? null }, flags.json);
    }
    if (action === 'list') {
      if (subject === 'entities') return this.output({ status: 'OK', entities: inv.entities }, flags.json);
      if (subject === 'contexts') return this.output({ status: 'OK', contexts: inv.contexts }, flags.json);
      return this.output({ status: 'OK', inventory: inv }, flags.json);
    }
    if (action === 'rebuild') {
      inv.operations.push({ at: new Date().toISOString(), intent: 'inventory.rebuild', note: 'MVP rebuild preserves existing semantic metadata.' });
      saveInventory(root, inv);
      return this.output({ status: 'OK', inventoryPath: rel(root, inventoryPath(root)), note: 'MVP rebuild completed. Full AST rebuild is planned.' }, flags.json);
    }
    throw new Error(`Unknown inventory action: ${action}`);
  }


  async handleCode(action, subject, maybe, flags) {
    // Code is an agent-friendly alias namespace over ensure/recipe primitives.
    if (action === 'ensure') return await this.handleEnsure(subject, maybe, undefined, flags);
    if (action === 'method') return await this.handleEnsure('method', subject, maybe, flags);
    if (action === 'entity') return await this.handleEnsure('entity', subject, maybe, flags);
    if (action === 'capability') return this.handleRecipe('apply', 'entity.capability.ensure', flags);
    throw new Error(`Unknown code action: ${action}`);
  }

  async handleGraph(action, subject, maybe, flags) {
    const root = serviceRoot(this.cwd, flags);
    if (action === 'build') {
      const graph = await buildDependencyGraph(root);
      return this.output({
        status: 'OK',
        intent: 'graph.build',
        graphPath: rel(root, graphPath(root)),
        engine: graph.engine,
        fileCount: Object.keys(graph.files).length,
        edgeCount: Object.values(graph.reverseDependencies).reduce((sum, arr) => sum + arr.length, 0),
        symbolCount: Object.keys(graph.symbols).length,
        cacheEntries: Object.keys(graph.cache).length,
        currentKnowledge: {
          graph: {
            path: rel(root, graphPath(root)),
            engine: graph.engine,
            files: Object.keys(graph.files).length,
            reverseDependencies: Object.keys(graph.reverseDependencies).length
          }
        }
      }, flags.json);
    }
    if (action === 'get' && subject === 'file') {
      const graph = readGraph(root) || await buildDependencyGraph(root);
      const file = maybe || flags.file;
      if (!file) throw new Error('graph get file requires a file path');
      const key = file.split(path.sep).join('/');
      return this.output({ status: graph.files[key] ? 'OK' : 'NOT_FOUND', file: key, node: graph.files[key] ?? null, dependents: graph.reverseDependencies[key] ?? [] }, flags.json);
    }
    if (action === 'affected') {
      const graph = readGraph(root) || await buildDependencyGraph(root);
      const file = subject || flags.file;
      if (!file) throw new Error('graph affected requires --file or positional file');
      const key = file.split(path.sep).join('/');
      return this.output({ status: 'OK', intent: 'graph.affected', file: key, affected: collectAffected(graph, key) }, flags.json);
    }
    throw new Error(`Unknown graph action: ${action}`);
  }

  async handleBuild(action, subject, maybe, flags) {
    const root = serviceRoot(this.cwd, flags);
    if (action !== 'plan') throw new Error(`Unknown build action: ${action}`);
    const graph = readGraph(root) || await buildDependencyGraph(root);
    const changed = flags.changed || flags.file || subject;
    const changedFiles = String(changed || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(path.sep).join('/'));
    if (!changedFiles.length) throw new Error('build plan requires --changed <file>[,<file>]');
    const affected = [...new Set(changedFiles.flatMap((file) => [file, ...collectAffected(graph, file)]))].sort();
    const cachePlan = affected.map((file) => ({ file, cache: graph.cache[file] ?? null, reason: changedFiles.includes(file) ? 'changed' : 'dependent' }));
    return this.output({
      status: 'OK',
      intent: 'build.plan',
      graphPath: rel(root, graphPath(root)),
      changed: changedFiles,
      affected,
      cachePlan,
      note: 'This MVP plans impacted files and cache keys; it does not execute compilation yet.'
    }, flags.json);
  }

  async handleSearch(action, subject, maybe, flags) {
    const root = serviceRoot(this.cwd, flags);
    const query = flags.query || subject || maybe;
    if (!query) throw new Error('search requires a query');
    if (!readGraph(root) && exists(srcRoot(root))) await buildDependencyGraph(root);
    const results = searchGraphAndInventory(root, query);
    return this.output({ status: 'OK', intent: 'search.code', query, resultCount: results.length, results }, flags.json);
  }



  handleSkill(action, subject, maybe, flags) {
    const root = serviceRoot(this.cwd, flags);
    if (action === 'list') {
      const skills = listBundledSkills({ includeAuthoring: Boolean(flags.all) });
      return this.output({ status: 'OK', skills, note: flags.all ? 'Includes non-installable authoring skills.' : 'Default list includes installable user-facing skills only. Use --all to include authoring skills.' }, flags.json);
    }
    if (action === 'show' || action === 'print') {
      const id = subject || 'usage';
      const skill = resolveBundledSkill(id);
      if (!skill) return this.output({ status: 'NOT_FOUND', id }, flags.json);
      if (flags.json) return this.output({ status: 'OK', id, name: skill.name, description: skill.description, group: skill.group, installable: skill.group === 'installable', content: skill.content }, true);
      console.log(skill.content);
      return;
    }
    if (action === 'export') {
      const id = subject || 'usage';
      const skill = resolveBundledSkill(id);
      if (!skill) return this.output({ status: 'NOT_FOUND', id }, flags.json);
      const to = flags.to || flags.path;
      if (!to) throw new Error('skill export requires --to <dir>');
      const destDir = path.resolve(root, to, skill.name);
      ensureDir(destDir);
      const dest = path.join(destDir, 'SKILL.md');
      fs.writeFileSync(dest, skill.content);
      return this.output({ status: 'OK', action: 'EXPORTED', skill: skill.name, group: skill.group, path: rel(root, dest) }, flags.json);
    }
    if (action === 'install') {
      const id = subject || 'usage';
      const skill = resolveBundledSkill(id);
      if (!skill) return this.output({ status: 'NOT_FOUND', id }, flags.json);
      const result = installSkill({ root, skill, flags });
      return this.output(result, flags.json);
    }
    if (action === 'doctor') {
      const targetDir = skillInstallDir(root, flags);
      const manifestFile = path.join(targetDir, 'manifest.json');
      const manifest = loadSkillManifest(manifestFile);
      const installed = Object.entries(manifest.installed || {}).map(([name, value]) => ({ name, ...value }));
      const authoringSkillsInstalled = installed.some((item) => item.group === 'authoring');
      const issues = [];
      for (const item of installed) {
        const full = path.resolve(root, item.path || '');
        if (item.path && !exists(full) && !exists(path.join(targetDir, item.name, 'SKILL.md'))) issues.push({ severity: 'warning', skill: item.name, reason: 'manifest entry points to a missing file' });
      }
      return this.output({ status: issues.length ? 'WARNING' : 'OK', target: flags.target || 'project', targetDir: rel(root, targetDir), manifestPath: rel(root, manifestFile), installed, authoringSkillsInstalled, issues }, flags.json);
    }
    throw new Error(`Unknown skill action: ${action}`);
  }

  handleVerify(action, subject, flags) {
    if (action !== 'architecture') throw new Error(`Unknown verify action: ${action}`);
    const root = serviceRoot(this.cwd, flags);
    const issues = [];
    const scanRoot = srcRoot(root);
    if (exists(scanRoot)) {
      const files = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.tsx?$/.test(entry.name)) files.push(full);
        }
      };
      walk(scanRoot);
      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        const relative = rel(root, file);
        if (relative.includes('/Domain/') && /from ['"][^'"]*(express|routing-controllers|mongodb|typeorm|redis|aws|jsonwebtoken|jwks|winston)/.test(text)) {
          issues.push({ severity: 'critical', file: relative, rule: 'domain-must-not-import-infrastructure' });
        }
        if (relative.includes('/Application/') && /from ['"][^'"]*(express|routing-controllers|mongodb|typeorm|redis|aws|jsonwebtoken|jwks|winston)/.test(text)) {
          issues.push({ severity: 'major', file: relative, rule: 'application-must-not-import-concrete-infrastructure' });
        }
        if (/from ['"]\.\.\/\.\.\//.test(text)) {
          issues.push({ severity: 'minor', file: relative, rule: 'possible-cross-boundary-relative-import' });
        }
      }
    }
    const inv = loadInventory(root);
    return this.output({ status: issues.length ? 'WARNING' : 'OK', check: 'architecture', issues, inventory: { path: rel(root, inventoryPath(root)), entities: Object.keys(inv.entities).length } }, flags.json);
  }
}
