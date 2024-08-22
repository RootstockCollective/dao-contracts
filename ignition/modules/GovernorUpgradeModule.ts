import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const governorUpgradeModule = buildModule('GovernorUpgrade', m => {
  const deployer = m.getAccount(0)

  // Load the governor proxy address
  const governorProxyAddress = m.getParameter('governorProxyAddress')

  // Use the module to fetch the existing proxy
  const governorProxyAddr = m.contractAt('RootDao', governorProxyAddress)

  //`RootDaoV2` is the new version
  const newGovernorImplementation = m.contract('RootDaoV2')

  // The new version number
  const newVersion = 2;

  // Prepare upgrade data
  const upgradeData = m.encodeFunctionCall(newGovernorImplementation, 'reInitialize', [newVersion])

  // Perform the upgrade
  const upgradeTx = m.call(governorProxyAddr, 'upgradeToAndCall', [newGovernorImplementation, upgradeData], {
    from: deployer,
    id: 'upgrade_governor',
  })

  return { governorProxyAddr, newGovernorImplementation }
})

const governorV2Module = buildModule('GovernorV2', m => {
  const { governorProxyAddr } = m.useModule(governorUpgradeModule)
  const gV2 = m.contractAt('RootDaoV2', governorProxyAddr)

  return { gV2 }
})

export default governorV2Module
