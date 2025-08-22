import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Crowdfunding } from "@/idl/crowdfunding";
import idl from "@/idl/crowdfunding.json";
import AppWalletProvider from "@/providers/AppWalletProvider";
import { useAllCampaigns } from "@/queries/campaign.query";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { HandCoins } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
];

function List() {
  const { connection } = useConnection();
  const { data: allCampaigns, isLoading } = useAllCampaigns(connection);

  return (
    <Table>
      {isLoading && (
        <TableCaption>
          {" "}
          <Spinner />
        </TableCaption>
      )}
      <TableHeader>
        <TableRow className="font-mono">
          <TableHead className="text-muted-foreground">Campaign</TableHead>
          <TableHead className="text-right text-muted-foreground">
            Target
          </TableHead>
          <TableHead className="text-right text-muted-foreground">
            Progress
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {allCampaigns &&
          allCampaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>{campaign.name}</TableCell>
              <TableCell className="text-right">
                {campaign.amountPledged}
              </TableCell>
              <TableCell className="text-right">
                {campaign.targetAmount}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline">
                  <HandCoins />
                  Donate
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

export default function ListCampaign() {
  return (
    <AppWalletProvider>
      <List />
    </AppWalletProvider>
  );
}
