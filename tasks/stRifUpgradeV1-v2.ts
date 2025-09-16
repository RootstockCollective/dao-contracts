import { task } from 'hardhat/config'
import StRifV02ImplementationModule from '../ignition/modules/StRifV2ImplementationModule.js'
import { StRIFTokenV02 } from '../types/ethers-contracts/StRIFTokenV02.js'
import { ArgumentType } from 'hardhat/types/arguments'

task('upgrade-strif-v2', 'Upgrade StRIF from v.1 to v.2')
  .addOption({
    name: 'id',
    description: 'Ignition deployment ID',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .setAction(async () => ({
    default: async ({ id }, hre) => {
      const { ignition } = await hre.network.connect()
      //  deploy new StRIF implementation
      const v2 = (await ignition.deploy(StRifV02ImplementationModule, { deploymentId: id }))
        .stRifV02Implementation as unknown as StRIFTokenV02
      // encode the call of reinitializer on the new implementation
      const initializeV2Call = v2.interface.encodeFunctionData('initializeV2')
      console.log(
        `New Implementation: ${await v2.getAddress()}\nUpgrade transaction data: ${initializeV2Call}`,
      )
    },
  }))
