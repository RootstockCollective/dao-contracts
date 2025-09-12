import { task } from 'hardhat/config'
import { ArgumentType } from 'hardhat/types/arguments'
import { EarlyAdoptersRootstockCollective } from '../types/ethers-contracts/index.js'

task(
  'update-ipfs-folder',
  'Update the parameters of IPFS folder containing Early Adopters NFT metadata JSON files',
)
  .addOption({
    name: 'nft',
    description: 'Early Adopters NFT address',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .addOption({
    name: 'cid',
    description: 'new folder CID',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .addOption({
    name: 'files',
    description: 'amount of files in the folder',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .setAction(async () => ({
    default: async ({ nft, cid, files }, hre) => {
      try {
        const { ethers } = await hre.network.connect()
        const ea = (await ethers.getContractAt(
          'EarlyAdoptersRootstockCollective',
          nft,
        )) as EarlyAdoptersRootstockCollective
        const tokensAvailable = await ea.tokensAvailable()
        await (await ea.setIpfsFolder(files, cid)).wait()
        const newTokensAvailable = await ea.tokensAvailable()
        console.log(
          `Early Adopters NFT metadata IPFS folder was updated. The new max tokens supply is ${newTokensAvailable - tokensAvailable}`,
        )
      } catch (error) {
        console.log(error instanceof Error ? error.message : error)
      }
    },
  }))
