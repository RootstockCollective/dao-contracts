import { ethers, upgrades } from 'hardhat'
import { StRIFToken } from '../typechain-types'

export const deployStRIF = async (rifTokenAddress: string, deployerAddress: string) => {
  const StRIFTokenFactory = await ethers.getContractFactory('StRIFToken')
  const stRIFToken = (await upgrades.deployProxy(StRIFTokenFactory, [rifTokenAddress, deployerAddress], {
    initializer: 'initialize',
    kind: 'uups',
    timeout: 0, // wait indefinitely
    unsafeAllow: ['internal-function-storage'],
  }) as unknown as StRIFToken)

  return await stRIFToken.waitForDeployment()
}
