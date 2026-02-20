# Aptos Migration Guide for x402

This guide helps developers migrate existing EVM-based x402 applications to Aptos or build new applications using Aptos support in x402.

## Overview

x402 now supports Aptos alongside Ethereum Virtual Machine (EVM) chains. Aptos offers several advantages:

- **Native sponsored transactions**: Facilitators can pay gas fees for users
- **Lower transaction costs**: Significantly cheaper than most EVM chains
- **Fast finality**: ~1-2 second transaction finality
- **Fungible Asset standard**: Native support for custom tokens

## Network Information

### Supported Networks

| Network | ID | Description | RPC Endpoint |
|---------|----|-----------|-----------| 
| Aptos Mainnet | `aptos:1` | Production network | `https://fullnode.mainnet.aptoslabs.com/v1` |
| Aptos Testnet | `aptos:2` | Testing network | `https://fullnode.testnet.aptoslabs.com/v1` |

### Asset Information

| Asset | Network | Contract Address | Decimals |
|-------|---------|----------------|----------|
| USDC | `aptos:1` | `0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC` | 6 |
| USDC | `aptos:2` | `0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC` | 6 |
| APT | Both | `0x1::aptos_coin::AptosCoin` | 8 |

## Installation

### New Installation

```bash
# Install Aptos support
npm install @x402/aptos @x402/core @aptos-labs/ts-sdk

# For full-stack projects, also install server components
npm install @x402/core/server
```

### Adding to Existing EVM Project

```bash
# Add Aptos support alongside existing EVM support
npm install @x402/aptos @aptos-labs/ts-sdk
```

## Migration Patterns

### Client Migration

#### From EVM Client

```typescript
// Before: EVM client setup
import { X402Client } from "@x402/core";
import { ExactEvmScheme } from "@x402/mechanisms-evm";
import { createWalletClient } from "viem";

const evmClient = new X402Client({
  schemes: [new ExactEvmScheme({ publicClient, walletClient })],
});
```

```typescript
// After: Aptos client setup
import { X402Client } from "@x402/core";
import { ExactAptosScheme } from "@x402/aptos";
import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Create Aptos account
const privateKey = new Ed25519PrivateKey(process.env.PRIVATE_KEY);
const account = Account.fromPrivateKey({ privateKey });

// Create Aptos client
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

const aptosClient = new X402Client({
  schemes: [new ExactAptosScheme(account, aptos)],
});
```

#### Multi-Chain Support (EVM + Aptos)

```typescript
import { X402Client } from "@x402/core";
import { ExactEvmScheme } from "@x402/mechanisms-evm";
import { ExactAptosScheme } from "@x402/aptos";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// EVM setup
const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ chain: base, transport: http() });

// Aptos setup  
const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY);
const aptosAccount = Account.fromPrivateKey({ privateKey });
const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }));

// Multi-chain client
const client = new X402Client({
  schemes: [
    new ExactEvmScheme({ publicClient, walletClient }),
    new ExactAptosScheme(aptosAccount, aptos)
  ],
});

// Usage automatically routes to appropriate scheme based on payment requirements
const response = await client.get('https://api.example.com/data'); // Uses best available scheme
```

### Server Migration

#### From EVM Server

```typescript
// Before: EVM server
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const server = new x402ResourceServer(facilitatorClient)
  .register("eip155:8453", new ExactEvmScheme());
```

```typescript
// After: Aptos server
import { x402ResourceServer } from "@x402/core/server";
import { ExactAptosScheme } from "@x402/aptos/exact/server";
import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Create facilitator account
const privateKey = new Ed25519PrivateKey(process.env.FACILITATOR_PRIVATE_KEY);
const account = Account.fromPrivateKey({ privateKey });
const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }));

const server = new x402ResourceServer(facilitatorClient)
  .register("aptos:1", new ExactAptosScheme(account, aptos));
```

#### Multi-Chain Server

```typescript
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactAptosScheme } from "@x402/aptos/exact/server";

const server = new x402ResourceServer(facilitatorClient)
  .register("eip155:8453", new ExactEvmScheme()) // Base mainnet
  .register("aptos:1", new ExactAptosScheme(aptosAccount, aptos)); // Aptos mainnet

// Route configuration now supports both networks
const routes = {
  "GET /data": {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453", // Base
        price: "$0.01",
        payTo: evmAddress,
      },
      {
        scheme: "exact", 
        network: "aptos:1", // Aptos mainnet
        price: "$0.005", // Cheaper on Aptos
        payTo: aptosAddress,
      },
    ],
  },
};
```

## Key Differences from EVM

### 1. Address Format

```typescript
// EVM addresses (20 bytes, hex-encoded)
const evmAddress = "0x742d35Cc6B842C1F3F094A7dd2395BD3eCF8FBF3";

// Aptos addresses (32 bytes, hex-encoded, can be shortened)
const aptosAddress = "0x1"; // System address
const longAptosAddress = "0x742d35cc6b842c1f3f094a7dd2395bd3ecf8fbf30000000000000000000000000";
```

### 2. Private Key Management

```typescript
// EVM (uses viem)
import { privateKeyToAccount } from "viem/accounts";
const evmAccount = privateKeyToAccount('0x...');

// Aptos (uses Aptos SDK)
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
const privateKey = new Ed25519PrivateKey('0x...');
const aptosAccount = Account.fromPrivateKey({ privateKey });
```

### 3. Gas and Fees

```typescript
// EVM: Users pay gas in ETH
// Gas estimation required, can fail due to insufficient funds

// Aptos: Facilitators can sponsor transactions  
// Users only pay the x402 service fee, not blockchain gas
```

### 4. Transaction Speed

| Chain | Typical Confirmation Time |
|-------|-------------------------|
| Ethereum | 12 seconds |  
| Base | 2 seconds |
| Aptos | 1-2 seconds |

## Common Migration Issues

### 1. Private Key Format Differences

**Problem**: EVM private keys may not work directly with Aptos
**Solution**: Ensure proper key derivation

```typescript
// Generate new Aptos key pair
import { Account } from "@aptos-labs/ts-sdk";

// Option 1: Generate new account
const newAccount = Account.generate();
console.log('Private Key:', newAccount.privateKey.toString());
console.log('Address:', newAccount.accountAddress.toString());

// Option 2: Convert from existing entropy
const privateKeyHex = "0x" + "your-64-char-hex-string";
const privateKey = new Ed25519PrivateKey(privateKeyHex);
const account = Account.fromPrivateKey({ privateKey });
```

### 2. Network Configuration

**Problem**: Hardcoded EVM network IDs
**Solution**: Abstract network configuration

```typescript
interface NetworkConfig {
  id: string;
  rpcUrl: string;
  nativeCurrency: string;
  blockExplorer: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
  "eip155:8453": {
    id: "eip155:8453",
    rpcUrl: "https://mainnet.base.org",
    nativeCurrency: "ETH", 
    blockExplorer: "https://basescan.org"
  },
  "aptos:1": {
    id: "aptos:1", 
    rpcUrl: "https://fullnode.mainnet.aptoslabs.com/v1",
    nativeCurrency: "APT",
    blockExplorer: "https://explorer.aptoslabs.com"
  }
};
```

### 3. Amount/Precision Handling

**Problem**: Different decimal precision between chains
**Solution**: Use x402's built-in price parsing

```typescript
// Both work the same way thanks to x402 abstraction
const routes = {
  "GET /data": {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        price: "$0.01", // Automatically converted to 10000 USDC (6 decimals)
        payTo: evmAddress,
      },
      {
        scheme: "exact",
        network: "aptos:1", 
        price: "$0.01", // Automatically converted to 10000 USDC (6 decimals)  
        payTo: aptosAddress,
      },
    ],
  },
};
```

## Testing on Testnet

### 1. Get Test Tokens

```bash
# Test APT from faucet
curl -X POST "https://faucet.testnet.aptoslabs.com/mint" \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_APTOS_ADDRESS", "amount": 100000000}'

# Test USDC from Circle faucet
# Visit: https://faucet.circle.com/
```

### 2. Testnet Configuration

```typescript
import { AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Switch to testnet for development
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Use testnet network ID
const routes = {
  "GET /test": {
    accepts: [{
      scheme: "exact",
      network: "aptos:2", // Testnet
      price: "$0.001",
      payTo: testnetAddress,
    }],
  },
};
```

### 3. Integration Testing

```typescript
// Test script example
import { X402Client } from "@x402/core";
import { ExactAptosScheme } from "@x402/aptos";

async function testAptosPayment() {
  const client = new X402Client({
    schemes: [new ExactAptosScheme(testAccount, testAptos)],
  });

  try {
    const response = await client.get('http://localhost:3000/test');
    console.log('✅ Aptos payment successful:', response.data);
  } catch (error) {
    console.error('❌ Payment failed:', error);
  }
}
```

## Performance Considerations

### 1. Transaction Costs

| Operation | EVM (Base) | Aptos | Savings |
|-----------|------------|-------|---------|
| USDC Transfer | ~$0.001 | ~$0.0001 | 90% |
| Contract Call | ~$0.002 | ~$0.0002 | 90% |

### 2. Speed Comparison

| Metric | EVM | Aptos |
|--------|-----|-------|
| Block Time | 2s | 1s |
| Finality | 2-6s | 1-2s |
| TPS | 10-50 | 130+ |

### 3. Sponsored Transactions

```typescript
// Aptos advantage: facilitators can pay gas for users
// Users only pay the service fee, not blockchain gas
// This reduces barriers to adoption significantly

const aptosScheme = new ExactAptosScheme(facilitatorAccount, aptos);
// Facilitator automatically pays gas fees for user transactions
```

## Best Practices

### 1. Multi-Chain Route Design

```typescript
// Offer both options, let clients choose
const routes = {
  "POST /analyze": {
    accepts: [
      {
        scheme: "exact",
        network: "aptos:1",    
        price: "$0.005",       // Cheaper on Aptos
        payTo: aptosAddress,
      },
      {
        scheme: "exact",
        network: "eip155:8453", // Base fallback
        price: "$0.01",        // Higher price due to gas costs
        payTo: evmAddress,
      },
    ],
    description: "Data analysis (prefer Aptos for lower cost)",
  },
};
```

### 2. Error Handling

```typescript
try {
  const response = await client.get('/protected-endpoint');
} catch (error) {
  if (error.response?.status === 402) {
    // Check which payment methods are available
    const paymentRequirements = error.response.headers['payment-required'];
    // Guide users to supported networks they have accounts for
  }
}
```

### 3. Environment Configuration

```typescript
// Environment-based network selection
const NETWORK_CONFIG = {
  development: {
    aptos: "aptos:2", // testnet
    evm: "eip155:84532", // base sepolia  
  },
  production: {
    aptos: "aptos:1", // mainnet
    evm: "eip155:8453", // base mainnet
  }
};

const config = NETWORK_CONFIG[process.env.NODE_ENV || 'development'];
```

## Troubleshooting

### Common Errors

#### 1. "Account not found on chain"
```
Error: Account 0x... does not exist on chain
```
**Solution**: Fund the account with test APT or USDC first

#### 2. "Insufficient gas"  
```
Error: Insufficient gas for transaction
```
**Solution**: Ensure facilitator account has enough APT for gas sponsoring

#### 3. "Invalid network ID"
```
Error: Unsupported network: aptos:3
```
**Solution**: Use `aptos:1` (mainnet) or `aptos:2` (testnet)

### Debug Tools

```typescript
// Enable debug logging
const client = new X402Client({
  schemes: [aptosScheme],
  debug: true, // Shows detailed payment flow
});

// Check account balance
const balance = await aptos.getAccountAPTAmount({
  accountAddress: account.accountAddress,
});
console.log('Account balance:', balance);

// Verify account exists
try {
  const accountData = await aptos.getAccountInfo({
    accountAddress: account.accountAddress,  
  });
  console.log('Account exists:', accountData);
} catch (error) {
  console.log('Account not found, needs funding');
}
```

## Migration Checklist

- [ ] **Dependencies**: Install `@x402/aptos` and `@aptos-labs/ts-sdk`  
- [ ] **Accounts**: Create/import Aptos accounts for clients and facilitators
- [ ] **Network Config**: Update network IDs (`aptos:1` or `aptos:2`)
- [ ] **Routes**: Add Aptos payment options to server routes
- [ ] **Testing**: Test on Aptos testnet with test tokens
- [ ] **Error Handling**: Update error handling for Aptos-specific errors
- [ ] **Documentation**: Update API docs with Aptos payment options
- [ ] **Monitoring**: Add Aptos transaction monitoring

## Further Resources

- [Aptos Developer Documentation](https://aptos.dev/)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [x402 Core Documentation](./README.md)
- [Aptos Explorer](https://explorer.aptoslabs.com/)
- [Test Token Faucets](https://aptos.dev/network/faucet)

## Support

For Aptos-specific x402 questions:
- [x402 GitHub Issues](https://github.com/coinbase/x402/issues)
- [x402 Discord Community](#)

For general Aptos development:
- [Aptos Discord](https://discord.gg/aptoslabs)
- [Aptos Forum](https://forum.aptoslabs.com/)