import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { expect } from "chai";

async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

describe("claim instruction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;

  const creator = anchor.web3.Keypair.generate();
  const donator = anchor.web3.Keypair.generate();
  let campaignPDA: anchor.web3.PublicKey;

  const campaignName = "Campaign A";
  const campaignDescription = "Description of campaign A";
  const campaignTargetAmount = anchor.web3.LAMPORTS_PER_SOL * 5;

  async function getRentExemption(dataSize: number): Promise<number> {
    // Access the underlying Connection object from the provider
    const rent = await provider.connection.getMinimumBalanceForRentExemption(
      dataSize
    );
    return rent;
  }

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

    await program.methods
      .donate(new anchor.BN(campaignTargetAmount))
      .accounts({
        campaign: campaignPDA,
        donator: donator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donator])
      .rpc();
  });

  it("Prevents creator to claim funds before campaign ends", async () => {
    try {
      await program.methods
        .claim()
        .accounts({
          campaign: campaignPDA,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      expect.fail("Creator should not be able to claim funds yet");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("CampaignStillActive");
    }
  });

  it("Allow creator to claim funds after campaign ends", async () => {
    console.log("Waiting for campaign to end 3 seconds");
    await sleep(3);

    const creatorBalanceBefore = await provider.connection.getBalance(
      creator.publicKey
    );
    const campaignBalanceBefore = await provider.connection.getBalance(
      campaignPDA
    );

    const campaignAccountInfo = await provider.connection.getAccountInfo(
      campaignPDA
    );
    const campaignAccountDataSize = campaignAccountInfo.data.length; // Get actual data length from fetched account info
    const rentExemption = await getRentExemption(campaignAccountDataSize);

    await program.methods
      .claim()
      .accounts({
        campaign: campaignPDA,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const creatorBalanceAfter = await provider.connection.getBalance(
      creator.publicKey
    );
    const campaignBalanceAfter = await provider.connection.getBalance(
      campaignPDA
    );
    const campaignAccount = await program.account.campaign.fetch(campaignPDA);

    expect(creatorBalanceAfter).greaterThan(
      creatorBalanceBefore,
      "Funds should be transfered to creator balance"
    );
    expect(creatorBalanceAfter).lessThanOrEqual(
      creatorBalanceBefore + campaignTargetAmount,
      "Funds should be transfered to creator balance"
    );
    expect(campaignBalanceAfter).lessThan(
      campaignBalanceBefore,
      "Campaign balance should be decreased"
    );
    expect(campaignBalanceAfter).greaterThanOrEqual(
      rentExemption,
      "Campaign balance should keep rent exemption"
    );
    expect(campaignAccount.status).deep.equal(
      { claimed: {} },
      "Campaign status should be claimed"
    );
  });
});
