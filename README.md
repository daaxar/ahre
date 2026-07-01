# AhRE CLI — ArcHitecture Recipe Engine

AhRE is a CLI-first Architecture Recipe Engine for LLM-assisted software delivery.

It does not ask the model to generate repetitive boilerplate. The model declares desired architectural capabilities and AhRE converges the repository toward that state with idempotent recipes, semantic inventory, AST-aware edits, and low-token JSON reports.

## Version 0.2 highlights

- Macro-to-micro composable intents.
- `plan` before `apply` for large recipes.
- `ensure` semantics for idempotent convergence.
- `ts-morph` support for TypeScript method insertion.
- Fallback text patching when `ts-morph` is not installed.
- Semantic inventory for low-token LLM context.
- Dependency graph generation for future build-cache workflows.
- `build plan` primitive for affected-file analysis.
- `search code` over graph + inventory.
- Agent-friendly `code` namespace aliases.
- Compact JSON output designed for agents.

## Install locally

```bash
npm install
npm install -g .
```

Or run directly:

```bash
node ./bin/ahre.mjs --help
```

`ts-morph` is declared as a dependency. After `npm install`, AhRE uses AST patching for supported TypeScript micro-intents.

## Core commands

### Discover available intents

```bash
ahre intents list --json
ahre intents search entity --json
ahre intents describe entity.capability.ensure --json
```

### Plan a macro recipe

```bash
ahre recipe plan entity.capability.ensure \
  --entity User \
  --context Users \
  --json
```

### Apply a macro recipe

```bash
ahre recipe apply entity.capability.ensure \
  --entity User \
  --context Users \
  --json
```

This ensures, when missing:

- shared `AggregateRoot` and `Uuid` base classes;
- bounded context folders;
- `User` aggregate skeleton;
- `UserId` value object;
- `UserRepository` domain interface;
- `CreateUser` application use case;
- `UserController` HTTP adapter;
- `MongoUserRepository` persistence adapter;
- `UserWasCreated` domain event;
- Jest and Cucumber skeleton tests;
- DI placeholder in `config/container/services.yaml`;
- `.ahre/inventory.json` semantic inventory.

### Use the `code` namespace

The `code` namespace is an agent-friendly alias over recipe and ensure primitives.

```bash
ahre code capability --entity User --context Users --json
ahre code method --entity User --context Users --method changeEmail --json
```

### Add a micro-intent later with AST support

```bash
ahre ensure method \
  --entity User \
  --context Users \
  --method changeEmail \
  --kind behavior \
  --params "email: UserEmail" \
  --returns void \
  --json
```

When `ts-morph` is installed, AhRE edits the class through the TypeScript AST. If `ts-morph` is unavailable, AhRE falls back to conservative text patching and reports a warning.

### Query semantic inventory

```bash
ahre inventory get entity Users.User --json
ahre inventory list entities --json
```

### Build dependency graph

```bash
ahre graph build --json
ahre graph get file src/Users/Domain/Model/User.ts --json
ahre graph affected src/Users/Domain/Model/User.ts --json
```

The graph is stored at:

```txt
.ahre/graph.json
```

It contains:

- files;
- hashes;
- imports;
- reverse dependencies;
- classes;
- methods;
- symbols;
- preliminary cache keys.

### Plan affected build scope

```bash
ahre build plan --changed src/Users/Domain/Model/User.ts --json
```

This does not compile yet. It returns the impacted files and cache keys that a future cached build executor can use.

### Search code and inventory

```bash
ahre search code User --json
```

### Verify architecture cheaply

```bash
ahre verify architecture --json
```

## Design principles

### Recipes are convergent

A recipe describes desired state. AhRE creates missing artifacts, leaves valid existing artifacts alone, patches only safe placeholders, and blocks on conflicts.

### Everything is an intent

A macro recipe and a micro action are both intents. A macro intent can call component intents, which can call internal intents.

### Inventory is context for LLMs

Every apply command returns:

- effects: created, updated, existing, skipped, blocked;
- inventory delta;
- current semantic knowledge;
- suggested next intents.

The LLM should not reread the whole repository when it can query inventory.

### Graph is context for build and navigation

The dependency graph starts early because it is useful before a full build cache exists. It lets agents answer:

- what imports this file;
- what classes and methods exist;
- what files are affected by a change;
- what cache keys could be used later.

### Inventory is not the source of truth

The source of truth remains code. Inventory and graph files are caches that can be rebuilt or verified.

## Example flow

```bash
mkdir demo-service
cd demo-service
ahre recipe plan entity.capability.ensure --entity User --context Users --json
ahre recipe apply entity.capability.ensure --entity User --context Users --json
ahre ensure method --entity User --context Users --method changeEmail --params "email: UserEmail" --json
ahre graph build --json
ahre build plan --changed src/Users/Domain/Model/User.ts --json
ahre search code User --json
ahre inventory get entity Users.User --json
ahre verify architecture --json
```
