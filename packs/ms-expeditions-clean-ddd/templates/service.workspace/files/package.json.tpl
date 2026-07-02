{
  "name": "{{service}}",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "coverage": "jest --coverage"
  },
  "dependencies": {
    "express": "^5.1.0",
    "routing-controllers": "^0.11.3",
    "node-dependency-injection": "^3.2.2",
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "jest": "^30.0.0",
    "ts-jest": "^29.2.5",
    "@types/node": "^20.0.0",
    "@types/express": "^5.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
