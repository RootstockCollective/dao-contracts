import { PlushieSeries1Module } from '../ignition/modules/PlushieSeries1Module.js'
import type {
  PlushieSeries1RootstockCollective,
  RIFToken,
  StRIFToken,
} from '../types/ethers-contracts/index.js'
import { ethers, expect, ignition, type Signer } from './config.js'
import { deployContracts } from './deployContracts.js'

const maxSupply = 8
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
  let deployer: Signer
  let whitelistGuardAlice: Signer
  let whitelistGuardBob: Signer
  let stranger: Signer
  let minters: Signer[]
  let rif: RIFToken
  let stRIF: StRIFToken

  async function sendStRifsTo(...holders: Signer[]) {
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
      expect(await plushie.hasRole(adminRole, await deployer.getAddress())).to.be.true
    })
    it('Deployer should be granted the Whitelist guard role', async () => {
      expect(await plushie.hasRole(whitelistGuardRole, await deployer.getAddress())).to.be.true
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
        const tx = plushie.addWhitelistGuards([
          await whitelistGuardAlice.getAddress(),
          await whitelistGuardBob.getAddress(),
        ])
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(whitelistGuardRole, await whitelistGuardAlice.getAddress(), await deployer.getAddress())
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(whitelistGuardRole, await whitelistGuardBob.getAddress(), await deployer.getAddress())
      })
      it('Alice and Bob should be whitelist guards now', async () => {
        expect(await plushie.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.true
        expect(await plushie.hasRole(whitelistGuardRole, await whitelistGuardBob.getAddress())).to.be.true
      })
      it('Whitelist guards can whitelist addresses', async () => {
        const tx = plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[0].getAddress(), await minters[1].getAddress()])

        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, await minters[0].getAddress(), await whitelistGuardAlice.getAddress())
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, await minters[1].getAddress(), await whitelistGuardAlice.getAddress())

        // Verify they have minter roles
        expect(await plushie.hasRole(minterRole, await minters[0].getAddress())).to.be.true
        expect(await plushie.hasRole(minterRole, await minters[1].getAddress())).to.be.true
      })
      it('Deployer can transfer DEFAULT_ADMIN_ROLE to another address', async () => {
        const newAdmin = minters[0] // Use first minter as new admin

        // Verify initial state: deployer has admin role, newAdmin doesn't
        expect(await plushie.hasRole(adminRole, await deployer.getAddress())).to.be.true
        expect(await plushie.hasRole(adminRole, await newAdmin.getAddress())).to.be.false
        expect(await plushie.getRoleMemberCount(adminRole)).to.equal(1)

        // Transfer admin role to new address
        const tx = plushie.transferDefaultAdminRole(await newAdmin.getAddress())
        await expect(tx)
          .to.emit(plushie, 'RoleGranted')
          .withArgs(adminRole, await newAdmin.getAddress(), await deployer.getAddress())
        await expect(tx)
          .to.emit(plushie, 'RoleRevoked')
          .withArgs(adminRole, await deployer.getAddress(), await deployer.getAddress())

        // Verify final state: only newAdmin has admin role
        expect(await plushie.hasRole(adminRole, await deployer.getAddress())).to.be.false
        expect(await plushie.hasRole(adminRole, await newAdmin.getAddress())).to.be.true
        expect(await plushie.getRoleMemberCount(adminRole)).to.equal(1)

        // Verify new admin can perform admin functions
        const newCid = 'QmNewTestCid123'
        await expect(plushie.connect(newAdmin).setFolderIpfsCid(newCid))
          .to.emit(plushie, 'PlushieNftFolderIpfsCidChanged')
          .withArgs(ipfsFolderCid, newCid)

        // give admin role back for testing convenience
        await plushie
          .connect(newAdmin)
          .transferDefaultAdminRole(await deployer.getAddress())
          .then(tx => tx.wait())
        await plushie.setFolderIpfsCid(ipfsFolderCid).then(tx => tx.wait())
      })
    })
    describe('Sad path', () => {
      it('Stranger cannot grant himself Whitelist Guard role', async () => {
        await expect(plushie.connect(stranger).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), adminRole)
      })
      it('Whitelist Guards cannot grant Whitelist Guard role to extraneous address', async () => {
        await expect(plushie.connect(whitelistGuardAlice).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), adminRole)
      })
      it('Default admin cannot renounce his role when he is the last admin', async () => {
        await expect(
          plushie.renounceRole(adminRole, await deployer.getAddress()),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftAdminRoleViolation')
      })
      it('Cannot grant second admin role - only one admin allowed', async () => {
        await expect(plushie.grantRole(adminRole, await stranger.getAddress())).to.be.revertedWithCustomError(
          plushie,
          'PlushieNftAdminRoleViolation',
        )
      })
      it('Owner removes whitelist guard role, then that address tries to modify whitelist', async () => {
        // Remove Alice's whitelist guard role
        await plushie.removeWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
        // Verify Alice no longer has the role
        expect(await plushie.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.false
        // Alice tries to whitelist someone but should fail
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), whitelistGuardRole)
        // return guard role to Alice
        await plushie.addWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
      })
    })
  })

  describe('Whitelist Management', () => {
    describe('Happy path', () => {
      it('Whitelist guard can add themselves to the minting whitelist', async () => {
        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist([await whitelistGuardAlice.getAddress()]),
        )
          .to.emit(plushie, 'RoleGranted')
          .withArgs(
            minterRole,
            await whitelistGuardAlice.getAddress(),
            await whitelistGuardAlice.getAddress(),
          )

        expect(await plushie.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.true
      })

      it('Add the same address to whitelist multiple times - handle gracefully', async () => {
        // First addition
        await plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([await stranger.getAddress()])
          .then(tx => tx.wait())
        expect(await plushie.hasRole(minterRole, await stranger.getAddress())).to.be.true

        // Second addition - should not revert, just no-op
        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()]),
        ).to.not.revert(ethers)

        // Still has the role
        expect(await plushie.hasRole(minterRole, await stranger.getAddress())).to.be.true
      })

      it('Remove non-whitelisted address from whitelist - handle gracefully', async () => {
        // Try to remove address that was never whitelisted
        await expect(
          plushie.connect(whitelistGuardAlice).removeFromWhitelist([await stranger.getAddress()]),
        ).to.not.revert(ethers)

        // Verify they still don't have the role
        expect(await plushie.hasRole(minterRole, await stranger.getAddress())).to.be.false
      })

      it('Add contract address itself to whitelist - handle gracefully', async () => {
        const contractAddress = await plushie.getAddress()

        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([contractAddress]))
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, contractAddress, await whitelistGuardAlice.getAddress())

        expect(await plushie.hasRole(minterRole, contractAddress)).to.be.true
      })

      it('Batch whitelist operations: Add multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress()) // 5 addresses

        const tx = plushie.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // Check all events are emitted
        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(plushie, 'RoleGranted')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        // Verify all have minter roles
        const roleChecks = addresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.true
        })
      })

      it('Batch whitelist operations: Remove multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress()) // 5 addresses

        // Then remove them
        const tx = plushie.connect(whitelistGuardAlice).removeFromWhitelist(addresses)

        // Check all revoke events are emitted
        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(plushie, 'RoleRevoked')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        // Verify all lost minter roles
        const roleChecks = addresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })
      })

      it('Whitelisting empty array - handle gracefully', async () => {
        // Empty array should not revert
        await expect(plushie.connect(whitelistGuardAlice).addToWhitelist([])).to.not.revert(ethers)

        await expect(plushie.connect(whitelistGuardAlice).removeFromWhitelist([])).to.not.revert(ethers)
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
        const validAddresses = [await minters[2].getAddress(), await minters[3].getAddress()]
        const mixedAddresses = [validAddresses[0], ethers.ZeroAddress, validAddresses[1]]

        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist(mixedAddresses),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftAdminRoleViolation')

        // Verify none of the addresses got the role (transaction reverted)
        const roleChecks = validAddresses.map(address => plushie.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })

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
        await expect(
          plushie.connect(whitelistGuardAlice).addToWhitelist([await minters[minterNum].getAddress()]),
        )
          .to.emit(plushie, 'RoleGranted')
          .withArgs(minterRole, await minters[minterNum].getAddress(), await whitelistGuardAlice.getAddress())

        // Verify user received the Minter role
        expect(await plushie.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
      })

      it('Whitelisted user can successfully mint NFT', async () => {
        // User mints successfully
        await expect(plushie.connect(minters[minterNum]).mint())
          .to.emit(plushie, 'Transfer')
          .withArgs(ethers.ZeroAddress, await minters[minterNum].getAddress(), 1)
      })

      it('User owns the minted NFT', async () => {
        // Verify user owns the NFT
        expect(await plushie.balanceOf(await minters[minterNum].getAddress())).to.equal(1)
        expect(await plushie.ownerOf(1)).to.equal(await minters[minterNum].getAddress())
      })

      it('User loses minter role after minting', async () => {
        // Verify user no longer has minter role
        expect(await plushie.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.false
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
        const poorUser = minters[minters.length - 1]

        // Whitelist the poor user (give them minter role)
        await plushie.connect(whitelistGuardAlice).addToWhitelist([await poorUser.getAddress()])
        expect(await plushie.hasRole(minterRole, await poorUser.getAddress())).to.be.true

        // Verify they have insufficient stRIF balance (should be 0)
        const userBalance = await stRIF.balanceOf(await poorUser.getAddress())
        expect(userBalance).to.be.lt(stRifThreshold)

        // Attempt to mint should fail with balance threshold error
        await expect(plushie.connect(poorUser).mint())
          .to.be.revertedWithCustomError(plushie, 'PlushieNftBelowTokenThreshold')
          .withArgs(userBalance, stRifThreshold)
      })
      it('User who is not in the whitelist cannot mint NFT', async () => {
        await expect(plushie.connect(stranger).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), minterRole)
      })

      it('Admin role who is not in the whitelist cannot mint NFT', async () => {
        await expect(plushie.connect(deployer).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await deployer.getAddress(), minterRole)
      })

      it('Whitelist guard who is not in the whitelist cannot mint NFT', async () => {
        // dewhitelist previously whitelisted guard (by another guard)
        await plushie
          .connect(whitelistGuardBob)
          .removeFromWhitelist([await whitelistGuardAlice.getAddress()])
          .then(tx => tx.wait())
        // make sure the guard was removed from whitelist
        expect(await plushie.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.false
        // trying to mint
        await expect(plushie.connect(whitelistGuardAlice).mint())
          .to.be.revertedWithCustomError(plushie, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), minterRole)
      })

      it('Address who already minted NFT cannot mint another NFT event after granting another minter role', async () => {
        // Whitelist and mint first NFT
        await plushie
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[minterNum].getAddress()])
          .then(tx => tx.wait())
        expect(await plushie.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
        await expect(plushie.connect(minters[minterNum]).mint())
          .to.be.revertedWithCustomError(plushie, 'ERC721InvalidOwner')
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
        await plushie.connect(whitelistGuardBob).addToWhitelist(addresses)

        // Mint 7 NFTs
        for (const index of availableMintersIndices) {
          await plushie
            .connect(minters[index])
            .mint()
            .then(tx => tx.wait())
        }

        // Verify we have 8 total minted
        expect(await plushie.tokensAvailable()).to.equal(0)
        expect(await plushie.totalSupply()).to.equal(maxSupply)
      })
    })

    describe('Sad path', () => {
      it('Attempt to mint when supply reaches exactly 8 - should fail', async () => {
        // Try to whitelist and mint when supply is exhausted
        await plushie.connect(whitelistGuardAlice).addToWhitelist([await minters[12].getAddress()])

        await expect(plushie.connect(minters[12]).mint())
          .to.be.revertedWithCustomError(plushie, 'PlushieNftOutOfTokens')
          .withArgs(maxSupply)
      })

      it('Multiple whitelisted users cannot mint simultaneously when supply exhausted', async () => {
        // Whitelist multiple users when supply is already exhausted

        // Use minters who have StRIF but haven't minted yet
        // minters[14] has StRIF and hasn't minted (only minters[4-13] have minted)
        const failIndices = [12, 13, 14]
        const addresses = await Promise.all(failIndices.map(async i => minters[i].getAddress()))
        await plushie.connect(whitelistGuardAlice).addToWhitelist(addresses)

        // Should fail to mint because supply is exhausted
        for (const index of failIndices) {
          await expect(plushie.connect(minters[index]).mint())
            .to.be.revertedWithCustomError(plushie, 'PlushieNftOutOfTokens')
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
        await expect(
          plushie.connect(tokenOwner).approve(await approvedUser.getAddress(), tokenId),
        ).to.not.revert(ethers)

        // Check approval was set
        expect(await plushie.getApproved(tokenId)).to.equal(await approvedUser.getAddress())

        // But transfer should still fail
        await expect(
          plushie
            .connect(approvedUser)
            .transferFrom(await tokenOwner.getAddress(), await approvedUser.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('setApprovalForAll() works but transfers still fail', async () => {
        // Use existing NFT owner
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1

        // setApprovalForAll should work
        await expect(
          plushie.connect(tokenOwner).setApprovalForAll(await operator.getAddress(), true),
        ).to.not.revert(ethers)

        // Check approval was set
        expect(await plushie.isApprovedForAll(await tokenOwner.getAddress(), await operator.getAddress())).to
          .be.true

        // But transfer should still fail
        await expect(
          plushie
            .connect(operator)
            .transferFrom(await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Owner is unable to transfer Plushie with safeTransferFrom() function', async () => {
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1
        expect(await plushie.balanceOf(await tokenOwner.getAddress())).equals(1)
        await expect(
          plushie
            .connect(tokenOwner)
            [
              'safeTransferFrom(address,address,uint256)'
            ](await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })
    })
    describe('Sad path', () => {
      it('User A cannot transfer token to User B', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          plushie
            .connect(tokenOwner)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Admin cannot execute transfer on behalf of user', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          plushie
            .connect(deployer)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })

      it('Marketplace contract cannot execute transfer after approval', async () => {
        // Simulate marketplace contract (using another signer)
        const tokenOwner = minters[4]
        const marketplaceContract = minters[11]
        const recipient = minters[12]
        const tokenId = 1

        // User approves marketplace
        await plushie
          .connect(tokenOwner)
          .approve(await marketplaceContract.getAddress(), tokenId)
          .then(tx => tx.wait())

        // Marketplace tries to transfer but fails
        await expect(
          plushie
            .connect(marketplaceContract)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(plushie, 'PlushieNftTransfersDisabled')
      })
    })
  })

  describe('Contract State & Metadata', () => {
    describe('Happy path', () => {
      it('Check totalSupply(), balanceOf(), and ownerOf() accuracy after various operations', async () => {
        // Should have exactly 10 tokens (maxSupply reached)
        const totalSupply = await plushie.totalSupply()
        expect(totalSupply).to.equal(maxSupply)

        // Check specific balances
        expect(await plushie.balanceOf(await minters[4].getAddress())).to.equal(1) // minterNum from minting tests

        // Verify ownership of first and last tokens
        expect(await plushie.ownerOf(1)).to.equal(await minters[4].getAddress()) // First token from minting tests
        expect(await plushie.ownerOf(maxSupply)).to.equal(await minters[11].getAddress()) // Last token from supply limit tests

        // Verify tokens available is 0
        expect(await plushie.tokensAvailable()).to.equal(0)
      })

      it('All tokens have the same metadata IPFS CID', async () => {
        // Check tokenURI for all minted tokens (1 to 10)
        for (let tokenId = 1; tokenId <= maxSupply; tokenId++) {
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
