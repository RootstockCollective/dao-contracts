import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const stRifTokenUpgradeModule = buildModule('stRIFTokenUpgrade', m => {
  const deployer = m.getAccount(0)

  // Load the governor proxy address
  const stRIFTokenProxyAddress = m.getParameter('StRIFTokenProxyAddress')

  // Use the module to fetch the existing proxy
  const stRIFTokenProxyAddr = m.contractAt('StRIFToken', stRIFTokenProxyAddress)

  //`GovernorV2` is the new version
  const newStRIFTokenImplementation = m.contract('StRIFTokenV2')

  // The new version number
  const newVersion = 2;

  // Prepare upgrade data
  const upgradeData = m.encodeFunctionCall(newStRIFTokenImplementation, 'reInitialize', [newVersion])

  // Perform the upgrade
  const upgradeTx = m.call(stRIFTokenProxyAddr, 'upgradeToAndCall', [newStRIFTokenImplementation, upgradeData], {
    from: deployer,
    id: 'upgrade_governor',
  })

  return { stRIFTokenProxyAddr: stRIFTokenProxyAddr, newstRifTokenImplementation: newStRIFTokenImplementation }
})

const stRifTokenV2Module = buildModule('StRIFTokenV2', m => {
  const { stRIFTokenProxyAddr } = m.useModule(stRifTokenUpgradeModule)
  const strifV2 = m.contractAt('StRIFTokenV2', stRIFTokenProxyAddr)

  return { strifV2: strifV2 }
})

export default stRifTokenV2Module
