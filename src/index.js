const {
    createWalletClient,
    createPublicClient,
    http,
    zeroAddress,
    parseEther,
    formatEther,
    encodeFunctionData,
    encodePacked,
    keccak256,
    parseAbi,
} = require('viem');
const { baseSepolia, mainnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

// ============ CONFIG (edit for get-bytecode, direct, sponsor) ============
const CONFIG = {
    getBytecode: {
        address: '0xE0b9dEa53a90B7a2986356157e2812e5335A4a1D',
        rpcUrl: 'https://sepolia.base.org',
        chain: baseSepolia,
    },
    directRecipients: [
        { to: '0xFA992c932fab1B6B6E77318f25313c7Ef6E9b3Eb', amountEth: '0.001' },
    ],
    sponsorRecipients: [
        { address: '0xFA992c932fab1B6B6E77318f25313c7Ef6E9b3Eb', amount: '0.001' },
    ],
};

const DELEGATION_ADDRESS = '0xE28EcFec6dc61Bb1eA41A331db290A68807FF3C2';

const BATCH_EXECUTE_ABI = parseAbi([
    'function execute((address to,uint256 value,bytes data)[] calls) payable',
]);
const BATCH_EXECUTE_WITH_SIG_ABI = parseAbi([
    'function execute((address to,uint256 value,bytes data)[] calls, bytes signature) payable',
]);
const NONCE_ABI = [{ inputs: [], name: 'nonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' }];

function toEthSignedMessageHash(messageHash) {
    const prefix = '\x19Ethereum Signed Message:\n32';
    return keccak256(encodePacked(['string', 'bytes32'], [prefix, messageHash]));
}

// ---------- getBytecode ----------
async function getBytecode(address, rpcUrl, chain = baseSepolia) {
    if (!address) throw new Error('Address is required');
    if (!rpcUrl) throw new Error('RPC URL is required');

    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    console.log(`🔍 Getting bytecode for address: ${address}`);
    console.log(`🌐 Network: ${chain.name}`);

    const bytecode = await publicClient.getBytecode({ address });

    if (bytecode) {
        console.log('✅ Bytecode found!');
        console.log(`📏 Bytecode length: ${bytecode.length} characters (${(bytecode.length - 2) / 2} bytes)`);
        console.log('\n📄 Bytecode:', bytecode);
        console.log('\n📊 Analysis:');
        console.log(`- Is contract: Yes`);
        console.log(`- First 10 bytes: ${bytecode.slice(0, 22)}`);
        console.log(`- Last 10 bytes: ${bytecode.slice(-22)}`);
    } else {
        console.log('❌ No bytecode found (EOA or non-existent address)');
    }
    return bytecode;
}

// ---------- convertToSmartAccount ----------
async function convertToSmartAccount() {
    if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required in .env');
    if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env');

    const account = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });

    console.log('🔗 Connected to Sepolia network');
    console.log('📱 Wallet address:', account.address);

    const authorization = await walletClient.signAuthorization({
        account,
        contractAddress: DELEGATION_ADDRESS,
        executor: 'self',
    });

    const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: '0x',
        to: account.address,
    });

    console.log('✍️  EIP-7702 delegation transaction sent');
    console.log('📋 Transaction hash:', hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Transaction failed');

    console.log('✅ Transaction confirmed!');
    console.log('🔗 Block number:', receipt.blockNumber);
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    console.log('🌐 Explorer URL:', `https://sepolia.basescan.org/tx/${hash}`);
    console.log('\n🎉 Success! Your EOA executed with smart contract delegation!');
}

// ---------- revertDelegation ----------
async function revertDelegation() {
    if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required in .env');
    if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env');

    const account = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });

    console.log('🔗 Connected to Base Sepolia');
    console.log('📱 Account:', account.address);
    console.log('↩️  Reverting EIP-7702 delegation to zero address');

    const authorization = await walletClient.signAuthorization({
        account,
        executor: 'self',
        contractAddress: zeroAddress,
    });

    const hash = await walletClient.sendTransaction({
        to: account.address,
        data: '0x',
        authorizationList: [authorization],
    });

    console.log('📤 Sent tx:', hash);
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Revert transaction failed');

    console.log('✅ Revert confirmed in block', receipt.blockNumber);
    console.log('🌐 Explorer:', `https://sepolia.basescan.org/tx/${hash}`);
}

// ---------- sendDirectBatchTransfer ----------
async function sendDirectBatchTransfer() {
    if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required');
    if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required');

    const account = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });

    console.log('🔗 Connected to Base Sepolia');
    console.log('📱 Sender (EOA):', account.address);

    const authorization = await walletClient.signAuthorization({
        account,
        executor: 'self',
        contractAddress: DELEGATION_ADDRESS,
    });

    const calls = CONFIG.directRecipients.map(({ to, amountEth }) => ({
        to,
        value: parseEther(amountEth),
        data: '0x',
    }));

    const encodedCallData = encodeFunctionData({
        abi: BATCH_EXECUTE_ABI,
        functionName: 'execute',
        args: [calls],
    });

    const hash = await walletClient.sendTransaction({
        to: account.address,
        data: encodedCallData,
        authorizationList: [authorization],
    });

    console.log('📤 Sent tx:', hash);
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ Confirmed in block', receipt.blockNumber);
    console.log('🌐 Explorer:', `https://sepolia.basescan.org/tx/${hash}`);
}

// ---------- sponsorBatchTransfer ----------
async function sponsorBatchTransfer() {
    if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required in .env');
    if (!process.env.SPONSOR_PRIVATE_KEY) throw new Error('SPONSOR_PRIVATE_KEY is required in .env');
    if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env');

    const sponsorAccount = privateKeyToAccount(process.env.SPONSOR_PRIVATE_KEY);
    const smartAccount = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const smartWalletClient = createWalletClient({
        account: smartAccount,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const sponsorWalletClient = createWalletClient({
        account: sponsorAccount,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });

    console.log('🔗 Connected to Base Sepolia network');
    console.log('💰 Sponsor wallet:', sponsorAccount.address);
    console.log('📱 Smart account:', smartAccount.address);
    console.log('🎯 Batch transfer to', CONFIG.sponsorRecipients.length, 'recipients');

    const calls = CONFIG.sponsorRecipients.map((r) => ({
        to: r.address,
        value: parseEther(r.amount),
        data: '0x',
    }));

    let encodedCallBytes = '0x';
    for (const call of calls) {
        const callEncoded = encodePacked(['address', 'uint256', 'bytes'], [call.to, call.value, call.data]);
        encodedCallBytes = encodePacked(['bytes', 'bytes'], [encodedCallBytes, callEncoded]);
    }

    const nonce = await publicClient.readContract({
        address: smartAccount.address,
        abi: NONCE_ABI,
        functionName: 'nonce',
    });
    console.log('🔢 Current nonce:', nonce.toString());

    const digest = keccak256(encodePacked(['uint256', 'bytes'], [BigInt(nonce), encodedCallBytes]));
    const signature = await smartWalletClient.signMessage({ message: { raw: digest } });

    const encodedCallData = encodeFunctionData({
        abi: BATCH_EXECUTE_WITH_SIG_ABI,
        functionName: 'execute',
        args: [calls, signature],
    });

    const hash = await sponsorWalletClient.sendTransaction({
        to: smartAccount.address,
        data: encodedCallData,
    });

    console.log('🚀 Batch transfer transaction sent');
    console.log('📋 Transaction hash:', hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Transaction failed');

    console.log('✅ Batch transfer completed successfully!');
    console.log('🔗 Block number:', receipt.blockNumber);
    console.log('⛽ Gas used:', receipt.gasUsed.toString());
    console.log('🌐 Explorer URL:', `https://sepolia.basescan.org/tx/${hash}`);
    console.log('\n📊 Final Balances:');
    const smartBalance = await publicClient.getBalance({ address: smartAccount.address });
    console.log('📱 Smart account balance:', formatEther(smartBalance), 'ETH');
    for (const r of CONFIG.sponsorRecipients) {
        const bal = await publicClient.getBalance({ address: r.address });
        console.log(`🎯 ${r.address}: ${formatEther(bal)} ETH`);
    }
    console.log('\n🎉 Batch ETH transfer completed successfully!');
}

// ---------- sponsorDelegation ----------
async function sponsorDelegation() {
    if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required in .env');
    if (!process.env.SPONSOR_PRIVATE_KEY) throw new Error('SPONSOR_PRIVATE_KEY is required in .env');
    if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env');

    const sponsorAccount = privateKeyToAccount(process.env.SPONSOR_PRIVATE_KEY);
    const smartAccount = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const smartWalletClient = createWalletClient({
        account: smartAccount,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });
    const sponsorWalletClient = createWalletClient({
        account: sponsorAccount,
        chain: baseSepolia,
        transport: http(process.env.BASE_SEPOLIA_RPC_URL),
    });

    console.log('🔗 Connected to Base Sepolia');
    console.log('💰 Sponsor wallet:', sponsorAccount.address);
    console.log('📱 Smart account:', smartAccount.address);

    const authorization = await smartWalletClient.signAuthorization({
        account: smartAccount,
        contractAddress: DELEGATION_ADDRESS,
        executor: sponsorAccount.address,
    });

    const encodedCallData = encodeFunctionData({
        abi: BATCH_EXECUTE_ABI,
        functionName: 'execute',
        args: [[]],
    });

    const hash = await sponsorWalletClient.sendTransaction({
        to: smartAccount.address,
        data: encodedCallData,
        authorizationList: [authorization],
    });

    console.log('📤 Sent tx:', hash);
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Sponsored delegation transaction failed');

    console.log('✅ Delegation sponsored successfully');
    console.log('🔗 Block:', receipt.blockNumber);
    console.log('🌐 Explorer:', `https://sepolia.basescan.org/tx/${hash}`);
}

// ---------- CLI ----------
const COMMANDS = {
    convert: { fn: convertToSmartAccount, help: 'EIP-7702 per-transaction delegation (self)' },
    'get-bytecode': { fn: getBytecodeRun, help: 'Get bytecode of an address (uses CONFIG.getBytecode)' },
    revert: { fn: revertDelegation, help: 'Revert EIP-7702 delegation to zero address' },
    direct: { fn: sendDirectBatchTransfer, help: 'Direct batch ETH transfer (self-funded)' },
    sponsor: { fn: sponsorBatchTransfer, help: 'Sponsored batch ETH transfer' },
    'sponsor-delegation': { fn: sponsorDelegation, help: 'Sponsor sets up delegation for smart account' },
};

async function getBytecodeRun() {
    const { address, rpcUrl, chain } = CONFIG.getBytecode;
    await getBytecode(address, rpcUrl, chain);
}

function printUsage() {
    console.log('Usage: node src/index.js <command>');
    console.log('Commands:');
    for (const [cmd, { help }] of Object.entries(COMMANDS)) {
        console.log(`  ${cmd.padEnd(18)} ${help}`);
    }
}

async function main() {
    const cmd = process.argv[2];
    if (!cmd || !COMMANDS[cmd]) {
        printUsage();
        process.exit(cmd ? 1 : 0);
    }
    try {
        await COMMANDS[cmd].fn();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    getBytecode,
    convertToSmartAccount,
    revertDelegation,
    sendDirectBatchTransfer,
    sponsorBatchTransfer,
    sponsorDelegation,
    CONFIG,
};
