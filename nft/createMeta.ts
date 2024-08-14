import fs from 'fs-extra'
import path from 'path'
import metadata from './metadata.json'

// change the NFT collection URL depending on whether you are on the testnet or mainnet
const communitiesUrl = 'https://frontend.testnet.dao.rif.technology/communities'
// paste the CID of Pinata images folder
const imagesFolderCID = 'QmfDwhwpU21G9x2kzbhw1LjQGDUFLucAjcJsn8ivqTgXrm'

/**
 * Generates separate JSON metadata files from the metadata collection stored in the `metadata.json` file
 */
async function createMetaFiles() {
  const outputDir = path.join(__dirname, 'meta')
  await fs.ensureDir(outputDir)
  await fs.emptyDir(outputDir)
  // Create NFT file for each Metadata record
  await Promise.all(
    metadata.map(async (meta, index) => {
      const fileName = `${index + 1}.json`
      const filePath = path.join(outputDir, fileName)

      const newItem = {
        ...meta,
        image: `ipfs://${imagesFolderCID}/${index + 1}.png`,
        external_url: communitiesUrl,
        creator: 'Rootstock Labs',
      }

      fs.writeJSON(filePath, newItem, { spaces: 2 })

      console.log(`Created file: ${fileName}`)
    }),
  )
}

createMetaFiles().catch(err => console.error(err instanceof Error ? err.message : err))
