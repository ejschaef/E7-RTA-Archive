import {
  PageUtils,
  RegExps,
  Tables,
  CardContent,
  ContentManager,
  SavedFilters,
} from "../exports.js";

console.log("Attaching DOMContentLoaded listener");
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const paramObj = Object.fromEntries(params.entries());
  console.log("GOT PARAMS:", paramObj);

  const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
  autoZoomCheckbox.checked = await ContentManager.ClientCache.getFlag(
    "autoZoom"
  );
  autoZoomCheckbox.addEventListener("click", async () => {
    await ContentManager.ClientCache.setFlag(
      "autoZoom",
      autoZoomCheckbox.checked
    );
  });

  const user = await ContentManager.UserManager.getUser();

  if (!user) {
    window.location.href = URLS.addStrParam(
      URLS.userQueryURL,
      "errorMSG",
      "Type1: no user"
    ); //URLS.userQueryURL;
  }

  if (params.get("errorMSG")) {
    const filterMSG = document.getElementById("filterMSG");
    filterMSG.textContent = params.get("errorMSG");
    filterMSG.classList.remove("text-safe");
    filterMSG.classList.add("text-danger");
  }

  document
    .getElementById("switch-user-btn")
    .addEventListener("click", async () => {
      console.log("Clearing User Data");
      await ContentManager.ClientCache.clearUserData();
      window.location.href = URLS.userQueryURL;
    });

  console.log("POPULATING DATA PROCESS INITIATED");

  try {
    console.log("Getting Season Details");
    const seasonDetails = await ContentManager.SeasonManager.getSeasonDetails();
    console.log("Got season details:", seasonDetails, typeof seasonDetails);

    console.log("Getting Stats");
    const stats = await ContentManager.ClientCache.getStats();

    //console.log("GOT STATS: ", JSON.stringify(stats));

    console.time("populateTables");
    console.log("POPULATING TABLES, CARD CONTENT, AND PLOTS");
    Tables.functions.populateSeasonDetailsTable("SeasonDetails", seasonDetails);
    Tables.functions.populateHeroStatsTable(
      "PlayerTable",
      stats.playerHeroStats
    );
    Tables.functions.populateHeroStatsTable(
      "OpponentTable",
      stats.enemyHeroStats
    );
    Tables.functions.populatePlayerFirstPickTable(
      "FirstPickStats",
      stats.firstPickStats
    );
    Tables.functions.populatePlayerPrebansTable(
      "PrebanStats",
      stats.prebanStats
    );
    Tables.functions.populateServerStatsTable(
      "server-stats",
      stats.serverStats
    );
    const battleTable = Tables.functions.populateFullBattlesTable(
      "BattlesTable",
      stats.battles,
      user
    );
    CardContent.functions.populateGeneralStats(stats.generalStats);
    CardContent.functions.populateRankPlot(stats.plotContent);
    console.log("FINISHED POPULATING");
    console.timeEnd("populateTables");

    console.log("Setting listener for filter-battle-table checkbox");
    const filterBattleTableCheckbox = document.getElementById(
      "filter-battle-table"
    );
    filterBattleTableCheckbox.addEventListener("click", async () => {
      if (!filterBattleTableCheckbox.checked) {
        Tables.functions.replaceDatatableData(battleTable, stats.battles);
      } else {
        Tables.functions.replaceDatatableData(
          battleTable,
          stats.filteredBattles
        );
      }
    });
  } catch (err) {
    console.error("Error loading data:", err);
  }

  // render content once all data is loaded
  document.getElementById("content-body").classList.remove("d-none");

  CodeMirror.defineMode("filterSyntax", function () {
    return {
      token: function (stream, state) {
        return RegExps.tokenMatch(stream);
      },
    };
  });

  const textarea = document.getElementById("codeArea");
  let editor = CodeMirror.fromTextArea(textarea, {
    mode: "filterSyntax",
    lineNumbers: true,
    theme: "default",
  });

  editor.setSize(null, 185);

  const appliedFilter = await ContentManager.ClientCache.getFilterStr();

  if (appliedFilter) {
    editor.setValue(appliedFilter);
  }

  // Logic for adding premade filters to filter pane
  document
    .getElementById("premade-filters")
    .addEventListener("click", function (event) {
      console.log("Attempting to add a premade filter");
      event.preventDefault();
      const target = event.target.closest(".dropdown-item");
      if (!target) return;
      const filterName = target.textContent.trim();
      console.log("Target found:", filterName);
      const currStr = editor.getValue();
      const newStr = SavedFilters.extendFilters(currStr, filterName);
      editor.setValue(newStr);
    });

  // Logic for submit buttons on filter pane
  const filterForm = document.getElementById("filterForm");
  filterForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent actual form submission to server

    // Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
    document.getElementById("codeArea").value = editor.getValue();

    console.log("Processing Filter Action");
    const clickedButton = event.submitter;
    const action = clickedButton?.value;
    const syntaxStr = editor.getValue();
    if (action === "apply") {
      const validFilter = await PageUtils.validateFilterSyntax(syntaxStr);
      if (validFilter) {
        await ContentManager.ClientCache.setFilterStr(syntaxStr);
        const autoZoomCheckbox = document.getElementById("auto-zoom-flag");
        const autoZoomFlag = autoZoomCheckbox.checked;
        const loadParams = {
          autoZoom: autoZoomFlag,
          query: "false",
        };
        window.location.href = URLS.addStrParams(URLS.loadData, loadParams);
      }
    } else if (action === "check") {
      console.log("Checking Str", syntaxStr);
      await PageUtils.validateFilterSyntax(syntaxStr);
    } else if (action === "clear") {
      editor.setValue("");
      console.log("Found applied filter", appliedFilter, "when clearing");
      if (appliedFilter) {
        console.log("Found filter str", appliedFilter);
        await ContentManager.ClientCache.setFilterStr("");
        const loadParams = {
          autoZoom: autoZoomCheckbox.checked,
          query: "false",
        };
        window.location.href = URLS.addStrParams(URLS.loadData, loadParams);
      }
    }
  });

  // Optional: sync changes back to textarea if needed
  editor.on("change", () => {
    editor.save(); // Updates the hidden textarea for form submit
  });

  // Show the editor after it's initialized
  textarea.classList.remove("codemirror-hidden");
});
