---
"@x402/core": patch
"@x402/extensions": patch
"@x402/evm": patch
"@x402/svm": patch
"@x402/stellar": patch
"@x402/aptos": patch
"@x402/fetch": patch
"@x402/axios": patch
"@x402/express": patch
"@x402/hono": patch
"@x402/mcp": patch
"x402": patch
"x402-express": patch
"x402-hono": patch
"x402-axios": patch
"x402-fetch": patch
---

fix: eliminate remaining MODULE_TYPELESS_PACKAGE_JSON warnings

Added "type": "module" to 16 additional package.json files across core, mechanism, HTTP, and legacy package groups to resolve MODULE_TYPELESS_PACKAGE_JSON warnings during ESLint execution. Node.js was treating config files as CommonJS by default, then reparsing as ES modules, causing performance warnings.

This change eliminates developer experience friction and console noise during development, improving build performance by removing unnecessary parsing overhead. Maintains full backward compatibility with existing dual CommonJS/ES module exports.

Affected packages:
- @x402/core, @x402/extensions, @x402/fetch, @x402/axios, @x402/express, @x402/hono, @x402/mcp
- @x402/evm, @x402/svm, @x402/stellar, @x402/aptos (mechanisms)
- x402, x402-express, x402-hono, x402-axios, x402-fetch (legacy packages)