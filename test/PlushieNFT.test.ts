import { expect } from 'chai'
import { ethers } from 'hardhat'
import { ignition } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { PlushieNftModule } from '../ignition/modules/PlushieNftModule'
import { type PlushieNFT } from '../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

const maxSupply = 400
const ipfsFolderCid = 'QmPaCP36tFjXp7xqcPi4ggatL7w4dsWKGTv1kpaSVkv9KW'
const minterRole = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
const whitelistGuardRole = ethers.keccak256(ethers.toUtf8Bytes('WHITELIST_GUARD_ROLE'))
const adminRole = ethers.ZeroHash

async function deployPlushieNft() {
  const { plushieNft } = await ignition.deploy(PlushieNftModule, {
    parameters: {
      PlushieNft: {
        maxSupply,
        ipfsFolderCid,
      },
    },
  })
  return plushieNft as unknown as PlushieNFT
}

describe('Plushie NFT', () => {
  let plushie: PlushieNFT
  let deployer: SignerWithAddress
  let whitelistGuardAlice: SignerWithAddress
  let whitelistGuardBob: SignerWithAddress
  let stranger: SignerWithAddress
  let minters: SignerWithAddress[]

  before(async () => {
    ;[deployer, whitelistGuardAlice, whitelistGuardBob, stranger, ...minters] = await ethers.getSigners()
    minters = minters.slice(0, 2)
    plushie = await loadFixture(deployPlushieNft)
  })

  describe('upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await plushie.name()).to.equal('PlushieNFT')
      expect(await plushie.symbol()).to.equal('PLU')
    })
    it('Minter role should be set up', async () => {
      expect(await plushie.MINTER_ROLE()).to.equal(minterRole)
    })
    it('Admin role should be set up', async () => {
      expect(await plushie.DEFAULT_ADMIN_ROLE()).to.equal(adminRole)
    })
    it('Whitelist Guard role should be set up', async () => {
      expect(await plushie.WHITELIST_GUARD_ROLE()).to.equal(whitelistGuardRole)
    })
    it('Minter role should be administrated by Whitelist guard role', async () => {
      expect(await plushie.getRoleAdmin(minterRole)).to.equal(whitelistGuardRole)
    })
    it('Deployer should be granted the admin role', async () => {
      expect(await plushie.hasRole(adminRole, deployer.address)).to.be.true
    })
    it('Deployer should be granted the Whitelist guard role', async () => {
      expect(await plushie.hasRole(whitelistGuardRole, deployer.address)).to.be.true
    })
  })

  describe('Role Management & Access Control', () => {
    describe('Happy path', () => {
      it('Admin should grant Whitelist Guard role to both Alice and Bob', async () => {
        const tx = plushie.addWhitelistGuards([whitelistGuardAlice.address, whitelistGuardBob.address])
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(whitelistGuardRole, whitelistGuardAlice.address, deployer.address)
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(whitelistGuardRole, whitelistGuardBob.address, deployer.address)
      })
      it('Alice and Bob should be whitelist guards now', async () => {
        expect(await plushie.hasRole(whitelistGuardRole, whitelistGuardAlice.address)).to.be.true
        expect(await plushie.hasRole(whitelistGuardRole, whitelistGuardBob.address)).to.be.true
      })
      it('Whitelist guards can whitelist addresses', async () => {
        const tx = plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([minters[0].address, minters[1].address])

        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, minters[0].address, whitelistGuardAlice.address)
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, minters[1].address, whitelistGuardAlice.address)

        // Verify they have minter roles
        expect(await plushie.hasRole(minterRole, minters[0].address)).to.be.true
        expect(await plushie.hasRole(minterRole, minters[1].address)).to.be.true
      })
    })
    describe('Sad path', () => {
      it('Stranger cannot grant himself Whitelist Guard role', async () => {
        await expect(plushie.connect(stranger).addWhitelistGuards([stranger.address]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(stranger.address, adminRole)
      })
      it('Whitelist Guards cannot grant Whitelist Guard role to extraneous address', async () => {
        await expect(plushie.connect(whitelistGuardAlice).addWhitelistGuards([stranger.address]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(whitelistGuardAlice.address, adminRole)
      })
      it('Default admin cannot renounce his role when he is the last admin', async () => {
        await expect(plushie.renounceRole(adminRole, deployer.address)).to.be.revertedWithCustomError(
          plushie,
          'AdminRoleViolation',
        )
      })
      it('Cannot grant second admin role - only one admin allowed', async () => {
        await expect(plushie.grantRole(adminRole, stranger.address)).to.be.revertedWithCustomError(
          plushie,
          'AdminRoleViolation',
        )
      })
      it('Owner removes whitelist guard role, then that address tries to modify whitelist', async () => {
        // Remove Alice's whitelist guard role
        await plushie.removeWhitelistGuards([whitelistGuardAlice.address])
        // Verify Alice no longer has the role
        expect(await plushie.hasRole(whitelistGuardRole, whitelistGuardAlice.address)).to.be.false
        // Alice tries to whitelist someone but should fail
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([stranger.address]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(whitelistGuardAlice.address, whitelistGuardRole)
        // return guard role to Alice
        await plushie.addWhitelistGuards([whitelistGuardAlice.address])
      })
    })
  })
})
