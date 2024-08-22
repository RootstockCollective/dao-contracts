import { buildModule } from '@nomicfoundation/ignition-core'

export default buildModule('Treasury', m => {
  const deployer = m.getAccount(0)
  const treasury = m.contract('TreasuryDao', [deployer, deployer], {
    from: deployer,
  })

  return { treasury }
})
