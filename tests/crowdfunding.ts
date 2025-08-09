import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { assert } from "chai";

async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function getUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

describe("crowdfunding", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;

  const creator = anchor.web3.Keypair.generate();
  const donator = anchor.web3.Keypair.generate();
  const campaign = anchor.web3.Keypair.generate();

  it("Airdop SOL to the users and confirm they have a balance", async () => {
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

    const creatorBalance = await provider.connection.getBalance(
      creator.publicKey
    );
    const donatorBalance = await provider.connection.getBalance(
      donator.publicKey
    );

    assert.isAbove(
      creatorBalance,
      0,
      "Creator balance should be greater than 0"
    );
    assert.isAbove(
      donatorBalance,
      0,
      "Donator balance should be greater than 0"
    );
  });

  it("Allow creator to create a campaign", async () => {
    console.log("Campaign Account public key: ", campaign.publicKey.toBase58());

    const campaignName = "Campaign A";
    const campaignDescription = "Description of campaign A";
    const campaignTargetAmount = anchor.web3.LAMPORTS_PER_SOL * 5;

    const startTime = getUnixTimestamp();

    await program.methods
      .createCampaign(
        campaignName,
        campaignDescription,
        new anchor.BN(campaignTargetAmount)
      )
      .accounts({
        campaign: campaign.publicKey,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator, campaign])
      .rpc();

    const campaignAccount = await program.account.campaign.fetch(
      campaign.publicKey
    );

    assert.equal(campaignAccount.name, campaignName);
    assert.equal(campaignAccount.description, campaignDescription);
    assert.equal(campaignAccount.targetAmount.toNumber(), campaignTargetAmount);
    assert.equal(campaignAccount.amountPledged.toNumber(), 0);
    assert.deepEqual(campaignAccount.status, { active: {} });
  });
});
