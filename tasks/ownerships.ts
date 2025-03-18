import { task } from 'hardhat/config'
import fs from 'fs-extra'
import { BetaBuildersRootstockCollective } from '../typechain-types'

// BetaBuilders#Implementation - 0x3D584161A15CE982eE339cbC28ebb0e1E535A7D3
// BetaBuilders#ERC1967Proxy - 0xc9B3346a3f151090130b63A28D35875F3C2d6a4d
// BetaBuilders#Contract - 0xc9B3346a3f151090130b63A28D35875F3C2d6a4d

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
        '0xc9B3346a3f151090130b63A28D35875F3C2d6a4d',
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
