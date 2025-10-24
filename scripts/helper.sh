# Deploy Flow
# build from root (uses package.json script)
pnpm run anchor-build
# then run upgrade via npm (args after -- are forwarded)
pnpm run anchor upgrade ./target/deploy/canadianreitinvest.so --program-id FuEhMFWU9Ui35a9mpavfy7AYGqEX8diUSk1CZonEUivH --provider.cluster devnet


# Check solana balance
solana balance --url https://api.devnet.solana.com

# set to default keypair
solana config set --keypair ~/.config/solana/id.json