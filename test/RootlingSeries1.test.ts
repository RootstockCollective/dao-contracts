import { RootlingSeries1Module } from '../ignition/modules/RootlingSeries1Module'
import type { RootlingSeries1RootstockCollective, RIFToken, StRIFToken } from '../typechain-types'
import { ethers, ignition } from 'hardhat'
import { expect } from 'chai'
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployContracts } from './deployContracts'

const maxSupply = 8
const stRifThreshold = 1n * 10n ** 18n // 1 StRIF
const ipfsFolderCid = 'QmPaCP36tFjXp7xqcPi4ggatL7w4dsWKGTv1kpaSVkv9KW'
const minterRole = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
const whitelistGuardRole = ethers.keccak256(ethers.toUtf8Bytes('WHITELIST_GUARD_ROLE'))
const adminRole = ethers.ZeroHash

async function deployRootlingNft(stRifAddress: string) {
  const { RootlingSeries1 } = await ignition.deploy(RootlingSeries1Module, {
    parameters: {
      RootlingSeries1: {
        stRif: stRifAddress,
        stRifThreshold,
        maxSupply,
        ipfsFolderCid,
      },
    },
  })
  return RootlingSeries1 as unknown as RootlingSeries1RootstockCollective
}

describe('RootlingSeries1RootstockCollective NFT', () => {
  let rootling: RootlingSeries1RootstockCollective
  let deployer: SignerWithAddress
  let whitelistGuardAlice: SignerWithAddress
  let whitelistGuardBob: SignerWithAddress
  let stranger: SignerWithAddress
  let minters: SignerWithAddress[]
  let rif: RIFToken
  let stRIF: StRIFToken

  async function sendStRifsTo(...holders: SignerWithAddress[]) {
    for (const holder of holders) {
      await (await rif.transfer(await holder.getAddress(), stRifThreshold)).wait()
      await (await rif.connect(holder).approve(await stRIF.getAddress(), stRifThreshold)).wait()
      await (await stRIF.connect(holder).depositAndDelegate(await holder.getAddress(), stRifThreshold)).wait()
    }
  }

  before(async () => {
    ;[deployer, whitelistGuardAlice, whitelistGuardBob, stranger, ...minters] = await ethers.getSigners()
    ;({ rif, stRIF } = await deployContracts())

    await sendStRifsTo(...minters.slice(0, -1))
    const stRifAddress = await stRIF.getAddress()
    rootling = await deployRootlingNft(stRifAddress)
  })

  describe('upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await rootling.name()).to.equal('RootlingSeries1RootstockCollective')
      expect(await rootling.symbol()).to.equal('RS1')
    })
    it('Minter role should be set up', async () => {
      expect(await rootling.MINTER_ROLE()).to.equal(minterRole)
    })
    it('Admin role should be set up', async () => {
      expect(await rootling.DEFAULT_ADMIN_ROLE()).to.equal(adminRole)
    })
    it('Whitelist Guard role should be set up', async () => {
      expect(await rootling.WHITELIST_GUARD_ROLE()).to.equal(whitelistGuardRole)
    })
    it('Minter role should be administrated by Whitelist guard role', async () => {
      expect(await rootling.getRoleAdmin(minterRole)).to.equal(whitelistGuardRole)
    })
    it('Deployer should be granted the admin role', async () => {
      expect(await rootling.hasRole(adminRole, await deployer.getAddress())).to.be.true
    })
    it('Deployer should be granted the Whitelist guard role', async () => {
      expect(await rootling.hasRole(whitelistGuardRole, await deployer.getAddress())).to.be.true
    })
    it('Should set max supply correctly', async () => {
      expect(await rootling.maxSupply()).to.equal(maxSupply)
    })
    it('NFT contract should have Max supply of available tokens', async () => {
      expect(await rootling.tokensAvailable()).to.equal(maxSupply)
    })
    it('Should set StRif as underlying token', async () => {
      expect(await rootling.underlyingToken()).to.equal(await stRIF.getAddress())
    })
    it('Should set StRif threshold for NFT minting', async () => {
      expect(await rootling.underlyingTokenThreshold()).to.equal(stRifThreshold)
    })
  })

  describe('Role Management & Access Control', () => {
    describe('Happy path', () => {
      it('Admin should grant Whitelist Guard role to both Alice and Bob', async () => {
        const tx = rootling.addWhitelistGuards([
          await whitelistGuardAlice.getAddress(),
          await whitelistGuardBob.getAddress(),
        ])
        await expect(tx)
          .to.emit(rootling, 'RoleGranted')
          .withArgs(whitelistGuardRole, await whitelistGuardAlice.getAddress(), await deployer.getAddress())
        await expect(tx)
          .to.emit(rootling, 'RoleGranted')
          .withArgs(whitelistGuardRole, await whitelistGuardBob.getAddress(), await deployer.getAddress())
      })
      it('Alice and Bob should be whitelist guards now', async () => {
        expect(await rootling.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.true
        expect(await rootling.hasRole(whitelistGuardRole, await whitelistGuardBob.getAddress())).to.be.true
      })
      it('Whitelist guards can whitelist addresses', async () => {
        const tx = rootling
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[0].getAddress(), await minters[1].getAddress()])

        await expect(tx)
          .to.emit(rootling, 'RoleGranted')
          .withArgs(minterRole, await minters[0].getAddress(), await whitelistGuardAlice.getAddress())
        await expect(tx)
          .to.emit(rootling, 'RoleGranted')
          .withArgs(minterRole, await minters[1].getAddress(), await whitelistGuardAlice.getAddress())

        // Verify they have minter roles
        expect(await rootling.hasRole(minterRole, await minters[0].getAddress())).to.be.true
        expect(await rootling.hasRole(minterRole, await minters[1].getAddress())).to.be.true
      })
      it('Deployer can transfer DEFAULT_ADMIN_ROLE to another address', async () => {
        const newAdmin = minters[0] // Use first minter as new admin

        // Verify initial state: deployer has admin role, newAdmin doesn't
        expect(await rootling.hasRole(adminRole, await deployer.getAddress())).to.be.true
        expect(await rootling.hasRole(adminRole, await newAdmin.getAddress())).to.be.false
        expect(await rootling.getRoleMemberCount(adminRole)).to.equal(1)

        // Transfer admin role to new address
        const tx = rootling.transferDefaultAdminRole(await newAdmin.getAddress())
        await expect(tx)
          .to.emit(rootling, 'RoleGranted')
          .withArgs(adminRole, await newAdmin.getAddress(), await deployer.getAddress())
        await expect(tx)
          .to.emit(rootling, 'RoleRevoked')
          .withArgs(adminRole, await deployer.getAddress(), await deployer.getAddress())

        // Verify final state: only newAdmin has admin role
        expect(await rootling.hasRole(adminRole, await deployer.getAddress())).to.be.false
        expect(await rootling.hasRole(adminRole, await newAdmin.getAddress())).to.be.true
        expect(await rootling.getRoleMemberCount(adminRole)).to.equal(1)

        // Verify new admin can perform admin functions
        const newCid = 'QmNewTestCid123'
        await expect(rootling.connect(newAdmin).setFolderIpfsCid(newCid))
          .to.emit(rootling, 'RootlingNftFolderIpfsCidChanged')
          .withArgs(ipfsFolderCid, newCid)

        // give admin role back for testing convenience
        await rootling
          .connect(newAdmin)
          .transferDefaultAdminRole(await deployer.getAddress())
          .then(tx => tx.wait())
        await rootling.setFolderIpfsCid(ipfsFolderCid).then(tx => tx.wait())
      })
    })
    describe('Sad path', () => {
      it('Stranger cannot grant himself Whitelist Guard role', async () => {
        await expect(rootling.connect(stranger).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), adminRole)
      })
      it('Whitelist Guards cannot grant Whitelist Guard role to extraneous address', async () => {
        await expect(rootling.connect(whitelistGuardAlice).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), adminRole)
      })
      it('Default admin cannot renounce his role when he is the last admin', async () => {
        await expect(
          rootling.renounceRole(adminRole, await deployer.getAddress()),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftAdminRoleViolation')
      })
      it('Cannot grant second admin role - only one admin allowed', async () => {
        await expect(
          rootling.grantRole(adminRole, await stranger.getAddress()),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftAdminRoleViolation')
      })
      it('Owner removes whitelist guard role, then that address tries to modify whitelist', async () => {
        // Remove Alice's whitelist guard role
        await rootling.removeWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
        // Verify Alice no longer has the role
        expect(await rootling.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.false
        // Alice tries to whitelist someone but should fail
        await expect(rootling.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), whitelistGuardRole)
        // return guard role to Alice
        await rootling.addWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
      })
    })
  })

  describe('Whitelist Management', () => {
    describe('Happy path', () => {
      it('Whitelist guard can add themselves to the minting whitelist', async () => {
        await expect(
          rootling.connect(whitelistGuardAlice).addToWhitelist([await whitelistGuardAlice.getAddress()]),
        )
          .to.emit(rootling, 'RoleGranted')
          .withArgs(
            minterRole,
            await whitelistGuardAlice.getAddress(),
            await whitelistGuardAlice.getAddress(),
          )

        expect(await rootling.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.true
      })

      it('Add the same address to whitelist multiple times - handle gracefully', async () => {
        // First addition
        await rootling
          .connect(whitelistGuardAlice)
          .addToWhitelist([await stranger.getAddress()])
          .then(tx => tx.wait())
        expect(await rootling.hasRole(minterRole, await stranger.getAddress())).to.be.true

        // Second addition - should not revert, just no-op
        await expect(rootling.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()])).to
          .be.not.reverted

        // Still has the role
        expect(await rootling.hasRole(minterRole, await stranger.getAddress())).to.be.true
      })

      it('Remove non-whitelisted address from whitelist - handle gracefully', async () => {
        // Try to remove address that was never whitelisted
        await expect(rootling.connect(whitelistGuardAlice).removeFromWhitelist([await stranger.getAddress()]))
          .to.be.not.reverted

        // Verify they still don't have the role
        expect(await rootling.hasRole(minterRole, await stranger.getAddress())).to.be.false
      })

      it('Add contract address itself to whitelist - handle gracefully', async () => {
        const contractAddress = await rootling.getAddress()

        await expect(rootling.connect(whitelistGuardAlice).addToWhitelist([contractAddress]))
          .to.emit(rootling, 'RoleGranted')
          .withArgs(minterRole, contractAddress, await whitelistGuardAlice.getAddress())

        expect(await rootling.hasRole(minterRole, contractAddress)).to.be.true
      })

      it('Batch whitelist operations: Add multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress()) // 5 addresses

        const tx = rootling.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // Check all events are emitted
        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(rootling, 'RoleGranted')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        // Verify all have minter roles
        const roleChecks = addresses.map(address => rootling.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.true
        })
      })

      it('Batch whitelist operations: Remove multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress()) // 5 addresses

        // Then remove them
        const tx = rootling.connect(whitelistGuardAlice).removeFromWhitelist(addresses)

        // Check all revoke events are emitted
        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(rootling, 'RoleRevoked')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        // Verify all lost minter roles
        const roleChecks = addresses.map(address => rootling.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })
      })

      it('Whitelisting empty array - handle gracefully', async () => {
        // Empty array should not revert
        await expect(rootling.connect(whitelistGuardAlice).addToWhitelist([])).to.be.not.reverted

        await expect(rootling.connect(whitelistGuardAlice).removeFromWhitelist([])).to.be.not.reverted
      })

      it('getMinters() returns correct list of whitelisted addresses', async () => {
        const mintersFromContract = await rootling.getMinters()

        // Should have 4 addresses: contract address + minters[0] + minters[1] + one more
        expect(mintersFromContract).to.have.lengthOf(4)
        expect(mintersFromContract).to.include(await rootling.getAddress())
        expect(mintersFromContract).to.include(await minters[0].getAddress())
        expect(mintersFromContract).to.include(await minters[1].getAddress())
        expect(mintersFromContract).to.include(await whitelistGuardAlice.getAddress())

        // Verify all returned addresses actually have the MINTER_ROLE
        for (const minter of mintersFromContract) {
          expect(await rootling.hasRole(minterRole, minter)).to.be.true
        }
      })
    })
    describe('Sad path', () => {
      it('Whitelist guard cannot add zero address to whitelist', async () => {
        await expect(
          rootling.connect(whitelistGuardAlice).addToWhitelist([ethers.ZeroAddress]),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftAdminRoleViolation')

        // But verify the behavior
        expect(await rootling.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })

      it('Batch whitelist with zero address mixed with valid addresses - should fail', async () => {
        const validAddresses = [await minters[2].getAddress(), await minters[3].getAddress()]
        const mixedAddresses = [validAddresses[0], ethers.ZeroAddress, validAddresses[1]]

        await expect(
          rootling.connect(whitelistGuardAlice).addToWhitelist(mixedAddresses),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftAdminRoleViolation')

        // Verify none of the addresses got the role (transaction reverted)
        const roleChecks = validAddresses.map(address => rootling.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })

        // Zero address also shouldn't have the role
        expect(await rootling.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })
    })
  })

  describe('Minting', () => {
    const minterNum = 4
    describe('Happy path', () => {
      it('User gets minter role when whitelisted', async () => {
        // Whitelist a user
        await expect(
          rootling.connect(whitelistGuardAlice).addToWhitelist([await minters[minterNum].getAddress()]),
        )
          .to.emit(rootling, 'RoleGranted')
          .withArgs(minterRole, await minters[minterNum].getAddress(), await whitelistGuardAlice.getAddress())

        // Verify user received the Minter role
        expect(await rootling.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
      })

      it('Whitelisted user can successfully mint NFT', async () => {
        // User mints successfully
        await expect(rootling.connect(minters[minterNum]).mint())
          .to.emit(rootling, 'Transfer')
          .withArgs(ethers.ZeroAddress, await minters[minterNum].getAddress(), 1)
      })

      it('User owns the minted NFT', async () => {
        // Verify user owns the NFT
        expect(await rootling.balanceOf(await minters[minterNum].getAddress())).to.equal(1)
        expect(await rootling.ownerOf(1)).to.equal(await minters[minterNum].getAddress())
      })

      it('User loses minter role after minting', async () => {
        // Verify user no longer has minter role
        expect(await rootling.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.false
      })

      it('Token has correct metadata URI', async () => {
        // Verify token URI is set correctly
        expect(await rootling.tokenURI(1)).to.equal(`ipfs://${ipfsFolderCid}`)
      })

      it('Tokens available count decreases after mint', async () => {
        // Verify available tokens decreased
        expect(await rootling.tokensAvailable()).to.equal(maxSupply - 1)
      })
    })
    describe('Sad path', () => {
      it('User with insufficient StRif balance cannot mint NFT', async () => {
        // Create a new user with no stRIF balance
        const poorUser = minters[minters.length - 1]

        // Whitelist the poor user (give them minter role)
        await rootling.connect(whitelistGuardAlice).addToWhitelist([await poorUser.getAddress()])
        expect(await rootling.hasRole(minterRole, await poorUser.getAddress())).to.be.true

        // Verify they have insufficient stRIF balance (should be 0)
        const userBalance = await stRIF.balanceOf(await poorUser.getAddress())
        expect(userBalance).to.be.lt(stRifThreshold)

        // Attempt to mint should fail with balance threshold error
        await expect(rootling.connect(poorUser).mint())
          .to.be.revertedWithCustomError(rootling, 'RootlingNftBelowTokenThreshold')
          .withArgs(userBalance, stRifThreshold)
      })
      it('User who is not in the whitelist cannot mint NFT', async () => {
        await expect(rootling.connect(stranger).mint())
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), minterRole)
      })

      it('Admin role who is not in the whitelist cannot mint NFT', async () => {
        await expect(rootling.connect(deployer).mint())
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await deployer.getAddress(), minterRole)
      })

      it('Whitelist guard who is not in the whitelist cannot mint NFT', async () => {
        // dewhitelist previously whitelisted guard (by another guard)
        await rootling
          .connect(whitelistGuardBob)
          .removeFromWhitelist([await whitelistGuardAlice.getAddress()])
          .then(tx => tx.wait())
        // make sure the guard was removed from whitelist
        expect(await rootling.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.false
        // trying to mint
        await expect(rootling.connect(whitelistGuardAlice).mint())
          .to.be.revertedWithCustomError(rootling, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), minterRole)
      })

      it('Address who already minted NFT cannot mint another NFT event after granting another minter role', async () => {
        // Whitelist and mint first NFT
        await rootling
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[minterNum].getAddress()])
          .then(tx => tx.wait())
        expect(await rootling.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
        await expect(rootling.connect(minters[minterNum]).mint())
          .to.be.revertedWithCustomError(rootling, 'ERC721InvalidOwner')
          .withArgs(await minters[minterNum].getAddress())
      })
    })
  })

  describe('Supply Limits', () => {
    describe('Happy path', () => {
      it('8th mint by whitelisted address succeeds', async () => {
        // Mint 7 more NFTs to reach the limit (1 already minted in previous tests)
        // Using available indices: [5], [6], [7], [8], [9], [10], [11],
        const availableMintersIndices = [5, 6, 7, 8, 9, 10, 11]
        const addresses = availableMintersIndices.map(i => minters[i].getAddress())

        // Whitelist all users
        await rootling.connect(whitelistGuardBob).addToWhitelist(addresses)

        // Mint 7 NFTs
        for (const index of availableMintersIndices) {
          await rootling
            .connect(minters[index])
            .mint()
            .then(tx => tx.wait())
        }

        // Verify we have 8 total minted
        expect(await rootling.tokensAvailable()).to.equal(0)
        expect(await rootling.totalSupply()).to.equal(maxSupply)
      })
    })

    describe('Sad path', () => {
      it('Attempt to mint when supply reaches exactly 8 - should fail', async () => {
        // Try to whitelist and mint when supply is exhausted
        await rootling.connect(whitelistGuardAlice).addToWhitelist([await minters[12].getAddress()])

        await expect(rootling.connect(minters[12]).mint())
          .to.be.revertedWithCustomError(rootling, 'RootlingNftOutOfTokens')
          .withArgs(maxSupply)
      })

      it('Multiple whitelisted users cannot mint simultaneously when supply exhausted', async () => {
        // Whitelist multiple users when supply is already exhausted

        // Use minters who have StRIF but haven't minted yet
        // minters[14] has StRIF and hasn't minted (only minters[4-13] have minted)
        const failIndices = [12, 13, 14]
        const addresses = await Promise.all(failIndices.map(async i => minters[i].getAddress()))
        await rootling.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // Should fail to mint because supply is exhausted
        for (const index of failIndices) {
          await expect(rootling.connect(minters[index]).mint())
            .to.be.revertedWithCustomError(rootling, 'RootlingNftOutOfTokens')
            .withArgs(maxSupply)
        }
      })
    })
  })

  describe('Transfer Prevention', () => {
    describe('Happy path', () => {
      it('approve() function works but transfers still fail', async () => {
        // Use existing NFT (token ID 1 owned by minters[4] from minting tests)
        const tokenOwner = minters[4]
        const approvedUser = minters[15]
        const tokenId = 1

        // approve() should work
        await expect(rootling.connect(tokenOwner).approve(await approvedUser.getAddress(), tokenId)).to.be.not
          .reverted

        // Check approval was set
        expect(await rootling.getApproved(tokenId)).to.equal(await approvedUser.getAddress())

        // But transfer should still fail
        await expect(
          rootling
            .connect(approvedUser)
            .transferFrom(await tokenOwner.getAddress(), await approvedUser.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })

      it('setApprovalForAll() works but transfers still fail', async () => {
        // Use existing NFT owner
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1

        // setApprovalForAll should work
        await expect(rootling.connect(tokenOwner).setApprovalForAll(await operator.getAddress(), true)).to.be
          .not.reverted

        // Check approval was set
        expect(await rootling.isApprovedForAll(await tokenOwner.getAddress(), await operator.getAddress())).to
          .be.true

        // But transfer should still fail
        await expect(
          rootling
            .connect(operator)
            .transferFrom(await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })

      it('Owner is unable to transfer Rootling with safeTransferFrom() function', async () => {
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1
        expect(await rootling.balanceOf(await tokenOwner.getAddress())).equals(1)
        await expect(
          rootling
            .connect(tokenOwner)
            [
              'safeTransferFrom(address,address,uint256)'
            ](await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })
    })
    describe('Sad path', () => {
      it('User A cannot transfer token to User B', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          rootling
            .connect(tokenOwner)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })

      it('Admin cannot execute transfer on behalf of user', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          rootling
            .connect(deployer)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })

      it('Marketplace contract cannot execute transfer after approval', async () => {
        // Simulate marketplace contract (using another signer)
        const tokenOwner = minters[4]
        const marketplaceContract = minters[11]
        const recipient = minters[12]
        const tokenId = 1

        // User approves marketplace
        await rootling
          .connect(tokenOwner)
          .approve(await marketplaceContract.getAddress(), tokenId)
          .then(tx => tx.wait())

        // Marketplace tries to transfer but fails
        await expect(
          rootling
            .connect(marketplaceContract)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootling, 'RootlingNftTransfersDisabled')
      })
    })
  })

  describe('Contract State & Metadata', () => {
    describe('Happy path', () => {
      it('Check totalSupply(), balanceOf(), and ownerOf() accuracy after various operations', async () => {
        // Should have exactly 10 tokens (maxSupply reached)
        const totalSupply = await rootling.totalSupply()
        expect(totalSupply).to.equal(maxSupply)

        // Check specific balances
        expect(await rootling.balanceOf(await minters[4].getAddress())).to.equal(1) // minterNum from minting tests

        // Verify ownership of first and last tokens
        expect(await rootling.ownerOf(1)).to.equal(await minters[4].getAddress()) // First token from minting tests
        expect(await rootling.ownerOf(maxSupply)).to.equal(await minters[11].getAddress()) // Last token from supply limit tests

        // Verify tokens available is 0
        expect(await rootling.tokensAvailable()).to.equal(0)
      })

      it('All tokens have the same metadata IPFS CID', async () => {
        // Check tokenURI for all minted tokens (1 to 10)
        for (let tokenId = 1; tokenId <= maxSupply; tokenId++) {
          const tokenUri = await rootling.tokenURI(tokenId)
          expect(tokenUri).to.equal(`ipfs://${ipfsFolderCid}`)
        }
      })

      it('getWhitelistGuards() returns correct list of guards', async () => {
        const guards = await rootling.getWhitelistGuards()

        expect(guards).to.have.lengthOf(3)
        expect(guards).to.include(await deployer.getAddress())
        expect(guards).to.include(await whitelistGuardBob.getAddress())
        expect(guards).to.include(await whitelistGuardAlice.getAddress())
      })

      it('getMinters() returns addresses that still have MINTER_ROLE after supply exhausted', async () => {
        const minters = await rootling.getMinters()

        // Should have addresses that were whitelisted but couldn't mint due to supply exhaustion
        expect(minters.length).to.be.greaterThan(0)

        // Verify all returned addresses actually have the MINTER_ROLE
        for (const minter of minters) {
          expect(await rootling.hasRole(minterRole, minter)).to.be.true
        }
      })
    })
    describe('Sad path', () => {
      it('tokenURI() for non-existent token reverts with clear message', async () => {
        await expect(rootling.tokenURI(999))
          .to.be.revertedWithCustomError(rootling, 'ERC721NonexistentToken')
          .withArgs(999)
      })

      it('ownerOf() for non-existent token reverts', async () => {
        await expect(rootling.ownerOf(999))
          .to.be.revertedWithCustomError(rootling, 'ERC721NonexistentToken')
          .withArgs(999)
      })
    })
  })
})
