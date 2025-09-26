const { createPublicClient, http } = require('viem');
const { baseSepolia, mainnet } = require('viem/chains');

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const TARGET_ADDRESS = '0xE0b9dEa53a90B7a2986356157e2812e5335A4a1D'; // 👈 CHANGE THIS ADDRESS
const RPC_URL = 'https://sepolia.base.org'; // 👈 CHANGE THIS RPC URL
const NETWORK = baseSepolia; // 👈 CHANGE THIS (sepolia or mainnet)

/**
 * Get bytecode of an Ethereum address
 * @param {string} address - The Ethereum address to get bytecode for
 * @param {string} rpcUrl - RPC URL for the network
 * @param {object} chain - Chain configuration (sepolia, mainnet, etc.)
 */
async function getBytecode(address, rpcUrl, chain = baseSepolia) {
    try {
        // Validate inputs
        if (!address) {
            throw new Error('Address is required');
        }
        if (!rpcUrl) {
            throw new Error('RPC URL is required');
        }

        // Create public client
        const publicClient = createPublicClient({
            chain: chain,
            transport: http(rpcUrl)
        });

        console.log(`🔍 Getting bytecode for address: ${address}`);
        console.log(`🌐 Network: ${chain.name}`);

        // Get bytecode
        const bytecode = await publicClient.getBytecode({
            address: address
        });

        if (bytecode) {
            console.log('✅ Bytecode found!');
            console.log(`📏 Bytecode length: ${bytecode.length} characters`);
            console.log(`📏 Bytecode length: ${(bytecode.length - 2) / 2} bytes`);
            console.log('\n📄 Bytecode:');
            console.log(bytecode);
            
            // Additional analysis
            console.log('\n📊 Analysis:');
            console.log(`- Is contract: ${bytecode !== '0x' ? 'Yes' : 'No'}`);
            console.log(`- Has code: ${bytecode && bytecode !== '0x' ? 'Yes' : 'No'}`);
            
            if (bytecode && bytecode !== '0x') {
                console.log(`- First 10 bytes: ${bytecode.slice(0, 22)}`);
                console.log(`- Last 10 bytes: ${bytecode.slice(-22)}`);
            }
        } else {
            console.log('❌ No bytecode found (EOA or non-existent address)');
        }

        return bytecode;

    } catch (error) {
        console.error('❌ Error getting bytecode:', error.message);
        throw error;
    }
}

// Main function - runs automatically
async function main() {
    try {
        console.log('🚀 Bytecode Retriever Script');
        console.log('================================\n');
        
        await getBytecode(TARGET_ADDRESS, RPC_URL, NETWORK);
        
        console.log('\n✅ Script completed successfully!');
    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Export functions for use in other modules
module.exports = { getBytecode };

// Run automatically when script is executed
if (require.main === module) {
    main();
}
