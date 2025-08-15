import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { expect } from "chai";

async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

describe("refund instruction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;

  const creator = anchor.web3.Keypair.generate();
  const donator = anchor.web3.Keypair.generate();
  let campaignPDA: anchor.web3.PublicKey;
  let donationPDA: anchor.web3.PublicKey;

  const campaignName = "Campaign A";
  const campaignDescription = "Description of campaign A";
  const campaignTargetAmount = anchor.web3.LAMPORTS_PER_SOL * 5;
  const donateAmount = anchor.web3.LAMPORTS_PER_SOL * 2; // Less than target

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

    // Create campaign
    await program.methods
      .createCampaign(
        campaignName,
        campaignDescription,
        new anchor.BN(campaignTargetAmount),
        new anchor.BN(Date.now() / 1000 - 10),
        new anchor.BN(Date.now() / 1000 + 10)
      )
      .accounts({
        campaign: campaignPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Donate less than target amount
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
  });

  it("Prevents refund before campaign ends", async () => {
    try {
      await program.methods
        .refund()
        .accounts({
          campaign: campaignPDA,
          donator: donator.publicKey,
          donation: donationPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([donator])
        .rpc();

      expect.fail("Donator should not be able to refund before campaign ends");
    } catch (error) {
      expect(error.error.errorCode.code).equal("CampaignStillActive");
    }
  });

  it("Allows refund after campaign ends when target not met", async () => {
    console.log("Waiting for campaign to end (10 seconds)");
    await sleep(15);

    const donatorBalanceBefore = await provider.connection.getBalance(
      donator.publicKey
    );
    const campaignBalanceBefore = await provider.connection.getBalance(
      campaignPDA
    );

    await program.methods
      .refund()
      .accounts({
        campaign: campaignPDA,
        donator: donator.publicKey,
        donation: donationPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donator])
      .rpc();

    const donatorBalanceAfter = await provider.connection.getBalance(
      donator.publicKey
    );
    const campaignBalanceAfter = await provider.connection.getBalance(
      campaignPDA
    );
    const campaignAccount = await program.account.campaign.fetch(campaignPDA);

    // Verify donator received refund
    expect(donatorBalanceAfter).equal(
      donatorBalanceBefore + donateAmount,
      "Donator balance should increase after refund"
    );

    // Verify campaign balance decreased
    expect(campaignBalanceAfter).equal(
      campaignBalanceBefore - donateAmount,
      "Campaign balance should decrease after refund"
    );

    // Verify campaign amount pledged is reset to 0
    expect(campaignAccount.amountPledged.toNumber()).equal(
      0,
      "Campaign amount pledged should be reset to 0"
    );

    // Verify campaign status is set to Failed
    expect(campaignAccount.status).deep.equal(
      { failed: {} },
      "Campaign status should be Failed"
    );
  });

  it("Prevents double refund", async () => {
    try {
      await program.methods
        .refund()
        .accounts({
          campaign: campaignPDA,
          donator: donator.publicKey,
          donation: donationPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([donator])
        .rpc();

      expect.fail("Should not be able to refund twice");
    } catch (error) {
      expect(error.error.errorCode.code).equal("CampaignRefunded");
    }
  });

  describe("Refund when target is met", () => {
    const creator2 = anchor.web3.Keypair.generate();
    const donator2 = anchor.web3.Keypair.generate();
    let campaignPDA2: anchor.web3.PublicKey;
    let donationPDA2: anchor.web3.PublicKey;

    before(async () => {
      [campaignPDA2] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), creator2.publicKey.toBuffer()],
        program.programId
      );
      [donationPDA2] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("donation"),
          campaignPDA2.toBuffer(),
          donator2.publicKey.toBuffer(),
        ],
        program.programId
      );

      const airdropCreator2Tx = await provider.connection.requestAirdrop(
        creator2.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 10
      );
      const airdropDonator2Tx = await provider.connection.requestAirdrop(
        donator2.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 10
      );

      const latestBlockHash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropCreator2Tx,
      });
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropDonator2Tx,
      });

      // Create campaign
      await program.methods
        .createCampaign(
          "Campaign B",
          "Description of campaign B",
          new anchor.BN(campaignTargetAmount),
          new anchor.BN(Date.now() / 1000 - 10), // Started 10 seconds ago
          new anchor.BN(Date.now() / 1000 + 10) // Ends in 60 seconds
        )
        .accounts({
          campaign: campaignPDA2,
          creator: creator2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator2])
        .rpc();

      // Donate exactly the target amount
      await program.methods
        .donate(new anchor.BN(campaignTargetAmount))
        .accounts({
          campaign: campaignPDA2,
          donator: donator2.publicKey,
          donation: donationPDA2,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([donator2])
        .rpc();
    });

    it("Prevents refund when target amount is met", async () => {
      console.log("Waiting for campaign to end (10 seconds)");
      await sleep(15);

      try {
        await program.methods
          .refund()
          .accounts({
            campaign: campaignPDA2,
            donator: donator2.publicKey,
            donation: donationPDA2,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([donator2])
          .rpc();

        expect.fail("Should not be able to refund when target is met");
      } catch (error) {
        expect(error.error.errorCode.code).equal("CampaignMetTarget");
      }
    });
  });
});
