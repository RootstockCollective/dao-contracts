import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { RIFToken, StRIFToken } from '../typechain-types'
import { ContractTransactionResponse, parseEther } from 'ethers'
import { deployContracts } from './deployContracts'

describe('stRIF token: Function depositAndDelegate', () => {
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let rif: RIFToken
  let stRIF: StRIFToken
  let stRifAddress: string
  let mintDelegateTx: ContractTransactionResponse
  const votingPower = parseEther('100') // 100 RIF tokens

  // prettier-ignore
  before(async () => {
    /* 
    Deployment of RIF token and transferring a certain amount to Alice.
    See the relevant cases in StRIFToken tests
    */
    ;[, alice, bob] = await ethers.getSigners()
    ;({ rif, stRIF } = await loadFixture(deployContracts))
    stRifAddress = await stRIF.getAddress()
    await(await rif.transfer(alice.address, votingPower)).wait()
  })

  describe('Approving RIFs', () => {
    it('Alice should own 100 RIF tokens', async () => {
      const rifBalance = await rif.balanceOf(alice.address)
      expect(rifBalance).to.equal(votingPower)
    })

    it('Alice should set allowance for stRif contract to spend her RIFs', async () => {
      const tx = await rif.connect(alice).approve(stRifAddress, votingPower)
      await expect(tx).to.emit(rif, 'Approval').withArgs(alice, stRifAddress, votingPower)
    })
  })

  describe('Before stRif minting / delegation', () => {
    it('approval should be set on RIF', async () => {
      expect(await rif.allowance(alice.address, stRifAddress)).to.equal(votingPower)
    })

    it('Alice should NOT have any stRIF tokens on her balance', async () => {
      expect(await stRIF.balanceOf(alice.address)).to.equal(0n)
    })

    it('Alice should NOT have delegate set', async () => {
      expect(await stRIF.delegates(alice.address)).to.equal(ethers.ZeroAddress)
    })

    it('Alice should NOT have voting power', async () => {
      expect(await stRIF.getVotes(alice.address)).to.equal(0n)
    })

    it('Alice should NOT have checkpoints', async () => {
      expect(await stRIF.numCheckpoints(alice.address)).to.equal(0n)
    })
  })

  describe('Minting / delegation in one Tx', () => {
    describe('Sad path', () => {
      it('Bob should not be able to mint stRifs because he has no RIFs', async () => {
        const tx = stRIF.connect(bob).depositAndDelegate(bob.address, votingPower)
        await expect(tx)
          // proxy error
          .to.be.revertedWithCustomError(stRIF, 'FailedInnerCall')
      })

      it('Alice should not mint more stRifs than her RIF balance', async () => {
        const tx = stRIF.connect(alice).depositAndDelegate(alice.address, votingPower + 1n)
        // proxy error
        await expect(tx).to.be.revertedWithCustomError(stRIF, 'FailedInnerCall')
      })

      it('Alice should not mint zero stRifs', async () => {
        const tx = stRIF.connect(alice).depositAndDelegate(alice.address, 0)
        await expect(() => tx).to.changeTokenBalance(stRIF, alice, 0)
      })

      it('Alice should not mint to zero address', async () => {
        const tx = stRIF.connect(alice).depositAndDelegate(ethers.ZeroAddress, votingPower)
        await expect(tx)
          .to.be.revertedWithCustomError(stRIF, 'ERC20InvalidReceiver')
          .withArgs(ethers.ZeroAddress)
      })

      it('Alice should not mint to stRif contract address', async () => {
        const tx = stRIF.connect(alice).depositAndDelegate(stRifAddress, votingPower)
        await expect(tx).to.be.revertedWithCustomError(stRIF, 'ERC20InvalidReceiver').withArgs(stRifAddress)
      })
    })

    describe('Happy path', () => {
      before(async () => {
        mintDelegateTx = await stRIF.connect(alice).depositAndDelegate(alice.address, votingPower)
      })

      it('Alice should stake her RIFs and mint stRIFs', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRIF, 'Transfer')
          .withArgs(ethers.ZeroAddress, alice.address, votingPower)
      })

      it('Alice should delegate voting power in the SAME transaction', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRIF, 'DelegateChanged')
          .withArgs(alice.address, ethers.ZeroAddress, alice.address)
      })
    })
  })

  describe('After minting / delegation', () => {
    it('approval(allowance) for stRif should NO LONGER be set on RIF', async () => {
      expect(await rif.allowance(alice.address, stRifAddress)).to.equal(0n)
    })

    it('Alice should have newly minted stRIF tokens on her balance', async () => {
      expect(await stRIF.balanceOf(alice.address)).to.equal(votingPower)
    })

    it('Alice should now be the delegate of herself', async () => {
      expect(await stRIF.delegates(alice.address)).to.equal(alice.address)
    })

    it('Alice should have voting power', async () => {
      expect(await stRIF.getVotes(alice.address)).to.equal(votingPower)
    })

    it('Alice should have 1 checkpoint', async () => {
      expect(await stRIF.numCheckpoints(alice.address)).to.equal(1n)
    })

    it('block number and voting power should be recorded (snapshot) at the checkpoint', async () => {
      const checkpointIndex = 0n
      const [blockNumAtCheckpoint, votePowerAtCheckpoint] = await stRIF.checkpoints(
        alice.address,
        checkpointIndex,
      )
      expect(blockNumAtCheckpoint).to.equal(mintDelegateTx.blockNumber)
      expect(votePowerAtCheckpoint).to.equal(votingPower)
    })
  })
})
