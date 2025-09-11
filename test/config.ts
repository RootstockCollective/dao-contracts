import { network } from 'hardhat'
import { expect } from 'chai'
import type { Signer } from 'ethers'

const hre = await network.connect()
const { ethers, ignition } = hre

export default hre
export { expect, type Signer, ethers, ignition }
