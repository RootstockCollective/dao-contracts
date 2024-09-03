# Creating an NFT Collection

## Images

1. Place all the created images in the `nft/images` directory.
2. If needed, use the `nft/renameImages.ts` script to rename the images. Images should be named in sequential order using whole numbers starting from 1 without gaps or spaces, e.g., `1.png`, `2.png`, `3.png`, etc.
3. Upload the images directory to Pinata Cloud and copy its CID.
4. In the `createMeta.ts` file, specify the project's NFT URL and the images directory CID.

## Metadata

1. Create (or ask ChatGPT to create) a `metadata.json` file using the names and descriptions of each NFT in the collection, as provided by the designer. The structure of the metadata should be as follows:

    ```json
    [
      {
        "name": "NFT name",
        "description": "NFT detailed description"
      }
    ]
    ```

2. Use the `createMeta.ts` script to generate unique token metadata files. The script will generate metadata files based on the provided data and will also add some other fields, such as `image`, `creator`, etc.

    ```shell
    ts-node nft/createMeta.ts
    ```

3. Upload the entire folder with the created metadata files to Pinata Cloud.
4. Copy the CID of the created folder.

## Deployment

1. Update the Ignition parameters file `ignition/eaNft.json`. Ensure that the `ipfs` parameter correctly matches the CID of the metadata folder, and that `numFiles` reflects the exact number of metadata files in the folder.
2. Run the ignition module to deploy the NFT smart contract.

    ```shell
    npx hardhat ignition deploy \
    ignition/modules/EarlyAdoptersModule.ts \
    --parameters ignition/eaNft.json \
    --network rootstockTestnet
    ```
