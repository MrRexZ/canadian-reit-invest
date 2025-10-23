# Deploy Flow
# build from root (uses package.json script)
pnpm run anchor-build
# then run upgrade via npm (args after -- are forwarded)
pnpm run anchor upgrade ./target/deploy/canadianreitinvest.so --program-id HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B --provider.cluster devnet


# Check solana balance
solana balance --url https://api.devnet.solana.com