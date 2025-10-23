export const CLUSTER_CONFIG = {
  devnet: {
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  localnet: {
    usdcMint: 'FRuc4oH5hoY1ph7Kxnnz9DXs4xA6ZE23zCnYGCKHhoCN',
  },
} as const

export type ClusterId = keyof typeof CLUSTER_CONFIG