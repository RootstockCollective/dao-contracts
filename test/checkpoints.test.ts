import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers'
import { deployContracts } from './deployContracts'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { RIFToken, StRIFToken } from '../typechain-types'
import { expect } from 'chai'

describe('stRIFToken and Governor Checkpoints', () => {
  let holder: SignerWithAddress
  let rif: RIFToken
  let stRIF: StRIFToken
  const votingPower = 10n * 10n ** 18n
  const sevenDays = 20160

  // prettier-ignore
  before(async () => {
      ;[holder] = await ethers.getSigners()
      ;({ rif, stRIF } = await loadFixture(deployContracts))
    })

  describe('stRIF Token checkpoints', () => {
    const depositAndDelegateUtil = async (acc: SignerWithAddress) => {
      const transferRIFTx = await rif.transfer(acc.address, votingPower)
      transferRIFTx.wait()
      const approveTx = await rif.connect(acc).approve(stRIF.getAddress(), votingPower)
      await approveTx.wait()
      const depositAndDelegateTx = await stRIF.connect(acc).depositAndDelegate(acc.address, votingPower)
      await depositAndDelegateTx.wait()
    }

    const withdrawToUtil = async (acc: SignerWithAddress) => {
      const withDrawTx = await stRIF.connect(acc).withdrawTo(acc.address, votingPower)
      await withDrawTx.wait()
    }

    it('each delegate function call should create a checkpoint ', async () => {
      await depositAndDelegateUtil(holder)
      expect(await stRIF.balanceOf(holder.address)).to.equal(votingPower)
      expect(await stRIF.numCheckpoints(holder.address)).to.equal(1n)

      await depositAndDelegateUtil(holder)
      expect(await stRIF.balanceOf(holder.address)).to.equal(votingPower * 2n)
      expect(await stRIF.numCheckpoints(holder.address)).to.equal(2n)
    })

    it('each withdrawTo should also create a checkpoint', async () => {
      await withdrawToUtil(holder)
      expect(await stRIF.balanceOf(holder)).to.equal(votingPower)
      expect(await stRIF.numCheckpoints(holder.address)).to.equal(3n)

      await withdrawToUtil(holder)
      expect(await stRIF.balanceOf(holder)).to.equal(0n)
      expect(await stRIF.numCheckpoints(holder.address)).to.equal(4n)
    })

    it('should fetch amount of voting power correctly based on the timepoint argument', async () => {
      await mine(sevenDays + 1)
      await depositAndDelegateUtil(holder)
      await mine(1)

      const sevenDaysVotes = await stRIF.getPastVotes(
        holder.address,
        (await ethers.provider.getBlockNumber()) - sevenDays,
      )

      const currentVotes = await stRIF.getPastVotes(
        holder.address,
        (await ethers.provider.getBlockNumber()) - 1,
      )

      expect(sevenDaysVotes).to.equal(0n)
      expect(currentVotes).to.equal(votingPower)
    })
  })
})
