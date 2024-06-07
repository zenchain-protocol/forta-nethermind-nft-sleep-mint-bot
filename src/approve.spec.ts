import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  Initialize,
  Label,
  EntityType,
  ethers,
} from "@fortanetwork/forta-bot";
import { MockEthersProvider } from "forta-agent-tools/lib/test";
import approveMismatch from "./approve.mismatch";
import { provideInitialize } from "./agent";
import { CHAIN_ID, TRANSFER_EVENT_TOPIC } from "./constants";

const mockPersistenceHelper = {
  persist: jest.fn(),
  load: jest.fn(),
};

let mockCounter: Record<string, number> = {
  nftApprovals: 120,
  nftTransfers: 80,
  sleepMint1Alerts: 7,
  sleepMint2Alerts: 6,
  sleepMint3Alerts: 5,
};

describe("NFT Sleep agent", () => {
  let handleTransaction: HandleTransaction;
  let initialize: Initialize;
  const mockProvider = new MockEthersProvider();

  // store some addresses to use throughout tests
  let txnSender = "0x87F6cA7862feA6411de6c0aFc1b4b23DD802bf00".toLowerCase();
  let famousArtist = "0xc6b0562605D35eE710138402B878ffe6F2E23807".toLowerCase();
  let thirdParty = "0xd8dB81216D8cf1236d36B4A1c328Fbd5CB2bD1e7".toLowerCase();

  const mockTxEvent: any = {
    filterLog: jest.fn(),
    from: txnSender,
    to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
    hash: "0xabcd",
    transaction: {
      data: "",
    },
    logs: [],
  };

  beforeAll(async () => {
    handleTransaction = approveMismatch.handleTransaction;
  });

  beforeEach(async () => {
    mockTxEvent.filterLog.mockReset();
    initialize = provideInitialize(mockPersistenceHelper as any);
    mockProvider.setNetwork(1);
    mockPersistenceHelper.load.mockReturnValueOnce(mockCounter);
    await initialize();
  });

  describe("handleTransaction", () => {
    it("returns a finding of an approval mismatch", async () => {
      const mockERC721ApproveEvent = {
        args: {
          owner: famousArtist,
          approved: txnSender,
          tokenId: 1,
        },
      };

      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721ApproveEvent]);

      const findings = await handleTransaction(mockTxEvent, mockProvider as any);

      const mockAnomalyScore = mockCounter.sleepMint2Alerts / mockCounter.nftApprovals;

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Sleep Minted an NFT",
          description: `An NFT was approved for ${txnSender}, by ${txnSender}, but owned by ${famousArtist}. The NFT contract address is 0x23414f4f9cb421b952c9050f961801bb2c8b8d58`,
          alertId: "SLEEPMINT-2",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          source: {
            chains: [{chainId: CHAIN_ID}]
          },
          metadata: {
            anomalyScore: mockAnomalyScore.toFixed(2),
          },
          labels: [
            Label.fromObject({
              entity: mockTxEvent.hash,
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
        }),
      ]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns a finding if the approval for all event fires", async () => {
      const mockERC721ApproveAllEvent = {
        args: {
          owner: famousArtist,
          operator: txnSender,
          approved: true,
        },
      };

      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721ApproveAllEvent]);

      const findings = await handleTransaction(mockTxEvent, mockProvider as any);
      const mockAnomalyScore = mockCounter.sleepMint2Alerts / mockCounter.nftApprovals;

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Sleep Minted an NFT",
          description: `An NFT was approved for ${txnSender}, by ${txnSender}, but owned by ${famousArtist}. The NFT contract address is 0x23414f4f9cb421b952c9050f961801bb2c8b8d58`,
          alertId: "SLEEPMINT-2",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          source: {
            chains: [{chainId: CHAIN_ID}]
          },
          metadata: {
            anomalyScore: mockAnomalyScore.toFixed(2),
          },
          labels: [
            Label.fromObject({
              entity: mockTxEvent.hash,
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
        }),
      ]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns no findings if actual owner approves another person to transfer the NFT", async () => {
      const mockERC721ApproveEvent = {
        args: {
          owner: famousArtist,
          approved: thirdParty,
          tokenId: 1,
        },
      };

      mockTxEvent.from = famousArtist;
      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721ApproveEvent]);

      const findings = await handleTransaction(mockTxEvent, mockProvider as any);

      expect(findings).toStrictEqual([]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns no findings if there was a PermitForAll-like function called", async () => {
      const mockTxEvent: any = {
        filterLog: jest.fn(),
        from: txnSender,
        to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
        hash: "0xabcd",
        transaction: {
          data: "0x9032c726aaaaaaaaaaaaaaaaa", //PermitForAll function sig
        },
        logs: [],
      };

      const mockERC721ApproveEvent = {
        args: {
          owner: famousArtist,
          approved: txnSender,
          tokenId: 1,
        },
      };

      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721ApproveEvent]);

      const findings = await handleTransaction(mockTxEvent, mockProvider as any);

      expect(findings).toStrictEqual([]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns no findings when the approval was preceded by a Transfer event from the approved account", async () => {
      const mockTxEvent: any = {
        filterLog: jest.fn(),
        from: txnSender,
        to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
        hash: "0xabcd",
        transaction: {
          data: "",
        },
        logs: [
          {
            logIndex: 1,
            topics: [
              TRANSFER_EVENT_TOPIC,
              ethers.zeroPadValue(txnSender, 32),
              ethers.zeroPadValue(famousArtist, 32),
            ],
          },
        ],
      };
      const mockERC721ApproveEvent = {
        args: {
          owner: famousArtist,
          approved: txnSender,
          tokenId: 1,
        },
        logIndex: 2,
      };

      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721ApproveEvent]);

      const findings = await handleTransaction(mockTxEvent, mockProvider as any);

      expect(findings).toStrictEqual([]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });
  });
});
