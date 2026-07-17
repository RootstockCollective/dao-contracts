import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import fs from 'fs-extra'
import { AirdropRecipientStruct } from '../typechain-types/contracts/NFT/ERC721AirdroppableUpgradable.sol/IAirdroppable'

/**
 * Executes an airdrop of NFTs to a list of recipients.
 *
 * @param hre - The Hardhat runtime environment.
 * @param nftAddress - The address of the NFT smart contract. It can be any contract
 * that implements `IAirdroppable` interface
 * @param receivers - An array of objects containing the receiver's address and the corresponding IPFS CID.
 */
async function airdrop(
  hre: HardhatRuntimeEnvironment,
  nftAddress: string,
  receivers: AirdropRecipientStruct[],
) {
  const contract = await hre.ethers.getContractAt('IAirdroppable', nftAddress)
  const tx = await contract.airdrop(receivers)
  await tx.wait()
  console.log('the airdrop was executed')
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
      const jsonData: AirdropRecipientStruct[] = await fs.readJson(receivers)
      const airdropReceivers: AirdropRecipientStruct[] = jsonData.map(({ receiver, ipfsCid }) => ({
        receiver: hre.ethers.getAddress(String(receiver).toLowerCase()),
        ipfsCid,
      }))
      await airdrop(hre, nft, airdropReceivers)
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  })
