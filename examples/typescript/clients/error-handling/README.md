# x402 TypeScript Error Handling Example

This example demonstrates comprehensive error handling patterns for x402 TypeScript clients, providing robust patterns for production applications.

## What This Example Covers

### 🔍 Error Classification
- **Configuration Errors**: Invalid environment setup, missing keys
- **Network Errors**: RPC failures, connectivity issues, timeouts
- **Payment Errors**: Insufficient funds, transaction failures, gas issues  
- **Authentication Errors**: Invalid proofs, signature failures
- **Validation Errors**: Schema validation, input validation
- **Unknown Errors**: Graceful handling of unexpected errors

### 🛠️ Error Handling Patterns
- **Error Classification**: Consistent error categorization and context
- **Retry Logic**: Exponential backoff for transient failures
- **User-Friendly Messages**: Converting technical errors to actionable messages
- **Batch Error Isolation**: Handling partial failures in batch operations
- **Graceful Degradation**: Continuing operation when possible

### 📋 Production Features
- **Configuration Validation**: Type-safe environment variable parsing
- **Structured Logging**: Consistent error reporting and debugging
- **Exit Code Management**: Proper process exit codes for different error types
- **Unhandled Error Catching**: Global error handlers for robustness

## Prerequisites

- Node.js 18+
- A Base mainnet private key with ETH for gas fees
- A test x402-protected endpoint (optional, for full testing)

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env with your values
   PRIVATE_KEY=0x...  # Your Base mainnet private key
   BASE_RPC_URL=https://mainnet.base.org  # Optional: custom RPC
   TEST_ENDPOINT=http://localhost:3000/protected  # Optional: test endpoint
   ```

3. **Run the example:**
   ```bash
   pnpm start
   ```

## Example Output

```
🚀 x402 TypeScript Error Handling Example
==========================================

✅ Configuration loaded successfully
✅ Connected to Base mainnet (block 12345678)

🔐 Making protected request to: http://localhost:3000/protected
❌ Request failed:
  Type: NETWORK_ERROR
  Message: Network connectivity issue
  User message: Network connection issue. Please check your internet and try again.
  Context: {
    "attempt": 0
  }

Attempt 1 failed, retrying in 1000ms...
✅ Request successful!

📦 Testing batch operations with error isolation...
📊 Batch results: 1 successful, 2 failed

Failed requests:
  1: http://localhost:3000/another-endpoint - Network connection issue. Please check your internet and try again.
  2: http://invalid-url.test/protected - Network connection issue. Please check your internet and try again.
```

## Error Types and Handling

### Configuration Errors
```typescript
// Validates environment variables with Zod
const config = ConfigSchema.parse({
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  BASE_RPC_URL: process.env.BASE_RPC_URL,
  TEST_ENDPOINT: process.env.TEST_ENDPOINT
});
```

### Network Errors with Retry
```typescript
// Automatically retries network errors with exponential backoff
const response = await withRetry(async () => {
  return await client.get(url);
}, 3, 1000);
```

### Payment Error Classification
```typescript
// Detects various payment failure modes
if (code === -32000) {
  return {
    type: ErrorType.PAYMENT_ERROR,
    message: "Insufficient funds or gas estimation failed",
    originalError: error,
    context
  };
}
```

### User-Friendly Error Messages
```typescript
// Converts technical errors to actionable messages
switch (error.type) {
  case ErrorType.PAYMENT_ERROR:
    return "Payment failed. Please check your wallet balance and try again.";
  case ErrorType.NETWORK_ERROR:
    return "Network connection issue. Please check your internet and try again.";
  // ... more cases
}
```

## Best Practices Demonstrated

### 1. **Fail Fast Configuration**
Validate all required configuration upfront before attempting operations:

```typescript
const config = loadConfig(); // Throws immediately if invalid
```

### 2. **Structured Error Context**
Include relevant context for debugging:

```typescript
const error = X402ErrorHandler.classify(originalError, {
  step: "client_creation",
  attempt: retryCount,
  endpoint: url
});
```

### 3. **Retry Only Appropriate Errors**
Not all errors should trigger retries:

```typescript
static isRetryable(error: X402Error): boolean {
  return error.type === ErrorType.NETWORK_ERROR || 
         (error.type === ErrorType.PAYMENT_ERROR && 
          error.message.includes('nonce'));
}
```

### 4. **Error Isolation in Batch Operations**
Use `Promise.allSettled()` to prevent one failure from stopping all operations:

```typescript
const results = await Promise.allSettled(
  urls.map(url => makeProtectedRequest(client, url))
);
```

### 5. **Graceful Process Termination**
Use appropriate exit codes for different error types:

```typescript
process.on('unhandledRejection', (reason) => {
  const error = X402ErrorHandler.classify(reason);
  console.error("Unhandled rejection:", error.message);
  process.exit(3);
});
```

## Common x402 Error Scenarios

### HTTP 402 Payment Required
```
Type: PAYMENT_ERROR
Message: Payment required - this resource requires x402 payment
Action: Complete payment flow and retry with proof
```

### Insufficient ETH Balance
```
Type: PAYMENT_ERROR  
Message: Insufficient funds or gas estimation failed
Action: Add ETH to wallet or reduce gas price
```

### Network Connectivity Issues
```
Type: NETWORK_ERROR
Message: Network connectivity issue
Action: Check internet connection and RPC endpoint
```

### Invalid Payment Proof
```
Type: AUTH_ERROR
Message: Authentication failed - check payment proof
Action: Verify proof signature and headers
```

## Integration with Your Application

### Basic Integration
```typescript
import { X402ErrorHandler, ErrorType } from './error-handler';

try {
  const response = await client.get('/protected-resource');
  // Handle success
} catch (error) {
  const x402Error = X402ErrorHandler.classify(error);
  
  // Show user-friendly message
  showNotification(X402ErrorHandler.getUserMessage(x402Error));
  
  // Log technical details
  logger.error('x402 request failed', {
    type: x402Error.type,
    message: x402Error.message,
    context: x402Error.context
  });
}
```

### With UI Framework (React example)
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handlePayment = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    await makeProtectedRequest(client, endpoint);
    // Handle success
  } catch (err) {
    const x402Error = X402ErrorHandler.classify(err);
    setError(X402ErrorHandler.getUserMessage(x402Error));
    
    // Automatically retry network errors
    if (X402ErrorHandler.isRetryable(x402Error)) {
      setTimeout(() => handlePayment(), 2000);
    }
  } finally {
    setIsLoading(false);
  }
};
```

## Testing Error Scenarios

The example includes several ways to test different error conditions:

1. **Invalid Configuration**: Remove required environment variables
2. **Network Errors**: Use invalid RPC URLs or endpoints  
3. **Payment Errors**: Use wallet with insufficient balance
4. **Batch Failures**: Mix valid and invalid endpoints

## Contributing

This example serves as a reference for error handling patterns. When contributing to the x402 ecosystem:

- Follow the error classification patterns shown here
- Include proper error context for debugging
- Provide user-friendly error messages
- Implement appropriate retry logic
- Test error scenarios thoroughly

## Related Documentation

- [x402 Core Documentation](../../README.md)
- [TypeScript Client Guide](../README.md)
- [EVM Mechanisms](../../../mechanisms/evm/README.md)
- [Error Codes Reference](../../../docs/error-codes.md)