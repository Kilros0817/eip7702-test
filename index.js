const { createWalletClient, createPublicClient, http, zeroAddress } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

const DELEGATION_ADDRESS = '0xE28EcFec6dc61Bb1eA41A331db290A68807FF3C2';

async function convertToSmartAccount() {
    try {
        // Validate environment variables
        if (!process.env.BASE_SEPOLIA_RPC_URL) {
            throw new Error('SEPOLIA_RPC_URL is required in .env file');
        }
        if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY is required in .env file');
        }

        // Create account from private key
        const account = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);

        // Create public client for reading
        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        // Create wallet client for transactions
        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        console.log('🔗 Connected to Sepolia network');
        console.log('📱 Wallet address:', account.address);

        // Use signAuthorization method with only mandatory fields
        const authorization = await walletClient.signAuthorization({
            account: account,
            contractAddress: DELEGATION_ADDRESS,
            executor: "self"
        });

        const hash = await walletClient.sendTransaction({
            authorizationList: [authorization],
            data: "0x",
            to: account.address,
        });

        console.log('✍️  EIP-7702 delegation transaction sent');
        console.log('📋 Transaction hash:', hash);
        console.log('⏳ Waiting for confirmation...');

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log('✅ Transaction confirmed!');
            console.log('🔗 Block number:', receipt.blockNumber);
            console.log('⛽ Gas used:', receipt.gasUsed.toString());
            console.log('🌐 Explorer URL:', `https://sepolia.basescan.org//tx/${hash}`);

            console.log('\n🎉 Success! Your EOA executed with smart contract delegation!');
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    console.log('🚀 Starting EIP-7702 Per-Transaction Delegation with Viem...\n');
    console.log('💡 EIP-7702 enables EOAs to temporarily delegate execution to smart contracts');
    console.log('🔄 This is per-transaction delegation, not permanent conversion\n');
    convertToSmartAccount();
}

module.exports = { convertToSmartAccount };
