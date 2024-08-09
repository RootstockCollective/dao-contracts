import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { EarlyAdopters } from '../typechain-types'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule'

const maxSupply = 50
const cidExample = `QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX`

async function deploy() {
  const [defaultAdmin, upgrader] = await ethers.getSigners()
  const { ea } = await ignition.deploy(EarlyAdoptersModule, {
    parameters: {
      EarlyAdoptersProxy: {
        ipfs: cidExample,
        numFiles: maxSupply,
        defaultAdmin: defaultAdmin.address,
        upgrader: upgrader.address,
      },
    },
  })
  return ea as unknown as EarlyAdopters
}
describe('NFT attacker', () => {
  let ea: EarlyAdopters
  let eaAddress: string

  before(async () => {
    ea = await loadFixture(deploy)
    eaAddress = await ea.getAddress()
  })

  it('should deploy NFT and be ready for minting tokens', async () => {
    expect(await ea.tokensAvailable()).to.equal(maxSupply)
  })

  it('Unable to exploit with Coinspect attacker smart contract', async () => {
    const nftAttacker = await ethers.deployContract('NFTAttacker')
    await expect(nftAttacker.attack(eaAddress, maxSupply))
      .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
      .withArgs(await nftAttacker.getAddress())

    expect(await nftAttacker.amountOfNftsInControl()).to.equal(0)
    expect(await ea.tokensAvailable()).to.equal(maxSupply)
  })
})
