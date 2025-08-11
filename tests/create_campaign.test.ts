import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { assert } from "chai";

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
  });

  it("Allow creator to create a campaign", async () => {
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

    const campaignAccount = await program.account.campaign.fetch(campaignPDA);

    assert.equal(
      campaignAccount.name,
      campaignName,
      "Campaign name should be equal to campaign name"
    );
    assert.equal(
      campaignAccount.description,
      campaignDescription,
      "Campaign description should be equal to campaign description"
    );
    assert.equal(
      campaignAccount.targetAmount.toNumber(),
      campaignTargetAmount,
      "Campaign target amount should be equal to campaign target amount"
    );
    assert.equal(
      campaignAccount.amountPledged.toNumber(),
      0,
      "Campaign amount pledged should be equal to 0"
    );
    assert.deepEqual(
      campaignAccount.status,
      { active: {} },
      "Campaign status should be active"
    );
  });
});
