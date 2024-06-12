import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: '0.8.24' }, 
      { version: '0.4.24' }
    ]
  },
};

export default config;
