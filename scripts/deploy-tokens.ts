import { ethers } from 'hardhat'
import { deployStRIF } from './deploy-stRIF'
import { deployRif } from './deploy-rif'

const deployTokens = async () => {
  const [deployer] = await ethers.getSigners()
  const { rifAddress } = await deployRif(deployer)
  const deployerAddress = await deployer.getAddress()
  const stRIFToken = await deployStRIF(rifAddress, deployerAddress)

  console.log(`RIFToken deployed at: ${rifAddress}`)
  console.log(`stRIFToken deployed at: ${await stRIFToken.getAddress()}`)
}

deployTokens().catch(err => {
  console.log('deployment error: ', err)
  process.exit(1)
})
