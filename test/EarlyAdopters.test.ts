import { expect } from 'chai'
import { ethers } from 'hardhat'
import { EarlyAdopters, StRIFToken, RIFToken } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployContracts, deployNFT } from './deployContracts'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

const initialNftSupply = 3
const ipfsCid = 'QmU1Bu9v1k9ecQ89cDE4uHrRkMKHE8NQ3mxhqFqNJfsKPd'
const stRifThreshold = 100n * 10n ** 18n
const nftUri = (id: number, _ipfs = ipfsCid) => `ipfs://${_ipfs}/${id}.json`

describe('Early Adopters', () => {
  let ea: EarlyAdopters
  let rif: RIFToken
  let stRIF: StRIFToken
  let eaAddress: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let mike: SignerWithAddress

  const firstNftId = 1

  async function sendStRifsTo(...holders: SignerWithAddress[]) {
    for (const holder of holders) {
      await (await rif.transfer(holder.address, stRifThreshold)).wait()
      await (await rif.connect(holder).approve(await stRIF.getAddress(), stRifThreshold)).wait()
      await (await stRIF.connect(holder).depositAndDelegate(holder.address, stRifThreshold)).wait()
    }
  }

  before(async () => {
    ;;[deployer, alice, bob, mike] = await ethers.getSigners()
    ;({ rif, stRIF } = await loadFixture(deployContracts))
    ea = await deployNFT(ipfsCid, initialNftSupply, await stRIF.getAddress(), stRifThreshold)
    eaAddress = await ea.getAddress()
    await sendStRifsTo(deployer, alice, bob)
  })

  describe('Upon deployment', () => {
    it('should deploy Early Adopters NFT upgradable', async () => {
      expect(eaAddress).to.be.properAddress
    })

    it('should assign different roles to deployer, alice and bob', async () => {
      const defaultAdminRole = await ea.DEFAULT_ADMIN_ROLE()
      const upgraderRole = await ea.UPGRADER_ROLE()
      expect(await ea.hasRole(defaultAdminRole, deployer.address)).to.be.true
      expect(await ea.hasRole(upgraderRole, alice.address)).to.be.true
    })

    it('all tokens should be available for minting', async () => {
      expect(await ea.tokensAvailable()).to.equal(initialNftSupply)
    })

    it('deployer, Alice and Bob should own no tokens', async () => {
      expect(await ea.balanceOf(deployer.address)).to.equal(0)
      expect(await ea.balanceOf(alice.address)).to.equal(0)
      expect(await ea.balanceOf(bob.address)).to.equal(0)
    })

    it('deployer, Alice and Bob should should have no token URIs', async () => {
      await Promise.all(
        [deployer, alice, bob].map(async owner => {
          await expect(ea.tokenUriByOwner(owner.address))
            .to.be.revertedWithCustomError(ea, 'ERC721OutOfBoundsIndex')
            .withArgs(owner.address, 0)
        }),
      )
    })

    it('there should be no members in the EA community yet', async () => {
      expect(await ea.totalSupply()).to.equal(0)
    })

    it('deployer, Alice and Bob should should have enough stRIFs for minting NFTs', async () => {
      await Promise.all(
        [deployer, alice, bob].map(async owner => {
          expect(await stRIF.balanceOf(owner.address)).to.equal(stRifThreshold)
        }),
      )
    })
  })

  describe('Join Early Adopters community / Minting NFTs', () => {
    it('Mike cannot mint an NFT because he doesn`t own enough StRIFs', async () => {
      await expect(ea.connect(mike).mint())
        .to.be.revertedWithCustomError(ea, 'BelowStRifThreshold')
        .withArgs(0, stRifThreshold)
    })
    it('Alice should join the EA community by minting an Nft', async () => {
      const mintTx = await ea.connect(alice).mint()
      await expect(mintTx).to.emit(ea, 'Transfer').withArgs(ethers.ZeroAddress, alice.address, firstNftId)
    })

    it('Alice cannot join the community second time', async () => {
      await expect(ea.connect(alice).mint())
        .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
        .withArgs(alice.address)
    })

    it('Alice should be a member of EA community', async () => {
      expect(await ea.balanceOf(alice.address)).to.equal(1)
    })

    it('Alice should be owner of the first NFT', async () => {
      expect(await ea.ownerOf(firstNftId)).to.equal(alice.address)
    })

    it('Alice should get her token ID by providing her account address', async () => {
      expect(await ea.tokenIdByOwner(alice.address)).to.equal(firstNftId)
    })

    it('Alice should read her token URI by providing her account address', async () => {
      expect(await ea.tokenUriByOwner(alice.address)).to.equal(nftUri(firstNftId))
    })

    it('EA community should now have 1 member', async () => {
      expect(await ea.totalSupply()).to.equal(1)
    })
  })

  describe('Transferring NFTs / changing EA membership', () => {
    it('Alice should not be able to transfer her token during the distribution', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, bob.address, firstNftId)
      const tokensAvailable = await ea.tokensAvailable()
      await expect(transferTx)
        .to.be.revertedWithCustomError(ea, 'DistributionActive')
        .withArgs(tokensAvailable)
    })

    it('Should close distribution by minting 2 more tokens', async () => {
      await Promise.all(
        [deployer, bob].map(async (signer, i) => {
          await expect(ea.connect(signer).mint())
            .to.emit(ea, 'Transfer')
            .withArgs(ethers.ZeroAddress, signer.address, i + 2)
        }),
      )
      expect(await ea.tokensAvailable()).to.equal(0)
    })

    it('the number of members in the EA community should increase by 2', async () => {
      expect(await ea.totalSupply()).to.equal(3)
    })

    it('Alice should not be able to transfer her token to zero address', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, ethers.ZeroAddress, firstNftId)
      await expect(transferTx).to.be.reverted
    })

    it('Alice should transfer her token to Mike', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, mike.address, firstNftId)
      await expect(transferTx).to.emit(ea, 'Transfer').withArgs(alice.address, mike.address, firstNftId)
    })

    it('Alice should no longer be a member of EA community', async () => {
      expect(await ea.balanceOf(alice.address)).to.equal(0)
    })

    it('Mike should now be a member of EA community', async () => {
      expect(await ea.balanceOf(mike.address)).to.equal(1)
    })

    it('Mike should now be the owner of the first NFT', async () => {
      expect(await ea.ownerOf(firstNftId)).to.equal(mike.address)
    })

    it('Mike should read his token URI by providing his account address', async () => {
      expect(await ea.tokenUriByOwner(mike.address)).to.equal(nftUri(firstNftId))
    })

    it('the number of members in the EA community should not change', async () => {
      expect(await ea.totalSupply()).to.equal(3)
    })

    it('Deployer should not be able to transfer his ownership to Bob because Bob is already a member', async () => {
      expect(await ea.ownerOf(firstNftId + 1)).to.equal(deployer.address)
      await expect(ea.transferFrom(deployer.address, bob.address, firstNftId + 1))
        .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
        .withArgs(bob.address)
    })
  })

  describe('Burning NFTs', () => {
    it('Bob should be able to burn his NFT', async () => {
      const burnTx = await ea.connect(bob)['burn()']()
      await expect(burnTx).to.emit(ea, 'Transfer')
    })

    it('Bob should no longer be a member of the community', async () => {
      expect(await ea.balanceOf(bob.address)).to.equal(0)
    })

    it('Non-member should not be able to burn', async () => {
      await expect(ea.connect(bob)['burn()']())
        .to.be.revertedWithCustomError(ea, 'ERC721OutOfBoundsIndex')
        .withArgs(bob.address, 0)
    })

    it('the number of members in the EA community should decrease by 1', async () => {
      expect(await ea.totalSupply()).to.equal(2)
    })
  })

  describe('Adding the metadata files to IPNS folder', () => {
    const newSupply = initialNftSupply + 50
    const newIpfs = 'QmcTpDpoe1Y7Fw61yxLRBbRRsJQaVoq6yyWkHNAnHZPWgt'

    it('no more tokens should be available for minting', async () => {
      expect(await ea.tokensAvailable()).to.equal(0)
    })

    it('should not be possible to mint more tokens', async () => {
      await expect(ea.connect(alice).mint())
        .to.be.revertedWithCustomError(ea, 'OutOfTokens')
        .withArgs(initialNftSupply)
    })

    it('should not be possible to set a new IPFS folder with insufficient files', async () => {
      await expect(ea.setIpfsFolder(initialNftSupply, newIpfs))
        .to.be.revertedWithCustomError(ea, 'InvalidMaxSupply')
        .withArgs(initialNftSupply, initialNftSupply)
    })

    it('should set a new IPFS directory', async () => {
      await expect(ea.setIpfsFolder(newSupply, newIpfs))
        .to.emit(ea, 'IpfsFolderChanged')
        .withArgs(newSupply, newIpfs)
    })

    it('new tokens should be available for minting', async () => {
      expect(await ea.tokensAvailable()).to.equal(newSupply - initialNftSupply)
    })

    it('Alice should be able to join the EA community again after topping up the max supply', async () => {
      await expect(await ea.connect(alice).mint())
        .to.emit(ea, 'Transfer')
        .withArgs(ethers.ZeroAddress, alice.address, 4)
    })

    it('should increase the number of members in the EA by 1', async () => {
      expect(await ea.totalSupply()).to.equal(3)
    })

    it('Deployer should have the same token ID after the folder change', async () => {
      expect(await ea.tokenIdByOwner(deployer.address)).to.equal(2)
    })

    it(`Deployer's NFT should change URI after the IPFS directory change`, async () => {
      expect(await ea.tokenUriByOwner(deployer.address)).to.equal(nftUri(2, newIpfs))
    })
  })
})
