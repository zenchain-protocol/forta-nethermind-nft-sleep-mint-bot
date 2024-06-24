import { PersistenceHelper } from "./persistence.helper";
import axios from "axios";

jest.mock("axios");

const mockDbUrl = "databaseurl.com";
const mockKey = "mock-test-key";

describe("Persistence Helper test suite", () => {
  let persistenceHelper: PersistenceHelper;

  beforeAll(() => {
    persistenceHelper = new PersistenceHelper(mockDbUrl);
  });

  beforeEach(() => {
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

    const axiosPostMock = axios.post as jest.MockedFunction<typeof axios.post>;

    axiosPostMock.mockResolvedValueOnce({ status: 200 });

    const spy = jest.spyOn(console, "log").mockImplementation(() => { });
    await persistenceHelper.persist(mockValue, mockKey);

    expect(spy).toHaveBeenCalledWith(`Successfully persisted data to key: ${mockKey}`);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
    expect(axiosPostMock).toHaveBeenCalledWith(
      `${mockDbUrl}/store`,
      { key: mockKey, value: mockValue },
      { headers: { "Content-Type": "application/json", "Accept": "application/json" } }
    );
  });

  it("should fail to persist data and log an error", async () => {
    const mockValue: Record<string, number> = {
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    };

    const axiosPostMock = axios.post as jest.MockedFunction<typeof axios.post>;

    axiosPostMock.mockRejectedValueOnce(new Error("Network Error"));

    const spy = jest.spyOn(console, "error").mockImplementation(() => { });
    await persistenceHelper.persist(mockValue, mockKey);

    expect(spy).toHaveBeenCalledWith(`Failed to persist value to database. Error: Network Error`);
    expect(axiosPostMock).toHaveBeenCalledTimes(1);
  });

  it("should correctly load an object from the database", async () => {
    const mockData = {
      data: {
        data: {
          nftApprovals: 1210,
          nftTransfers: 220,
          sleepMint1Alerts: 310,
          sleepMint2Alerts: 410,
          sleepMint3Alerts: 40,
        }
      },
      status: 200
    };

    const axiosGetMock = axios.get as jest.MockedFunction<typeof axios.get>;

    axiosGetMock.mockResolvedValueOnce(mockData);

    const spy = jest.spyOn(console, "log").mockImplementation(() => { });
    const fetchedValue = await persistenceHelper.load(mockKey);

    expect(spy).toHaveBeenCalledWith(`Successfully fetched data from key: ${mockKey}`);
    expect(fetchedValue).toEqual(mockData.data.data);
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
    expect(axiosGetMock).toHaveBeenCalledWith(`${mockDbUrl}/store`, { params: { key: mockKey }, headers: { "Accept": "application/json" } });
  });

  it("should fail to load data and return default values", async () => {
    const axiosGetMock = axios.get as jest.MockedFunction<typeof axios.get>;

    axiosGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const spy = jest.spyOn(console, "warn").mockImplementation(() => { });
    const fetchedValue = await persistenceHelper.load(mockKey);

    expect(spy).toHaveBeenCalledWith(`Key ${mockKey} not found, returning default values.`);
    expect(fetchedValue).toEqual({
      nftApprovals: 0,
      nftTransfers: 0,
      sleepMint1Alerts: 0,
      sleepMint2Alerts: 0,
      sleepMint3Alerts: 0,
    });
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
  });

  it("should log an error and throw when failing to load data due to a network error", async () => {
    const axiosGetMock = axios.get as jest.MockedFunction<typeof axios.get>;

    axiosGetMock.mockRejectedValueOnce(new Error("Network Error"));

    const spy = jest.spyOn(console, "error").mockImplementation(() => { });

    await expect(persistenceHelper.load(mockKey)).rejects.toThrow("Network Error");
    expect(spy).toHaveBeenCalledWith(`Error in fetching data. Error: Network Error`);
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
  });
});
