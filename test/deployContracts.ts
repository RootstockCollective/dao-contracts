/* import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { deployStRIF } from '../scripts/deploy-stRIF'

export const deployContracts = async (admin: SignerWithAddress) => {
  const rif = await (await ethers.deployContract('RIFToken', { signer: admin })).waitForDeployment()
  const rifAddress = await rif.getAddress()
  await (await rif.setAuthorizedManagerContract(admin.address)).wait()
  const latestBlock = await ethers.provider.getBlock('latest')
  if (!latestBlock) throw new Error('Latest block not found')
  await (await rif.closeTokenDistribution(latestBlock.timestamp)).wait()
  const stRif = await deployStRIF(rifAddress, admin.address)
  const stRifAddress = await stRif.getAddress()
  return { rif, rifAddress, stRif, stRifAddress }
}
 */
import { ignition, ethers } from 'hardhat'
import stRifModule from '../ignition/modules/StRifModule'
import { RIFToken, StRIFToken } from '../typechain-types'

export const deployContracts = async () => {
  const [deployer] = await ethers.getSigners()
  const contracts = await ignition.deploy(stRifModule)
  const rif = contracts.rif as unknown as RIFToken
  const stRif = contracts.stRif as unknown as StRIFToken
  const [rifAddress, stRifAddress] = await Promise.all([rif, stRif].map(async c => c.getAddress()))
  return { rif, rifAddress, stRif, stRifAddress, deployer }
}
