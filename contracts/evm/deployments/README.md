# x402 Permit2 Proxy Deterministic Deployments

This directory contains the raw creation bytecode (init code) and salts needed to deploy x402 Permit2 Proxies to their canonical deterministic addresses on any EVM chain.

## Problem Statement

The x402 Permit2 Proxy contracts use CREATE2 with vanity-mined salts to deploy to deterministic addresses across all EVM chains:

- **x402ExactPermit2Proxy**: `0x402085c248eea27d92e8b30b2c58ed07f9e20001`
- **x402UptoPermit2Proxy**: `0x402039b3d6e6bec5a02c2c9fd937ac17a6940002`

However, reproducing these deployments requires the **exact init code hash** that was used during vanity address mining. Solidity's CBOR metadata (appended to creation bytecode) includes compiler environment details that vary between builds, making local compilation produce different init code hashes.

## Solution

This directory provides the raw creation bytecode that produces the correct init code hashes for the canonical vanity addresses.

## Files

| File | Purpose |
|------|---------|
| `x402ExactPermit2Proxy.initcode` | Raw init code (creation bytecode + constructor args) for x402ExactPermit2Proxy |
| `x402ExactPermit2Proxy.salt` | Vanity-mined salt for x402ExactPermit2Proxy |
| `x402UptoPermit2Proxy.initcode` | Raw init code (creation bytecode + constructor args) for x402UptoPermit2Proxy |
| `x402UptoPermit2Proxy.salt` | Vanity-mined salt for x402UptoPermit2Proxy |

## Deployment Instructions

### Prerequisites

1. **CREATE2 Deployer**: Arachnid's deterministic deployer must be available at `0x4e59b44847b379578588920cA78FbF26c0B4956C`
2. **Permit2**: Canonical Permit2 must be deployed at `0x000000000022D473030F116dDEE9F6B43aC78BA3`

### Deploy x402ExactPermit2Proxy

```bash
# Using cast (from foundry)
cast send 0x4e59b44847b379578588920cA78FbF26c0B4956C \
  "$(cat deployments/x402ExactPermit2Proxy.salt)$(cat deployments/x402ExactPermit2Proxy.initcode)" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Expected deployment address: 0x402085c248eea27d92e8b30b2c58ed07f9e20001
```

### Deploy x402UptoPermit2Proxy

```bash
# Using cast (from foundry)
cast send 0x4e59b44847b379578588920cA78FbF26c0B4956C \
  "$(cat deployments/x402UptoPermit2Proxy.salt)$(cat deployments/x402UptoPermit2Proxy.initcode)" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Expected deployment address: 0x402039b3d6e6bec5a02c2c9fd937ac17a6940002
```

### Verification

After deployment, verify the contracts are deployed to the correct addresses:

```bash
# Check x402ExactPermit2Proxy
cast code 0x402085c248eea27d92e8b30b2c58ed07f9e20001 --rpc-url $RPC_URL

# Check x402UptoPermit2Proxy  
cast code 0x402039b3d6e6bec5a02c2c9fd937ac17a6940002 --rpc-url $RPC_URL
```

Both should return non-empty bytecode.

### Verify Contract Functionality

```bash
# Verify Permit2 address is correctly set
cast call 0x402085c248eea27d92e8b30b2c58ed07f9e20001 "PERMIT2()" --rpc-url $RPC_URL
# Should return: 0x000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3

cast call 0x402039b3d6e6bec5a02c2c9fd937ac17a6940002 "PERMIT2()" --rpc-url $RPC_URL  
# Should return: 0x000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3
```

## Technical Details

### Contract Constructor

Both proxy contracts take a single constructor argument:
- `permit2` (address): The canonical Permit2 address (`0x000000000022D473030F116dDEE9F6B43aC78BA3`)

### CREATE2 Calculation

The deployment address is calculated as:
```
address = keccak256(0xff ++ deployerAddress ++ salt ++ keccak256(initCode))[12:]
```

Where:
- `deployerAddress`: `0x4e59b44847b379578588920cA78FbF26c0B4956C` (Arachnid's CREATE2 deployer)
- `salt`: The vanity-mined salt from the `.salt` files
- `initCode`: The raw bytecode from the `.initcode` files

### Network Compatibility

This approach works on any EVM chain where:
1. Arachnid's CREATE2 deployer is available
2. Permit2 is deployed at the canonical address
3. The chain ID doesn't affect bytecode generation

## Generating Init Code (Advanced)

If you need to regenerate init code (e.g., for contract modifications):

```bash
# Build contracts
forge build

# Extract init code using the provided script
forge script script/ExtractInitCode.s.sol --ffi
```

Note: The generated init code will likely have different hashes due to compiler metadata, requiring new vanity salt mining for deterministic addresses.

## References

- [CREATE2 Deployer](https://github.com/Arachnid/deterministic-deployment-proxy)
- [Permit2 Documentation](https://github.com/Uniswap/permit2)
- [EIP-1014: Skinny CREATE2](https://eips.ethereum.org/EIPS/eip-1014)

## Troubleshooting

### "CREATE2 deployer not found"
The Arachnid CREATE2 deployer needs to be deployed on the target chain first. See the [deployment instructions](https://github.com/Arachnid/deterministic-deployment-proxy).

### "Permit2 not found" 
Permit2 must be deployed before the x402 proxies. Follow the [canonical Permit2 deployment](https://github.com/Uniswap/permit2#deployment-addresses).

### "Deployment failed"
- Check that you have sufficient ETH for gas
- Verify the init code files are complete and correctly formatted
- Ensure the salt files contain exactly 64 hex characters (no 0x prefix)

### "Wrong deployment address"
If the deployed address doesn't match the expected canonical address, it means:
- The init code hash doesn't match what was used for vanity mining
- There may be a discrepancy in the constructor arguments or bytecode
- Verify the files in this directory match the original vanity mining setup