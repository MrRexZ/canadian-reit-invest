# User flow

This document explains how the Canadian REIT Invest app works for regular users (investors) and for the admin team. It avoids technical terms and focuses on what people actually do and see.

## Quick overview

- Investors can browse available REITs, invest USDC into them, and see their investments.
- Admins can create REIT listings, manually move collected funds to an off-chain process to convert and wire money to the REIT, mint REIT tokens to investors once the wiring succeeds, and send dividend payments back to investors.

## Terminology

- Escrow: a secure holding area where investor money sits until the admin moves it to be wired to the REIT. Think of it like a locked wallet that protects money while the admin prepares the real-world payment.
- REIT token: a digital token that represents an investor’s share in a REIT. After money is successfully wired to the REIT, tokens are created and given to the investor.
- Admin wiring: when the admin takes money from escrow and sends it to the REIT (through an off-platform bank/partner). This step may take a few days because it involves real money.

## Investor experience (step-by-step)

1. Browse REITs
   - You see a list of REITs with basic details (name, brief description, share price or unit size, and any important dates).

2. Invest
   - Choose a REIT and the amount in USDC you want to invest.
   - The money is taken from your USDC wallet and placed into the escrow holding area. You get a confirmation that your investment was recorded.
   - Each investment entry is tracked separately, so you can make multiple investments over time.

3. View your investments
   - You can see all your investment entries for each REIT, including how much you put in and the current status (waiting for wiring, tokens minted, refunded, etc.).

4. What happens next behind the scenes
   - When the admin moves the grouped funds from escrow to begin the real-world wiring to the REIT, your investment entry will be marked as "funds transferred for wiring" and will await confirmation from the admin.
   - If the wiring and conversion succeed, the admin will create (mint) the corresponding REIT tokens and send them to your wallet. The investment entry will show the number of REIT tokens you received.
   - If the wiring fails, the admin will return your USDC to your wallet (a refund). The investment entry will show that it was refunded.

5. Dividends
   - When a REIT pays dividends, the admin converts the REIT payout into USDC (off-platform) and then sends USDC to investors’ wallets. The payment is proportional to the number of REIT tokens you hold and may be adjusted if you held tokens for only part of the dividend period.

## Admin experience (step-by-step)

1. Create a REIT listing
   - Admins add a new REIT with a name, description, token settings, and later any notes about timing or fees.

2. View and manage REITs and investments
   - Admins can see all REIT listings, funds in escrow, and each investor’s entries for a REIT.

3. Move funds for wiring to the REIT
   - When ready, the admin moves the collected USDC from the escrow holding area into the admin’s wallet to start the off-platform conversion and bank wiring process. This is a manual operation and typically happens only when there is enough money or at agreed scheduling intervals.

4. Off-platform conversion and wiring
   - The admin (or their partner) converts USDC to the REIT’s required currency (for example, CAD) and wires the funds to the REIT in the real world.

5. Confirm and mint tokens
   - After the admin confirms the bank wiring succeeded, they create the REIT tokens and send them to each investor based on the amount each investor contributed.

6. Handle wiring failures and refunds
   - If the wiring or conversion fails, the admin returns the appropriate USDC back to each investor’s wallet. Admins can also cancel or mark entries as refunded when needed.

7. Send dividends
   - When the REIT issues dividends, the admin collects the dividend amount (off-platform), converts it to USDC if necessary, and then sends USDC payments to investors’ wallets according to their share of the REIT tokens.

## Common questions (plain answers)

- How long does wiring take?
  - It depends on the bank/process used. Expect days, not minutes. The app will show an update once the admin confirms wiring completed.

- When do I get my REIT tokens?
  - Tokens are created and sent to you after the admin confirms the real-world money was successfully delivered to the REIT.

- What if the wiring fails?
  - The admin will refund your USDC back to your wallet. You will see the refund status in your investment history.

- How are dividends calculated?
  - Dividends are paid in USDC and split based on the number of REIT tokens you hold. If you held tokens only part of the dividend period, your amount may be adjusted (prorated).

## Simple examples

- Example investor flow: Alice invests 100 USDC in REIT A (goes to escrow). Later the admin moves funds for wiring to REIT A and confirms the REIT was paid. Admin mints tokens and Alice receives tokenized shares worth equivalent to 100 USDC. Next quarter, REIT A pays dividends; admin sends Alice her share in USDC.

- Example refund: Bob invests 200 USDC. The admin attempts the wiring but the bank transfer fails. Admin refunds Bob 200 USDC back to his wallet and marks the investment as refunded.
