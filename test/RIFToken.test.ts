import { expect } from 'chai'
import { ethers } from 'hardhat'
import { parseEther } from 'ethers'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { RIFToken } from '../typechain-types'
import { deployContracts } from './deployContracts'

describe('RIFToken Contract', function () {
  it('Should assign the initial balance to the deployer', async () => {
    const [deployer] = await ethers.getSigners()
    const { rif } = await loadFixture(deployContracts)
    const balance = await rif.balanceOf(deployer)
    const rifInitialSupply = await rif.totalSupply()
    expect(balance).to.equal(rifInitialSupply)
  })

  it('Should have a valid address', async () => {
    const { rif } = await loadFixture(deployContracts)
    expect(await rif.getAddress()).to.be.properAddress
  })

  describe('Token Transfer Functionality', () => {
    let rif: RIFToken
    let deployer: SignerWithAddress
    let owner1: SignerWithAddress
    let owner2: SignerWithAddress
    before(async () => {
      ;({ rif } = await loadFixture(deployContracts))
      ;[deployer, owner1, owner2] = await ethers.getSigners()
    })

    // Single block to test the entire Transfer flow

    it('deployer should transfer 50 tokens to owner 1', async () => {
      const amount = parseEther('50')
      const tx = await rif.transfer(owner1.address, amount)
      await expect(() => tx).to.changeTokenBalances(rif, [deployer, owner1], [-amount, amount])
    })

    it('deployer should transfer 10 tokens to owner 2 and emit Transfer event', async () => {
      const amount = parseEther('10')
      const tx = await rif.transfer(owner2.address, amount)
      await expect(() => tx).to.changeTokenBalances(rif, [deployer, owner2], [-amount, amount])
      await expect(tx).to.emit(rif, 'Transfer(address,address,uint256)')
    })

    it('owner 1 should transfer his RIFs to owner 2', async () => {
      const balance = await rif.balanceOf(owner1.address)
      const tx = await rif.connect(owner1).transfer(owner2.address, balance)
      await expect(() => tx).to.changeTokenBalances(rif, [owner1, owner2], [-balance, balance])
    })
  })
})
