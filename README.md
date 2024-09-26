# Rootstock DAO

## Installation

- Rename `template.env` to `.env` and paste the mnemonic phrase from your Rootstock account.
- Ensure your Node.js version is `>= v20.15.0`.

```shell
yarn
```

## stRIF

The stRIF contract allows users to stake RIF tokens to gain voting power in the RIF DAO.

## RIF Token

This contract has been brought to the project is the RIF Token contract [RIFLabs RIF-Token](https://github.com/riflabs/RIF-Token)

A few simple tests have been created to make sure that the token works.

Refer to `test/RIFToken.test.ts`

What is tested:

- That the contract has the initial balance defined in the RIFToken.sol
- That the function `.validAddress(address)` works
- That the `transferAll()` function works by using `.setAuthorizedManagerContract`
- That we can transfer token between accounts
- That it emits a Transfer event

## Note

We will be using RIF-Token from the repository [RIFLabs RIF-Token](https://github.com/riflabs/RIF-Token)

The repository does not contain a package.json, causing hardhat to error when running `yarn compile`

We decided (in the meantime) to fork the repository and add it there [Forked Repository](https://github.com/Freshenext/RIF-Token)

**In the future we must add a package.json to the main repository, and remove the forked repository.**

## Slither - Solidity static analyzer

Run this command to test smart contracts, excluding OpenZeppelin and RIF:

```shell
slither . --filter-paths openzeppelin,rif-token-contracts,exploit
```

## Deploying contracts with Ignition

Before deploying the smart contracts, set all the parameters in the `params/testnet.json`, `params/mainnet.json` or `params/dev.json` files, depending on the network and environment you’re going to deploy to.

- Deploy Governor, Timelock, StRIF and their proxies to the Rootstock Testnet:

- to the dev

  ```shell
  npx hardhat ignition deploy ignition/modules/GovernorModule.ts --parameters params/dev.json --network rootstockTestnet
  ```

- to the testnet

  ```shell
  npx hardhat ignition deploy ignition/modules/GovernorModule.ts --parameters params/testnet.json --network rootstockTestnet
  ```

  where the --parameters parameter specifies the location of the parameters file with the RIF token address.

- to the mainnet

  ```shell
  npx hardhat ignition deploy ignition/modules/GovernorModule.ts --parameters params/mainnet.json --network rootstockMainnet
  ```

### Deploy Early Adopters NFT

See the NFT images/metadata creation details [here](./nft/README.md)

1. Create an IPFS directory on Pinata and place the JSON files with NFT metadata there. It's important that the file names start from 1 and are sequential without any gaps.

2. Edit the `EarlyAdoptersProxy` property in the `params/testnet.json` / `params/mainnet.json` file to provide the following parameters:

   - Default Admin address
   - Upgrader address
   - IPFS ID of the directory containing the prepared JSON metadata files for the NFTs
   - The amount of files in the directory

   Then run the command:

   - for the dev

   ```shell
   npx hardhat ignition deploy ignition/modules/EarlyAdoptersModule.ts --parameters params/dev.json --network rootstockTestnet
   ```

   - for the testnet

     ```shell
     npx hardhat ignition deploy ignition/modules/EarlyAdoptersModule.ts --parameters params/testnet.json --network rootstockTestnet
     ```

   - for the mainnet

     ```shell
     npx hardhat ignition deploy ignition/modules/EarlyAdoptersModule.ts --parameters params/mainnet.json --network rootstockMainnet
     ```

3. To upload additional JSON files with metadata for new NFT tokens, you need to:

   - Create a new directory on IPFS (Pinata), adding both the old and new files.
   - Copy the CID of the created directory.
   - Run the Hardhat task to update the IPFS folder CID in the smart contract

   ```shell
   npx hardhat update-ipfs-folder
       --nft <EA NFT Address>
       --cid <New folder CID>
       --files <amount of files in folder>
       --network rootstockTestnet
   ```

   for example:

   ```shell
   npx hardhat update-ipfs-folder \
   --nft 0xa3Dcdac1883f29aA9FafbdeDDCA0c745B2F05b53 \
   --cid QmU1Bu9v1k9ecQ89cDE4uHrRkMKHE8NQ3mxhqFqNJfsKPd \
   --files 50 \
   --network rootstockTestnet
   ```

## Upgrading Governor contracts with Ignition

1. Locate the file named: `deployedGovernorProxy.json` inside `ignition` folder.

2. Change the value of `governorProxyAddress` field with the actual Governor Proxy address

3. Run the command bellow

```shell
npx hardhat ignition deploy ignition/modules/GovernorUpgradeModule.ts --parameters params/testnet.json --network rootstockTestnet
```

## Canceling a Governor Proposal with Hardhat task

To cancel a proposal using the provided Hardhat task, follow the steps below:

1. Download the repo
2. Install the project: see [Installation](#installation)
3. Compile the smart contracts

   ```shell
    npx hardhat compile
   ```

4. Prepare the `cancel-proposal.json` File (Optional):

   If you prefer to use a JSON file for the parameters, create a file named `cancel-proposal.json` in the root directory of your project. The file should contain the following fields:

   ```json
   {
     "governorAddress": "<Governor Contract Address>",
     "proposalId": "<Proposal ID>"
   }
   ```

   - Replace `<Governor Contract Address>` with the actual address of the deployed Governor contract.
   - Replace `<Proposal ID>` with the ID of the proposal you want to cancel.

5. Run the Hardhat Task to Cancel the Proposal:

   ```shell
   npx hardhat cancel-proposal --governor <Governor Contract Address> --id <Proposal ID> --network rootstockTestnet
   ```

   - Replace `<Governor Contract Address>` with the address of the deployed Governor contract.
   - Replace `<Proposal ID>` with the ID of the proposal you wish to cancel.

   Alternatively, if you have provided the parameters in the cancelProposal.json file, simply run:

   ```shell
   npx hardhat cancel-proposal --network rootstockTestnet
   ```

6. Check for Success:

   After running the command, the script will verify your permissions and the state of the proposal. If you are authorized and the proposal is in a cancelable state, the proposal will be canceled, and you will see a confirmation message in the terminal.

   Example output:

   ```shell
   You have successfully cancelled proposal №12345... Now the proposal is in the "Canceled" state.
   ```

7. Troubleshooting:

   - Ensure that the Governor Contract Address and Proposal ID are correct and match the proposal you intend to cancel
   - Verify that you are the designated Guardian for the Governor contract, as only the Guardian can cancel proposals
   - If the proposal is not in a cancelable state (e.g., it has already been executed or defeated), the script will not proceed with the cancellation

## Verifying smart contract

In order to verify contracts after deployment run Hardhat Ignition task:

```shell
npx hardhat ignition verify <Deployment ID>
```

Example output:

```shell
Verifying contract "contracts/EarlyAdopters.sol:EarlyAdopters" for network rootstockMainnet...
Successfully verified contract "contracts/EarlyAdopters.sol:EarlyAdopters" for network rootstockMainnet:
- https://rootstock.blockscout.com//address/0x...#code
```

## Deployed Rootstock Collective contracts

### Rootstock Testnet

| Contract Name                                  | Mainnet Address                            |
| ---------------------------------------------- | ------------------------------------------ |
| GovernorRootstockCollective impl               | 0x2109FF4a9D5548a21F877cA937Ac5847Fde49694 |
| GovernorRootstockCollective proxy              | 0x91a8E4A070B4BA4bf2e2a51Cb42BdeDf8FFB9b5a |
| StRIFToken impl                                | 0x4861198e9A6814EBfb152552D1b1a37426C54D23 |
| StRIFToken proxy                               | 0xFff256c3451D5cF59653Cfe71950AE9ba2F5f0Ef |
| DaoTimelockUpgradableRootstockCollective impl  | 0x2AEdf0B35651934cF3BEC855cbCE207bBA0C4aB5 |
| DaoTimelockUpgradableRootstockCollective proxy | 0x5eDA6fA73350291F7D7cFC7ad93F48189f1333ef |
| TreasuryRootstockCollective                    | 0x47C969d7ae7A377BeaD553c2899D9B83A90e0772 |
| Early Adopters NFT                             | 0x0Ee4e11f2F2B551cA31Ea7873c7bA675cb51A59d |

### Rootstock Mainnet

| Contract Name                                  | Mainnet Address                            |
| ---------------------------------------------- | ------------------------------------------ |
| GovernorRootstockCollective impl               | 0x086CE91eBAF4002544121295491A1DC80F3ef7a5 |
| GovernorRootstockCollective proxy              | 0x71ac6fF904A17F50f2C07B693376cCc1c92627F0 |
| StRIFToken impl                                | 0xcC13a0320f18eB7C370a339b94084012337f3a60 |
| StRIFToken proxy                               | 0x5Db91E24BD32059584bbdB831a901F1199f3D459 |
| DaoTimelockUpgradableRootstockCollective impl  | 0x9bD89cC339aE4bC1e8F41C648f42854EbFcFCd98 |
| DaoTimelockUpgradableRootstockCollective proxy | 0x432f5EF20118CbB1111a06bB4491C6D759643B83 |
| TreasuryRootstockCollective                    | 0xf016fA6B237bb56E3AeE7022C6947A6a103E3c47 |
| EarlyAdoptersRootstockCollective impl          | 0x979deF73ec80B8AE24Ae46765b81D9aF7b1C9327 |
| EarlyAdoptersRootstockCollective proxy         | 0x339F209B3eb8381c4fBE997232e95a21A731524c |

### Rootstock Dev

| Contract Name                                  | Dev Address                                |
| ---------------------------------------------- | ------------------------------------------ |
| GovernorRootstockCollective impl               | 0x0DB02C99619bB0E6d2cBeF5545Cc968DAb724E10 |
| GovernorRootstockCollective proxy              | 0xdE4822aBf85dCeec6a3A68B1F692b26ec37694BA |
| StRIFToken impl                                | 0x7C19923bac1b41e9bBD1c33815A61854beeD9b54 |
| StRIFToken proxy                               | 0x956864F3Bb7B86cbCbC3a320277b0d0f5f24F998 |
| DaoTimelockUpgradableRootstockCollective impl  | 0x014Ee7696B193E8BC9EFA5a68cfDb74C76415043 |
| DaoTimelockUpgradableRootstockCollective proxy | 0x7D78e76b9Cc66D977aaf699679A44A721a98022E |
| TreasuryRootstockCollective                    | 0xD2F300D6AecC7db7FDb98d15568ffeFb13BAd7c8 |
| EarlyAdoptersRootstockCollective impl          | 0xa060A65967cb9b9511E3A4ec091Aa81c6dCe6662 |
| EarlyAdoptersRootstockCollective proxy         | 0xe4E91A8EeCdF48Ef13f8E98Dfd2f0b7147e89816 |
