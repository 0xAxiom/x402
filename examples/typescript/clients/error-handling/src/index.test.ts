/**
 * Tests for x402 error handling
 * 
 * Run with: pnpm test
 */

import { describe, it, expect, vi } from 'vitest'
import { X402ErrorHandler, ErrorCategory } from './index.js'

describe('X402ErrorHandler', () => {
  const handler = new X402ErrorHandler()

  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' }
      const result = handler.classifyError(networkError)
      
      expect(result.category).toBe(ErrorCategory.NETWORK)
      expect(result.retryable).toBe(true)
      expect(result.code).toBe('ECONNREFUSED')
    })

    it('should classify 402 Payment Required correctly', () => {
      const paymentError = { status: 402, message: 'Payment Required' }
      const result = handler.classifyError(paymentError)
      
      expect(result.category).toBe(ErrorCategory.PAYMENT)
      expect(result.retryable).toBe(true)
      expect(result.code).toBe('PAYMENT_REQUIRED')
    })

    it('should classify rate limiting correctly', () => {
      const rateLimitError = { 
        status: 429, 
        message: 'Too Many Requests',
        headers: { 'retry-after': '60' }
      }
      const result = handler.classifyError(rateLimitError)
      
      expect(result.category).toBe(ErrorCategory.SERVER)
      expect(result.retryable).toBe(true)
      expect(result.code).toBe('RATE_LIMITED')
      expect(result.retryAfter).toBe(60000) // 60 seconds in ms
    })

    it('should classify validation errors as non-retryable', () => {
      const validationError = { status: 400, message: 'Bad Request' }
      const result = handler.classifyError(validationError)
      
      expect(result.category).toBe(ErrorCategory.VALIDATION)
      expect(result.retryable).toBe(false)
      expect(result.code).toBe('BAD_REQUEST')
    })

    it('should classify server errors as retryable', () => {
      const serverError = { status: 500, message: 'Internal Server Error' }
      const result = handler.classifyError(serverError)
      
      expect(result.category).toBe(ErrorCategory.SERVER)
      expect(result.retryable).toBe(true)
      expect(result.code).toBe('SERVER_ERROR')
    })

    it('should classify insufficient funds correctly', () => {
      const fundsError = { message: 'insufficient funds for transaction' }
      const result = handler.classifyError(fundsError)
      
      expect(result.category).toBe(ErrorCategory.PAYMENT)
      expect(result.retryable).toBe(false)
      expect(result.code).toBe('INSUFFICIENT_FUNDS')
    })
  })

  describe('executeWithRetry', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await handler.executeWithRetry(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'Timeout' })
        .mockResolvedValueOnce('success')
      
      const result = await handler.executeWithRetry(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValue({ status: 400, message: 'Bad Request' })
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should exhaust retries for persistent errors', async () => {
      const operation = vi.fn()
        .mockRejectedValue({ code: 'ETIMEDOUT', message: 'Timeout' })
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })
  })
})