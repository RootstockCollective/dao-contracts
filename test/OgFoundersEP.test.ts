import { expect } from 'chai'
import hre, { ethers, ignition } from 'hardhat'
import { OgFoundersEcosystemPartner } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ogFoundersEpProxyModule } from '../ignition/modules/OgFoundersEP'
import deployParams from '../params/OgFoundersEP/testnet.json'

describe('OgFoundersEcosystemPartner NFT', () => {
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  const oldGangsters: SignerWithAddress[] = []
  let ogFoundersEp: OgFoundersEcosystemPartner

  before(async () => {
    ;[deployer, alice, bob] = await ethers.getSigners()
    const contract = await ignition.deploy(ogFoundersEpProxyModule, {
      parameters: deployParams,
    })
    // impersonating airdrop receivers
    for (let i = 0; i < deployParams.OgFoundersEP.airdropAddresses.length; i++) {
      const senderAddr = deployParams.OgFoundersEP.airdropAddresses[i]
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [senderAddr],
      })
      const sender = await ethers.getSigner(senderAddr)
      oldGangsters.push(sender)
    }
    ogFoundersEp = contract.ogFoundersEp as unknown as OgFoundersEcosystemPartner
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await ogFoundersEp.name()).to.equal('OgFoundersEcosystemPartner')
      expect(await ogFoundersEp.symbol()).to.equal('OFE')
    })

    it('should have performed airdrop during deployment', async () => {
      const ipfsCids = deployParams.OgFoundersEP.ipfsCids
      for (let i = 0; i < oldGangsters.length; i++) {
        expect(await ogFoundersEp.ownerOf(i + 1)).to.equal(oldGangsters[i].address)
        expect(await ogFoundersEp.tokenURI(i + 1)).to.equal(`ipfs://${ipfsCids[i]}`)
      }
    })
  })

  describe('Transfer functionality', () => {
    it('transfers should be forbidden after airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            ogFoundersEp.connect(sender).transferFrom(sender.address, alice.address, i + 1),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })

    it('approvals should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            ogFoundersEp.connect(sender).approve(alice.address, i + 1),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })

    it('setApprovalForAll should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async sender => {
          await expect(
            ogFoundersEp.connect(sender).setApprovalForAll(alice.address, true),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })

    it('should allow transfer when transfers are enabled', async () => {
      await (await ogFoundersEp.connect(deployer).setTransfersAllowed(true)).wait()

      for (let i = 0; i < oldGangsters.length; i++) {
        const sender = oldGangsters[i]
        await expect(ogFoundersEp.connect(sender).transferFrom(sender.address, alice.address, i + 1))
          .to.emit(ogFoundersEp, 'Transfer')
          .withArgs(sender.address, alice.address, i + 1)
      }
      expect(await ogFoundersEp.balanceOf(alice.address)).to.equal(oldGangsters.length)
    })

    it('should not allow transfer when transfers are again disabled', async () => {
      await ogFoundersEp.connect(deployer).setTransfersAllowed(false)

      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            ogFoundersEp.connect(sender).transferFrom(sender.address, alice.address, i + 1),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })
  })

  describe('Minting functionality', () => {
    it('should mint a new token with correct URI after the airdrop', async () => {
      await ogFoundersEp.connect(deployer).setTransfersAllowed(true)
      const ipfsCid = 'QmPAFVDhdLJm61eKDZMV4ZiAz77U7rR869nWhrdRQQgnrA'
      await ogFoundersEp.connect(deployer).safeMint(bob.address, ipfsCid)
      const tokenId = oldGangsters.length + 1
      expect(await ogFoundersEp.ownerOf(tokenId)).to.equal(bob.address)
      expect(await ogFoundersEp.tokenURI(tokenId)).to.equal(`ipfs://${ipfsCid}`)
    })
  })
})
