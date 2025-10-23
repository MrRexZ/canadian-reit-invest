/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/canadianreitinvest.json`.
 */
export type Canadianreitinvest = {
  "address": "HKE3kVkw621wdSJmsaZxHxLK1TaHQevvGAUh9Z3YxH7B",
  "metadata": {
    "name": "canadianreitinvest",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initializeFundraiser",
      "discriminator": [
        10,
        33,
        110,
        191,
        226,
        23,
        151,
        31
      ],
      "accounts": [
        {
          "name": "fundraiser",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100,
                  114,
                  97,
                  105,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "reitIdHash"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "fundraiser"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "reitId",
          "type": "string"
        },
        {
          "name": "reitIdHash",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "fundraiser",
      "discriminator": [
        167,
        106,
        143,
        202,
        135,
        131,
        204,
        196
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6002,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6003,
      "name": "escrowNotInitialized",
      "msg": "Escrow not initialized"
    },
    {
      "code": 6004,
      "name": "investmentCounterOverflow",
      "msg": "Investment counter overflow"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6006,
      "name": "invalidReitIdHash",
      "msg": "Invalid REIT ID hash"
    }
  ],
  "types": [
    {
      "name": "fundraiser",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "reitMint",
            "type": "pubkey"
          },
          {
            "name": "escrowVault",
            "type": "pubkey"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "releasedAmount",
            "type": "u64"
          },
          {
            "name": "investmentCounter",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reitAcceptedCurrency",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          }
        ]
      }
    }
  ]
};
