import { ethers, upgrades } from 'hardhat';

export const deployVeRif = async (rifTokenAddress: string, deployerAddress: string) => {
  const VeRIFTokenFactory = await ethers.getContractFactory('VeRIFToken');
  const veRIFToken = await upgrades.deployProxy(VeRIFTokenFactory, [rifTokenAddress, deployerAddress], {
    initializer: 'initialize',
    kind: 'uups',
    timeout: 0, // wait indefinitely
    unsafeAllow: ['internal-function-storage'],
  });

  return await veRIFToken.waitForDeployment();
};
