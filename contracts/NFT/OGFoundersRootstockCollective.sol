// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {ERC721NonTransferrableUpgradable} from "./ERC721NonTransferrableUpgradable.sol";

contract OGFoundersRootstockCollective is ERC721NonTransferrableUpgradable {
  using Strings for uint256;

  event IpfsFolderChanged(uint256 newNumFiles, string newIpfs);
  error WasNotEnoughStRIFToMint(uint stRIF);
  error CouldNotGetVotes(string);
  error CouldNotGetVotesBytes(bytes);
  error OutOfTokens(uint256 maxSupply);
  error ThisAddressAlreadyOwnsTheToken(address owner);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  address public stRIF;
  uint256 public firstProposalDate;
  // Counter for the total number of minted tokens
  uint256 private _totalMinted;
  // number of metadata files in the IPFS directory
  uint256 private _maxSupply;
  // IPFS CID of the tokens metadata directory
  string private _folderIpfsCid;

  function initialize(
    address initialOwner,
    address stRIFAddress,
    uint256 newFirstProposalDate,
    uint256 maxSupply,
    string calldata ipfsFolderCid
  ) public initializer {
    require(stRIFAddress != address(0), "OGFoundersRootstockCollective: No StRIF address");
    __ERC721UpgradableBase_init("OGFoundersRootstockCollective", "OGF", initialOwner);
    stRIF = stRIFAddress;
    firstProposalDate = newFirstProposalDate;
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
    _maxSupply = newMaxSupply;
    _folderIpfsCid = newIpfsCid;
    emit IpfsFolderChanged(newMaxSupply, newIpfsCid);
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

  function mint() external virtual {
    address caller = _msgSender();
    //5623028
    try IVotes(stRIF).getPastVotes(caller, firstProposalDate) returns (uint _votes) {
      if (_votes < 1) {
        revert WasNotEnoughStRIFToMint(_votes);
      }
      // make sure we still have some CIDs for minting new tokens
      if (tokensAvailable() == 0) revert OutOfTokens(_maxSupply);

      // minting
      uint256 tokenId = ++_totalMinted;
      string memory fileName = string.concat(tokenId.toString(), ".json"); // 1.json, 2.json ...
      _safeMint(caller, tokenId);
      _setTokenURI(tokenId, fileName);
    } catch Error(string memory reason) {
      revert CouldNotGetVotes(reason);
    } catch (bytes memory reason) {
      revert CouldNotGetVotesBytes(reason);
    }
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}

  function _baseURI() internal view virtual override returns (string memory) {
    return string.concat("ipfs://", _folderIpfsCid, "/");
  }

  /**
   * @dev Prevents the transfer and mint of tokens to addresses that already own one.
   * Ensures that one address cannot own more than one token.
   */
  function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    // Disallow transfers by smart contracts, as only EOAs can be community members
    // slither-disable-next-line tx-origin
    if (_msgSender() != tx.origin) revert ERC721InvalidOwner(_msgSender());
    // disallow transfers to members (excluding zero-address for enabling burning)
    // disable minting more than one token
    if (to != address(0) && balanceOf(to) > 0) revert ERC721InvalidOwner(to);
    return super._update(to, tokenId, auth);
  }

  // overrides required

  function transferFrom(address from, address to, uint256 tokenId) public virtual override {
    super.transferFrom(from, to, tokenId);
  }

  function approve(address to, uint256 tokenId) public virtual override {
    super.approve(to, tokenId);
  }

  function setApprovalForAll(address operator, bool approved) public virtual override {
    super.setApprovalForAll(operator, approved);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function _increaseBalance(address account, uint128 value) internal override {
    super._increaseBalance(account, value);
  }
}
