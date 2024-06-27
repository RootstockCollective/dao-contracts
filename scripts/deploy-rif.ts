import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import hre, { ethers } from 'hardhat'

export const deployRif = async (deployer: SignerWithAddress) => {
  const rifToken = await ethers.deployContract('RIFToken')
  await rifToken.waitForDeployment()

  const rifAddress = await rifToken.getAddress()

  console.log(`Deployed RIF Token on ${hre.network.name} with address ${rifAddress}`)

  // `setAuthorizedManagerContract` transfers all tokens to Deployer
  const tx1 = await rifToken.setAuthorizedManagerContract(deployer.address)
  await tx1.wait()
  console.log(`All RIF tokens transferred to ${deployer.address}`)

  // close distribution
  const block = await ethers.provider.getBlock('latest')
  const now = Math.round(Date.now() / 1000)
  const tx2 = await rifToken.closeTokenDistribution(block?.timestamp ?? now)
  await tx2.wait()
  console.log(`RIF distribution closed`)

  const tokenFaucet = await (await ethers.deployContract('TokenFaucet', [rifToken])).waitForDeployment()

  // transfer half of RIFs to the faucet
  const rifSupply = 10n ** 27n

  const tx3 = await rifToken.transfer(await tokenFaucet.getAddress(), rifSupply / 2n)
  await tx3.wait()
  console.log(`RIF tokens transferred to the Faucet`)

  console.log(`Deployed Token Faucet on ${hre.network.name} with address ${await tokenFaucet.getAddress()}`)

  return { rifToken, rifAddress, tokenFaucet }
}
