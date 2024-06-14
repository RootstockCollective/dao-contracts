import { ethers } from 'hardhat';
import { deployDao } from './deploy-dao';

const deploy = async () => {
  const rifToken = await ethers.deployContract('RIFToken');
  const rifAddress = await rifToken.getAddress();
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const veRIFToken = await deployDao(rifAddress, deployerAddress);

  console.log(`RIFToken deployed at: ${rifAddress}`);
  console.log(`VeRIFToken deployed at: ${await veRIFToken.getAddress()}`);
};

deploy().catch(err => {
  console.log('deployment error: ', err);
  process.exit(1);
});
