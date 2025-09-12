import { ContentManager } from "../content-manager.ts";
import { Safe } from "../html-safe.ts";
import { runTests } from "../tests/run-tests.ts";
import { HTMLConstructor } from "./html-constructor/html-constructor.ts";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.ts";

async function main() {
	console.log("test page loaded");
	await ContentManager.ClientCache.clearReferenceData();
	await NavBarUtils.initialize();
	await runTests();
}

await main();
