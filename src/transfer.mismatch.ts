import "./agent";
import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  Label,
  EntityType,
} from "forta-agent";

import { ZERO_ADDRESS, DEAD_ADDRESS, TRANSFER_EVENT } from "./constants";
import { counter } from "./agent";

export let mints: Record<string, [string, string, number][]> = {};

const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const findings: Finding[] = [];
  const contractAddress: string = txEvent.to as string;
  const txnSender = txEvent.from.toLowerCase();
  // get all Transfer events from the NFT transaction
  const transfers = txEvent.filterLog([TRANSFER_EVENT], contractAddress);

  for (let transfer of transfers) {
    counter.nftTransfers += 1;
    const eventTransferFromAddress = transfer.args.from.toLowerCase();
    const eventTransferToAddress = transfer.args.to.toLowerCase();

    // is the transaction sender not the owner of the NFT according to the NFT Transfer Event
    let isSenderNotTheOwner = eventTransferFromAddress != txnSender;

    // is the NFT transfer a mint transfer (i.e., initial creation of the NFT from the 0 address)
    let isMint = eventTransferFromAddress == ZERO_ADDRESS;

    // is the NFT transfer a burn transfer (i.e., the NFT is send to the 0 address)
    let isBurn = eventTransferToAddress == ZERO_ADDRESS || eventTransferToAddress == DEAD_ADDRESS;

    // is the transaction sender the person receiving the NFT in the transfer (this would be the case when you buy an NFT on OpenSea)
    // add this check to try and reduce agent alerts from common and honest NFT transfers from OpenSea.
    let isSenderAlsoReceiver = eventTransferToAddress == txnSender;

    if (isSenderNotTheOwner && !isBurn && !isSenderAlsoReceiver) {
      if (!isMint) {
        let hasSleepMinted = false;
        for (const key of Object.keys(mints)) {
          if (key === txnSender) {
            hasSleepMinted = mints[key].some(
              (mint) => mint[0] === contractAddress && mint[1] === transfer.args.tokenId.toString()
            );
          }
        }
        if (hasSleepMinted) {
          counter.sleepMint3Alerts += 1;
          const anomalyScore = counter.sleepMint3Alerts / counter.nftTransfers;
          findings.push(
            Finding.fromObject({
              name: "Sleep Minted an NFT",
              description: `An NFT Transfer was initiated by ${txnSender} to transfer an NFT owned by ${eventTransferFromAddress}. It had been previously minted by the ${txnSender} to ${eventTransferFromAddress}. The NFT contract address is ${contractAddress}`,
              alertId: "SLEEPMINT-3",
              severity: FindingSeverity.High,
              type: FindingType.Suspicious,
              metadata: {
                anomalyScore: anomalyScore.toFixed(2) === "0.00" ? anomalyScore.toString() : anomalyScore.toFixed(2),
              },
              labels: [
                Label.fromObject({
                  entity: txEvent.hash,
                  entityType: EntityType.Transaction,
                  label: "Transfer",
                  confidence: 1,
                  remove: false,
                }),
                Label.fromObject({
                  entity: txnSender,
                  entityType: EntityType.Address,
                  label: "Attacker",
                  confidence: 0.8,
                  remove: false,
                }),
              ],
            })
          );
        } else {
          counter.sleepMint1Alerts += 1;
          const anomalyScore = counter.sleepMint1Alerts / counter.nftTransfers;
          findings.push(
            Finding.fromObject({
              name: "Sleep Minted an NFT",
              description: `An NFT Transfer was initiated by ${txnSender} to transfer an NFT owned by ${eventTransferFromAddress}. The NFT contract address is ${contractAddress}`,
              alertId: "SLEEPMINT-1",
              severity: FindingSeverity.Info,
              type: FindingType.Suspicious,
              metadata: {
                anomalyScore: anomalyScore.toFixed(2) === "0.00" ? anomalyScore.toString() : anomalyScore.toFixed(2),
              },
              labels: [
                Label.fromObject({
                  entity: txEvent.hash,
                  entityType: EntityType.Transaction,
                  label: "Transfer",
                  confidence: 1,
                  remove: false,
                }),
                Label.fromObject({
                  entity: txnSender,
                  entityType: EntityType.Address,
                  label: "Attacker",
                  confidence: 0.6,
                  remove: false,
                }),
              ],
            })
          );
        }
      } else {
        const tokenId: string = transfer.args.tokenId.toString();
        if (!mints[txnSender]) {
          mints[txnSender] = [];
        }
        mints[txnSender].push([contractAddress, tokenId, txEvent.timestamp]);
      }
    }
  }

  return findings;
};

export default {
  handleTransaction,
};
