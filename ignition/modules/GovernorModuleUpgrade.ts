import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { governorProxyModule } from './GovernorModule';

export const governorUpgradeModule = buildModule('GovernorUpgrade', m => {
  const deployer = m.getAccount(0);

  //`RootDaoV2` is the new version
  const newGovernorImplementation = m.contract('RootDaoV2');

  // Use the module to fetch the existing proxy
  const { governorProxy } = m.useModule(governorProxyModule);

  // Prepare upgrade data
  const upgradeData = m.encodeFunctionCall(newGovernorImplementation, 'initialize', []);

  // Perform the upgrade
  const upgradeTx = m.call(governorProxy, 'upgradeToAndCall', [newGovernorImplementation, upgradeData], {
    from: deployer,
    id: 'upgrade_governor',
  });

  return { newGovernorImplementation };
});