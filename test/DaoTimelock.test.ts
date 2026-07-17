import { expect } from 'chai'
import { ethers } from 'hardhat'
import { DaoTimelockUpgradableRootstockCollective } from '../typechain-types'

describe('DaoTimelockUpgradableRootstockCollective initialization guard', () => {
  const minDelay = 900
  const zeroAddress = ethers.ZeroAddress

  /**
   * Deploys the timelock implementation behind an ERC1967 proxy, forwarding the
   * given roles to `initialize`. Returns the proxy typed as the timelock.
   */
  const deployTimelock = async (proposers: string[], executors: string[], admin: string) => {
    const Timelock = await ethers.getContractFactory('DaoTimelockUpgradableRootstockCollective')
    const implementation = await Timelock.deploy()
    await implementation.waitForDeployment()

    const initData = implementation.interface.encodeFunctionData('initialize', [
      minDelay,
      proposers,
      executors,
      admin,
    ])

    const Proxy = await ethers.getContractFactory('ERC1967Proxy')
    const proxy = await Proxy.deploy(await implementation.getAddress(), initData)
    await proxy.waitForDeployment()

    return Timelock.attach(await proxy.getAddress()) as unknown as DaoTimelockUpgradableRootstockCollective
  }

  it('reverts when admin is zero and both role arrays are empty', async () => {
    const Timelock = await ethers.getContractFactory('DaoTimelockUpgradableRootstockCollective')
    await expect(deployTimelock([], [], zeroAddress)).to.be.revertedWithCustomError(
      Timelock,
      'InvalidTimelockBootstrap',
    )
  })

  it('reverts when admin is zero and only executors are provided', async () => {
    const [operator] = await ethers.getSigners()
    const Timelock = await ethers.getContractFactory('DaoTimelockUpgradableRootstockCollective')
    await expect(deployTimelock([], [operator.address], zeroAddress)).to.be.revertedWithCustomError(
      Timelock,
      'InvalidTimelockBootstrap',
    )
  })

  it('reverts when admin is zero and only proposers are provided', async () => {
    const [operator] = await ethers.getSigners()
    const Timelock = await ethers.getContractFactory('DaoTimelockUpgradableRootstockCollective')
    await expect(deployTimelock([operator.address], [], zeroAddress)).to.be.revertedWithCustomError(
      Timelock,
      'InvalidTimelockBootstrap',
    )
  })

  it('succeeds when a non-zero admin is provided with empty role arrays', async () => {
    const [admin] = await ethers.getSigners()
    const timelock = await deployTimelock([], [], admin.address)
    const adminRole = await timelock.DEFAULT_ADMIN_ROLE()
    expect(await timelock.hasRole(adminRole, admin.address)).to.equal(true)
  })

  it('succeeds when admin is zero but proposer and executor roles are assigned', async () => {
    const [proposer, executor] = await ethers.getSigners()
    const timelock = await deployTimelock([proposer.address], [executor.address], zeroAddress)
    const proposerRole = await timelock.PROPOSER_ROLE()
    const executorRole = await timelock.EXECUTOR_ROLE()
    expect(await timelock.hasRole(proposerRole, proposer.address)).to.equal(true)
    expect(await timelock.hasRole(executorRole, executor.address)).to.equal(true)
  })
})
