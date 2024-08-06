import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { EarlyAdopters } from '../typechain-types'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule'

async function deploy() {
  const { ea } = await ignition.deploy(EarlyAdoptersModule)
  return ea as unknown as EarlyAdopters
}

describe('NFT attacker', () => {
  let ea: EarlyAdopters
  let eaAddress: string
  const cidsToLoad = 50 // maximum amount
  const cidExample = `QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX`

  before(async () => {
    ea = await loadFixture(deploy)
    eaAddress = await ea.getAddress()
  })

  it('should deploy NFT and load CIDs', async () => {
    await expect(ea.loadCids(Array(cidsToLoad).fill(cidExample)))
      .to.emit(ea, 'CidsLoaded')
      .withArgs(cidsToLoad, cidsToLoad)

    expect(await ea.cidsAvailable()).to.equal(cidsToLoad)
  })

  it('Unable to exploit with Coinspect attacker smart contract', async () => {
    const nftAttacker = await ethers.deployContract('NFTAttacker')
    await expect(nftAttacker.attack(eaAddress, cidsToLoad))
      .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
      .withArgs(await nftAttacker.getAddress())

    expect(await nftAttacker.amountOfNftsInControl()).to.equal(0)
    expect(await ea.cidsAvailable()).to.equal(cidsToLoad)
  })
})
