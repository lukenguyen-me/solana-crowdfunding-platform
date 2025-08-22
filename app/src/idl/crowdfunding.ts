/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/crowdfunding.json`.
 */
export type Crowdfunding = {
  address: "AsnLjBRXqhJ1RWduiP6so99Av7Gd14xL5Vo5YDG47FTW";
  metadata: {
    name: "crowdfunding";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "claim";
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210];
      accounts: [
        {
          name: "campaign";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 97, 109, 112, 97, 105, 103, 110];
              },
              {
                kind: "account";
                path: "creator";
              },
            ];
          };
        },
        {
          name: "creator";
          writable: true;
          signer: true;
          relations: ["campaign"];
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "createCampaign";
      discriminator: [111, 131, 187, 98, 160, 193, 114, 244];
      accounts: [
        {
          name: "campaign";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 97, 109, 112, 97, 105, 103, 110];
              },
              {
                kind: "account";
                path: "creator";
              },
              {
                kind: "arg";
                path: "timestamp";
              },
            ];
          };
        },
        {
          name: "creator";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "description";
          type: "string";
        },
        {
          name: "targetAmount";
          type: "u64";
        },
        {
          name: "startTime";
          type: "i64";
        },
        {
          name: "endTime";
          type: "i64";
        },
        {
          name: "timestamp";
          type: "i64";
        },
      ];
    },
    {
      name: "donate";
      discriminator: [121, 186, 218, 211, 73, 70, 196, 180];
      accounts: [
        {
          name: "campaign";
          writable: true;
        },
        {
          name: "donator";
          writable: true;
          signer: true;
        },
        {
          name: "donation";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 111, 110, 97, 116, 105, 111, 110];
              },
              {
                kind: "account";
                path: "campaign";
              },
              {
                kind: "account";
                path: "donator";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
      ];
    },
    {
      name: "refund";
      discriminator: [2, 96, 183, 251, 63, 208, 46, 46];
      accounts: [
        {
          name: "campaign";
          writable: true;
        },
        {
          name: "donator";
          writable: true;
          signer: true;
        },
        {
          name: "donation";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: "campaign";
      discriminator: [50, 40, 49, 11, 157, 220, 229, 192];
    },
    {
      name: "donation";
      discriminator: [189, 210, 54, 77, 216, 85, 7, 68];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "campaignNotStarted";
      msg: "The campaign is not started yet.";
    },
    {
      code: 6001;
      name: "campaignHasEnded";
      msg: "The campaign has ended.";
    },
    {
      code: 6002;
      name: "campaignStillActive";
      msg: "The campaign is still active.";
    },
    {
      code: 6003;
      name: "integerOverflow";
      msg: "Integer overflow occurred.";
    },
    {
      code: 6004;
      name: "targetNotMet";
      msg: "Target amount not met.";
    },
    {
      code: 6005;
      name: "campaignMetTarget";
      msg: "Campaign has met target amount.";
    },
    {
      code: 6006;
      name: "campaignClaimed";
      msg: "Campaign has already been claimed.";
    },
    {
      code: 6007;
      name: "campaignRefunded";
      msg: "Campaign has already been refunded.";
    },
    {
      code: 6008;
      name: "insufficientFundsForTransfer";
      msg: "Insufficient funds for transfer.";
    },
    {
      code: 6009;
      name: "overflowError";
      msg: "Overflow error occurred.";
    },
  ];
  types: [
    {
      name: "campaign";
      type: {
        kind: "struct";
        fields: [
          {
            name: "creator";
            type: "pubkey";
          },
          {
            name: "amountPledged";
            type: "u64";
          },
          {
            name: "targetAmount";
            type: "u64";
          },
          {
            name: "startTime";
            type: "i64";
          },
          {
            name: "endTime";
            type: "i64";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "description";
            type: "string";
          },
          {
            name: "status";
            type: {
              defined: {
                name: "campaignStatus";
              };
            };
          },
        ];
      };
    },
    {
      name: "campaignStatus";
      type: {
        kind: "enum";
        variants: [
          {
            name: "active";
          },
          {
            name: "successful";
          },
          {
            name: "failed";
          },
          {
            name: "claimed";
          },
        ];
      };
    },
    {
      name: "donation";
      type: {
        kind: "struct";
        fields: [
          {
            name: "donator";
            type: "pubkey";
          },
          {
            name: "campaign";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "status";
            type: {
              defined: {
                name: "donationStatus";
              };
            };
          },
        ];
      };
    },
    {
      name: "donationStatus";
      type: {
        kind: "enum";
        variants: [
          {
            name: "active";
          },
          {
            name: "claimed";
          },
          {
            name: "refunded";
          },
        ];
      };
    },
  ];
};
