# EIP-7702 Smart Account Converter

This Node.js script converts an Externally Owned Account (EOA) to an EIP-7702 smart account on the Sepolia testnet by executing a self-transaction that delegates to a specified contract address.

## What is EIP-7702?

EIP-7702 allows EOAs to delegate their execution to smart contracts, effectively turning them into smart accounts. This enables features like:
- Account abstraction
- Custom validation logic
- Batch transactions
- Gasless transactions (when supported by the delegation contract)

## Prerequisites

- Node.js (v16 or higher)
- A Sepolia testnet RPC URL (Infura, Alchemy, etc.)
- A private key for an EOA with some Sepolia ETH for gas fees
- The delegation contract deployed at `0x63c0c19a282a1b52b07dd5a65b58948a07dae32b`

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp env.example .env
   ```

4. Edit the `.env` file with your configuration:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   PRIVATE_KEY=your_private_key_here
   ```

## Usage

All commands run from the single entry point `src/index.js`. Run `node src/index.js` with no arguments to list commands.

| Command | npm script | Description |
|---------|------------|-------------|
| convert | `npm start` | EIP-7702 per-transaction delegation (self) |
| get-bytecode | `npm run get-bytecode` | Get bytecode of an address |
| revert | `npm run revert` | Revert EIP-7702 delegation |
| direct | `npm run direct` | Direct batch ETH transfer (self-funded) |
| sponsor | `npm run sponsor` | Sponsored batch ETH transfer |
| sponsor-delegation | `npm run sponsor:delegation` | Sponsor sets up delegation |

### 1. EIP-7702 Smart Account Conversion

1. **Get Sepolia ETH**: You need some Sepolia ETH for gas fees. Get it from:
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Faucet](https://sepoliafaucet.com/)
   - [Infura Faucet](https://www.infura.io/faucet/sepolia)

2. **Run the conversion script**:
   ```bash
   npm start
   ```

### 2. Get Bytecode of an Address

```bash
npm run get-bytecode
```

Edit `CONFIG.getBytecode` at the top of `src/index.js` (address, rpcUrl, chain).

### 3. Sponsored ETH Transfer from EIP-7702 Smart Account

```bash
npm run sponsor
```

Edit `CONFIG.sponsorRecipients` in `src/index.js` (address and amount per recipient).

### 4. Direct Batch ETH Transfer (self-funded)

```bash
npm run direct
```

Edit `CONFIG.directRecipients` in `src/index.js` (to, amountEth per recipient).

**Required Environment Variables for Sponsored Transfer (sections 3–4):**
```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SPONSOR_PRIVATE_KEY=your_sponsor_wallet_private_key_here
SMART_ACCOUNT_PRIVATE_KEY=your_smart_account_private_key_here
```

## How it Works

1. **Connection**: Connects to Base Sepolia network using your RPC URL
2. **Validation**: Checks wallet balance and network connection
3. **Transaction Creation**: Creates a self-transaction with EIP-7702 delegation
4. **Signing**: Signs the transaction with your private key
5. **Broadcasting**: Sends the transaction to the network
6. **Confirmation**: Waits for transaction confirmation

## Transaction Details

The script creates a transaction with these properties:
- **To**: Your own address (self-transaction)
- **Value**: 0 ETH
- **Delegation Address**: `0x63c0c19a282a1b52b07dd5a65b58948a07dae32b`
- **Type**: EIP-1559 (Type 2)
- **Chain ID**: 84532 (Base Sepolia)

## Security Notes

⚠️ **Important Security Considerations**:

- Never commit your `.env` file to version control
- Never share your private key
- This script is for educational/testing purposes
- Always verify the delegation contract address before running
- Test with small amounts first

## Troubleshooting

### Common Issues

1. **"Insufficient balance"**: You need more Base Sepolia ETH for gas fees
2. **"Invalid RPC URL"**: Check your Base Sepolia RPC endpoint
3. **"Invalid private key"**: Ensure your private key is correctly formatted (64 hex characters)
4. **"Transaction failed"**: Check gas settings or network congestion

### Gas Settings

You can customize gas settings in your `.env` file:
```env
GAS_LIMIT=21000
MAX_FEE_PER_GAS=20000000000
MAX_PRIORITY_FEE_PER_GAS=2000000000
```

## Verification

After running the script, you can verify the delegation by:
1. Checking the transaction on [Base Sepolia Explorer](https://sepolia.basescan.org/)
2. Using the provided explorer URL in the script output
3. Verifying the account's delegation status

## Example Output

```
🚀 Starting EIP-7702 Smart Account Conversion...

🔗 Connected to Base Sepolia network
📱 Wallet address: 0x1234...5678
💰 Current balance: 0.1 ETH
🔢 Current nonce: 42
📝 Creating EIP-7702 delegation transaction...
🎯 Delegation address: 0x63c0c19a282a1b52b07dd5a65b58948a07dae32b
✍️  Transaction signed
📤 Sending transaction to network...
📋 Transaction hash: 0xabcd...efgh
⏳ Waiting for confirmation...
✅ Transaction confirmed!
🔗 Block number: 12345678
⛽ Gas used: 21000
🌐 Explorer URL: https://sepolia.basescan.org/tx/0xabcd...efgh

🎉 Success! Your EOA has been converted to an EIP-7702 smart account!
📱 Smart account address: 0x1234...5678
🔗 Delegation contract: 0x63c0c19a282a1b52b07dd5a65b58948a07dae32b
```

## License

MIT License - feel free to use and modify as needed.

### Revert EIP-7702 Delegation

Use this to clear delegation by authorizing the zero address.

```bash
npm run revert
```

Requires in `.env`:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SMART_ACCOUNT_PRIVATE_KEY=your_private_key_here
```