import { ethers } from 'hardhat';
import { RIFToken } from '../typechain-types';

export const deployRif = async (): Promise<RIFToken> => {
  // Deploy AddressHelper library
  const addressHelper = await ethers.deployContract('AddressHelper');
  // Deploy AddressLinker library
  const addressLinker = await ethers.deployContract('AddressLinker', {
    libraries: { AddressHelper: addressHelper },
  });

  // Link libraries
  const rifToken = await ethers.deployContract('RIFToken', {
    libraries: {
      AddressLinker: addressLinker,
      AddressHelper: addressHelper,
    },
  });

  return rifToken;
};
