# Task Breakdown: Invest Flow Implementation

## Overview
Implement the Invest flow where investors send USDC to the escrow vault and an Investment PDA is created to track their investment.

---

## Backend Tasks (Solana Program - Anchor)

### Task 1: Define Account Structures
**Priority**: High  
**Dependencies**: None  
**Description**: Define all required account structures in the Anchor program.

**Subtasks**:
1. Create `Fundraiser` PDA struct with fields (match on-chain `state.rs`):
   - `admin` (Pubkey)
   - `usdc_mint` (Pubkey) — the USDC mint used for the escrow
   - `reit_mint` (Pubkey) — REIT token mint (set when tokens are created)
   - `escrow_vault` (Pubkey)
   - `total_raised` (u64)
   - `released_amount` (u64)
   - `investment_counter` (u64)
   - `bump` (u8)
   - `reit_accepted_currency` ([u8;3]) — 3-byte currency code (e.g., `b"CAD"`)

2. Create `Investment` PDA struct with fields:
   - `investor` (Pubkey)
   - `fundraiser` (Pubkey)
   - `amount` (u64)
   - `reit_amount` (u64) - initialized to 0
   - `released` (bool) - initialized to false
   - `refunded` (bool) - initialized to false
   - `investment_date` (i64)
   - `bump` (u8)

3. Create `TokenMetadata` account struct with fields (aligned with Metaplex Token Metadata program for standard fields):
   - `mint` (Pubkey)
   - `update_authority` (Pubkey)
   - `name` (String)
   - `symbol` (String)
   - `uri` (String)
   - Note: Custom fields (`currency` (String), `share_price` (u64), `decimals` (u8)) should be stored in Metaplex Token Metadata JSON (via the `uri` field) to maintain Metaplex compatibility. Initialize the TokenMetadata account via Metaplex's `CreateMetadataAccountV3` instruction.

**Files to modify**:
- `anchor/programs/canadianreitinvest/src/lib.rs` or create `state.rs`

---

### Task 2: Define Custom Errors
**Priority**: High  
**Dependencies**: None  
**Description**: Create custom error codes for the invest flow.

**Subtasks**:
1. Create error enum with variants:
   - `InsufficientFunds`
   - `InvalidAmount` (zero or negative)
   - `InvalidAuthority`
   - `EscrowNotInitialized`
   - `InvestmentCounterOverflow`
   - `ArithmeticOverflow`

**Files to modify**:
- `anchor/programs/canadianreitinvest/src/lib.rs` or create `errors.rs`

---

### Task 3: Implement Initialize Fundraiser Instruction
**Priority**: High  
**Dependencies**: Task 1, Task 2  
**Description**: Create instruction to initialize the Fundraiser PDA and Escrow Vault.

**Subtasks**:
1. Define `InitializeFundraiser` context struct with accounts:
   - `admin` (Signer, mut) - pays for accounts
      - `fundraiser` (PDA, init, seeds: [b"fundraiser", reit_id_hash.as_slice()], payer: admin)
         - Note: the program expects a 16-byte `reit_id_hash` (UUID bytes). The frontend generates this with a UUID and passes the parsed bytes (e.g. `uuidParse(uuid)`) as `reit_id_hash`.
   - `token_metadata` (Account, mut)
   - `escrow_vault` (Account, init, token::mint = usdc_mint, token::authority = fundraiser)
   - `usdc_mint` (Account)
   - `system_program` (Program)
   - `token_program` (Program)
   - `rent` (Sysvar)

2. Implement `initialize_fundraiser` handler with parameter `reit_id: String`:
   - Initialize fundraiser fields
   - Set admin authority
   - Set reit_id
   - Set total_raised and total_released to 0
   - Set investment_counter to 0
   - Link to token_metadata and escrow_vault

**Files to modify**:
- `anchor/programs/canadianreitinvest/src/lib.rs` or create `instructions/initialize.rs`

---

### Task 4: Implement Invest Instruction
**Priority**: High  
**Dependencies**: Task 1, Task 2, Task 3  
**Description**: Create the core invest instruction that transfers USDC and creates Investor State PDA.

**Subtasks**:
1. Define `Invest` context struct with accounts (seeds and constraints must match on-chain derivation):
   - `investor` (Signer, mut) — the investor
   - `fundraiser` (PDA, mut, seeds: [b"fundraiser", reit_id_hash.as_slice()]) — derive the fundraiser PDA using the same 16-byte `reit_id_hash` used at initialization
   - `investment` (PDA, init, seeds: [b"investment", investor.key().as_ref(), fundraiser.key().as_ref(), &fundraiser.investment_counter.to_le_bytes()], payer: investor)
     - Note: `investment_counter` is read from the fundraiser account and converted to little-endian bytes for the seed. Ensure you read the counter before incrementing it in the handler.
   - `investor_usdc_ata` (Account<'info, TokenAccount>, mut) — constraint: owned by `investor` and mint matches `fundraiser.usdc_mint`
   - `escrow_vault` (Account<'info, TokenAccount>, mut) — constraint: account equals `fundraiser.escrow_vault` and its authority is the fundraiser PDA
   - `token_program` (Program)
   - `system_program` (Program)
   - `rent` (Sysvar)

2. Implement `invest` handler with parameter `amount: u64`:
   - Validate amount > 0
   - Check investor has sufficient USDC balance
   - Transfer USDC from investor_usdc_ata to escrow_vault
   - Initialize investment with:
     - investor: investor.key()
     - fundraiser: fundraiser.key()
     - amount: amount
     - reit_amount: 0
     - released: false
     - investment_date: Clock::get()?.unix_timestamp
     - bump: ctx.bumps.investment
   - Increment fundraiser.investment_counter (with overflow check)
   - Increment fundraiser.total_raised by amount

3. Add account constraints:
   - Verify escrow_vault authority is fundraiser PDA
   - Verify investor_usdc_ata is owned by investor
   - Verify escrow_vault mint matches USDC mint

**Files to modify**:
- `anchor/programs/canadianreitinvest/src/lib.rs` or create `instructions/invest.rs`


---

### Task 5: Implement Offchain Tracking Backend
**Priority**: Medium  
**Dependencies**: Task 4 (for PDA structures), init.md (setup completed)  
**Description**: Implement data syncing, API endpoints, and testing for the offchain tracking backend (Node.js/TypeScript with Supabase DB), assuming initial setup from init.md is complete. This enables efficient querying of Investment PDAs and investment data.

**Subtasks**:
1. Implement data syncing:
   - Use Helius webhooks (devnet) to listen for invest events and insert PDA data into DB
   - For localnet, poll Solana connection periodically to sync PDAs
   - Add functions to query all Investment PDAs for a user/fundraiser

2. Integrate with frontend:
   - Expose API endpoints (e.g., GET /investments/:userPubkey) for React hooks
   - Handle authentication if needed (e.g., via wallet signatures)

3. Test syncing and queries:
   - Verify PDA data syncs correctly after investments
   - Test querying investment history and fundraiser totals
   - Ensure data consistency between onchain and offchain

**Files to create**:
- `backend/package.json`
- `backend/src/server.ts`
- `backend/src/db/migrations/`
- `backend/src/routes/investments.ts`
- `backend/src/services/helius.ts`
- `backend/README.md`


### Task 6: Implement Offchain Tracking Backend
**Priority**: High  
**Dependencies**: Task 4  
**Description**: Write comprehensive tests for the invest functionality.

**Subtasks**:
1. Test initialize_fundraiser:
   - Successfully creates Fundraiser PDA
   - Successfully creates Escrow Vault
   - Properly initializes all fields

2. Test invest instruction:
   - Successfully transfers USDC to escrow
   - Creates Investment PDA with correct data
   - Increments investment_counter
   - Updates total_raised
   - Multiple investments from same user create separate PDAs

3. Test error cases:
   - Reject zero amount
   - Reject insufficient balance
   - Reject invalid authority
   - Handle counter overflow gracefully

4. Test edge cases:
   - Multiple sequential investments
   - Maximum investment amount
   - Concurrent investments from different users

**Files to create/modify**:
- `anchor/tests/canadianreitinvest.test.ts` or create `tests/invest.test.ts`

---

## Frontend Tasks (React/TypeScript)

### Task 7: Create Invest Hook
**Priority**: High  
**Dependencies**: Task 4 (backend complete)  
**Description**: Create React hook to interact with invest instruction.

**Subtasks**:
1. Create `useInvest` hook in `src/features/canadianreitinvest/`:
   - Accept amount as parameter
   - Fetch fundraiser PDA
   - Derive investment PDA using investment_counter
   - Get investor USDC ATA
   - Build and send invest transaction
   - Return mutation with loading/error states

2. Add helper functions:
   - `getFundraiserPDA(adminPubkey: PublicKey)`
   - `getInvestmentPDA(investor: PublicKey, fundraiser: PublicKey, counter: number)`
   - `getInvestorUsdcAta(investor: PublicKey, usdcMint: PublicKey)`

**Files to create**:
- `src/features/canadianreitinvest/hooks/use-invest.ts`
- `src/features/canadianreitinvest/utils/pda.ts`

---

### Task 8: Create Invest UI Component
**Priority**: High  
**Dependencies**: Task 6  
**Description**: Build user interface for making investments.

**Subtasks**:
1. Create `InvestForm` component:
   - Input field for USDC amount
   - Display current USDC balance
   - Calculate estimated REIT tokens (if share price available)
   - Submit button with loading state
   - Error/success toast notifications

2. Create `InvestmentHistory` component:
   - Fetch all Investment PDAs for connected investor
   - Display list of investments with:
     - Investment date
     - USDC amount
     - REIT tokens received (if minted)
     - Status (pending/released/minted)

3. Add validation:
   - Check wallet connection
   - Validate amount is positive number
   - Check sufficient USDC balance
   - Display appropriate error messages

**Files to create**:
- `src/features/canadianreitinvest/components/invest-form.tsx`
- `src/features/canadianreitinvest/components/investment-history.tsx`

---

### Task 10: Create Fundraiser Dashboard
**Priority**: Medium  
**Dependencies**: Task 7  
**Description**: Display fundraiser statistics and information.

**Subtasks**:
1. Create `FundraiserStats` component:
   - Fetch Fundraiser PDA data
   - Display total raised USDC
   - Display total released USDC
   - Display number of investments (counter)
   - Display REIT token metadata (name, symbol, share price)

2. Add data fetching hook:
   - `useFundraiser` hook to fetch and subscribe to Fundraiser PDA
   - `useTokenMetadata` hook for REIT token details

**Files to create**:
- `src/features/canadianreitinvest/components/fundraiser-stats.tsx`
- `src/features/canadianreitinvest/hooks/use-fundraiser.ts`

---

### Task 11: Integration and Testing
**Priority**: High  
**Dependencies**: Task 8, Task 9  
**Description**: Integrate components and perform end-to-end testing.

**Subtasks**:
1. Add invest flow to main dashboard
2. Test complete user journey:
   - Connect wallet
   - View fundraiser stats
   - Make investment
   - View investment history
   - Verify on Solana explorer

3. Test error scenarios:
   - No wallet connected
   - Insufficient balance
   - Network errors

4. Add loading states and error handling throughout

**Files to modify**:
- `src/features/dashboard/dashboard-feature.tsx`
- `src/app-routes.tsx`

---

## Configuration and Deployment Tasks

### Task 12: Update Program Configuration
**Priority**: Medium  
**Dependencies**: Task 4  
**Description**: Configure program for deployment.

**Subtasks**:
1. Update `Anchor.toml` with correct program ID
2. Generate and update IDL
3. Set correct USDC mint address for each network (devnet/mainnet)
4. Document deployment steps in README

**Files to modify**:
- `anchor/Anchor.toml`
- `README.md`

---

### Task 13: Environment Setup Documentation
**Priority**: Low  
**Dependencies**: None  
**Description**: Document setup and configuration requirements.

**Subtasks**:
1. Document required accounts:
   - Admin wallet setup
   - USDC mint addresses (devnet/mainnet)
   - Token metadata account creation

2. Create setup script or instructions for:
   - Initializing fundraiser
   - Creating token metadata
   - Funding admin wallet

3. Add troubleshooting guide

**Files to create**:
- `docs/setup-invest-flow.md`
- `scripts/initialize-fundraiser.ts`

---

## Testing Checklist

### Backend Tests
- [ ] Fundraiser initialization succeeds
- [ ] Escrow vault created with correct authority
- [ ] Invest instruction transfers USDC correctly
- [ ] Investment PDA created with correct data
- [ ] Investment counter increments
- [ ] Total raised updates correctly
- [ ] Error handling for zero amount
- [ ] Error handling for insufficient balance
- [ ] Multiple investments create separate PDAs
- [ ] PDA derivation is deterministic

### Frontend Tests
- [ ] Wallet connection works
- [ ] Invest form validates input
- [ ] Transaction submits successfully
- [ ] Investment history displays correctly
- [ ] Fundraiser stats load and display
- [ ] Error messages show appropriately
- [ ] Loading states work correctly
- [ ] Toast notifications appear

### Integration Tests
- [ ] End-to-end invest flow on devnet
- [ ] Multiple users can invest simultaneously
- [ ] Data persists after page refresh
- [ ] Explorer links work correctly

---

## Success Criteria

1. ✅ User can successfully invest USDC through the UI
2. ✅ Investment PDA is created with accurate data
3. ✅ USDC is transferred to escrow vault
4. ✅ Investment counter increments properly
5. ✅ Investment history displays all user investments
6. ✅ Fundraiser stats show accurate totals
7. ✅ All tests pass
8. ✅ Error handling is robust and user-friendly
9. ✅ Code is documented and follows project conventions
10. ✅ Deployment to devnet successful

---

## Notes

- Use SPL Token program for all token operations
- Follow Anchor security best practices (account validation, overflow checks)
- Ensure all PDAs use proper seeds and bumps
- Test thoroughly on devnet before mainnet
- Consider rate limiting for investment counter to prevent spam
- Keep gas costs in mind for PDA initialization
- Implement proper logging for debugging
- USDC mint addresses:
  - Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
  - Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
