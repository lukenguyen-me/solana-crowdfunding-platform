import type { Crowdfunding } from "@/idl/crowdfunding";
import idl from "@/idl/crowdfunding.json";
import { $queryClient } from "@/stores/useQueryStore";
import type { Campaign } from "@/types/campaign";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";

const readOnlyWallet = {
  publicKey: web3.PublicKey.default,
  signTransaction: () => {
    throw new Error("Not implemented");
  },
  signAllTransactions: () => {
    throw new Error("Not implemented");
  },
};

export const useAllCampaigns = (connection: web3.Connection) => {
  const queryClient = useStore($queryClient);
  const provider = new AnchorProvider(connection, readOnlyWallet, {});
  const program = new Program<Crowdfunding>(idl as Crowdfunding, provider);

  return useQuery(
    {
      queryKey: ["allCampaigns"],
      queryFn: async () => {
        const campaigns = await program.account.campaign.all();
        return campaigns.map((campaign) => ({
          id: campaign.publicKey.toString(),
          name: campaign.account.name,
          description: campaign.account.description,
          targetAmount: campaign.account.targetAmount.toString(),
          startDate: campaign.account.startTime.toString(),
          endDate: campaign.account.endTime.toString(),
          creator: campaign.account.creator.toString(),
          amountPledged: campaign.account.amountPledged.toString(),
          status: campaign.account.status.toString(),
        }));
      },
    },
    queryClient,
  );
};
