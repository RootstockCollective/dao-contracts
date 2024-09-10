import type { HardhatUserConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'
import dotent from 'dotenv'
import './tasks/updateIpfsFolder'
import './tasks/cancelProposal'
import './tasks/withdrawTreasury'

dotent.config()

const accounts: Partial<HttpNetworkHDAccountsConfig> = {
  mnemonic: process.env.MNEMONIC ?? '',
  path: "m/44'/60'/0'/0",
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 1 },
        },
      },
      { version: '0.4.24' },
    ],
  },
  gasReporter: {
    enabled: true,
    reportPureAndViewMethods: true,
    showUncalledMethods: false,
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
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
