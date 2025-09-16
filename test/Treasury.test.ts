import type {
  RIFToken,
  StRIFToken,
  TreasuryRootstockCollective,
  DaoTimelockUpgradableRootstockCollective,
} from '../types/ethers-contracts/index.js'
import type { AddressLike } from 'ethers'
import { ethers, expect, type Signer } from './config.js'
import { deployContracts } from './deployContracts.js'

describe('Treasury Contract', () => {
  let deployer: Signer,
    owner: Signer,
    beneficiary: Signer,
    guardian: Signer,
    collector: Signer,
    token1: AddressLike,
    token2: AddressLike,
    token3: AddressLike
  let rif: RIFToken
  let treasury: TreasuryRootstockCollective
  let timelock: DaoTimelockUpgradableRootstockCollective
  let stRIF: StRIFToken
  let GuardianRole: string, ExecutorRole: string

  before(async () => {
    ;[deployer, owner, beneficiary, guardian, collector, token1, token2, token3] = await ethers.getSigners()
    ;({ stRIF, rif, treasury, timelock } = await deployContracts())
    GuardianRole = await treasury.GUARDIAN_ROLE()
    ExecutorRole = await treasury.EXECUTOR_ROLE()
    const grantRoleTx = await treasury.grantRole(ExecutorRole, await deployer.getAddress())
    await grantRoleTx.wait()
  })

  describe('Withdraw token and RBTC to any account', () => {
    it('Timelock should be granted the Executor role after deployment', async () => {
      expect(await treasury.hasRole(ExecutorRole, await timelock.getAddress())).to.be.true
    })
    it('Receive RBTC', async () => {
      const amount = ethers.parseEther('50')
      let balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(0n)
      const tx = {
        to: treasury,
        value: amount,
      }
      const sentTx = await owner.sendTransaction(tx)
      balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(amount)
      await expect(sentTx)
        .to.emit(treasury, 'Deposited')
        .withArgs(await owner.getAddress(), amount)
    })

    it('Withdraw RBTC to a beneficiary', async () => {
      const amount = ethers.parseEther('10')
      const sentTx = await treasury.withdraw(await beneficiary.getAddress(), amount)
      const balance = await ethers.provider.getBalance(treasury)
      expect(balance).to.equals(ethers.parseEther('40'))
      await expect(sentTx)
        .to.emit(treasury, 'Withdrawn')
        .withArgs(await beneficiary.getAddress(), amount)
    })

    it('Only account with Executor Role can withdraw RBTC to a beneficiary', async () => {
      const amount = ethers.parseEther('10')
      const sentTx = treasury.connect(owner).withdraw(await beneficiary.getAddress(), amount)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await owner.getAddress(), ExecutorRole)
    })

    it('Can not withdraw RBTC to a beneficiary if balance is insufficient', async () => {
      const amount = ethers.parseEther('100')
      const sentTx = treasury.withdraw(await beneficiary.getAddress(), amount)
      await expect(sentTx).to.be.revertedWith('Insufficient Balance')
    })

    it('Can not withdraw RBTC to zero address', async () => {
      const amount = ethers.parseEther('1')
      const sentTx = treasury.withdraw(ethers.ZeroAddress, amount)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Withdraw ERC20 token to a beneficiary', async () => {
      const rifAmount = ethers.parseEther('10')
      const tx = await rif.transfer(await treasury.getAddress(), rifAmount)
      await tx.wait()
      const amount = ethers.parseEther('5')
      const sentTx = await treasury.withdrawERC20(
        await rif.getAddress(),
        await beneficiary.getAddress(),
        amount,
      )
      const balance = await rif.balanceOf(await treasury.getAddress())
      expect(balance).to.equals(ethers.parseEther('5'))
      await expect(sentTx)
        .to.emit(treasury, 'WithdrawnERC20')
        .withArgs(await rif.getAddress(), await beneficiary.getAddress(), amount)
    })

    it('Can not Withdraw ERC20 token to a beneficiary if balance is insufficient', async () => {
      const rifAmount = ethers.parseEther('10')
      const tx = await rif.transfer(await treasury.getAddress(), rifAmount)
      await tx.wait()
      const amount = ethers.parseEther('50')
      const sentTx = treasury.withdrawERC20(await rif.getAddress(), await beneficiary.getAddress(), amount)
      await expect(sentTx).to.be.revertedWith('Insufficient ERC20 balance')
    })

    it('Only account with Executor Role can withdraw ERC20 token to a beneficiary', async () => {
      const amount = ethers.parseEther('1')
      const sentTx = treasury
        .connect(owner)
        .withdrawERC20(await rif.getAddress(), await beneficiary.getAddress(), amount)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await owner.getAddress(), ExecutorRole)
    })

    it('Withdraw with a non ERC20 token address should revert', async () => {
      const amount = ethers.parseEther('1')
      const sentTx = treasury.withdrawERC20(await owner.getAddress(), await beneficiary.getAddress(), amount)
      await expect(sentTx).to.be.revertedWith('Token forbidden')
    })
  })

  describe('Withdraw all assets to Collector', () => {
    it('Grant guardian role', async () => {
      const sentTx = treasury.grantRole(GuardianRole, await guardian.getAddress())
      await expect(sentTx)
        .to.emit(treasury, 'RoleGranted')
        .withArgs(GuardianRole, await guardian.getAddress(), await deployer.getAddress())
    })

    it('Withdraw RBTC to collector', async () => {
      const amount = await ethers.provider.getBalance(await treasury.getAddress())
      const sentTx = await treasury.connect(guardian).emergencyWithdraw(await collector.getAddress())
      await expect(() => sentTx).to.changeEtherBalances(ethers, [treasury, collector], [-amount, amount])
      await expect(sentTx)
        .to.emit(treasury, 'Withdrawn')
        .withArgs(await collector.getAddress(), amount)
    })

    it('Collector can not be zero address', async () => {
      const sentTx = treasury.connect(guardian).emergencyWithdraw(ethers.ZeroAddress)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Only guardian can withdraw RBTC to collector', async () => {
      const sentTx = treasury.connect(beneficiary).emergencyWithdraw(await collector.getAddress())
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), GuardianRole)
    })

    it('Withdraw ERC20 token to collector', async () => {
      const rifBalance = await rif.balanceOf(await treasury.getAddress())
      const sentTx = await treasury
        .connect(guardian)
        .emergencyWithdrawERC20(await rif.getAddress(), await collector.getAddress())
      const balance = await rif.balanceOf(await treasury.getAddress())
      expect(balance).to.equals(ethers.parseEther('0'))
      await expect(sentTx)
        .to.emit(treasury, 'WithdrawnERC20')
        .withArgs(await rif.getAddress(), await collector.getAddress(), rifBalance)
    })

    it('Only guardian can withdraw ERC20 token to collector', async () => {
      const sentTx = treasury
        .connect(beneficiary)
        .emergencyWithdrawERC20(await rif.getAddress(), await collector.getAddress())
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), GuardianRole)
    })

    it('Only can withdraw whitelisted ERC20 token to collector', async () => {
      const sentTx = treasury
        .connect(guardian)
        .emergencyWithdrawERC20(await stRIF.getAddress(), await collector.getAddress())
      await expect(sentTx).to.be.revertedWith('Token forbidden')
    })

    it('Collector can not be zero address', async () => {
      const sentTx = treasury
        .connect(guardian)
        .emergencyWithdrawERC20(await rif.getAddress(), ethers.ZeroAddress)
      await expect(sentTx).to.be.revertedWith('Zero Address is not allowed')
    })

    it('Add new token to whitelist', async () => {
      expect(await treasury.whitelist(await stRIF.getAddress())).to.equal(false)
      const sentTx = treasury.connect(deployer).addToWhitelist(await stRIF.getAddress())
      await expect(sentTx)
        .to.emit(treasury, 'TokenWhitelisted')
        .withArgs(await stRIF.getAddress())
      const flag = await treasury.whitelist(await stRIF.getAddress())
      expect(flag).to.equal(true)
    })

    it('Only account with Executor Role can add new token to whitelist', async () => {
      await treasury.connect(deployer).removeFromWhitelist(await stRIF.getAddress())
      expect(await treasury.whitelist(await stRIF.getAddress())).to.equal(false)

      const sentTx = treasury.connect(beneficiary).addToWhitelist(await stRIF.getAddress())
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), ExecutorRole)
    })

    it('Only account with Executor Role can remove a token to whitelist', async () => {
      const sentTx = treasury.connect(beneficiary).removeFromWhitelist(await rif.getAddress())
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), ExecutorRole)
      expect(await treasury.whitelist(await rif.getAddress())).to.equal(true)
    })

    it('Whitelist three tokens', async () => {
      const tokens = [token1, token2, token3]
      await treasury.connect(guardian).batchAddWhitelist(tokens)
      const events = await treasury.queryFilter(treasury.filters.TokenWhitelisted, -1)
      const token1Event = events.find(async event => event.args.includes(token1 as string))
      const token2Event = events.find(async event => event.args.includes(token2 as string))
      const token3Event = events.find(async event => event.args.includes(token3 as string))
      expect(events.length).to.equal(tokens.length)
      expect(token1Event?.eventName).to.equal('TokenWhitelisted')
      expect(token2Event?.eventName).to.equal('TokenWhitelisted')
      expect(token3Event?.eventName).to.equal('TokenWhitelisted')
      expect(await treasury.whitelist(token1)).to.equal(true)
      expect(await treasury.whitelist(token2)).to.equal(true)
      expect(await treasury.whitelist(token3)).to.equal(true)
    })

    it('Unwhitelist three tokens', async () => {
      const tokens = [token1, token2, token3]
      await treasury.connect(guardian).batchRemoveWhitelist(tokens)
      const events = await treasury.queryFilter(treasury.filters.TokenUnwhitelisted, -1)
      const token1Event = events.find(async event => event.args.includes(token1 as string))
      const token2Event = events.find(async event => event.args.includes(token2 as string))
      const token3Event = events.find(async event => event.args.includes(token3 as string))
      expect(events.length).to.equal(tokens.length)
      expect(token1Event?.eventName).to.equal('TokenUnwhitelisted')
      expect(token2Event?.eventName).to.equal('TokenUnwhitelisted')
      expect(token3Event?.eventName).to.equal('TokenUnwhitelisted')
      expect(await treasury.whitelist(token1)).to.equal(false)
      expect(await treasury.whitelist(token2)).to.equal(false)
      expect(await treasury.whitelist(token3)).to.equal(false)
    })

    it('Only account with Guardian Role can batch whitelist', async () => {
      const tokens = [token1, token2, token3]
      const sentTx = treasury.connect(beneficiary).batchAddWhitelist(tokens)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), GuardianRole)
    })

    it('Only account with Guardian Role can batch unwhitelist', async () => {
      const tokens = [token1, token2, token3]
      const sentTx = treasury.connect(beneficiary).batchRemoveWhitelist(tokens)
      await expect(sentTx)
        .to.be.revertedWithCustomError(treasury, 'AccessControlUnauthorizedAccount')
        .withArgs(await beneficiary.getAddress(), GuardianRole)
    })
  })
})
