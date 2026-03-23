# ERC20 Token + Dashboard

A complete ERC20 token implementation with a React dashboard for managing tokens.

## 🧱 Tech Stack

- **Solidity** (0.8.20) - Smart Contract Language
- **Hardhat** - Ethereum Development Environment
- **React** (Vite) - Frontend Framework
- **Ethers.js** (v6) - Ethereum Library
- **Tailwind CSS** - Styling

## 📁 Project Structure

```
erc20-dashboard
├── src
│   ├── contracts
│   │   └── MyToken.sol          # ERC20 Token Contract
│   ├── scripts
│   │   └── deploy.ts            # Deployment Script
│   ├── test
│   │   └── token.test.ts        # Contract Tests
│   └── frontend
│       ├── pages
│       ├── components           # React Components
│       │   ├── ConnectWallet.tsx
│       │   ├── BalanceDisplay.tsx
│       │   ├── TransferForm.tsx
│       │   └── NetworkDetector.tsx
│       └── utils                # Utilities
│           ├── contractInfo.ts
│           ├── wallet.ts
│           └── types.ts
├── hardhat.config.ts            # Hardhat Configuration
├── index.html
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MetaMask browser extension
- Git

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Compile the smart contract**
   ```bash
   npm run compile
   ```

3. **Deploy to local Hardhat network**
   ```bash
   npm run node
   # In a new terminal:
   npm run deploy:local
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Connect MetaMask to Hardhat Local network (Chain ID: 31337)
   - Import a test account from Hardhat

## 📜 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run contract tests |
| `npm run node` | Start local Hardhat node |
| `npm run deploy:local` | Deploy to local Hardhat |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Sepolia RPC URL (get from Infura/Alchemy)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Your wallet private key (DO NOT COMMIT THIS TO GIT)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### Deploy to Sepolia Testnet

1. Fund your wallet with Sepolia ETH from a faucet
2. Update `.env` with your private key and RPC URL
3. Run:
   ```bash
   npm run deploy:sepolia
   ```

## 🎯 Features

### Smart Contract (MyToken.sol)

- ✅ ERC20 Standard Implementation
- ✅ Ownable (Owner can mint tokens)
- ✅ Mint function (Owner only)
- ✅ Burn function (Any holder)
- ✅ Initial supply of 1,000,000 tokens

### Frontend Dashboard

- ✅ Connect MetaMask Wallet
- ✅ Display ETH Balance
- ✅ Display Token Balance (MTK)
- ✅ Transfer Tokens
- ✅ Network Detection
- ✅ Auto-refresh on transactions
- ✅ Clean, Modern UI with Tailwind CSS

## 🧪 Testing

Run the test suite:

```bash
npm run test
```

For more comprehensive testing, install additional dependencies:

```bash
npm install --save-dev @nomicfoundation/hardhat-ethers chai @types/chai @types/mocha --legacy-peer-deps
```

## 📝 Contract Details

**Token Name:** MyToken  
**Token Symbol:** MTK  
**Decimals:** 18  
**Initial Supply:** 1,000,000 MTK

### Contract Functions

- `balanceOf(address)` - Get token balance
- `transfer(address, uint256)` - Transfer tokens
- `mint(uint256)` - Mint new tokens (Owner only)
- `burn(uint256)` - Burn tokens
- `totalSupply()` - Get total supply
- `decimals()` - Get token decimals
- `symbol()` - Get token symbol
- `name()` - Get token name

## 🌐 Network Information

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Hardhat Local | 31337 | http://127.0.0.1:8545 |
| Sepolia Testnet | 11155111 | https://rpc.sepolia.org |

## 🛠️ Troubleshooting

### MetaMask not connecting
- Make sure MetaMask is installed
- Refresh the page after connecting
- Check console for errors

### Contract not found
- Deploy the contract first
- Update `contractInfo.json` with the deployed address
- Make sure you're on the correct network

### Build errors
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Clear build cache: `rm -rf dist`

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
