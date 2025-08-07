import { RegExps } from "../e7/regex.js";
import PageUtils from "./page-utilities/page-utils.js";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.js";

function makeExFilter(textAreaID, str) {
	const textArea = document.getElementById(textAreaID);
	textArea.value = str.replace(/^\n/, "");
	CodeMirror.fromTextArea(textArea, {
		mode: "filterSyntax",
		lineNumbers: true,
		theme: "default",
		readOnly: true,
	});
	textArea.classList.remove("codemirror-hidden");
}

function initializeCodeBlocksAndAddListeners() {

  CodeMirror.defineMode("filterSyntax", function () {
    return {
      token: function (stream, state) {
        return RegExps.tokenMatch(stream);
      },
    };
  });

	const ex1Str = `
season = current-season;
is-first-pick = true;
p1.pick1 in {lone wolf peira, new moon luna};
OR("harsetti" in p1.prebans, "harsetti" in p2.prebans);`;

	makeExFilter("exFilter1", ex1Str);

	const ex2Str = `
last-n(500);
date in 2025-04-01...2025-07-01;
is-first-pick = false;
OR(
	AND(
		p2.league in {warlord, emperor, legend},
    	p2.pick3 = "zio"
    ),
    victory-points >= 3000
)`;

	makeExFilter("exFilter2", ex2Str);

	const ex3Str = `
"Rinak" in prebans;
"Boss Arunka" in prebans;
"Harsetti" in p1.picks;
NOT("Harsetti" = p2.postban);
victory-points in 2500...=3000;`;

	makeExFilter("exFilter3", ex3Str);

	const ex4Str = `
season = season-16f;
is-win = true;`;

	makeExFilter("exFilter4", ex4Str);

  const ex5Str = `
p1.equipment("belian", {immunity, counter});
p1.artifact("belian", {3f, elbris ritual sword});
p2.cr-geq("New Moon Luna", 100);
p2.server in {global, asia, Japan};`;

  makeExFilter("exFilter5", ex5Str);

	const textarea = document.getElementById("codeArea");
	const editor = CodeMirror.fromTextArea(textarea, {
		mode: "filterSyntax",
		lineNumbers: true,
		theme: "default",
	});

	// Intercept form submission
	const filterForm = document.getElementById("filterForm");
	filterForm.addEventListener("submit", async function (event) {
		event.preventDefault(); // Prevent actual form submission to server

		// Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
		document.getElementById("codeArea").value = editor.getValue();

		console.log("Processing Filter Action");
		const clickedButton = event.submitter;
		const action = clickedButton?.value;
		const syntaxStr = editor.getValue();
		if (action === "check") {
			console.log("Checking Str", syntaxStr);
			await PageUtils.validateFilterSyntax(syntaxStr);
		}
	});

	// sync changes back to textarea if needed
	editor.on("change", () => {
		editor.save(); // Updates the hidden textarea for form submit
	});

	// Show the editor after it's initialized
	textarea.classList.remove("codemirror-hidden");
}

async function main() {
  initializeCodeBlocksAndAddListeners();
  await NavBarUtils.initialize();
}

await main();
