import fs from 'fs-extra'
import path from 'path'

const sourceImagesFolder = path.resolve('nft', 'images')

/**
 * Renames images files to the format required for NFT metadata: sequential
 * order using whole numbers starting from 1 without gaps or spaces
 */
async function renameImages() {
  const files = (await fs.readdir(sourceImagesFolder)).sort((a, b) => a.localeCompare(b))

  await Promise.all(
    files.map(async (file, index) => {
      const { ext } = path.parse(file)
      if (ext === '.png') {
        try {
          await fs.rename(
            path.join(sourceImagesFolder, file),
            path.join(sourceImagesFolder, `${index + 1}.png`),
          )
        } catch (err) {
          console.error(`Error renaming file ${file}: ${err instanceof Error ? err.message : err}`)
        }
      }
    }),
  )
}

renameImages().catch(err => console.error(err instanceof Error ? err.message : err))
