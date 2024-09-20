import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

async function updateIpfsFolder(
  hre: HardhatRuntimeEnvironment,
  nftAddress: string,
  cid: string,
  numFiles: number,
) {
  const ea = await hre.ethers.getContractAt('EarlyAdoptersRootstockCollective', nftAddress)
  const tokensAvailable = await ea.tokensAvailable()
  await(await ea.setIpfsFolder(numFiles, cid)).wait()
  const newTokensAvailable = await ea.tokensAvailable()
  console.log(
    `Early Adopters NFT metadata IPFS folder was updated. The new max tokens supply is ${newTokensAvailable - tokensAvailable}`,
  )
}

task(
  'update-ipfs-folder',
  'Update the parameters of IPFS folder containing Early Adopters NFT metadata JSON files',
)
  .addParam('nft', 'Early Adopters NFT address')
  .addParam('cid', 'new folder CID')
  .addParam('files', 'amount of files in the folder')
  .setAction(async ({ nft, cid, files }: { nft: string; cid: string; files: string }, hre) => {
    try {
      await updateIpfsFolder(hre, nft, cid, +files)
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  })
