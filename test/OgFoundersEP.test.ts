import { expect } from 'chai'
import hre, { ethers, ignition } from 'hardhat'
import { OgFoundersEcosystemPartner } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ogFoundersEpProxyModule } from '../ignition/modules/OgFoundersEP'
import deployParams from '../params/OgFoundersEP/params.json'
import airdropReceivers from '../params/OgFoundersEP/airdrop-testnet.json'

describe('OgFoundersEcosystemPartner NFT', () => {
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  const oldGangsters: SignerWithAddress[] = []
  let ogFoundersEp: OgFoundersEcosystemPartner

  before(async () => {
    ;[deployer, alice] = await ethers.getSigners()
    const contract = await ignition.deploy(ogFoundersEpProxyModule, {
      parameters: deployParams,
    })
    ogFoundersEp = contract.ogFoundersEp as unknown as OgFoundersEcosystemPartner
    // impersonating airdrop receivers
    for (let i = 0; i < airdropReceivers.length; i++) {
      const accountAddr = airdropReceivers[i].receiver
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [accountAddr],
      })
      const account = await ethers.getSigner(accountAddr)
      oldGangsters.push(account)
    }
  })

  describe('Upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await ogFoundersEp.connect(deployer).name()).to.equal(deployParams.OgFoundersEP.contractName)
      expect(await ogFoundersEp.symbol()).to.equal(deployParams.OgFoundersEP.symbol)
    })

    it('should have zero total supply', async () => {
      expect(await ogFoundersEp.totalSupply()).to.equal(0)
    })

    it('should have an owner', async () => {
      expect(await ogFoundersEp.owner()).to.equal(deployer.address)
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
          expect(await ogFoundersEp.balanceOf(gangster.address)).to.equal(1)
          // token IDs: 1, 2, 3...
          expect(await ogFoundersEp.tokenOfOwnerByIndex(gangster.address, 0)).to.equal(i + 1)
        }),
      )
    })
    it('should top up total supply after the airdrop', async () => {
      expect(await ogFoundersEp.totalSupply()).to.equal(airdropReceivers.length)
    })
    it('non-owner cannot execute airdrop', async () => {
      await expect(ogFoundersEp.connect(alice).airdrop(airdropReceivers))
        .to.be.revertedWithCustomError(ogFoundersEp, 'OwnableUnauthorizedAccount')
        .withArgs(alice.address)
    })
    it('should execute the second airdrop to the same addresses', async () => {
      await expect(ogFoundersEp.connect(deployer).airdrop(airdropReceivers))
        .to.emit(ogFoundersEp, 'AirdropExecuted')
        .withArgs(airdropReceivers.length)
    })
    it('the Gangsters should own 2 NFTs after the second airdrop', async () => {
      await Promise.all(
        oldGangsters.map(async (gangster, i) => {
          expect(await ogFoundersEp.balanceOf(gangster.address)).to.equal(2)
          // token IDs: 6, 7, 8...
          expect(await ogFoundersEp.tokenOfOwnerByIndex(gangster.address, 1)).to.equal(
            airdropReceivers.length + i + 1,
          )
        }),
      )
    })
  })

  describe('Transfer functionality is disabled', () => {
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
  })
})
