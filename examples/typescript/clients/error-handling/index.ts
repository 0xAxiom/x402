/**
 * Comprehensive Error Handling Example for x402 TypeScript Clients
 * 
 * This example demonstrates how to properly handle various types of errors
 * that can occur when building x402-enabled applications.
 */

import { X402Client } from "@x402/core";
import { ExactEvmScheme } from "@x402/mechanisms-evm";
import { createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Configuration validation with Zod
const ConfigSchema = z.object({
  PRIVATE_KEY: z.string().min(66, "Private key must be 66 characters (0x + 64 hex)"),
  BASE_RPC_URL: z.string().url().optional().default("https://mainnet.base.org"),
  TEST_ENDPOINT: z.string().url().optional().default("http://localhost:3000/protected")
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Error types that commonly occur in x402 applications
 */
enum ErrorType {
  CONFIG_ERROR = "CONFIG_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR", 
  PAYMENT_ERROR = "PAYMENT_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

interface X402Error {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

class X402ErrorHandler {
  /**
   * Classify and wrap errors in a consistent format
   */
  static classify(error: unknown, context: Record<string, unknown> = {}): X402Error {
    // Network/HTTP errors
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      
      // HTTP status codes
      if (code === 402) {
        return {
          type: ErrorType.PAYMENT_ERROR,
          message: "Payment required - this resource requires x402 payment",
          originalError: error,
          context
        };
      }
      
      if (code === 401) {
        return {
          type: ErrorType.AUTH_ERROR,
          message: "Authentication failed - check payment proof",
          originalError: error,
          context
        };
      }

      if (code >= 500) {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: "Server error - please retry",
          originalError: error,
          context
        };
      }

      // Ethereum error codes
      if (code === -32000) {
        return {
          type: ErrorType.PAYMENT_ERROR,
          message: "Insufficient funds or gas estimation failed",
          originalError: error,
          context
        };
      }
    }

    // String-based error messages
    if (typeof error === 'string') {
      if (error.includes('insufficient')) {
        return {
          type: ErrorType.PAYMENT_ERROR,
          message: "Insufficient balance to complete payment",
          originalError: error,
          context
        };
      }
      
      if (error.includes('network') || error.includes('timeout')) {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: "Network connectivity issue",
          originalError: error,
          context
        };
      }
    }

    // Error objects with message
    if (error instanceof Error) {
      if (error.message.includes('User denied')) {
        return {
          type: ErrorType.AUTH_ERROR,
          message: "User rejected the transaction",
          originalError: error,
          context
        };
      }
      
      if (error.message.includes('nonce')) {
        return {
          type: ErrorType.PAYMENT_ERROR,
          message: "Transaction nonce issue - possible race condition",
          originalError: error,
          context
        };
      }
      
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message,
        originalError: error,
        context
      };
    }

    // Fallback for unknown errors
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: "An unexpected error occurred",
      originalError: error,
      context
    };
  }

  /**
   * Get user-friendly error messages
   */
  static getUserMessage(error: X402Error): string {
    switch (error.type) {
      case ErrorType.CONFIG_ERROR:
        return "Configuration error. Please check your setup.";
      case ErrorType.NETWORK_ERROR:
        return "Network connection issue. Please check your internet and try again.";
      case ErrorType.PAYMENT_ERROR:
        return "Payment failed. Please check your wallet balance and try again.";
      case ErrorType.AUTH_ERROR:
        return "Authentication failed. Please verify your payment.";
      case ErrorType.VALIDATION_ERROR:
        return `Validation error: ${error.message}`;
      default:
        return "Something went wrong. Please try again.";
    }
  }

  /**
   * Determine if error is retryable
   */
  static isRetryable(error: X402Error): boolean {
    return error.type === ErrorType.NETWORK_ERROR || 
           (error.type === ErrorType.PAYMENT_ERROR && 
            error.message.includes('nonce'));
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: X402Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = X402ErrorHandler.classify(error, { attempt });
      
      if (!X402ErrorHandler.isRetryable(lastError) || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Safe configuration loading with validation
 */
function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse({
      PRIVATE_KEY: process.env.PRIVATE_KEY,
      BASE_RPC_URL: process.env.BASE_RPC_URL,
      TEST_ENDPOINT: process.env.TEST_ENDPOINT
    });
    
    console.log("✅ Configuration loaded successfully");
    return config;
  } catch (error) {
    const x402Error: X402Error = {
      type: ErrorType.CONFIG_ERROR,
      message: `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalError: error
    };
    throw x402Error;
  }
}

/**
 * Initialize x402 client with error handling
 */
async function createX402Client(config: Config): Promise<X402Client> {
  try {
    const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(config.BASE_RPC_URL)
    });
    
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(config.BASE_RPC_URL)
    });

    // Test connectivity
    await withRetry(async () => {
      const blockNumber = await publicClient.getBlockNumber();
      console.log(`✅ Connected to Base mainnet (block ${blockNumber})`);
    });

    const client = new X402Client({
      schemes: [new ExactEvmScheme({ publicClient, walletClient })],
      userAgent: "x402-error-handling-example/1.0.0"
    });

    return client;
  } catch (error) {
    throw X402ErrorHandler.classify(error, { step: "client_creation" });
  }
}

/**
 * Make a protected request with comprehensive error handling
 */
async function makeProtectedRequest(client: X402Client, url: string): Promise<string> {
  console.log(`\n🔐 Making protected request to: ${url}`);
  
  try {
    const response = await withRetry(async () => {
      return await client.get(url);
    });
    
    console.log("✅ Request successful!");
    return response.data;
  } catch (error) {
    const x402Error = error as X402Error;
    
    // Log detailed error information
    console.error("❌ Request failed:");
    console.error(`  Type: ${x402Error.type}`);
    console.error(`  Message: ${x402Error.message}`);
    console.error(`  User message: ${X402ErrorHandler.getUserMessage(x402Error)}`);
    
    if (x402Error.context) {
      console.error(`  Context: ${JSON.stringify(x402Error.context, null, 2)}`);
    }
    
    // Handle specific error types
    switch (x402Error.type) {
      case ErrorType.PAYMENT_ERROR:
        console.log("\n💡 Payment troubleshooting tips:");
        console.log("  - Check wallet balance");
        console.log("  - Verify network (Base mainnet)");
        console.log("  - Check gas price settings");
        break;
        
      case ErrorType.NETWORK_ERROR:
        console.log("\n💡 Network troubleshooting tips:");
        console.log("  - Check internet connectivity");
        console.log("  - Verify RPC endpoint status");
        console.log("  - Try different RPC provider");
        break;
        
      case ErrorType.AUTH_ERROR:
        console.log("\n💡 Authentication troubleshooting tips:");
        console.log("  - Verify payment was completed");
        console.log("  - Check proof signature validity");
        console.log("  - Ensure proper headers");
        break;
    }
    
    throw x402Error;
  }
}

/**
 * Demonstrate batch operations with error isolation
 */
async function demoBatchOperations(client: X402Client, urls: string[]): Promise<void> {
  console.log("\n📦 Testing batch operations with error isolation...");
  
  const results = await Promise.allSettled(
    urls.map(async (url, index) => {
      try {
        const result = await makeProtectedRequest(client, url);
        return { index, url, success: true, result };
      } catch (error) {
        const x402Error = error as X402Error;
        return { 
          index, 
          url, 
          success: false, 
          error: X402ErrorHandler.getUserMessage(x402Error)
        };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
  
  console.log(`\n📊 Batch results: ${successful.length} successful, ${failed.length} failed`);
  
  if (failed.length > 0) {
    console.log("\nFailed requests:");
    failed.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log(`  ${result.value.index}: ${result.value.url} - ${result.value.error}`);
      }
    });
  }
}

/**
 * Main demonstration function
 */
async function main(): Promise<void> {
  console.log("🚀 x402 TypeScript Error Handling Example");
  console.log("==========================================\n");
  
  let config: Config;
  let client: X402Client;
  
  try {
    // Step 1: Load and validate configuration
    config = loadConfig();
    
    // Step 2: Initialize x402 client
    client = await createX402Client(config);
    
    // Step 3: Single request demonstration
    await makeProtectedRequest(client, config.TEST_ENDPOINT);
    
    // Step 4: Batch operations demonstration
    const testUrls = [
      config.TEST_ENDPOINT,
      "http://localhost:3000/another-endpoint",
      "http://invalid-url.test/protected"
    ];
    
    await demoBatchOperations(client, testUrls);
    
  } catch (error) {
    const x402Error = error as X402Error;
    console.error("\n💥 Fatal error occurred:");
    console.error(`${X402ErrorHandler.getUserMessage(x402Error)}`);
    
    // Exit with appropriate code based on error type
    const exitCode = x402Error.type === ErrorType.CONFIG_ERROR ? 1 : 2;
    process.exit(exitCode);
  }
}

// Handle unhandled errors gracefully
process.on('unhandledRejection', (reason) => {
  const error = X402ErrorHandler.classify(reason);
  console.error("💥 Unhandled rejection:", X402ErrorHandler.getUserMessage(error));
  process.exit(3);
});

process.on('uncaughtException', (error) => {
  const x402Error = X402ErrorHandler.classify(error);
  console.error("💥 Uncaught exception:", X402ErrorHandler.getUserMessage(x402Error));
  process.exit(4);
});

if (require.main === module) {
  main();
}