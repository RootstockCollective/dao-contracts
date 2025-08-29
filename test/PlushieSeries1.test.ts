import { expect } from 'chai'
import { ethers } from 'hardhat'
import { ignition } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { PlushieSeries1Module } from '../ignition/modules/PlushieSeries1Module'
import { RIFToken, StRIFToken, type PlushieSeries1RootstockCollective } from '../typechain-types'
import { deployContracts } from './deployContracts'

const maxSupply = 10
const stRifThreshold = 1n * 10n ** 18n // 1 StRIF
const ipfsFolderCid = 'QmPaCP36tFjXp7xqcPi4ggatL7w4dsWKGTv1kpaSVkv9KW'
const minterRole = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
const whitelistGuardRole = ethers.keccak256(ethers.toUtf8Bytes('WHITELIST_GUARD_ROLE'))
const adminRole = ethers.ZeroHash

async function deployPlushieNft(stRifAddress: string) {
  const { plushieSeries1 } = await ignition.deploy(PlushieSeries1Module, {
    parameters: {
      PlushieSeries1: {
        stRif: stRifAddress,
        stRifThreshold,
        maxSupply,
        ipfsFolderCid,
      },
    },
  })
  return plushieSeries1 as unknown as PlushieSeries1RootstockCollective
}

describe('PlushieSeries1RootstockCollective NFT', () => {
  let plushie: PlushieSeries1RootstockCollective
  let deployer: SignerWithAddress
  let whitelistGuardAlice: SignerWithAddress
  let whitelistGuardBob: SignerWithAddress
  let stranger: SignerWithAddress
  let minters: SignerWithAddress[]
  let rif: RIFToken
  let stRIF: StRIFToken

  async function sendStRifsTo(...holders: SignerWithAddress[]) {
    for (const holder of holders) {
      await (await rif.transfer(holder.address, stRifThreshold)).wait()
      await (await rif.connect(holder).approve(await stRIF.getAddress(), stRifThreshold)).wait()
      await (await stRIF.connect(holder).depositAndDelegate(holder.address, stRifThreshold)).wait()
    }
  }

  before(async () => {
    ;[deployer, whitelistGuardAlice, whitelistGuardBob, stranger, ...minters] = await ethers.getSigners()
    ;({ stRIF, rif } = await deployContracts())
    await sendStRifsTo(...minters.slice(0, -1))
    const stRifAddress = await stRIF.getAddress()
    plushie = await deployPlushieNft(stRifAddress)
  })

  describe('upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await plushie.name()).to.equal('PlushieSeries1RootstockCollective')
      expect(await plushie.symbol()).to.equal('PS1')
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
    it('Should set max supply correctly', async () => {
      expect(await plushie.maxSupply()).to.equal(maxSupply)
    })
    it('NFT contract should have Max supply of available tokens', async () => {
      expect(await plushie.tokensAvailable()).to.equal(maxSupply)
    })
    it('Should set StRif as underlying token', async () => {
      expect(await plushie.underlyingToken()).to.equal(await stRIF.getAddress())
    })
    it('Should set StRif threshold for NFT minting', async () => {
      expect(await plushie.underlyingTokenThreshold()).to.equal(stRifThreshold)
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
      it('Deployer can transfer DEFAULT_ADMIN_ROLE to another address', async () => {
        const newAdmin = minters[0] // Use first minter as new admin

        // Verify initial state: deployer has admin role, newAdmin doesn't
        expect(await plushie.hasRole(adminRole, deployer.address)).to.be.true
        expect(await plushie.hasRole(adminRole, newAdmin.address)).to.be.false
        expect(await plushie.getRoleMemberCount(adminRole)).to.equal(1)

        // Transfer admin role to new address
        const tx = plushie.transferDefaultAdminRole(newAdmin.address)
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(adminRole, newAdmin.address, deployer.address)
        await expect(tx)
          .to.emit(plushie, 'RoleRevoked')
          .withArgs(adminRole, deployer.address, deployer.address)

        // Verify final state: only newAdmin has admin role
        expect(await plushie.hasRole(adminRole, deployer.address)).to.be.false
        expect(await plushie.hasRole(adminRole, newAdmin.address)).to.be.true
        expect(await plushie.getRoleMemberCount(adminRole)).to.equal(1)

        // Verify new admin can perform admin functions
        const newCid = 'QmNewTestCid123'
        await expect(plushie.connect(newAdmin).setFolderIpfsCid(newCid))
          .to.emit(plushie, 'PlushieNftFolderIpfsCidChanged')
          .withArgs(ipfsFolderCid, newCid)

        // give admin role back for testing convenience
        await plushie
          .connect(newAdmin)
          .transferDefaultAdminRole(deployer.address)
          .then(tx => tx.wait())
        await plushie.setFolderIpfsCid(ipfsFolderCid).then(tx => tx.wait())
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
          'PlushieNftAdminRoleViolation',
        )
      })
      it('Cannot grant second admin role - only one admin allowed', async () => {
        await expect(plushie.grantRole(adminRole, stranger.address)).to.be.revertedWithCustomError(
          plushie,
          'PlushieNftAdminRoleViolation',
        )
      })
      it('Owner removes whitelist guard role, then that address tries to modify whitelist', async () => {
        // Remove Alice's whitelist guard role
        await plushie.removeWhitelistGuards([whitelistGuardAlice.address]).then(tx => tx.wait())
        // Verify Alice no longer has the role
        expect(await plushie.hasRole(whitelistGuardRole, whitelistGuardAlice.address)).to.be.false
        // Alice tries to whitelist someone but should fail
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([stranger.address]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(whitelistGuardAlice.address, whitelistGuardRole)
        // return guard role to Alice
        await plushie.addWhitelistGuards([whitelistGuardAlice.address]).then(tx => tx.wait())
      })
    })
  })

  describe('Whitelist Management', () => {
    describe('Happy path', () => {
      it('Whitelist guard can add themselves to the minting whitelist', async () => {
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([whitelistGuardAlice.address]))
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, whitelistGuardAlice.address, whitelistGuardAlice.address)

        expect(await plushie.hasRole(minterRole, whitelistGuardAlice.address)).to.be.true
      })

      it('Add the same address to whitelist multiple times - handle gracefully', async () => {
        // First addition
        await plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([stranger.address])
          .then(tx => tx.wait())
        expect(await plushie.hasRole(minterRole, stranger.address)).to.be.true

        // Second addition - should not revert, just no-op
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([stranger.address])).to.not.be
          .reverted

        // Still has the role
        expect(await plushie.hasRole(minterRole, stranger.address)).to.be.true
      })

      it('Remove non-whitelisted address from whitelist - handle gracefully', async () => {
        // Try to remove address that was never whitelisted
        await expect(plushie.connect(whitelistGuardAlice).removeFromWhitelist([stranger.address])).to.not.be
          .reverted

        // Verify they still don't have the role
        expect(await plushie.hasRole(minterRole, stranger.address)).to.be.false
      })

      it('Add contract address itself to whitelist - handle gracefully', async () => {
        const contractAddress = await plushie.getAddress()

        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([contractAddress]))
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, contractAddress, whitelistGuardAlice.address)

        expect(await plushie.hasRole(minterRole, contractAddress)).to.be.true
      })

      it('Batch whitelist operations: Add multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.address) // 5 addresses

        const tx = plushie.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // Check all events are emitted
        const eventChecks = addresses.map(address =>
          expect(tx)
            .to.emit(plushie, 'RoleGranted')
            .withArgs(minterRole, address, whitelistGuardAlice.address),
        )
        await Promise.all(eventChecks)

        // Verify all have minter roles
        const roleChecks = addresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => expect(hasRole).to.be.true)
      })

      it('Batch whitelist operations: Remove multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.address) // 5 addresses

        // Then remove them
        const tx = plushie.connect(whitelistGuardAlice).removeFromWhitelist(addresses)

        // Check all revoke events are emitted
        const eventChecks = addresses.map(address =>
          expect(tx)
            .to.emit(plushie, 'RoleRevoked')
            .withArgs(minterRole, address, whitelistGuardAlice.address),
        )
        await Promise.all(eventChecks)

        // Verify all lost minter roles
        const roleChecks = addresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => expect(hasRole).to.be.false)
      })

      it('Whitelisting empty array - handle gracefully', async () => {
        // Empty array should not revert
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([])).to.not.be.reverted

        await expect(plushie.connect(whitelistGuardAlice).removeFromWhitelist([])).to.not.be.reverted
      })
    })
    describe('Sad path', () => {
      it('Whitelist guard cannot add zero address to whitelist', async () => {
        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist([ethers.ZeroAddress]),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftAdminRoleViolation')

        // But verify the behavior
        expect(await plushie.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })

      it('Batch whitelist with zero address mixed with valid addresses - should fail', async () => {
        const validAddresses = [minters[2].address, minters[3].address]
        const mixedAddresses = [validAddresses[0], ethers.ZeroAddress, validAddresses[1]]

        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist(mixedAddresses),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftAdminRoleViolation')

        // Verify none of the addresses got the role (transaction reverted)
        const roleChecks = validAddresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => expect(hasRole).to.be.false)

        // Zero address also shouldn't have the role
        expect(await plushie.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })
    })
  })

  describe('Minting', () => {
    const minterNum = 4
    describe('Happy path', () => {
      it('User gets minter role when whitelisted', async () => {
        // Whitelist a user
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([minters[minterNum].address]))
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, minters[minterNum].address, whitelistGuardAlice.address)

        // Verify user received the Minter role
        expect(await plushie.hasRole(minterRole, minters[minterNum].address)).to.be.true
      })

      it('Whitelisted user can successfully mint NFT', async () => {
        // User mints successfully
        await expect(plushie.connect(minters[minterNum]).mint())
          .to.emit(plushie, 'Transfer')
          .withArgs(ethers.ZeroAddress, minters[minterNum].address, 1)
      })

      it('User owns the minted NFT', async () => {
        // Verify user owns the NFT
        expect(await plushie.balanceOf(minters[minterNum].address)).to.equal(1)
        expect(await plushie.ownerOf(1)).to.equal(minters[minterNum].address)
      })

      it('User loses minter role after minting', async () => {
        // Verify user no longer has minter role
        expect(await plushie.hasRole(minterRole, minters[minterNum].address)).to.be.false
      })

      it('Token has correct metadata URI', async () => {
        // Verify token URI is set correctly
        expect(await plushie.tokenURI(1)).to.equal(`ipfs://${ipfsFolderCid}`)
      })

      it('Tokens available count decreases after mint', async () => {
        // Verify available tokens decreased
        expect(await plushie.tokensAvailable()).to.equal(maxSupply - 1)
      })
    })
    describe('Sad path', () => {
      it('User with insufficient StRif balance cannot mint NFT', async () => {
        // Create a new user with no stRIF balance
        const [poorUser] = [minters.at(-1)!]

        // Whitelist the poor user (give them minter role)
        await plushie.connect(whitelistGuardAlice).addToWhitelist([poorUser.address])
        expect(await plushie.hasRole(minterRole, poorUser.address)).to.be.true

        // Verify they have insufficient stRIF balance (should be 0)
        const userBalance = await stRIF.balanceOf(poorUser.address)
        expect(userBalance).to.be.lt(stRifThreshold)

        // Attempt to mint should fail with balance threshold error
        await expect(plushie.connect(poorUser).mint())
          .to.be.revertedWithCustomError(plushie, 'PlushieNftBelowTokenThreshold')
          .withArgs(userBalance, stRifThreshold)
      })
      it('User who is not in the whitelist cannot mint NFT', async () => {
        await expect(plushie.connect(stranger).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(stranger.address, minterRole)
      })

      it('Admin role who is not in the whitelist cannot mint NFT', async () => {
        await expect(plushie.connect(deployer).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(deployer.address, minterRole)
      })

      it('Whitelist guard who is not in the whitelist cannot mint NFT', async () => {
        // dewhitelist previously whitelisted guard (by another guard)
        await plushie
          .connect(whitelistGuardBob)
          .removeFromWhitelist([whitelistGuardAlice.address])
          .then(tx => tx.wait())
        // make sure the guard was removed from whitelist
        expect(await plushie.hasRole(minterRole, whitelistGuardAlice.address)).to.be.false
        // trying to mint
        await expect(plushie.connect(whitelistGuardAlice).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(whitelistGuardAlice.address, minterRole)
      })

      it('Address who already minted NFT cannot mint another NFT event after granting another minter role', async () => {
        // Whitelist and mint first NFT
        await plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([minters[minterNum].address])
          .then(tx => tx.wait())
        expect(await plushie.hasRole(minterRole, minters[minterNum].address)).to.be.true
        await expect(plushie.connect(minters[minterNum]).mint())
          .to.be.revertedWithCustomError(plushie, 'ERC721InvalidOwner')
          .withArgs(minters[minterNum].address)
      })
    })
  })

  describe('Supply Limits', () => {
    describe('Happy path', () => {
      it('10th mint by whitelisted address succeeds', async () => {
        // Mint 9 more NFTs to reach the limit (1 already minted in previous tests)
        // Using available indices: [5], [6], [7], [8], [9], [10], [11], [12], [13]
        const availableMintersIndices = [5, 6, 7, 8, 9, 10, 11, 12, 13]
        const addresses = availableMintersIndices.map(i => minters[i].address)

        // Whitelist all users
        await plushie.connect(whitelistGuardBob).addToWhitelist(addresses)

        // Mint 9 NFTs
        for (const index of availableMintersIndices) {
          await plushie
            .connect(minters[index])
            .mint()
            .then(tx => tx.wait())
        }

        // Verify we have 10 total minted
        expect(await plushie.tokensAvailable()).to.equal(0) // maxSupply(10) - totalMinted(10)
        expect(await plushie.totalSupply()).to.equal(10)
      })
    })

    describe('Sad path', () => {
      it('Attempt to mint when supply reaches exactly 10 - should fail', async () => {
        // Try to whitelist and mint when supply is exhausted
        await plushie.connect(whitelistGuardAlice).addToWhitelist([minters[14].address])

        await expect(plushie.connect(minters[14]).mint())
          .to.be.revertedWithCustomError(plushie, 'PlushieNftOutOfTokens')
          .withArgs(10) // maxSupply
      })

      it('Multiple whitelisted users cannot mint simultaneously when supply exhausted', async () => {
        // Whitelist multiple users when supply is already exhausted
        const addresses = [minters[15].address, minters[16].address, minters[17].address]
        await plushie.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // All should fail to mint
        const failIndices = [15, 16, 17]
        for (const index of failIndices) {
          await expect(plushie.connect(minters[index]).mint())
            .to.be.revertedWithCustomError(plushie, 'PlushieNftOutOfTokens')
            .withArgs(10)
        }
      })
    })
  })

  describe('Transfer Prevention', () => {
    describe('Happy path', () => {
      it('approve() function works but transfers still fail', async () => {
        // Use existing NFT (token ID 1 owned by minters[4] from minting tests)
        const tokenOwner = minters[4]
        const approvedUser = minters[19]
        const tokenId = 1

        // approve() should work
        await expect(plushie.connect(tokenOwner).approve(approvedUser.address, tokenId)).to.not.be.reverted

        // Check approval was set
        expect(await plushie.getApproved(tokenId)).to.equal(approvedUser.address)

        // But transfer should still fail
        await expect(
          plushie.connect(approvedUser).transferFrom(tokenOwner.address, approvedUser.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('setApprovalForAll() works but transfers still fail', async () => {
        // Use existing NFT owner
        const tokenOwner = minters[4]
        const operator = minters[19]
        const tokenId = 1

        // setApprovalForAll should work
        await expect(plushie.connect(tokenOwner).setApprovalForAll(operator.address, true)).to.not.be.reverted

        // Check approval was set
        expect(await plushie.isApprovedForAll(tokenOwner.address, operator.address)).to.be.true

        // But transfer should still fail
        await expect(
          plushie.connect(operator).transferFrom(tokenOwner.address, operator.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Owner is unable to transfer Plushie with safeTransferFrom() function', async () => {
        const tokenOwner = minters[4]
        const operator = minters[19]
        const tokenId = 1
        expect(await plushie.balanceOf(tokenOwner.address)).equals(1)
        await expect(
          plushie
            .connect(tokenOwner)
            ['safeTransferFrom(address,address,uint256)'](tokenOwner.address, operator.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })
    })
    describe('Sad path', () => {
      it('User A cannot transfer token to User B', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[19]
        const tokenId = 1

        await expect(
          plushie.connect(tokenOwner).transferFrom(tokenOwner.address, recipient.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Admin cannot execute transfer on behalf of user', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[19]
        const tokenId = 1

        await expect(
          plushie.connect(deployer).transferFrom(tokenOwner.address, recipient.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Marketplace contract cannot execute transfer after approval', async () => {
        // Simulate marketplace contract (using another signer)
        const tokenOwner = minters[4]
        const marketplaceContract = minters[20]
        const recipient = minters[19]
        const tokenId = 1

        // User approves marketplace
        await plushie
          .connect(tokenOwner)
          .approve(marketplaceContract.address, tokenId)
          .then(tx => tx.wait())

        // Marketplace tries to transfer but fails
        await expect(
          plushie.connect(marketplaceContract).transferFrom(tokenOwner.address, recipient.address, tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })
    })
  })

  describe('Contract State & Metadata', () => {
    describe('Happy path', () => {
      it('Check totalSupply(), balanceOf(), and ownerOf() accuracy after various operations', async () => {
        // Should have exactly 10 tokens (maxSupply reached)
        const totalSupply = await plushie.totalSupply()
        expect(totalSupply).to.equal(10)

        // Check specific balances
        expect(await plushie.balanceOf(minters[4].address)).to.equal(1) // minterNum from minting tests

        // Verify ownership of first and last tokens
        expect(await plushie.ownerOf(1)).to.equal(minters[4].address) // First token from minting tests
        expect(await plushie.ownerOf(10)).to.equal(minters[13].address) // Last token from supply limit tests

        // Verify tokens available is 0
        expect(await plushie.tokensAvailable()).to.equal(0)
      })

      it('All tokens have the same metadata IPFS CID', async () => {
        // Check tokenURI for all minted tokens (1 to 10)
        for (let tokenId = 1; tokenId <= 10; tokenId++) {
          const tokenUri = await plushie.tokenURI(tokenId)
          expect(tokenUri).to.equal(`ipfs://${ipfsFolderCid}`)
        }
      })
    })
    describe('Sad path', () => {
      it('tokenURI() for non-existent token reverts with clear message', async () => {
        await expect(plushie.tokenURI(999))
          .to.be.revertedWithCustomError(plushie, 'ERC721NonexistentToken')
          .withArgs(999)
      })

      it('ownerOf() for non-existent token reverts', async () => {
        await expect(plushie.ownerOf(999))
          .to.be.revertedWithCustomError(plushie, 'ERC721NonexistentToken')
          .withArgs(999)
      })
    })
  })
})
