const { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

// Delegation contract used by EIP-7702 (matches batch execute ABI in this repo)
const DELEGATION_ADDRESS = '0xE28EcFec6dc61Bb1eA41A331db290A68807FF3C2';

// ABI for execute((address to,uint256 value,bytes data)[] calls)
const batchAbi = parseAbi([
    "function execute((address to,uint256 value,bytes data)[] calls) payable",
]);

async function sponsorDelegation() {
    try {
        if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required in .env file');
        if (!process.env.SPONSOR_PRIVATE_KEY) throw new Error('SPONSOR_PRIVATE_KEY is required in .env file');
        if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env file');

        const sponsorAccount = privateKeyToAccount(process.env.SPONSOR_PRIVATE_KEY);
        const smartAccount = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);

        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        const smartWalletClient = createWalletClient({
            account: smartAccount,
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        const sponsorWalletClient = createWalletClient({
            account: sponsorAccount,
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL)
        });

        console.log('🔗 Connected to Base Sepolia');
        console.log('💰 Sponsor wallet:', sponsorAccount.address);
        console.log('📱 Smart account:', smartAccount.address);

        // Smart account signs EIP-7702 authorization allowing the sponsor to execute
        const authorization = await smartWalletClient.signAuthorization({
            account: smartAccount,
            contractAddress: DELEGATION_ADDRESS,
            executor: sponsorAccount.address,
        });

        // Sponsor submits the tx and pays gas; includes the authorization from the smart account
        const hash = await sponsorWalletClient.sendTransaction({
            to: smartAccount.address,
            data: encodedCallData,
            authorizationList: [authorization],
        });

        console.log('📤 Sent tx:', hash);
        console.log('⏳ Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log('✅ Delegation sponsored successfully');
            console.log('🔗 Block:', receipt.blockNumber);
            console.log('🌐 Explorer:', `https://sepolia.basescan.org/tx/${hash}`);
        } else {
            throw new Error('Sponsored delegation transaction failed');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    sponsorDelegation();
}

module.exports = { sponsorDelegation };


