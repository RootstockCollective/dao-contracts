import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { EarlyAdopters } from '../typechain-types'
import cidsArray from './cids.json'

// maximum uploaded CIDs amount limited by the smart contract
const maxCids = 50

/**
 * @dev Loads an array of CIDs into the Early Adopters NFT smart contract in portions.
 * @param ea Reference to the Early Adopters NFT smart contract.
 * @param cidsArr Array of CIDs to upload in portions.
 * @param portionSize Size of each portion to upload.
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
    // If one of the transactions fails, retry until it succeeds.
    console.log('Tx failed. Trying again')
    await uploadInPortions(ea, cidsArr, portionSize)
  }
}

/**
 * @dev Loads an array of IPFS CIDs into the Early Adopters NFT smart contract.
 * @param hre Injected Hardhat runtime environment object.
 * @param nftAddress The address of the deployed NFT smart contract.
 * @param cids An array of CIDs to be loaded into the NFT smart contract.
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
