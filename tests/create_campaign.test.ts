import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { expect } from "chai";

describe("create_campaign instruction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;

  const creator = anchor.web3.Keypair.generate();
  let campaignPDA: anchor.web3.PublicKey;

  before(async () => {
    [campaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), creator.publicKey.toBuffer()],
      program.programId
    );

    try {
      const airdropCreatorTx = await provider.connection.requestAirdrop(
        creator.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 10
      );
      const latestBlockHash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropCreatorTx,
      });
    } catch (error) {
      console.error("Error airdropping creator:", error);
    }
  });

  it("Allow creator to create a campaign", async () => {
    const campaignName = "Campaign A";
    const campaignDescription = "Description of campaign A";
    const campaignTargetAmount = anchor.web3.LAMPORTS_PER_SOL * 5;

    await program.methods
      .createCampaign(
        campaignName,
        campaignDescription,
        new anchor.BN(campaignTargetAmount),
        new anchor.BN(Date.now() / 1000),
        new anchor.BN(Date.now() / 1000 + 60 * 60 * 24 * 7)
      )
      .accounts({
        campaign: campaignPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(campaignPDA);

    expect(campaignAccount.name).equal(
      campaignName,
      "Campaign name should be equal to campaign name"
    );
    expect(campaignAccount.description).equal(
      campaignDescription,
      "Campaign description should be equal to campaign description"
    );
    expect(campaignAccount.targetAmount.toNumber()).equal(
      campaignTargetAmount,
      "Campaign target amount should be equal to campaign target amount"
    );
    expect(campaignAccount.amountPledged.toNumber()).equal(
      0,
      "Campaign amount pledged should be equal to 0"
    );
    expect(campaignAccount.status).to.deep.equal(
      { active: {} },
      "Campaign status should be active"
    );
  });
});
