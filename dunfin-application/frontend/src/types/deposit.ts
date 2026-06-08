export type DepositNetwork = "ERC20" | "BEP20" | "TRC20";

export type DepositCurrency = "USDT" | "USDC" | "BTC";

export interface DepositAddressResponse {
  success: boolean;
  userId: string;
  network: DepositNetwork;
  networkLabel: string;
  depositAddress: string;
  new: boolean;
  txHash: string | null;
  addressType: "evm" | "tron";
}

export const NETWORK_OPTIONS: {
  id: DepositNetwork;
  titleKey: "networkErc20" | "networkBep20" | "networkTrc20";
  subtitleKey: "networkErcSubErc20" | "networkErcSubBep20" | "networkErcSubTrc20";
}[] = [
  {
    id: "ERC20",
    titleKey: "networkErc20",
    subtitleKey: "networkErcSubErc20",
  },
  {
    id: "BEP20",
    titleKey: "networkBep20",
    subtitleKey: "networkErcSubBep20",
  },
  {
    id: "TRC20",
    titleKey: "networkTrc20",
    subtitleKey: "networkErcSubTrc20",
  },
];

export const CURRENCY_OPTIONS: DepositCurrency[] = ["USDT", "USDC", "BTC"];

export const QUICK_AMOUNTS = [30, 50, 100] as const;

export const MIN_DEPOSIT_USDT = 5;
