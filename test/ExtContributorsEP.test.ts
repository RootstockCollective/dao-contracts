import { expect } from 'chai'
import hre, { ethers, ignition } from 'hardhat'
import { ExternalContributorsEcosystemPartner } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { extContributersEpProxyModule } from '../ignition/modules/ExternalContributorsEcosystemPartner'
import deployParams from '../params/ExtContributorsEP/testnet.json'

describe('ExternalContributorsEcosystemPartner NFT', () => {
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  const oldGangsters: SignerWithAddress[] = []
  let extContEP: ExternalContributorsEcosystemPartner

  before(async () => {
    ;[deployer, alice] = await ethers.getSigners()
    const contract = await ignition.deploy(extContributersEpProxyModule, {
      parameters: deployParams,
    })
    // impersonating airdrop receivers
    for (let i = 0; i < deployParams.ExtContributorsEP.airdropAddresses.length; i++) {
      const senderAddr = deployParams.ExtContributorsEP.airdropAddresses[i]
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [senderAddr],
      })
      const sender = await ethers.getSigner(senderAddr)
      oldGangsters.push(sender)
    }
    extContEP = contract.ExtContributorsEP as unknown as ExternalContributorsEcosystemPartner
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await extContEP.connect(deployer).name()).to.equal(deployParams.ExtContributorsEP.contractName)
      expect(await extContEP.symbol()).to.equal(deployParams.ExtContributorsEP.symbol)
    })

    it('should have performed airdrop during deployment', async () => {
      const ipfsCids = deployParams.ExtContributorsEP.ipfsCids
      for (let i = 0; i < oldGangsters.length; i++) {
        expect(await extContEP.ownerOf(i + 1)).to.equal(oldGangsters[i].address)
        expect(await extContEP.tokenURI(i + 1)).to.equal(`ipfs://${ipfsCids[i]}`)
      }
    })
  })

  describe('Transfer functionality is disabled', () => {
    it('transfers should be forbidden after airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            extContEP.connect(sender).transferFrom(sender.address, alice.address, i + 1),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })

    it('approvals should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            extContEP.connect(sender).approve(alice.address, i + 1),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })

    it('setApprovalForAll should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async sender => {
          await expect(
            extContEP.connect(sender).setApprovalForAll(alice.address, true),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })
  })
})
