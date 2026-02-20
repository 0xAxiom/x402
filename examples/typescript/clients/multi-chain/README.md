# Multi-Chain x402 Client Example

This example demonstrates how to build x402 clients that seamlessly support both EVM (Ethereum Virtual Machine) and Aptos blockchains, with automatic optimal payment method selection.

## Overview

The multi-chain client provides:

- **Dual blockchain support**: EVM (Base) + Aptos in a single application
- **Automatic cost optimization**: Selects cheapest payment option available
- **Transparent failover**: Falls back between chains if one is unavailable  
- **Performance analysis**: Real-time cost and speed comparisons
- **Production patterns**: Error handling, configuration management, monitoring

## Key Benefits

### Cost Savings
```
Payment Amount: $0.01
├─ Base Mainnet: $0.011 (service + gas)
└─ Aptos Mainnet: $0.0101 (service + gas) ← 91% savings
```

### Speed Improvements
```
Transaction Confirmation:
├─ Base: ~2 seconds
└─ Aptos: ~1 second ← 50% faster
```

### Sponsored Transactions
On Aptos, facilitators can pay gas fees for users, reducing barriers to adoption.

## Prerequisites

- Node.js 18+
- Private keys for supported chains:
  - **EVM**: Base mainnet private key with ETH for gas
  - **Aptos**: Aptos mainnet private key with APT for gas (if not using sponsored transactions)

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   # Copy and edit environment file
   cp .env.example .env
   ```

3. **Set up wallets:**
   ```bash
   # Required: At least one blockchain private key
   EVM_PRIVATE_KEY=0x...        # Base mainnet private key
   APTOS_PRIVATE_KEY=0x...      # Aptos mainnet private key
   
   # Optional: Network preferences  
   APTOS_NETWORK=mainnet        # or "testnet"
   BASE_RPC_URL=https://...     # Custom RPC endpoint
   
   # Optional: Test endpoints
   EVM_TEST_ENDPOINT=http://localhost:3000/evm-only
   APTOS_TEST_ENDPOINT=http://localhost:3000/aptos-only
   MULTI_CHAIN_ENDPOINT=http://localhost:3000/multi-chain
   ```

4. **Run the example:**
   ```bash
   pnpm start
   ```

## Example Output

```
🚀 Multi-Chain x402 Client
Initializing support for EVM and Aptos blockchains

🔗 Initializing EVM support...
✅ EVM support initialized
   Address: 0x742d35Cc6B842C1F3F094A7dd2395BD3eCF8FBF3
   Chain: Base

🪙 Initializing Aptos support...
✅ Aptos connectivity verified
✅ Aptos support initialized
   Address: 0x742d35cc6b842c1f3f094a7dd2395bd3ecf8fbf30000000000000000000000000
   Network: Aptos Mainnet

💼 Wallet Setup Summary
══════════════════════════════════════════════════
✅ EVM Support Enabled
   Address: 0x742d35Cc6B842C1F3F094A7dd2395BD3eCF8FBF3
   Chain: Base
✅ Aptos Support Enabled
   Address: 0x742d35cc6b842c1f3f094a7dd2395bd3ecf8fbf30000000000000000000000000
   Network: Aptos Mainnet

🌐 Supported Networks (4)
   • Base Mainnet (eip155:8453)
   • Base Sepolia (eip155:84532)
   • Aptos Mainnet (aptos:1)
   • Aptos Testnet (aptos:2)

💰 Cost Comparison Analysis
══════════════════════════════════════════════════════════════════════
Amount    Base Mainnet   Base Sepolia   Aptos Mainnet  Aptos Testnet  
──────────────────────────────────────────────────────────────────────
$0.001    $0.0110        $0.0110        $0.0011        $0.0011        
$0.010    $0.0200        $0.0200        $0.0101        $0.0101        
$0.100    $0.1100        $0.1100        $0.1001        $0.1001        
$1.000    $1.0100        $1.0100        $1.0001        $1.0001        
──────────────────────────────────────────────────────────────────────
* Includes estimated gas costs
💡 Aptos offers significant cost savings for small payments

🌐 Making request to: http://localhost:3000/multi-chain
💰 Payment required - analyzing options:
   Option 1: Aptos Mainnet
     Price: $0.005
     Total cost: $0.0051
     Speed: ~1s confirmation
   Option 2: Base Mainnet  
     Price: $0.01
     Total cost: $0.011
     Speed: ~2s confirmation
✅ Payment completed via Aptos Mainnet
```

## Usage Patterns

### Basic Multi-Chain Client

```typescript
import { MultiChainX402Client } from './index';

const client = new MultiChainX402Client();
await client.initialize();

// Makes request using optimal payment method automatically
const response = await client.makeRequest('https://api.example.com/data');
```

### With Chain Preference

```typescript
// Prefer Aptos for cost savings
const response = await client.makeRequest(
  'https://api.example.com/data',
  { preferChain: 'aptos:1' }
);
```

### Error Handling with Chain Fallback

```typescript
async function robustRequest(url: string): Promise<any> {
  const client = new MultiChainX402Client();
  await client.initialize();

  try {
    return await client.makeRequest(url);
  } catch (error) {
    if (error.response?.status === 402) {
      // Payment required - client will choose optimal method
      console.log("Payment processing...");
      return await client.makeRequest(url);
    }
    throw error;
  }
}
```

## Configuration Options

### Environment Variables

```bash
# Required: At least one private key
EVM_PRIVATE_KEY=0x...           # Ethereum-compatible private key
APTOS_PRIVATE_KEY=0x...         # Aptos Ed25519 private key

# Optional: Network configuration  
APTOS_NETWORK=mainnet           # or "testnet"
BASE_RPC_URL=https://...        # Custom Base RPC endpoint

# Optional: Test endpoints
EVM_TEST_ENDPOINT=http://...    # EVM-only test endpoint
APTOS_TEST_ENDPOINT=http://...  # Aptos-only test endpoint  
MULTI_CHAIN_ENDPOINT=http://... # Multi-chain test endpoint
```

### Wallet Setup

#### EVM (Base) Wallet
```typescript
// Generate new EVM private key
import { generatePrivateKey } from "viem/accounts";
const privateKey = generatePrivateKey();
```

#### Aptos Wallet
```typescript
// Generate new Aptos account
import { Account } from "@aptos-labs/ts-sdk";
const account = Account.generate();
console.log('Private key:', account.privateKey.toString());
console.log('Address:', account.accountAddress.toString());
```

## Advanced Usage

### Custom Chain Configuration

```typescript
class CustomMultiChainClient extends MultiChainX402Client {
  async initializeCustomChains(): Promise<void> {
    // Add support for additional EVM chains
    const polygonClient = createPublicClient({
      chain: polygon,
      transport: http('https://polygon-rpc.com')
    });
    
    // Add custom Aptos network
    const customAptosConfig = new AptosConfig({
      fullnode: 'https://custom-aptos-node.com/v1'
    });
  }
}
```

### Payment Strategy Customization

```typescript
interface PaymentStrategy {
  name: string;
  selectChain(options: PaymentOption[]): PaymentOption;
}

const strategies = {
  cheapest: {
    name: "Cost Optimization",
    selectChain: (options) => options.reduce((min, opt) => 
      opt.totalCost < min.totalCost ? opt : min
    )
  },
  fastest: {
    name: "Speed Optimization", 
    selectChain: (options) => options.reduce((fastest, opt) =>
      opt.blockTime < fastest.blockTime ? opt : fastest
    )
  }
};
```

### Batch Operations Across Chains

```typescript
async function batchMultiChainRequests(
  client: MultiChainX402Client,
  requests: Array<{ url: string; preferChain?: string }>
): Promise<any[]> {
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      return await client.makeRequest(req.url, { preferChain: req.preferChain });
    })
  );
  
  return results.map((result, index) => ({
    url: requests[index].url,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}
```

## Testing

### Local Development

```bash
# Test with local x402 servers running on different ports
EVM_TEST_ENDPOINT=http://localhost:3000/protected \
APTOS_TEST_ENDPOINT=http://localhost:3001/protected \
MULTI_CHAIN_ENDPOINT=http://localhost:3002/protected \
pnpm start
```

### Production Testing

```bash
# Test with real production endpoints
EVM_TEST_ENDPOINT=https://api.service.com/evm-data \
APTOS_TEST_ENDPOINT=https://api.service.com/aptos-data \
MULTI_CHAIN_ENDPOINT=https://api.service.com/data \
pnpm start
```

## Troubleshooting

### Common Issues

#### 1. "No blockchain support initialized"
```
❌ No blockchain support initialized
Please set EVM_PRIVATE_KEY and/or APTOS_PRIVATE_KEY
```
**Solution**: Set at least one private key environment variable

#### 2. "Failed to initialize EVM support"
```  
❌ Failed to initialize EVM support: Error: Invalid private key
```
**Solution**: Ensure EVM_PRIVATE_KEY is a valid 64-character hex string with 0x prefix

#### 3. "Failed to initialize Aptos support"
```
❌ Failed to initialize Aptos support: Account does not exist
```
**Solution**: Fund the Aptos account with test APT first

#### 4. "Aptos connectivity failed"
```
❌ Aptos connectivity failed: Network timeout
```
**Solution**: Check Aptos RPC endpoint availability or switch networks

### Debug Mode

```typescript
// Enable debug logging
const client = new X402Client({
  schemes: [evmScheme, aptosScheme],
  debug: true
});
```

### Network Health Checking

```typescript
async function checkNetworkHealth(): Promise<void> {
  // Test EVM connectivity
  const baseHealth = await fetch('https://mainnet.base.org', {
    method: 'POST',
    body: JSON.stringify({ method: 'eth_blockNumber', id: 1 })
  });
  
  // Test Aptos connectivity  
  const aptosHealth = await fetch('https://fullnode.mainnet.aptoslabs.com/v1/');
  
  console.log('Network Health:', {
    base: baseHealth.ok,
    aptos: aptosHealth.ok
  });
}
```

## Production Deployment

### 1. Environment Configuration

```typescript
// Production environment setup
const PRODUCTION_CONFIG = {
  evm: {
    rpcUrl: process.env.BASE_MAINNET_RPC,
    privateKey: process.env.EVM_MAINNET_PRIVATE_KEY,
    network: "eip155:8453"
  },
  aptos: {
    network: "mainnet",
    privateKey: process.env.APTOS_MAINNET_PRIVATE_KEY
  }
};
```

### 2. Error Monitoring

```typescript
// Log chain selection for monitoring
client.onPaymentComplete((paymentInfo) => {
  console.log('Payment completed:', {
    chain: paymentInfo.network,
    amount: paymentInfo.amount,
    txHash: paymentInfo.transactionHash,
    gasUsed: paymentInfo.gasUsed
  });
});
```

### 3. Performance Monitoring

```typescript
// Track chain performance metrics
const chainMetrics = {
  'eip155:8453': { requests: 0, totalTime: 0, errors: 0 },
  'aptos:1': { requests: 0, totalTime: 0, errors: 0 }
};

// Update metrics on each request
```

## Best Practices

### 1. **Graceful Degradation**
Always support at least one blockchain, prefer both for maximum reliability:

```typescript
if (!evmSupport && !aptosSupport) {
  throw new Error("No payment methods available");
}
```

### 2. **Cost-Aware Development**
Design payment flows that take advantage of Aptos cost savings:

```typescript
// Prefer Aptos for frequent small payments
if (paymentAmount < 0.05) {
  preferChain = 'aptos:1';
}
```

### 3. **Network-Specific Features**
Leverage unique capabilities of each chain:

```typescript
// Use Aptos sponsored transactions when available
if (network.startsWith('aptos') && facilitatorSponsorsGas) {
  // User pays zero gas fees
}
```

### 4. **Monitoring and Alerts**
Track chain performance for optimization:

```typescript
// Alert on high error rates
if (chainMetrics[networkId].errors / chainMetrics[networkId].requests > 0.05) {
  // Switch primary chain or investigate issues
}
```

## Integration Examples

### React Application

```typescript
import { MultiChainX402Client } from '@x402/multi-chain-client';
import { useState, useEffect } from 'react';

function App() {
  const [client, setClient] = useState<MultiChainX402Client | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletSetup>({});

  useEffect(() => {
    async function initClient() {
      const multiClient = new MultiChainX402Client();
      const initialized = await multiClient.initialize();
      
      if (initialized) {
        setClient(multiClient);
        setWalletInfo(multiClient.getWalletSetup());
      }
    }
    
    initClient();
  }, []);

  const handlePayment = async (url: string) => {
    if (!client) return;
    
    try {
      const response = await client.makeRequest(url);
      // Handle successful response
    } catch (error) {
      // Handle payment or network errors
    }
  };

  return (
    <div>
      <h1>Multi-Chain x402 App</h1>
      {walletInfo.evm && <p>EVM: {walletInfo.evm.address}</p>}
      {walletInfo.aptos && <p>Aptos: {walletInfo.aptos.address}</p>}
      {/* Your app UI */}
    </div>
  );
}
```

### Express.js Middleware

```typescript
import express from 'express';
import { MultiChainX402Client } from '@x402/multi-chain-client';

const app = express();
const multiChainClient = new MultiChainX402Client();

// Initialize on server start
app.listen(3000, async () => {
  await multiChainClient.initialize();
  console.log('Multi-chain x402 client ready');
});

// Middleware for making x402 requests
app.use('/api/proxy', async (req, res) => {
  try {
    const response = await multiChainClient.makeRequest(req.body.url);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Performance Comparison

### Transaction Costs (USD)

| Payment Amount | Base Mainnet | Aptos Mainnet | Savings |
|----------------|-------------|---------------|---------|
| $0.001 | $0.0110 | $0.0011 | 90% |
| $0.01 | $0.0200 | $0.0101 | 49% |
| $0.10 | $0.1100 | $0.1001 | 9% |
| $1.00 | $1.0100 | $1.0001 | 1% |

### Speed Comparison

| Metric | Base | Aptos | Improvement |
|--------|------|-------|-------------|
| Block Time | 2s | 1s | 50% faster |
| Finality | 2-4s | 1-2s | 50% faster |
| TPS | ~50 | 130+ | 160% higher |

## Chain Selection Logic

The client automatically selects the optimal chain based on:

1. **Cost**: Total payment amount including gas fees
2. **Availability**: Whether the user has accounts on supported chains  
3. **Network health**: Recent success rates and response times
4. **User preferences**: Optional chain preference hints

```typescript
// Automatic selection (default)
const response = await client.makeRequest('/api/data');

// With preference (fallback to automatic if preferred chain unavailable)
const response = await client.makeRequest('/api/data', { 
  preferChain: 'aptos:1' 
});
```

## Security Considerations

### 1. **Private Key Management**
- Store private keys securely (environment variables, key management services)
- Never hardcode private keys in application code
- Use different keys for development/staging/production

### 2. **Network Validation**
- Validate network IDs before processing payments
- Verify facilitator authenticity
- Monitor for unusual transaction patterns

### 3. **Amount Verification**
- Always verify payment amounts match expected costs
- Implement maximum payment limits
- Log all payment transactions for audit

## Troubleshooting Network Issues

### EVM Chain Issues

```bash
# Check Base network status
curl -X POST https://mainnet.base.org \
  -H "Content-Type: application/json" \
  -d '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}'
  
# Check account balance
# Use block explorer: https://basescan.org/address/YOUR_ADDRESS
```

### Aptos Chain Issues

```bash
# Check Aptos network status  
curl https://fullnode.mainnet.aptoslabs.com/v1/

# Check account balance
curl "https://fullnode.mainnet.aptoslabs.com/v1/accounts/YOUR_ADDRESS"
```

### Common Solutions

1. **Network connectivity**: Try different RPC endpoints
2. **Insufficient funds**: Add native tokens for gas fees
3. **Rate limiting**: Implement request throttling and retry logic
4. **Chain congestion**: Switch to less congested chain temporarily

## Related Examples

- [Error Handling Example](../error-handling/README.md) - Robust error handling patterns
- [Performance Benchmarking](../performance-benchmarking/README.md) - Performance testing toolkit
- [Aptos Migration Guide](../../../docs/APTOS_MIGRATION_GUIDE.md) - Detailed Aptos integration guide

## Contributing

When extending this example:

1. **Test both chains** thoroughly before submitting changes
2. **Update cost analysis** if gas prices change significantly
3. **Document new features** with usage examples
4. **Consider edge cases** like network outages or high gas fees

## Support

- [x402 GitHub Issues](https://github.com/coinbase/x402/issues)
- [Aptos Documentation](https://aptos.dev/)
- [Base Network Documentation](https://docs.base.org/)