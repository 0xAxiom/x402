/**
 * x402 Error Handling Example
 * 
 * Demonstrates comprehensive error handling patterns for x402 payments
 * including network errors, payment failures, validation errors, and recovery strategies.
 */

import { x402Fetch } from '@x402/fetch'
import type { PaymentParams, X402PaymentError } from '@x402/core'
import { createWalletClient, http, type PrivateKeyAccount } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import chalk from 'chalk'

// Error types and classification
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  PAYMENT = 'PAYMENT', 
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface X402Error {
  category: ErrorCategory
  code: string
  message: string
  retryable: boolean
  retryAfter?: number
  originalError?: Error
}

export class X402ErrorHandler {
  private maxRetries = 3
  private baseDelay = 1000 // 1 second

  /**
   * Classify error into appropriate category for handling
   */
  classifyError(error: any): X402Error {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return {
        category: ErrorCategory.NETWORK,
        code: error.code,
        message: `Network error: ${error.message}`,
        retryable: true,
        originalError: error
      }
    }

    // HTTP errors
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status
      
      switch (status) {
        case 402:
          return {
            category: ErrorCategory.PAYMENT,
            code: 'PAYMENT_REQUIRED',
            message: 'Payment required - x402 challenge received',
            retryable: true,
            originalError: error
          }
        
        case 400:
          return {
            category: ErrorCategory.VALIDATION,
            code: 'BAD_REQUEST',
            message: 'Invalid request format or parameters',
            retryable: false,
            originalError: error
          }
        
        case 401:
          return {
            category: ErrorCategory.VALIDATION,
            code: 'UNAUTHORIZED',
            message: 'Payment verification failed',
            retryable: false,
            originalError: error
          }
        
        case 429:
          return {
            category: ErrorCategory.SERVER,
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
            retryable: true,
            retryAfter: this.parseRetryAfter(error.headers?.['retry-after']),
            originalError: error
          }
        
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            category: ErrorCategory.SERVER,
            code: 'SERVER_ERROR',
            message: `Server error: ${status}`,
            retryable: true,
            originalError: error
          }
        
        default:
          return {
            category: ErrorCategory.SERVER,
            code: 'HTTP_ERROR',
            message: `HTTP ${status}: ${error.message}`,
            retryable: status >= 500,
            originalError: error
          }
      }
    }

    // Payment-specific errors
    if (error.message?.includes('insufficient funds') || error.message?.includes('balance')) {
      return {
        category: ErrorCategory.PAYMENT,
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient USDC balance for payment',
        retryable: false,
        originalError: error
      }
    }

    if (error.message?.includes('gas')) {
      return {
        category: ErrorCategory.PAYMENT,
        code: 'GAS_ERROR',
        message: 'Gas estimation or execution failed',
        retryable: true,
        originalError: error
      }
    }

    // Validation errors
    if (error.message?.includes('signature') || error.message?.includes('invalid')) {
      return {
        category: ErrorCategory.VALIDATION,
        code: 'INVALID_PAYMENT',
        message: 'Payment validation failed',
        retryable: false,
        originalError: error
      }
    }

    // Unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      retryable: false,
      originalError: error
    }
  }

  /**
   * Parse Retry-After header from rate limiting response
   */
  private parseRetryAfter(retryAfter?: string): number | undefined {
    if (!retryAfter) return undefined
    
    const seconds = parseInt(retryAfter, 10)
    return isNaN(seconds) ? undefined : seconds * 1000
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) return retryAfter
    return this.baseDelay * Math.pow(2, attempt)
  }

  /**
   * Execute request with comprehensive error handling and retries
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'x402 request'
  ): Promise<T> {
    let lastError: X402Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(chalk.blue(`🔄 Attempting ${operationName} (attempt ${attempt + 1}/${this.maxRetries + 1})`))
        
        const result = await operation()
        
        if (attempt > 0) {
          console.log(chalk.green(`✅ ${operationName} succeeded after ${attempt + 1} attempts`))
        }
        
        return result

      } catch (error) {
        const x402Error = this.classifyError(error)
        lastError = x402Error
        
        console.log(chalk.red(`❌ ${operationName} failed: ${x402Error.message}`))
        
        // Don't retry if not retryable or last attempt
        if (!x402Error.retryable || attempt === this.maxRetries) {
          break
        }

        const delay = this.calculateDelay(attempt, x402Error.retryAfter)
        console.log(chalk.yellow(`⏳ Retrying in ${delay}ms...`))
        
        await this.sleep(delay)
      }
    }

    // All retries exhausted
    throw new Error(
      `${operationName} failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message}`
    )
  }

  /**
   * Validate wallet balance before attempting payment
   */
  async validateBalance(
    walletClient: any,
    account: PrivateKeyAccount,
    requiredAmount: bigint
  ): Promise<void> {
    try {
      // For this example, we'll just check ETH balance
      // In production, you'd check USDC balance
      const balance = await walletClient.getBalance({ address: account.address })
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance: ${balance} < ${requiredAmount}`)
      }
      
      console.log(chalk.green(`✅ Balance check passed: ${balance}`))
    } catch (error) {
      console.log(chalk.red(`❌ Balance check failed: ${error.message}`))
      throw error
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Demo function to show error handling in action
async function main() {
  console.log(chalk.cyan('🚀 x402 Error Handling Demo'))
  console.log(chalk.cyan('='.repeat(40)))

  // Setup
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.log(chalk.red('❌ PRIVATE_KEY environment variable is required'))
    process.exit(1)
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  })

  const paymentParams: PaymentParams = {
    walletClient,
    network: 'eip155:8453'
  }
  const errorHandler = new X402ErrorHandler()

  // Demo endpoints for different error scenarios
  const testEndpoints = [
    {
      name: 'Valid x402 endpoint',
      url: 'https://api.test-x402.com/data',
      expectError: false
    },
    {
      name: 'Non-existent domain',
      url: 'https://nonexistent-domain-12345.com/api',
      expectError: true
    },
    {
      name: 'Rate limited endpoint',
      url: 'https://httpbin.org/status/429',
      expectError: true
    },
    {
      name: 'Server error endpoint',
      url: 'https://httpbin.org/status/500',
      expectError: true
    }
  ]

  // Test each endpoint with error handling
  for (const endpoint of testEndpoints) {
    console.log(chalk.blue(`\n📡 Testing: ${endpoint.name}`))
    console.log(chalk.gray(`URL: ${endpoint.url}`))
    
    try {
      await errorHandler.executeWithRetry(async () => {
        // Simulate balance validation
        await errorHandler.validateBalance(walletClient, account, BigInt(1000))
        
        // Make the request using x402Fetch
        const response = await x402Fetch(endpoint.url, {}, paymentParams)
        
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`)
          ;(error as any).status = response.status
          ;(error as any).headers = Object.fromEntries(response.headers.entries())
          throw error
        }
        
        return await response.text()
      }, `request to ${endpoint.name}`)
      
      console.log(chalk.green(`✅ ${endpoint.name} succeeded`))
      
    } catch (error) {
      console.log(chalk.red(`❌ ${endpoint.name} ultimately failed: ${error.message}`))
      
      const classified = errorHandler.classifyError(error)
      console.log(chalk.yellow(`📊 Error classification:`))
      console.log(chalk.yellow(`   Category: ${classified.category}`))
      console.log(chalk.yellow(`   Code: ${classified.code}`))
      console.log(chalk.yellow(`   Retryable: ${classified.retryable}`))
      
      if (!endpoint.expectError) {
        console.log(chalk.red(`⚠️  Unexpected error for ${endpoint.name}`))
      }
    }
  }

  console.log(chalk.cyan('\n🎯 Error handling demo complete'))
  console.log(chalk.gray('Check the logs above to see different error handling strategies in action'))
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Demo failed:'), error)
    process.exit(1)
  })
}

export { X402ErrorHandler }