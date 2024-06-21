import { expect } from 'chai'
import hre from 'hardhat'
import { PublicClient, WalletClient, parseEther, parseEventLogs } from 'viem'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { rifTokenContracts } from '../typechain-types/factories'

describe('RIFToken Contract', function () {
  const rifInitialSupply = 10n ** 27n

  const setup = async () => {
    const [deployer, owner1, owner2] = await hre.viem.getWalletClients()
    const client = await hre.viem.getPublicClient()

    const rif = await hre.viem.deployContract('RIFTokenContact', [])
    return { deployer, client, rif, owner1, owner2 }
  }

  it('Should assign the initial balance to the contract itself', async () => {
    const { rif } = await loadFixture(setup)
    const balance = await rif.read.balanceOf([rif.address])
    expect(balance).to.equal(rifInitialSupply)
  })

  it('Should have a valid address', async () => {
    const { rif } = await loadFixture(setup)
    expect(rif.address).to.be.properAddress
  })

  describe('Token Transfer Functionality', () => {
    let rif: Awaited<ReturnType<typeof setup>>['rif']
    let deployer: WalletClient
    let owner1: WalletClient
    let owner2: WalletClient
    let client: PublicClient
    before(async () => {
      ;({ rif, deployer, client, owner1, owner2 } = await loadFixture(setup))
    })

    // Single block to test the entire Transfer flow

    it('Should transfer all the tokens to deployer/owner using setAuthorizedManagerContract', async () => {
      const hash = await rif.write.setAuthorizedManagerContract([deployer.account!.address])
      await client.waitForTransactionReceipt({ hash })
      const balance = await rif.read.balanceOf([deployer.account!.address])
      expect(balance).to.equal(rifInitialSupply)
    })

    it('should close distribution', async () => {
      const block = await client.getBlock()
      const hash = await rif.write.closeTokenDistribution([block.timestamp])
      await client.waitForTransactionReceipt({ hash })
    })

    it('deployer should transfer 50 tokens to owner 1', async () => {
      const amount = parseEther('50')
      await rif.write.transfer([owner1.account!.address, amount], {
        account: deployer.account,
      })
      expect(await rif.read.balanceOf([owner1.account!.address])).to.equal(amount)
    })

    it('deployer should transfer 10 tokens to owner 2 and emit Transfer event', async () => {
      const amount = parseEther('10')
      const hash = await rif.write.transfer([owner2.account!.address, amount], {
        account: deployer.account,
      })
      const receipt = await client.waitForTransactionReceipt({ hash })
      expect(await rif.read.balanceOf([owner2.account!.address])).to.equal(amount)
      // extracting events
      const [event] = parseEventLogs({
        abi: rif.abi,
        logs: receipt.logs,
        eventName: 'Transfer',
      })
      expect(event.args.value).to.equal(amount)
    })

    it('owner 1 should transfer his RIFs to owner 2', async () => {
      const balance = await rif.read.balanceOf([owner1.account!.address])
      const hash = await rif.write.transfer([owner2.account!.address, balance], {
        account: owner1.account,
      })
      await client.waitForTransactionReceipt({ hash })
      expect(await rif.read.balanceOf([owner1.account!.address])).to.equal(0n)
      expect(await rif.read.balanceOf([owner2.account!.address])).to.equal(parseEther('60'))
    })
  })
})
