export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
export const ERC721_INTERFACE_ID = 0x5b5e139f;
const PERMIT_FOR_ALL_SIG_1 = "0x9032c726";
const PERMIT_FOR_ALL_SIG_2 = "0xab84ee6f";
const SET_PERMIT_FOR_ALL_SIG = "0x4b7ac8d4";
export const PERMIT_SIGS = [PERMIT_FOR_ALL_SIG_1, PERMIT_FOR_ALL_SIG_2, SET_PERMIT_FOR_ALL_SIG];
export const TRANSFER_EVENT = "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)";
export const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const APPROVE_EVENT = "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)";
export const APPROVAL_FOR_ALL_EVENT =
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)";
export const CHAIN_ID = 1
export const EVM_RPC = "https://cloudflare-eth.com/";