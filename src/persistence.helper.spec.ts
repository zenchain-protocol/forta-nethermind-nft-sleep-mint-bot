import { PersistenceHelper } from "./persistence.helper";
import { existsSync, writeFileSync, unlinkSync } from "fs";

global.fetch = jest.fn();

const mockDbUrl = "databaseurl.com/";
const mockJwt = {
  token: {
    iss: "issuer",
    sub: "0x556f8BE42f76c01F960f32CB1936D2e0e0Eb3F4D",
    aud: "recipient",
    exp: 1660119443,
    nbf: 1660119383,
    iat: 1660119413,
    jti: "qkd5cfad-1884-11ed-a5c9-02420a639308",
    "bot-id": "0x13k387b37769ce24236c403e76fc30f01fa774176e1416c861yfe6c07dfef71f",
  },
};
const mockKey = "mock-test-key";

// Mock the fetchJwt function of the forta-agent module
const mockFetchJwt = jest.fn();
jest.mock("forta-agent", () => {
  const original = jest.requireActual("forta-agent");
  return {
    ...original,
    fetchJwt: () => mockFetchJwt(),
  };
});

const removePersistentState = () => {
  if (existsSync(mockKey)) {
    unlinkSync(mockKey);
  }
};

describe("Persistence Helper test suite", () => {
  let persistenceHelper: PersistenceHelper;
  let mockFetch = global.fetch as jest.Mock;

  beforeAll(() => {
    persistenceHelper = new PersistenceHelper(mockDbUrl);
  });

  beforeEach(() => {
    removePersistentState();
    delete process.env.LOCAL_NODE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should correctly POST an object to the database", async () => {
    const mockValue: Record<string, number> = {
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    };

    const mockPostMethodResponse = { data: "4234" };
    const mockFetchResponse: Response = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockPostMethodResponse),
    } as any as Response;

    const mockEnv = {};
    Object.assign(process.env, mockEnv);

    mockFetchJwt.mockResolvedValueOnce(mockJwt);

    mockFetch.mockResolvedValueOnce(Promise.resolve(mockFetchResponse));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await persistenceHelper.persist(mockValue, mockKey);

    expect(spy).toHaveBeenCalledWith("successfully persisted [object Object] to database");
    expect(mockFetchJwt).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(`${mockDbUrl}${mockKey}`);
    expect(mockFetch.mock.calls[0][1]!.method).toEqual("POST");
    expect(mockFetch.mock.calls[0][1]!.headers).toEqual({
      Authorization: `Bearer ${mockJwt}`,
    });
    expect(mockFetch.mock.calls[0][1]!.body).toEqual(JSON.stringify(mockValue));
  });

  it("should correctly store an object to a local file", async () => {
    const mockValue: Record<string, number> = {
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    };

    const mockEnv = { LOCAL_NODE: 35 };
    Object.assign(process.env, mockEnv);

    await persistenceHelper.persist(mockValue, mockKey);

    expect(mockFetchJwt).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();

    expect(existsSync("mock-test-key")).toBeDefined();
  });

  it("should fail to load an object from the database, but return default counter", async () => {
    const mockData: Record<string, number> = {
      nftApprovals: 1210,
      nftTransfers: 220,
      sleepMint1Alerts: 310,
      sleepMint2Alerts: 410,
      sleepMint3Alerts: 40,
    };

    const mockPostMethodResponse = mockData.toString();
    const mockFetchResponse: Response = {
      ok: false,
      json: jest.fn().mockResolvedValue(mockPostMethodResponse),
    } as any as Response;

    const mockEnv = {};
    Object.assign(process.env, mockEnv);

    mockFetchJwt.mockResolvedValueOnce(mockJwt);
    mockFetch.mockResolvedValueOnce(mockFetchResponse);
    const fetchedValue = await persistenceHelper.load(mockKey);
    expect(fetchedValue).toStrictEqual({
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    });
  });

  it("should fail to load an object from a local file if it doesn't exist, but return default counter", async () => {
    const mockEnv = { LOCAL_NODE: 121 };
    Object.assign(process.env, mockEnv);

    expect(mockFetchJwt).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();

    const fetchedValue = await persistenceHelper.load(mockKey);
    expect(fetchedValue).toStrictEqual({
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    });
  });
});
