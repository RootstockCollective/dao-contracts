import hre, { ethers } from 'hardhat'

export const deployRif = async () => {
  const rifToken = await ethers.deployContract('RIFToken')
  const rifAddress = await rifToken.getAddress()

  console.log(`Deployed RIF Token on ${hre.network.name} with address ${rifAddress}`)

  const tokenFaucet = await ethers.deployContract('TokenFaucet', [rifToken])

  console.log(`Deployed Token Faucet on ${hre.network.name} with address ${await tokenFaucet.getAddress()}`)

  return { rifToken, rifAddress, tokenFaucet }
}
