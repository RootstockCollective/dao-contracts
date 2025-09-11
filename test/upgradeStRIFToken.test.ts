import type { StRIFToken, StRIFTokenV2 } from '../types/ethers-contracts/index.js'
import { expect, ignition } from './config.js'
import { deployContracts } from './deployContracts.js'
import stRifTokenV2Module from '../ignition/modules/StRIFTokenUpgradeModule.js'

describe('Upgrade StRIFToken', () => {
  let stRIF: StRIFToken
  let stRIFV2: StRIFTokenV2

  before(async () => {
    ;({ stRIF } = await deployContracts())
  })

  it('StRIFToken V1 should be deployed', async () => {
    expect(await stRIF.name()).to.equal('StRIFToken')
  })

  it('Ignition should deploy StRIFToken V2', async () => {
    stRIFV2 = (
      await ignition.deploy(stRifTokenV2Module, {
        parameters: {
          stRIFTokenUpgrade: {
            StRIFTokenProxyAddress: await stRIF.getAddress(),
          },
        },
      })
    ).strifV2 as unknown as StRIFTokenV2
  })

  it('StRIFToken V2 and V1 should have the same addresses', async () => {
    expect(await stRIF.getAddress()).to.equal(await stRIFV2.getAddress())
  })

  it('The StRIFToken should now have Version #2', async () => {
    expect(await stRIFV2.version())
  })

  it('old parameters should persist after upgrade', async () => {
    expect(await stRIFV2.name()).to.equal('StRIFToken')
    expect(await stRIFV2.symbol()).to.equal('stRIF')
    expect(await stRIFV2.decimals()).to.equal(18)
  })

  it('New variable should be stored after the re-initialization', async () => {
    expect(await stRIFV2.actualVersion()).to.equal(2)
  })
})
