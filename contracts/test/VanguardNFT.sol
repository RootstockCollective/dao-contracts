// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721NonTransferrableUpgradable} from "../NFT/ERC721NonTransferrableUpgradable.sol";
import {GovernorRootstockCollective} from "../GovernorRootstockCollective.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract VanguardNFTRootstockCollective is ERC721NonTransferrableUpgradable {
  using Strings for uint256;

  event IpfsFolderChanged(uint256 newNumFiles, string newIpfs);
  event ProposalCountChanged(uint8 newCount);

  error HasNotVoted();
  error MintError(string reason);

  GovernorRootstockCollective public governor;
  // Counter for the total number of minted tokens
  uint256 private _totalMinted;
  // number of metadata files in the IPFS directory
  uint256 private _maxSupply;
  // IPFS CID of the tokens metadata directory
  string private _folderIpfsCid;
  // The number of proposals that need to be checked to determine whether the user voted for any of them
  uint8 public proposalCount;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address initialOwner,
    GovernorRootstockCollective governorAddress,
    uint256 maxSupply,
    uint8 initialProposalCount,
    string calldata ipfsFolderCid
  ) public initializer {
    require(address(governorAddress) != address(0), "VanguardNFTRootstockCollective: No governor address");
    __ERC721UpgradableBase_init("VanguardNFTRootstockCollective", "VanNFT", initialOwner);
    governor = governorAddress;
    proposalCount = initialProposalCount;
    setIpfsFolder(maxSupply, ipfsFolderCid);
  }

  /**
   * @dev Sets a new IPFS folder and updates the maximum supply of tokens that can be minted.
   * This function is meant to be called by an admin when the metadata folder on IPFS is updated.
   * It ensures that the new maximum supply is greater than the previous one.
   * @param newMaxSupply The new maximum number of tokens that can be minted.
   * @param newIpfsCid The new IPFS CID for the metadata folder.
   */
  function setIpfsFolder(uint256 newMaxSupply, string calldata newIpfsCid) public virtual onlyOwner {
    require(newMaxSupply >= _maxSupply, "VanguardNFTRootstockCollective: Invalid max supply");
    _maxSupply = newMaxSupply;
    _folderIpfsCid = newIpfsCid;
    emit IpfsFolderChanged(newMaxSupply, newIpfsCid);
  }

  // uint256 lastCachedProposalId
  // function cacheProposals() internal virtual {}

  // рассмотреть вариант записи всех proposals вовнутрь NFT во избежании вызова дорогой функции
  function hasVoted(address caller, uint8 numProposals) public view virtual returns (bool) {
    // Limit the number of proposals to the lesser of total proposals and the requested number.
    uint256 count = Math.min(governor.proposalCount(), numProposals);
    for (uint256 i = count; i > 0; ) {
      (uint256 proposalId, , , , ) = governor.proposalDetailsAt(i - 1);
      if (governor.hasVoted(proposalId, caller)) return true;
      // Disable overflow check to save gas, as `i` is guaranteed to be > 0 in this loop
      unchecked {
        i--;
      }
    }
    return false;
  }

  // это временное решение чтобы выяснить оптимальную глубину поиска
  function setProposalCount(uint8 newCount) external virtual onlyOwner {
    emit ProposalCountChanged(newCount);
    proposalCount = newCount;
  }

  function mint() external virtual {
    address caller = _msgSender();
    if (!hasVoted(caller, proposalCount)) revert HasNotVoted();
    uint256 tokenId = ++_totalMinted;
    string memory fileName = string.concat(tokenId.toString(), ".json"); // 1.json, 2.json ...
    _safeMint(caller, tokenId);
    _setTokenURI(tokenId, fileName);
  }

  /**
   * @dev Returns the number of tokens available for minting
   */
  function tokensAvailable() public view virtual returns (uint256) {
    if (_totalMinted >= _maxSupply) return 0;
    return _maxSupply - _totalMinted;
  }

  /**
   * @dev Returns the token ID for a given owner address.
   * This is a simplified version of the `tokenOfOwnerByIndex` function without the index
   * parameter, since a community member can only own one token.
   */
  function tokenIdByOwner(address owner) public view virtual returns (uint256) {
    return tokenOfOwnerByIndex(owner, 0);
  }

  /**
   * @dev Returns the token IPFS URI for the given owner address.
   * This utility function combines two view functions.
   */
  function tokenUriByOwner(address owner) public view virtual returns (string memory) {
    return tokenURI(tokenIdByOwner(owner));
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
