const { createWalletClient, createPublicClient, http, parseEther, encodeFunctionData, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const RECIPIENTS = [
	{ to: '0xFA992c932fab1B6B6E77318f25313c7Ef6E9b3Eb', amountEth: '0.001' },
];

const DELEGATION_ADDRESS = '0x5BBD264cd62A81B27BF7c6D25678d0CD56dEF0cC'; // Delegation contract used by EIP-7702

// ABI for batch execute
const batchAbi = parseAbi([
	"function execute((address to,uint256 value,bytes data)[] calls) payable",
]);

async function sendEthViaEip7702() {
	try {
		if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL is required');
		if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) throw new Error('PRIVATE_KEY is required');

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
		console.log('📱 Sender (EOA):', account.address);

		// 1) Sign EIP-7702 authorization (executor=self)
		const authorization = await walletClient.signAuthorization({
			account,
			executor: 'self',
			contractAddress: DELEGATION_ADDRESS,
		});

		// 2) Build batch calls to transfer ETH to recipients
		const calls = RECIPIENTS.map(({ to, amountEth }) => ({
			to,
			value: parseEther(amountEth),
			data: '0x',
		}));

		// 3) Encode call to execute(calls)
		const encodedCallData = encodeFunctionData({
			abi: batchAbi,
			functionName: 'execute',
			args: [calls],
		});

		// 4) Send transaction to self with authorization list
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
	} catch (err) {
		console.error('❌ Error:', err.message);
		process.exit(1);
	}
}

if (require.main === module) {
	sendEthViaEip7702();
}

module.exports = { sendEthViaEip7702 };
