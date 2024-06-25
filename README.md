# NFT Sleep Minting Agent

## Description

A Forta Bot to detect transactions that may indicate NFT Sleep Minting.

Sleep Minting is when an attacker mints an NFT directly to a famous creator's wallet with permissions to reclaim or pull the NFT back out of the creator's wallet. This creates the appearance that (1) a famous creator minted an NFT to themselves, and (2) the creator sent that NFT to an attacker. Based on “on-chain” provenance, the attacker can claim they own an NFT created by a famous artist and sell it for a high value.

You can read more about what this is and why it matters [here](https://a16z.com/2022/03/09/sleep-minting-nfts/)

Documentation for how to build your own Forta Agent can be found [here](https://docs.forta.network/en/latest/)

## Supported Chains

- Ethereum
- Optimism
- BNB Smart Chain
- Polygon
- Fantom
- Arbitrum
- Avalanche

## Alerts

- SLEEPMINT-1

  - Fired when an NFT is transferred by an address that is not the owner of the NFT according to an NFT Transfer event.
    - i.e., the transaction sender != the `from` argument in an emitted Transfer() event
  - Severity is always set to "info"
    - This type of transfer may be OK. There are cases where an address is approved to transfer an NFT on another person's behalf.
  - Type is always set to "suspicious"
  - Metadata includes:
    - `anomalyScore`: Score of how anomalous the alert is (0-1)
      - Score calculated by finding amount of `SLEEPMINT-1` alerts out of the total number of NFT transfers processed by the bot.
  - Labels:
    - Label 1:
      - `entity`: The transaction's hash
      - `entityType`: The type of the entity, always set to "Transaction"
      - `label`: The type of the label, always set to "Transfer"
      - `confidence`: The confidence level of the transaction being a Transfer (0-1). Always set to `1`
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.
    - Label 2:
      - `entity`: The initiator EOA's address
      - `entityType`: The type of the entity, always set to "Address"
      - `label`: The type of the label, always set to "Attacker"
      - `confidence`: The confidence level of the initiator being an attacker (0-1). Always set to `0.6`.
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.

- SLEEPMINT-2

  - Fired when there is an NFT approval where the address that sent the approval transaction is different from the current NFT owner. This would be malicious if someone mints an NFT to a famous artist but maintains the permissions to pull that NFT back out of the famous artist's wallet.
  - Severity is always set to "medium."
  - Type is always set to "suspicious."
  - Metadata includes:
    - `anomalyScore`: Score of how anomalous the alert is (0-1)
      - Score calculated by finding amount of `SLEEPMINT-2` alerts out of the total number of NFT approvals processed by the bot.
  - Labels:
    - Label 1:
      - `entity`: The transaction's hash
      - `entityType`: The type of the entity, always set to "Transaction"
      - `label`: The type of the label, always set to "Approval"
      - `confidence`: The confidence level of the transaction being a Approval (0-1). Always set to `1`
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.
    - Label 2:
      - `entity`: The initiator EOA's address
      - `entityType`: The type of the entity, always set to "Address"
      - `label`: The type of the label, always set to "Attacker"
      - `confidence`: The confidence level of the initiator being an attacker (0-1). Always set to `0.7`.
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.

- SLEEPMINT-3

  - Fired when an NFT is transferred by an address that is not the owner of the NFT according to an NFT Transfer event (i.e., the transaction sender != the `from` argument in an emitted Transfer() event), when the sender was the address that had previously minted the NFT to the owner.
  - Severity is always set to "high"
  - Type is always set to "suspicious"
  - Metadata includes:
    - `anomalyScore`: Score of how anomalous the alert is (0-1)
      - Score calculated by finding amount of `SLEEPMINT-3` alerts out of the total number of NFT transfers processed by the bot.
  - Labels:
    - Label 1:
      - `entity`: The transaction's hash
      - `entityType`: The type of the entity, always set to "Transaction"
      - `label`: The type of the label, always set to "Transfer"
      - `confidence`: The confidence level of the transaction being a Transfer (0-1). Always set to `1`
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.
    - Label 2:
      - `entity`: The initiator EOA's address
      - `entityType`: The type of the entity, always set to "Address"
      - `label`: The type of the label, always set to "Attacker"
      - `confidence`: The confidence level of the initiator being an attacker (0-1). Always set to `0.8`.
      - `remove`: Boolean indicating whether the label is removed. Always set to `false`.

## Test Data

Create a file named `forta.config.json` in the root of the project directory that contains your own RPC endpoint from [Alchemy](https://www.alchemy.com/). See the example below. Note, use an appropriate endpoint for the chain you are looking to test. For example, use a Rinkeby endpoint to test a Rinkeby transaction hash or a Mainnet endpoint to test a Mainnet transaction hash.

```
{
    "jsonRpcUrl": YOUR_RPC_ENDPOINT_HERE
}
```

The agent behavior can be verified with the following transactions:

- SLEEPMINT-1 (Mainnet): 0x57f23fde8e4221174cfb1baf68a87858167fec228d9b32952532e40c367ef04e
- SLEEPMINT-1 (Rinkeby): 0x3fdd4435c13672803490eb424ca93094b461ae754bd152714d5b5f58381ccd4b
- SLEEPMINT-2 (Rinkeby): 0x53aa1bd7fa298fa1b96eeed2a4664db8934e27cd28ac0001a5bf5fa3b30c6360

## Real Example Sleep Mint

Here is the smart contract that sleep minted Beeple's "First 5000 Days" NFT: https://etherscan.io/address/0x5fbbacf00ef20193a301a5ba20acf04765fb6dac

## Running Locally

To run this bot locally, follow these steps:

1. **Clone the repository and navigate to the project directory:**

   ```bash
   git clone git@github.com:zenchain-protocol/forta-nethermind-bots.git
   cd forta-nethermind-bots/native-ice-phishing
   ```

2. **Ensure you have Node Version Manager (NVM) installed and use the correct Node.js version:**

   ```bash
   nvm use
   ```

3. **Run tests:**

   Execute the tests locally using `npm`:

   ```bash
   npm tests
   ```

4. **Build and start the Docker containers:**

   Build the Docker images with `docker-compose`.

   ```bash
   docker-compose build --build-arg INSTALL_DEV=true --build-arg NODE_ENV=development
   ```

   Start the bot in detached mode:

   ```bash
   docker-compose up -d nft-sleep-minting-agent
   ```



5. **Monitor logs and container status:**

   To see logs from the bot, use:

   ```bash
   docker-compose logs -f nft-sleep-minting-agent
   ```

   Check the status of the containers:

   ```bash
   docker-compose ps
   ```