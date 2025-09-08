import { LANGUAGES } from "../e7/references";
import DOC_ELEMENTS from "../pages/page-utilities/doc-element-references";

export const ELEMENT_IDS = DOC_ELEMENTS.INFO_PAGE.IDS

const EN = LANGUAGES.CODES.EN;



const FilterOverview = {
  generalOverviewTitle: {
    [EN]: "General Overview",
  },
  generalOverviewDescription: {
    [EN]: "This page details the rules for writing filters within the Hero Stats page. Examples will be shown below along with space to practice writing and validating filters.",
  },
  filterUsageTitle: {
    [EN]: "Filter Usage",
  },
  filterUsageDescription: {
    [EN]:
      `Filters are primarily used to adjust which battles the user wants to 
    include when calculating stats like win rate and pick rate. They can also be used to 
    automatically adjust the chart to the filtered subset if desired. Almost all columns 
    listed in the full table of battles at the bottom of the stats page can filtered on using 
    the custom syntax. See other sections of the information page to understand the exact syntax and rules for writing filters.`,
  },
  objectTypesTitle: {
    [EN]: "Syntax Types",
  },
  objectTypesDescription: {
    [EN]: "There are 5 main types of syntax used in filters:",
  },
  objectTypesList: {
    [EN]: [
      "Fields: keywords corresponding to data from each of the battles, such as if the battle is a win, the victory points the player ended the battle at, the first hero the player picked, etc.",
      "Declared Data: data values the user defines to filter the data on. They include integers, dates, strings, sets, booleans, and ranges. There are also some keywords like 'current-season' that allow the user to conveniently utilize declared data based on predefined logic.",
      "Operators: the operations that allow the comparison of Fields and Declared Data. They are the core of filters (includes operations like >, <, =, set membership, etc.).",
      "Functions: higher level operations that may allow the combination of filters in a logical manner or correspond to complex predefined filters.",
      "Pure Syntax Elements: characters like brackets, quotes, commas, and semicolons that define how the filters are broken up and parsed.",
    ],
  },
  highLevelRulesTitle: {
    [EN]: "High Level Rules",
  },
  highLevelRulesList: {
    [EN]: [
      "Filter syntax is entirely case insensitive. It will be converted to lowercase in the backend.",
      "All filters must be separated by a semicolon ( ; ) if multiple are applied.",
      "The terminating semicolon ( ; ) for the last filter (including if only one filter) is optional.",
      "Every filter must either be a function call or a base filter of the form: X operator Y",
      "Functions and sets have their constituent arguments separated by commas ( , ) not semicolons ( ; )",
      "Clause functions like And(...), OR(...), etc. can take nested clause functions as arguments but must ultimately terminate as base filters.",
      "Certain functions, like last-N(), are global filters that must take into account all battles when filtering (last-N captures only the N most recent battles). Since these filters are affected by other filters, to regulate the logic, all global filters will be hoisted to the top and executed in the order they were written.",
      "Apart from global filter hoisting, all filters will execute in the order they are written.",
      "Some filters or sets of filters are valid but will never return true. For instance, comparing different data types or using two filters which together specify a hero must be picked by both the player and the opponent. These filters will pass validation, and the resulting stats will be empty.",
      "Some operations require specific data types; if this is the case, an error will be thrown specifying the necessary data type.",
    ],
  },
} as const;


const Fields = {
  title: {
    [EN]: "Fields",
  },
  attributesTitle: {
    [EN]: "Attributes",
  },
  attributesDescription: {
    [EN]: `Attributes are types of fields that are accessed by using the syntax
          p1.'attribute here' or p2.'attribute here' ; for example, 'p1.pick1' is used to access the
          first picked hero by player 1 in the battle.`,
  },
  date: {
    [EN]: "the date the battle occurred",
  },
  season: {
    [EN]: "the season the battle occurred (resolves to the internal season code, not the name or number)",
  },
  isWin: {
    [EN]: "boolean indicator flagging if the player won",
  },
  isFirstPick: {
    [EN]: "boolean indicator flagging if the player got first pick",
  },
  isFirstTurn: {
    [EN]: "boolean indicator flagging if the player got the first turn",
  },
  firstTurnHero: {
    [EN]: "string of the hero that got the first turn (regardless of player)",
  },
  victoryPoints: {
    [EN]: "integer indicating the victory points the player ended the battle at",
  },
  prebans: {
    [EN]: "set of all the pre-banned heroes",
  },
  postbans: {
    [EN]: "set of the two postbanned heroes",
  },
  turns: {
    [EN]: "the number of turns the battle lasted (0 for incomplete battles)",
  },
  seconds: {
    [EN]: "the number of seconds the battle lasted",
  },
  pointGain: {
    [EN]: "a signed integer indicating how many victory points the player gained",
  },
  pickN: {
    [EN]: "accesses pick n for the corresponding player. Replace [n] with numbers 1 - 5 to access the corresponding pick.",
  },
  picks: {
    [EN]: "accesses a set of all 5 picks for the specified player",
  },
  league: {
    [EN]: "a string value that gives the league the specified player ended the battle in (i.e. emperor, warlord, etc.)",
  },
  prebansAttribute: {
    [EN]: "accesses the set of the 2 heroes pre-banned by the specified player",
  },
  postban: {
    [EN]: "accesses the hero postbanned by the specified player",
  },
  server: {
    [EN]: "the server of the specified player",
  },
  id: {
    [EN]: "the numerical id of the specified player",
  },
  mvp: {
    [EN]: "accesses the mvp hero for the specified player",
  },
} as const;

const DeclaredData = {
  title: {
    [EN]: "Declared Data",
  },

  Integer: {
    [EN]: `Any valid non-negative integer (declare like '2787' without the quotes)`,
  },
  Date: {
    [EN]: `Date value using YYYY-MM-DD format exclusively (declare like '2025-01-07' without the quotes). Date must be valid.`,
  },
  String: {
    [EN]: `Text based data declared within either double or single quotes (example: "lone wolf peira"). The quotes are necessary when declared outside of a set. When the string contains a quote, you must use the opposite quote type to wrap the string. Season keywords like "current-season" will be converted to string types automatically. They will take the form of their season code (ie 'pvp_rta_ss[season number here]' like 'pvp_rta_ss17' or 'pvp_rta_ss17f'). Therefore, season codes are valid string literals.`,
  },
  Boolean: {
    [EN]: `Corresponds to true or false values; declare using 'true' or 'false' without the quotes`,
  },
  Set: {
    [EN]: `Used to group multiple individual pieces of data together; 
    declare using the format { x, y, z, ... }. A trailing comma after the last element is optional. 
    Sets can only contain string, integer, and date literals. They can be of heterogeneous types. 
    Strings within sets do not need to be quoted unless they contain a quote. Since season keywords like "current-season" 
    will be converted to string types automatically, they can be used in sets.`,
  },
  Range: {
    [EN]: `Used to define a continuous range of either integers or dates.
     Can be used in cases where a set can be used. 
     Declare using the syntax: 'X...Y' or 'X...=Y', where the '=' indicates if Y 
     should be included in the set. X and Y must either both be integers or 
     both be dates (example: 2025-05-01...2025-06-01 yields a set of all dates in May 2025)`,
  },
  Season: {
    [EN]: `Used to easily filter battles to particular seasons or preseasons.
     Can be declared by writing "season-n" without quotes, where n is the number of the desired season.
      Season numbers and dates can be seen in the season details table at the top of the stats page.
       The keywords "current-season" and "last-season" can alternatively be used to access the respective season based on the current active season.
        A season number appended with "f" will access the preseason immediately following the season if one exists.`,
  },
};



const Operators = {
  title: {
    [EN]: "Operators",
  },

  equal: {
    [EN]: `Checks if left side is equal to right side.`,
  },
  notEqual: {
    [EN]: `Checks if left side is not equal to right side.`,
  },
  gt: {
    [EN]: `Checks if left side is greater than right side.`,
  },
  gte: {
    [EN]: `Checks if left side is greater than or equal to right side.`,
  },
  lt: {
    [EN]: `Checks if left side is less than right side.`,
  },
  lte: {
    [EN]: `Checks if left side is less than or equal to right side.`,
  },
  in: {
    [EN]: `Checks if the left side of the operator is contained within the right side. The right side of the operator must be a Range, Set, or Field that corresponds to a set (i.e. p1.picks, p2.prebans, etc.).`,
  },
  notIn: {
    [EN]: `Checks if the left side of the operator is not contained within the right side. The right side of the operator must be a Range, Set, or Field that corresponds to a set (i.e. p1.picks, p2.prebans, etc.).`,
  },
};

const Functions = {
  title: {
    [EN]: "Functions",
  },

  // Clause Functions
  clauseFunctionsTitle: {
    [EN]: "Clause Functions",
  },

  clauseFunctionsDescription: {
    [EN]: `Clause functions generally take 1 or more filters as arguments and create logic gates to combine the
    result. Clause functions can take other clause functions as arguments, but the syntax tree must eventually
    terminate as base filters. Global Filter Functions cannot be used within Clause Functions.`,
  },

  AND: {
    [EN]: `Creates an AND gate for the filter arguments, returning true if all arguments return true. An empty AND function will always return true. Call using the syntax 'AND( arg1, arg2, ...)'`,
  },
  OR: {
    [EN]: `Creates an OR gate for the filter arguments, returning true if any argument returns true. An empty OR function will always return false. Call using the syntax 'OR( arg1, arg2, ...)'`,
  },
  XOR: {
    [EN]: `Creates an XOR gate for the filter arguments, returning a boolean value based on a cascading XOR. XOR requires at least 2 arguments to pass validation. Call using the syntax 'XOR( arg1, arg2, ...)'`,
  },
  NOT: {
    [EN]: `The NOT function takes exactly one argument which must be a filter (not an individual Field or Data Declaration) and inverts the boolean result. Call using the syntax 'NOT(arg)'.`,
  },

  // Direct Functions
  directFunctionsTitle: {
    [EN]: "Direct Functions",
  },

  directFunctionsDescription: {
    [EN]: `Direct functions are compound filters that perform a specific operation which would be otherwise
    impossible to express using the standard filter syntax. They include functions for filtering
    based on equipment, artifacts, and CR.`,
  },

  EQUIPMENT: {
    [EN]: `Creates a filter that checks if the specified hero has the specified equipment. Call using the syntax '[p1/p2].equipment(hero, equip str or set)' where [p1/p2] is replaced with either 'p1' or 'p2' to specify the player to check. Hero must be a string literal of any valid hero name, and the second argument must either be a string literal of a valid equipment set name or a set of equipment sets. When a set is passed, the filter will return true if the hero has all of the sets equipped (it will always be false if more than 2 unique sets are passed). You can pass a set like {torrent, torrent, torrent} to filter for 2 piece sets equipped multiple times. As long as the passed equipment is equipped by the specified hero, the function will return true even if the hero has an additional set equipped. Also note that a post-banned hero will not have any equipment. Example function call: p1.equipment("Arbiter Vildred", {Torrent, Torrent, Immunity})`,
  },
  ARTIFACT: {
    [EN]: `Creates a filter that checks if the specified hero has the specified artifact equipped. It is called symmetrically to the equipment function. The only difference is that if a set of artifacts is passed, unlike the equipment filter, the artifact filter will return true if the hero has any of the artifacts equipped, whereas the equipment filter requires all of the equipment sets to be equipped. Also note that a post-banned hero will not have any artifact. Example function call: p1.artifact("Arbiter Vildred", "Alexa's Basket")`,
  },
  CR: {
    [EN]: `Creates a filter that compares the starting CR of the specified hero to the integer passed using the specified operator. Only comparison operators can be used (includes > , >=, <, <=, =, !=). Call using simplified syntax without commas like 'p1.cr("Zio" = 100)' or comma separated syntax like 'p2.cr("Amid", > , 95)'. Use either 'p1.' or 'p2.' to specify the player to check. This filter will return false if the hero specified was post banned. Note that this function implicitly includes the filter "hero in [p1 or p2].picks", therefore, negating this filter with a NOT clause will not simply return games where the hero had less than the specific CR; it will also include games where the specified player did not pick the hero. Therefore, to negate the function, use the complimentary operator instead.`,
  },

  globalFiltersTitle: {
    [EN]: `Global Filter Functions`,
  },

  globalFiltersDescription: {
    [EN]: `Global filter functions are context aware, meaning that they cannot be applied to one battle in a
                vacuum.
                They require knowledge of the other battles to determine resulting truth value for the battle being
                processed.
                As such, they are affected by other filters in the chain. Therefore, to standardize behavior, all global
                filter functions are hoisted to the top of the filter chain and executed in order.`,
  },

  // Global Filter Functions
  lastN: {
    [EN]: `Filters for the most recent N battles. Requires an Integer as an argument. Call using the syntax 'last-N(Integer)'`,
  },
};


const Syntax = {
  title: {
    [EN]: "Syntax Elements",
  },
  semiColon: {
    [EN]: `Semicolons must be used to separate filters when multiple are used. Do not use semicolons to separate commas in functions; use commas instead.`,
  },
  comma: {
    [EN]: `Commas are used to separate arguments to functions or sets.`,
  },
  parentheses: {
    [EN]: `Parentheses are used to bound the arguments to function calls.`,
  },
  braces: {
    [EN]: `Braces are used to bound the arguments to a set declaration.`,
  },
};


export const FILTER_EXAMPLES_AND_TEST_BLOCK = {
  EX1_TITLE: {
    [EN]: "Filter Example 1",
  },
  EX1_DESCRIPTION: {
    [EN]: `This filter takes only battles in the current season and filters for first pick
              games where the player selected either ML Peira or New Moon Luna as their first pick and
              harsetti was pre-banned.`,
  },
  EX2_TITLE: {
    [EN]: "Filter Example 2",
  },
  EX2_DESCRIPTION: {
    [EN]: `This filter first selects the most recent 500 battles, then filters
              those for second pick games that occurred between April 2025 and June 2025
              in which either the opponent is in Warlord, Emperor, or Legend and picked Zio on 3, or games
              in which the player ended with at or above 3000 victory points. <br><br>

              *Note that it does not matter when the last-n filter is placed;
              it will always execute before local filters, since it is a global filter.
              Therefore, the result will likely have much less than 500 battles. <br><br>

              **Also note that the indentation is purely for readability. Multiple spaces or returns will be ignored
              during parsing.`,
  },
  EX3_TITLE: {
    [EN]: "Filter Example 3",
  },
  EX3_DESCRIPTION: {
    [EN]: `This filter selects only games in which ML Arunka and Rinak are pre-banned,
              Harsetti was picked by the player and was not postbanned, and the player ended
              with victory points between 2500 and 3000 inclusively.`,
  },
  EX4_TITLE: {
    [EN]: "Filter Example 4",
  },
  EX4_DESCRIPTION: {
    [EN]: `This filter selects only games which occurred
              in the pre-season following season 16 that the player won`,
  },
  EX5_TITLE: {
    [EN]: "Filter Example 5",
  },
  EX5_DESCRIPTION: {
    [EN]: `This filter selects only games where the player selected belian, and
              Belian was equipped with both Counter and Immunity sets, and Belian was either
              equipped with 3f or Elbris Ritual Sword. Furthermore, it filters only for battles
              in which the opponent selected New Moon Luna, and New Moon Luna took the first turn, and
              the opponent was either from the Global, Japan, or Asia servers.`,
  },
  TEST_TITLE: {
    [EN]: "Filter Test",
  },
  TEST_DESCRIPTION: {
    [EN]: `Write filter syntax below to test. Use the 'Check Syntax' button to verify the filter
              is properly formed.`,
  }
}

export const WELCOME_BLOCK = {
  TITLE: {
    [EN]: "Welcome to E7 RTA Archive",
  },
  DESCRIPTION_PART1: {
    [EN]: `This tool primarily enables E7 players to maintain their RTA history beyond 100 battles.`,
  },
  DESCRIPTION_PART2: {
    [EN]: `Users can query their most recent 100 battles just like the E7 website, then export the data using the button in the top right and upload in the future to maintain a continuous history.`,
  },
  DESCRIPTION_PART3: {
    [EN]: `All uploads are handled exclusively by the client. No data from the upload is sent to the server (except for the user ID if auto-query if selected).`,
  },
  DESCRIPTION_PART4: {
    [EN]: `Some statistics are also available to help users better understand their performance.`,
  },
  DESCRIPTION_PART5: {
    [EN]: `A customizable filter syntax is available, allowing users to control what data is used in the analysis.`,
  },
  DESCRIPTION_PART6: {
    [EN]: `To utilize filters and query statistics, identifiers must be input correctly. A search page is available to find the correct names for things like artifacts and heroes.`,
  },
  DESCRIPTION_PART7: {
    [EN]: `Navigate to content pages using the above nav bar or the side panel.`,
  },
  DESCRIPTION_PART8: {
    [EN]: `English is currently the only supported language.`,
  },
};


export const LangBlocks = {
  Welcome: WELCOME_BLOCK,
  FilterExamplesAndTest: FILTER_EXAMPLES_AND_TEST_BLOCK,
  FilterOverview: FilterOverview,
  Functions: Functions,
  DeclaredData: DeclaredData,
  Fields: Fields,
  Operators: Operators,
  Syntax: Syntax,
  WELCOME_BLOCK: WELCOME_BLOCK
}


