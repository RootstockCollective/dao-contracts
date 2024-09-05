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

- Deploy all the DAO contracts to the Rootstock Testnet:

```shell
npx hardhat ignition deploy ignition/modules/GovernorModule.ts --parameters ignition/deployedRif.json --network rootstockTestnet
```

where the --parameters parameter specifies the location of the parameters file with the RIF token address.

### Deploy Early Adopters NFT to Rootstock Testnet

See the NFT images/metadata creation details [here](./nft/README.md)

1. Create an IPFS directory on Pinata and place the JSON files with NFT metadata there. It's important that the file names start from 1 and are sequential without any gaps.

2. Edit the `ignition/eaNft.json` file to provide the following parameters:

   - Default Admin address
   - Upgrader address
   - IPFS ID of the directory containing the prepared JSON metadata files for the NFTs
   - The amount of files in the directory

   Then run the command:

   ```shell
   npx hardhat ignition deploy ignition/modules/EarlyAdoptersModule.ts --parameters ignition/eaNft.json --network rootstockTestnet
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
   npx hardhat update-ipfs-folder --nft 0xa3Dcdac1883f29aA9FafbdeDDCA0c745B2F05b53 --cid QmU1Bu9v1k9ecQ89cDE4uHrRkMKHE8NQ3mxhqFqNJfsKPd --files 50 --network rootstockTestnet
   ```

## Upgrading Governor contracts with Ignition

1. Locate the file named: `deployedGovernorProxy.json` inside `ignition` folder.

2. Change the value of `governorProxyAddress` field with the actual Governor Proxy address

3. Run the command bellow

```shell
npx hardhat ignition deploy ignition/modules/GovernorUpgradeModule.ts --parameters ignition/deployedGovernorProxy.json --network rootstockTestnet
```

## Canceling a Governor Proposal with Hardhat task

To cancel a proposal using the provided Hardhat task, follow the steps below:

1. Prepare the `cancel-proposal.json` File (Optional):

   If you prefer to use a JSON file for the parameters, create a file named `cancel-proposal.json` in the root directory of your project. The file should contain the following fields:

    ```json
    {
      "governorAddress": "<Governor Contract Address>",
      "proposalId": "<Proposal ID>"
    }
    ```

    - Replace <Governor Contract Address> with the actual address of the deployed Governor contract.
    - Replace <Proposal ID> with the ID of the proposal you want to cancel.

2. Run the Hardhat Task to Cancel the Proposal:

    ```shell
    npx hardhat cancel-proposal --governor <Governor Contract Address> --id <Proposal ID> --network rootstockTestnet
    ```

    - Replace <Governor Contract Address> with the address of the deployed Governor contract.
    - Replace <Proposal ID> with the ID of the proposal you wish to cancel.

    Alternatively, if you have provided the parameters in the cancelProposal.json file, simply run:

    ```shell
    npx hardhat cancel-proposal --network rootstockTestnet
    ```

3. Check for Success:

    After running the command, the script will verify your permissions and the state of the proposal. If you are authorized and the proposal is in a cancelable state, the proposal will be canceled, and you will see a confirmation message in the terminal.

    Example output:

    ```shell
    You have successfully cancelled proposal №12345... Now the proposal is in the "Canceled" state.
    ```

4. Troubleshooting:

   - Ensure that the Governor Contract Address and Proposal ID are correct and match the proposal you intend to cancel
   - Verify that you are the designated Guardian for the Governor contract, as only the Guardian can cancel proposals
   - If the proposal is not in a cancelable state (e.g., it has already been executed or defeated), the script will not proceed with the cancellation

## Deployed contracts (on Rootstock Testnet)

| Contract              | Address                                      |
|-----------------------|----------------------------------------------|
| Timelock              | 0x2c4B5481C935Eb96AD9c8693DAf77131Dce607d9   |
| stRif                 | 0xC4b091d97AD25ceA5922f09fe80711B7ACBbb16f   |
| Governor              | 0xB1A39B8f57A55d1429324EEb1564122806eb297F   |
| Early Adopters NFT    | 0x861b279757D0e23b8B3A96cB589CF835cb7df721   |
