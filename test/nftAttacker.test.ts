import type { EarlyAdoptersRootstockCollective } from '../types/ethers-contracts/index.js'
import { ethers, expect } from './config.js'
import { deployEarlyAdopters, deployContracts } from './deployContracts.js'

const maxSupply = 50
const cidExample = `QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX`

describe('NFT attacker', () => {
  let ea: EarlyAdoptersRootstockCollective
  let eaAddress: string

  before(async () => {
    const { stRIF } = await deployContracts()
    ea = await deployEarlyAdopters(cidExample, maxSupply, await stRIF.getAddress(), 100n * 10n ** 18n)
    eaAddress = await ea.getAddress()
  })

  it('should deploy NFT and be ready for minting tokens', async () => {
    expect(await ea.tokensAvailable()).to.equal(maxSupply)
  })

  it('Unable to exploit with Coinspect attacker smart contract', async () => {
    const nftAttacker = await ethers.deployContract('NFTAttacker')
    await expect(nftAttacker.attack(eaAddress, maxSupply)).to.revert(ethers)

    expect(await nftAttacker.amountOfNftsInControl()).to.equal(0)
    expect(await ea.tokensAvailable()).to.equal(maxSupply)
  })
})
