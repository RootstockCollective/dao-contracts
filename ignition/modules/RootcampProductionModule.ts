import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { RootcampModule } from './RootcampModule'

export const RootcampProductionModule = buildModule('RootcampProduction', m => {
  const { Rootcamp } = m.useModule(RootcampModule)

  const deployer = m.getAccount(0)
  const newAdmin = m.getParameter('newAdmin')
  const guardRole = m.staticCall(Rootcamp, 'WHITELIST_GUARD_ROLE', [], 0, { id: 'GetGuardRole' })

  const renounceGuard = m.call(Rootcamp, 'renounceRole', [guardRole, deployer], {
    id: 'RenounceWhitelistGuard',
  })

  m.call(Rootcamp, 'transferDefaultAdminRole', [newAdmin], {
    id: 'TransferAdmin',
    after: [renounceGuard],
  })

  return { Rootcamp }
})

export default RootcampProductionModule
