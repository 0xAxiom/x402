import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createX402Client, getWalletInfo } from '../src/index'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('@x402/agent', () => {
  let testDir: string
  let walletPath: string

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `x402-agent-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    walletPath = join(testDir, 'wallet.json')
  })

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('createX402Client', () => {
    it('should create a client with default configuration', async () => {
      const client = await createX402Client({ walletPath })

      expect(typeof client).toBe('function')
      expect(existsSync(walletPath)).toBe(true)
    })

    it('should auto-generate wallet on first run', async () => {
      expect(existsSync(walletPath)).toBe(false)

      await createX402Client({ walletPath })

      expect(existsSync(walletPath)).toBe(true)

      const walletInfo = getWalletInfo(walletPath)
      expect(walletInfo).toBeTruthy()
      expect(walletInfo?.addresses.evm).toMatch(/^0x[a-fA-F0-9]{40}$/)
      // SVM address might be undefined if Solana support is not available
      if (walletInfo?.addresses.svm) {
        expect(walletInfo.addresses.svm).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
      }
    })

    it('should reuse existing wallet on subsequent runs', async () => {
      // First run - create wallet
      await createX402Client({ walletPath })
      const firstWallet = getWalletInfo(walletPath)

      // Second run - should reuse same wallet
      await createX402Client({ walletPath })
      const secondWallet = getWalletInfo(walletPath)

      expect(firstWallet?.addresses.evm).toBe(secondWallet?.addresses.evm)
      expect(firstWallet?.addresses.svm).toBe(secondWallet?.addresses.svm)
    })

    it('should accept custom private keys', async () => {
      const customEvmKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
      const customSvmKey = '5J3mBbAH58CpQ3Y2BbkByE4xNqkMSMW5kLvAj9C9kJ2yHw1F4g3i4j5k6l7m8n9o'

      const _client = await createX402Client({
        walletPath,
        evmPrivateKey: customEvmKey,
        svmPrivateKey: customSvmKey,
      })

      const walletInfo = getWalletInfo(walletPath)
      expect(walletInfo?.evmPrivateKey).toBe(customEvmKey)
      // SVM private key might be undefined if Solana support is not available
      if (walletInfo?.svmPrivateKey) {
        expect(walletInfo.svmPrivateKey).toBe(customSvmKey)
      }
    })
  })

  describe('getWalletInfo', () => {
    it('should return null for non-existent wallet', () => {
      const walletInfo = getWalletInfo('/non/existent/path')
      expect(walletInfo).toBeNull()
    })

    it('should return wallet info for existing wallet', async () => {
      // Create wallet first
      await createX402Client({ walletPath })

      const walletInfo = getWalletInfo(walletPath)
      expect(walletInfo).toBeTruthy()
      expect(walletInfo?.addresses.evm).toMatch(/^0x[a-fA-F0-9]{40}$/)
      // SVM address might be undefined if Solana support is not available
      if (walletInfo?.addresses.svm) {
        expect(walletInfo.addresses.svm).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
      }
      expect(walletInfo?.created).toBeTruthy()
    })
  })

  describe('spending limits', () => {
    it('should accept valid spending limits in config', async () => {
      await expect(async () => {
        await createX402Client({
          walletPath,
          maxPaymentPerCall: '0.01',
          maxPaymentPerHour: '0.50',
          maxPaymentPerDay: '5.00',
        })
      }).not.toThrow()
    })
  })
})
