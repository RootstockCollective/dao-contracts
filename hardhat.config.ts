import type { HardhatUserConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'
import dotent from 'dotenv'

dotent.config()

const accounts = {
  mnemonic: process.env.MNEMONIC,
  // path: "m/44'/60'/0'/0",
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
      { version: '0.4.24' },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      accounts,
    },
    localhost: {
      accounts,
    },
    rootstockTestnet: {
      chainId: 31,
      url: 'https://public-node.testnet.rsk.co/',
      accounts,
    },
    rootstockMainnet: {
      chainId: 30,
      url: 'https://public-node.rsk.co/',
      accounts,
    },
  },
}

export default config
