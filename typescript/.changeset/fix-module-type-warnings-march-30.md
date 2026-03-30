---
"@x402/core": patch
"@x402/stellar": patch
"@x402/aptos": patch
"@x402/svm": patch
"@x402/evm": patch
"@x402/extensions": patch
"@x402/mcp": patch
"@x402/express": patch
"@x402/fetch": patch
"@x402/hono": patch
"@x402/axios": patch
"@x402/fastify": patch
"x402": patch
"x402-express": patch
"x402-axios": patch
"x402-fetch": patch
"x402-hono": patch
---

fix: resolve MODULE_TYPELESS_PACKAGE_JSON warnings by adding "type": "module"

Fixed 17 MODULE_TYPELESS_PACKAGE_JSON warnings during ESLint execution by adding "type": "module" to package.json files where eslint.config.js uses ES module syntax. Node.js was treating config files as CommonJS by default, then reparsing as ES modules, causing performance warnings.

This eliminates developer experience friction and console noise during development while improving build performance by removing unnecessary parsing overhead. Maintains full backward compatibility with dual CommonJS/ES module exports via existing export configurations.