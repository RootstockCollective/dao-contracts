import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { EarlyAdopters } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule'

async function deploy() {
  const { ea } = await ignition.deploy(EarlyAdoptersModule)
  return ea as unknown as EarlyAdopters
}

describe('Early Adopters', () => {
  let ea: EarlyAdopters
  let eaAddress: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress

  const cidMock = 'QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX'

  before(async () => {
    ;[deployer, alice, bob] = await ethers.getSigners()
    ea = await loadFixture(deploy)
    eaAddress = await ea.getAddress()
  })

  describe('Upon deployment', () => {
    it('should deploy Early Adopters NFT upgradable', async () => {
      expect(eaAddress).to.be.properAddress
    })

    it('deployer should be granted Default Admin, Upgrader and Cids Loader roles', async () => {
      const adminRole = await ea.DEFAULT_ADMIN_ROLE()
      const upgrader = await ea.UPGRADER_ROLE()
      const cidsLoader = await ea.CIDS_LOADER_ROLE()
      expect(await ea.hasRole(adminRole, deployer.address)).to.be.true
      expect(await ea.hasRole(upgrader, deployer.address)).to.be.true
      expect(await ea.hasRole(cidsLoader, deployer.address)).to.be.true
    })

    it('should be no CIDs available for minting yet', async () => {
      expect(await ea.cidsAvailable()).to.equal(0)
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
  })

  describe('Loading IPFS CIDs to EA smart contract', () => {
    it('should be OK to load 0 cids', async () => {
      await expect(ea.loadCids([])).to.emit(ea, 'CidsLoaded').withArgs(0, 0)
    })

    it('should load maximum of CIDs into the EA contract', async () => {
      // URIs will be ipfs://0, ipfs://1...
      await expect(ea.loadCids([...Array(50).keys()].map(String)))
        .to.emit(ea, 'CidsLoaded')
        .withArgs(50, 50)
    })

    it('should be 50 cids available for minting now', async () => {
      expect(await ea.cidsAvailable()).to.equal(50)
    })

    it('should not be possible to load more than 50 CIDs at once', async () => {
      await expect(ea.loadCids(Array(55).fill(cidMock)))
        .to.be.revertedWithCustomError(ea, 'InvalidCidsAmount')
        .withArgs(55, 50)
    })
  })

  describe('Join Early Adopters community / Minting NFTs', () => {
    it('Alice should join the EA community by minting an Nft', async () => {
      const mintTx = await ea.connect(alice).mint()
      const newId = 0
      await expect(mintTx).to.emit(ea, 'Transfer').withArgs(ethers.ZeroAddress, alice.address, newId)
    })

    it('Alice cannot join the community second time', async () => {
      await expect(ea.connect(alice).mint())
        .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
        .withArgs(alice.address)
    })

    it('Alice should be a member of EA community', async () => {
      expect(await ea.balanceOf(alice.address)).to.equal(1)
    })

    it('Alice should be the owner of NFT with ID 0', async () => {
      expect(await ea.ownerOf(0)).to.equal(alice.address)
    })

    it('Alice should get her token ID by providing her account address', async () => {
      expect(await ea.tokenIdByOwner(alice.address)).to.equal(0)
    })

    it('Alice should read her token URI by providing her account address', async () => {
      expect(await ea.tokenUriByOwner(alice.address)).to.equal(`ipfs://0`)
    })
  })

  describe('Transferring NFTs / changing EA membership', () => {
    it('Alice should not be able to transfer her token to zero address', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, ethers.ZeroAddress, 0)
      await expect(transferTx).to.be.reverted
    })

    it('Alice should transfer her token to Bob', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, bob.address, 0)
      await expect(transferTx).to.emit(ea, 'Transfer').withArgs(alice.address, bob.address, 0)
    })

    it('Alice should no longer be a member of EA community', async () => {
      expect(await ea.balanceOf(alice.address)).to.equal(0)
    })

    it('Bob should now be a member of EA community', async () => {
      expect(await ea.balanceOf(bob.address)).to.equal(1)
    })

    it('Bob should now be the owner of NFT with ID 0', async () => {
      expect(await ea.ownerOf(0)).to.equal(bob.address)
    })

    it('Bob should read his token URI by providing his account address', async () => {
      expect(await ea.tokenUriByOwner(bob.address)).to.equal(`ipfs://0`)
    })

    it('Deployer should not be able to transfer his ownership to Bob because Bob is already a member', async () => {
      await (await ea.connect(deployer).mint()).wait()
      expect(await ea.ownerOf(1)).to.equal(deployer.address)
      await expect(ea.transferFrom(deployer.address, bob.address, 1))
        .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
        .withArgs(bob.address)
    })

    it('Alice should be able to join the EA community once again and get a new NFT instead of transferred one', async () => {
      await expect(await ea.connect(alice).mint())
        .to.emit(ea, 'Transfer')
        .withArgs(ethers.ZeroAddress, alice.address, 2)
    })
  })
})
