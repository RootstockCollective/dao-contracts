import { RootcampModule } from '../ignition/modules/RootcampModule'
import type { RootcampRootstockCollective, RIFToken, StRIFToken } from '../typechain-types'
import { ethers, ignition } from 'hardhat'
import { expect } from 'chai'
import type { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { deployContracts } from './deployContracts'

const maxSupply = 8
const stRifThreshold = 1n * 10n ** 18n // 1 StRIF
const ipfsFolderCid = 'QmRmdc7FzSNSrCLHibvEQmAvmYu2AqSroyWsMAPRt9LgTi'
const minterRole = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
const whitelistGuardRole = ethers.keccak256(ethers.toUtf8Bytes('WHITELIST_GUARD_ROLE'))
const adminRole = ethers.ZeroHash

async function deployRootcampNft(stRifAddress: string, whitelistGuards: string[] = []) {
  const { Rootcamp } = await ignition.deploy(RootcampModule, {
    parameters: {
      Rootcamp: {
        stRif: stRifAddress,
        stRifThreshold,
        maxSupply,
        ipfsFolderCid,
        whitelistGuards,
      },
    },
  })
  return Rootcamp as unknown as RootcampRootstockCollective
}

describe('RootcampRootstockCollective NFT', () => {
  let rootcamp: RootcampRootstockCollective
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
    rootcamp = await deployRootcampNft(stRifAddress, [
      await whitelistGuardAlice.getAddress(),
      await whitelistGuardBob.getAddress(),
    ])
  })

  describe('upon deployment', () => {
    it('should set up proper NFT name and symbol', async () => {
      expect(await rootcamp.name()).to.equal('Rootcamp Certified Builder')
      expect(await rootcamp.symbol()).to.equal('RRC')
    })
    it('Minter role should be set up', async () => {
      expect(await rootcamp.MINTER_ROLE()).to.equal(minterRole)
    })
    it('Admin role should be set up', async () => {
      expect(await rootcamp.DEFAULT_ADMIN_ROLE()).to.equal(adminRole)
    })
    it('Whitelist Guard role should be set up', async () => {
      expect(await rootcamp.WHITELIST_GUARD_ROLE()).to.equal(whitelistGuardRole)
    })
    it('Minter role should be administrated by Whitelist guard role', async () => {
      expect(await rootcamp.getRoleAdmin(minterRole)).to.equal(whitelistGuardRole)
    })
    it('Deployer should be granted the admin role', async () => {
      expect(await rootcamp.hasRole(adminRole, await deployer.getAddress())).to.be.true
    })
    it('Deployer should be granted the Whitelist guard role', async () => {
      expect(await rootcamp.hasRole(whitelistGuardRole, await deployer.getAddress())).to.be.true
    })
    it('Should set max supply correctly', async () => {
      expect(await rootcamp.maxSupply()).to.equal(maxSupply)
    })
    it('NFT contract should have Max supply of available tokens', async () => {
      expect(await rootcamp.tokensAvailable()).to.equal(maxSupply)
    })
    it('Should set StRif as underlying token', async () => {
      expect(await rootcamp.underlyingToken()).to.equal(await stRIF.getAddress())
    })
    it('Should set StRif threshold for NFT minting', async () => {
      expect(await rootcamp.underlyingTokenThreshold()).to.equal(stRifThreshold)
    })
  })

  describe('Role Management & Access Control', () => {
    describe('Happy path', () => {
      it('Whitelist guards should be set up upon deployment', async () => {
        expect(await rootcamp.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.true
        expect(await rootcamp.hasRole(whitelistGuardRole, await whitelistGuardBob.getAddress())).to.be.true
      })
      it('Whitelist guards can whitelist addresses', async () => {
        const tx = rootcamp
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[0].getAddress(), await minters[1].getAddress()])

        await expect(tx)
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(minterRole, await minters[0].getAddress(), await whitelistGuardAlice.getAddress())
        await expect(tx)
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(minterRole, await minters[1].getAddress(), await whitelistGuardAlice.getAddress())

        expect(await rootcamp.hasRole(minterRole, await minters[0].getAddress())).to.be.true
        expect(await rootcamp.hasRole(minterRole, await minters[1].getAddress())).to.be.true
      })
      it('Deployer can transfer DEFAULT_ADMIN_ROLE to another address', async () => {
        const newAdmin = minters[0]

        expect(await rootcamp.hasRole(adminRole, await deployer.getAddress())).to.be.true
        expect(await rootcamp.hasRole(adminRole, await newAdmin.getAddress())).to.be.false
        expect(await rootcamp.getRoleMemberCount(adminRole)).to.equal(1)

        const tx = rootcamp.transferDefaultAdminRole(await newAdmin.getAddress())
        await expect(tx)
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(adminRole, await newAdmin.getAddress(), await deployer.getAddress())
        await expect(tx)
          .to.emit(rootcamp, 'RoleRevoked')
          .withArgs(adminRole, await deployer.getAddress(), await deployer.getAddress())

        expect(await rootcamp.hasRole(adminRole, await deployer.getAddress())).to.be.false
        expect(await rootcamp.hasRole(adminRole, await newAdmin.getAddress())).to.be.true
        expect(await rootcamp.getRoleMemberCount(adminRole)).to.equal(1)

        const newCid = 'QmNewTestCid123'
        await expect(rootcamp.connect(newAdmin).setFolderIpfsCid(newCid))
          .to.emit(rootcamp, 'RootcampNftFolderIpfsCidChanged')
          .withArgs(ipfsFolderCid, newCid)

        // give admin role back for testing convenience
        await rootcamp
          .connect(newAdmin)
          .transferDefaultAdminRole(await deployer.getAddress())
          .then(tx => tx.wait())
        await rootcamp.setFolderIpfsCid(ipfsFolderCid).then(tx => tx.wait())
      })
    })
    describe('Sad path', () => {
      it('Stranger cannot grant himself Whitelist Guard role', async () => {
        await expect(rootcamp.connect(stranger).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), adminRole)
      })
      it('Whitelist Guards cannot grant Whitelist Guard role to extraneous address', async () => {
        await expect(rootcamp.connect(whitelistGuardAlice).addWhitelistGuards([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), adminRole)
      })
      it('Default admin cannot renounce his role when he is the last admin', async () => {
        await expect(
          rootcamp.renounceRole(adminRole, await deployer.getAddress()),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftAdminRoleViolation')
      })
      it('Cannot grant second admin role - only one admin allowed', async () => {
        await expect(
          rootcamp.grantRole(adminRole, await stranger.getAddress()),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftAdminRoleViolation')
      })
      it('Owner removes whitelist guard role, then that address tries to modify whitelist', async () => {
        await rootcamp.removeWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
        expect(await rootcamp.hasRole(whitelistGuardRole, await whitelistGuardAlice.getAddress())).to.be.false
        await expect(rootcamp.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()]))
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), whitelistGuardRole)
        // return guard role to Alice
        await rootcamp.addWhitelistGuards([await whitelistGuardAlice.getAddress()]).then(tx => tx.wait())
      })
      it('Admin cannot transfer DEFAULT_ADMIN_ROLE to themselves', async () => {
        await expect(rootcamp.transferDefaultAdminRole(await deployer.getAddress()))
          .to.be.revertedWithCustomError(rootcamp, 'RootcampNftInvalidAddress')
          .withArgs(await deployer.getAddress())

        // Verify admin still has the role
        expect(await rootcamp.hasRole(adminRole, await deployer.getAddress())).to.be.true
      })
    })
  })

  describe('Whitelist Management', () => {
    describe('Happy path', () => {
      it('Whitelist guard can add themselves to the minting whitelist', async () => {
        await expect(
          rootcamp.connect(whitelistGuardAlice).addToWhitelist([await whitelistGuardAlice.getAddress()]),
        )
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(
            minterRole,
            await whitelistGuardAlice.getAddress(),
            await whitelistGuardAlice.getAddress(),
          )

        expect(await rootcamp.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.true
      })

      it('Add the same address to whitelist multiple times - handle gracefully', async () => {
        await rootcamp
          .connect(whitelistGuardAlice)
          .addToWhitelist([await stranger.getAddress()])
          .then(tx => tx.wait())
        expect(await rootcamp.hasRole(minterRole, await stranger.getAddress())).to.be.true

        await expect(rootcamp.connect(whitelistGuardAlice).addToWhitelist([await stranger.getAddress()])).to
          .be.not.reverted

        expect(await rootcamp.hasRole(minterRole, await stranger.getAddress())).to.be.true
      })

      it('Remove non-whitelisted address from whitelist - handle gracefully', async () => {
        await expect(rootcamp.connect(whitelistGuardAlice).removeFromWhitelist([await stranger.getAddress()]))
          .to.be.not.reverted

        expect(await rootcamp.hasRole(minterRole, await stranger.getAddress())).to.be.false
      })

      it('Add contract address itself to whitelist - handle gracefully', async () => {
        const contractAddress = await rootcamp.getAddress()

        await expect(rootcamp.connect(whitelistGuardAlice).addToWhitelist([contractAddress]))
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(minterRole, contractAddress, await whitelistGuardAlice.getAddress())

        expect(await rootcamp.hasRole(minterRole, contractAddress)).to.be.true
      })

      it('Batch whitelist operations: Add multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress())

        const tx = rootcamp.connect(whitelistGuardAlice).addToWhitelist(addresses)

        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(rootcamp, 'RoleGranted')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        const roleChecks = addresses.map(address => rootcamp.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.true
        })
      })

      it('Batch whitelist operations: Remove multiple addresses in single transaction', async () => {
        const addresses = minters.slice(10, 15).map(s => s.getAddress())

        const tx = rootcamp.connect(whitelistGuardAlice).removeFromWhitelist(addresses)

        const eventChecks = addresses.map(async address =>
          expect(tx)
            .to.emit(rootcamp, 'RoleRevoked')
            .withArgs(minterRole, address, await whitelistGuardAlice.getAddress()),
        )
        await Promise.all(eventChecks)

        const roleChecks = addresses.map(address => rootcamp.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })
      })

      it('Whitelisting empty array - handle gracefully', async () => {
        await expect(rootcamp.connect(whitelistGuardAlice).addToWhitelist([])).to.be.not.reverted
        await expect(rootcamp.connect(whitelistGuardAlice).removeFromWhitelist([])).to.be.not.reverted
      })

      it('getMinters() returns correct list of whitelisted addresses', async () => {
        const mintersFromContract = await rootcamp.getMinters()

        expect(mintersFromContract).to.have.lengthOf(4)
        expect(mintersFromContract).to.include(await rootcamp.getAddress())
        expect(mintersFromContract).to.include(await minters[0].getAddress())
        expect(mintersFromContract).to.include(await minters[1].getAddress())
        expect(mintersFromContract).to.include(await whitelistGuardAlice.getAddress())

        for (const minter of mintersFromContract) {
          expect(await rootcamp.hasRole(minterRole, minter)).to.be.true
        }
      })
    })
    describe('Sad path', () => {
      it('Whitelist guard cannot add zero address to whitelist', async () => {
        await expect(
          rootcamp.connect(whitelistGuardAlice).addToWhitelist([ethers.ZeroAddress]),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftAdminRoleViolation')

        expect(await rootcamp.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })

      it('Batch whitelist with zero address mixed with valid addresses - should fail', async () => {
        const validAddresses = [await minters[2].getAddress(), await minters[3].getAddress()]
        const mixedAddresses = [validAddresses[0], ethers.ZeroAddress, validAddresses[1]]

        await expect(
          rootcamp.connect(whitelistGuardAlice).addToWhitelist(mixedAddresses),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftAdminRoleViolation')

        const roleChecks = validAddresses.map(address => rootcamp.hasRole(minterRole, address))
        const results = await Promise.all(roleChecks)
        results.forEach(hasRole => {
          expect(hasRole).to.be.false
        })

        expect(await rootcamp.hasRole(minterRole, ethers.ZeroAddress)).to.be.false
      })
    })
  })

  describe('Minting', () => {
    const minterNum = 4
    describe('Happy path', () => {
      it('User gets minter role when whitelisted', async () => {
        await expect(
          rootcamp.connect(whitelistGuardAlice).addToWhitelist([await minters[minterNum].getAddress()]),
        )
          .to.emit(rootcamp, 'RoleGranted')
          .withArgs(minterRole, await minters[minterNum].getAddress(), await whitelistGuardAlice.getAddress())

        expect(await rootcamp.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
      })

      it('Whitelisted user can successfully mint NFT', async () => {
        await expect(rootcamp.connect(minters[minterNum]).mint())
          .to.emit(rootcamp, 'Transfer')
          .withArgs(ethers.ZeroAddress, await minters[minterNum].getAddress(), 1)
      })

      it('User owns the minted NFT', async () => {
        expect(await rootcamp.balanceOf(await minters[minterNum].getAddress())).to.equal(1)
        expect(await rootcamp.ownerOf(1)).to.equal(await minters[minterNum].getAddress())
      })

      it('User loses minter role after minting', async () => {
        expect(await rootcamp.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.false
      })

      it('Token has correct metadata URI', async () => {
        expect(await rootcamp.tokenURI(1)).to.equal(`ipfs://${ipfsFolderCid}`)
      })

      it('Tokens available count decreases after mint', async () => {
        expect(await rootcamp.tokensAvailable()).to.equal(maxSupply - 1)
      })
    })
    describe('Sad path', () => {
      it('User with insufficient StRif balance cannot mint NFT', async () => {
        const poorUser = minters[minters.length - 1]

        await rootcamp.connect(whitelistGuardAlice).addToWhitelist([await poorUser.getAddress()])
        expect(await rootcamp.hasRole(minterRole, await poorUser.getAddress())).to.be.true

        const userBalance = await stRIF.balanceOf(await poorUser.getAddress())
        expect(userBalance).to.be.lt(stRifThreshold)

        await expect(rootcamp.connect(poorUser).mint())
          .to.be.revertedWithCustomError(rootcamp, 'RootcampNftBelowTokenThreshold')
          .withArgs(userBalance, stRifThreshold)
      })
      it('User who is not in the whitelist cannot mint NFT', async () => {
        await expect(rootcamp.connect(stranger).mint())
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await stranger.getAddress(), minterRole)
      })

      it('Admin role who is not in the whitelist cannot mint NFT', async () => {
        await expect(rootcamp.connect(deployer).mint())
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await deployer.getAddress(), minterRole)
      })

      it('Whitelist guard who is not in the whitelist cannot mint NFT', async () => {
        await rootcamp
          .connect(whitelistGuardBob)
          .removeFromWhitelist([await whitelistGuardAlice.getAddress()])
          .then(tx => tx.wait())
        expect(await rootcamp.hasRole(minterRole, await whitelistGuardAlice.getAddress())).to.be.false
        await expect(rootcamp.connect(whitelistGuardAlice).mint())
          .to.be.revertedWithCustomError(rootcamp, 'AccessControlUnauthorizedAccount')
          .withArgs(await whitelistGuardAlice.getAddress(), minterRole)
      })

      it('Address who already minted NFT cannot mint another NFT even after granting another minter role', async () => {
        await rootcamp
          .connect(whitelistGuardAlice)
          .addToWhitelist([await minters[minterNum].getAddress()])
          .then(tx => tx.wait())
        expect(await rootcamp.hasRole(minterRole, await minters[minterNum].getAddress())).to.be.true
        await expect(rootcamp.connect(minters[minterNum]).mint())
          .to.be.revertedWithCustomError(rootcamp, 'ERC721InvalidOwner')
          .withArgs(await minters[minterNum].getAddress())
      })
    })
  })

  describe('Supply Limits', () => {
    describe('Happy path', () => {
      it('8th mint by whitelisted address succeeds', async () => {
        const availableMintersIndices = [5, 6, 7, 8, 9, 10, 11]
        const addresses = availableMintersIndices.map(i => minters[i].getAddress())

        await rootcamp.connect(whitelistGuardBob).addToWhitelist(addresses)

        for (const index of availableMintersIndices) {
          await rootcamp
            .connect(minters[index])
            .mint()
            .then(tx => tx.wait())
        }

        expect(await rootcamp.tokensAvailable()).to.equal(0)
        expect(await rootcamp.totalSupply()).to.equal(maxSupply)
      })
    })

    describe('Sad path', () => {
      it('Attempt to mint when supply is exhausted - should fail', async () => {
        await rootcamp.connect(whitelistGuardAlice).addToWhitelist([await minters[12].getAddress()])

        await expect(rootcamp.connect(minters[12]).mint())
          .to.be.revertedWithCustomError(rootcamp, 'RootcampNftOutOfTokens')
          .withArgs(maxSupply)
      })

      it('Multiple whitelisted users cannot mint simultaneously when supply exhausted', async () => {
        const failIndices = [12, 13, 14]
        const addresses = await Promise.all(failIndices.map(async i => minters[i].getAddress()))
        await rootcamp.connect(whitelistGuardAlice).addToWhitelist(addresses)

        for (const index of failIndices) {
          await expect(rootcamp.connect(minters[index]).mint())
            .to.be.revertedWithCustomError(rootcamp, 'RootcampNftOutOfTokens')
            .withArgs(maxSupply)
        }
      })
    })
  })

  describe('Transfer Prevention', () => {
    describe('Happy path', () => {
      it('approve() function works but transfers still fail', async () => {
        const tokenOwner = minters[4]
        const approvedUser = minters[15]
        const tokenId = 1

        await expect(rootcamp.connect(tokenOwner).approve(await approvedUser.getAddress(), tokenId)).to.be.not
          .reverted

        expect(await rootcamp.getApproved(tokenId)).to.equal(await approvedUser.getAddress())

        await expect(
          rootcamp
            .connect(approvedUser)
            .transferFrom(await tokenOwner.getAddress(), await approvedUser.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })

      it('setApprovalForAll() works but transfers still fail', async () => {
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1

        await expect(rootcamp.connect(tokenOwner).setApprovalForAll(await operator.getAddress(), true)).to.be
          .not.reverted

        expect(await rootcamp.isApprovedForAll(await tokenOwner.getAddress(), await operator.getAddress())).to
          .be.true

        await expect(
          rootcamp
            .connect(operator)
            .transferFrom(await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })

      it('Owner is unable to transfer NFT with safeTransferFrom() function', async () => {
        const tokenOwner = minters[4]
        const operator = minters[12]
        const tokenId = 1
        expect(await rootcamp.balanceOf(await tokenOwner.getAddress())).equals(1)
        await expect(
          rootcamp
            .connect(tokenOwner)
            [
              'safeTransferFrom(address,address,uint256)'
            ](await tokenOwner.getAddress(), await operator.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })
    })
    describe('Sad path', () => {
      it('User A cannot transfer token to User B', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          rootcamp
            .connect(tokenOwner)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })

      it('Admin cannot execute transfer on behalf of user', async () => {
        const tokenOwner = minters[4]
        const recipient = minters[12]
        const tokenId = 1

        await expect(
          rootcamp
            .connect(deployer)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })

      it('Marketplace contract cannot execute transfer after approval', async () => {
        const tokenOwner = minters[4]
        const marketplaceContract = minters[11]
        const recipient = minters[12]
        const tokenId = 1

        await rootcamp
          .connect(tokenOwner)
          .approve(await marketplaceContract.getAddress(), tokenId)
          .then(tx => tx.wait())

        await expect(
          rootcamp
            .connect(marketplaceContract)
            .transferFrom(await tokenOwner.getAddress(), await recipient.getAddress(), tokenId),
        ).to.be.revertedWithCustomError(rootcamp, 'RootcampNftTransfersDisabled')
      })
    })
  })

  describe('Contract State & Metadata', () => {
    describe('Happy path', () => {
      it('Check totalSupply(), balanceOf(), and ownerOf() accuracy after various operations', async () => {
        const totalSupply = await rootcamp.totalSupply()
        expect(totalSupply).to.equal(maxSupply)

        expect(await rootcamp.balanceOf(await minters[4].getAddress())).to.equal(1)

        expect(await rootcamp.ownerOf(1)).to.equal(await minters[4].getAddress())
        expect(await rootcamp.ownerOf(maxSupply)).to.equal(await minters[11].getAddress())

        expect(await rootcamp.tokensAvailable()).to.equal(0)
      })

      it('All tokens have the same metadata IPFS CID', async () => {
        for (let tokenId = 1; tokenId <= maxSupply; tokenId++) {
          const tokenUri = await rootcamp.tokenURI(tokenId)
          expect(tokenUri).to.equal(`ipfs://${ipfsFolderCid}`)
        }
      })

      it('getWhitelistGuards() returns correct list of guards', async () => {
        const guards = await rootcamp.getWhitelistGuards()

        expect(guards).to.have.lengthOf(3)
        expect(guards).to.include(await deployer.getAddress())
        expect(guards).to.include(await whitelistGuardBob.getAddress())
        expect(guards).to.include(await whitelistGuardAlice.getAddress())
      })

      it('getMinters() returns addresses that still have MINTER_ROLE after supply exhausted', async () => {
        const minters = await rootcamp.getMinters()

        expect(minters.length).to.be.greaterThan(0)

        for (const minter of minters) {
          expect(await rootcamp.hasRole(minterRole, minter)).to.be.true
        }
      })
    })
    describe('Sad path', () => {
      it('tokenURI() for non-existent token reverts with clear message', async () => {
        await expect(rootcamp.tokenURI(999))
          .to.be.revertedWithCustomError(rootcamp, 'ERC721NonexistentToken')
          .withArgs(999)
      })

      it('ownerOf() for non-existent token reverts', async () => {
        await expect(rootcamp.ownerOf(999))
          .to.be.revertedWithCustomError(rootcamp, 'ERC721NonexistentToken')
          .withArgs(999)
      })
    })
  })
})
