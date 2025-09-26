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
node get-bytecode.js
```

Edit the configuration at the top of `get-bytecode.js`:
```javascript
const TARGET_ADDRESS = '0x1234567890123456789012345678901234567890'; // 👈 CHANGE THIS
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'; // 👈 CHANGE THIS
const NETWORK = sepolia; // 👈 CHANGE THIS
```

### 3. Sponsored ETH Transfer from EIP-7702 Smart Account

```bash
node sponsor-transfer.js
```

Edit the configuration at the top of `sponsor-transfer.js`:
```javascript
const SMART_ACCOUNT_ADDRESS = '0x0d4c141A24e325981FDE16cd436aeBe8c55d0685'; // 👈 EIP-7702 Smart Account
const RECIPIENT_ADDRESS = '0x1234567890123456789012345678901234567890'; // 👈 Recipient
const TRANSFER_AMOUNT = '0.001'; // 👈 Amount in ETH
```

### 4. Batch ETH Transfer from EIP-7702 Smart Account

```bash
node batch-eth-transfer.js
```

Edit the configuration at the top of `batch-eth-transfer.js`:
```javascript
const SMART_ACCOUNT_ADDRESS = '0xE0b9dEa53a90B7a2986356157e2812e5335A4a1D'; // 👈 EIP-7702 Smart Account
const RECIPIENTS = [
    { address: '0xFA992c932fab1B6B6E77318f25313c7Ef6E9b3Eb', amount: '0.001' }, // 👈 Recipient 1
    { address: '0x1234567890123456789012345678901234567890', amount: '0.002' }, // 👈 Recipient 2
    { address: '0x9876543210987654321098765432109876543210', amount: '0.003' }, // 👈 Recipient 3
];
```

**Required Environment Variables for Sponsored Transfer:**
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
node revert.js
```

Requires in `.env`:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SMART_ACCOUNT_PRIVATE_KEY=your_private_key_here
```