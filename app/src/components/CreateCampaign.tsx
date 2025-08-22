import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Crowdfunding } from "@/idl/crowdfunding";
import idl from "@/idl/crowdfunding.json";
import AppWalletProvider from "@/providers/AppWalletProvider";
import * as anchor from "@coral-xyz/anchor";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const { AnchorProvider, BN, Program } = anchor;
const { PublicKey, SystemProgram } = anchor.web3;

const formSchema = z.object({
  name: z.string().min(2).max(40, "Max 40 characters"),
  description: z.string().min(2).max(160, "Max 160 characters"),
  targetAmount: z.number("Target amount must be a number").min(1),
  startDate: z.date(),
  endDate: z.date(),
});

function CreateCampaignForm() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      targetAmount: 0,
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!wallet) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!connection) {
      toast.error("Solana connection not established.");
      return;
    }

    try {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program<Crowdfunding>(idl as Crowdfunding, provider);
      const nowTimestamp = new BN(Math.floor(Date.now() / 1000));

      const [campaignAccountPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          wallet.publicKey.toBuffer(),
          nowTimestamp.toArrayLike(Buffer, "le", 8),
        ],
        program.programId,
      );

      const signature = await program.methods
        .createCampaign(
          data.name,
          data.description,
          new BN(data.targetAmount),
          new BN(Math.floor(data.startDate.getTime() / 1000)),
          new BN(Math.floor(data.endDate.getTime() / 1000)),
          nowTimestamp,
        ) // Name of your instruction
        .accounts({
          campaign: campaignAccountPDA,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();

      toast.success(
        `Campaign created successfully! Transaction confirmed: ${signature}`,
      );
    } catch (error) {
      toast.error(`Create campaign failed: ${(error as Error).message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormDescription>
                This is your public display name
              </FormDescription>
              <FormControl>
                <Input placeholder="Donation for my solution..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormDescription>Describe your campaign</FormDescription>
              <FormControl>
                <Textarea rows={3} placeholder="My solution is..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Fund</FormLabel>
              <FormDescription>
                Amount in SOL that you expect to raise
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="100"
                  type="number"
                  {...field}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    e.target.value !== ""
                      ? field.onChange(Number(e.target.value))
                      : field.onChange("");
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormDescription>
                People can start donating from this date
              </FormDescription>
              <FormControl>
                <DatePicker
                  placeholder="Select start date"
                  date={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormDescription>
                Your campaign will close after this date
              </FormDescription>
              <FormControl>
                <DatePicker
                  placeholder="Select end date"
                  date={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={!wallet || form.formState.isSubmitting}
          type="submit"
          className="w-full"
        >
          {form.formState.isSubmitting && <Spinner />} Create Campaign
        </Button>
      </form>
    </Form>
  );
}

export default function CreateCampaign() {
  return (
    <AppWalletProvider>
      <CreateCampaignForm />
    </AppWalletProvider>
  );
}
