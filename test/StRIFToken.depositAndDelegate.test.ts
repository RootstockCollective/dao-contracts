import type { RIFToken, StRIFToken } from '../types/ethers-contracts/index.js'
import type { ContractTransactionResponse } from 'ethers'
import { ethers, expect, type Signer } from './config.js'
import { deployContracts } from './deployContracts.js'

describe('stRIF token: Function depositAndDelegate', () => {
  let alice: Signer
  let bob: Signer
  let rif: RIFToken
  let stRif: StRIFToken
  let stRifAddress: string
  let mintDelegateTx: ContractTransactionResponse
  const votingPower = ethers.parseEther('100') // 100 RIF tokens

  // prettier-ignore
  before(async () => {
    /*
    Deployment of RIF token and transferring a certain amount to Alice.
    See the relevant cases in StRIFToken tests
    */
    ;[, alice, bob] = await ethers.getSigners()
    ;({ rif, stRIF: stRif } = await deployContracts())
    stRifAddress = await stRif.getAddress()
    await(await rif.transfer(await alice.getAddress(), votingPower)).wait()
  })

  describe('Approving RIFs', () => {
    it('Alice should own 100 RIF tokens', async () => {
      const rifBalance = await rif.balanceOf(await alice.getAddress())
      expect(rifBalance).to.equal(votingPower)
    })

    it('Alice should set allowance for stRif contract to spend her RIFs', async () => {
      const tx = await rif.connect(alice).approve(stRifAddress, votingPower)
      await expect(tx)
        .to.emit(rif, 'Approval')
        .withArgs(await alice.getAddress(), stRifAddress, votingPower)
    })
  })

  describe('Before stRif minting / delegation', () => {
    it('approval should be set on RIF', async () => {
      expect(await rif.allowance(await alice.getAddress(), stRifAddress)).to.equal(votingPower)
    })

    it('Alice should NOT have any stRIF tokens on her balance', async () => {
      expect(await stRif.balanceOf(await alice.getAddress())).to.equal(0n)
    })

    it('Alice should NOT have delegate set', async () => {
      expect(await stRif.delegates(await alice.getAddress())).to.equal(ethers.ZeroAddress)
    })

    it('Alice should NOT have voting power', async () => {
      expect(await stRif.getVotes(await alice.getAddress())).to.equal(0n)
    })

    it('Alice should NOT have checkpoints', async () => {
      expect(await stRif.numCheckpoints(await alice.getAddress())).to.equal(0n)
    })
  })

  describe('Minting / delegation in one Tx', () => {
    describe('Sad path', () => {
      it('Bob should not be able to mint stRifs because he has no RIFs', async () => {
        const tx = stRif.connect(bob).depositAndDelegate(await bob.getAddress(), votingPower)
        await expect(tx)
          // proxy error
          .to.be.revertedWithCustomError(stRif, 'FailedInnerCall')
      })

      it('Alice should not mint more stRifs than her RIF balance', async () => {
        const tx = stRif.connect(alice).depositAndDelegate(await alice.getAddress(), votingPower + 1n)
        // proxy error
        await expect(tx).to.be.revertedWithCustomError(stRif, 'FailedInnerCall')
      })

      it('Alice should not mint zero stRifs', async () => {
        const tx = stRif.connect(alice).depositAndDelegate(await alice.getAddress(), 0)
        await expect(() => tx).to.changeTokenBalance(ethers, stRif, alice, 0)
      })

      it('Alice should not mint to zero address', async () => {
        const tx = stRif.connect(alice).depositAndDelegate(ethers.ZeroAddress, votingPower)
        await expect(tx)
          .to.be.revertedWithCustomError(stRif, 'ERC20InvalidReceiver')
          .withArgs(ethers.ZeroAddress)
      })

      it('Alice should not mint to stRif contract address', async () => {
        const tx = stRif.connect(alice).depositAndDelegate(stRifAddress, votingPower)
        await expect(tx).to.be.revertedWithCustomError(stRif, 'ERC20InvalidReceiver').withArgs(stRifAddress)
      })
    })

    describe('Happy path', () => {
      before(async () => {
        mintDelegateTx = await stRif.connect(alice).depositAndDelegate(await alice.getAddress(), votingPower)
      })

      it('Alice should stake her RIFs and mint stRIFs', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRif, 'Transfer')
          .withArgs(ethers.ZeroAddress, await alice.getAddress(), votingPower)
      })

      it('Alice should delegate voting power in the SAME transaction', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRif, 'DelegateChanged')
          .withArgs(await alice.getAddress(), ethers.ZeroAddress, await alice.getAddress())
      })
    })
  })

  describe('After minting / delegation', () => {
    it('approval(allowance) for stRif should NO LONGER be set on RIF', async () => {
      expect(await rif.allowance(await alice.getAddress(), stRifAddress)).to.equal(0n)
    })

    it('Alice should have newly minted stRIF tokens on her balance', async () => {
      expect(await stRif.balanceOf(await alice.getAddress())).to.equal(votingPower)
    })

    it('Alice should now be the delegate of herself', async () => {
      expect(await stRif.delegates(await alice.getAddress())).to.equal(await alice.getAddress())
    })

    it('Alice should have voting power', async () => {
      expect(await stRif.getVotes(await alice.getAddress())).to.equal(votingPower)
    })

    it('Alice should have 1 checkpoint', async () => {
      expect(await stRif.numCheckpoints(await alice.getAddress())).to.equal(1n)
    })

    it('block number and voting power should be recorded (snapshot) at the checkpoint', async () => {
      const checkpointIndex = 0n
      const [blockNumAtCheckpoint, votePowerAtCheckpoint] = await stRif.checkpoints(
        await alice.getAddress(),
        checkpointIndex,
      )
      expect(blockNumAtCheckpoint).to.equal(mintDelegateTx.blockNumber)
      expect(votePowerAtCheckpoint).to.equal(votingPower)
    })
  })
})
