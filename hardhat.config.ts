import type { HardhatUserConfig } from 'hardhat/config'
import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import hardhatVerify from '@nomicfoundation/hardhat-verify'
import { configVariable } from 'hardhat/config'
import { type HttpNetworkAccountsUserConfig } from 'hardhat/types/config'
import dotenv from 'dotenv'
import './tasks/airdrop'
import './tasks/cancelProposal'
import './tasks/stRifUpgradeV1-v2'
import './tasks/updateIpfsFolder'
import './tasks/withdrawTreasury'

dotenv.config()
const derivationPath = "m/44'/60'/0'/0"
const accounts = {
  mnemonic: process.env.MNEMONIC ?? '',
  path: derivationPath,
} satisfies HttpNetworkAccountsUserConfig

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin, hardhatVerify],
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 1 },
        },
      },
      { version: '0.4.24' },
    ],
  },
  networks: {
    hardhat: {
      type: 'edr-simulated',
      accounts: {
        count: 50,
      },
    },
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
      accounts: {
        count: 50,
      },
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
      accounts: {
        count: 50,
      },
    },
    sepolia: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('SEPOLIA_RPC_URL'),
      accounts: [configVariable('SEPOLIA_PRIVATE_KEY')],
    },
    rootstockTestnet: {
      chainId: 31,
      type: 'http',
      url: 'https://public-node.testnet.rsk.co/',
      accounts,
    },
    rootstockMainnet: {
      chainId: 30,
      type: 'http',
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
  verify: {
    etherscan: {
      enabled: false,
    },
    blockscout: {
      enabled: true,
    },
  },
  chainDescriptors: {
    31: {
      name: 'rootstockTestnet',
      blockExplorers: {
        blockscout: {
          name: 'Rootstock Testnet Blockscout',
          url: 'https://rootstock-testnet.blockscout.com',
          apiUrl: 'https://rootstock-testnet.blockscout.com/api',
        },
      },
    },
    30: {
      name: 'rootstockMainnet',
      blockExplorers: {
        blockscout: {
          name: 'Rootstock Blockscout',
          url: 'https://rootstock.blockscout.com',
          apiUrl: 'https://rootstock.blockscout.com/api',
        },
      },
    },
  },
}

export default config
