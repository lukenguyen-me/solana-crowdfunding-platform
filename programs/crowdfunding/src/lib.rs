use anchor_lang::prelude::*;

declare_id!("AsnLjBRXqhJ1RWduiP6so99Av7Gd14xL5Vo5YDG47FTW");

#[program]
pub mod crowdfunding {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        name: String,
        description: String,
        target_amount: u64,
        start_time: i64,
        end_time: i64,
        _timestamp: i64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.amount_pledged = 0;
        campaign.target_amount = target_amount;
        campaign.start_time = start_time;
        campaign.end_time = end_time;

        campaign.name = name;
        campaign.description = description;
        msg!(
            "Campaign created by {} with a target of {} lamports.",
            campaign.creator,
            campaign.target_amount
        );

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let donator = &ctx.accounts.donator;
        let donation = &mut ctx.accounts.donation;
        let system_program = &ctx.accounts.system_program;

        let now = Clock::get()?.unix_timestamp;
        if now < campaign.start_time {
            return Err(ErrorCode::CampaignNotStarted.into());
        }
        if now > campaign.end_time {
            return Err(ErrorCode::CampaignHasEnded.into());
        }

        let cpi_context = CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: donator.to_account_info(),
                to: campaign.to_account_info(),
            },
        );

        anchor_lang::system_program::transfer(cpi_context, amount)?;

        campaign.amount_pledged = campaign
            .amount_pledged
            .checked_add(amount)
            .ok_or(ErrorCode::IntegerOverflow)?;
        donation.amount = amount;
        donation.status = DonationStatus::Active;

        msg!(
            "Donated {} lamports to campaign from {}.",
            amount,
            donator.key()
        );

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let creator = &ctx.accounts.creator;

        let now_timestamp: i64 = Clock::get()?.unix_timestamp;
        if now_timestamp < campaign.end_time {
            return Err(ErrorCode::CampaignStillActive.into());
        }
        if campaign.amount_pledged < campaign.target_amount {
            return Err(ErrorCode::TargetNotMet.into());
        }
        if campaign.status == CampaignStatus::Claimed {
            return Err(ErrorCode::CampaignClaimed.into());
        }

        let rent_examption = Rent::get()?.minimum_balance(campaign.to_account_info().data_len());
        let amount_to_transfer = campaign.to_account_info().lamports() - rent_examption;

        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount_to_transfer;
        **creator.to_account_info().try_borrow_mut_lamports()? += amount_to_transfer;

        campaign.status = CampaignStatus::Claimed;
        msg!(
            "Campaign funds claims by creator: {}. Amount: {} lamports",
            creator.key(),
            amount_to_transfer
        );

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let donator = &ctx.accounts.donator;
        let donation = &mut ctx.accounts.donation;
        let now_timestamp: i64 = Clock::get()?.unix_timestamp;

        if now_timestamp < campaign.end_time {
            return Err(ErrorCode::CampaignStillActive.into());
        }
        if campaign.amount_pledged >= campaign.target_amount {
            return Err(ErrorCode::CampaignMetTarget.into());
        }
        if campaign.status == CampaignStatus::Claimed {
            return Err(ErrorCode::CampaignClaimed.into());
        }
        if donation.status == DonationStatus::Refunded {
            return Err(ErrorCode::CampaignRefunded.into());
        }

        let amount_to_transfer = donation.amount;

        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount_to_transfer;
        **donator.to_account_info().try_borrow_mut_lamports()? += amount_to_transfer;

        campaign.amount_pledged -= amount_to_transfer;
        campaign.status = CampaignStatus::Failed;
        donation.amount = 0;
        donation.status = DonationStatus::Refunded;

        msg!(
            "Campaign funds refunded to donator: {}. Amount: {} lamports.",
            donator.key(),
            amount_to_transfer
        );

        Ok(())
    }
}

/* ---------------------------------------------------------------- */
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy, Default)]
pub enum CampaignStatus {
    #[default]
    Active,
    Successful,
    Failed,
    Claimed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy, Default)]
pub enum DonationStatus {
    #[default]
    Active,
    Claimed,
    Refunded,
}

// ----------------------------------------------------------------
#[account]
#[derive(Default)]
pub struct Campaign {
    pub creator: Pubkey,
    pub amount_pledged: u64,
    pub target_amount: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub name: String,
    pub description: String,
    pub status: CampaignStatus,
}
// The space calculation for the `Campaign` account is:
// 8 (discriminator)
// + 32 (creator: Pubkey)
// + 8 (amount_pledged: u64)
// + 8 (target_amount: u64)
// + 8 (start_time: i64)
// + 8 (end_time: i64)
// + 4 + 40 (name: String) -> 4 bytes for length prefix, 40 bytes for the string itself
// + 4 + 160 (description: String) -> 4 bytes for length prefix, 160 bytes for the string itself
// + 1 (status: CampaignStatus) -> Enums with up to 256 variants take 1 byte
// Total space = 8 + 32 + 8 + 8 + 8 + 8 + 44 + 164 + 1 = 281 bytes

// ----------------------------------------------------------------
#[account]
#[derive(Default)]
pub struct Donation {
    pub donator: Pubkey,
    pub campaign: Pubkey,
    pub amount: u64,
    pub status: DonationStatus,
}

// ----
#[derive(Accounts)]
#[instruction(
    name: String, 
    description: String, 
    target_amount: u64,
    start_time: i64, 
    end_time: i64,
    timestamp: i64 // Add the timestamp here
)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 40 + 4 + 160 + 1,
        seeds = [b"campaign", creator.key().as_ref(), &timestamp.to_le_bytes()],
        bump,
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Donate<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub donator: Signer<'info>,
    #[account(
        init,
        payer = donator,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"donation", campaign.key().as_ref(), donator.key().as_ref()],
        bump,
    )]
    pub donation: Account<'info, Donation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, has_one = creator, seeds = [b"campaign", creator.key().as_ref()], bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub donator: Signer<'info>,
    #[account(mut)]
    pub donation: Account<'info, Donation>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The campaign is not started yet.")]
    CampaignNotStarted,
    #[msg("The campaign has ended.")]
    CampaignHasEnded,
    #[msg("The campaign is still active.")]
    CampaignStillActive,
    #[msg("Integer overflow occurred.")]
    IntegerOverflow,
    #[msg("Target amount not met.")]
    TargetNotMet,
    #[msg("Campaign has met target amount.")]
    CampaignMetTarget,
    #[msg("Campaign has already been claimed.")]
    CampaignClaimed,
    #[msg("Campaign has already been refunded.")]
    CampaignRefunded,
    #[msg("Insufficient funds for transfer.")]
    InsufficientFundsForTransfer,
    #[msg("Overflow error occurred.")]
    OverflowError,
}
