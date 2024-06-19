import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import "@nomicfoundation/hardhat-viem" 

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: '0.8.24' }, { version: '0.4.24' }],
  },
}

export default config
