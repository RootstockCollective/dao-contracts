import { expect } from 'chai'
import hre, { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployRif } from '../scripts/deploy-rif'
import { deployGovernor } from '../scripts/deploy-governor'
import { RIFToken, RootDao, StRIFToken } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployStRIF } from '../scripts/deploy-stRIF'

describe('RootDAO Contact', () => {
  const initialVotingDelay = 7200 // secs 1 day
  const initialVotingPeriod = 50400 // secs 1 week
  const initialProposalThreshold = 10n * 10n ** 18n

  let rif: { rifToken: RIFToken; rifAddress: string }
  let stRIF: StRIFToken
  let governor: RootDao
  let holders: SignerWithAddress[]
  let deployer: SignerWithAddress, acc1: SignerWithAddress, acc2: SignerWithAddress

  //   const rifTotalSupply = 10n ** 27n
  //   const votingPower = 10n ** 5n

  before(async () => {
    ;[deployer, acc1, acc2, ...holders] = await ethers.getSigners()
    rif = await loadFixture(deployRif)
    const deployGovToken = async () => deployStRIF(rif.rifAddress, deployer.address)
    stRIF = await loadFixture(deployGovToken)

    const deployDAO = async () => deployGovernor(await stRIF.getAddress(), deployer.address)
    governor = await loadFixture(deployDAO)
  })

  describe('Upon deployment', () => {
    it('should deploy all contracts', async () => {
      expect(rif.rifAddress).to.be.properAddress
      expect(await stRIF.getAddress()).to.be.properAddress
      expect(await governor.getAddress()).to.be.properAddress
    })

    it('voting delay should be initialized', async () => {
      expect(await governor.votingDelay()).to.equal(initialVotingDelay)
    })

    it('voting period length should be initialized', async () => {
      expect(await governor.votingPeriod()).to.equal(initialVotingPeriod)
    })

    it('proposal threshold should be initialized', async () => {
      expect(await governor.proposalThreshold()).to.equal(initialProposalThreshold)
    })
  })
})
