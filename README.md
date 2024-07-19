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

Refer to ```test/RIFToken.test.ts```

What is tested:

- That the contract has the initial balance defined in the RIFToken.sol
- That the function ```.validAddress(address)``` works
- That the ```transferAll()``` function works by using ```.setAuthorizedManagerContract```
- That we can transfer token between accounts
- That it emits a Transfer event

## Note

We will be using RIF-Token from the repository [RIFLabs RIF-Token](https://github.com/riflabs/RIF-Token)

The repository does not contain a package.json, causing hardhat to error when running ```yarn compile```

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

Timelock - 0x30976FE9a78D78bFe9e8da223543DF27baA52572
stRif - 0xAF17f7A0124E9F360ffA484b13566b041C0f5023
Governor - 0x00ca74491D9493bFe5451246C8c72849Ba4A7F9D
Early Adopters NFT - 0xf24761C1B57b14EeA270B1485294D93494164246
