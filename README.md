# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```

## veRIF

The veRIF contract is a contract that allows users to stake RIF tokens in order to get voting power in the RIF DAO.

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
