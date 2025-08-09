use anchor_lang::prelude::*;
use std::time::{SystemTime, UNIX_EPOCH};

declare_id!("5PXksXtCsHyAaJs8v5WqcoHnWs9wF9maJt4DPK7qqqvX");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy, Default)]
pub enum CampaignStatus {
    #[default]
    Active,
    Successful,
    Failed,
    Claimed,
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

#[derive(Accounts)]
#[instruction(name: String, description: String, target_amount: u64)]
pub struct CreateCampaign<'info> {
    #[account(init, payer = creator, space = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 40 + 4 + 160 + 1)]
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
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, has_one = creator)]
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
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The campaign is still active.")]
    CampaignStillActive,
    #[msg("Integer overflow occurred.")]
    IntegerOverflow,
    #[msg("Target amount not met.")]
    TargetNotMet,
    #[msg("Campaign has already been claimed.")]
    CampaignClaimed,
    #[msg("Campaign has already been refunded.")]
    CampaignRefunded,
}

// ----------------------------------------------------------------
#[program]
pub mod crowdfunding {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        name: String,
        description: String,
        target_amount: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.amount_pledged = 0;
        campaign.target_amount = target_amount;
        let now_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        campaign.start_time = now_timestamp;
        campaign.end_time = now_timestamp + 60 * 60 * 24 * 7;
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
        let system_program = &ctx.accounts.system_program;

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
        let now_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
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

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: campaign.to_account_info(),
                to: creator.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount_to_transfer)?;
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
        let now_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        if now_timestamp < campaign.end_time {
            return Err(ErrorCode::CampaignStillActive.into());
        }
        if campaign.amount_pledged >= campaign.target_amount {
            return Err(ErrorCode::TargetNotMet.into());
        }
        if campaign.status == CampaignStatus::Failed {
            return Err(ErrorCode::CampaignRefunded.into());
        }

        let amount_to_transfer = campaign.amount_pledged;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: campaign.to_account_info(),
                to: donator.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount_to_transfer)?;
        campaign.amount_pledged = 0;
        campaign.status = CampaignStatus::Failed;
        msg!(
            "Campaign funds refunded to donator: {}. Amount: {} lamports.",
            donator.key(),
            amount_to_transfer
        );

        Ok(())
    }
}
