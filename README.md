# Canadian REIT Invest

A decentralized Real Estate Investment Trust (REIT) platform on Solana blockchain. Users can invest in USDC, which is converted to CAD off-chain and wired to Canadian REITs. Investors receive tokenized REIT shares and earn dividends proportional to their holdings.

## Features

- **Onchain Investment Tracking**: Program-Derived Addresses (PDAs) track investments securely
- **Tokenized REIT Shares**: SPL tokens representing shares with metadata
- **Dividend Payouts**: Proportional USDC payouts based on holdings
- **Admin Controls**: Release funds, mint shares, and handle refunds
- **One-Step Invest Flow**: Single transaction creates investor PDA, transfers USDC, and records investment

## Architecture

### Backend (Solana Programs)
Written in Rust using Anchor framework (`anchor/` directory):
- **Investor PDA**: Tracks user profile and investment counter
- **Fundraiser PDA**: Manages escrow vault and REIT minting
- **Investment PDA**: Records individual investments with status lifecycle
- **Escrow Vault**: Holds USDC until admin releases for CAD conversion

### Frontend
React application with Vite, TypeScript, Tailwind CSS, and Shadcn UI (`src/` directory):
- Wallet integration via Gill SDK
- Transaction signing and confirmation
- Dashboard for investment tracking

### Investment Status Lifecycle
Investments progress through these statuses:
- **Pending**: Initial state after investment
- **Released**: Admin released funds for CAD conversion
- **Wired**: Funds wired to Canadian REIT
- **ShareIssued**: REIT tokens minted to investor
- **Refunded**: Investment refunded (if applicable)

## Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Anchor CLI
- Solana CLI

### Installation

```shell
# Clone the repository
git clone <repository-url>
cd canadian-reit-invest

# Install dependencies
npm install
```

### Local Development

#### Setup Program
```shell
# Sync program ID
npm run setup

# Build program
npm run anchor-build
```

#### Start Local Validator
```shell
npm run anchor-localnet
```

#### Run Tests
```shell
npm run anchor-test
```

#### Start Frontend
```shell
npm run dev
```

### Deployment

#### Deploy to Devnet
```shell
npm run anchor deploy --provider.cluster devnet
```

## Usage

1. **Connect Wallet**: Use the wallet UI to connect your Solana wallet
2. **Invest**: Select a fundraiser and invest USDC - the system automatically creates your investor profile and transfers funds in one transaction
3. **Track Investments**: View your investment status and holdings in the dashboard
4. **Receive Dividends**: Dividends are distributed proportionally based on your share holdings

## Development

### Program Structure
- `anchor/programs/canadianreitinvest/src/lib.rs`: Main program entry
- `anchor/programs/canadianreitinvest/src/state.rs`: Data structures and enums
- `anchor/programs/canadianreitinvest/src/instructions/`: Instruction handlers

### Frontend Structure
- `src/features/`: Feature-based components
- `src/components/`: Reusable UI components
- `src/lib/`: Utilities and hooks

### Key Concepts
- **PDAs**: Used for deterministic account addresses
- **Init-if-needed**: Investor PDAs created automatically on first investment
- **Single Transaction Flow**: ATA creation + transfer + investment recording in one signature
- **Status Enum**: Investment lifecycle tracked with u8 enum values