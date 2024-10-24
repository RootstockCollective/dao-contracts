import { expect } from 'chai'
import hre, { ethers, ignition } from 'hardhat'
import { ExternalContributorsEcosystemPartner } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { extContributersEpProxyModule } from '../ignition/modules/ExternalContributorsEcosystemPartner'
import airdropReceivers from '../params/ExtContributorsEP/airdrop-testnet.json'

describe('ExternalContributorsEcosystemPartner NFT', () => {
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  const orgGangsters: SignerWithAddress[] = []
  let extContEP: ExternalContributorsEcosystemPartner

  before(async () => {
    ;[deployer, alice] = await ethers.getSigners()
    const contract = await ignition.deploy(extContributersEpProxyModule)
    extContEP = contract.ExtContributorsEP as unknown as ExternalContributorsEcosystemPartner
    // impersonating airdrop receivers
    for (let i = 0; i < airdropReceivers.length; i++) {
      const accountAddr = airdropReceivers[i].receiver
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [accountAddr],
      })
      const account = await ethers.getSigner(accountAddr)
      orgGangsters.push(account)
    }
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await extContEP.connect(deployer).name()).to.equal("OGExternalContributorsEcosystemPartner")
      expect(await extContEP.symbol()).to.equal("OGECEP")
    })

    it('should have zero total supply', async () => {
      expect(await extContEP.totalSupply()).to.equal(0)
    })

    it('should have an owner', async () => {
      expect(await extContEP.owner()).to.equal(deployer.address)
    })
  })

  describe('Airdrop', () => {
    it('should execute the initial airdrop after deployment', async () => {
      await expect(extContEP.connect(deployer).airdrop(airdropReceivers))
        .to.emit(extContEP, 'AirdropExecuted')
        .withArgs(airdropReceivers.length)
    })
    it('the Gangsters should own NFTs after the airdrop', async () => {
      await Promise.all(
        orgGangsters.map(async (gangster, i) => {
          expect(await extContEP.balanceOf(gangster.address)).to.equal(1)
          // token IDs: 1, 2, 3...
          expect(await extContEP.tokenOfOwnerByIndex(gangster.address, 0)).to.equal(i + 1)
        }),
      )
    })
    it('should top up total supply after the airdrop', async () => {
      expect(await extContEP.totalSupply()).to.equal(airdropReceivers.length)
    })
    it('non-owner cannot execute airdrop', async () => {
      await expect(extContEP.connect(alice).airdrop(airdropReceivers))
        .to.be.revertedWithCustomError(extContEP, 'OwnableUnauthorizedAccount')
        .withArgs(alice.address)
    })
    it('should execute the second airdrop to the same addresses', async () => {
      await expect(extContEP.connect(deployer).airdrop(airdropReceivers))
        .to.emit(extContEP, 'AirdropExecuted')
        .withArgs(airdropReceivers.length)
    })
    it('the Gangsters should own 2 NFTs after the second airdrop', async () => {
      await Promise.all(
        orgGangsters.map(async (gangster, i) => {
          const tokenId = airdropReceivers.length + i + 1
          expect(await extContEP.balanceOf(gangster.address)).to.equal(2)
          // token IDs: 6, 7, 8...
          expect(await extContEP.tokenOfOwnerByIndex(gangster.address, 1)).to.equal(tokenId)
          const cid = airdropReceivers[i].ipfsCid
          expect(await extContEP.tokenURI(tokenId)).to.equal(`ipfs://${cid}`)
        }),
      )
    })
  })

  describe('Transfer functionality is disabled', () => {
    it('transfers should be forbidden after airdrop', async () => {
      await Promise.all(
        orgGangsters.map(async (sender, i) => {
          await expect(
            extContEP.connect(sender).transferFrom(sender.address, alice.address, i + 1),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })

    it('approvals should be forbidden', async () => {
      await Promise.all(
        orgGangsters.map(async (sender, i) => {
          await expect(
            extContEP.connect(sender).approve(alice.address, i + 1),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })

    it('setApprovalForAll should be forbidden', async () => {
      await Promise.all(
        orgGangsters.map(async sender => {
          await expect(
            extContEP.connect(sender).setApprovalForAll(alice.address, true),
          ).to.be.revertedWithCustomError(extContEP, 'TransfersDisabled')
        }),
      )
    })
  })
})
