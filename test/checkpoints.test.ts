import type { RIFToken, StRIFToken } from '../types/ethers-contracts/index.js'
import { ethers, expect, type Signer, networkHelpers } from './config.js'
import { deployContracts } from './deployContracts.js'

describe('stRIFToken and Governor Checkpoints', () => {
  let holder: Signer
  let rif: RIFToken
  let stRIF: StRIFToken
  const votingPower = 10n * 10n ** 18n
  const sevenDays = 20160

  before(async () => {
    ;[holder] = await ethers.getSigners()
    ;({ rif, stRIF } = await deployContracts())
  })

  describe('stRIF Token checkpoints', () => {
    const depositAndDelegateUtil = async (acc: Signer) => {
      const transferRIFTx = await rif.transfer(await acc.getAddress(), votingPower)
      transferRIFTx.wait()
      const approveTx = await rif.connect(acc).approve(stRIF.getAddress(), votingPower)
      await approveTx.wait()
      const depositAndDelegateTx = await stRIF
        .connect(acc)
        .depositAndDelegate(await acc.getAddress(), votingPower)
      await depositAndDelegateTx.wait()
    }

    const withdrawToUtil = async (acc: Signer) => {
      const withDrawTx = await stRIF.connect(acc).withdrawTo(await acc.getAddress(), votingPower)
      await withDrawTx.wait()
    }

    it('each delegate function call should create a checkpoint ', async () => {
      await depositAndDelegateUtil(holder)
      expect(await stRIF.balanceOf(await holder.getAddress())).to.equal(votingPower)
      expect(await stRIF.numCheckpoints(await holder.getAddress())).to.equal(1n)

      await depositAndDelegateUtil(holder)
      expect(await stRIF.balanceOf(await holder.getAddress())).to.equal(votingPower * 2n)
      expect(await stRIF.numCheckpoints(await holder.getAddress())).to.equal(2n)
    })

    it('each withdrawTo should also create a checkpoint', async () => {
      await withdrawToUtil(holder)
      expect(await stRIF.balanceOf(await holder.getAddress())).to.equal(votingPower)
      expect(await stRIF.numCheckpoints(await holder.getAddress())).to.equal(3n)

      await withdrawToUtil(holder)
      expect(await stRIF.balanceOf(await holder.getAddress())).to.equal(0n)
      expect(await stRIF.numCheckpoints(await holder.getAddress())).to.equal(4n)
    })

    it('should fetch amount of voting power correctly based on the timepoint argument', async () => {
      await networkHelpers.mine(sevenDays + 1)
      await depositAndDelegateUtil(holder)
      await networkHelpers.mine(1)

      const sevenDaysVotes = await stRIF.getPastVotes(
        await holder.getAddress(),
        (await ethers.provider.getBlockNumber()) - sevenDays,
      )

      const currentVotes = await stRIF.getPastVotes(
        await holder.getAddress(),
        (await ethers.provider.getBlockNumber()) - 1,
      )

      expect(sevenDaysVotes).to.equal(0n)
      expect(currentVotes).to.equal(votingPower)
    })
  })
})
