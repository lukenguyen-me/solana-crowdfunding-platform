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
  let donationPDA: anchor.web3.PublicKey;

  before(async () => {
    [campaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), creator.publicKey.toBuffer()],
      program.programId
    );
    [donationPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("donation"),
        campaignPDA.toBuffer(),
        donator.publicKey.toBuffer(),
      ],
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
        new anchor.BN(campaignTargetAmount),
        new anchor.BN(Date.now() / 1000 - 10),
        new anchor.BN(Date.now() / 1000 + 60 * 60 * 24 * 7)
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
        donation: donationPDA,
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

  it("Should fail when donating before campaign start time", async () => {
    // Create a new campaign that starts in the future
    const futureCreator = anchor.web3.Keypair.generate();
    const futureDonator = anchor.web3.Keypair.generate();

    // Airdrop funds
    const airdropCreatorTx = await provider.connection.requestAirdrop(
      futureCreator.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 10
    );
    const airdropDonatorTx = await provider.connection.requestAirdrop(
      futureDonator.publicKey,
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

    const [futureCampaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), futureCreator.publicKey.toBuffer()],
      program.programId
    );
    const [futureDonationPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("donation"),
        futureCampaignPDA.toBuffer(),
        futureDonator.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create campaign that starts 1 hour in the future
    const futureStartTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now
    const futureEndTime = futureStartTime + 60 * 60 * 24 * 7; // 7 days after start

    await program.methods
      .createCampaign(
        "Future Campaign",
        "Campaign that starts in the future",
        new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 5),
        new anchor.BN(futureStartTime),
        new anchor.BN(futureEndTime)
      )
      .accounts({
        campaign: futureCampaignPDA,
        creator: futureCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([futureCreator])
      .rpc();

    // Try to donate before start time - should fail
    const donateAmount = anchor.web3.LAMPORTS_PER_SOL * 1;

    try {
      await program.methods
        .donate(new anchor.BN(donateAmount))
        .accounts({
          campaign: futureCampaignPDA,
          donator: futureDonator.publicKey,
          donation: futureDonationPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([futureDonator])
        .rpc();

      expect.fail("Expected donation to fail before start time");
    } catch (error) {
      expect(error.error.errorMessage).to.equal(
        "The campaign is not started yet."
      );
    }
  });

  it("Should fail when donating after campaign end time", async () => {
    // Create a new campaign that has already ended
    const pastCreator = anchor.web3.Keypair.generate();
    const pastDonator = anchor.web3.Keypair.generate();

    // Airdrop funds
    const airdropCreatorTx = await provider.connection.requestAirdrop(
      pastCreator.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 10
    );
    const airdropDonatorTx = await provider.connection.requestAirdrop(
      pastDonator.publicKey,
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

    const [pastCampaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), pastCreator.publicKey.toBuffer()],
      program.programId
    );
    const [pastDonationPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("donation"),
        pastCampaignPDA.toBuffer(),
        pastDonator.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create campaign that has already ended
    const pastStartTime = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 8; // 8 days ago
    const pastEndTime = Math.floor(Date.now() / 1000) - 60 * 60; // 1 hour ago

    await program.methods
      .createCampaign(
        "Past Campaign",
        "Campaign that has already ended",
        new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 5),
        new anchor.BN(pastStartTime),
        new anchor.BN(pastEndTime)
      )
      .accounts({
        campaign: pastCampaignPDA,
        creator: pastCreator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([pastCreator])
      .rpc();

    // Try to donate after end time - should fail
    const donateAmount = anchor.web3.LAMPORTS_PER_SOL * 1;

    try {
      await program.methods
        .donate(new anchor.BN(donateAmount))
        .accounts({
          campaign: pastCampaignPDA,
          donator: pastDonator.publicKey,
          donation: pastDonationPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([pastDonator])
        .rpc();

      expect.fail("Expected donation to fail after end time");
    } catch (error) {
      expect(error.error.errorMessage).to.equal("The campaign has ended.");
    }
  });
});
