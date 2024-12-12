import { task } from 'hardhat/config'
import fs from 'fs-extra'
import { BetaBuildersRootstockCollective } from '../typechain-types'

// BetaBuilders#Implementation - 0xC7EbE794E613a7ba27925062D2abcC3b002e4ca4
// BetaBuilders#ERC1967Proxy - 0xA537018F1d16D5D53fCb8F6063d2A42d541A9827
// BetaBuilders#Contract - 0xA537018F1d16D5D53fCb8F6063d2A42d541A9827

interface Parameters {
  addresses: string
}

async function checkCorrectOwnerships(contract: BetaBuildersRootstockCollective, addresses: string[]) {
  return await Promise.all(
    addresses.map(async (addr, i) => {
      return addr === (await contract.ownerOf(i + 1))
    }),
  )
}

task('ownerships', 'It will check ownerships of airdropped NFTs')
  .addParam('addresses', 'Path to JSON file with addresses')
  .setAction(async ({ addresses }: Parameters, hre) => {
    try {
      const contract = await hre.ethers.getContractAt(
        'BetaBuildersRootstockCollective',
        '0xA537018F1d16D5D53fCb8F6063d2A42d541A9827',
      )

      const totalSupply = await contract.totalSupply()

      console.log('totalSupply', totalSupply)

      const checkAddresses: { addresses: string[] } = await fs.readJson(addresses)
      console.log('checkAddresses', checkAddresses)
      const areTheyOwners = await checkCorrectOwnerships(contract, checkAddresses.addresses)

      console.log('Ownership results:', areTheyOwners)
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)
    }
  })
