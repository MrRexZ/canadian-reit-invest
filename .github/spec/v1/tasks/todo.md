

% Todo: Invest flow refactor (aligned with refactor-v1)

This file contains the implementation todo list revised to match `refactor-v1.md`.

Notes: per `refactor-v1.md` we will:
- replace `released` / `refunded` booleans on the `Investment` PDA with a single enum (status) e.g. Pending/Released/Refunded/Wired/ShareIssued;
- initialize the `Investor` PDA only when the user actually performs `invest` (use `init_if_needed`); remove the standalone Initialize/Close Investor UI buttons;
- ensure the Invest client checks for the user's USDC ATA and creates it if missing (create ATA + transfer + PDA init in a single transaction so the user signs once).

Tasks

- [ ] Extract & confirm tasks from spec
  - Read `.github/spec/v1/tasks/refactor-v1.md` and any referenced docs; produce a concrete implementation plan that lists affected files, the data shape changes (Rust struct diffs), migration notes for existing onchain data (if any), and acceptance criteria. Stop for user confirmation before editing code.

- [ ] Update on-chain state structs
  - Edit `anchor/programs/canadianreitinvest/src/state.rs`:
    - Replace `released: bool` and `refunded: bool` on `Investment` with an `enum InvestmentStatus { Pending = 0, Released = 1, Refunded = 2, Wired = 3, ShareIssued = 4 }` (or similar naming; keep explicit discriminants).
    - Ensure `Investment` stores the status as a `u8` (or explicit Anchor enum) and update `InitSpace` sizing accordingly.
    - Confirm `Investor` fields remain minimal; ensure it's safe to `init_if_needed` during `invest`.

- [ ] Implement `invest` instruction
  - Update `anchor/programs/canadianreitinvest/src/instructions/invest.rs`:
    - Require the investor (signer) and the investor's USDC ATA as inputs.
    - Use `init_if_needed` for the `Investor` PDA (so the account is created automatically when missing and the investor funds rent in the same tx).
    - On the client side include a conditional `createAssociatedTokenAccount` instruction if the user's USDC ATA doesn't exist (so the user pays rent for ATA creation).
    - Transfer USDC from the investor's ATA → escrow ATA via CPI (`token::transfer`).
    - Create the `Investment` PDA (investor-funded rent) and set `Investment.status = Pending` (or the enum default).
    - Increment counters and update `Fundraiser.total_raised` safely.
    - Add clear error returns for insufficient USDC balance, missing accounts, and duplicate investment ids.

- [ ] Update frontend hooks and UI
  - Edit `src/features/*` hooks and views:
    - Remove the standalone `Initialize Investor` and `Close Investor` buttons and UI.
    - Update `useInvest` to:
      1. Check if user has a USDC ATA (RPC `getAccountInfo` / `getTokenAccountsByOwner`).
      2. If missing, add a `createAssociatedTokenAccount` instruction to the transaction prior to transfer.
      3. Build a single transaction: (optional ATA-create) + transfer USDC + `invest` instruction (which will `init_if_needed` the `Investor` PDA and create `Investment`).
      4. Let the user sign once.
    - Update UI text and toasts to reflect the new one-step flow.

- [ ] Tests: Anchor and frontend
  - Add Anchor unit tests for:
    - `invest` when `Investor` PDA is missing (account created by `init_if_needed`).
    - `invest` when USDC ATA exists and transfer succeeds.
    - `Investment` PDA status transitions (Pending → Released/Refunded/Wired/ShareIssued) as applicable (release/refund flows may be added later).
  - Add frontend/integration smoke tests for the one-tx flow (create ATA if missing + transfer + invest).
