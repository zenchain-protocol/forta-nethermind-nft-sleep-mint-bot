import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  Initialize,
  Label,
  EntityType,
  ethers,
} from "forta-agent";
import { ZERO_ADDRESS, DEAD_ADDRESS } from "./constants";

import transferMismatch from "./transfer.mismatch";
import { MockEthersProvider } from "forta-agent-tools/lib/test";
import { provideInitialize } from "./agent";

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

  // mock ERC-721 transfer event
  const mockTxEvent: any = {
    filterLog: jest.fn(),
    from: txnSender,
    to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
    hash: "0xabab",
    timestamp: 1000,
  };

  beforeAll(async () => {
    handleTransaction = transferMismatch.handleTransaction;
  });

  beforeEach(async () => {
    mockTxEvent.filterLog.mockReset();
    initialize = provideInitialize(mockProvider as any, mockPersistenceHelper as any);
    mockProvider.setNetwork(1);
    mockPersistenceHelper.load.mockReturnValueOnce(mockCounter);
    await initialize();
  });

  describe("handleTransaction", () => {
    it("returns a finding of a transfer mismatch", async () => {
      // create fake transfer event
      const mockERC721TransferEvent = {
        args: {
          from: famousArtist,
          to: thirdParty,
          tokenId: 1,
        },
      };

      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721TransferEvent]);

      const findings = await handleTransaction(mockTxEvent);

      const mockAnomalyScore = mockCounter.sleepMint1Alerts / mockCounter.nftTransfers;

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Sleep Minted an NFT",
          description: `An NFT Transfer was initiated by ${txnSender} to transfer an NFT owned by ${famousArtist}. The NFT contract address is 0x23414f4f9cb421b952c9050f961801bb2c8b8d58`,
          alertId: "SLEEPMINT-1",
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
          metadata: {
            anomalyScore: mockAnomalyScore.toFixed(2),
          },
          labels: [
            Label.fromObject({
              entity: mockTxEvent.hash,
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
        }),
      ]);

      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns an empty finding if actual owner transfers the NFT", async () => {
      // create fake transfer event
      const mockERC721TransferEvent = {
        args: {
          from: famousArtist,
          to: famousArtist,
          tokenId: 1,
        },
      };

      mockTxEvent.from = famousArtist;
      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721TransferEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns an empty finding if burning an NFT to 0 address", async () => {
      // create fake transfer event
      const mockERC721TransferEvent = {
        args: {
          from: famousArtist,
          to: ZERO_ADDRESS,
          tokenId: 1,
        },
      };

      mockTxEvent.from = famousArtist;
      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721TransferEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns an empty finding if burning an NFT to dead address", async () => {
      // create fake transfer event
      const mockERC721TransferEvent = {
        args: {
          from: famousArtist,
          to: DEAD_ADDRESS,
          tokenId: 1,
        },
      };

      mockTxEvent.from = famousArtist;
      mockTxEvent.filterLog.mockReturnValueOnce([mockERC721TransferEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    });

    it("returns a high severity finding when there is a transfer initiated by the address that had previously sleep minted the NFT", async () => {
      const mockTxEvent1: any = {
        filterLog: jest.fn(),
        from: txnSender,
        to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
        hash: "0xabab",
        timestamp: 1000,
      };

      const mockERC721TransferEvent = {
        args: {
          from: ZERO_ADDRESS,
          to: famousArtist,
          tokenId: 1,
        },
      };

      mockTxEvent1.filterLog.mockReturnValueOnce([mockERC721TransferEvent]);

      await handleTransaction(mockTxEvent1);

      const mockTxEvent2: any = {
        filterLog: jest.fn(),
        from: txnSender,
        to: "0x23414f4f9cb421b952c9050f961801bb2c8b8d58",
        hash: "0xababcd",
        timestamp: 1010,
      };

      const mockERC721TransferEvent2 = {
        args: {
          from: famousArtist,
          to: thirdParty,
          tokenId: 1,
        },
      };

      mockTxEvent2.filterLog.mockReturnValueOnce([mockERC721TransferEvent2]);

      const findings = await handleTransaction(mockTxEvent2);

      const mockAnomalyScore = mockCounter.sleepMint3Alerts / mockCounter.nftTransfers;

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Sleep Minted an NFT",
          description: `An NFT Transfer was initiated by ${txnSender} to transfer an NFT owned by ${famousArtist}. It had been previously minted by the ${txnSender} to ${famousArtist}. The NFT contract address is 0x23414f4f9cb421b952c9050f961801bb2c8b8d58`,
          alertId: "SLEEPMINT-3",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
          metadata: {
            anomalyScore: mockAnomalyScore.toFixed(2),
          },
          labels: [
            Label.fromObject({
              entity: mockTxEvent2.hash,
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
        }),
      ]);

      expect(mockTxEvent2.filterLog).toHaveBeenCalledTimes(1);
    });
  });
});
