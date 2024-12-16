import { task } from 'hardhat/config'
import fs from 'fs-extra'
import { BetaBuildersRootstockCollective } from '../typechain-types'

// BetaBuilders#Implementation - 0x091bd079808B93D574eA849dc8f524c07f545938
// BetaBuilders#ERC1967Proxy - 0x10eEf0E20F4874E35a4247Bf9FDED7b872A127f5
// BetaBuilders#Contract - 0x10eEf0E20F4874E35a4247Bf9FDED7b872A127f5

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
        '0x10eEf0E20F4874E35a4247Bf9FDED7b872A127f5',
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
