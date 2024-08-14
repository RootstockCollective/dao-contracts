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

## Deployed contracts (on Rootstock Testnet)

Timelock - 0x67D299406cCc0eB02Fa6dc9e6d2f93d7fE5Ef19c
stRif- 0xd6Eb12591559C42e28d672197265b331B1ad867d
Governor- 0xEc6bd0C8117b74904849af2CED73f30090DB6cd1
Early Adopters NFT - 0x687E04Bb759B3A010eb797301E5D1D05e135E90f
