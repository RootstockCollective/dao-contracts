import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import fs from 'fs-extra'

interface AirdropRecipient {
  receiver: string
  ipfsCid: string
}

/**
 * Executes an airdrop of NFTs to a list of recipients.
 *
 * @param hre - The Hardhat runtime environment.
 * @param nftAddress - The address of the NFT smart contract. It can be any contract
 * that implements `IAirdroppable` interface
 * @param receivers - An array of objects containing the receiver's address and the corresponding IPFS CID.
 */
async function airdrop(hre: HardhatRuntimeEnvironment, nftAddress: string, receivers: AirdropRecipient[]) {
  //
  const contract = await hre.ethers.getContractAt('IAirdroppable', nftAddress)
  const tx = await contract.airdrop(receivers)
  await tx.wait()
}

interface Parameters {
  nft: string
  receivers: string
}

task('airdrop', 'Execute NFT airdrop')
  .addParam('nft', 'NFT smart contract address')
  .addParam('receivers', 'JSON file with a list of token receiver addresses and corresponding IPFS CIDs')
  .setAction(async ({ nft, receivers }: Parameters, hre) => {
    try {
      const airdropReceivers: AirdropRecipient[] = await fs.readJson(receivers)
      airdrop(hre, nft, airdropReceivers)
      console.log('Airdrop was executed')
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  })
