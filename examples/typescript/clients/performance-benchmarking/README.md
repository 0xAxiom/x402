# x402 Performance Benchmarking Suite

A comprehensive performance testing and optimization toolkit for x402 TypeScript applications. This example helps developers measure, analyze, and optimize x402 performance across different scenarios and configurations.

## What This Example Covers

### 🏃 **Performance Benchmarking**
- **Payment Verification**: Measure x402 payment flow performance
- **Batch Operations**: Test concurrent request handling
- **Network Analysis**: Facilitator and RPC endpoint latency testing
- **Statistical Analysis**: P50, P95, P99 latency percentiles

### 📊 **Metrics Collection**
- **Timing Metrics**: Min/max/average response times
- **Throughput**: Operations per second measurement
- **Error Rates**: Success/failure ratio tracking
- **Network Latency**: Facilitator and RPC endpoint response times

### 🚀 **Optimization Guidance**
- **Performance Bottleneck Identification**
- **Configuration Recommendations**
- **Network Optimization Suggestions**
- **Error Rate Analysis and Solutions**

## Prerequisites

- Node.js 18+
- A Base mainnet private key with ETH for gas fees
- Test x402-protected endpoints (optional, for full testing)

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
   TEST_ENDPOINT_1=http://localhost:3000/protected  # Test endpoint 1
   TEST_ENDPOINT_2=http://localhost:3001/api/data   # Test endpoint 2  
   TEST_ENDPOINT_3=http://localhost:3002/service    # Test endpoint 3
   ```

3. **Run the benchmark suite:**
   ```bash
   pnpm start
   ```

## Usage Examples

### Basic Performance Benchmark
```bash
# Run full benchmark suite
pnpm start

# Run specific benchmarks
pnpm benchmark
```

### Network Analysis Only
```bash
# Analyze facilitator and RPC performance
node -e "
const { NetworkAnalyzer } = require('./index.ts');
const analyzer = new NetworkAnalyzer();
analyzer.analyzeNetwork().then(metrics => console.log(metrics));
"
```

### Custom Benchmarking
```typescript
import { PerformanceBenchmarker } from './index';

const benchmarker = new PerformanceBenchmarker(client);

// Custom operation benchmark
const result = await benchmarker.benchmark(
  'Custom Operation',
  async () => {
    // Your test code here
    await someX402Operation();
  },
  50  // iterations
);
```

## Example Output

```
🏁 x402 Performance Benchmarking Suite
Measuring x402 client performance and optimization opportunities

🔐 Payment Verification Benchmark
✓ Completed 25 iterations

📦 Batch Operations Benchmark  
✓ Completed 10 iterations

🌐 Network Performance Analysis
✓ Analyzed 6 endpoints

📊 Benchmark Results
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
Operation                      Avg (ms)      Min      Max      P50      P95      P99  Ops/sec   Errors
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Payment Verification            245.3     189.2    312.7    241.5    298.1    308.9        4        0
Batch Operations (concurrency:    458.7     401.2    523.1    449.8    511.2    520.3        2        0
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

🌐 Network Metrics
────────────────────────────────
Avg Facilitator Latency: 145.2ms
Avg RPC Latency: 98.7ms

🚀 Performance Optimization Recommendations
════════════════════════════════════════════════════════════════════════════════════════════════════
✅ Performance looks good! No immediate optimizations needed.
```

## Benchmark Types

### 1. Payment Verification Benchmark
Tests the full x402 payment flow including:
- Request initiation
- 402 response handling  
- Payment proof generation
- Settlement verification
- Resource access

```typescript
const result = await benchmarker.benchmarkPaymentVerification(
  'http://localhost:3000/protected',
  50  // iterations
);
```

### 2. Batch Operations Benchmark
Measures concurrent request performance:
- Multiple endpoint handling
- Concurrency control
- Error isolation
- Throughput measurement

```typescript
const result = await benchmarker.benchmarkBatchOperations(
  ['http://localhost:3000/api1', 'http://localhost:3000/api2'],
  5  // concurrency level
);
```

### 3. Network Analysis
Evaluates infrastructure performance:
- Facilitator response times
- RPC endpoint latency
- Geographic performance differences
- Connectivity health checks

## Performance Metrics Explained

### Statistical Measurements
- **Average (Avg)**: Mean response time across all requests
- **Min/Max**: Fastest and slowest individual requests  
- **P50 (Median)**: 50% of requests were faster than this
- **P95**: 95% of requests were faster than this
- **P99**: 99% of requests were faster than this (tail latency)

### Throughput Metrics
- **Ops/sec**: Operations per second (throughput)
- **Success Rate**: Percentage of successful operations
- **Error Rate**: Percentage of failed operations

### Network Metrics
- **Facilitator Latency**: Time to reach x402 facilitators
- **RPC Latency**: Time to reach blockchain RPC endpoints
- **Round Trips**: Total network requests made

## Optimization Recommendations

### High Latency (>500ms average)
```
⚠️  High average latency detected. Consider:
  • Using a closer RPC endpoint
  • Implementing request caching  
  • Using connection pooling
```

### Network Issues
```
⚠️  Facilitator latency is high. Consider:
  • Using a geographically closer facilitator
  • Implementing facilitator health checking
```

### Error Rate Problems
```
⚠️  Error rate is elevated. Consider:
  • Implementing retry logic with exponential backoff
  • Adding circuit breaker patterns
  • Monitoring facilitator health
```

### Low Throughput
```
⚠️  Low throughput detected. Consider:
  • Batching requests when possible
  • Using connection keep-alive
  • Optimizing payload sizes
```

## Configuration Options

### Environment Variables
```bash
# Required
PRIVATE_KEY=0x...              # Base mainnet private key

# Optional  
BASE_RPC_URL=https://...       # Custom RPC endpoint
TEST_ENDPOINT_1=http://...     # Test endpoint 1
TEST_ENDPOINT_2=http://...     # Test endpoint 2
TEST_ENDPOINT_3=http://...     # Test endpoint 3
```

### Benchmark Parameters
```typescript
// Customize benchmark settings
const iterations = 100;        // Number of test iterations
const concurrency = 5;         // Concurrent requests
const warmupRounds = 3;        // Warmup iterations
```

## Integration with CI/CD

### Performance Regression Testing
```yaml
# GitHub Actions example
- name: Run x402 Performance Tests
  run: |
    cd examples/typescript/clients/performance-benchmarking
    npm run benchmark > performance-results.txt
    
    # Fail if average latency > 1000ms  
    if grep -q "Avg.*[0-9]\{4,\}\." performance-results.txt; then
      echo "Performance regression detected!"
      exit 1
    fi
```

### Load Testing
```bash
# Stress test with higher iteration counts
ITERATIONS=1000 npm run benchmark
```

## Best Practices for Performance Testing

### 1. **Consistent Test Environment**
- Use dedicated test infrastructure
- Avoid shared resources during benchmarks
- Run tests at consistent times

### 2. **Proper Sample Sizes**
- Use at least 30-50 iterations for statistical validity
- Include warmup rounds to eliminate cold start effects
- Test different load patterns

### 3. **Network Considerations**
- Test from multiple geographic locations
- Consider CDN and edge caching effects  
- Test both peak and off-peak times

### 4. **Error Handling**
- Distinguish between expected errors (402 responses) and failures
- Monitor both success latency and error recovery time
- Test error scenarios separately

## Interpreting Results

### Good Performance Indicators
- **P95 < 500ms**: Most requests complete quickly
- **Error Rate < 1%**: High reliability
- **Ops/sec > 10**: Reasonable throughput
- **Stable latency**: Consistent performance

### Warning Signs
- **High P99 latency**: Indicates tail latency issues
- **Error rate > 5%**: Reliability concerns
- **Increasing latency over time**: Memory leaks or resource exhaustion
- **High variance**: Inconsistent performance

## Troubleshooting Performance Issues

### High Latency
```typescript
// Check network connectivity
await analyzer.measureRpcLatency('https://mainnet.base.org');

// Test different facilitators
const facilitators = [
  'https://facilitator.x402.org',
  'https://facilitator.thirdweb.com'
];
```

### Connection Issues
```typescript  
// Test with connection pooling
const client = new X402Client({
  schemes: [scheme],
  httpOptions: {
    keepAlive: true,
    maxConnections: 10
  }
});
```

### Memory Leaks
```bash
# Monitor memory usage during benchmarks
node --inspect index.ts
```

## Advanced Usage

### Custom Metrics Collection
```typescript
class CustomBenchmarker extends PerformanceBenchmarker {
  async benchmarkWithMemoryTracking() {
    const initialMemory = process.memoryUsage();
    
    const result = await this.benchmark('Custom', testFn, 100);
    
    const finalMemory = process.memoryUsage();
    const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
    
    return { ...result, memoryUsage: memoryDelta };
  }
}
```

### Comparative Analysis
```typescript
// Compare different configurations
const results = {
  http1: await benchmarkWithHttp1(),
  http2: await benchmarkWithHttp2(),
  cached: await benchmarkWithCaching()
};
```

## Contributing

When contributing performance improvements:

1. **Include benchmark results** in PR descriptions
2. **Test across multiple environments** (local, staging, production)
3. **Document performance characteristics** of new features
4. **Monitor for regressions** in CI/CD

## Related Documentation

- [x402 Core Documentation](../../README.md)
- [TypeScript Client Guide](../README.md)  
- [Error Handling Example](../error-handling/README.md)
- [Production Deployment Guide](../../../docs/production.md)