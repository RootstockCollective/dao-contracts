import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployStRIF } from '../scripts/deploy-stRIF'
import { RIFToken, StRIFToken } from '../typechain-types'
import { ContractTransactionResponse } from 'ethers'

type Address = `0x${string}`

describe('Function depositAndDelegate', () => {
  let deployer: SignerWithAddress
  let holder: SignerWithAddress
  let stranger: SignerWithAddress
  let rif: RIFToken
  let rifAddress: Address
  let stRif: StRIFToken
  let stRifAddress: Address
  let mintDelegateTx: ContractTransactionResponse
  const votingPower = 100n * 10n ** 18n // 100 RIF tokens

  before(async () => {
    /* 
    Deployment of RIF token and transferring a certain amount to a holder.
    See the relevant cases in StRIFToken tests
    */
    ;[deployer, holder, stranger] = await ethers.getSigners()
    rif = await (await ethers.deployContract('RIFToken')).waitForDeployment()
    rifAddress = (await rif.getAddress()) as Address
    await (await rif.setAuthorizedManagerContract(deployer.address)).wait()
    const latestBlock = await ethers.provider.getBlock('latest')
    if (!latestBlock) throw new Error('Latest block not found')
    await (await rif.closeTokenDistribution(latestBlock.timestamp)).wait()
    stRif = await deployStRIF(rifAddress, deployer.address)
    stRifAddress = (await stRif.getAddress()) as Address
    await (await rif.transfer(holder.address, votingPower)).wait()
  })

  describe('Approving RIFs', () => {
    it('Holder should own 100 RIF tokens', async () => {
      const rifBalance = await rif.balanceOf(holder.address)
      expect(rifBalance).to.equal(votingPower)
    })

    it('Holder should set allowance for stRif contract to spend his RIFs', async () => {
      const tx = await rif.connect(holder).approve(stRifAddress, votingPower)
      await expect(tx).to.emit(rif, 'Approval').withArgs(holder, stRifAddress, votingPower)
    })
  })

  describe('Before stRif minting / delegation', () => {
    it('approval should be set on RIF', async () => {
      expect(await rif.allowance(holder.address, stRifAddress)).to.equal(votingPower)
    })

    it('holder should NOT have any stRIF tokens on his balance', async () => {
      expect(await stRif.balanceOf(holder.address)).to.equal(0n)
    })

    it('holder should NOT have delegate set', async () => {
      expect(await stRif.delegates(holder.address)).to.equal(ethers.ZeroAddress)
    })

    it('holder should NOT have voting power', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(0n)
    })

    it('holder should NOT have checkpoints', async () => {
      expect(await stRif.numCheckpoints(holder.address)).to.equal(0n)
    })
  })

  describe('Minting / delegation in one Tx', () => {
    describe('Sad path', () => {
      it('non-owner should not be able to mint stRifs', async () => {
        const tx = stRif.connect(stranger).depositAndDelegate(stranger.address, votingPower)
        await expect(tx)
          // proxy error
          .to.be.revertedWithCustomError(stRif, 'FailedInnerCall')
      })

      it('holder should not mint more stRifs than his RIF balance', async () => {
        const tx = stRif.connect(holder).depositAndDelegate(holder.address, votingPower + 1n)
        // proxy error
        await expect(tx).to.be.revertedWithCustomError(stRif, 'FailedInnerCall')
      })

      it('holder should not mint zero stRifs', async () => {
        const tx = stRif.connect(holder).depositAndDelegate(holder.address, 0)
        await expect(tx)
          .to.be.revertedWithCustomError(stRif, 'DepositFailed')
          .withArgs(holder.address, holder.address, 0)
      })

      it('holder should not mint to zero address', async () => {
        const tx = stRif.connect(holder).depositAndDelegate(ethers.ZeroAddress, votingPower)
        await expect(tx)
          .to.be.revertedWithCustomError(stRif, 'ERC20InvalidReceiver')
          .withArgs(ethers.ZeroAddress)
      })

      it('holder should not mint to stRif contract address', async () => {
        const tx = stRif.connect(holder).depositAndDelegate(stRifAddress, votingPower)
        await expect(tx).to.be.revertedWithCustomError(stRif, 'ERC20InvalidReceiver').withArgs(stRifAddress)
      })

      it('holder should not mint to RIF contract address', async () => {
        const tx = stRif.connect(holder).depositAndDelegate(rifAddress, votingPower)
        await expect(tx).to.be.revertedWithCustomError(stRif, 'ERC20InvalidReceiver').withArgs(rifAddress)
      })
    })

    describe('Happy path', () => {
      before(async () => {
        mintDelegateTx = await stRif.connect(holder).depositAndDelegate(holder.address, votingPower)
      })

      it('Holder should stake his RIFs and mint stRIFs', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRif, 'Transfer')
          .withArgs(ethers.ZeroAddress, holder.address, votingPower)
      })

      it('Holder should delegate voting power in the SAME transaction', async () => {
        await expect(mintDelegateTx)
          .to.emit(stRif, 'DelegateChanged')
          .withArgs(holder.address, ethers.ZeroAddress, holder.address)
      })
    })
  })

  describe('After minting / delegation', () => {
    it('approval(allowance) for stRif should NO LONGER be set on RIF', async () => {
      expect(await rif.allowance(holder.address, stRifAddress)).to.equal(0n)
    })

    it('holder should have newly minted stRIF tokens on his balance', async () => {
      expect(await stRif.balanceOf(holder.address)).to.equal(votingPower)
    })

    it('holder should now be the delegate of himself', async () => {
      expect(await stRif.delegates(holder.address)).to.equal(holder.address)
    })

    it('holder should have voting power', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(votingPower)
    })

    it('holder should have 1 checkpoint', async () => {
      expect(await stRif.numCheckpoints(holder.address)).to.equal(1n)
    })

    it('block number and voting power should be recorded (snapshot) at the checkpoint', async () => {
      const checkpointIndex = 0n
      const [blockNumAtCheckpoint, votePowerAtCheckpoint] = await stRif.checkpoints(
        holder.address,
        checkpointIndex,
      )
      expect(blockNumAtCheckpoint).to.equal(mintDelegateTx.blockNumber)
      expect(votePowerAtCheckpoint).to.equal(votingPower)
    })
  })
})
