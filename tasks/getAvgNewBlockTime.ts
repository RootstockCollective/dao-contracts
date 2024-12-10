import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('average-block-time', 'Calculates the average time for adding new blocks')
  .addParam('referenceBlockQuantity', 'Number of previous blocks to be considered for the calculation')
  .setAction(async ({ referenceBlockQuantity }, hre: HardhatRuntimeEnvironment) => {
    const provider = hre.ethers.provider
    const currentBlock = await provider.getBlock('latest')

    if (!currentBlock) {
      console.log('Error fetching the current block.')
      return
    }

    const referenceQuantity = parseInt(referenceBlockQuantity, 10)
    const previousBlockNumber = currentBlock.number - referenceQuantity

    if (previousBlockNumber < 0) {
      console.log('The reference block quantity is too high relative to the current block number.')
      return
    }

    const previousBlock = await provider.getBlock(previousBlockNumber)

    if (!previousBlock) {
      console.log('Error fetching the previous block.')
      return
    }

    const timeDiff = currentBlock.timestamp - previousBlock.timestamp
    const averageBlockTime = timeDiff / referenceQuantity

    console.log(`Average time for adding new blocks: ${averageBlockTime.toFixed(2)} seconds`)
  })
