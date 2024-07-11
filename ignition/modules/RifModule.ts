import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

// Hardhat Ignition only executes Future objects once
export default buildModule('RIF', m => {
  const deployer = m.getAccount(0)
  const rif = m.contract('RIFToken', [], {
    from: deployer,
  })
  const setAuthorizedManager = m.call(rif, 'setAuthorizedManagerContract', [deployer])
  const now = Math.round(Date.now() / 1000)
  m.call(rif, 'closeTokenDistribution', [now], { after: [setAuthorizedManager] })
  return { rif }
})
