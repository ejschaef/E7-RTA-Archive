import { ContentManager } from "../content-manager.ts";
import { runTests } from "../tests/run-tests.ts";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.ts";

// Must upload test data before running tests

async function main() {
	console.log("test page loaded");
	await ContentManager.ClientCache.clearReferenceData();
	await NavBarUtils.initialize();
	await runTests();
}

await main();
