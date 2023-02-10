import { HandleBlock, Initialize } from "forta-agent";
import { MockEthersProvider, TestBlockEvent } from "forta-agent-tools/lib/test";
import { provideHandleBlock, provideInitialize } from "./agent";
import agent from "./agent";

const mockPersistenceHelper = {
  persist: jest.fn(),
  load: jest.fn(),
};

const mockMints: Record<string, [string, string, number][]> = {
  "0x87f6ca7862fea6411de6c0afc1b4b23dd802bf00": [["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "1", 1000]],
};

let mockCounter: Record<string, number> = {
  nftApprovals: 120,
  nftTransfers: 80,
  sleepMint1Alerts: 7,
  sleepMint2Alerts: 6,
  sleepMint3Alerts: 5,
};

describe("Block handler test suite", () => {
  let initialize: Initialize;
  let handleBlock: HandleBlock;
  const mockProvider = new MockEthersProvider();

  beforeEach(async () => {
    agent.resetLastTimestamp();
    initialize = provideInitialize(mockProvider as any, mockPersistenceHelper as any);
    mockProvider.setNetwork(1);
    mockPersistenceHelper.load.mockReturnValueOnce(mockCounter);
    await initialize();
    handleBlock = provideHandleBlock(mockPersistenceHelper as any, mockMints);
  });

  afterEach(async () => {
    mockPersistenceHelper.persist.mockClear();
  });

  it("should not clear the mints record if the time period has not passed", async () => {
    const mockBlockEvent: TestBlockEvent = new TestBlockEvent().setTimestamp(1010);

    await handleBlock(mockBlockEvent);

    expect(mockMints).toStrictEqual({
      "0x87f6ca7862fea6411de6c0afc1b4b23dd802bf00": [["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "1", 1000]],
    });
  });

  it("should clear only the entries of the mints record for which the time period has passed", async () => {
    const mockBlockEvent: TestBlockEvent = new TestBlockEvent().setTimestamp(99999991010);
    const mockMints: Record<string, [string, string, number][]> = {
      "0x87f6ca7862fea6411de6c0afc1b4b23dd802bf00": [
        ["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "1", 1000],
        ["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "132532", 99999991009],
      ],
    };
    handleBlock = provideHandleBlock(mockPersistenceHelper as any, mockMints);

    await handleBlock(mockBlockEvent);
    expect(mockMints).toStrictEqual({
      "0x87f6ca7862fea6411de6c0afc1b4b23dd802bf00": [
        ["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "132532", 99999991009],
      ],
    });
  });

  it("should clear the mints record if the time period has passed", async () => {
    const mockBlockEvent: TestBlockEvent = new TestBlockEvent().setTimestamp(7999992010);

    expect(mockMints).toStrictEqual({
      "0x87f6ca7862fea6411de6c0afc1b4b23dd802bf00": [["0x23414f4f9cb421b952c9050f961801bb2c8b8d58", "1", 1000]],
    });

    await handleBlock(mockBlockEvent);
    expect(mockMints).toStrictEqual({});
  });

  it("should persist the value in a block evenly divisible by 240", async () => {
    const mockBlockEvent: TestBlockEvent = new TestBlockEvent().setNumber(720);

    await handleBlock(mockBlockEvent);

    expect(mockPersistenceHelper.persist).toHaveBeenCalledTimes(1);
  });

  it("should not persist values because block is not evenly divisible by 240", async () => {
    const mockBlockEvent: TestBlockEvent = new TestBlockEvent().setNumber(600);

    await handleBlock(mockBlockEvent);

    expect(mockPersistenceHelper.persist).toHaveBeenCalledTimes(0);
  });
});
