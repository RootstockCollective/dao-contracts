// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract OgFoundersEcosystemPartner is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  uint8 private constant MAX_NFT_SUPPLY = 50;
  uint256 private _nextTokenId;

  error TransfersDisabled();

  function disableTransfers() internal virtual {
    revert TransfersDisabled();
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address initialOwner) public initializer {
    __ERC721_init("OgFoundersEcosystemPartner", "OFE");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
  }

  function _baseURI() internal pure override returns (string memory) {
    return "ipfs://";
  }

  function safeMint(address to, string memory uri) public onlyOwner {
    uint256 tokenId = ++_nextTokenId;
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, uri);
  }

  /**
   * @dev Distributes tokens to a list of addresses.
   *
   * This function allows the contract owner to mint and distribute tokens to multiple addresses
   * in a single transaction. Each address in the `airdropAddresses` array will receive a token
   * with the corresponding URI from the `ipfsCids` array.
   *
   * Requirements:
   * - The caller must be the owner of the contract.
   * - The length of the `ipfsCids` array must be equal to the length of the `airdropAddresses` array.
   * - The number of ipfsCids/addresses must not exceed 255
   *
   * @param ipfsCids An array of content identifiers (IPFS CIDs) for the token URIs.
   * @param airdropAddresses An array of addresses to receive the tokens.
   */
  function airdrop(string[] calldata ipfsCids, address[] calldata airdropAddresses) public onlyOwner {
    require(ipfsCids.length == airdropAddresses.length, "Arrays must be of the same length");
    require(airdropAddresses.length < MAX_NFT_SUPPLY, "Too many airdrops at once");
    uint256 tokenId = _nextTokenId;
    unchecked {
      for (uint8 i = 0; i < airdropAddresses.length; i++) {
        tokenId++;
        _safeMint(airdropAddresses[i], tokenId);
        _setTokenURI(tokenId, ipfsCids[i]);
      }
    }
    _nextTokenId = tokenId;
  }

  /**
   * @dev Overridden to disable transfers.
   */
  function transferFrom(address, address, uint256) public virtual override(ERC721Upgradeable, IERC721) {
    disableTransfers();
  }

  /**
   * @dev This function is overridden to disable transfers.
   */
  function approve(address, uint256) public virtual override(ERC721Upgradeable, IERC721) {
    disableTransfers();
  }

  /**
   * @dev This function is overridden to disable transfers.
   */
  function setApprovalForAll(address, bool) public virtual override(ERC721Upgradeable, IERC721) {
    disableTransfers();
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

  // The following functions are overrides required by Solidity.

  /**
   * @dev This function disables any token transfers between accounts.
   */
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    return super._update(to, tokenId, auth);
  }

  function _increaseBalance(
    address account,
    uint128 value
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
    super._increaseBalance(account, value);
  }

  function tokenURI(
    uint256 tokenId
  ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
