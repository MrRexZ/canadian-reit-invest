# GitHub Copilot Workspace Instructions for Canadian REIT Invest

## Project Overview
This repository implements a decentralized Real Estate Investment Trust (REIT) platform on the Solana blockchain. Users can invest in USDC, which is converted to CAD off-chain and wired to Canadian REITs. Investors receive tokenized REIT shares and earn dividends proportional to their holdings. The platform uses Anchor for Solana programs, a React/Vite frontend for user interaction, and integrates with external services for currency conversion and dividend distribution.

Key features:
- Onchain investment tracking via PDAs (Program-Derived Addresses)
- Tokenized REIT shares with metadata
- Dividend payouts in USDC
- Admin controls for releases, minting, and refunds

## Architecture
- **Backend (Solana Programs)**: Written in Rust using Anchor framework. Located in `anchor/` directory. Includes programs for investment, token minting, and escrow management.
- **Frontend**: React application built with Vite, TypeScript, Tailwind CSS, and Shadcn UI components. Located in `src/` directory. Handles user wallets, transactions, and UI components. Design theme must fit within the Shadcn framework.
- **Tests**: Unit tests for Solana programs in `tests/`, integration tests in `anchor/tests/`.
- **Configuration**: Anchor.toml for Solana deployment, package.json for frontend dependencies, tsconfig files for TypeScript.
- **External Integrations**: Notion API for documentation (via MCP server), external CAD conversion services (off-chain).

## Key Concepts
- **PDAs (Program-Derived Addresses)**: Used for state management (e.g., Investor State PDA tracks investments, Fundraiser PDA manages escrow).
- **Escrow Vault**: Holds USDC until released by admin for CAD conversion.
- **REIT Tokens**: SPL tokens representing shares, minted after successful CAD wiring.
- **Flows**:
  1. Invest: User sends USDC → Investor State PDA created.
  2. Release: Admin releases USDC for off-chain CAD conversion.
  3. Mint: Admin mints REIT tokens to user.
  4. Dividends: Proportional USDC payouts based on holdings.
- **Off-chain Components**: CAD conversion and REIT wiring handled externally; confirmations trigger onchain actions.

## Coding Guidelines
- **Rust (Anchor)**: Follow Anchor best practices. Use PDAs for state, validate accounts strictly. Handle errors with custom error codes.
- **TypeScript/React**: Use functional components, hooks (e.g., useWallet from @solana/wallet-adapter). Ensure type safety with TypeScript. Use Shadcn UI components for consistent design and theming.
- **Security**: Validate all inputs, use proper authority checks. Avoid reentrancy in Solana programs.
- **Testing**: Write comprehensive tests for all onchain logic. Use Anchor's testing framework.
- **Dependencies**: Pin versions in package.json and Cargo.toml. Use audited crates.
- **Commits**: Use conventional commits (e.g., "feat: add investment PDA", "fix: handle refund logic").

## Common Patterns
- **PDA Derivation**: Use `find_program_address` with seeds like `b"investor_state"`, user pubkey, and investment ID.
- **Token Operations**: Use SPL token program for minting, transferring, and ATA (Associated Token Accounts) management.
- **Error Handling**: Define custom errors in Anchor programs (e.g., InsufficientFunds, InvalidAuthority).
- **Frontend Integration**: Use gill for transactions, @solana/wallet-adapter for wallet connections. Use Codama to generate TypeScript types from Solana programs when the Anchor IDL changes.


## File Structure Notes
- `anchor/programs/canadianreitinvest/src/lib.rs`: Main program logic.
- `src/features/`: Frontend features (account, cluster, dashboard).
- `src/components/`: Reusable UI components using Shadcn (wallet, modals, explorers).
- `tests/`: End-to-end tests for Solana programs.

## Additional Context
- **Deployment**: Use Anchor CLI for Solana deployment. Frontend deployed via Vercel/Netlify.
- **Environment**: Local development with `solana-test-validator`, test-ledger for testing.
- Don't ever install codama deps at anchor subfolder. When need to run Codama, use the codama installed at root folder. don't install "@codama/nodes-from-anchor` at anchor subfolder. Use the `npm run codama:js` command to generate.
- Ask Solana MCP server for things related to Solana (such as Anchor). See MCP Server Configuration section below for details.

When assisting with code, prioritize security, correctness, and alignment with the REIT investment flow. If unsure, ask for clarification on business logic.


## MCP Server Configuration
### For Solana MCP Use
<MCP_USE_GUIDELINE>
  <INSTRUCTION>
    If you are working on a Solana-related project. Make frequent use of the following MCP tools to accomplish your goals.
  </INSTRUCTION>
  <TOOLS>
    The following Solana tools are at your disposal:
    - "Solana Expert: Ask For Help": Use this tool to ask detailed questions about Solana (how-to, concepts, APIs, SDKs, errors). Provide as much context as possible when using it.
    - "Solana Documentation Search": Use this tool to search the Solana documentation corpus for relevant information based on a query.
    - "Ask Solana Anchor Framework Expert": Use this tool for any questions specific to the Anchor Framework, including its APIs, SDKs, and error handling.
  </TOOLS>
</MCP_USE_GUIDELINE>