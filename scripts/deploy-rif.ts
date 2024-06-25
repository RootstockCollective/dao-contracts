import hre, { ethers } from 'hardhat'

export const deployRif = async () => {
  const rifToken = await ethers.deployContract('RIFToken')
  const rifAddress = await rifToken.getAddress()

  console.log(`Deployed RIF Token on ${hre.network.name} with address ${rifAddress}`)

  return { rifToken, rifAddress }
}
