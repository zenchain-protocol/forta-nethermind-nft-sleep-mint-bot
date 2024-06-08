import * as dotenv from "dotenv";
dotenv.config();

export class PersistenceHelper {
  databaseUrl: string;
  fetch: any;

  constructor(dbUrl: string) {
    this.databaseUrl = dbUrl;
  }

  async persist(value: Record<string, number>, key: string) {
    const headers = {
      Authorization: `Basic ${process.env.REDIS_BASIC_AUTH}`,
    };
    try {
      const response = await fetch(`${this.databaseUrl}/SET/${key}`, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(value),
      });
      if (response.ok) {
        console.log(`successfully persisted ${value} to database`);
        return;
      }
    } catch (e) {
      console.log(`Failed to persist ${value} to database. Error: ${e}`);
    }
  }

  async load(key: string): Promise<Record<string, number>> {
    const headers = {
      Authorization: `Basic ${process.env.REDIS_BASIC_AUTH}`,
    };
    try {
      const response = await fetch(`${this.databaseUrl}/GET/${key}`, { headers });

      if (response.ok) {
        let data: Record<string, number>;
        data = (await response.json()) as Record<string, number>;
        console.log(`successfully fetched ${data} from database`);
        return data;
      } else {
        console.log(`${key} has no database entry`);
        // If this is the first bot instance that is deployed,
        // the database will not have data to return,
        // thus return the default values of the counter to assign value to the variables
        // necessary
        return {
          nftApprovals: 0,
          nftTransfers: 0,
          sleepMint1Alerts: 0,
          sleepMint2Alerts: 0,
          sleepMint3Alerts: 0,
        };
      }
    } catch (e) {
      console.log(`Error in fetching data. Error: ${e}`);
      throw e;
    }
  }
}
