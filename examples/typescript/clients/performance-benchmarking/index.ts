/**
 * x402 Performance Benchmarking Suite
 * 
 * This example demonstrates how to measure and optimize x402 performance
 * across different operations, facilitators, and configurations.
 */

import { X402Client } from "@x402/core";
import { ExactEvmScheme } from "@x402/mechanisms-evm";
import { createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import chalk from "chalk";
import ora from "ora";

dotenv.config();

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
  success: number;
  errors: number;
  errorRate: number;
}

interface NetworkMetrics {
  facilitatorLatency: number;
  rpcLatency: number;
  totalRoundTrips: number;
  dataTransferred: number;
}

class PerformanceBenchmarker {
  private client: X402Client;
  private measurements: number[] = [];

  constructor(client: X402Client) {
    this.client = client;
  }

  /**
   * Run a performance benchmark for a specific operation
   */
  async benchmark(
    operation: string,
    testFn: () => Promise<void>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    console.log(chalk.blue(`\n🏃 Running benchmark: ${operation}`));
    console.log(chalk.gray(`Iterations: ${iterations}`));
    
    const spinner = ora('Warming up...').start();
    
    // Warmup round
    try {
      await testFn();
      spinner.text = 'Running benchmark...';
    } catch (error) {
      spinner.warn('Warmup failed, continuing...');
    }

    this.measurements = [];
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      
      try {
        await testFn();
        const iterationTime = performance.now() - iterationStart;
        this.measurements.push(iterationTime);
        successCount++;
      } catch (error) {
        errorCount++;
        // Still record the time for failed operations
        const iterationTime = performance.now() - iterationStart;
        this.measurements.push(iterationTime);
      }

      if (i % 10 === 0) {
        spinner.text = `Progress: ${i}/${iterations} (${((i/iterations) * 100).toFixed(1)}%)`;
      }
    }

    const totalTime = Date.now() - startTime;
    spinner.succeed(`Completed ${iterations} iterations`);

    return this.calculateStats(operation, iterations, totalTime, successCount, errorCount);
  }

  /**
   * Calculate statistical metrics from measurements
   */
  private calculateStats(
    operation: string,
    iterations: number,
    totalTimeMs: number,
    success: number,
    errors: number
  ): BenchmarkResult {
    if (this.measurements.length === 0) {
      throw new Error("No measurements recorded");
    }

    const sorted = this.measurements.slice().sort((a, b) => a - b);
    const avgTimeMs = this.measurements.reduce((sum, t) => sum + t, 0) / this.measurements.length;
    
    return {
      operation,
      iterations,
      totalTimeMs,
      avgTimeMs: Math.round(avgTimeMs * 100) / 100,
      minTimeMs: Math.round(sorted[0] * 100) / 100,
      maxTimeMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
      p50Ms: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100,
      p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99Ms: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100,
      opsPerSecond: Math.round((iterations / totalTimeMs) * 1000),
      success,
      errors,
      errorRate: Math.round((errors / iterations) * 100 * 100) / 100
    };
  }

  /**
   * Benchmark payment verification performance
   */
  async benchmarkPaymentVerification(endpoint: string, iterations: number = 50): Promise<BenchmarkResult> {
    return this.benchmark(
      "Payment Verification",
      async () => {
        try {
          const response = await this.client.get(endpoint);
          // Simulate processing the response
          JSON.stringify(response.data);
        } catch (error) {
          // Expected for 402 responses during benchmarking
          if (!(error as any).response || (error as any).response.status !== 402) {
            throw error;
          }
        }
      },
      iterations
    );
  }

  /**
   * Benchmark batch operations
   */
  async benchmarkBatchOperations(endpoints: string[], concurrency: number = 5): Promise<BenchmarkResult> {
    const batches = [];
    for (let i = 0; i < endpoints.length; i += concurrency) {
      batches.push(endpoints.slice(i, i + concurrency));
    }

    return this.benchmark(
      `Batch Operations (concurrency: ${concurrency})`,
      async () => {
        for (const batch of batches) {
          await Promise.allSettled(
            batch.map(endpoint => 
              this.client.get(endpoint).catch(e => {
                if (e.response?.status !== 402) throw e;
              })
            )
          );
        }
      },
      Math.min(10, batches.length)  // Fewer iterations for batch tests
    );
  }
}

/**
 * Network performance analyzer
 */
class NetworkAnalyzer {
  /**
   * Measure facilitator response time
   */
  async measureFacilitatorLatency(facilitatorUrl: string): Promise<number> {
    const start = performance.now();
    
    try {
      const response = await fetch(`${facilitatorUrl}/supported`);
      await response.json();
      return performance.now() - start;
    } catch (error) {
      console.warn(`Facilitator ${facilitatorUrl} unreachable`);
      return -1;
    }
  }

  /**
   * Measure RPC endpoint latency
   */
  async measureRpcLatency(rpcUrl: string): Promise<number> {
    const start = performance.now();
    
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: []
        })
      });
      await response.json();
      return performance.now() - start;
    } catch (error) {
      console.warn(`RPC ${rpcUrl} unreachable`);
      return -1;
    }
  }

  /**
   * Comprehensive network analysis
   */
  async analyzeNetwork(): Promise<NetworkMetrics> {
    const facilitators = [
      'https://facilitator.x402.org',
      'https://facilitator.thirdweb.com',
      'https://facilitator.xpay.sh'
    ];

    const rpcEndpoints = [
      'https://mainnet.base.org',
      'https://base-mainnet.public.blastapi.io',
      'https://base.gateway.tenderly.co'
    ];

    console.log(chalk.blue('\n🌐 Network Performance Analysis'));

    const facilitatorLatencies = await Promise.all(
      facilitators.map(url => this.measureFacilitatorLatency(url))
    );

    const rpcLatencies = await Promise.all(
      rpcEndpoints.map(url => this.measureRpcLatency(url))
    );

    const validFacilitatorLatencies = facilitatorLatencies.filter(l => l > 0);
    const validRpcLatencies = rpcLatencies.filter(l => l > 0);

    return {
      facilitatorLatency: validFacilitatorLatencies.length > 0 
        ? validFacilitatorLatencies.reduce((sum, l) => sum + l, 0) / validFacilitatorLatencies.length
        : -1,
      rpcLatency: validRpcLatencies.length > 0
        ? validRpcLatencies.reduce((sum, l) => sum + l, 0) / validRpcLatencies.length
        : -1,
      totalRoundTrips: facilitators.length + rpcEndpoints.length,
      dataTransferred: 0  // Would need more detailed tracking
    };
  }
}

/**
 * Display benchmark results in a formatted table
 */
function displayResults(results: BenchmarkResult[]) {
  console.log(chalk.green('\n📊 Benchmark Results'));
  console.log(chalk.gray('═'.repeat(120)));

  // Header
  const header = sprintf('%-30s %8s %8s %8s %8s %8s %8s %8s %8s',
    'Operation', 'Avg (ms)', 'Min', 'Max', 'P50', 'P95', 'P99', 'Ops/sec', 'Errors');
  console.log(chalk.cyan(header));
  console.log(chalk.gray('─'.repeat(120)));

  // Results
  results.forEach(result => {
    const row = sprintf('%-30s %8.1f %8.1f %8.1f %8.1f %8.1f %8.1f %8d %8d',
      result.operation.substring(0, 30),
      result.avgTimeMs,
      result.minTimeMs,
      result.maxTimeMs,
      result.p50Ms,
      result.p95Ms,
      result.p99Ms,
      result.opsPerSecond,
      result.errors
    );
    
    const color = result.errorRate > 10 ? chalk.red : 
                 result.errorRate > 5 ? chalk.yellow : chalk.white;
    console.log(color(row));
  });

  console.log(chalk.gray('─'.repeat(120)));
}

/**
 * Simple sprintf implementation for table formatting
 */
function sprintf(format: string, ...args: any[]): string {
  return format.replace(/%(-?)(\d+)?(?:\.(\d+))?([sdif])/g, (match, leftAlign, width, precision, type) => {
    const arg = args.shift();
    let str = '';
    
    switch (type) {
      case 's': str = String(arg); break;
      case 'd': str = String(Math.floor(Number(arg) || 0)); break;
      case 'f': str = precision ? Number(arg || 0).toFixed(Number(precision)) : String(Number(arg) || 0); break;
      case 'i': str = String(Math.floor(Number(arg) || 0)); break;
    }
    
    if (width) {
      const w = Number(width);
      if (leftAlign === '-') {
        str = str.padEnd(w);
      } else {
        str = str.padStart(w);
      }
    }
    
    return str;
  });
}

/**
 * Performance optimization recommendations
 */
function displayOptimizations(results: BenchmarkResult[], networkMetrics: NetworkMetrics) {
  console.log(chalk.blue('\n🚀 Performance Optimization Recommendations'));
  console.log(chalk.gray('═'.repeat(80)));

  const recommendations: string[] = [];

  // Analyze results and provide recommendations
  const avgLatency = results.reduce((sum, r) => sum + r.avgTimeMs, 0) / results.length;
  
  if (avgLatency > 500) {
    recommendations.push('High average latency detected. Consider:');
    recommendations.push('  • Using a closer RPC endpoint');
    recommendations.push('  • Implementing request caching');
    recommendations.push('  • Using connection pooling');
  }

  if (networkMetrics.facilitatorLatency > 200) {
    recommendations.push('Facilitator latency is high. Consider:');
    recommendations.push('  • Using a geographically closer facilitator');
    recommendations.push('  • Implementing facilitator health checking');
  }

  if (results.some(r => r.errorRate > 5)) {
    recommendations.push('Error rate is elevated. Consider:');
    recommendations.push('  • Implementing retry logic with exponential backoff');
    recommendations.push('  • Adding circuit breaker patterns');
    recommendations.push('  • Monitoring facilitator health');
  }

  const maxOps = Math.max(...results.map(r => r.opsPerSecond));
  if (maxOps < 10) {
    recommendations.push('Low throughput detected. Consider:');
    recommendations.push('  • Batching requests when possible');
    recommendations.push('  • Using connection keep-alive');
    recommendations.push('  • Optimizing payload sizes');
  }

  if (recommendations.length === 0) {
    console.log(chalk.green('✅ Performance looks good! No immediate optimizations needed.'));
  } else {
    recommendations.forEach(rec => {
      if (rec.startsWith('  ')) {
        console.log(chalk.gray(rec));
      } else {
        console.log(chalk.yellow(`⚠️  ${rec}`));
      }
    });
  }
}

/**
 * Main benchmarking function
 */
async function main() {
  console.log(chalk.bold.blue('🏁 x402 Performance Benchmarking Suite'));
  console.log(chalk.gray('Measuring x402 client performance and optimization opportunities\n'));

  // Configuration
  const privateKey = process.env.PRIVATE_KEY;
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const testEndpoints = [
    process.env.TEST_ENDPOINT_1 || 'http://localhost:3000/protected',
    process.env.TEST_ENDPOINT_2 || 'http://localhost:3001/api/data',
    process.env.TEST_ENDPOINT_3 || 'http://localhost:3002/service'
  ];

  if (!privateKey) {
    console.error(chalk.red('❌ PRIVATE_KEY environment variable is required'));
    process.exit(1);
  }

  try {
    // Initialize client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publicClient = createPublicClient({
      chain: base,
      transport: http(baseRpcUrl)
    });
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(baseRpcUrl)
    });

    const client = new X402Client({
      schemes: [new ExactEvmScheme({ publicClient, walletClient })],
      userAgent: "x402-performance-benchmark/1.0.0"
    });

    const benchmarker = new PerformanceBenchmarker(client);
    const networkAnalyzer = new NetworkAnalyzer();

    // Run benchmarks
    const results: BenchmarkResult[] = [];

    // 1. Payment verification benchmark
    console.log(chalk.blue('\n🔐 Payment Verification Benchmark'));
    try {
      const verificationResult = await benchmarker.benchmarkPaymentVerification(testEndpoints[0], 25);
      results.push(verificationResult);
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Payment verification benchmark failed, skipping...'));
    }

    // 2. Batch operations benchmark
    console.log(chalk.blue('\n📦 Batch Operations Benchmark'));
    try {
      const batchResult = await benchmarker.benchmarkBatchOperations(testEndpoints, 3);
      results.push(batchResult);
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Batch operations benchmark failed, skipping...'));
    }

    // 3. Network analysis
    const networkMetrics = await networkAnalyzer.analyzeNetwork();

    // Display results
    if (results.length > 0) {
      displayResults(results);
    }

    // Network metrics
    if (networkMetrics.facilitatorLatency > 0 || networkMetrics.rpcLatency > 0) {
      console.log(chalk.green('\n🌐 Network Metrics'));
      console.log(chalk.gray('─'.repeat(40)));
      if (networkMetrics.facilitatorLatency > 0) {
        console.log(`Avg Facilitator Latency: ${networkMetrics.facilitatorLatency.toFixed(1)}ms`);
      }
      if (networkMetrics.rpcLatency > 0) {
        console.log(`Avg RPC Latency: ${networkMetrics.rpcLatency.toFixed(1)}ms`);
      }
    }

    // Optimization recommendations
    displayOptimizations(results, networkMetrics);

    console.log(chalk.green('\n✅ Benchmarking complete!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Benchmarking failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}