import { expect } from 'chai'
import hre from 'hardhat'
import { Address, WalletClient, createPublicClient, http, parseEther, parseUnits } from 'viem'
import { hardhat } from 'viem/chains'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types'
import { RIFTokenContact$Type } from '../artifacts/contracts/RIFToken.sol/RIFTokenContact'

describe('RIFToken Contract', function () {
  let owner: Address, addr1: Address, addr2: Address
  let ownerAcc: WalletClient, addr1Acc: WalletClient, addr2Acc: WalletClient
  let rifToken: GetContractReturnType<RIFTokenContact$Type['abi']>

  const deployRif = () => hre.viem.deployContract('RIFTokenContact')

  before(async () => {
    ;[ownerAcc, addr1Acc, addr2Acc] = await hre.viem.getWalletClients()
    owner = (await ownerAcc.getAddresses())[0]
    addr1 = (await addr1Acc.getAddresses())[0]
    addr2 = (await addr2Acc.getAddresses())[0]
    rifToken = await loadFixture(deployRif)

    createPublicClient({
      chain: hardhat,
      transport: http(),
    })
  })

  it('Should assign the initial balance to the contract itself', async function () {
    const contractBalance = await rifToken.read.balanceOf([rifToken.address])
    expect(contractBalance).to.equal(parseUnits('1000000000', 18))
  })

  it('Should use validAddress', async function () {
    const isAddressOneValid = await rifToken.read.validAddress([addr1])
    expect(isAddressOneValid).to.be.true
  })

  // Single block to test the entire Transfer flow

  it('Should transfer all the tokens to deployer/owner using setAuthorizedManagerContract', async function () {
    await rifToken.write.setAuthorizedManagerContract([owner])

    expect(await rifToken.read.balanceOf([owner])).to.be.equal(parseUnits('1000000000', 18))
  })

  it('Should transfer tokens between accounts', async function () {
    // Close distribution
    const provider = await hre.viem.getPublicClient()

    const latestBlock = await provider.getBlock()
    console.log('latestBlock', latestBlock)

    if (latestBlock) {
      // We must close tokenDistribution to send transactions
      await rifToken.write.closeTokenDistribution([BigInt(latestBlock.timestamp)])

      // Transfer 50 RIF Tokens to address 1
      await rifToken.write.transfer([addr1, parseEther('50')])

      const addr1Balance = await rifToken.read.balanceOf([addr1])
      console.log('addr1Balance', addr1Balance)
      expect(addr1Balance).to.equal(parseEther('50'))

      // Transfer 10 RIF Tokens from address 1 to address 2
      await rifToken.write.transfer([addr2, parseUnits('10', 18)])
      const addr2Balance = await rifToken.read.balanceOf([addr2])
      expect(addr2Balance).to.equal(parseUnits('10', 18))
    }
  })

  it('Should make sure that the "Transfer" event is emitted', async () => {
    // Also check that the event "Transfer" is emitted
    await expect(rifToken.write.transfer([addr1, 1n]))
      .to.emit(rifToken, 'Transfer(address,address,uint256)')
      .withArgs(owner, addr1, 1)
  })
})
