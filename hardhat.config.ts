import type { HardhatUserConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'
import dotent from 'dotenv'
import './tasks/updateIpfsFolder'
import './tasks/cancelProposal'
import './tasks/withdrawTreasury'
import './tasks/airdrop'

dotent.config()

const derivationPath = "m/44'/60'/0'/0"
const accounts = {
  mnemonic: process.env.MNEMONIC ?? '',
  path: derivationPath,
} as const satisfies Partial<HttpNetworkHDAccountsConfig>

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
    enabled: false,
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
      ...(typeof process.env.MAINNET_DEPLOYER_MNEMONIC !== 'undefined'
        ? {
            accounts: {
              mnemonic: process.env.MAINNET_DEPLOYER_MNEMONIC,
              path: derivationPath,
            },
          }
        : {
            accounts,
          }),
    },
  },
  etherscan: {
    apiKey: {
      // Is not required by blockscout. Can be any non-empty string
      rootstockTestnet: 'RSK_TESTNET_RPC_URL',
      rootstockMainnet: 'RSK_MAINNET_RPC_URL',
    },
    customChains: [
      {
        network: 'rootstockTestnet',
        chainId: 31,
        urls: {
          apiURL: 'https://rootstock-testnet.blockscout.com/api/',
          browserURL: 'https://rootstock-testnet.blockscout.com/',
        },
      },
      {
        network: 'rootstockMainnet',
        chainId: 30,
        urls: {
          apiURL: 'https://rootstock.blockscout.com/api/',
          browserURL: 'https://rootstock.blockscout.com/',
        },
      },
    ],
  },
}

export default config
