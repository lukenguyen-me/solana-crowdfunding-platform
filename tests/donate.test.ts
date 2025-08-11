import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { expect } from "chai";

describe("donate instruction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;

  const creator = anchor.web3.Keypair.generate();
  const donator = anchor.web3.Keypair.generate();
  let campaignPDA: anchor.web3.PublicKey;

  before(async () => {
    [campaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), creator.publicKey.toBuffer()],
      program.programId
    );

    const airdropCreatorTx = await provider.connection.requestAirdrop(
      creator.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 10
    );
    const airdropDonatorTx = await provider.connection.requestAirdrop(
      donator.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 10
    );

    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropCreatorTx,
    });
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropDonatorTx,
    });

    const campaignName = "Campaign A";
    const campaignDescription = "Description of campaign A";
    const campaignTargetAmount = anchor.web3.LAMPORTS_PER_SOL * 5;

    await program.methods
      .createCampaign(
        campaignName,
        campaignDescription,
        new anchor.BN(campaignTargetAmount)
      )
      .accounts({
        campaign: campaignPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
  });

  it("Allow a user to donate to a campaign", async () => {
    const donateAmount = anchor.web3.LAMPORTS_PER_SOL * 1;

    const campaignBalanceBefore = await provider.connection.getBalance(
      campaignPDA
    );
    const donatorBalanceBefore = await provider.connection.getBalance(
      donator.publicKey
    );

    await program.methods
      .donate(new anchor.BN(donateAmount))
      .accounts({
        campaign: campaignPDA,
        donator: donator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donator])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPDA);
    const campaignBalanceAfter = await provider.connection.getBalance(
      campaignPDA
    );
    const donatorBalanceAfter = await provider.connection.getBalance(
      donator.publicKey
    );

    expect(campaignAccount.amountPledged.toNumber()).equal(
      donateAmount,
      "Amount pledged should be equal to donate amount"
    );
    expect(campaignBalanceAfter).least(
      campaignBalanceBefore + donateAmount,
      "Campaign balance should be at least campaign balance before + donate amount"
    );
    expect(donatorBalanceAfter).most(
      donatorBalanceBefore - donateAmount,
      "Donator balance should be below donator balance before - donate amount"
    );
  });
});
