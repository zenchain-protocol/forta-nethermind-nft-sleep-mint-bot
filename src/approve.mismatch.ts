import {
  Finding,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  Label,
  EntityType,
} from "@fortanetwork/forta-bot";

import { APPROVE_EVENT, APPROVAL_FOR_ALL_EVENT, PERMIT_SIGS, TRANSFER_EVENT_TOPIC, CHAIN_ID } from "./constants";
import { counter } from "./agent";

const handleTransaction = async (txEvent: TransactionEvent) => {
  const findings: Finding[] = [];

  const contractAddress: string = txEvent.to as string;
  const txnSender = txEvent.from.toLowerCase();

  // get all Approval and ApprovalForAll event logs
  let approvals = txEvent.filterLog([APPROVE_EVENT, APPROVAL_FOR_ALL_EVENT], contractAddress);

  // don't creat an alert when a PermitForAll has been used
  const functionSig = txEvent.transaction.data.slice(0, 10);
  if (PERMIT_SIGS.includes(functionSig)) {
    return findings;
  }

  //console.log(approvals);
  for (let approve of approvals) {
    counter.nftApprovals += 1;
    // get the current owner of an NFT
    const eventCurrentNFTOwner = approve.args.owner.toLowerCase();

    // get the address approved to transfer the NFT
    const eventApprovedAddress =
      typeof approve.args.approved == "boolean"
        ? approve.args.operator.toLowerCase()
        : approve.args.approved.toLowerCase();

    // check if the txn sender is not the current NFT owner
    // check if the txn sender is approving themselves to transfer another person's NFT
    if (eventCurrentNFTOwner != txnSender && eventApprovedAddress == txnSender) {
      // don't create an alert if the NFT was previously transferred from the txn sender to the current NFT owner (onERC721Received called)
      const matchingLog = txEvent.logs.find((log) => {
        if (log.logIndex < approve.logIndex && log.topics[0] === TRANSFER_EVENT_TOPIC) {
          const txFrom = "0x" + log.topics[1].substring(26);
          const txTo = "0x" + log.topics[2].substring(26);
          if (txFrom === txnSender && txTo === eventCurrentNFTOwner) {
            return true;
          }
        }
        return false;
      });

      if (!matchingLog) {
        counter.sleepMint2Alerts += 1;
        const anomalyScore = counter.sleepMint2Alerts / counter.nftApprovals;
        findings.push(
          Finding.fromObject({
            name: "Sleep Minted an NFT",
            description: `An NFT was approved for ${txnSender}, by ${txnSender}, but owned by ${eventCurrentNFTOwner}. The NFT contract address is ${contractAddress}`,
            alertId: "SLEEPMINT-2",
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
            source: {
              chains: [{chainId: CHAIN_ID}]
            },
            metadata: {
              anomalyScore: anomalyScore.toFixed(2) === "0.00" ? anomalyScore.toString() : anomalyScore.toFixed(2),
            },
            labels: [
              Label.fromObject({
                entity: txEvent.hash,
                entityType: EntityType.Transaction,
                label: "Approval",
                confidence: 1,
                remove: false,
              }),
              Label.fromObject({
                entity: txnSender,
                entityType: EntityType.Address,
                label: "Attacker",
                confidence: 0.7,
                remove: false,
              }),
            ],
          })
        );
      }
    }
  }

  return findings;
};

export default {
  handleTransaction,
};
