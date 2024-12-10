// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721NonTransferrableUpgradable} from "../NFT/ERC721NonTransferrableUpgradable.sol";
import {GovernorRootstockCollective} from "../GovernorRootstockCollective.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VotingVanguardsRootstockCollective is ERC721NonTransferrableUpgradable {
  using Strings for uint256;

  event IpfsFolderChanged(uint256 newNumFiles, string newIpfs);
  event MintLimitChanged(uint256 newLimit);
  event ProposalAmountToCheckChanged(uint8 newCount);
  event StRifThresholdChanged(uint256 newThreshold);

  error HasNotVoted();
  error MintLimitReached(uint256 mintLimit);
  error OutOfTokens(uint256 maxSupply);
  error BelowStRifThreshold(uint256 balance, uint256 requiredBalance);
  error InvalidMaxSupply(uint256 newMaxSupply);

  // Rootstock Collective DAO Governor address
  GovernorRootstockCollective public governor;
  // Staked RIF token address
  IERC20 public stRif;
  // Counter for the total number of minted tokens
  uint256 private _totalMinted;
  // number of metadata files in the IPFS directory
  uint256 private _maxSupply;
  /**
   * @notice Defines the maximum number of NFTs that can be claimed during the current phase.
   * This allows the Foundation to unlock additional phases by updating the limit as needed
   */
  uint256 public mintLimit;
  // Minimum Staked RIF token balance to claim an NFT
  uint256 public stRifThreshold;
  // The number of proposals that need to be checked to determine whether the user voted for any of them
  uint8 public proposalAmountToCheck;
  // IPFS CID of the tokens metadata directory
  string private _folderIpfsCid;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    uint256 maxSupply,
    uint256 initialMintLimit,
    uint256 initialStRifThreshold,
    address initialOwner,
    address stRifAddress,
    GovernorRootstockCollective governorAddress,
    uint8 initialProposalAmountToCheck,
    string calldata ipfsFolderCid
  ) public initializer {
    __ERC721UpgradableBase_init("VotingVanguardsRootstockCollective", "VV", initialOwner);
    governor = governorAddress;
    stRif = IERC20(stRifAddress);
    setProposalAmountToCheck(initialProposalAmountToCheck);
    setMintLimit(initialMintLimit);
    setIpfsFolder(maxSupply, ipfsFolderCid);
    setStRifThreshold(initialStRifThreshold);
  }

  /**
   * @dev Sets a new IPFS folder and updates the maximum supply of tokens that can be minted.
   * This function is meant to be called by an admin when the metadata folder on IPFS is updated.
   * It ensures that the new maximum supply is greater than the previous one.
   * @param newMaxSupply The new maximum number of tokens that can be minted.
   * @param newIpfsCid The new IPFS CID for the metadata folder.
   */
  function setIpfsFolder(uint256 newMaxSupply, string calldata newIpfsCid) public virtual onlyOwner {
    if (newMaxSupply < _maxSupply) revert InvalidMaxSupply(newMaxSupply);
    _maxSupply = newMaxSupply;
    _folderIpfsCid = newIpfsCid;
    emit IpfsFolderChanged(newMaxSupply, newIpfsCid);
  }

  /**
   * @dev Checks whether the specified address (`caller`) has voted on any of the last
   * `numProposals` proposals. Iterates through the most recent proposals to determine
   * if a vote exists for the caller.
   *
   * @param caller The address to check for voting activity.
   * @return True if the caller has voted on at least one of the checked proposals, otherwise false.
   */
  function hasVoted(address caller) public view virtual returns (bool) {
    uint256 firstCheckProposalNumber = governor.proposalCount();
    uint256 lastCheckProposalNumber = firstCheckProposalNumber > proposalAmountToCheck
      ? firstCheckProposalNumber - proposalAmountToCheck
      : 0;
    for (uint256 i = firstCheckProposalNumber; i > lastCheckProposalNumber; ) {
      // slither-disable-next-line unused-return
      (uint256 proposalId, , , , ) = governor.proposalDetailsAt(i - 1);
      if (governor.hasVoted(proposalId, caller)) return true;
      // Disable overflow check to save gas, as `i` is guaranteed to be > 0 in this loop
      unchecked {
        i--;
      }
    }
    return false;
  }

  /**
   * @dev Updates the `proposalAmountToCheck`, which determines the number of recent proposals
   * to check for user voting activity. Allows the owner to adjust the depth of the check.
   */
  function setProposalAmountToCheck(uint8 newAmount) public virtual onlyOwner {
    emit ProposalAmountToCheckChanged(newAmount);
    proposalAmountToCheck = newAmount;
  }

  /**
   * @dev Updates the `mintLimit` to define the maximum number of NFTs claimable in the current phase
   */
  function setMintLimit(uint256 newMintLimit) public virtual onlyOwner {
    emit MintLimitChanged(newMintLimit);
    mintLimit = newMintLimit;
  }

  /**
   * @dev Sets a new minimum StRIF balance to claim the NFT.
   */
  function setStRifThreshold(uint256 newThreshold) public virtual onlyOwner {
    emit StRifThresholdChanged(newThreshold);
    stRifThreshold = newThreshold;
  }

  function mint() external virtual {
    address caller = _msgSender();
    // disable minting for smart contracts
    if (caller != tx.origin) revert ERC721InvalidOwner(caller);
    // disable minting more than once
    if (isMember(caller)) revert ERC721InvalidOwner(caller);
    // make sure the minter's stRIF balance is above the minimum threshold
    uint256 stRifBalance = stRif.balanceOf(caller);
    if (stRifBalance < stRifThreshold) revert BelowStRifThreshold(stRifBalance, stRifThreshold);
    // make sure we still have some CIDs for minting new tokens
    if (tokensAvailable() == 0) revert OutOfTokens(_maxSupply);
    // revert if minter hasn't voted in the last `proposalAmountToCheck` proposals
    if (!hasVoted(caller)) revert HasNotVoted();
    uint256 tokenId = ++_totalMinted;
    // revert if the mint limit in the current minting phase was reached.
    if (tokenId > mintLimit) revert MintLimitReached(mintLimit);
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

  /**
   * Tells if `owner` is a member of the Early Adopters community
   * @param owner - address to test for membership
   */
  function isMember(address owner) public view virtual returns (bool) {
    return balanceOf(owner) > 0;
  }

  /**
   * @dev Returns the base URI used for constructing the token URI.
   * @return The base URI string.
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return string.concat("ipfs://", _folderIpfsCid, "/");
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
