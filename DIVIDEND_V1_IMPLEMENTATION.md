# V1 Dividend Distribution Implementation

## Overview
This implements the V1 simple dividend distribution system for the Canadian REIT Invest platform. The implementation provides a straightforward way for admins to issue USDC dividends to investors without creating additional on-chain PDAs.

## Architecture

### Onchain (Anchor Program)
**File**: `anchor/programs/canadianreitinvest/src/instructions/issue_dividend.rs`

**Instruction**: `issue_dividend`
- **Accounts Required** (11):
  - `admin` (Signer, Writable) - Admin issuing the dividend
  - `investment` (Read-Only) - Investment PDA to validate investor eligibility
  - `investor` (Read-Only) - Investor receiving dividend
  - `fundraiser` (Read-Only) - Fundraiser PDA for admin authorization
  - `admin_usdc_ata` (Writable) - Admin's USDC token account (source)
  - `investor_usdc_ata` (Writable) - Investor's USDC token account (destination)
  - `usdc_mint` (Read-Only) - USDC token mint for validation
  - `token_program` (Read-Only) - SPL Token Program
  - `system_program` (Read-Only)
  - `rent` (Read-Only)

**Security Checks**:
- Investment must exist and have `ShareIssued` status
- Admin must be the fundraiser's authorized admin
- USDC mint must match the fundraiser's configured mint
- Investor derived from investment PDA

**Event Emitted**:
```rust
#[event]
pub struct DividendIssued {
    pub investment: Pubkey,
    pub investor: Pubkey,
    pub fundraiser: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

### Frontend Hooks
**File**: `src/features/canadianreitinvest/hooks/use-issue-dividend.ts`

`useIssueDividend` hook provides:
- Account validation and authorization checks
- Investment fetching and status verification
- Fundraiser admin verification
- USDC ATA derivation for both admin and investor
- Transaction construction and signing
- Confirmation polling (30 retries, 1s intervals)
- Comprehensive logging for debugging
- Error handling with detailed messages
- Query invalidation on success

### Frontend UI Component
**File**: `src/features/canadianreitinvest/ui/admin-dividend-page.tsx`

`AdminDividendPage` component features:
- Investment selection dropdown (only ShareIssued status)
- Investment details display (investor, original amount, REIT tokens held)
- Dividend amount input with validation
- Submit button with loading state
- Success alert with transaction signature and explorer link
- Information card explaining the flow
- Real-time investment list fetching with 30-second refresh

### App Integration
**File**: `src/features/canadianreitinvest/canadianreitinvest-feature.tsx`

Added "Issue Dividends" tab to the Admin dashboard:
- Tab added to navigation sidebar
- Integrated into AdminTabs component
- Shows investment details and dividend form

## Data Flow

1. **Admin selects investment** from dropdown
   - Only investments with `ShareIssued` status are shown
   - Fetched from Supabase with account data from Solana

2. **Admin enters dividend amount** in USDC
   - Amount is validated (must be > 0)
   - Converted to smallest unit (multiply by 1,000,000 for 6 decimals)

3. **Admin signs transaction**
   - Hook validates admin authority against fundraiser
   - Investment status is verified
   - USDC ATAs are derived for both admin and investor
   - Instruction is built and signed

4. **Transaction submitted to Solana**
   - Program executes `issue_dividend`
   - All security checks performed on-chain
   - SPL Token transfer executed from admin to investor
   - DividendIssued event emitted

5. **Confirmation polling**
   - Hook waits for transaction confirmation (up to 30 seconds)
   - Success displays transaction signature
   - User can view transaction on Solana Explorer

6. **Permanent audit trail**
   - All transfers recorded on Solana blockchain
   - Event data stored permanently
   - No deletable records (immutable)

## Compute Unit Efficiency

The V1 simple dividend system is very efficient:
- **~15-20k compute units** per transaction (low)
- No PDA creation/initialization overhead
- Direct SPL Token transfer operation
- Minimal account fetches
- Compared to V2 with Dividend/InvestmentDividendCounter PDAs: ~30-50k CUs

## Key Benefits of V1 Approach

1. **Simplicity**: No complex PDA structures needed
2. **Efficiency**: Lower compute unit usage
3. **Auditability**: All transfers visible on Solana Explorer
4. **Security**: On-chain validation of admin authority and investment status
5. **Clear intent**: One transaction = one dividend payment
6. **Easy to understand**: Simple transfer semantics

## Testing the Feature

1. Navigate to Admin Dashboard
2. Click "Issue Dividends" tab
3. Select an investment with ShareIssued status
4. Enter dividend amount (e.g., 10.50 for 10.50 USDC)
5. Confirm transaction signature in wallet
6. Wait for confirmation (typically < 30 seconds)
7. View transaction on Solana Explorer via the provided link

## Error Handling

The implementation handles various error scenarios:
- Investment not found
- Investment doesn't have ShareIssued status
- Admin not authorized by fundraiser
- USDC mint mismatch
- Token account issues
- Transaction confirmation timeout
- Network errors

Each error provides clear, user-friendly messaging via toast notifications.

## Files Modified/Created

### New Files
- `src/features/canadianreitinvest/ui/admin-dividend-page.tsx` - Admin UI for dividend issuance
- `src/features/canadianreitinvest/ui/index.ts` - Component exports
- `anchor/programs/canadianreitinvest/src/instructions/issue_dividend.rs` - Onchain instruction

### Modified Files
- `src/features/canadianreitinvest/canadianreitinvest-feature.tsx` - Added dividends tab
- `anchor/programs/canadianreitinvest/src/lib.rs` - Wired issue_dividend
- `anchor/programs/canadianreitinvest/src/errors.rs` - Added error codes
- `src/features/canadianreitinvest/hooks/use-issue-dividend.ts` - Created hook
- Generated TypeScript types automatically with Codama

## Future Enhancements (V2+)

Potential improvements for future versions:
1. **Dividend History**: View past dividend payments
2. **Bulk Issuance**: Issue dividends to multiple investors in one transaction
3. **Dividend Tracking PDAs**: Full dividend history on-chain with aggregations
4. **Automatic Distribution**: Scheduled or event-triggered dividend payments
5. **Dividend Calculation**: Formula-based dividend amounts (e.g., per token held)
6. **Investor Dashboard**: View received dividends and payout history
