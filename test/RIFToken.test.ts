import type { RIFToken } from '../types/ethers-contracts/index.js'
import { ethers, expect, type Signer } from './config.js'
import { deployContracts } from './deployContracts.js'

describe('RIFToken Contract', function () {
  it('Should assign the initial balance to the deployer', async () => {
    const [deployer] = await ethers.getSigners()
    const { rif } = await deployContracts()
    const balance = await rif.balanceOf(deployer)
    const rifInitialSupply = await rif.totalSupply()
    expect(balance).to.equal(rifInitialSupply)
  })

  it('Should have a valid address', async () => {
    const { rif } = await deployContracts()
    expect(await rif.getAddress()).to.be.properAddress
  })

  describe('Token Transfer Functionality', () => {
    let rif: RIFToken
    let deployer: Signer
    let owner1: Signer
    let owner2: Signer
    before(async () => {
      ;({ rif } = await deployContracts())
      ;[deployer, owner1, owner2] = await ethers.getSigners()
    })

    // Single block to test the entire Transfer flow

    it('deployer should transfer 50 tokens to owner 1', async () => {
      const amount = ethers.parseEther('50')
      const tx = await rif.transfer(await owner1.getAddress(), amount)
      await expect(() => tx).to.changeTokenBalances(ethers, rif, [deployer, owner1], [-amount, amount])
    })

    it('deployer should transfer 10 tokens to owner 2 and emit Transfer event', async () => {
      const amount = ethers.parseEther('10')
      const tx = await rif.transfer(await owner2.getAddress(), amount)
      await expect(() => tx).to.changeTokenBalances(ethers, rif, [deployer, owner2], [-amount, amount])
      await expect(tx).to.emit(rif, 'Transfer(address,address,uint256)')
    })

    it('owner 1 should transfer his RIFs to owner 2', async () => {
      const balance = await rif.balanceOf(await owner1.getAddress())
      const tx = await rif.connect(owner1).transfer(await owner2.getAddress(), balance)
      await expect(() => tx).to.changeTokenBalances(ethers, rif, [owner1, owner2], [-balance, balance])
    })
  })
})
