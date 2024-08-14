import { ethers } from 'hardhat'

const earlyAdoptersNftAddress = '0x687E04Bb759B3A010eb797301E5D1D05e135E90f'

/**
 * Hardhat script that mints NFT for the zero signer address. Run the script to test the minting of Early Adopters NFT
 * Usage: `npx hardhat run nft/mint.ts --network rootstockTestnet`
 */
async function mint() {
  const [owner] = await ethers.getSigners()
  const ea = await ethers.getContractAt('EarlyAdopters', earlyAdoptersNftAddress)
  await (await ea.mint()).wait()
  const id = await ea.tokenIdByOwner(owner.address)
  console.log(`Minted NFT #${id}`)
}

mint()
