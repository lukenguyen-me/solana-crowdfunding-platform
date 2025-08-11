# Solana Crowdfunding Platform

A decentralized crowdfunding platform built on Solana using the Anchor framework. This platform allows users to create campaigns, donate to existing campaigns, and claim funds when campaigns reach their targets.

## Features

- **Create Campaigns**: Users can create crowdfunding campaigns with a name, description, and target amount
- **Donate**: Support campaigns by donating SOL
- **Claim Funds**: Campaign creators can claim funds when targets are met
- **Time-based Campaigns**: Campaigns have configurable durations (1 week in production, 2 seconds in tests)

## Prerequisites

Before running this project, make sure you have the following installed:

- [Rust](https://rustup.rs/) (latest stable version)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.14+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.31+)
- [Node.js](https://nodejs.org/) (v16+)
- [Yarn](https://yarnpkg.com/getting-started/install)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd solana-crowdfunding-platform
```

2. Install dependencies:

```bash
yarn install
```

3. Build the program:

```bash
anchor build
```

4. Start a local Solana validator (in a separate terminal):

```bash
solana-test-validator
```

5. Deploy the program to localnet:

```bash
anchor deploy
```

## Testing

To run the test suite, use the following command:

```bash
anchor test -- --features test
```

**Important**: The `-- --features test` flag is required to enable test-specific configurations (like shorter campaign durations for faster testing).

### Test Files

The project includes comprehensive tests for all major functionality:

- `tests/create_campaign.test.ts` - Tests for campaign creation
- `tests/donate.test.ts` - Tests for donation functionality
- `tests/claim.test.ts` - Tests for fund claiming

### Test Configuration

Tests use a special feature flag that sets campaign duration to 2 seconds instead of the production duration of 1 week, allowing for faster test execution.

## Project Structure

```
├── programs/
│   └── crowdfunding/
│       └── src/
│           └── lib.rs          # Main program logic
├── tests/                      # TypeScript test files
├── app/                        # Frontend application (if applicable)
├── Anchor.toml                 # Anchor configuration
├── package.json                # Node.js dependencies
└── Cargo.toml                  # Rust dependencies
```

## Program Instructions

The crowdfunding program supports the following instructions:

1. **create_campaign** - Create a new crowdfunding campaign
2. **donate** - Donate SOL to an existing campaign
3. **claim** - Claim funds from a successful campaign

## Development

### Code Formatting

Format your code using Prettier:

```bash
yarn lint:fix
```

Check code formatting:

```bash
yarn lint
```

### Local Development

1. Ensure your Solana CLI is configured for localnet:

```bash
solana config set --url localhost
```

2. Make sure you have a local keypair:

```bash
solana-keygen new
```

3. Airdrop SOL for testing:

```bash
solana airdrop 2
```

## Configuration

The project uses the following configuration in `Anchor.toml`:

- **Cluster**: localnet
- **Wallet**: `~/.config/solana/id.json`
- **Package Manager**: yarn
- **Program ID**: `5PXksXtCsHyAaJs8v5WqcoHnWs9wF9maJt4DPK7qqqvX`

## License

ISC
