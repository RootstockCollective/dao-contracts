import type { OGPartnersRootstockCollective } from '../types/ethers-contracts/index.js'
import type { Signer } from 'ethers'
import { ethers, expect, ignition } from './config.js'
import { ogPartnersModule } from '../ignition/modules/OGPartnersModule.js'
import airdropReceivers from '../params/OgPartners/airdrop-testnet.json'

describe('OGPartnersRootstockCollective NFT', () => {
  let deployer: Signer
  let alice: Signer
  const oldGangsters: Signer[] = []
  let ogFoundersEp: OGPartnersRootstockCollective

  before(async () => {
    ;[deployer, alice] = await ethers.getSigners()
    const contract = await ignition.deploy(ogPartnersModule)
    ogFoundersEp = contract.ogFoundersEp as unknown as OGPartnersRootstockCollective
    // impersonating airdrop receivers
    for (let i = 0; i < airdropReceivers.length; i++) {
      const accountAddr = airdropReceivers[i].receiver
      await ethers.provider.send('hardhat_impersonateAccount', [accountAddr])
      const account = await ethers.getSigner(accountAddr)
      oldGangsters.push(account)
    }
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await ogFoundersEp.connect(deployer).name()).to.equal('OGPartnersRootstockCollective')
      expect(await ogFoundersEp.symbol()).to.equal('OGP')
    })

    it('should have zero total supply', async () => {
      expect(await ogFoundersEp.totalSupply()).to.equal(0)
    })

    it('should have an owner', async () => {
      expect(await ogFoundersEp.owner()).to.equal(await deployer.getAddress())
    })
  })

  describe('Airdrop', () => {
    it('should execute the initial airdrop after deployment', async () => {
      await expect(ogFoundersEp.connect(deployer).airdrop(airdropReceivers))
        .to.emit(ogFoundersEp, 'AirdropExecuted')
        .withArgs(airdropReceivers.length)
    })
    it('the Gangsters should own NFTs after the airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (gangster, i) => {
          const gangsterAddress = await gangster.getAddress()
          expect(await ogFoundersEp.balanceOf(gangsterAddress)).to.equal(1)
          // token IDs: 1, 2, 3...
          expect(await ogFoundersEp.tokenOfOwnerByIndex(gangsterAddress, 0)).to.equal(i + 1)
        }),
      )
    })
    it('should top up total supply after the airdrop', async () => {
      expect(await ogFoundersEp.totalSupply()).to.equal(airdropReceivers.length)
    })
    it('non-owner cannot execute airdrop', async () => {
      await expect(ogFoundersEp.connect(alice).airdrop(airdropReceivers))
        .to.be.revertedWithCustomError(ogFoundersEp, 'OwnableUnauthorizedAccount')
        .withArgs(await alice.getAddress())
    })
    it('should execute the second airdrop to the same addresses', async () => {
      await expect(ogFoundersEp.connect(deployer).airdrop(airdropReceivers))
        .to.emit(ogFoundersEp, 'AirdropExecuted')
        .withArgs(airdropReceivers.length)
    })
    it('the Gangsters should own 2 NFTs after the second airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (gangster, i) => {
          const gangsterAddress = await gangster.getAddress()
          const tokenId = airdropReceivers.length + i + 1
          expect(await ogFoundersEp.balanceOf(gangsterAddress)).to.equal(2)
          // token IDs: 6, 7, 8...
          expect(await ogFoundersEp.tokenOfOwnerByIndex(gangsterAddress, 1)).to.equal(tokenId)
          const cid = airdropReceivers[i].ipfsCid
          expect(await ogFoundersEp.tokenURI(tokenId)).to.equal(`ipfs://${cid}`)
        }),
      )
    })
  })

  describe('Transfer functionality is disabled', () => {
    it('transfers should be forbidden after airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          const senderAddress = await sender.getAddress()
          const aliceAddress = await alice.getAddress()
          await expect(
            ogFoundersEp.connect(sender).transferFrom(senderAddress, aliceAddress, i + 1),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })

    it('approvals should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          const aliceAddress = await alice.getAddress()
          await expect(
            ogFoundersEp.connect(sender).approve(aliceAddress, i + 1),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })

    it('setApprovalForAll should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async sender => {
          const aliceAddress = await alice.getAddress()
          await expect(
            ogFoundersEp.connect(sender).setApprovalForAll(aliceAddress, true),
          ).to.be.revertedWithCustomError(ogFoundersEp, 'TransfersDisabled')
        }),
      )
    })
  })
})
