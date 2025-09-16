import { task } from 'hardhat/config'
import fs from 'fs-extra'
import { ArgumentType } from 'hardhat/types/arguments'

interface AirdropRecipient {
  receiver: string
  ipfsCid: string
}

/**
 * Executes an airdrop of NFTs to a list of recipients.
 *
 */
task('airdrop', 'Execute NFT airdrop')
  .addOption({
    name: 'nft',
    description: 'NFT smart contract address',
    defaultValue: '',
    type: ArgumentType.STRING,
  })
  .addOption({
    name: 'receivers',
    description: 'JSON file with a list of token receiver addresses and corresponding IPFS CIDs',
    defaultValue: '',
    type: ArgumentType.FILE,
  })
  .setAction(async () => ({
    default: async ({ nft, receivers }, hre) => {
      try {
        const airdropReceivers: AirdropRecipient[] = await fs.readJson(receivers)
        const { ethers } = await hre.network.connect()
        const contract = await ethers.getContractAt('IAirdroppable', nft)
        const tx = await contract.airdrop(airdropReceivers)
        await tx.wait()
        console.log('Airdrop was executed')
      } catch (error) {
        console.log(error instanceof Error ? error.message : error)
      }
    },
  }))
