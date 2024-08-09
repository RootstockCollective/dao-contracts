import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { EarlyAdopters } from '../typechain-types'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import EarlyAdoptersModule from '../ignition/modules/EarlyAdoptersModule'

const initialMaxSupply = 3
const ipfs = 'QmU1Bu9v1k9ecQ89cDE4uHrRkMKHE8NQ3mxhqFqNJfsKPd'
const nftUri = (id: number, _ipfs = ipfs) => `ipfs://${_ipfs}/${id}.json`

async function deploy() {
  const [defaultAdmin, upgrader] = await ethers.getSigners()
  const { ea } = await ignition.deploy(EarlyAdoptersModule, {
    parameters: {
      EarlyAdoptersProxy: {
        ipfs,
        numFiles: initialMaxSupply,
        defaultAdmin: defaultAdmin.address,
        upgrader: upgrader.address,
      },
    },
  })
  return ea as unknown as EarlyAdopters
}

describe('Early Adopters', () => {
  let ea: EarlyAdopters
  let eaAddress: string
  let deployer: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress

  const firstNftId = 1

  before(async () => {
    ;[deployer, alice, bob] = await ethers.getSigners()
    ea = await loadFixture(deploy)
    eaAddress = await ea.getAddress()
  })

  describe('Upon deployment', () => {
    it('should deploy Early Adopters NFT upgradable', async () => {
      expect(eaAddress).to.be.properAddress
    })

    it('it should set the maximum NFT supply', async () => {
      expect(await ea.maxSupply()).to.equal(initialMaxSupply)
    })

    it('should assign different roles to deployer, alice and bob', async () => {
      const defaultAdminRole = await ea.DEFAULT_ADMIN_ROLE()
      const upgraderRole = await ea.UPGRADER_ROLE()
      expect(await ea.hasRole(defaultAdminRole, deployer.address)).to.be.true
      expect(await ea.hasRole(upgraderRole, alice.address)).to.be.true
    })

    it('total minted tokens amount should be zero', async () => {
      expect(await ea.totalMinted()).to.equal(0)
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

  describe('Join Early Adopters community / Minting NFTs', () => {
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
  })

  describe('Transferring NFTs / changing EA membership', () => {
    it('Alice should not be able to transfer her token to zero address', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, ethers.ZeroAddress, firstNftId)
      await expect(transferTx).to.be.reverted
    })

    it('Alice should transfer her token to Bob', async () => {
      const transferTx = ea.connect(alice).transferFrom(alice.address, bob.address, firstNftId)
      await expect(transferTx).to.emit(ea, 'Transfer').withArgs(alice.address, bob.address, firstNftId)
    })

    it('Alice should no longer be a member of EA community', async () => {
      expect(await ea.balanceOf(alice.address)).to.equal(0)
    })

    it('Bob should now be a member of EA community', async () => {
      expect(await ea.balanceOf(bob.address)).to.equal(1)
    })

    it('Bob should now be the owner of the first NFT', async () => {
      expect(await ea.ownerOf(firstNftId)).to.equal(bob.address)
    })

    it('Bob should read his token URI by providing his account address', async () => {
      expect(await ea.tokenUriByOwner(bob.address)).to.equal(nftUri(firstNftId))
    })

    it('Deployer should not be able to transfer his ownership to Bob because Bob is already a member', async () => {
      await (await ea.connect(deployer).mint()).wait()
      expect(await ea.ownerOf(firstNftId + 1)).to.equal(deployer.address)
      await expect(ea.transferFrom(deployer.address, bob.address, firstNftId + 1))
        .to.be.revertedWithCustomError(ea, 'ERC721InvalidOwner')
        .withArgs(bob.address)
    })

    it('Alice should be able to join the EA community once again and get a new NFT instead of transferred one', async () => {
      await expect(await ea.connect(alice).mint())
        .to.emit(ea, 'Transfer')
        .withArgs(ethers.ZeroAddress, alice.address, firstNftId + 2)
    })

    it('total minted tokens amount should now be 3', async () => {
      expect(await ea.totalMinted()).to.equal(3)
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
  })

  describe('Adding the metadata files to IPNS folder', () => {
    const newSupply = initialMaxSupply + 50
    const newIpfs = 'QmcTpDpoe1Y7Fw61yxLRBbRRsJQaVoq6yyWkHNAnHZPWgt'

    it('total minted tokens amount should equal max supply', async () => {
      expect(await ea.totalMinted()).to.equal(await ea.maxSupply())
    })

    it('should not be possible to mint more tokens', async () => {
      await expect(ea.connect(bob).mint())
        .to.be.revertedWithCustomError(ea, 'OutOfTokens')
        .withArgs(initialMaxSupply)
    })

    it('should not be possible to set a new IPFS folder with insufficient files', async () => {
      await expect(ea.setIpfsFolder(initialMaxSupply, newIpfs))
        .to.be.revertedWithCustomError(ea, 'InvalidMaxSupply')
        .withArgs(initialMaxSupply, initialMaxSupply)
    })

    it('should set a new IPFS directory', async () => {
      await expect(ea.setIpfsFolder(newSupply, newIpfs))
        .to.emit(ea, 'IpfsFolderChanged')
        .withArgs(newSupply, newIpfs)
    })

    it('new max supply should be recorded', async () => {
      expect(await ea.maxSupply()).to.equal(newSupply)
    })

    it('should be possible to mint more tokens after topping up the max supply', async () => {
      await expect(ea.connect(bob).mint())
        .to.emit(ea, 'Transfer')
        .withArgs(ethers.ZeroAddress, bob.address, 4)
    })

    it('Alice should have the same token ID after the folder change', async () => {
      expect(await ea.tokenIdByOwner(alice.address)).to.equal(3)
    })

    it(`Alice's NFT should change URI after the IPFS directory change`, async () => {
      expect(await ea.tokenUriByOwner(alice.address)).to.equal(nftUri(3, newIpfs))
    })
  })
})
