# 🚀 ERC20 Token + Dashboard

A complete, production-ready ERC20 token implementation with a modern React dashboard for managing tokens. Built with best practices, full type safety, and comprehensive testing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)
![React](https://img.shields.io/badge/React-19.2.4-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/Tests-61%20passing-green)

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Available Commands](#-available-commands)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Contract Details](#-contract-details)
- [Network Information](#-network-information)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## ✨ Features

### 🔐 Smart Contract (MyToken.sol)

- ✅ **ERC20 Standard Implementation** - Fully compliant with ERC20 specification
- ✅ **Ownable** - Owner-controlled access management
- ✅ **Mint Function** - Owner can mint new tokens
- ✅ **Burn Function** - Any holder can burn their tokens
- ✅ **Initial Supply** - 1,000,000 MTK tokens minted at deployment
- ✅ **Comprehensive Tests** - 26 unit tests with full coverage

### 🎨 Frontend Dashboard

- ✅ **Wallet Connection** - Seamless MetaMask integration
- ✅ **Balance Display** - Real-time ETH and token balance tracking
- ✅ **Token Transfer** - Send tokens to any address
- ✅ **Network Detection** - Automatic network detection and switching
- ✅ **Auto-refresh** - Balances update after transactions
- ✅ **Modern UI** - Clean, responsive design with Tailwind CSS
- ✅ **Type Safe** - 100% TypeScript with no `any` types
- ✅ **Component Tests** - 35 unit tests for all components
- ✅ **Integration Tests** - 10 end-to-end flow tests

---

## 🧱 Tech Stack

| Category                  | Technology                     |
| ------------------------- | ------------------------------ |
| **Smart Contract**        | Solidity 0.8.20                |
| **Development Framework** | Hardhat                        |
| **Frontend Framework**    | React 19.2.4                   |
| **Build Tool**            | Vite 7.3.1                     |
| **Language**              | TypeScript 5.9.3               |
| **Ethereum Library**      | Ethers.js v6                   |
| **Styling**               | Tailwind CSS 4.2.2             |
| **Testing (Contract)**    | Hardhat + Chai                 |
| **Testing (Frontend)**    | Vitest + React Testing Library |
| **Type Generation**       | TypeChain                      |
| **Contract Standard**     | OpenZeppelin v5                |

---

## 📁 Project Structure

```
erc20-dashboard
├── src
│   ├── contracts/
│   │   └── MyToken.sol              # ERC20 Token Contract
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx    # Wallet connection component
│   │   │   ├── BalanceDisplay.tsx   # Balance display component
│   │   │   ├── TransferForm.tsx     # Token transfer form
│   │   │   └── NetworkDetector.tsx  # Network detection component
│   │   └── utils/
│   │       ├── contractInfo.ts      # Contract ABI and address
│   │       ├── wallet.ts            # Wallet utility functions
│   │       └── types.ts             # TypeScript type definitions
│   ├── scripts/
│   │   └── deploy.ts                # Deployment script
│   ├── test/
│   │   ├── token.test.ts            # Smart contract tests (26 tests)
│   │   └── frontend/
│   │       ├── ConnectWallet.test.tsx
│   │       ├── BalanceDisplay.test.tsx
│   │       ├── NetworkDetector.test.tsx
│   │       ├── TransferForm.test.tsx
│   │       ├── wallet.test.ts
│   │       └── App.integration.test.tsx
│   ├── typechain-types/             # Auto-generated TypeChain types
│   ├── artifacts/                   # Compiled contract artifacts
│   ├── App.tsx                      # Main application component
│   └── main.tsx                     # Application entry point
├── hardhat.config.ts                # Hardhat configuration
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MetaMask** browser extension
- **Git**

### Installation

1. **Clone the repository and install dependencies**

   ```bash
   git clone <repository-url>
   cd erc20-dashboard
   npm install
   ```

2. **Compile the smart contract**

   ```bash
   npm run compile
   ```

3. **Start a local Hardhat node** (in a separate terminal)

   ```bash
   npm run node
   ```

4. **Deploy to local Hardhat network** (in another terminal)

   ```bash
   npm run deploy:local
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`
   - Connect MetaMask to **Hardhat Local** network (Chain ID: 31337)
   - Import a test account from Hardhat console output

---

## 📜 Available Commands

| Command                       | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `npm run dev`                 | Start Vite development server at `http://localhost:5173` |
| `npm run build`               | Build for production                                     |
| `npm run preview`             | Preview production build                                 |
| `npm run compile`             | Compile Solidity contracts and generate TypeChain types  |
| `npm run test`                | Run all tests (contract + frontend)                      |
| `npm run test:contract`       | Run smart contract tests only                            |
| `npm run test:frontend`       | Run frontend tests only                                  |
| `npm run test:frontend:watch` | Run frontend tests in watch mode                         |
| `npm run test:ui`             | Run tests with Vitest UI                                 |
| `npm run node`                | Start local Hardhat node                                 |
| `npm run deploy:local`        | Deploy contract to local Hardhat network                 |
| `npm run deploy:sepolia`      | Deploy contract to Sepolia testnet                       |
| `npm run lint`                | Run ESLint                                               |

---

## 🧪 Testing

This project has a comprehensive test suite with **61 tests** covering both smart contracts and frontend components.

### Run All Tests

```bash
npm run test
```

### Run Contract Tests Only

```bash
npm run test:contract
```

### Run Frontend Tests Only

```bash
npm run test:frontend
```

### Run Frontend Tests in Watch Mode

```bash
npm run test:frontend:watch
```

### Test Coverage

| Test Suite            | Tests  | Status              |
| --------------------- | ------ | ------------------- |
| **Smart Contract**    | 26     | ✅ Passing          |
| **Component Tests**   | 35     | ✅ Passing          |
| **Integration Tests** | 10     | ✅ Passing          |
| **Total**             | **61** | ✅ **100% Passing** |

### Test Files

- `src/test/token.test.ts` - Smart contract unit tests
- `src/test/frontend/ConnectWallet.test.tsx` - ConnectWallet component tests
- `src/test/frontend/BalanceDisplay.test.tsx` - BalanceDisplay component tests
- `src/test/frontend/NetworkDetector.test.tsx` - NetworkDetector component tests
- `src/test/frontend/TransferForm.test.tsx` - TransferForm component tests
- `src/test/frontend/wallet.test.ts` - Wallet utility function tests
- `src/test/frontend/App.integration.test.tsx` - End-to-end integration tests

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
# Sepolia RPC URL (get from Infura/Alchemy)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Your wallet private key (DO NOT COMMIT THIS TO GIT)
PRIVATE_KEY=your_private_key_here

# Your contract address
VITE_CONTRACT_ADDRESS=fill this with your own contract address

# Your chainId
VITE_CONTRACT_CHAIN_ID=11155111

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

> ⚠️ **Security Warning:** Never commit your `.env` file to version control. The `.env` file is already included in `.gitignore`.

### Deploy to Sepolia Testnet

1. **Fund your wallet** with Sepolia ETH from a faucet:

   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

2. **Update `.env`** with your private key and RPC URL

3. **Deploy the contract:**

   ```bash
   npm run deploy:sepolia
   ```

4. **Update `contractInfo.ts`** with the deployed contract address

---

## 📝 Contract Details

### Token Information

| Property           | Value         |
| ------------------ | ------------- |
| **Token Name**     | MyToken       |
| **Token Symbol**   | MTK           |
| **Decimals**       | 18            |
| **Initial Supply** | 1,000,000 MTK |
| **Standard**       | ERC20         |

### Contract Functions

| Function                     | Description                       | Access     |
| ---------------------------- | --------------------------------- | ---------- |
| `balanceOf(address)`         | Get token balance for an address  | Public     |
| `transfer(address, uint256)` | Transfer tokens to an address     | Public     |
| `mint(uint256)`              | Mint new tokens                   | Owner Only |
| `burn(uint256)`              | Burn tokens from sender's balance | Public     |
| `totalSupply()`              | Get total token supply            | Public     |
| `decimals()`                 | Get token decimals                | Public     |
| `symbol()`                   | Get token symbol                  | Public     |
| `name()`                     | Get token name                    | Public     |
| `owner()`                    | Get contract owner                | Public     |
| `transferOwnership(address)` | Transfer ownership                | Owner Only |
| `renounceOwnership()`        | Renounce ownership                | Owner Only |

---

## 🌐 Network Information

| Network              | Chain ID | RPC URL                     |
| -------------------- | -------- | --------------------------- |
| **Hardhat Local**    | 31337    | `http://127.0.0.1:8545`     |
| **Sepolia Testnet**  | 11155111 | `https://rpc.sepolia.org`   |
| **Ethereum Mainnet** | 1        | `https://mainnet.infura.io` |

---

## 🛠️ Troubleshooting

### MetaMask Not Connecting

- ✅ Make sure MetaMask is installed
- ✅ Refresh the page after connecting
- ✅ Check browser console for errors
- ✅ Ensure you're on the correct network

### Contract Not Found

- ✅ Deploy the contract first: `npm run deploy:local`
- ✅ Update `contractInfo.ts` with the deployed address
- ✅ Verify you're on the correct network

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist cache
```

### Test Failures

```bash
# Clear cache and run tests
npx hardhat clean
npm run test
```

### TypeChain Types Not Generated

```bash
# Recompile contracts
npm run compile
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality

This project maintains high code quality standards:

- ✅ **TypeScript** - Full type safety with no `any` types
- ✅ **ESLint** - Code linting and style enforcement
- ✅ **Tests** - Comprehensive test coverage (61 tests)
- ✅ **TypeChain** - Auto-generated type definitions for contracts

---

## 📞 Support

For issues and questions:

- 🐛 **Bug Reports:** Open an issue on GitHub
- 💬 **Questions:** Open a discussion on GitHub
- 📧 **Contact:** See repository maintainers

---

<div align="center">

**Built with ❤️ using React, Solidity, and TypeScript**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
