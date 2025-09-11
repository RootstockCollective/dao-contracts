import type { HardhatUserConfig } from 'hardhat/config'

import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import { configVariable } from 'hardhat/config'

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: {
          optimizer: { enabled: true, runs: 1 },
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
    /* profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    }, */
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
  },
}

export default config
