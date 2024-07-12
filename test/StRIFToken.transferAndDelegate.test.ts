import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { RIFToken, StRIFToken } from '../typechain-types'
import { ContractTransactionResponse, parseEther } from 'ethers'
import { deployContracts } from './deployContracts'

describe('stRIF token: Function transferAndDelegate', () => {
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let john: SignerWithAddress
  let rif: RIFToken
  let stRIF: StRIFToken
  let transferAndDelegateTx: ContractTransactionResponse
  const votingPower = parseEther('100') // RIF tokens

  // prettier-ignore
  const enfranchiseUser = async (user: SignerWithAddress, amount: bigint) => {
    await(await rif.transfer(user.address, amount)).wait()
    await(await rif.connect(user).approve(await stRIF.getAddress(), amount)).wait()
    await(await stRIF.connect(user).depositAndDelegate(user.address, amount)).wait()
  }

  // prettier-ignore
  before(async () => {
    ;[, alice, bob, john] = await ethers.getSigners()
    ;({ rif, stRIF } = await loadFixture(deployContracts))
    await enfranchiseUser(alice, votingPower)
    await enfranchiseUser(john, votingPower)
  })

  describe('Before transfer', () => {
    it('Alice should own 100 stRIFs tokens', async () => {
      expect(await stRIF.balanceOf(alice.address)).to.equal(votingPower)
    })
    it('Bob should not have stRIFs tokens', async () => {
      expect(await stRIF.balanceOf(alice.address)).to.equal(votingPower)
    })
    it('Alice should be her own delegate', async () => {
      expect(await stRIF.delegates(alice.address)).to.equal(alice.address)
    })
    it('Bob shouldn`t have delegates', async () => {
      expect(await stRIF.delegates(bob.address)).to.equal(ethers.ZeroAddress)
    })
    it('Alice should have voting power', async () => {
      expect(await stRIF.getVotes(alice.address)).to.equal(votingPower)
    })
    it('Bob shouldn`t have voting power', async () => {
      expect(await stRIF.getVotes(bob.address)).to.equal(0n)
    })
  })

  describe('Transfer and delegate', () => {
    describe('Sad path', () => {
      it('should not change balances after transfer of zero tokens', async () => {
        const tx = await stRIF.connect(alice).transferAndDelegate(bob.address, 0n)
        await expect(() => tx).to.changeTokenBalances(stRIF, [alice, bob], [0n, 0n])
      })
      it('Bob should`t be delegated to vote after transfer of 0 tokens', async () => {
        expect(await stRIF.delegates(bob.address)).to.equal(ethers.ZeroAddress)
      })
      it('Alice shouldn`t be able to transfer and delegate to zero address', async () => {
        const tx = stRIF.connect(alice).transferAndDelegate(ethers.ZeroAddress, votingPower)
        await expect(tx)
          .to.be.revertedWithCustomError(stRIF, 'ERC20InvalidReceiver')
          .withArgs(ethers.ZeroAddress)
      })
    })
    describe('Happy path', () => {
      before(async () => {
        transferAndDelegateTx = await stRIF.connect(alice).transferAndDelegate(bob.address, parseEther('25'))
      })
      it('Alice should use `transferAndDelegate` function to transfer 1/4 tokens to Bob', async () => {
        await expect(transferAndDelegateTx)
          .to.emit(stRIF, 'Transfer')
          .withArgs(alice.address, bob.address, parseEther('25'))
      })
      it('Voting power should be delegated to Bob within the SAME transaction', async () => {
        await expect(transferAndDelegateTx)
          .to.emit(stRIF, 'DelegateChanged')
          .withArgs(bob.address, ethers.ZeroAddress, bob.address)
      })
    })
  })

  describe('After transfer', () => {
    it('Alice should own 3/4 tokens', async () => {
      expect(await stRIF.balanceOf(alice.address)).to.equal(parseEther('75'))
    })
    it('Bob should own 1/4 tokens', async () => {
      expect(await stRIF.balanceOf(bob.address)).to.equal(parseEther('25'))
    })
    it('Alice should STILL be her own delegate', async () => {
      expect(await stRIF.delegates(alice.address)).to.equal(alice.address)
    })
    it('Bob should be his own delegate (the delegation was from Bob to Bob)', async () => {
      expect(await stRIF.delegates(bob.address)).to.equal(bob.address)
    })
    it('Alice`s voting power should equal her balance (3/4)', async () => {
      expect(await stRIF.getVotes(alice.address)).to.equal(parseEther('75'))
    })
    it('Bob`s voting power should equal his balance (1/4)', async () => {
      expect(await stRIF.getVotes(bob.address)).to.equal(parseEther('25'))
    })
  })

  describe('Receiving tokens from a third source after the delegation', () => {
    let johnsTransferTx: ContractTransactionResponse

    it('John should own 100 stRIFs tokens', async () => {
      expect(await stRIF.balanceOf(john.address)).to.equal(votingPower)
    })
    it('John should transfer his tokens to Bob', async () => {
      johnsTransferTx = await stRIF.connect(john).transferAndDelegate(bob.address, votingPower)
      await expect(() => johnsTransferTx).to.changeTokenBalances(
        stRIF,
        [john, bob],
        [-votingPower, votingPower],
      )
    })
    it('John`s transfer tx should NOT initiate another delegation', async () => {
      await expect(johnsTransferTx).not.to.emit(stRIF, 'DelegateChanged')
    })
    it('Bob should remain his own delegate', async () => {
      expect(await stRIF.delegates(bob.address)).to.equal(bob.address)
    })
    it('Bob`s voting power should include Alice`s and John`s tokens', async () => {
      expect(await stRIF.getVotes(bob.address)).to.equal(parseEther('25') + votingPower)
    })
  })

  describe('transferFromAndDelegate: a variation with approval', () => {
    const amount = parseEther('25')
    let transferTx: ContractTransactionResponse

    it('should reset Bob`s delegate back to zero address', async () => {
      const tx = await stRIF.connect(bob).delegate(ethers.ZeroAddress)
      await expect(tx)
        .to.emit(stRIF, 'DelegateChanged')
        .withArgs(bob.address, bob.address, ethers.ZeroAddress)
    })
    it('Bob should no longer have delegate', async () => {
      expect(await stRIF.delegates(bob.address)).to.equal(ethers.ZeroAddress)
    })
    it('Alice should approve Bob to transfer 25 stRIFs', async () => {
      const tx = await stRIF.connect(alice).approve(bob.address, amount)
      await expect(tx).to.emit(stRIF, 'Approval').withArgs(alice.address, bob.address, amount)
    })
    it('Bob now has approval to transfer stRIFs from Alice`s balance', async () => {
      expect(await stRIF.allowance(alice.address, bob.address)).to.equal(amount)
    })
    it('Bob should transfer Alice`s stRIFs to himself ', async () => {
      transferTx = await stRIF.connect(bob).transferFromAndDelegate(alice.address, bob.address, amount)
      await expect(() => transferTx).to.changeTokenBalances(stRIF, [bob, alice], [amount, -amount])
    })
    it('Bob`s tx should emit Transfer event', async () => {
      await expect(transferTx).to.emit(stRIF, 'Transfer').withArgs(alice.address, bob.address, amount)
    })
    it('Bob should become his own delegate within the same tx', async () => {
      await expect(transferTx)
        .to.emit(stRIF, 'DelegateChanged')
        .withArgs(bob.address, ethers.ZeroAddress, bob.address)
    })
    it('Bob should be his own delegate', async () => {
      expect(await stRIF.delegates(bob.address)).to.equal(bob.address)
    })
  })
})
