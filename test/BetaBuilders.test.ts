import { expect } from 'chai'
import hre, { ethers, ignition } from 'hardhat'
import { BetaBuildersRootstockCollective } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { betaBuildersModule } from '../ignition/modules/BetaBuildersModule'
import { BetaBuilders } from '../params/BetaBuildersModule/params.json'
import { setBalance } from '@nomicfoundation/hardhat-network-helpers'

describe('BetaBuildersRootstockCollective NFT', () => {
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  const oldGangsters: SignerWithAddress[] = []
  let betaBuildersEP: BetaBuildersRootstockCollective

  before(async () => {
    ;[deployer, alice] = await ethers.getSigners()
    const contract = await ignition.deploy(betaBuildersModule, {
      parameters: {
        BetaBuilders: {
          deployer: deployer.address,
        },
      },
    })
    betaBuildersEP = contract.ExtBetaBuildersEP as unknown as BetaBuildersRootstockCollective
    // impersonating airdrop receivers
    for (let i = 0; i < BetaBuilders.receivers.length; i++) {
      const accountAddr = BetaBuilders.receivers[i].receiver
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [accountAddr],
      })

      await setBalance(accountAddr, ethers.parseEther('2'))
      const account = await ethers.getSigner(accountAddr)
      oldGangsters.push(account)
    }
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await betaBuildersEP.connect(deployer).name()).to.equal('BetaBuildersRootstockCollective')
      expect(await betaBuildersEP.symbol()).to.equal('BB')
    })

    it('should have zero total supply', async () => {
      expect(await betaBuildersEP.totalSupply()).to.equal(0)
    })

    it('should have an owner', async () => {
      expect(await betaBuildersEP.owner()).to.equal(deployer.address)
    })
  })

  describe('Airdrop', () => {
    it('should execute the initial airdrop after deployment', async () => {
      await expect(betaBuildersEP.connect(deployer).airdrop(BetaBuilders.receivers))
        .to.emit(betaBuildersEP, 'AirdropExecuted')
        .withArgs(BetaBuilders.receivers.length)
    })
    it('the Gangsters should own NFTs after the airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (gangster, i) => {
          expect(await betaBuildersEP.balanceOf(gangster.address)).to.equal(1)
          // token IDs: 1, 2, 3...
          expect(await betaBuildersEP.tokenOfOwnerByIndex(gangster.address, 0)).to.equal(i + 1)
        }),
      )
    })
    it('should top up total supply after the airdrop', async () => {
      expect(await betaBuildersEP.totalSupply()).to.equal(BetaBuilders.receivers.length)
    })
    it('non-owner cannot execute airdrop', async () => {
      await expect(betaBuildersEP.connect(alice).airdrop(BetaBuilders.receivers))
        .to.be.revertedWithCustomError(betaBuildersEP, 'OwnableUnauthorizedAccount')
        .withArgs(alice.address)
    })
    it('should execute the second airdrop to the same addresses', async () => {
      await expect(betaBuildersEP.connect(deployer).airdrop(BetaBuilders.receivers))
        .to.emit(betaBuildersEP, 'AirdropExecuted')
        .withArgs(BetaBuilders.receivers.length)
    })
    it('the Gangsters should own 2 NFTs after the second airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (gangster, i) => {
          const tokenId = BetaBuilders.receivers.length + i + 1
          expect(await betaBuildersEP.balanceOf(gangster.address)).to.equal(2)
          // token IDs: 6, 7, 8...
          expect(await betaBuildersEP.tokenOfOwnerByIndex(gangster.address, 1)).to.equal(tokenId)
          const cid = BetaBuilders.receivers[i].ipfsCid
          expect(await betaBuildersEP.tokenURI(tokenId)).to.equal(`ipfs://${cid}`)
        }),
      )
    })
  })

  describe('Transfer functionality is disabled', () => {
    it('transfers should be forbidden after airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            betaBuildersEP.connect(sender).transferFrom(sender.address, alice.address, i + 1),
          ).to.be.revertedWithCustomError(betaBuildersEP, 'TransfersDisabled')
        }),
      )
    })

    it('approvals should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async (sender, i) => {
          await expect(
            betaBuildersEP.connect(sender).approve(alice.address, i + 1),
          ).to.be.revertedWithCustomError(betaBuildersEP, 'TransfersDisabled')
        }),
      )
    })

    it('setApprovalForAll should be forbidden', async () => {
      await Promise.all(
        oldGangsters.map(async sender => {
          await expect(
            betaBuildersEP.connect(sender).setApprovalForAll(alice.address, true),
          ).to.be.revertedWithCustomError(betaBuildersEP, 'TransfersDisabled')
        }),
      )
    })
  })
})
