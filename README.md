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
slither . --filter-paths openzeppelin,rif-token-contracts
```

## Deploying contracts with Ignition

- Deploy all the DAO contracts to the Rootstock Testnet:

```shell
npx hardhat ignition deploy ignition/modules/GovernorModule.ts --parameters ignition/deployedRif.json --network rootstockTestnet
```

where the --parameters parameter specifies the location of the parameters file with the RIF token address.

- Deploy Early Adopters NFT to Rootstock Testnet

```shell
npx hardhat ignition deploy ignition/modules/EarlyAdoptersModule.ts --network rootstockTestnet
```

## Uploading CIDs to Early Adopters NFT

Place token metadata IPFS CIDs in the file `tasks/cids.json` and run the command:

```shell
npx hardhat load-cids --network rootstockTestnet --nft 0xf24761C1B57b14EeA270B1485294D93494164246
```

where the `--nft` parameter is the address of the deployed Early Adopters NFT smart contract.

## Deployed contracts (on Rootstock Testnet)

Timelock - 0x67D299406cCc0eB02Fa6dc9e6d2f93d7fE5Ef19c
stRif- 0xd6Eb12591559C42e28d672197265b331B1ad867d
Governor- 0xEc6bd0C8117b74904849af2CED73f30090DB6cd1
Early Adopters NFT - 0xf24761C1B57b14EeA270B1485294D93494164246
