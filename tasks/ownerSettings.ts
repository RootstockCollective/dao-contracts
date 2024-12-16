import { task } from 'hardhat/config'

interface Params {
  address: string
}

task('owner-settings', 'Give main information about passed contract')
  .addParam('address', 'The address of the Governor instance to get parameters from')
  .setAction(async ({ address }: Params, hre) => {
    console.log('address', address)
    const governor = await hre.ethers.getContractAt('GovernorRootstockCollective', address)

    const owner = await governor.owner()
    const version = await governor.actualVersion()
    const guardian = await governor.guardian()
    const name = await governor.name()

    console.log('NAME', name)
    console.log('VERSION', version)
    console.log('OWNER', owner)
    console.log('GUARDIAN', guardian)
  })
