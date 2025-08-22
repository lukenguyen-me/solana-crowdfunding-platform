import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import { formatMoney, isUrl, truncateWalletAddress } from "@/lib/utils";
import AppWalletProvider from "@/providers/AppWalletProvider";
import { LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function ConnectWalletButton() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [balance, setBalance] = useState<number>(0);

  const handleButtonClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  useEffect(() => {
    if (connection && publicKey && connected) {
      connection.getBalance(publicKey).then((lamports) => {
        setBalance(lamports / LAMPORTS_PER_SOL);
      });
    }
  }, [connection, publicKey, connected]);

  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Wallet />
            {truncateWalletAddress(publicKey?.toBase58() || "")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="text-muted-foreground">Balance</span>
              <span>{formatMoney(balance)} SOL</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onClick={disconnect}>
              <LogOut />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleButtonClick} disabled={connecting}>
      {connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}

export default function ConnectWallet() {
  return (
    <AppWalletProvider>
      <ConnectWalletButton />
    </AppWalletProvider>
  );
}
