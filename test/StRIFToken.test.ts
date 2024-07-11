import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { RIFToken, StRIFToken } from '../typechain-types'
import { deployContracts } from './deployContracts'

describe('stRIFToken', () => {
  let owner: SignerWithAddress, holder: SignerWithAddress, voter: SignerWithAddress
  let rif: RIFToken
  let stRif: StRIFToken
  const votingPower = 10n * 10n ** 18n

  before(async () => {
    // prettier-ignore
    ;[owner, holder, voter] = await ethers.getSigners();
    ;({ rif, stRif } = await loadFixture(deployContracts))
  })

  it('Should assign the initial balance to the contract itself', async () => {
    const contractBalance = await rif.balanceOf(owner)
    expect(contractBalance).to.equal(ethers.parseUnits('1000000000', 18))
  })

  describe('Wrapping RIF tokens to stRIF', () => {
    it('holder should NOT initially own RIF tokens', async () => {
      expect(await rif.balanceOf(holder.address)).to.equal(0)
    })

    it("owner should send some RIFs to holder's address", async () => {
      const tx = await rif.transfer(holder.address, votingPower)
      await tx.wait()
      expect(tx)
        .to.emit(rif, 'Transfer')
        .withArgs(await rif.getAddress(), holder.address, votingPower)
    })

    it('holder should approve allowance for stRIF', async () => {
      const tx = await rif.connect(holder).approve(stRif.getAddress(), votingPower)
      await tx.wait()
      expect(tx).to.emit(rif, 'Approval').withArgs(holder.address, stRif.getAddress(), votingPower)
    })

    it('allowance for stRIF should be set on the RIF token', async () => {
      expect(await rif.allowance(holder.address, stRif.getAddress())).to.equal(votingPower)
    })

    it('stRIF should NOT have any RIF tokens on its balance', async () => {
      expect(await rif.balanceOf(stRif.getAddress())).to.equal(0)
    })

    it('holder should NOT have any stRIF tokens on his balance', async () => {
      expect(await stRif.balanceOf(holder.address)).to.equal(0)
    })

    /** depositFor is a method for minting stRIF tokens */
    it('holder should deposit underlying tokens and mint the corresponding amount of stRIF tokens', async () => {
      await expect(stRif.connect(holder).depositFor(holder.address, votingPower))
        .to.emit(stRif, 'Transfer')
        .withArgs(ethers.ZeroAddress, holder.address, votingPower)
    })

    it('holder should NOT have RIF tokens anymore', async () => {
      expect(await rif.balanceOf(holder.address)).to.equal(0)
    })

    it('stRIF now should own RIFs belonged to the holder', async () => {
      expect(await rif.balanceOf(stRif.getAddress())).to.equal(votingPower)
    })

    it('holder should have the same amount of stRIF tokens as the deposited RIF tokens', async () => {
      expect(await stRif.balanceOf(holder.address)).to.equal(votingPower)
    })

    it('holder should NOT be able to deposit more RIF tokens than he has', async () => {
      await expect(stRif.connect(holder).depositFor(holder.address, votingPower)).to.be.reverted
    })

    /** delegate */
    it('holder should NOT have vote power yet', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(0)
    })

    it('holder should delegate vote power to himself', async () => {
      const tx = await stRif.connect(holder).delegate(holder.address)
      await expect(tx)
        .to.emit(stRif, 'DelegateChanged')
        .withArgs(holder.address, ethers.ZeroAddress, holder.address)
    })

    it('holder should now have delegate set', async () => {
      expect(await stRif.delegates(holder.address)).to.equal(holder.address)
    })

    it('holder should have vote power', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(votingPower)
    })
  })

  describe('Unwrapping RIF tokens from stRIF tokens', () => {
    /** withdrawTo is a method for burning stRIF tokens */
    it('holder should burn stRIF tokens', async () => {
      const tx = stRif.connect(holder).withdrawTo(holder.address, votingPower)
      await expect(tx).to.emit(stRif, 'Transfer').withArgs(holder.address, ethers.ZeroAddress, votingPower)
    })

    it('holder should no longer own stRIF tokens', async () => {
      expect(await stRif.balanceOf(holder.address)).to.equal(0)
    })

    it('holder should return his RIFs back', async () => {
      expect(await rif.balanceOf(holder.address)).to.equal(votingPower)
    })

    it('stRIF should no longer own RIFs', async () => {
      expect(await rif.balanceOf(await stRif.getAddress())).to.equal(0)
    })

    it('stRIF should no longer have allowance for RIFs from the holder', async () => {
      expect(await rif.allowance(holder.address, await stRif.getAddress())).to.equal(0)
    })

    it('holder should still have the delegate set', async () => {
      expect(await stRif.delegates(holder.address)).to.equal(holder.address)
    })

    it('holder should no longer have voting power', async () => {
      const vp = await stRif.getVotes(holder.address)
      expect(vp).to.equal(0)
    })
  })

  describe('Delegating voting power to a voter address', () => {
    it('should already have 2 checkpoints because of delegation and burning operations', async () => {
      const numCheckpoints = await stRif.numCheckpoints(holder.address)
      expect(numCheckpoints).to.equal(2)
    })

    it('holder should mint stRIF again', async () => {
      ;(await rif.connect(holder).approve(await stRif.getAddress(), votingPower)).wait()
      await expect(stRif.connect(holder).depositFor(holder.address, votingPower))
        .to.emit(stRif, 'Transfer')
        .withArgs(ethers.ZeroAddress, holder.address, votingPower)
      const checkPoint2 = await stRif.checkpoints(holder.address, 2)
      expect(checkPoint2._value).to.equal(votingPower)
    })

    it('should have 3 checkpoints now', async () => {
      const numCheckpoints = await stRif.numCheckpoints(holder.address)
      expect(numCheckpoints).to.equal(3)
    })

    it('holder should still be delegated to vote (from the previous time)', async () => {
      expect(await stRif.delegates(holder.address)).to.equal(holder.address)
    })

    it('holder should already have vote power', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(votingPower)
    })

    it('holder should delegate his voting power to the voter (another address)', async () => {
      const tx = stRif.connect(holder).delegate(voter.address)
      await expect(tx)
        .to.emit(stRif, 'DelegateChanged')
        .withArgs(holder.address, holder.address, voter.address)
    })

    it('should have 4 checkpoints now', async () => {
      const numCheckpoints = await stRif.numCheckpoints(holder.address)
      expect(numCheckpoints).to.equal(4)
    })

    it('holder should NOT have vote power any more', async () => {
      expect(await stRif.getVotes(holder.address)).to.equal(0)
    })

    it("voter should now have holder's voting power", async () => {
      expect(await stRif.getVotes(voter.address)).to.equal(votingPower)
    })
  })
})
