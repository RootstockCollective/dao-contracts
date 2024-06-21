import { ethers } from 'hardhat'
import { deployStRIF } from './deploy-stRIF'

const deploy = async () => {
  const rifToken = await ethers.deployContract('RIFToken')
  const rifAddress = await rifToken.getAddress()
  const [deployer] = await ethers.getSigners()
  const deployerAddress = await deployer.getAddress()
  const stRIFToken = await deployStRIF(rifAddress, deployerAddress)

  console.log(`RIFToken deployed at: ${rifAddress}`)
  console.log(`stRIFToken deployed at: ${await stRIFToken.getAddress()}`)
}

deploy().catch(err => {
  console.log('deployment error: ', err)
  process.exit(1)
})
