import { scanEthereum, runHealthCheck } from "@fortanetwork/forta-bot";
import agent, { provideInitialize } from "./agent";
import { DATABASE_URL, EVM_RPC } from "./constants";
import { PersistenceHelper } from "./persistence.helper";

async function main() {
    const _ = provideInitialize(new PersistenceHelper(DATABASE_URL))
    scanEthereum({
        rpcUrl: EVM_RPC,
        handleTransaction: agent.handleTransaction,
    })

    runHealthCheck()
}

// only run main() method if this file is directly invoked (vs imported for testing)
if (require.main === module) {
    main();
}