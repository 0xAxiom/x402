# Error Handling Example

This example demonstrates comprehensive error handling patterns when working with x402 payments.

## Overview

x402 payments can fail for various reasons, and robust applications need to handle these gracefully:

- **Network errors** - Connection issues, timeouts
- **Payment failures** - Insufficient balance, invalid tokens
- **Server errors** - API errors, rate limiting
- **Validation errors** - Malformed requests, unsupported networks

## Features Demonstrated

- ✅ Comprehensive error classification
- ✅ Automatic retry with exponential backoff
- ✅ Balance validation before payment attempts
- ✅ User-friendly error messages
- ✅ Logging and monitoring integration
- ✅ Recovery strategies for each error type

## Running the Example

```bash
pnpm install
pnpm start
```

## Configuration

Set the following environment variables:

```bash
# Your private key (for testing only)
PRIVATE_KEY=0x...

# API endpoint to test (optional, defaults to test server)
X402_TEST_URL=https://your-test-server.com/protected

# Enable debug logging (optional)
DEBUG=true
```

## Error Categories

### 1. Network Errors
- Connection timeouts
- DNS resolution failures
- SSL certificate issues

### 2. Payment Errors
- Insufficient USDC balance
- Invalid payment tokens
- Unsupported networks
- Gas estimation failures

### 3. Server Errors
- HTTP 500/503 responses
- Rate limiting (429)
- Authentication failures

### 4. Validation Errors
- Malformed payment headers
- Invalid signatures
- Expired payment tokens

## Best Practices

1. **Always validate balance** before attempting payments
2. **Implement exponential backoff** for retryable errors
3. **Log payment attempts** for debugging
4. **Provide clear error messages** to users
5. **Handle network timeouts** gracefully
6. **Monitor error rates** in production