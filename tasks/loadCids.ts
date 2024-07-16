import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { EarlyAdopters } from '../typechain-types'
import cidsArray from './cids.json'

// maximum uploaded CIDs amount limited by the smart contract
const maxCids = 50

/**
 * Loads an array of CIDs to Early Adopters NFT smart contract by portions
 * @param ea Early Adopters NFT smart contract ref
 * @param cidsArr array of CIDs to upload in portions
 * @param portionSize length of a portion
 */
async function uploadInPortions(ea: EarlyAdopters, cidsArr: string[], portionSize: number): Promise<void> {
  try {
    if (cidsArr.length === 0) return
    // taking first `portionSize` elements from the CIDs array
    const cids = cidsArr.slice(0, portionSize)
    await (await ea.loadCids(cids)).wait()
    process.stdout.write(`${cids.length}`)
    const cidsRemains = cidsArr.length - cids.length
    if (cidsRemains === 0) {
      process.stdout.write(` done\n`)
      return
    } else {
      process.stdout.write(`...`)
    }
    // call the function again until all the CIDs get uploaded
    await uploadInPortions(ea, cidsArr.slice(cids.length), portionSize)
  } catch (error) {
    // if one of transactions failed, try to send it again until it succeeds
    console.log('Tx failed. Trying again')
    await uploadInPortions(ea, cidsArr, portionSize)
  }
}

/**
 * Loads an array of IPFS CIDs info the Early Adopters NFT smart contract
 * @param nftAddress address of  deployed NFT smart contract
 * @param metaCids array of all CIDs needed to be loaded into NFT smart contract
 */
async function loadNftCids(hre: HardhatRuntimeEnvironment, nftAddress: string, cids: string[]) {
  if (cids.length === 0) return console.log('No CIDs to upload')
  console.log(`Total amount of CIDs to upload:`, cids.length)
  const ea = await hre.ethers.getContractAt('EarlyAdopters', nftAddress)
  process.stdout.write('Loading CIDs in portions: ')
  await uploadInPortions(ea, cids, maxCids)
  console.log(`✅ Loaded all ${cids.length} CIDs in the NFT s/c!`)
  const cidsAvailable = await ea.cidsAvailable()
  const totalSupply = await ea.totalSupply()
  console.log(`Available for minting: ${cidsAvailable}, total supply: ${totalSupply}`)
}

task('load-cids', 'Upload IPFS CIDs to Early Adopters NFT')
  .addParam('nft', 'NFT smart contract address')
  .setAction(async ({ nft }: { nft: string }, hre) => {
    try {
      await loadNftCids(hre, nft, cidsArray)
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  })
