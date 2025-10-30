# Canadian REIT Invest

A decentralized Real Estate Investment Trust (REIT) platform on Solana blockchain. Users invest USDC, which is converted to CAD off-chain and wired to Canadian REITs. Investors receive tokenized REIT shares and earn dividends proportional to their holdings.

## Documentation

- **[Architecture Specification](docs/architecture-spec.md)** - Technical details on accounts, PDAs, and program instructions
- **[User Flow](docs/user-flow.md)** - Step-by-step guide for investors and admins

## Features

- **Onchain Investment Tracking**: PDAs track investments securely
- **Tokenized REIT Shares**: SPL tokens with metadata
- **Dividend Payouts**: Proportional USDC distributions
- **Admin Controls**: Release, mint, refund operations
- **Investment Lifecycle**: Pending → Released → Wired → ShareIssued

## Tech Stack

- **Backend**: Rust + Anchor framework (Solana programs)
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Shadcn UI
- **Blockchain**: Solana (SPL tokens, PDAs, Metaplex metadata)

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

1. **Connect Wallet**: Connect your Solana wallet via the UI
2. **Invest**: Select a REIT and invest USDC (auto-creates investor profile)
3. **Track**: View investment status and holdings in dashboard
4. **Dividends**: Receive proportional USDC payouts

See [User Flow](docs/user-flow.md) for detailed walkthroughs.

## Project Structure

```
anchor/programs/canadianreitinvest/  # Solana program (Rust + Anchor)
  src/lib.rs                         # Program entry point
  src/state.rs                       # Account schemas
  src/instructions/                  # Instruction handlers
src/                                 # React frontend
  features/                          # Feature modules
  components/                        # UI components (Shadcn)
docs/                                # Documentation
  architecture-spec.md               # Technical architecture
  user-flow.md                       # User guides
```