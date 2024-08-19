import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployContracts } from './deployContracts'
import { RIFToken, TreasuryDao } from '../typechain-types'
import { parseEther } from 'ethers'
import { expect } from 'chai'

describe('Treasury Contract', () => {
  let deployer: SignerWithAddress,
    owner: SignerWithAddress,
    beneficiary: SignerWithAddress,
    guardian: SignerWithAddress
  let rif: RIFToken
  let treasury: TreasuryDao

  before(async () => {
    ;[deployer, owner, beneficiary, guardian] = await ethers.getSigners()
    ;({ rif, treasury } = await loadFixture(deployContracts))
    await treasury.addToWhitelist(rif)
  })

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

  it('Transfer guardianship', async () => {
    const sentTx = await treasury.transferGuardianship(guardian)
    await expect(sentTx).to.emit(treasury, 'GuardianshipTransferred').withArgs(deployer, guardian)
  })
})
