# Extracting Original Init Code

## Problem

The current build environment produces different init code hashes than those used to mine the original vanity salts:

| Contract | Current Build Hash | Vanity Mining Hash | Expected Address |
|----------|-------------------|-------------------|------------------|
| x402ExactPermit2Proxy | `0x84571af86df...` | `Unknown` | `0x402085c248eea27d92e8b30b2c58ed07f9e20001` |
| x402UptoPermit2Proxy | `TBD` | `Unknown` | `0x402039b3d6e6bec5a02c2c9fd937ac17a6940002` |

## Solution Approach

To extract the original init code, we need to reverse-engineer it from existing deployments:

### Method 1: From Live Deployments

If the contracts are already deployed on any EVM chain:

```bash
# Find a chain where the contracts are deployed
# Extract the deployment transaction
cast tx <deployment_tx_hash> --rpc-url <rpc_url>

# The 'input' field contains: salt + init code
# Extract init code by removing the first 32 bytes (salt)
```

### Method 2: From Original Build Environment

If we can access the original build environment:
- Use the exact same compiler version, settings, and file paths
- Run the `ExtractInitCode.s.sol` script
- Verify the generated addresses match the expected vanity addresses

### Method 3: Vanity Salt Mining Records

If vanity mining logs are available:
- The mining process should have recorded the init code hash used
- Use that hash to reconstruct or verify the init code

## Current Status

**NEEDED**: Someone with access to the original build environment or deployment transaction data to provide the correct init code files.

## Files to Generate

Once the original init code is obtained:

```
deployments/
├── x402ExactPermit2Proxy.initcode    # Raw hex (no 0x prefix)
├── x402ExactPermit2Proxy.salt        # 32-byte hex (no 0x prefix)
├── x402UptoPermit2Proxy.initcode     # Raw hex (no 0x prefix)
├── x402UptoPermit2Proxy.salt         # 32-byte hex (no 0x prefix)
└── README.md                         # Deployment instructions
```

## Verification

After obtaining the init code files, verify they produce the correct addresses:

```solidity
// In ExtractInitCode.s.sol or a separate verification script
bytes memory initCode = hex"<initcode_from_file>";
bytes32 salt = hex"<salt_from_file>";
bytes32 initCodeHash = keccak256(initCode);
address expectedAddress = address(uint160(uint256(keccak256(
    abi.encodePacked(
        bytes1(0xff), 
        CREATE2_DEPLOYER, 
        salt, 
        initCodeHash
    )
))));
// Should match vanity addresses
```