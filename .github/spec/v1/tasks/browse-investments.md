Overview

The admin user needs the Browse Investment page where they can release investments.
Environment

- Admin wallet public key (used by the app in development mode) should be set in `.env.development` using the Vite environment variable prefix `VITE_` so it is picked up by the frontend. Add:

	VITE_ADMIN_WALLET=7xvth2P8U5Zf1w7P8Q32wcub5BVqP8eXb7wwpaH4iA7X

	Note: Using `VITE_` ensures the variable is available to the frontend. Do NOT commit secrets; this is a public dev keypair file only for localnet usage.

High-level contract

- Inputs:
	- Investment id (onchain PDA or database id depending on where investments are stored in your system).
	- Admin wallet (from `VITE_ADMIN_WALLET`).

- Outputs:
	- On successful release: funds moved from escrow vault to the admin's USDC ATA and the investment state updated to status `released` (or `release`).
	- On error: descriptive error and no partial state changes.

Frontend UI

- Existing admin page / view: `Browse Investments` that lists all investments (filterable by status). The investment row must show a `Release` button for investments whose status is `pending`.

- The `Release` button should:
	1. show a confirmation modal (explaining that tokens will be transferred to the admin ATA and the investment status will be updated on-chain),
 1. call a backend route or directly build and send a transaction (see Backend/On-chain below),
 2. show a transaction spinner/toast while pending and show success/failure toast with transaction signature or error details.

- Only show `Release` for admin users.