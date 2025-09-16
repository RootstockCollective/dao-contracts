import { task } from 'hardhat/config'
import { type HardhatRuntimeEnvironment } from 'hardhat/types/hre'
import { type Contract } from 'ethers'
import { isAddress } from 'ethers'

const defaultTreasury = '0xaCeaa438AfA008f43c50dB760b112ddc8fE3751B'
const defaultRecipient = '0xC0C9280C10E4D968394371d5b60aC5fCD1ae62e1'
const defaultToken = '0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE' // tRIF

/**
 * Validates and returns a trimmed address string.
 * Throws an error if the address is missing or invalid.
 */
async function validateAddress(address?: string): Promise<string> {
  if (!address) {
    throw new Error('Address is missing')
  }

  const trimmedAddress = address.trim()

  if (!isAddress(trimmedAddress)) {
    throw new Error('Address is not valid')
  }

  return trimmedAddress
}

/**
 * Validates that the caller has the necessary rights (is a Guardian) to withdraw all the funds.
 * Throws an error if the caller is not the Guardian.
 */
async function validateGuardianRights(hre: HardhatRuntimeEnvironment, treasury: Contract): Promise<void> {
  const { ethers } = await hre.network.connect()
  const [signer] = await ethers.getSigners()
  const GuardianRole = await treasury.GUARDIAN_ROLE()
  const hasGuardianRole = await treasury.hasRole(GuardianRole, signer)

  if (!hasGuardianRole) {
    throw new Error('You are not the Guardian and not allowed to withdraw funds')
  }
}

/**
 * Validates all parameters required to withdraw fund from Treasury.
 * Ensures the Treasury and Recipiend addresses are valid.
 */
async function validateParams(
  hre: HardhatRuntimeEnvironment,
  treasuryAddress?: string,
  recipientAddress?: string,
  tokenAddress?: string,
): Promise<{ treasury: Contract; recipient: string; token?: Contract }> {
  const { ethers } = await hre.network.connect()
  const validatedTreasuryAddress = await validateAddress(treasuryAddress)
  const validatedRecipientAddress = await validateAddress(recipientAddress)
  const treasury = await ethers.getContractAt('TreasuryDao', validatedTreasuryAddress)

  await validateGuardianRights(hre, treasury)

  if (tokenAddress) {
    const validatedTokenAddress = await validateAddress(tokenAddress)
    const token = await ethers.getContractAt('IERC20', validatedTokenAddress)
    return { treasury, recipient: validatedRecipientAddress, token }
  }
  return { treasury, recipient: validatedRecipientAddress }
}

/**
 * Withdraw all RBTC to the recipient.
 * Waits for the transaction to be confirmed and logs the new Treasury balance.
 */
async function withdraw(hre: HardhatRuntimeEnvironment, treasury: Contract, recipient: string) {
  const { ethers } = await hre.network.connect()
  const balance = await ethers.provider.getBalance(treasury)
  const sentTx = await treasury.emergencyWithdraw(recipient)
  await sentTx.wait()
  const newBalance = await ethers.provider.getBalance(treasury)
  console.info(
    `You have successfully withdrawn ${balance} RBTC from Treasury. Now the balance is ${newBalance}`,
  )
}

/**
 * Withdraw all ERC20 tokens to the recipient.
 * Waits for the transaction to be confirmed and logs the new Treasury balance.
 */
async function withdrawERC20(treasury: Contract, recipient: string, token: Contract) {
  const balance = await token.balanceOf(treasury)
  const sentTx = await treasury.emergencyWithdrawERC20(token, recipient)
  await sentTx.wait()
  const newBalance = await token.balanceOf(treasury)

  console.info(
    `You have successfully withdrawn ${balance} tokens from Treasury. Now the balance is ${newBalance}`,
  )
}

task('withdraw', 'Withdraw all RBTC from Treasury')
  .addOption({
    name: 'recipient',
    description: 'The entity or account that will receive all RBTC',
    defaultValue: '',
  })
  .addOption({ name: 'treasury', description: 'The treasury smart contract', defaultValue: '' })
  .setAction(async () => ({
    default: async ({ recipient, treasury }, hre) => {
      try {
        const treasuryAddress = treasury || defaultTreasury
        const recipientAddress = recipient || defaultRecipient

        const { treasury: treasuryContract, recipient: recipientAccount } = await validateParams(
          hre,
          treasuryAddress,
          recipientAddress,
        )
        await withdraw(hre, treasuryContract, recipientAccount)
      } catch (error) {
        console.error(`Error running the task: `, error instanceof Error ? error.message : error)
      }
    },
  }))

task('withdraw-erc20', 'Withdraw all ERC20 tokens from Treasury')
  .addOption({
    name: 'recipient',
    description: 'The entity or account that will receive all ERC20 tokens',
    defaultValue: '',
  })
  .addOption({
    name: 'treasury',
    description: 'The treasury smart contract',
    defaultValue: '',
  })
  .addOption({ name: 'token', description: 'The ERC20 token address', defaultValue: '' })
  .setAction(async () => ({
    default: async ({ recipient, token, treasury }, hre) => {
      try {
        const treasuryAddress = treasury || defaultTreasury
        const recipientAddress = recipient || defaultRecipient
        const tokenAddress = token || defaultToken

        const {
          treasury: treasuryContract,
          recipient: recipientAccount,
          token: tokenContract,
        } = await validateParams(hre, treasuryAddress, recipientAddress, tokenAddress)
        await withdrawERC20(treasuryContract, recipientAccount, tokenContract!)
      } catch (error) {
        console.error(`Error running the task: `, error instanceof Error ? error.message : error)
      }
    },
  }))
