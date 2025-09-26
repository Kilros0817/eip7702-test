const { createWalletClient, createPublicClient, http, formatEther, parseEther, encodePacked, keccak256, encodeFunctionData, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

require('dotenv').config();

const RECIPIENTS = [
    { address: '0xFA992c932fab1B6B6E77318f25313c7Ef6E9b3Eb', amount: '0.001' }, // 👈 Recipient 1
];

function toEthSignedMessageHash(messageHash) {
    const prefix = "\x19Ethereum Signed Message:\n32";
    return keccak256(encodePacked(["string", "bytes32"], [prefix, messageHash]));
}

// Batch contract ABI for execute + nonce
const batchAbi = [
    {
        "inputs": [],
        "name": "nonce",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// EIP-7702 delegation contract address (Base Sepolia)
const DELEGATION_ADDRESS = '0xE28EcFec6dc61Bb1eA41A331db290A68807FF3C2';

/**
 * Batch ETH transfer from EIP-7702 smart account using sponsor wallet
 */
async function batchEthTransfer() {
    try {
        // Validate environment variables
        if (!process.env.BASE_SEPOLIA_RPC_URL) {
            throw new Error('BASE_SEPOLIA_RPC_URL is required in .env file');
        }
        if (!process.env.SPONSOR_PRIVATE_KEY) {
            throw new Error('SPONSOR_PRIVATE_KEY is required in .env file (sponsor wallet private key)');
        }
        if (!process.env.SMART_ACCOUNT_PRIVATE_KEY) {
            throw new Error('SMART_ACCOUNT_PRIVATE_KEY is required in .env file (smart account private key)');
        }

        // Create accounts
        const sponsorAccount = privateKeyToAccount(process.env.SPONSOR_PRIVATE_KEY);
        const smartAccount = privateKeyToAccount(process.env.SMART_ACCOUNT_PRIVATE_KEY);

        // Create clients
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

        console.log('🔗 Connected to Base Sepolia network');
        console.log('💰 Sponsor wallet address:', sponsorAccount.address);
        console.log('📱 Smart account address:', smartAccount.address);
        console.log('🎯 Batch transfer to', RECIPIENTS.length, 'recipients');


        // 1. Create batch calls for ETH transfers
        const calls = RECIPIENTS.map(recipient => ({
            to: recipient.address,
            value: parseEther(recipient.amount),
            data: '0x' // Empty data for ETH transfer
        }));

        // 2. Encode the batched calls for use in the digest
        // Match the smart contract's encoding: abi.encodePacked(encodedCalls, calls[i].to, calls[i].value, calls[i].data)
        let encodedCallBytes = '0x';
        for (const call of calls) {
            const callEncoded = encodePacked(
                ["address", "uint256", "bytes"],
                [call.to, call.value, call.data]
            );
            encodedCallBytes = encodePacked(
                ["bytes", "bytes"],
                [encodedCallBytes, callEncoded]
            );
        }

        // 3. Read the current nonce from the smart account
        const nonce = await publicClient.readContract({
            address: smartAccount.address,
            abi: batchAbi,
            functionName: "nonce",
        });

        console.log(nonce, "=========nonce======")

        console.log('🔢 Current nonce:', nonce.toString());

        // 4. Create a digest of the nonce and encoded call bytes
        const digest = keccak256(
            encodePacked(["uint256", "bytes"], [BigInt(nonce), encodedCallBytes])
        );

        console.log('🔐 Digest created for batch authorization');
        console.log('🔐 Digest:', digest);
        console.log('🔐 Encoded call bytes:', encodedCallBytes);


        console.log('🔐 toEthSignedMessageHash(digest):', toEthSignedMessageHash(digest));
        // 5. Sign RAW digest. Wallet will apply the EIP-191 prefix internally.
        //    On-chain, use ECDSA.toEthSignedMessageHash(digest) before recover.
        const signature = await smartWalletClient.signMessage({
            message: { raw: digest }
        });

        console.log('🔐 Signature:', signature);

        // 7. Encode call to execute(calls, signature)
        const encodedCallData = encodeFunctionData({
            abi: parseAbi([
                'function execute((address to,uint256 value,bytes data)[] calls, bytes signature) payable',
            ]),
            functionName: 'execute',
            args: [calls, signature],
        });

        // 8. Sponsor executes the batch transaction with authorizationList
        const hash = await sponsorWalletClient.sendTransaction({
            to: smartAccount.address,
            data: encodedCallData,
        });

        console.log('🚀 Batch transfer transaction sent');
        console.log('📋 Transaction hash:', hash);
        console.log('⏳ Waiting for confirmation...');

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log('✅ Batch transfer completed successfully!');
            console.log('🔗 Block number:', receipt.blockNumber);
            console.log('⛽ Gas used:', receipt.gasUsed.toString());
            console.log('💰 Gas price:', receipt.effectiveGasPrice?.toString(), 'wei');
            console.log('🌐 Explorer URL:', `https://sepolia.basescan.org/tx/${hash}`);

            // Check final balances
            console.log('\n📊 Final Balances:');
            const finalSmartAccountBalance = await publicClient.getBalance({
                address: smartAccount.address
            });
            console.log('📱 Smart account balance:', formatEther(finalSmartAccountBalance), 'ETH');

            // Check recipient balances
            for (const recipient of RECIPIENTS) {
                const recipientBalance = await publicClient.getBalance({
                    address: recipient.address
                });
                console.log(`🎯 ${recipient.address}: ${formatEther(recipientBalance)} ETH`);
            }

            console.log('\n🎉 Batch ETH transfer completed successfully!');
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Main function - runs automatically
async function main() {
    try {
        console.log('🚀 EIP-7702 Batch ETH Transfer Script');
        console.log('=====================================\n');

        await batchEthTransfer();

    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Export functions for use in other modules
module.exports = { batchEthTransfer };

// Run automatically when script is executed
if (require.main === module) {
    main();
}
