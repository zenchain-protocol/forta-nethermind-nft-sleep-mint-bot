import * as dotenv from "dotenv";
dotenv.config();
import { fetchJwt } from "forta-agent";
import fetch from "node-fetch";
import { existsSync, readFileSync, writeFileSync } from "fs";

export class PersistenceHelper {
  databaseUrl: string;
  fetch: any;

  constructor(dbUrl: string) {
    this.databaseUrl = dbUrl;
  }

  async persist(value: Record<string, number>, key: string) {
    const hasLocalNode = process.env.hasOwnProperty("LOCAL_NODE");
    if (!hasLocalNode) {
      const token = await fetchJwt({});
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const response = await fetch(`${this.databaseUrl}${key}`, {
          method: "POST",
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
    } else {
      // Persist locally
      writeFileSync(key, JSON.stringify(value));
      return;
    }
  }

  async load(key: string): Promise<Record<string, number>> {
    const hasLocalNode = process.env.hasOwnProperty("LOCAL_NODE");
    if (!hasLocalNode) {
      const token = await fetchJwt({});
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const response = await fetch(`${this.databaseUrl}${key}`, { headers });

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
    } else {
      // Checking if it exists locally
      if (existsSync(key)) {
        let data: Record<string, number>;
        data = JSON.parse(readFileSync(key).toString()) as Record<string, number>;
        return data;
      } else {
        console.log(`file ${key} does not exist`);
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
    }
  }
}
