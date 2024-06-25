import { expect } from 'chai'
import hre, { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployVeRif } from '../scripts/deploy-verif'
import { deployRif } from '../scripts/deploy-rif'
import { deployGovernor } from '../scripts/deploy-governor'
import { RIFToken, RootDao, VeRIFToken } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

describe('RootDAO Contact', () => {
  let rif: { rifToken: RIFToken; rifAddress: string }
  let veRIF: VeRIFToken
  let governor: RootDao
  let holders: SignerWithAddress[]
  let deployer: SignerWithAddress, acc1: SignerWithAddress, acc2: SignerWithAddress

  //   const rifTotalSupply = 10n ** 27n
  //   const votingPower = 10n ** 5n
  //   const governorRole = ethers.utils.solidityKeccak256(['string'], ['GOVERNOR_ROLE'])

  before(async () => {
    ;[deployer, acc1, acc2, ...holders] = await ethers.getSigners()
    rif = await loadFixture(deployRif)
    const deployGovToken = async () => deployVeRif(rif.rifAddress, deployer.address)
    veRIF = await loadFixture(deployGovToken)

    const deployDAO = async () => deployGovernor(await veRIF.getAddress(), deployer.address)
    governor = await loadFixture(deployDAO)
  })

  describe('Upon deployment', () => {
    it('should deploy all contracts', async () => {
      expect(rif.rifAddress).to.be.properAddress
      expect(await veRIF.getAddress()).to.be.properAddress
      expect(await governor.getAddress()).to.be.properAddress
    })
  })
})
