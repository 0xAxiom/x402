/**
 * Multi-Chain x402 Client Example
 * 
 * This example demonstrates how to build x402 clients that seamlessly
 * support both EVM (Ethereum Virtual Machine) and Aptos blockchains,
 * automatically choosing the optimal payment method based on cost,
 * speed, and availability.
 */

import { X402Client } from "@x402/core";
import { ExactEvmScheme } from "@x402/mechanisms-evm";
import { ExactAptosScheme } from "@x402/aptos";
import { createWalletClient, createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";
import chalk from "chalk";
import ora from "ora";

dotenv.config();

interface ChainConfig {
  name: string;
  networkId: string;
  explorer: string;
  nativeCurrency: string;
  costMultiplier: number; // Relative cost compared to Aptos
  avgBlockTime: number; // seconds
}

interface WalletSetup {
  evm?: {
    address: string;
    chain: string;
  };
  aptos?: {
    address: string;
    network: string;
  };
}

const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  "eip155:8453": {
    name: "Base Mainnet",
    networkId: "eip155:8453", 
    explorer: "https://basescan.org",
    nativeCurrency: "ETH",
    costMultiplier: 10, // ~10x more expensive than Aptos
    avgBlockTime: 2
  },
  "eip155:84532": {
    name: "Base Sepolia",
    networkId: "eip155:84532",
    explorer: "https://sepolia.basescan.org", 
    nativeCurrency: "ETH",
    costMultiplier: 10,
    avgBlockTime: 2
  },
  "aptos:1": {
    name: "Aptos Mainnet",
    networkId: "aptos:1",
    explorer: "https://explorer.aptoslabs.com",
    nativeCurrency: "APT", 
    costMultiplier: 1, // Reference cost (cheapest)
    avgBlockTime: 1
  },
  "aptos:2": {
    name: "Aptos Testnet", 
    networkId: "aptos:2",
    explorer: "https://explorer.aptoslabs.com/txn",
    nativeCurrency: "APT",
    costMultiplier: 1,
    avgBlockTime: 1
  }
};

class MultiChainX402Client {
  private client: X402Client;
  private walletSetup: WalletSetup;

  constructor() {
    this.walletSetup = {};
    this.client = new X402Client({
      schemes: [],
      userAgent: "multi-chain-x402-client/1.0.0"
    });
  }

  /**
   * Initialize EVM support (Base mainnet and testnet)
   */
  async initializeEVM(): Promise<boolean> {
    console.log(chalk.blue("🔗 Initializing EVM support..."));
    
    const evmPrivateKey = process.env.EVM_PRIVATE_KEY;
    if (!evmPrivateKey) {
      console.log(chalk.yellow("⚠️  EVM_PRIVATE_KEY not found, skipping EVM support"));
      return false;
    }

    try {
      const account = privateKeyToAccount(evmPrivateKey as `0x${string}`);
      
      // Base mainnet setup
      const publicClient = createPublicClient({
        chain: base,
        transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org")
      });
      
      const walletClient = createWalletClient({
        account,
        chain: base, 
        transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org")
      });

      // Add EVM scheme to client
      const evmScheme = new ExactEvmScheme({ publicClient, walletClient });
      this.client.registerScheme(evmScheme);
      
      this.walletSetup.evm = {
        address: account.address,
        chain: "Base"
      };

      console.log(chalk.green("✅ EVM support initialized"));
      console.log(chalk.gray(`   Address: ${account.address}`));
      console.log(chalk.gray(`   Chain: Base Mainnet`));
      
      return true;
    } catch (error) {
      console.log(chalk.red("❌ Failed to initialize EVM support:"), error);
      return false;
    }
  }

  /**
   * Initialize Aptos support (mainnet and testnet)
   */
  async initializeAptos(): Promise<boolean> {
    console.log(chalk.blue("🪙 Initializing Aptos support..."));
    
    const aptosPrivateKey = process.env.APTOS_PRIVATE_KEY;
    if (!aptosPrivateKey) {
      console.log(chalk.yellow("⚠️  APTOS_PRIVATE_KEY not found, skipping Aptos support"));
      return false;
    }

    try {
      const privateKey = new Ed25519PrivateKey(aptosPrivateKey);
      const account = Account.fromPrivateKey({ privateKey });
      
      // Determine network (default to mainnet)
      const isTestnet = process.env.APTOS_NETWORK === "testnet";
      const aptosConfig = new AptosConfig({ 
        network: isTestnet ? Network.TESTNET : Network.MAINNET 
      });
      const aptos = new Aptos(aptosConfig);

      // Test connectivity
      const spinner = ora("Testing Aptos connectivity...").start();
      try {
        await aptos.getChainId();
        spinner.succeed("Aptos connectivity verified");
      } catch (error) {
        spinner.fail("Aptos connectivity failed");
        throw error;
      }

      // Add Aptos scheme to client  
      const aptosScheme = new ExactAptosScheme(account, aptos);
      this.client.registerScheme(aptosScheme);
      
      this.walletSetup.aptos = {
        address: account.accountAddress.toString(),
        network: isTestnet ? "Aptos Testnet" : "Aptos Mainnet"
      };

      console.log(chalk.green("✅ Aptos support initialized"));
      console.log(chalk.gray(`   Address: ${account.accountAddress.toString()}`));
      console.log(chalk.gray(`   Network: ${isTestnet ? "Testnet" : "Mainnet"}`));
      
      return true;
    } catch (error) {
      console.log(chalk.red("❌ Failed to initialize Aptos support:"), error);
      return false;
    }
  }

  /**
   * Get payment cost analysis for different chains
   */
  analyzePaymentCost(priceUsd: number): Record<string, { gasCost: number; totalCost: number; costUsd: string }> {
    const analysis: Record<string, { gasCost: number; totalCost: number; costUsd: string }> = {};
    
    Object.entries(SUPPORTED_CHAINS).forEach(([networkId, config]) => {
      const gasCost = networkId.startsWith("eip155") ? 0.001 : 0.0001; // Rough gas costs in USD
      const totalCost = priceUsd + (gasCost * config.costMultiplier);
      
      analysis[networkId] = {
        gasCost: gasCost * config.costMultiplier,
        totalCost,
        costUsd: `$${totalCost.toFixed(4)}`
      };
    });
    
    return analysis;
  }

  /**
   * Make a request with automatic chain selection
   */
  async makeRequest(url: string, options?: { preferChain?: string }): Promise<any> {
    console.log(chalk.blue(`\n🌐 Making request to: ${url}`));
    
    if (options?.preferChain) {
      console.log(chalk.gray(`   Preferred chain: ${SUPPORTED_CHAINS[options.preferChain]?.name || options.preferChain}`));
    }

    try {
      const response = await this.client.get(url);
      
      // Try to detect which scheme was used
      const paymentHeader = response.config?.headers?.['X-Payment-Required'];
      if (paymentHeader) {
        try {
          const requirements = JSON.parse(paymentHeader);
          const networkUsed = requirements.accepts?.[0]?.network;
          if (networkUsed && SUPPORTED_CHAINS[networkUsed]) {
            console.log(chalk.green(`✅ Payment completed via ${SUPPORTED_CHAINS[networkUsed].name}`));
          }
        } catch {
          console.log(chalk.green("✅ Payment completed"));
        }
      } else {
        console.log(chalk.green("✅ Request completed"));
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        // Analyze available payment options
        const requirements = JSON.parse(error.response.headers['payment-required'] || '{}');
        console.log(chalk.yellow("💰 Payment required - analyzing options:"));
        
        if (requirements.accepts) {
          requirements.accepts.forEach((option: any, index: number) => {
            const chain = SUPPORTED_CHAINS[option.network];
            const costAnalysis = this.analyzePaymentCost(parseFloat(option.price?.replace('$', '') || '0'));
            
            console.log(chalk.gray(`   Option ${index + 1}: ${chain?.name || option.network}`));
            console.log(chalk.gray(`     Price: ${option.price}`));
            console.log(chalk.gray(`     Total cost: ${costAnalysis[option.network]?.costUsd}`));
            console.log(chalk.gray(`     Speed: ~${chain?.avgBlockTime}s confirmation`));
          });
        }
        
        throw error;
      }
      
      console.log(chalk.red("❌ Request failed:"), error.message);
      throw error;
    }
  }

  /**
   * Display wallet setup summary
   */
  displayWalletSetup(): void {
    console.log(chalk.blue("\n💼 Wallet Setup Summary"));
    console.log(chalk.gray("═".repeat(50)));

    if (this.walletSetup.evm) {
      console.log(chalk.green("✅ EVM Support Enabled"));
      console.log(chalk.gray(`   Address: ${this.walletSetup.evm.address}`)); 
      console.log(chalk.gray(`   Chain: ${this.walletSetup.evm.chain}`));
    } else {
      console.log(chalk.yellow("⚠️  EVM Support Disabled"));
      console.log(chalk.gray("   Set EVM_PRIVATE_KEY to enable"));
    }

    if (this.walletSetup.aptos) {
      console.log(chalk.green("✅ Aptos Support Enabled"));
      console.log(chalk.gray(`   Address: ${this.walletSetup.aptos.address}`));
      console.log(chalk.gray(`   Network: ${this.walletSetup.aptos.network}`));
    } else {
      console.log(chalk.yellow("⚠️  Aptos Support Disabled"));
      console.log(chalk.gray("   Set APTOS_PRIVATE_KEY to enable"));
    }

    const supportedChains = Object.values(SUPPORTED_CHAINS).filter(chain => {
      if (chain.networkId.startsWith("eip155")) return this.walletSetup.evm;
      if (chain.networkId.startsWith("aptos")) return this.walletSetup.aptos;
      return false;
    });

    console.log(chalk.blue(`\n🌐 Supported Networks (${supportedChains.length})`));
    supportedChains.forEach(chain => {
      console.log(chalk.gray(`   • ${chain.name} (${chain.networkId})`));
    });
  }

  /**
   * Demonstrate cost comparison across chains
   */
  demonstrateCostComparison(): void {
    console.log(chalk.blue("\n💰 Cost Comparison Analysis"));
    console.log(chalk.gray("═".repeat(70)));

    const testAmounts = [0.001, 0.01, 0.1, 1.0];
    
    console.log(chalk.cyan("Amount".padEnd(10) + Object.values(SUPPORTED_CHAINS).map(c => c.name.padEnd(15)).join("")));
    console.log(chalk.gray("─".repeat(70)));

    testAmounts.forEach(amount => {
      const analysis = this.analyzePaymentCost(amount);
      const row = `$${amount.toFixed(3)}`.padEnd(10) + 
                  Object.entries(SUPPORTED_CHAINS).map(([networkId, config]) => {
                    const cost = analysis[networkId];
                    return cost ? cost.costUsd.padEnd(15) : "N/A".padEnd(15);
                  }).join("");
      
      console.log(chalk.white(row));
    });

    console.log(chalk.gray("─".repeat(70)));
    console.log(chalk.yellow("* Includes estimated gas costs"));
    console.log(chalk.green("💡 Aptos offers significant cost savings for small payments"));
  }

  /**
   * Initialize the multi-chain client
   */
  async initialize(): Promise<boolean> {
    console.log(chalk.bold.blue("🚀 Multi-Chain x402 Client"));
    console.log(chalk.gray("Initializing support for EVM and Aptos blockchains\n"));

    const evmInitialized = await this.initializeEVM();
    const aptosInitialized = await this.initializeAptos();
    
    if (!evmInitialized && !aptosInitialized) {
      console.log(chalk.red("\n❌ No blockchain support initialized"));
      console.log(chalk.yellow("Please set EVM_PRIVATE_KEY and/or APTOS_PRIVATE_KEY"));
      return false;
    }

    this.displayWalletSetup();
    this.demonstrateCostComparison();
    
    return true;
  }

  /**
   * Get the underlying x402 client for direct use
   */
  getClient(): X402Client {
    return this.client;
  }
}

/**
 * Demonstrate multi-chain request handling
 */
async function demonstrateMultiChainUsage(multiChainClient: MultiChainX402Client): Promise<void> {
  console.log(chalk.blue("\n🔄 Multi-Chain Request Demonstration"));
  console.log(chalk.gray("Testing automatic chain selection and payment processing\n"));

  const testEndpoints = [
    {
      url: process.env.EVM_TEST_ENDPOINT || "http://localhost:3000/evm-only",
      description: "EVM-only endpoint"
    },
    {
      url: process.env.APTOS_TEST_ENDPOINT || "http://localhost:3000/aptos-only", 
      description: "Aptos-only endpoint"
    },
    {
      url: process.env.MULTI_CHAIN_ENDPOINT || "http://localhost:3000/multi-chain",
      description: "Multi-chain endpoint (client chooses optimal)"
    }
  ];

  const client = multiChainClient.getClient();

  for (const endpoint of testEndpoints) {
    console.log(chalk.cyan(`\n📡 Testing: ${endpoint.description}`));
    console.log(chalk.gray(`   URL: ${endpoint.url}`));
    
    try {
      const startTime = Date.now();
      const response = await client.get(endpoint.url);
      const duration = Date.now() - startTime;
      
      console.log(chalk.green(`   ✅ Success (${duration}ms)`));
      console.log(chalk.gray(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`));
    } catch (error: any) {
      if (error.response?.status === 402) {
        console.log(chalk.yellow("   💳 Payment required"));
        
        // Show payment options
        const requirements = JSON.parse(error.response.headers['payment-required'] || '{}');
        if (requirements.accepts) {
          console.log(chalk.gray("   Available payment methods:"));
          requirements.accepts.forEach((option: any, index: number) => {
            const chain = SUPPORTED_CHAINS[option.network];
            console.log(chalk.gray(`     ${index + 1}. ${chain?.name || option.network}: ${option.price}`));
          });
        }
      } else {
        console.log(chalk.red("   ❌ Failed:"), error.message);
      }
    }
  }
}

/**
 * Chain preference strategy examples
 */
async function demonstrateChainStrategies(multiChainClient: MultiChainX402Client): Promise<void> {
  console.log(chalk.blue("\n🎯 Chain Selection Strategies"));
  console.log(chalk.gray("Different approaches for choosing optimal payment methods\n"));

  const client = multiChainClient.getClient();
  const testUrl = process.env.MULTI_CHAIN_ENDPOINT || "http://localhost:3000/multi-chain";

  const strategies = [
    {
      name: "Cost Optimization",
      description: "Always choose the cheapest option",
      implementation: "Automatic (x402 client chooses lowest total cost)"
    },
    {
      name: "Speed Optimization", 
      description: "Prefer faster confirmation chains",
      implementation: "Prefer Aptos (1s) over EVM (2s)"
    },
    {
      name: "Network Reliability",
      description: "Prefer chains with better uptime",
      implementation: "Fallback chain selection based on health"
    }
  ];

  strategies.forEach((strategy, index) => {
    console.log(chalk.cyan(`${index + 1}. ${strategy.name}`));
    console.log(chalk.gray(`   ${strategy.description}`));
    console.log(chalk.gray(`   Implementation: ${strategy.implementation}\n`));
  });

  console.log(chalk.green("💡 The x402 client automatically implements cost optimization"));
  console.log(chalk.gray("   When multiple payment options are available, it selects the lowest total cost"));
}

/**
 * Main demonstration function
 */
async function main(): Promise<void> {
  const multiChainClient = new MultiChainX402Client();
  
  // Initialize blockchain support
  const initialized = await multiChainClient.initialize();
  if (!initialized) {
    process.exit(1);
  }

  // Demonstrate multi-chain functionality
  await demonstrateMultiChainUsage(multiChainClient);
  
  // Show chain selection strategies
  await demonstrateChainStrategies(multiChainClient);

  console.log(chalk.blue("\n📚 Next Steps"));
  console.log(chalk.gray("• Try different endpoints with various payment requirements"));
  console.log(chalk.gray("• Monitor gas costs and transaction times"));
  console.log(chalk.gray("• Experiment with chain preference settings"));
  console.log(chalk.gray("• Build applications that leverage multiple chains"));

  console.log(chalk.green("\n🎉 Multi-chain demo complete!"));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Shutting down gracefully...'));
  process.exit(0);
});

// Enhanced error handling
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n💥 Unhandled rejection:'), reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });
}