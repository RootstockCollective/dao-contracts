import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { RootDao, RootDaoV2 } from '../typechain-types'
import { deployContracts } from './deployContracts'
import governorV2Module from '../ignition/modules/GovernorUpgradeModule'

describe('Upgrade Governor', () => {
  let governor: RootDao
  let governorV2: RootDaoV2

  before(async () => {
    ; ({ governor } = await loadFixture(deployContracts))
  })

  it('Governor V1 should be deployed', async () => {
    expect(await governor.version()).to.equal('1')
  })

  it('Ignition should deploy Governor V2', async () => {
    governorV2 = (
      await ignition.deploy(governorV2Module, {
        parameters: {
          GovernorUpgrade: {
            governorProxyAddress: await governor.getAddress(),
          },
        },
      })
    ).gV2 as unknown as RootDaoV2
  })

  it('Governor V2 and V1 should have the same addresses', async () => {
    expect(await governor.getAddress()).to.equal(await governorV2.getAddress())
  })

  it('The Governor should now have Version #2', async () => {
    expect(await governorV2.version())
  })

  it('old parameters should persist after upgrade', async () => {
    expect(await governorV2.votingDelay()).to.equal(1)
    expect(await governorV2.votingPeriod()).to.equal(240)
    expect(await governorV2.proposalThreshold()).to.equal(ethers.parseEther('10'))
  })

  it('New variable should be stored after the re-initialization', async () => {
    expect(await governorV2.actualVersion()).to.equal(2)
  })
})
