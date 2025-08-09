use anchor_lang::prelude::*;

declare_id!("5PXksXtCsHyAaJs8v5WqcoHnWs9wF9maJt4DPK7qqqvX");

#[program]
pub mod solana_crowdfunding_platform {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
