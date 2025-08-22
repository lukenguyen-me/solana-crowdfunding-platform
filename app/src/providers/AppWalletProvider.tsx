import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import { isUrl } from "@/lib/utils";

const rpcUrl = import.meta.env.PUBLIC_RPC_URL;
const network = isUrl(rpcUrl) ? rpcUrl : clusterApiUrl("devnet");
const wallets = [new PhantomWalletAdapter()];

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
