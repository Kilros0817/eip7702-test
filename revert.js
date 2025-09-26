const { createWalletClient, createPublicClient, http, zeroAddress } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

async function revertEip7702() {
    try {
        if (!process.env.BASE_SEPOLIA_RPC_URL) {
            throw new Error('BASE_SEPOLIA_RPC_URL is required in .env file');
        }
        if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) {
            throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env file');
        }

        const account = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);

        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        console.log('🔗 Connected to Base Sepolia');
        console.log('📱 Account:', account.address);
        console.log('↩️  Reverting EIP-7702 delegation to zero address');

        // Sign EIP-7702 authorization with zero address to clear delegation
        const authorization = await walletClient.signAuthorization({
            account,
            executor: 'self',
            contractAddress: zeroAddress,
        });

        // Send self-transaction with the authorization list
        const hash = await walletClient.sendTransaction({
            to: account.address,
            data: '0x',
            authorizationList: [authorization],
        });

        console.log('📤 Sent tx:', hash);
        console.log('⏳ Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log('✅ Revert confirmed in block', receipt.blockNumber);
            console.log('🌐 Explorer:', `https://sepolia.basescan.org/tx/${hash}`);
        } else {
            throw new Error('Revert transaction failed');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    console.log('🚀 Starting EIP-7702 Revert...');
    revertEip7702();
}

module.exports = { revertEip7702 };


