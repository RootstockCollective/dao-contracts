import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe("RIFToken Contract", function () {

  async function deployRif() {
    const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy AddressHelper library
    const addressHelper = await ethers.deployContract("AddressHelper");
    // Deploy AddressLinker library
    const addressLinker = await ethers.deployContract("AddressLinker", { libraries: { AddressHelper: addressHelper }});

    // Link libraries
    const rifToken = await ethers.deployContract("RIFToken", {
      libraries: {
        AddressLinker: addressLinker,
        AddressHelper: addressHelper,
      },
    });
    
    return {
      rifToken,
      owner,
      addr1,
      addr2,
      addrs
    }
  }
  
  it("Should assign the initial balance to the contract itself", async function () {
    const { rifToken } = await loadFixture(deployRif)
    const contractBalance = await rifToken.balanceOf(rifToken);
    expect(contractBalance).to.equal(ethers.parseUnits("1000000000", 18));
  });

  it("Should use validAddress", async function () {
    const { rifToken, addr1 } = await loadFixture(deployRif)
    const addressOne = await addr1.getAddress();
    const isAddressOneValid = await rifToken.validAddress(addressOne)
    expect(isAddressOneValid).to.be.true;
    
  });
  
  // Single block to test the entire Transfer flow
  
  let rifFixture: Awaited<ReturnType<typeof deployRif>>
  
  it("Should transfer all the tokens to deployer/owner using setAuthorizedManagerContract", async function() {
    rifFixture = await loadFixture(deployRif)
    const { rifToken, owner } = rifFixture
    await rifToken.setAuthorizedManagerContract(owner)
    
    expect(await rifToken.balanceOf(owner)).to.be.equal(ethers.parseUnits('1000000000', 'ether'))
  })

  it("Should transfer tokens between accounts", async function () {
    const { rifToken, addr1, addr2 } = rifFixture
    // Close distribution
    const latestBlock = await ethers.provider.getBlock('latest')
    
    if (latestBlock) {
      // We must close tokenDistribution to send transactions
      await rifToken.closeTokenDistribution(latestBlock.timestamp)

      // Transfer 50 RIF Tokens to address 1
      await rifToken.transfer(addr1, ethers.parseUnits("50", 'ether'));
      const addr1Balance = await rifToken.balanceOf(addr1);
      expect(addr1Balance).to.equal(ethers.parseUnits("50", 'ether'));

      // Transfer 10 RIF Tokens from address 1 to address 2
      await rifToken.connect(addr1).transfer(addr2, ethers.parseUnits("10", 'ether'));
      const addr2Balance = await rifToken.balanceOf(addr2);
      expect(addr2Balance).to.equal(ethers.parseUnits("10", 'ether'));
    }
  });
  
  it('Should make sure that the "Transfer" event is emitted', async () => {
    // Also check that the event "Transfer" is emitted
    const { rifToken, addr1, owner } = rifFixture
    
    await expect(
      rifToken.transfer(addr1, 1)
    ).to.emit(rifToken, 'Transfer(address,address,uint256)')
      .withArgs(owner, addr1, 1)
  })
});
