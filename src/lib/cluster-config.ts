export const CLUSTER_CONFIG = {
  devnet: {
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  localnet: {
    // Localnet uses dynamically created mints
  },
} as const

export type ClusterId = keyof typeof CLUSTER_CONFIG