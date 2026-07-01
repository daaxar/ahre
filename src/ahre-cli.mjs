import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const VERSION = '0.4.1';
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
    description: 'Install the AhRE usage SKILL into .agents by default, optionally another target/path, and bootstrap AGENTS.md.',
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

INTENTS.push(
  {
    name: 'architecture.pack.list',
    kind: 'architecture-pack',
    description: 'List bundled templates, recipes, intents, and policies derived from ARCHITECTURE.md.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'architecture.service.ensure',
    kind: 'public-recipe',
    description: 'Ensure a backend service workspace with Kernel, DI YAML, Clean Architecture folders, Docker/runtime files, tests, and shared infrastructure skeletons.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'bounded-context.ensure',
    kind: 'component-recipe',
    description: 'Ensure a DDD bounded context folder shape with Domain, Application, and Infrastructure layers.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'value-object.ensure',
    kind: 'micro-intent',
    description: 'Ensure a context value object based on a shared primitive base and update semantic inventory.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'domain-event.ensure',
    kind: 'micro-intent',
    description: 'Ensure an immutable primitive-only domain event named in past tense.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'consumer.ensure',
    kind: 'component-recipe',
    description: 'Ensure an AMQP/SQS-style consumer skeleton that maps incoming messages to application use cases.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'document.pdf.ensure',
    kind: 'component-recipe',
    description: 'Ensure a Puppeteer/Handlebars PDF renderer adapter, template placeholder, and test skeleton.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'document.xlsx.ensure',
    kind: 'component-recipe',
    description: 'Ensure an XLSX exporter adapter and test skeleton.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'security.rbac.ensure',
    kind: 'component-recipe',
    description: 'Ensure shared JWT/RBAC security skeletons with client/logisticOperator/warehouse role groups.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'messaging.shared.ensure',
    kind: 'component-recipe',
    description: 'Ensure shared message bus/message queue ports and AMQP/SQS adapter placeholders.',
    idempotent: true,
    safeByDefault: true
  },
  {
    name: 'testing.suite.ensure',
    kind: 'component-recipe',
    description: 'Ensure Jest/Cucumber test directory shape, mothers, steps, and placeholder configs.',
    idempotent: true,
    safeByDefault: true
  }
);

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
  if (flags.path || flags.to) return path.resolve(root, flags.path || flags.to);
  const target = flags.target || 'project';
  if (target === 'project') return path.join(root, '.agents');
  if (target === 'global') return path.join(os.homedir(), '.agents');
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

const AGENTS_AHRE_BLOCK_START = '<!-- AHRE_USAGE_SKILL_START -->';
const AGENTS_AHRE_BLOCK_END = '<!-- AHRE_USAGE_SKILL_END -->';

function agentsAhreBlock(installedPath) {
  return `${AGENTS_AHRE_BLOCK_START}
## AhRE mandatory usage

This repository uses AhRE — ArcHitecture Recipe Engine.

The AhRE usage skill is installed at:

\`${installedPath}\`

Before creating, modifying, wiring, searching, verifying, or planning code/architecture artifacts, agents MUST read and follow that skill.

AhRE is the mandatory first execution path for architecture/code work.

Do NOT manually scaffold or edit these artifacts before attempting AhRE:

- bounded contexts
- entities/aggregates
- value objects
- repository interfaces
- repository implementations
- use cases
- controllers
- consumers
- domain events
- tests
- DI bindings
- runtime/config skeletons
- architecture folders

Minimum required AhRE workflow:

\`\`\`bash
ahre intents search "<task>" --json
ahre intents describe <intent> --json
ahre recipe plan <recipe> --json
ahre recipe apply <recipe> --json
ahre inventory get <kind> <id> --json
ahre verify architecture --json
\`\`\`

Use macro recipes for capabilities and architecture scaffolding.
Use micro-intents for surgical edits such as adding methods, imports, tests, or bindings.

Manual implementation is allowed only when:

- AhRE is unavailable;
- AhRE returns \`BLOCKED\`;
- no applicable recipe/intent exists;
- the remaining work is business-specific logic that AhRE intentionally leaves as TODO.

When falling back to manual work, state why AhRE was not used.
${AGENTS_AHRE_BLOCK_END}`;
}

function ensureAgentsMdForAhre(root, installedPath) {
  const file = path.join(root, 'AGENTS.md');
  const block = agentsAhreBlock(installedPath);
  const existed = exists(file);
  if (!existed) {
    const content = `# AGENTS.md

This file provides repository-level instructions for coding agents.

${block}
`;
    fs.writeFileSync(file, content);
    return { status: 'CREATED', path: rel(root, file) };
  }
  const current = fs.readFileSync(file, 'utf8');
  if (current.includes(AGENTS_AHRE_BLOCK_START) && current.includes(AGENTS_AHRE_BLOCK_END)) {
    const pattern = new RegExp(`${AGENTS_AHRE_BLOCK_START}[\\s\\S]*?${AGENTS_AHRE_BLOCK_END}`);
    const next = current.replace(pattern, block);
    if (next !== current) {
      fs.writeFileSync(file, next.endsWith('\n') ? next : `${next}\n`);
      return { status: 'UPDATED', path: rel(root, file) };
    }
    return { status: 'EXISTS', path: rel(root, file) };
  }
  const next = `${current.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(file, next);
  return { status: 'APPENDED', path: rel(root, file) };
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
  const installedPath = rel(root, dest);
  manifest.installed[skill.name] = {
    version: VERSION,
    source: 'ahre-cli',
    group: skill.group,
    target: flags.target || (flags.path || flags.to ? 'path' : 'project'),
    path: installedPath,
    installedAt: new Date().toISOString()
  };
  writeJson(manifestFile, manifest);
  const agentsMd = flags['no-agents-md'] ? null : ensureAgentsMdForAhre(root, installedPath);
  return { status: 'OK', action: status, skill: { name: skill.name, description: skill.description, group: skill.group }, installedPath, manifestPath: rel(root, manifestFile), agentsMd };
}


const ARCHITECTURE_PACK = {
  name: 'ms-expeditions-clean-ddd',
  version: '0.4.1',
  source: 'ARCHITECTURE.md',
  description: 'AhRE architecture pack for TypeScript/Node.js backend services using Clean Architecture, Hexagonal adapters, DDD bounded contexts, CQRS, DI YAML, AMQP/SQS, Mongo/TypeORM/Redis/S3, PDF/XLSX, JWT/RBAC, Jest and Cucumber.',
  policies: [
    {
      name: 'clean-ddd-http-mongo-amqp',
      defaults: {
        layers: ['Domain', 'Application', 'Infrastructure'],
        transport: 'http',
        persistence: 'mongo',
        messaging: 'domain-events',
        relational: 'typeorm',
        cache: 'redis',
        storage: 's3',
        pdf: 'puppeteer-handlebars',
        xlsx: 'xlsx',
        auth: 'jwt-jwks-rbac',
        testing: 'jest-cucumber',
        di: 'node-dependency-injection-yaml'
      }
    }
  ],
  templates: [
    { name: 'service.package-json', layer: 'workspace', description: 'Service workspace package.json with scripts for build, lint, typecheck, tests, dev and start.' },
    { name: 'service.kernel', layer: 'runtime', description: 'Kernel bootstrap skeleton for env, DI, logger, persistence, Express, consumers and shutdown.' },
    { name: 'service.index', layer: 'runtime', description: 'Executable entrypoint that starts Kernel.' },
    { name: 'shared.aggregate-root', layer: 'domain', description: 'AggregateRoot base with domain event recording and draining.' },
    { name: 'shared.value-object.uuid', layer: 'domain', description: 'Uuid base value object.' },
    { name: 'shared.value-object.string', layer: 'domain', description: 'String base value object.' },
    { name: 'shared.value-object.number', layer: 'domain', description: 'Number and PositiveNumber base value objects.' },
    { name: 'domain.aggregate', layer: 'domain', description: 'Aggregate/entity skeleton with factory, toPrimitives and TODO invariant markers.' },
    { name: 'domain.value-object', layer: 'domain', description: 'Context value object extending a shared primitive base.' },
    { name: 'domain.repository-interface', layer: 'domain', description: 'Repository interface using domain types.' },
    { name: 'domain.event', layer: 'domain', description: 'Immutable primitive-only domain event.' },
    { name: 'application.usecase-command', layer: 'application', description: 'Command use case skeleton using repository interface and optional event publisher.' },
    { name: 'application.finder', layer: 'application', description: 'Read-side finder/query skeleton.' },
    { name: 'infrastructure.http-controller', layer: 'infrastructure', description: 'routing-controllers HTTP adapter with DTO validation.' },
    { name: 'infrastructure.mongo-repository', layer: 'infrastructure', description: 'Mongo repository adapter with explicit mapper TODOs.' },
    { name: 'infrastructure.consumer', layer: 'infrastructure', description: 'AMQP/SQS consumer adapter that delegates to a use case.' },
    { name: 'infrastructure.pdf-renderer', layer: 'infrastructure', description: 'Puppeteer/Handlebars PDF adapter skeleton.' },
    { name: 'infrastructure.xlsx-exporter', layer: 'infrastructure', description: 'XLSX exporter adapter skeleton.' },
    { name: 'shared.security-rbac', layer: 'infrastructure', description: 'JWT/RBAC role policy skeleton.' },
    { name: 'shared.message-bus', layer: 'infrastructure', description: 'MessageBus port and adapter placeholder.' },
    { name: 'testing.jest-unit', layer: 'tests', description: 'Jest test skeleton.' },
    { name: 'testing.cucumber-api', layer: 'tests', description: 'Cucumber API feature skeleton.' },
    { name: 'testing.cucumber-command', layer: 'tests', description: 'Cucumber command/consumer feature skeleton.' },
    { name: 'runtime.dockerfile', layer: 'runtime', description: 'Multi-stage Dockerfile skeleton.' },
    { name: 'runtime.compose', layer: 'runtime', description: 'Docker Compose skeleton with backend, Redis, MariaDB and RabbitMQ.' }
  ],
  recipes: [
    {
      name: 'architecture.service.ensure',
      visibility: 'public',
      description: 'Ensure the complete service workspace baseline required by ARCHITECTURE.md.',
      steps: ['service.workspace.ensure', 'shared.kernel.ensure', 'messaging.shared.ensure', 'security.rbac.ensure', 'testing.suite.ensure', 'runtime.docker.ensure', 'inventory.update']
    },
    {
      name: 'bounded-context.ensure',
      visibility: 'public',
      description: 'Ensure Domain/Application/Infrastructure folder structure for a bounded context.',
      steps: ['context.folders.ensure', 'inventory.context.update']
    },
    {
      name: 'entity.capability.ensure',
      visibility: 'public',
      description: 'Ensure an entity create capability across domain, application, HTTP, Mongo, event, DI placeholder and tests.',
      steps: ['bounded-context.ensure', 'shared.kernel.ensure', 'entity.ensure', 'value-object.ensure', 'repository.interface.ensure', 'usecase.command.ensure', 'controller.http.ensure', 'repository.mongo.ensure', 'domain-event.ensure', 'testing.unit.ensure', 'testing.api.ensure', 'di.binding.ensure', 'inventory.update']
    },
    {
      name: 'consumer.event.ensure',
      visibility: 'public',
      description: 'Ensure a message consumer reacting to a domain/integration event.',
      steps: ['bounded-context.ensure', 'consumer.ensure', 'testing.command.ensure', 'di.binding.ensure', 'inventory.update']
    },
    {
      name: 'document.pdf.ensure',
      visibility: 'public',
      description: 'Ensure a PDF rendering adapter and related test/template placeholders.',
      steps: ['bounded-context.ensure', 'pdf.renderer.ensure', 'testing.unit.ensure', 'di.binding.ensure', 'inventory.update']
    },
    {
      name: 'document.xlsx.ensure',
      visibility: 'public',
      description: 'Ensure an XLSX export adapter and related test placeholder.',
      steps: ['bounded-context.ensure', 'xlsx.exporter.ensure', 'testing.unit.ensure', 'di.binding.ensure', 'inventory.update']
    }
  ],
  intents: [
    { name: 'service.workspace.ensure', level: 'macro', description: 'Create package/runtime/Docker/test/config shape for a service.' },
    { name: 'context.folders.ensure', level: 'component', description: 'Create context folder shape.' },
    { name: 'entity.ensure', level: 'component', description: 'Create aggregate skeleton.' },
    { name: 'value-object.ensure', level: 'micro', description: 'Create value object.' },
    { name: 'repository.interface.ensure', level: 'micro', description: 'Create domain repository interface.' },
    { name: 'repository.mongo.ensure', level: 'component', description: 'Create Mongo adapter.' },
    { name: 'usecase.command.ensure', level: 'component', description: 'Create command use case.' },
    { name: 'controller.http.ensure', level: 'component', description: 'Create HTTP controller.' },
    { name: 'consumer.ensure', level: 'component', description: 'Create consumer adapter.' },
    { name: 'method.ensure', level: 'micro', description: 'Add method with AST when available.' },
    { name: 'di.binding.ensure', level: 'micro', description: 'Append DI binding placeholder.' },
    { name: 'inventory.update', level: 'internal', description: 'Update semantic inventory.' }
  ]
};

function serviceWorkspaceDir(root, flags) {
  if (flags['service-dir']) return path.resolve(root, flags['service-dir']);
  if (flags.workspace) return path.resolve(root, flags.workspace);
  if (flags.service) {
    const service = String(flags.service);
    if (service.includes('/') || service.startsWith('.')) return path.resolve(root, service);
    return path.join(root, 'servs', service);
  }
  return root;
}

function templateServicePackageJson(serviceName) {
  const packageName = serviceName.startsWith('@') ? serviceName : `@ahre/${kebab(serviceName)}`;
  return JSON.stringify({
    name: packageName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      build: 'tsc -p tsconfig.json',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      lint: 'eslint .',
      test: 'npm run test:unit && npm run test:api && npm run test:command',
      'test:unit': 'jest --config jest.config.cjs --passWithNoTests',
      'test:api': 'cucumber-js tests/api --publish-quiet || true',
      'test:command': 'cucumber-js tests/command --publish-quiet || true',
      dev: 'node --watch src/index.ts',
      start: 'node dist/index.js'
    },
    dependencies: {
      express: '^5.1.0',
      'routing-controllers': '^0.11.3',
      'class-validator': '^0.14.0',
      'class-transformer': '^0.5.1',
      'node-dependency-injection': '^3.0.0'
    },
    devDependencies: {
      typescript: '^5.9.3',
      jest: '^30.0.0',
      '@cucumber/cucumber': '^11.0.0',
      eslint: '^9.0.0',
      prettier: '^3.0.0'
    }
  }, null, 2) + '\n';
}

function templateTsConfig() {
  return JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, esModuleInterop: true, skipLibCheck: true, outDir: 'dist', rootDir: 'src', experimentalDecorators: true, emitDecoratorMetadata: true }, include: ['src/**/*.ts', 'tests/**/*.ts'] }, null, 2) + '\n';
}

function templateIndex() {
  return `import { Kernel } from './Kernel';\n\nconst kernel = new Kernel();\n\nkernel.start().catch((error) => {\n  // eslint-disable-next-line no-console\n  console.error(error);\n  process.exitCode = 1;\n});\n`;
}

function templateKernel() {
  return `export class Kernel {\n  public async start(): Promise<void> {\n    // ARCH_TODO[kind=runtime artifact=Kernel.start] Load env/config.\n    // ARCH_TODO[kind=di artifact=Kernel.start] Load node-dependency-injection YAML container.\n    // ARCH_TODO[kind=logging artifact=Kernel.start] Initialize Winston logger.\n    // ARCH_TODO[kind=persistence artifact=Kernel.start] Initialize Mongo/TypeORM/Redis/S3 connections.\n    // ARCH_TODO[kind=http artifact=Kernel.start] Start Express/routing-controllers server.\n    // ARCH_TODO[kind=messaging artifact=Kernel.start] Register AMQP/SQS consumers.\n  }\n\n  public async stop(): Promise<void> {\n    // ARCH_TODO[kind=runtime artifact=Kernel.stop] Gracefully close HTTP, queues and persistence connections.\n  }\n}\n`;
}

function templateServicesYaml() {
  return `# AhRE managed DI placeholders.\n# Runtime DI uses node-dependency-injection YAML.\nservices: {}\n`;
}

function templateDockerfile() {
  return `FROM node:20-alpine AS base\nWORKDIR /app\n\nFROM base AS build\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\n\nFROM base AS local\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nCMD [\"npm\", \"run\", \"dev\"]\n\nFROM base AS tests\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nCMD [\"npm\", \"test\"]\n\nFROM base AS production\nCOPY package*.json ./\nRUN npm install --omit=dev\nCOPY --from=build /app/dist ./dist\nCMD [\"node\", \"dist/index.js\"]\n`;
}

function templateCompose(serviceName) {
  const n = kebab(serviceName || 'service');
  return `services:\n  ${n}:\n    build:\n      context: .\n      target: local\n    ports:\n      - \"8001:8001\"\n    env_file:\n      - .env.dev\n    depends_on:\n      - redis\n      - mariadb\n      - rabbitmq\n\n  redis:\n    image: redis:5-alpine\n    ports:\n      - \"6001:6379\"\n\n  mariadb:\n    image: mariadb:11\n    environment:\n      MYSQL_ROOT_PASSWORD: root\n      MYSQL_DATABASE: ahre\n    ports:\n      - \"3001:3306\"\n\n  rabbitmq:\n    image: rabbitmq:3-management\n    ports:\n      - \"5001:5672\"\n      - \"15672:15672\"\n`;
}

function templateEcosystem() {
  return `export default {\n  apps: [\n    {\n      name: 'ahre-service',\n      script: 'dist/index.js',\n      instances: 1,\n      exec_mode: 'fork'\n    }\n  ]\n};\n`;
}

function templateStringBase() {
  return `export abstract class StringValueObject {\n  public readonly value: string;\n\n  protected constructor(value: string) {\n    if (typeof value !== 'string' || value.length === 0) throw new Error('Invalid string value object');\n    this.value = value;\n  }\n\n  public equals(other: StringValueObject): boolean {\n    return this.value === other.value;\n  }\n\n  public toString(): string {\n    return this.value;\n  }\n}\n`;
}

function templateNumberBase() {
  return `export abstract class NumberValueObject {\n  public readonly value: number;\n\n  protected constructor(value: number) {\n    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Invalid number value object');\n    this.value = value;\n  }\n}\n\nexport abstract class PositiveNumberValueObject extends NumberValueObject {\n  protected constructor(value: number) {\n    super(value);\n    if (value <= 0) throw new Error('Expected positive number');\n  }\n}\n`;
}

function templateDateTimeBase() {
  return `export abstract class DateTimeValueObject {\n  public readonly value: Date;\n\n  protected constructor(value: Date) {\n    if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error('Invalid DateTime value object');\n    this.value = value;\n  }\n\n  public toISOString(): string {\n    return this.value.toISOString();\n  }\n}\n`;
}

function templateGenericValueObject({ name, base = 'StringValueObject' }) {
  const baseFile = base === 'Uuid' ? 'Uuid' : base === 'DateTimeValueObject' ? 'DateTime' : base.includes('Number') ? 'Number' : 'String';
  const primitive = base === 'Uuid' || base.includes('String') ? 'string' : base.includes('Number') ? 'number' : base.includes('DateTime') ? 'Date' : 'string';
  return `import { ${base} } from '../../../Shared/Domain/ValueObject/${baseFile}';\n\nexport class ${name} extends ${base} {\n  public constructor(value: ${primitive}) {\n    super(value);\n  }\n}\n`;
}

function templateFinder({ entity }) {
  return `import { ${entity}Repository } from '../../../Domain/Repository/${entity}Repository';\nimport { ${entity}Id } from '../../../Domain/ValueObject/${entity}Id';\n\nexport class Get${entity} {\n  public constructor(private readonly repository: ${entity}Repository) {}\n\n  public async run(id: string): Promise<{ id: string } | null> {\n    const ${camel(entity)} = await this.repository.search(new ${entity}Id(id));\n    return ${camel(entity)}?.toPrimitives() ?? null;\n  }\n}\n`;
}

function templateConsumer({ consumer, event, useCase }) {
  return `import { ${useCase} } from '../../../Application/UseCase/${useCase}/${useCase}';\n\nexport interface ${consumer}Message {\n  aggregateId: string;\n  occurredOn?: string;\n}\n\nexport class ${consumer} {\n  public constructor(private readonly useCase: ${useCase}) {}\n\n  public async consume(message: ${consumer}Message): Promise<void> {\n    // ARCH_TODO[kind=consumer-validation artifact=${consumer}.consume] Validate ${event} payload shape.\n    // ARCH_TODO[kind=idempotency artifact=${consumer}.consume] Add idempotency guard before side effects.\n    void message;\n    // Delegate to application use case. Do not place business rules in the consumer.\n  }\n}\n`;
}

function templatePdfRenderer({ name }) {
  return `export interface ${name}PdfInput {\n  id: string;\n}\n\nexport class ${name}PdfRenderer {\n  public async render(input: ${name}PdfInput): Promise<Buffer> {\n    // ARCH_TODO[kind=pdf artifact=${name}PdfRenderer.render] Render with Puppeteer + Handlebars template.\n    void input;\n    return Buffer.from('');\n  }\n}\n`;
}

function templateXlsxExporter({ name }) {
  return `export interface ${name}XlsxRow {\n  id: string;\n}\n\nexport class ${name}XlsxExporter {\n  public async export(rows: ${name}XlsxRow[]): Promise<Buffer> {\n    // ARCH_TODO[kind=xlsx artifact=${name}XlsxExporter.export] Serialize with xlsx package.\n    void rows;\n    return Buffer.from('');\n  }\n}\n`;
}

function templateRbac() {
  return `export type RoleGroup = 'client' | 'logisticOperator' | 'warehouse';\n\nexport class RbacPolicy {\n  public can(role: RoleGroup, action: string, resource: string): boolean {\n    // ARCH_TODO[kind=security artifact=RbacPolicy.can] Wire AccessControl-style permissions.\n    void action;\n    void resource;\n    return ['client', 'logisticOperator', 'warehouse'].includes(role);\n  }\n}\n`;
}

function templateJwtVerifier() {
  return `export interface AuthenticatedUser {\n  id: string;\n  roles: string[];\n}\n\nexport class JwtVerifier {\n  public async verify(token: string): Promise<AuthenticatedUser> {\n    // ARCH_TODO[kind=security artifact=JwtVerifier.verify] Validate JWT with jsonwebtoken + jwks-rsa.\n    void token;\n    throw new Error('Not implemented');\n  }\n}\n`;
}

function templateMessageBus() {
  return `export interface DomainEvent {\n  aggregateId: string;\n  occurredOn: string;\n}\n\nexport interface MessageBus {\n  publish(events: DomainEvent[]): Promise<void>;\n}\n\nexport class InMemoryMessageBus implements MessageBus {\n  public readonly published: DomainEvent[] = [];\n\n  public async publish(events: DomainEvent[]): Promise<void> {\n    this.published.push(...events);\n  }\n}\n`;
}

function templateWinstonLogger() {
  return `export class WinstonLogger {\n  public info(message: string, meta: Record<string, unknown> = {}): void {\n    // ARCH_TODO[kind=logging artifact=WinstonLogger.info] Wire Winston logger.\n    void message;\n    void meta;\n  }\n\n  public error(message: string, meta: Record<string, unknown> = {}): void {\n    // ARCH_TODO[kind=logging artifact=WinstonLogger.error] Wire Winston error logger.\n    void message;\n    void meta;\n  }\n}\n`;
}

function ensureSharedKernelFull(root, effects) {
  ensureBaseShared(root, effects);
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Domain', 'ValueObject', 'String.ts'), templateStringBase(), effects);
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Domain', 'ValueObject', 'Number.ts'), templateNumberBase(), effects);
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Domain', 'ValueObject', 'DateTime.ts'), templateDateTimeBase(), effects);
}

function ensureTestingSuite(root, effects) {
  const dirs = ['tests/unit', 'tests/api', 'tests/command', 'tests/mother', 'tests/steps'];
  for (const d of dirs) ensureDir(path.join(root, d));
  writeIfMissing(path.join(root, 'jest.config.cjs'), `module.exports = { testEnvironment: 'node', testMatch: ['**/tests/unit/**/*.test.ts'] };\n`, effects);
  writeIfMissing(path.join(root, 'tests', 'steps', 'world.ts'), `// ARCH_TODO[kind=test-steps artifact=world] Configure Cucumber world and shared test context.\n`, effects);
}

function ensureRuntimeDocker(root, serviceName, effects) {
  writeIfMissing(path.join(root, 'Dockerfile'), templateDockerfile(), effects);
  writeIfMissing(path.join(root, 'docker-compose.yml'), templateCompose(serviceName), effects);
  writeIfMissing(path.join(root, '.env.dev'), `NODE_ENV=development\nPORT=8001\n`, effects);
  writeIfMissing(path.join(root, '.env.test'), `NODE_ENV=test\nPORT=0\n`, effects);
  writeIfMissing(path.join(root, 'ecosystem.config.js'), templateEcosystem(), effects);
}

function ensureSecurity(root, effects) {
  const dir = path.join(srcRoot(root), 'Shared', 'Infrastructure', 'Security');
  writeIfMissing(path.join(dir, 'RbacPolicy.ts'), templateRbac(), effects);
  writeIfMissing(path.join(dir, 'JwtVerifier.ts'), templateJwtVerifier(), effects);
}

function ensureMessaging(root, effects) {
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Infrastructure', 'MessageBus', 'MessageBus.ts'), templateMessageBus(), effects);
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Infrastructure', 'MessageQueue', 'SqsMessageQueue.ts'), `export class SqsMessageQueue {\n  public async send(message: unknown): Promise<void> {\n    // ARCH_TODO[kind=message-queue artifact=SqsMessageQueue.send] Wire AWS SQS client.\n    void message;\n  }\n}\n`, effects);
}

function ensureLogging(root, effects) {
  writeIfMissing(path.join(srcRoot(root), 'Shared', 'Infrastructure', 'Logs', 'WinstonLogger.ts'), templateWinstonLogger(), effects);
}

function ensureServiceWorkspaceBaseline(repoRoot, flags, effects) {
  const serviceName = flags.service ? kebab(flags.service) : kebab(path.basename(repoRoot));
  const serviceDir = serviceWorkspaceDir(repoRoot, flags);
  ensureDir(serviceDir);
  writeIfMissing(path.join(serviceDir, 'package.json'), templateServicePackageJson(flags.package || serviceName || 'ahre-service'), effects);
  writeIfMissing(path.join(serviceDir, 'tsconfig.json'), templateTsConfig(), effects);
  writeIfMissing(path.join(serviceDir, 'src', 'index.ts'), templateIndex(), effects);
  writeIfMissing(path.join(serviceDir, 'src', 'Kernel.ts'), templateKernel(), effects);
  writeIfMissing(path.join(serviceDir, 'config', 'container', 'services.yaml'), templateServicesYaml(), effects);
  ensureSharedKernelFull(serviceDir, effects);
  ensureMessaging(serviceDir, effects);
  ensureSecurity(serviceDir, effects);
  ensureLogging(serviceDir, effects);
  ensureTestingSuite(serviceDir, effects);
  ensureRuntimeDocker(serviceDir, serviceName, effects);
  return serviceDir;
}

function ensureContextOnly(root, context, effects) {
  ensureContext(root, context, effects);
  const dirs = contextDirs(root, context);
  for (const dir of [dirs.domain, dirs.model, dirs.valueObject, dirs.repository, dirs.event, path.join(dirs.domain, 'Collection'), path.join(dirs.domain, 'Specification'), path.join(dirs.domain, 'Error'), path.join(dirs.domain, 'Exception'), path.join(dirs.domain, 'Iterator'), dirs.application, dirs.useCase, path.join(dirs.application, 'Service'), dirs.infrastructure, dirs.persistence, path.join(dirs.infrastructure, 'Pdf'), path.join(dirs.infrastructure, 'Xlsx'), path.join(dirs.infrastructure, 'Express'), dirs.controller, dirs.consumer]) {
    ensureDir(dir);
  }
}

function ensureValueObjectArtifact(root, context, name, base, effects) {
  ensureSharedKernelFull(root, effects);
  ensureContextOnly(root, context, effects);
  writeIfMissing(path.join(contextDirs(root, context).valueObject, `${name}.ts`), templateGenericValueObject({ name, base }), effects);
}

function ensureEventArtifact(root, context, event, effects) {
  ensureContextOnly(root, context, effects);
  writeIfMissing(path.join(contextDirs(root, context).event, `${event}.ts`), `export class ${event} {\n  public constructor(\n    public readonly aggregateId: string,\n    public readonly occurredOn: string = new Date().toISOString()\n  ) {}\n}\n`, effects);
}

function ensureConsumerArtifact(root, context, event, consumerName, useCase, effects) {
  ensureContextOnly(root, context, effects);
  writeIfMissing(path.join(contextDirs(root, context).consumer, `${consumerName}.ts`), templateConsumer({ consumer: consumerName, event, useCase }), effects);
  writeIfMissing(path.join(root, 'tests', 'command', context, `${kebab(consumerName)}.feature`), `Feature: ${consumerName}\n\n  Scenario: Consume ${event}\n    Given a valid ${event} message\n    When the ${consumerName} consumes the message\n    Then the expected application use case should be executed\n`, effects);
}

function ensurePdfArtifact(root, context, name, effects) {
  ensureContextOnly(root, context, effects);
  writeIfMissing(path.join(contextDirs(root, context).infrastructure, 'Pdf', `${name}PdfRenderer.ts`), templatePdfRenderer({ name }), effects);
  writeIfMissing(path.join(contextDirs(root, context).infrastructure, 'Pdf', `${kebab(name)}.hbs`), `<html><body>\n  <!-- ARCH_TODO[kind=pdf-template artifact=${name}] Define Handlebars template. -->\n</body></html>\n`, effects);
  writeIfMissing(path.join(root, 'tests', 'unit', context, 'Infrastructure', 'Pdf', `${name}PdfRenderer.test.ts`), `describe('${name}PdfRenderer', () => {\n  it('has a pending deterministic render test', () => {\n    expect(true).toBe(true);\n  });\n});\n`, effects);
}

function ensureXlsxArtifact(root, context, name, effects) {
  ensureContextOnly(root, context, effects);
  writeIfMissing(path.join(contextDirs(root, context).infrastructure, 'Xlsx', `${name}XlsxExporter.ts`), templateXlsxExporter({ name }), effects);
  writeIfMissing(path.join(root, 'tests', 'unit', context, 'Infrastructure', 'Xlsx', `${name}XlsxExporter.test.ts`), `describe('${name}XlsxExporter', () => {\n  it('has a pending deterministic export test', () => {\n    expect(true).toBe(true);\n  });\n});\n`, effects);
}

function updateInventoryArchitecture(root, inv, operation, subject, effects, extra = {}) {
  inv.architecturePack ??= { name: ARCHITECTURE_PACK.name, version: ARCHITECTURE_PACK.version, source: ARCHITECTURE_PACK.source };
  inv.operations.push({ at: new Date().toISOString(), intent: operation, subject, effects, ...extra });
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
    if (group === 'pack') return this.handlePack(action, subject, maybe, flags);
    if (group === 'template' || group === 'templates') return this.handleTemplate(action, subject, maybe, flags);
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
    if (action === 'list') {
      return this.output({ status: 'OK', pack: ARCHITECTURE_PACK.name, recipes: ARCHITECTURE_PACK.recipes }, flags.json);
    }
    if (action === 'describe' || action === 'show') {
      const recipe = ARCHITECTURE_PACK.recipes.find((item) => item.name === subject);
      if (!recipe) return this.output({ status: 'NOT_FOUND', recipe: subject }, flags.json);
      return this.output({ status: 'OK', pack: ARCHITECTURE_PACK.name, recipe }, flags.json);
    }
    if (!['plan', 'apply'].includes(action)) throw new Error(`Unknown recipe action: ${action}`);

    if (subject === 'architecture.service.ensure') {
      const root = serviceRoot(this.cwd, { root: flags.root });
      const target = serviceWorkspaceDir(root, flags);
      const files = [
        'package.json', 'tsconfig.json', 'src/index.ts', 'src/Kernel.ts', 'config/container/services.yaml',
        'Dockerfile', 'docker-compose.yml', '.env.dev', '.env.test', 'ecosystem.config.js',
        'src/Shared/Domain/AggregateRoot.ts', 'src/Shared/Domain/ValueObject/Uuid.ts',
        'src/Shared/Infrastructure/Security/RbacPolicy.ts', 'src/Shared/Infrastructure/MessageBus/MessageBus.ts',
        'tests/unit', 'tests/api', 'tests/command', 'tests/mother', 'tests/steps'
      ].map((p) => path.join(target, p));
      const plan = { status: 'OK', mode: 'plan', recipe: subject, subject: flags.service || rel(root, target), root, target: rel(root, target), wouldCreate: files.filter((f) => !exists(f)).map((f) => rel(root, f)), alreadyExists: files.filter((f) => exists(f)).map((f) => rel(root, f)), conflicts: [], warnings: [] };
      if (action === 'plan') return this.output(plan, flags.json);
      const effects = newEffects();
      const serviceDir = ensureServiceWorkspaceBaseline(root, flags, effects);
      const inv = loadInventory(serviceDir);
      updateInventoryArchitecture(serviceDir, inv, subject, flags.service || path.basename(serviceDir), normalizeEffectPaths(serviceDir, effects));
      saveInventory(serviceDir, inv);
      effects.updated.push(inventoryPath(serviceDir));
      return this.output({ status: 'OK', mode: 'apply', recipe: subject, subject: flags.service || path.basename(serviceDir), effects: normalizeEffectPaths(serviceDir, effects), currentKnowledge: { service: { root: rel(root, serviceDir), architecturePack: ARCHITECTURE_PACK.name } }, nextSuggestedIntents: ['ahre recipe apply bounded-context.ensure --context <Context> --json', 'ahre recipe apply entity.capability.ensure --entity <Entity> --context <Context> --json'] }, flags.json);
    }

    if (subject === 'bounded-context.ensure') {
      const root = serviceRoot(this.cwd, flags);
      const context = pascal(flags.context || flags.name);
      if (!context) throw new Error('bounded-context.ensure requires --context <Context>');
      const dirs = Object.values(contextDirs(root, context));
      const plan = { status: 'OK', mode: 'plan', recipe: subject, subject: context, root, wouldCreate: dirs.filter((d) => !exists(d)).map((d) => rel(root, d)), alreadyExists: dirs.filter((d) => exists(d)).map((d) => rel(root, d)), conflicts: [], warnings: [] };
      if (action === 'plan') return this.output(plan, flags.json);
      const effects = newEffects();
      ensureContextOnly(root, context, effects);
      const inv = loadInventory(root);
      inv.contexts[context] ??= { entities: [] };
      updateInventoryArchitecture(root, inv, subject, context, normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', mode: 'apply', recipe: subject, subject: context, effects: normalizeEffectPaths(root, effects), currentKnowledge: { context: inv.contexts[context] } }, flags.json);
    }

    if (subject === 'entity.capability.ensure') {
      const root = serviceRoot(this.cwd, flags);
      const entity = pascal(flags.entity);
      const context = pascal(flags.context);
      if (!entity || !context) throw new Error('--entity and --context are required');
      const plan = this.planEntityCapability({ root, entity, context, flags });
      if (action === 'plan') return this.output({ ...plan, forceJson: flags.json }, flags.json);
      return this.applyEntityCapability({ root, entity, context, flags, plan });
    }

    if (subject === 'consumer.event.ensure') {
      const root = serviceRoot(this.cwd, flags);
      const context = pascal(flags.context);
      const event = pascal(flags.event);
      const useCase = pascal(flags.usecase || flags['use-case'] || `Handle${event}`);
      const consumerName = pascal(flags.consumer || `${event}Consumer`);
      if (!context || !event) throw new Error('consumer.event.ensure requires --context and --event');
      const consumerFile = path.join(contextDirs(root, context).consumer, `${consumerName}.ts`);
      const plan = { status: 'OK', mode: 'plan', recipe: subject, subject: `${context}.${consumerName}`, wouldCreate: [consumerFile, path.join(root, 'tests', 'command', context, `${kebab(consumerName)}.feature`)].filter((f) => !exists(f)).map((f) => rel(root, f)), alreadyExists: [consumerFile].filter((f) => exists(f)).map((f) => rel(root, f)), conflicts: [], warnings: [] };
      if (action === 'plan') return this.output(plan, flags.json);
      const effects = newEffects();
      ensureConsumerArtifact(root, context, event, consumerName, useCase, effects);
      const inv = loadInventory(root);
      inv.consumers ??= {};
      inv.consumers[`${context}.${consumerName}`] = { context, event, consumerName, useCase, path: `src/${context}/Infrastructure/UI/Consumer/${consumerName}.ts`, status: 'skeleton' };
      updateInventoryArchitecture(root, inv, subject, `${context}.${consumerName}`, normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', mode: 'apply', recipe: subject, subject: `${context}.${consumerName}`, effects: normalizeEffectPaths(root, effects), currentKnowledge: { consumer: inv.consumers[`${context}.${consumerName}`] } }, flags.json);
    }

    if (subject === 'document.pdf.ensure' || subject === 'document.xlsx.ensure') {
      const root = serviceRoot(this.cwd, flags);
      const context = pascal(flags.context);
      const name = pascal(flags.name || flags.document || flags.entity);
      if (!context || !name) throw new Error(`${subject} requires --context and --name/--document`);
      const effects = newEffects();
      const isPdf = subject.includes('pdf');
      const target = isPdf ? path.join(contextDirs(root, context).infrastructure, 'Pdf', `${name}PdfRenderer.ts`) : path.join(contextDirs(root, context).infrastructure, 'Xlsx', `${name}XlsxExporter.ts`);
      const plan = { status: 'OK', mode: 'plan', recipe: subject, subject: `${context}.${name}`, wouldCreate: exists(target) ? [] : [rel(root, target)], alreadyExists: exists(target) ? [rel(root, target)] : [], conflicts: [], warnings: [] };
      if (action === 'plan') return this.output(plan, flags.json);
      if (isPdf) ensurePdfArtifact(root, context, name, effects); else ensureXlsxArtifact(root, context, name, effects);
      const inv = loadInventory(root);
      inv.documents ??= {};
      inv.documents[`${context}.${name}.${isPdf ? 'pdf' : 'xlsx'}`] = { context, name, kind: isPdf ? 'pdf' : 'xlsx', status: 'skeleton', path: rel(root, target) };
      updateInventoryArchitecture(root, inv, subject, `${context}.${name}`, normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', mode: 'apply', recipe: subject, subject: `${context}.${name}`, effects: normalizeEffectPaths(root, effects), currentKnowledge: { document: inv.documents[`${context}.${name}.${isPdf ? 'pdf' : 'xlsx'}`] } }, flags.json);
    }

    throw new Error(`Unknown recipe: ${subject}`);
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
    if (action === 'value-object' || action === 'vo') {
      const root = serviceRoot(this.cwd, flags);
      const context = pascal(flags.context);
      const name = pascal(flags.name || subject);
      const base = flags.base || (name.endsWith('Id') ? 'Uuid' : 'StringValueObject');
      if (!context || !name) throw new Error('ensure value-object requires --context and --name');
      const effects = newEffects();
      ensureValueObjectArtifact(root, context, name, base, effects);
      const inv = loadInventory(root);
      inv.valueObjects ??= {};
      inv.valueObjects[`${context}.${name}`] = { context, name, base, path: `src/${context}/Domain/ValueObject/${name}.ts`, status: 'skeleton' };
      updateInventoryArchitecture(root, inv, 'value-object.ensure', `${context}.${name}`, normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'value-object.ensure', subject: `${context}.${name}`, effects: normalizeEffectPaths(root, effects), currentKnowledge: { valueObject: inv.valueObjects[`${context}.${name}`] } }, flags.json);
    }
    if (action === 'domain-event' || action === 'event') {
      const root = serviceRoot(this.cwd, flags);
      const context = pascal(flags.context);
      const event = pascal(flags.event || flags.name || subject);
      if (!context || !event) throw new Error('ensure domain-event requires --context and --event');
      const effects = newEffects();
      ensureEventArtifact(root, context, event, effects);
      const inv = loadInventory(root);
      inv.events ??= {};
      inv.events[`${context}.${event}`] = { context, event, path: `src/${context}/Domain/Event/${event}.ts`, status: 'skeleton' };
      updateInventoryArchitecture(root, inv, 'domain-event.ensure', `${context}.${event}`, normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'domain-event.ensure', subject: `${context}.${event}`, effects: normalizeEffectPaths(root, effects), currentKnowledge: { event: inv.events[`${context}.${event}`] } }, flags.json);
    }
    if (action === 'security') {
      const root = serviceRoot(this.cwd, flags);
      const effects = newEffects();
      ensureSecurity(root, effects);
      const inv = loadInventory(root);
      updateInventoryArchitecture(root, inv, 'security.rbac.ensure', 'Shared.Security', normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'security.rbac.ensure', subject: 'Shared.Security', effects: normalizeEffectPaths(root, effects) }, flags.json);
    }
    if (action === 'messaging') {
      const root = serviceRoot(this.cwd, flags);
      const effects = newEffects();
      ensureMessaging(root, effects);
      const inv = loadInventory(root);
      updateInventoryArchitecture(root, inv, 'messaging.shared.ensure', 'Shared.Messaging', normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'messaging.shared.ensure', subject: 'Shared.Messaging', effects: normalizeEffectPaths(root, effects) }, flags.json);
    }
    if (action === 'testing') {
      const root = serviceRoot(this.cwd, flags);
      const effects = newEffects();
      ensureTestingSuite(root, effects);
      const inv = loadInventory(root);
      updateInventoryArchitecture(root, inv, 'testing.suite.ensure', 'tests', normalizeEffectPaths(root, effects));
      saveInventory(root, inv);
      effects.updated.push(inventoryPath(root));
      return this.output({ status: 'OK', intent: 'testing.suite.ensure', subject: 'tests', effects: normalizeEffectPaths(root, effects) }, flags.json);
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
    if (action === 'value-object' || action === 'vo') return await this.handleEnsure('value-object', subject, maybe, flags);
    if (action === 'event' || action === 'domain-event') return await this.handleEnsure('domain-event', subject, maybe, flags);
    if (action === 'consumer') return this.handleRecipe('apply', 'consumer.event.ensure', { ...flags, event: flags.event || subject });
    if (action === 'service') return this.handleRecipe('apply', 'architecture.service.ensure', flags);
    if (action === 'context') return this.handleRecipe('apply', 'bounded-context.ensure', { ...flags, context: flags.context || subject });
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



  handlePack(action, subject, maybe, flags) {
    if (action === 'list' || !action) return this.output({ status: 'OK', pack: ARCHITECTURE_PACK }, flags.json);
    if (action === 'show' || action === 'describe') {
      return this.output({ status: 'OK', pack: ARCHITECTURE_PACK.name, version: ARCHITECTURE_PACK.version, policies: ARCHITECTURE_PACK.policies, templates: ARCHITECTURE_PACK.templates, recipes: ARCHITECTURE_PACK.recipes, intents: ARCHITECTURE_PACK.intents }, flags.json);
    }
    if (action === 'export') {
      const root = serviceRoot(this.cwd, flags);
      const to = flags.to || flags.path || '.ahre/architecture-packs';
      const dir = path.resolve(root, to, ARCHITECTURE_PACK.name);
      ensureDir(dir);
      writeJson(path.join(dir, 'pack.json'), ARCHITECTURE_PACK);
      for (const item of ARCHITECTURE_PACK.templates) writeJson(path.join(dir, 'templates', `${item.name}.json`), item);
      for (const item of ARCHITECTURE_PACK.recipes) writeJson(path.join(dir, 'recipes', `${item.name}.json`), item);
      for (const item of ARCHITECTURE_PACK.intents) writeJson(path.join(dir, 'intents', `${item.name}.json`), item);
      return this.output({ status: 'OK', action: 'EXPORTED', pack: ARCHITECTURE_PACK.name, path: rel(root, dir) }, flags.json);
    }
    throw new Error(`Unknown pack action: ${action}`);
  }

  handleTemplate(action, subject, maybe, flags) {
    if (action === 'list') return this.output({ status: 'OK', pack: ARCHITECTURE_PACK.name, templates: ARCHITECTURE_PACK.templates }, flags.json);
    if (action === 'show' || action === 'describe') {
      const template = ARCHITECTURE_PACK.templates.find((item) => item.name === subject);
      if (!template) return this.output({ status: 'NOT_FOUND', template: subject }, flags.json);
      return this.output({ status: 'OK', pack: ARCHITECTURE_PACK.name, template }, flags.json);
    }
    throw new Error(`Unknown template action: ${action}`);
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
        if (/from ['"](?:\.\.\/){4,}/.test(text)) {
          issues.push({ severity: 'minor', file: relative, rule: 'possible-cross-boundary-relative-import' });
        }
      }
    }
    const inv = loadInventory(root);
    return this.output({ status: issues.length ? 'WARNING' : 'OK', check: 'architecture', issues, inventory: { path: rel(root, inventoryPath(root)), entities: Object.keys(inv.entities).length } }, flags.json);
  }
}
