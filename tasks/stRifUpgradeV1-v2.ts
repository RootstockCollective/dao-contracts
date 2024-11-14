import { task } from 'hardhat/config'
import StRifV02ImplementationModule from '../ignition/modules/StRifV2ImplementationModule'
import { StRIFTokenV02 } from '../typechain-types'

task('upgrade-strif-v2', 'Upgrade StRIF from v.1 to v.2')
  .addParam('id', 'Ignition deployment ID')
  .setAction(async ({ id }, hre) => {
    try {
      //  deploy new StRIF implementation
      const v2 = (await hre.ignition.deploy(StRifV02ImplementationModule, { deploymentId: id }))
        .stRifV02Implementation as unknown as StRIFTokenV02
      // encode the call of reinitializer on the new implementation
      const initializeV2Call = v2.interface.encodeFunctionData('initializeV2')
      console.log(
        `New Implementation: ${await v2.getAddress()}\nUpgrade transaction data: ${initializeV2Call}`,
      )
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  })
