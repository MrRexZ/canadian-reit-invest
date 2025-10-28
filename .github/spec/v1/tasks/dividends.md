This doc details spec to give dividends for shareholders.

Add a new admin sidebar section for a page to issue dividends.
The page will contain:
1. a select list (which is fetched list of public keys of investors, use React Query to fetch. the selection will contain the email and also the wallet pubkey), and 
2. an input field (how much USDC to transfer)
3. A button to submit

Once button is clicked, it'll create a PDA called `Dividends`
The schema is:
#[account]
#[derive(InitSpace)]
pub struct Dividends {
    pub investor: Pubkey, // The public key of the investor
    pub fundraiser: Pubkey, // The public key of the fundraiser PDA
    pub investment_pda: Pubkey // the associated investment resulting in this dividend
    pub usdc_amount: u64, // The amount of USDC shared as dividend
    pub bump: u8, // PDA bump seed for the dividend account
}
It'll then also transfer the USDC from admin wallet USDC ATA  to the selected investor USDC ATA wallet.
