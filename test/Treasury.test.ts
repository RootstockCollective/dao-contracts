import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployContracts } from './deployContracts'
import { RIFToken, StRIFToken, TreasuryDao } from '../typechain-types'
import { parseEther } from 'ethers'
import { expect } from 'chai'

describe('Treasury Contract', () => {
  let deployer: SignerWithAddress,
    owner: SignerWithAddress,
    beneficiary: SignerWithAddress,
    guardian: SignerWithAddress,
    collector: SignerWithAddress
  let rif: RIFToken
  let treasury: TreasuryDao
  let stRIF: StRIFToken

  before(async () => {
    ;[deployer, owner, beneficiary, guardian, collector] = await ethers.getSigners()
    ;({ stRIF, rif, treasury } = await loadFixture(deployContracts))
    await treasury.addToWhitelist(rif)
  })

  describe('Withdraw token and RBTC to any account', () => {
    it('Receive RBTC', async () => {
      const amount = parseEther('50')
      let balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(0n)
      const tx = {
        to: treasury,
        value: amount,
      }
      const sentTx = await owner.sendTransaction(tx)
      balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(amount)
      await expect(sentTx).to.emit(treasury, 'Deposited').withArgs(owner.address, amount)
    })

    it('Withdraw RBTC to a beneficiary', async () => {
      const amount = parseEther('10')
      const sentTx = await treasury.withdraw(beneficiary, amount)
      const balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(parseEther('40'))
      await expect(sentTx).to.emit(treasury, 'Withdrawn').withArgs(beneficiary, amount)
    })

    it('Only owner can withdraw RBTC to a beneficiary', async () => {
      const amount = parseEther('10')
      const sentTx = treasury.connect(owner).withdraw(beneficiary, amount)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'OwnableUnauthorizedAccount')
        .withArgs(owner.address)
    })

    it('Can not withdraw RBTC to a beneficiary if balance is insufficient', async () => {
      const amount = parseEther('100')
      const sentTx = treasury.withdraw(beneficiary, amount)
      await expect(sentTx).to.be.revertedWith('Insufficient Balance')
    })

    it('Can not withdraw RBTC to zero address', async () => {
      const amount = parseEther('1')
      const sentTx = treasury.withdraw(ethers.ZeroAddress, amount)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Withdraw ERC20 token to a beneficiary', async () => {
      const rifAmount = parseEther('10')
      const tx = await rif.transfer(treasury, rifAmount)
      await tx.wait()
      const amount = parseEther('5')
      const sentTx = await treasury.withdrawERC20(rif, beneficiary, amount)
      const balance = await rif.balanceOf(treasury)
      expect(balance).to.equals(parseEther('5'))
      await expect(sentTx).to.emit(treasury, 'WithdrawnERC20').withArgs(rif, beneficiary, amount)
    })

    it('Can not Withdraw ERC20 token to a beneficiary if balance is insufficient', async () => {
      const rifAmount = parseEther('10')
      const tx = await rif.transfer(treasury, rifAmount)
      await tx.wait()
      const amount = parseEther('50')
      const sentTx = treasury.withdrawERC20(rif, beneficiary, amount)
      await expect(sentTx).to.be.revertedWith('Insufficient ERC20 balance')
    })

    it('Only owner can withdraw ERC20 token to a beneficiary', async () => {
      const amount = parseEther('1')
      const sentTx = treasury.connect(owner).withdrawERC20(rif, beneficiary, amount)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'OwnableUnauthorizedAccount')
        .withArgs(owner.address)
    })

    it('Withdraw with a non ERC20 token address should revert', async () => {
      const amount = parseEther('1')
      const sentTx = treasury.withdrawERC20(owner.address, beneficiary, amount)
      await expect(sentTx).to.be.revertedWith('Token forbidden')
    })
  })

  describe('Withdraw all assets to Collector', () => {
    it('Transfer guardianship', async () => {
      const sentTx = treasury.transferGuardianship(guardian)
      await expect(sentTx).to.emit(treasury, 'GuardianshipTransferred').withArgs(deployer, guardian)
    })

    it('Withdraw RBTC to collector', async () => {
      const amount = await ethers.provider.getBalance(treasury)
      const sentTx = await treasury.connect(guardian).withdrawAll(collector)
      await expect(() => sentTx).to.changeEtherBalances([treasury, collector], [-amount, amount])
      await expect(sentTx).to.emit(treasury, 'Withdrawn').withArgs(collector, amount)
    })

    it('Collector can not be zero address', async () => {
      const sentTx = treasury.connect(guardian).withdrawAll(ethers.ZeroAddress)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Only guardian can withdraw RBTC to collector', async () => {
      const sentTx = treasury.connect(beneficiary).withdrawAll(collector)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'GuardianUnauthorizedAccount')
        .withArgs(beneficiary)
    })

    it('Only guardian can transfer guardianship', async () => {
      const sentTx = treasury.connect(beneficiary).transferGuardianship(guardian)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'GuardianUnauthorizedAccount')
        .withArgs(beneficiary)
    })

    it('Zero Address can not be guardian', async () => {
      const sentTx = treasury.connect(guardian).transferGuardianship(ethers.ZeroAddress)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'InvalidGuardian')
        .withArgs(ethers.ZeroAddress)
    })

    it('Withdraw ERC20 token to collector', async () => {
      const rifBalance = await rif.balanceOf(treasury)
      const sentTx = await treasury.connect(guardian).withdrawAllERC20(rif, collector)
      const balance = await rif.balanceOf(treasury)
      expect(balance).to.equals(parseEther('0'))
      await expect(sentTx).to.emit(treasury, 'WithdrawnERC20').withArgs(rif, collector, rifBalance)
    })

    it('Only guardian can withdraw ERC20 token to collector', async () => {
      const sentTx = treasury.connect(beneficiary).withdrawAllERC20(rif, collector)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'GuardianUnauthorizedAccount')
        .withArgs(beneficiary)
    })

    it('Only can withdraw whitelisted ERC20 token to collector', async () => {
      const sentTx = treasury.connect(guardian).withdrawAllERC20(stRIF, collector)
      await expect(sentTx).to.be.revertedWith('Token forbidden')
    })

    it('Collector can not be zero address', async () => {
      const sentTx = treasury.connect(guardian).withdrawAllERC20(rif, ethers.ZeroAddress)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Add new token to whitelist', async () => {
      expect(await treasury.whitelist(stRIF)).to.equal(false)
      await treasury.connect(deployer).addToWhitelist(stRIF)
      const flag = await treasury.whitelist(stRIF)
      expect(flag).to.equal(true)
    })

    it('Only owner can add new token to whitelist', async () => {
      await treasury.connect(deployer).removeFromWhitelist(stRIF)
      expect(await treasury.whitelist(stRIF)).to.equal(false)

      const sentTx = treasury.connect(beneficiary).addToWhitelist(stRIF)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'OwnableUnauthorizedAccount')
        .withArgs(beneficiary.address)
    })

    it('Only owner can add new token to whitelist', async () => {
      const sentTx = treasury.connect(beneficiary).removeFromWhitelist(rif)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'OwnableUnauthorizedAccount')
        .withArgs(beneficiary.address)
      expect(await treasury.whitelist(rif)).to.equal(true)
    })
  })
})
