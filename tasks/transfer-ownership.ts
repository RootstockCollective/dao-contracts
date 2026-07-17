import { task } from 'hardhat/config'

interface Params {
  owner: string
  to: string
}

task('transfer-ownership')
  .addParam('to')
  .setAction(async ({ to }: Params, hre) => {
    try {
      const toParam = to.toLowerCase()
      const isCorrect = hre.ethers.isAddress(toParam)
      console.log('TO', toParam, isCorrect)
      if (!isCorrect || toParam === hre.ethers.ZeroAddress) {
        throw new Error('To parameter is supposed to be real address')
      }
      const account0 = (await hre.ethers.getSigners())[0]
      console.log('account0', account0)

      // make sure you set the correct address
      const governor = await hre.ethers.getContractAt(
        'GovernorRootstockCollective',
        '0x2109FF4a9D5548a21F877cA937Ac5847Fde49694',
      )

      const owner = await governor.owner()
      console.log('OWNER', owner)

      if (owner !== account0.address) {
        throw new Error('Operation cannot be performed')
      }

      const tx = await governor.transferOwnership(toParam)
      const receipt = await tx.wait()

      const newOwner = await governor.owner()
      console.log('OPERATION SUCCESS', receipt)
      console.log('NEW OWNER', newOwner)
    } catch (err) {
      console.log('ERROR OCCURED WHEN TRANSFERRING OWNERSHIP', err)
    }
  })
