import hre, { ethers, upgrades } from 'hardhat'
import { StRIFToken } from '../typechain-types'

export const deployStRIF = async (rifTokenAddress: string, deployerAddress: string) => {
  const StRIFTokenFactory = await ethers.getContractFactory('StRIFToken')
  const stRIFToken = (await upgrades.deployProxy(StRIFTokenFactory, [rifTokenAddress, deployerAddress], {
    initializer: 'initialize',
    kind: 'uups',
    timeout: 0, // wait indefinitely
    unsafeAllow: ['internal-function-storage'],
  })) as unknown as StRIFToken

  const stRIFContract = await stRIFToken.waitForDeployment()

  console.log(
    `Deployed RIF Governance Token on ${hre.network.name} with address ${await stRIFContract.getAddress()}`,
  )

  return stRIFContract
}
