// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Early Adopters Community NFT
 * @notice Owning one token determines membership in the Early Adopters Community
 */
contract EarlyAdopters is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable
{
  bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
  bytes32 public constant CIDS_LOADER_ROLE = keccak256("CIDS_LOADER_ROLE");
  uint256 private _nextTokenId;
  string[] private _ipfsCids;

  error InvalidCidsAmount(uint256 amount, uint256 maxAmount);
  error OutOfCids();
  event CidsLoaded(uint256 numCids, uint256 totalCids);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address defaultAdmin, address upgrader, address cidsLoader) public initializer {
    __ERC721_init("EarlyAdopters", "EA");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    _grantRole(UPGRADER_ROLE, upgrader);
    _grantRole(CIDS_LOADER_ROLE, cidsLoader);
  }

  /**
   * Mints an NFT for the Early Adopters community joiner. One address can
   * have a maximum of one token
   */
  function mint() external virtual {
    // stop minting if the contract ran out of images
    if (cidsAvailable() == 0) revert OutOfCids();

    string memory uri = _ipfsCids[_nextTokenId];
    uint256 tokenId = _nextTokenId++;
    _safeMint(msg.sender, tokenId);
    _setTokenURI(tokenId, uri);
  }

  /**
   * @dev Admin with `CIDS_LOADER_ROLE` can call this function to upload IPFS CIDs with NFT metadata.
   * @param ipfsCIDs - array of strings of a kind `QmQR9mfvZ9fDFJuBne1xnRoeRCeKZdqajYGJJ9MEDchgqX`
   * The array length should be no more than 50 CIDs. If there are more than 50 tokens to upload,
   * call the function multiple times.
   */
  function loadCids(string[] calldata ipfsCIDs) external virtual onlyRole(CIDS_LOADER_ROLE) {
    /* 
    Block gas limit is 6_800_000 gas units.
    Uploading 1 CID costs about 68_000 gas unit.
    How many CIDs should be loaded within one transaction (one block)?
    It would be reasonable to keep a place for other transactions in the
    block, so, let's assume , we take half of the block gas, which would 
    be 3_400_000, divide it by 68_000 and this equals exactly 50 CIDs
      */
    uint256 maxCids = 50;
    uint256 length = ipfsCIDs.length;
    if (length > maxCids) revert InvalidCidsAmount(length, maxCids);
    for (uint256 i = 0; i < length; i++) _ipfsCids.push(ipfsCIDs[i]);
    emit CidsLoaded(length, _ipfsCids.length);
  }

  /**
   * @dev Returns the number of IPFS CIDs available for minting tokens
   */
  function cidsAvailable() public view virtual returns (uint256) {
    if (_nextTokenId > _ipfsCids.length) return 0;
    return _ipfsCids.length - _nextTokenId;
  }

  /**
   * @dev Returns token ID by the owner address
   * This is a simplified version of the function `tokenOfOwnerByIndex` without the index
   * parameter, since a community member can have only one token
   */
  function tokenIdByOwner(address owner) public view virtual returns (uint256) {
    return tokenOfOwnerByIndex(owner, 0);
  }

  /**
   * @dev Returns token IPFS URI by the owner address
   * A utility function - the combination of 2 view functions
   */
  function tokenUriByOwner(address owner) public view virtual returns (string memory) {
    return tokenURI(tokenIdByOwner(owner));
  }

  /**
   * @dev Prevents transferring tokens to someone who already owns one.
   * It follows that one address cannot own more than one token.
   */
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
    if (balanceOf(to) > 0) revert ERC721InvalidOwner(to);
    return super._update(to, tokenId, auth);
  }

  function _baseURI() internal pure virtual override returns (string memory) {
    return "ipfs://";
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

  // The following functions are overrides required by Solidity.

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
    override(
      ERC721Upgradeable,
      ERC721EnumerableUpgradeable,
      ERC721URIStorageUpgradeable,
      AccessControlUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
