# Python Integration Tests

These integration tests verify the end-to-end x402 payment flows with real
mechanism implementations. The EVM and SVM tests can submit **real on-chain
transactions** when configured with private keys; without configuration they
skip cleanly.

## Test Overview

### Always Run (no configuration required)
- `test_core.py` - Core x402 client / resource server / facilitator flow against mock cash, parameterized for sync and async classes.
- `test_http_integration.py` - HTTP layer integration with mock cash.
- `test_async_behavior.py` - Async-specific behavior (hooks, timeouts).

### Require Configuration (skip if env vars are missing)
- `test_evm.py` - EVM payment flow on Base Sepolia (sync classes).
- `test_mcp_evm.py` - MCP server payment flow on Base Sepolia.
- `test_svm.py` - SVM payment flow on Solana Devnet (sync classes).

## Running Tests

### Without Configuration (Mock Tests Only)

From `python/x402/`:

```bash
uv run pytest tests/integrations
```

EVM/SVM/MCP suites that require keys will be skipped with a clear reason; the
rest run unmodified.

### With Configuration (All Tests + Real Transactions)

```bash
cp .env.example .env
# Edit .env with testnet-only keys and addresses

uv run pytest tests/integrations
```

`tests/conftest.py` automatically loads `python/x402/.env` (or a `.env` at the
repo root) before the suite runs, so no `source` step is required.

To run a single suite:

```bash
uv run pytest tests/integrations/test_evm.py
uv run pytest tests/integrations/test_svm.py
```

## Configuration

Copy `python/x402/.env.example` to `python/x402/.env`, then fill in
testnet-only values:

```bash
# EVM (Base Sepolia)
EVM_CLIENT_PRIVATE_KEY=<hex_private_key_with_or_without_0x>
EVM_FACILITATOR_PRIVATE_KEY=<hex_private_key_with_or_without_0x>
EVM_RPC_URL=https://sepolia.base.org

# SVM (Solana Devnet)
SVM_CLIENT_PRIVATE_KEY=<base58_private_key>
SVM_FACILITATOR_PRIVATE_KEY=<base58_private_key>
SVM_RPC_URL=https://api.devnet.solana.com
```

Both EVM accounts must be funded with Base Sepolia ETH (gas) and USDC. Both
SVM accounts must be funded with Devnet SOL (gas) and Devnet USDC.

### Funding Testnet Accounts

- **Base Sepolia ETH:** https://www.alchemy.com/faucets/base-sepolia
- **Base Sepolia USDC:** https://faucet.circle.com/
- **Solana Devnet SOL:** `solana airdrop 1 <address> --url devnet`
- **Solana Devnet USDC:** https://faucet.circle.com/ (select Solana Devnet)

## Security Notes

- **NEVER** commit real private keys to git. The repository's root `.gitignore` already excludes `.env` files; only `.env.example` should be tracked.
- Use **testnet keys only**, with no real value. The EVM tests run on Base Sepolia and the SVM tests run on Solana Devnet.
- The mock-cash tests in `test_core.py`, `test_http_integration.py`, and `test_async_behavior.py` perform no on-chain activity and are safe to run anywhere.
