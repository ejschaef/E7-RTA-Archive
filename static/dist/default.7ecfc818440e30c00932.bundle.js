/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/idb/build/index.js":
/*!*****************************************!*\
  !*** ./node_modules/idb/build/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deleteDB: () => (/* binding */ deleteDB),
/* harmony export */   openDB: () => (/* binding */ openDB),
/* harmony export */   unwrap: () => (/* binding */ unwrap),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const transactionDoneMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    // This mapping exists in reverseTransformCache but doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(this.request);
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
        });
    }
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event.newVersion, event));
    }
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking) {
            db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
        }
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event));
    }
    return wrap(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));

const advanceMethodProps = ['continue', 'continuePrimaryKey', 'advance'];
const methodMap = {};
const advanceResults = new WeakMap();
const ittrProxiedCursorToOriginalProxy = new WeakMap();
const cursorIteratorTraps = {
    get(target, prop) {
        if (!advanceMethodProps.includes(prop))
            return target[prop];
        let cachedFunc = methodMap[prop];
        if (!cachedFunc) {
            cachedFunc = methodMap[prop] = function (...args) {
                advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
            };
        }
        return cachedFunc;
    },
};
async function* iterate(...args) {
    // tslint:disable-next-line:no-this-assignment
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
        cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
        return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    // Map this double-proxy back to the original, so other cursor methods work.
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
        yield proxiedCursor;
        // If one of the advancing methods was not called, call continue().
        cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
        advanceResults.delete(proxiedCursor);
    }
}
function isIteratorProp(target, prop) {
    return ((prop === Symbol.asyncIterator &&
        instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor])) ||
        (prop === 'iterate' && instanceOfAny(target, [IDBIndex, IDBObjectStore])));
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
        if (isIteratorProp(target, prop))
            return iterate;
        return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
        return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    },
}));




/***/ }),

/***/ "./static/assets/js/apis/e7-API.ts":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/e7-API.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/references.ts */ "./static/assets/js/e7/references.ts");

const HERO_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_hero.json";
const ARTIFACT_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_artifact.json";
async function fetchE7Data(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error: status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched data from E7 Server; keys:", Object.keys(data));
        return data;
    }
    catch (error) {
        console.error("Error fetching global user data:", error);
        return null;
    }
}
async function fetchHeroJSON(lang = null) {
    console.log(`Fetching hero data (lang=${lang ?? "all"}) from E7 Server...`);
    let data = await fetchE7Data(HERO_URL);
    if (!data) {
        return null;
    }
    if (lang && data[lang]) {
        data = data[lang];
    }
    else if (lang && !data[lang]) {
        console.error("Could not find hero data for language:", lang);
        data = null;
    }
    return data;
}
async function fetchArtifactJSON(lang = null) {
    console.log(`Fetching hero data (lang=${lang ?? "all"}) from E7 Server...`);
    let data = await fetchE7Data(ARTIFACT_URL);
    let output = null;
    if (data && lang && typeof data === "object" && lang in data) {
        let record = data;
        if (Array.isArray(record[lang])) {
            return output = record[lang];
        }
    }
    return output;
}
async function fetchUserJSON(world_code) {
    world_code = world_code.replace("world_", "");
    if (![..._e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES].some((code) => code.replace("world_", "") === world_code)) {
        console.error(`Could not find world code: ${world_code}`);
        return null;
    }
    console.log(`Fetching users for world code: ${world_code} from E7 Server...`);
    const url = `https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_${world_code}.json`;
    const data = await fetchE7Data(url);
    if (data && typeof data === "object" && "users" in data && Array.isArray(data.users)) {
        console.log(`Got user data for world: ${world_code} ; Found ${data.users.length} users`);
    }
    return data;
}
async function fetchInfo(uid, worldCode, lang = "en") {
    const url = "https://epic7.onstove.com/gg/gameApi/getUserInfo";
    const payload = new URLSearchParams({
        nick_no: uid,
        world_code: worldCode,
        lang: lang,
    });
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
        });
        if (!resp.ok) {
            console.error("Error fetching battle list:", resp.status, resp.statusText);
            return null;
        }
        const data = await resp.json();
        return data;
    }
    catch (err) {
        console.error("Request failed:", err);
        return null;
    }
}
let E7API = {
    fetchHeroJSON: fetchHeroJSON,
    fetchUserJSON: fetchUserJSON,
    fetchArtifactJSON: fetchArtifactJSON,
    fetchInfo: fetchInfo
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (E7API);


/***/ }),

/***/ "./static/assets/js/apis/py-API.js":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/py-API.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var RS_BATTLE_URL = '/api/rs_get_battle_data';
var HERO_URL = '/api/get_hero_data';
var USER_URL = '/api/get_user_data';
var SEASON_URL = '/api/get_season_details';
var ARTIFACT_JSON_URL = '/api/get_artifact_json';
var PYAPI = {
  test: function test(data) {
    // test the fetching works properly
    console.log('Got data in test:', data.rank_plot);
  },
  fetchFromPython: function () {
    var _fetchFromPython = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
      var response, data;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return fetch(url);
          case 1:
            response = _context.v;
            if (response.ok) {
              _context.n = 3;
              break;
            }
            console.log("Retrying Fetch...");
            _context.n = 2;
            return fetch(url);
          case 2:
            response = _context.v;
          case 3:
            _context.n = 4;
            return response.json();
          case 4:
            data = _context.v;
            return _context.a(2, data ? data : null);
        }
      }, _callee);
    }));
    function fetchFromPython(_x) {
      return _fetchFromPython.apply(this, arguments);
    }
    return fetchFromPython;
  }(),
  fetchHeroData: function () {
    var _fetchHeroData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return this.fetchFromPython(HERO_URL);
          case 1:
            return _context2.a(2, _context2.v);
        }
      }, _callee2, this);
    }));
    function fetchHeroData() {
      return _fetchHeroData.apply(this, arguments);
    }
    return fetchHeroData;
  }(),
  // uses the new API endpoint that utilizes Rust for fetching and processing the battles
  rsFetchBattleData: function () {
    var _rsFetchBattleData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(user) {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            if (user) {
              _context3.n = 1;
              break;
            }
            throw new Error("Must pass user to fetch battles data");
          case 1:
            _context3.n = 2;
            return fetch(RS_BATTLE_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user: user
              })
            });
          case 2:
            return _context3.a(2, _context3.v);
        }
      }, _callee3);
    }));
    function rsFetchBattleData(_x2) {
      return _rsFetchBattleData.apply(this, arguments);
    }
    return rsFetchBattleData;
  }(),
  fetchSeasonDetails: function () {
    var _fetchSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var response, data, seasonDetails;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return fetch(SEASON_URL);
          case 1:
            response = _context4.v;
            _context4.n = 2;
            return response.json();
          case 2:
            data = _context4.v;
            if (!data.success) {
              _context4.n = 3;
              break;
            }
            seasonDetails = JSON.parse(data.seasonDetails);
            return _context4.a(2, {
              seasonDetails: seasonDetails,
              error: false
            });
          case 3:
            return _context4.a(2, {
              seasonDetails: null,
              error: data.error
            });
          case 4:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    function fetchSeasonDetails() {
      return _fetchSeasonDetails.apply(this, arguments);
    }
    return fetchSeasonDetails;
  }(),
  fetchArtifactJson: function () {
    var _fetchArtifactJson = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var response, data, artifactJson;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return fetch(ARTIFACT_JSON_URL);
          case 1:
            response = _context5.v;
            _context5.n = 2;
            return response.json();
          case 2:
            data = _context5.v;
            if (!data.success) {
              _context5.n = 3;
              break;
            }
            artifactJson = JSON.parse(data.artifactJson);
            return _context5.a(2, artifactJson);
          case 3:
            return _context5.a(2, null);
          case 4:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    function fetchArtifactJson() {
      return _fetchArtifactJson.apply(this, arguments);
    }
    return fetchArtifactJson;
  }(),
  fetchUser: function () {
    var _fetchUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(userData) {
      var response, data, user;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            if (!((!userData.name || !userData.world_code) && !userData.id)) {
              _context6.n = 1;
              break;
            }
            throw new Error("Must pass a user object with either user.name and user.world_code or user.id to fetch user");
          case 1:
            _context6.n = 2;
            return fetch(USER_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userData: userData
              })
            });
          case 2:
            response = _context6.v;
            _context6.n = 3;
            return response.json();
          case 3:
            data = _context6.v;
            if (response.ok) {
              _context6.n = 4;
              break;
            }
            throw new Error("Flask server error: ".concat(data.error));
          case 4:
            if (data.foundUser) {
              _context6.n = 6;
              break;
            }
            if (userData.world_code) {
              _context6.n = 5;
              break;
            }
            return _context6.a(2, {
              user: null,
              ok: true
            });
          case 5:
            return _context6.a(2, {
              user: null,
              ok: true
            });
          case 6:
            user = data.user;
            console.log("Server communication successful; received response data for user");
            console.log("Found user: ".concat(JSON.stringify(user)));
            return _context6.a(2, {
              user: user,
              ok: true
            });
        }
      }, _callee6);
    }));
    function fetchUser(_x3) {
      return _fetchUser.apply(this, arguments);
    }
    return fetchUser;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PYAPI);

/***/ }),

/***/ "./static/assets/js/cache-manager.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/cache-manager.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var idb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! idb */ "./node_modules/idb/build/index.js");
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/references */ "./static/assets/js/e7/references.ts");
// static/app.js


async function clearStore(db, storeName) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    await tx.done;
}
;
const USER_DATA_KEYS = {
    USER: "current-user",
    BATTLES: "battles",
    RAW_UPLOAD: "raw-upload",
    UPLOADED_BATTLES: "uploaded-battles",
    FILTERED_BATTLES: "filtered-battles",
    STATS: "stats",
    FILTER_STR: "filter-str",
};
const SERVER_USER_LISTS_KEYS = {
    GLOBAL_USERS: "global-users",
    EU_USERS: "eu-users",
    ASIA_USERS: "asia-users",
    JPN_USERS: "jpn-users",
    KOR_USERS: "kor-users",
};
const Keys = {
    ...USER_DATA_KEYS,
    ...SERVER_USER_LISTS_KEYS,
    LANG: "lang",
    HERO_MANAGER: "hero-manager",
    SEASON_DETAILS: "season-details",
    AUTO_ZOOM_FLAG: "auto-zoom",
    AUTO_QUERY_FLAG: "auto-query",
    ID_SEARCH_FLAG: "id-search",
    ARTIFACTS: "artifacts", // map of artifact codes to names
    ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map", // map of artifact lowercase names to original names
    ARTIFACT_OBJECT_LIST: "artifact-object-list",
    HOME_PAGE_STATE: "home-page-state",
    INTER_PAGE_MANAGER: "inter-page-manager",
};
let ClientCache = {
    consts: {
        DB_NAME: 'E7ArenaStatsClientDB',
        DB_VERSION: 1,
        STORE_NAME: 'DataStore',
        META_STORE_NAME: 'MetaStore',
        CACHE_TIMEOUT: 1000 * 60 * 60 * 24 * 2, // 2 day cache timeout
    },
    Keys: { ...Keys },
    MetaKeys: {
        TIMESTAMP: "timestamp",
    },
    loaded_UM: new Set(),
    openDB: async () => {
        return (0,idb__WEBPACK_IMPORTED_MODULE_0__.openDB)(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
            upgrade(db) {
                if (db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
                    db.deleteObjectStore(ClientCache.consts.STORE_NAME); // 🧹 clear old store
                    console.log('Old store deleted');
                }
                if (!db.objectStoreNames.contains(ClientCache.consts.STORE_NAME)) {
                    console.log('Created data store');
                    db.createObjectStore(ClientCache.consts.STORE_NAME);
                }
                if (!db.objectStoreNames.contains(ClientCache.consts.META_STORE_NAME)) {
                    console.log('Created meta data store');
                    db.createObjectStore(ClientCache.consts.META_STORE_NAME);
                }
            }
        });
    },
    get: async function (id) {
        const db = await this.openDB();
        const result = await db.get(this.consts.STORE_NAME, id);
        if (result !== null) {
            console.log(`Found ${id} in cache`);
        }
        else {
            console.log(`${id} not found in cache; returning null`);
            return null;
        }
        const useCache = await this.checkCacheTimeout(id);
        if (useCache) {
            return result;
        }
        else {
            return null;
        }
    },
    cache: async function (id, data) {
        console.log(`Caching ${id}`);
        const db = await this.openDB();
        await db.put(this.consts.STORE_NAME, data, id);
        await this.setTimestamp(id, Date.now());
    },
    delete: async function (id) {
        const db = await this.openDB();
        await db.delete(this.consts.STORE_NAME, id);
        await this.deleteTimestamp(id);
    },
    deleteDB: async function () {
        await indexedDB.deleteDatabase(this.consts.DB_NAME);
        console.log('Database deleted');
    },
    getTimestamp: async function (id) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        const timestamp = await db.get(this.consts.META_STORE_NAME, key);
        return timestamp ?? 0;
    },
    setTimestamp: async function (id, timestamp) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        await db.put(this.consts.META_STORE_NAME, timestamp, key);
        await db.get(this.consts.META_STORE_NAME, key);
    },
    deleteTimestamp: async function (id) {
        const db = await this.openDB();
        const key = `${id + this.MetaKeys.TIMESTAMP}`;
        await db.delete(this.consts.META_STORE_NAME, key);
    },
    clearData: async function () {
        const db = await this.openDB();
        await clearStore(db, this.consts.STORE_NAME);
        await clearStore(db, this.consts.META_STORE_NAME);
        console.log('All data cleared from data cache and meta data cache');
    },
    clearUserData: async function () {
        const toDelete = Object.values(USER_DATA_KEYS);
        await Promise.all(toDelete.map(key => this.delete(key)));
        console.log("User data cleared from data cache");
    },
    clearUserLists: async function () {
        const toDelete = Object.values(SERVER_USER_LISTS_KEYS);
        await Promise.all(toDelete.map(key => this.delete(key)));
        console.log("User lists cleared from data cache");
    },
    clearSeasonData: async function () {
        await this.delete(Keys.SEASON_DETAILS);
        console.log("Season data cleared from data cache");
    },
    checkCacheTimeout: async function (id) {
        const timestamp = await this.getTimestamp(id);
        const currentTime = Date.now();
        if (!timestamp || (currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
            console.log(`Cache timeout for ${id}; timestamp: ${timestamp}; currentTime: ${currentTime}`);
            await this.delete(id);
            return false;
        }
        return true;
    },
    getFilterStr: async function () {
        return await this.get(ClientCache.Keys.FILTER_STR);
    },
    setFilterStr: async function (filterStr) {
        await this.cache(ClientCache.Keys.FILTER_STR, filterStr);
    },
    getLang: async function () {
        return await this.get(ClientCache.Keys.LANG) ?? _e7_references__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN;
    },
    setLang: async function (lang) {
        await this.cache(ClientCache.Keys.LANG, lang);
    },
    getStats: async function () {
        return await this.get(ClientCache.Keys.STATS);
    },
    setStats: async function (stats) {
        await this.cache(Keys.STATS, stats);
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ClientCache);


/***/ }),

/***/ "./static/assets/js/content-manager.ts":
/*!*********************************************!*\
  !*** ./static/assets/js/content-manager.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContentManager: () => (/* binding */ ContentManager)
/* harmony export */ });
/* harmony import */ var _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/battle-manager.js */ "./static/assets/js/e7/battle-manager.js");
/* harmony import */ var _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./e7/season-manager.js */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _e7_artifact_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./e7/artifact-manager.ts */ "./static/assets/js/e7/artifact-manager.ts");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./lang-manager.ts */ "./static/assets/js/lang-manager.ts");







let ContentManager = {
    HeroManager: _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"],
    BattleManager: _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"],
    SeasonManager: _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__["default"],
    UserManager: _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"],
    ClientCache: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_3__["default"],
    ArtifactManager: _e7_artifact_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"],
    LangManager: _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__.LangManager,
};



/***/ }),

/***/ "./static/assets/js/e7/artifact-manager.ts":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/artifact-manager.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/e7-API.ts */ "./static/assets/js/apis/e7-API.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");



async function getArtifactCodeToNameMap() {
    console.log(`Getting artifact map from E7 server...`);
    let rawJSON = await _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_1__["default"].fetchArtifactJSON("en");
    if (rawJSON === null) {
        console.log(`Getting artifact map from flask server...`);
        rawJSON = await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__["default"].fetchArtifactJson();
    }
    if (rawJSON === null) {
        console.error(`Could not get artifact Json map from E7 server or flask server`);
        return null;
    }
    console.log(`Got artifact Json for language: 'en'`);
    return Object.fromEntries(rawJSON
        .filter((artifact) => artifact.name !== null)
        .map((artifact) => [artifact.code, artifact.name]));
}
let ArtifactManager = {
    async getArtifactCodeToNameMap() {
        let artifacts = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
        if (!artifacts) {
            artifacts = await this.fetchAndCacheArtifacts();
        }
        return artifacts;
    },
    getArtifactLowercaseNameMap: async function () {
        let artiMap = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_MAP);
        if (artiMap !== null) {
            console.log("Got artifact lowercase name map from cache");
            return artiMap;
        }
        const artifacts = await this.getArtifactCodeToNameMap();
        artiMap = Object.fromEntries(Object.values(artifacts)
            .filter((name) => name !== null)
            .map((name) => {
            return [name.toLowerCase(), name];
        }));
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_MAP, artiMap);
        return artiMap;
    },
    getArtifactObjectList: async function () {
        let objectList = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACT_OBJECT_LIST);
        if (objectList !== null) {
            console.log("Got artifact object list from cache");
            return objectList;
        }
        const artifacts = await this.getArtifactCodeToNameMap();
        objectList = Object.entries(artifacts).map(([id, name]) => ({ id, name }));
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACT_OBJECT_LIST, objectList);
        return objectList;
    },
    fetchAndCacheArtifacts: async function () {
        console.log(`ArtifactManager not found in cache, fetching from server and caching it`);
        const artifactMap = await getArtifactCodeToNameMap();
        if (artifactMap === null) {
            return {};
        }
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS, artifactMap);
        console.log(`Cached ArtifactManager using raw data recieved from server`);
        return artifactMap;
    },
    clearArtifactData: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
    },
    // will fall back to the code if the name is not found
    convertCodeToName: function (code, artifacts) {
        return artifacts[code] || code;
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ArtifactManager);


/***/ }),

/***/ "./static/assets/js/e7/battle-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/battle-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stats-builder.js */ "./static/assets/js/e7/stats-builder.js");
/* harmony import */ var _battle_transform_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./battle-transform.js */ "./static/assets/js/e7/battle-transform.js");
/* harmony import */ var _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./filter-parsing/functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(_typeof(e) + " is not iterable"); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }





var BattleManager = {
  loaded_servers: new Set(),
  // gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
  getBattles: function () {
    var _getBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            console.log("Getting battles");
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _t2 = _yield$ClientCache$ge = _context.v;
            _t = _t2 !== null;
            if (!_t) {
              _context.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context.n = 4;
            break;
          case 3:
            _t3 = null;
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee);
    }));
    function getBattles() {
      return _getBattles.apply(this, arguments);
    }
    return getBattles;
  }(),
  // Removes all user battle data from cache, should be called when user is switched out
  removeBattles: function () {
    var _removeBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _context2.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES);
          case 2:
            _context2.n = 3;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
          case 3:
            console.log("Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']");
          case 4:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function removeBattles() {
      return _removeBattles.apply(this, arguments);
    }
    return removeBattles;
  }(),
  removeFilteredBattles: function () {
    var _removeFilteredBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
          case 1:
            console.log("Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']");
          case 2:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function removeFilteredBattles() {
      return _removeFilteredBattles.apply(this, arguments);
    }
    return removeFilteredBattles;
  }(),
  /* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered 
   battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
  applyFilter: function () {
    var _applyFilter = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(filters) {
      var battles, localFilterList, globalFilterList, battleList, _iterator, _step, filter, startLen, _iterator2, _step2, _loop, _t4;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return this.getBattles();
          case 1:
            battles = _context5.v;
            localFilterList = filters.filter(function (f) {
              return f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.StandardFilter;
            });
            globalFilterList = filters.filter(function (f) {
              return f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.GlobalFilter;
            }); // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
            battleList = Object.values(battles);
            _iterator = _createForOfIteratorHelper(globalFilterList);
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                filter = _step.value;
                console.log("Applying global filter: ".concat(filter.asString()));
                startLen = battleList.length;
                battleList = filter.call(battleList);
                battles = Object.fromEntries(battleList.map(function (b) {
                  return [b["Seq Num"], b];
                }));
                console.log("Filtered ".concat(startLen - battleList.length, " out of ").concat(startLen, "; new total = ").concat(battleList.length));
              }

              // apply local filters (filters that can be resolved on each battle without context of other battles)
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }
            _iterator2 = _createForOfIteratorHelper(localFilterList);
            _context5.p = 2;
            _loop = /*#__PURE__*/_regenerator().m(function _loop() {
              var filter, startLen;
              return _regenerator().w(function (_context4) {
                while (1) switch (_context4.n) {
                  case 0:
                    filter = _step2.value;
                    console.log("Applying local filter: ".concat(filter.asString()));
                    startLen = Object.keys(battles).length;
                    battles = Object.fromEntries(Object.entries(battles).filter(function (_ref) {
                      var _ref2 = _slicedToArray(_ref, 2),
                        key = _ref2[0],
                        battle = _ref2[1];
                      var include = filter.call(battle);
                      //console.log(`Filtering battle: ${key} ${include ? "included" : "excluded"}`);
                      return include;
                    }));
                    console.log("Filtered ".concat(startLen - Object.keys(battles).length, " out of ").concat(startLen, "; new total = ").concat(Object.keys(battles).length));
                  case 1:
                    return _context4.a(2);
                }
              }, _loop);
            });
            _iterator2.s();
          case 3:
            if ((_step2 = _iterator2.n()).done) {
              _context5.n = 5;
              break;
            }
            return _context5.d(_regeneratorValues(_loop()), 4);
          case 4:
            _context5.n = 3;
            break;
          case 5:
            _context5.n = 7;
            break;
          case 6:
            _context5.p = 6;
            _t4 = _context5.v;
            _iterator2.e(_t4);
          case 7:
            _context5.p = 7;
            _iterator2.f();
            return _context5.f(7);
          case 8:
            console.log("Caching filtered battles ; total = ".concat(Object.keys(battles).length));
            _context5.n = 9;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES, battles);
          case 9:
            console.log("Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <".concat(localFilterList.length + globalFilterList.length, "> filters"));
            return _context5.a(2, battles);
        }
      }, _callee4, this, [[2, 6, 7, 8]]);
    }));
    function applyFilter(_x) {
      return _applyFilter.apply(this, arguments);
    }
    return applyFilter;
  }(),
  //takes in list of battles then converts to dict and then adds to cached battles
  extendBattles: function () {
    var _extendBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(cleanBattleMap) {
      var _yield$ClientCache$ge2;
      var oldDict, newDict, _t5, _t6, _t7;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _t6 = _yield$ClientCache$ge2 = _context6.v;
            _t5 = _t6 !== null;
            if (!_t5) {
              _context6.n = 2;
              break;
            }
            _t5 = _yield$ClientCache$ge2 !== void 0;
          case 2:
            if (!_t5) {
              _context6.n = 3;
              break;
            }
            _t7 = _yield$ClientCache$ge2;
            _context6.n = 4;
            break;
          case 3:
            _t7 = {};
          case 4:
            oldDict = _t7;
            // new battles automatically overwrite old ones if they share same seq_num
            newDict = _objectSpread(_objectSpread({}, oldDict), this.sortBattlesObj(cleanBattleMap));
            _context6.n = 5;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES, newDict);
          case 5:
            console.log("Extended user data in cache");
            return _context6.a(2, newDict);
        }
      }, _callee5, this);
    }));
    function extendBattles(_x2) {
      return _extendBattles.apply(this, arguments);
    }
    return extendBattles;
  }(),
  //Takes queried battles, clean format and extend in cache
  cacheQuery: function () {
    var _cacheQuery = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(battleList, HeroDicts, artifacts) {
      var cleanBattleMap, battles;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            if (battleList) {
              _context7.n = 1;
              break;
            }
            console.log("No query battles provided to cacheQuery");
            return _context7.a(2, []);
          case 1:
            console.log("Caching queried battles: ".concat(battleList.length, " battles; modified [BATTLES];"), battleList);
            cleanBattleMap = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_2__.buildFormattedBattleMap)(battleList, HeroDicts, artifacts);
            _context7.n = 2;
            return this.extendBattles(cleanBattleMap);
          case 2:
            battles = _context7.v;
            console.log("Cached queried battles in cache; modified [BATTLES];");
            return _context7.a(2, battles);
        }
      }, _callee6, this);
    }));
    function cacheQuery(_x3, _x4, _x5) {
      return _cacheQuery.apply(this, arguments);
    }
    return cacheQuery;
  }(),
  //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
  cacheUpload: function () {
    var _cacheUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(rawParsedBattleList, HeroDicts) {
      var cleanBattles, battles;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            if (rawParsedBattleList) {
              _context8.n = 1;
              break;
            }
            console.error("No uploaded battles provided to cacheUpload");
            return _context8.a(2, {});
          case 1:
            cleanBattles = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_2__.parsedCSVToFormattedBattleMap)(rawParsedBattleList, HeroDicts);
            _context8.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES, cleanBattles);
          case 2:
            _context8.n = 3;
            return this.extendBattles(cleanBattles);
          case 3:
            battles = _context8.v;
            console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
            return _context8.a(2, battles);
        }
      }, _callee7, this);
    }));
    function cacheUpload(_x6, _x7) {
      return _cacheUpload.apply(this, arguments);
    }
    return cacheUpload;
  }(),
  getStats: function () {
    var _getStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(battles, filters, HeroDicts) {
      var numFilters, battlesList, filteredBattles, filteredBattlesList, areFiltersApplied, prebanStats, firstPickStats, generalStats, heroStats, performanceStats;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            console.log("Getting stats");
            numFilters = filters.length;
            console.log("Applying ".concat(numFilters, " filters"));
            battlesList = Object.values(battles);
            _context9.n = 1;
            return this.applyFilter(filters);
          case 1:
            filteredBattles = _context9.v;
            filteredBattlesList = Object.values(filteredBattles);
            areFiltersApplied = numFilters > 0;
            console.log("Getting preban stats");
            _context9.n = 2;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getPrebanStats(filteredBattlesList, HeroDicts);
          case 2:
            prebanStats = _context9.v;
            console.log("Getting first pick stats");
            _context9.n = 3;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getFirstPickStats(filteredBattlesList, HeroDicts);
          case 3:
            firstPickStats = _context9.v;
            console.log("Getting general stats");
            _context9.n = 4;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getGeneralStats(filteredBattlesList, HeroDicts);
          case 4:
            generalStats = _context9.v;
            console.log("Getting hero stats");
            _context9.n = 5;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroStats(filteredBattlesList, HeroDicts);
          case 5:
            heroStats = _context9.v;
            console.log("Getting server stats");
            _context9.n = 6;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_1__["default"].getPerformanceStats(filteredBattlesList);
          case 6:
            performanceStats = _context9.v;
            console.log("Returning stats");
            return _context9.a(2, {
              battles: battlesList,
              filteredBattlesObj: filteredBattles,
              prebanStats: prebanStats,
              generalStats: generalStats,
              firstPickStats: firstPickStats,
              playerHeroStats: heroStats.playerHeroStats,
              enemyHeroStats: heroStats.enemyHeroStats,
              performanceStats: performanceStats,
              numFilters: numFilters,
              areFiltersApplied: areFiltersApplied
            });
        }
      }, _callee8, this);
    }));
    function getStats(_x8, _x9, _x0) {
      return _getStats.apply(this, arguments);
    }
    return getStats;
  }(),
  sortBattlesList: function sortBattlesList(battlesList) {
    var asc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var cmpCol = _references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.DATE_TIME;
    if (asc) {
      return battlesList.sort(function (a, b) {
        return new Date(a[cmpCol]) - new Date(b[cmpCol]);
      });
    } else {
      return battlesList.sort(function (a, b) {
        return new Date(b[cmpCol]) - new Date(a[cmpCol]);
      });
    }
  },
  sortBattlesObj: function sortBattlesObj(battlesObj) {
    var asc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    var cmpCol = _references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.DATE_TIME;
    if (asc) {
      var sorted = Object.values(battlesObj).sort(function (a, b) {
        return new Date(a[cmpCol]) - new Date(b[cmpCol]);
      });
      return Object.fromEntries(sorted.map(function (b) {
        return [b[_references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.SEQ_NUM], b];
      }));
    } else {
      var _sorted = Object.values(battlesObj).sort(function (a, b) {
        return new Date(b[cmpCol]) - new Date(a[cmpCol]);
      });
      return Object.fromEntries(_sorted.map(function (b) {
        return [b[_references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.SEQ_NUM], b];
      }));
    }
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BattleManager);

/***/ }),

/***/ "./static/assets/js/e7/battle-transform.js":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/battle-transform.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildFormattedBattleMap: () => (/* binding */ buildFormattedBattleMap),
/* harmony export */   parsedCSVToFormattedBattleMap: () => (/* binding */ parsedCSVToFormattedBattleMap)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./artifact-manager.ts */ "./static/assets/js/e7/artifact-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _str_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../str-functions.ts */ "./static/assets/js/str-functions.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }





// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow)
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle, HeroDicts) {
  var getChampPrime = function getChampPrime(name) {
    var _HeroManager$getHeroB, _HeroManager$getHeroB2;
    return (_HeroManager$getHeroB = (_HeroManager$getHeroB2 = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(name, HeroDicts)) === null || _HeroManager$getHeroB2 === void 0 ? void 0 : _HeroManager$getHeroB2.prime) !== null && _HeroManager$getHeroB !== void 0 ? _HeroManager$getHeroB : HeroDicts.Fodder.prime;
  };
  var product = function product(acc, prime) {
    return acc * prime;
  };
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES].reduce(product, 1);
  battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT] = battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES].reduce(product, 1);
}
var P1 = "p1";
var P2 = "p2";

// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw, HeroDicts, artifacts) {
  var _battle;
  // Make functions used to convert the identifier strings in the E7 data into human readable names

  var getChampName = function getChampName(code) {
    var _HeroManager$getHeroB3, _HeroManager$getHeroB4;
    return (_HeroManager$getHeroB3 = (_HeroManager$getHeroB4 = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByCode(code, HeroDicts)) === null || _HeroManager$getHeroB4 === void 0 ? void 0 : _HeroManager$getHeroB4.name) !== null && _HeroManager$getHeroB3 !== void 0 ? _HeroManager$getHeroB3 : HeroDicts.Fodder.name;
  };
  var getArtifactName = function getArtifactName(code) {
    return _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].convertCodeToName(code, artifacts) || "None";
  };
  var checkBanned = function checkBanned(player, index) {
    // used to check if artifact is null because banned or because not equipped
    if (player === P1) {
      return raw.p2_postban === raw.p1_picks[index];
    } else {
      return raw.p1_postban === raw.p2_picks[index];
    }
  };
  var formatArtifacts = function formatArtifacts(player, artiArr) {
    return artiArr.map(function (code, index) {
      return code ? getArtifactName(code) : checkBanned(player, index) ? "n/a" : "None";
    });
  };
  var formatCRBar = function formatCRBar(crBar) {
    return crBar.map(function (entry) {
      return entry && entry.length == 2 ? [getChampName(entry[0]), entry[1]] : ["n/a", 0];
    });
  };

  // Fall back to the code if the equipment set is not defined in references
  var formatEquipment = function formatEquipment(equipArr) {
    return equipArr.map(function (heroEquipList) {
      return heroEquipList.map(function (equip) {
        return _references_ts__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_SET_MAP[equip] || equip;
      });
    });
  };
  var firstTurnHero = raw.cr_bar.find(function (entry) {
    return entry[1] === 100;
  });
  var p1TookFirstTurn = firstTurnHero ? raw.p1_picks.includes(firstTurnHero[0]) : false;
  var battle = (_battle = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON, raw.season_name || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON_CODE, raw.season_code || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.DATE_TIME, raw.date_time), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SECONDS, raw.seconds), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.TURNS, raw.turns), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEQ_NUM, raw.seq_num), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ID, raw.p1_id.toString()), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_SERVER, _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ID, raw.p2_id.toString()), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_SERVER, _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None"), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_LEAGUE, (0,_str_functions_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p1_league) || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_LEAGUE, (0,_str_functions_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p2_league) || "None"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POINTS, raw.p1_win_score), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.POINT_GAIN, raw.p1_point_delta || null), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.WIN, raw.win === 1 ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_PICK, raw.first_pick === 1 ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN, p1TookFirstTurn ? true : false), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN_HERO, firstTurnHero ? getChampName(firstTurnHero[0]) : "n/a"), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.CR_BAR, formatCRBar(raw.cr_bar)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS, raw.p1_prebans.map(getChampName)), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS, raw.p2_prebans.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS, raw.p1_picks.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS, raw.p2_picks.map(getChampName)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POSTBAN, getChampName(raw.p1_postban)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_POSTBAN, getChampName(raw.p2_postban)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_EQUIPMENT, formatEquipment(raw.p1_equipment)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_EQUIPMENT, formatEquipment(raw.p2_equipment)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ARTIFACTS, formatArtifacts(P1, raw.p1_artifacts)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ARTIFACTS, formatArtifacts(P2, raw.p2_artifacts)), _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_MVP, getChampName(raw.p1_mvp)), _defineProperty(_battle, _references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_MVP, getChampName(raw.p2_mvp)));

  // finally take the array hero array fields and compute the prime products after converting; will be used to compute statistics more easily
  addPrimeFields(battle, HeroDicts);
  return battle;
}
function buildFormattedBattleMap(rawBattles, HeroDicts, artifacts) {
  artifacts = artifacts !== null && artifacts !== void 0 ? artifacts : _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getArtifactCodeToNameMap();
  var entries = [];
  var _iterator = _createForOfIteratorHelper(rawBattles),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var rawBattle = _step.value;
      var battle = formatBattleAsRow(rawBattle, HeroDicts, artifacts);
      entries.push([battle["Seq Num"], battle]);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return Object.fromEntries(entries);
}

// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr, HeroDicts) {
  var rows = rawRowsArr.map(function (row) {
    var _iterator2 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.ARRAY_COLUMNS),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var col = _step2.value;
        row[col] = JSON.parse(row[col]);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    var _iterator3 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.BOOLS_COLS),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _col = _step3.value;
        row[_col] = row[_col].toLowerCase() === "true";
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
    var _iterator4 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.INT_COLUMNS),
      _step4;
    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var _col2 = _step4.value;
        row[_col2] = Number(row[_col2].replace("'", ""));
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }
    var _iterator5 = _createForOfIteratorHelper(_references_ts__WEBPACK_IMPORTED_MODULE_2__.TITLE_CASE_COLUMNS),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var _col3 = _step5.value;
        row[_col3] = (0,_str_functions_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(row[_col3]);
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
    addPrimeFields(row, HeroDicts);
    return row;
  });
  return Object.fromEntries(rows.map(function (row) {
    return [row["Seq Num"], row];
  }));
}


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/base-elements.ts":
/*!*************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/base-elements.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BaseElement: () => (/* binding */ BaseElement),
/* harmony export */   BaseElements: () => (/* binding */ BaseElements),
/* harmony export */   RangeData: () => (/* binding */ RangeData)
/* harmony export */ });
/* harmony import */ var _regex__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../regex */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _filter_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filter-utils */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _string_literal_parse__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./string-literal-parse */ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts");
/* harmony import */ var _field_extract_map__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./field-extract-map */ "./static/assets/js/e7/filter-parsing/field-extract-map.ts");




const COLLECTION_FIELDS_SET = new Set([
    "p1.picks",
    "p2.picks",
    "p1.prebans",
    "p2.prebans",
    "prebans",
]);
const BaseEltTypes = {
    FIELD: "FIELD",
    RANGE: "RANGE",
    SET: "SET",
    INT: "INT",
    DATE: "DATE",
    BOOL: "BOOL",
    STRING: "STRING",
};
class BaseElement {
}
class Field extends BaseElement {
    type = BaseEltTypes.FIELD;
    rawString;
    extractFn;
    constructor(str) {
        super();
        this.rawString = str;
        if (!_field_extract_map__WEBPACK_IMPORTED_MODULE_3__.FIELD_EXTRACT_FN_MAP[str])
            throw new Error("Invalid field");
        this.extractFn = _field_extract_map__WEBPACK_IMPORTED_MODULE_3__.FIELD_EXTRACT_FN_MAP[str];
    }
    getData() { throw new Error("Not implemented for Field"); }
    extractData(battle) {
        return this.extractFn(battle);
    }
    asString() { return `${this.rawString}`; }
}
class Literal extends BaseElement {
    rawString;
    constructor(str) {
        super();
        this.rawString = str;
    }
    getData() {
        return this.data;
    }
    extractData(battle) { throw new Error("Not implemented for Literals"); }
    asString() { return `${this.fmtString}`; }
}
class StringLiteral extends Literal {
    type = BaseEltTypes.STRING;
    fmtString;
    data;
    constructor(str, REFS, parsers = Object.values(_string_literal_parse__WEBPACK_IMPORTED_MODULE_2__.STRING_LITERAL_PARSERS)) {
        super(str);
        str = _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].trimSurroundingQuotes(str);
        this.data = this.processString(str, REFS, parsers);
        this.fmtString = this.data;
    }
    /**
     * Processes a string literal and returns the parsed string.
     * If the string could not be parsed, throws a ValidationError.
     * @param str the string to parse
     * @param REFS the FilterReferences to use for parsing
     * @param parsers an array of StringLiteralParser to use for parsing
     * @returns the parsed string
     * @throws ValidationError if the string could not be parsed
     */
    processString(str, REFS, parsers) {
        const parsedString = (0,_string_literal_parse__WEBPACK_IMPORTED_MODULE_2__.parseStringLiteral)(str, REFS, parsers);
        if (!parsedString) {
            const parsersStr = parsers.map((parser) => parser.parserType).join(", ");
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid string literal: '${str}' ; could not be parsed as a valid instance of any of the following: [${parsersStr}]`);
        }
        return parsedString;
    }
}
class IntLiteral extends Literal {
    type = BaseEltTypes.INT;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        const num = parseInt(str);
        if (isNaN(num)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid integer literal: '${str}'`);
        }
        return num;
    }
}
class BoolLiteral extends Literal {
    type = BaseEltTypes.BOOL;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        if (str === "true")
            return true;
        if (str === "false")
            return false;
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid boolean literal: '${str}'`);
    }
}
class DateLiteral extends Literal {
    type = BaseEltTypes.DATE;
    fmtString;
    data;
    constructor(str) {
        super(str);
        this.data = this.processString(str);
        this.fmtString = str;
    }
    processString(str) {
        return _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].parseDate(str);
    }
}
class RangeData {
    start;
    end;
    endInclusive;
    constructor(start, end, endInclusive) {
        this.start = start;
        this.end = end;
        this.endInclusive = endInclusive;
    }
    has(value) {
        if (typeof value !== typeof this.start)
            return false;
        if (value < this.start)
            return false;
        if (value > this.end)
            return false;
        return value === this.end ? this.endInclusive : true;
    }
    includes(value) {
        return this.has(value);
    }
}
const RANGE_ELT_PARSERS = [
    (str) => {
        return _regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.test(str)
            ? new DateLiteral(str)
            : null;
    },
    (str) => {
        return _regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.INT_LITERAL_RE.test(str)
            ? new IntLiteral(str)
            : null;
    },
];
function tryParseRange(start, end, endInclusive, parser) {
    let parsedStart = parser(start);
    let parsedEnd = parser(end);
    if (parsedStart === null || parsedEnd === null)
        return null;
    return new RangeData(parsedStart.data, parsedEnd.data, endInclusive);
}
class RangeLiteral extends Literal {
    type = BaseEltTypes.RANGE;
    fmtString;
    data;
    constructor(str, REFS) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS);
    }
    processString(str, REFS) {
        const split = str.split("...");
        const start = split[0];
        let endInclusive = split[1].charAt(0) === "=";
        const end = split[1].slice(endInclusive ? 1 : 0);
        for (const parser of RANGE_ELT_PARSERS) {
            const parsedRangeData = tryParseRange(start, end, endInclusive, parser);
            if (parsedRangeData !== null) {
                return parsedRangeData;
            }
        }
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid range literal: '${str}' ; ranges must be homogenous and of the format x...y or x...=y for the types: [Date, Integer]`);
    }
}
const SET_ELT_PARSERS = [
    ...RANGE_ELT_PARSERS
];
const SET_STRING_PARSER = (str, REFS, parsers) => {
    return _regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.STRING_RE.test(str)
        ? new StringLiteral(str, REFS, parsers)
        : null;
};
class SetLiteral extends Literal {
    type = BaseEltTypes.SET;
    fmtString;
    data;
    constructor(str, REFS, parsers = Object.values(_string_literal_parse__WEBPACK_IMPORTED_MODULE_2__.STRING_LITERAL_PARSERS)) {
        super(str);
        this.fmtString = str;
        this.data = this.processString(str, REFS, parsers);
    }
    processString(str, REFS, parsers) {
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        const parsedSet = new Set();
        for (const arg of args) {
            let parsedElt = null;
            for (const parser of SET_ELT_PARSERS) {
                parsedElt = parser(arg);
                if (parsedElt) {
                    console.log(`Parsed literal: ${arg} and got ${parsedElt}`);
                    parsedSet.add(parsedElt.data);
                    break;
                }
            }
            if (parsedElt)
                continue;
            parsedElt = SET_STRING_PARSER(arg, REFS, parsers);
            if (parsedElt) {
                console.log(`Parsed string literal: ${arg} and got ${parsedElt}`);
                parsedSet.add(parsedElt.data);
                continue;
            }
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid set element: '${str}' ; could not be parsed as a valid instance of any of the following types: [Date, Integer, String]`);
        }
        this.fmtString = `{${Array.from(parsedSet).join(", ")}}`;
        return parsedSet;
    }
}
function parseBaseElement(string, REFS) {
    console.log(`Parsing string: ${string}`);
    if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.STRING_LITERAL_RE.test(string)) {
        console.log(`Parsing as StringLiteral`);
        return new StringLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.INT_LITERAL_RE.test(string)) {
        console.log("Parsing as IntLiteral");
        return new IntLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.BOOL_LITERAL_RE.test(string)) {
        console.log("Parsing as BoolLiteral");
        return new BoolLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.test(string)) {
        console.log("Parsing as DateLiteral");
        return new DateLiteral(string);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.RANGE_LITERAL_RE.test(string)) {
        console.log("Parsing as RangeLiteral");
        return new RangeLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.SET_LITERAL_RE.test(string)) {
        console.log("Parsing as SetLiteral");
        return new SetLiteral(string, REFS);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.SEASON_LITERAL_RE.test(string)) {
        console.log("Parsing as SeasonLiteral");
        return new StringLiteral(string, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_2__.STRING_LITERAL_PARSERS.Season]);
    }
    else if (_regex__WEBPACK_IMPORTED_MODULE_0__.RegExps.FIELD_WORD_LITERAL_RE.test(string)) {
        console.log("Parsing as Field");
        return new Field(string);
    }
    throw new _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].ValidationError(`Invalid base element: '${string}' ; could not be parsed as a Field or Literal.`);
}
const BaseElements = {
    StringLiteral: StringLiteral,
    IntLiteral: IntLiteral,
    BoolLiteral: BoolLiteral,
    DateLiteral: DateLiteral,
    RangeLiteral: RangeLiteral,
    SetLiteral: SetLiteral,
    Field: Field,
    BaseEltTypes: BaseEltTypes,
    FIELD_EXTRACT_FN_MAP: _field_extract_map__WEBPACK_IMPORTED_MODULE_3__.FIELD_EXTRACT_FN_MAP,
    parseBaseElement: parseBaseElement,
    COLLECTION_FIELDS_SET: COLLECTION_FIELDS_SET
};



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/field-extract-map.ts":
/*!*****************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/field-extract-map.ts ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FIELD_EXTRACT_FN_MAP: () => (/* binding */ FIELD_EXTRACT_FN_MAP)
/* harmony export */ });
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");

// FNS that take in a clean format battle and return the appropriate data
const FIELD_EXTRACT_FN_MAP = {
    "date": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME]
        ? new Date(`${battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME].slice(0, 10)}T00:00:00`)
        : "N/A",
    "season": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.SEASON_CODE],
    "is-first-pick": (battle) => (battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_PICK] ? 1 : 0),
    "is-win": (battle) => (battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.WIN] ? 1 : 0),
    "victory-points": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_POINTS],
    "p1.picks": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS],
    "p2.picks": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS],
    "p1.prebans": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PREBANS],
    "p2.prebans": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PREBANS],
    "p1.postban": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_POSTBAN],
    "p2.postban": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_POSTBAN],
    "prebans": (battle) => [
        ...battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PREBANS],
        ...battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PREBANS],
    ],
    "p1.pick1": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][0],
    "p1.pick2": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][1],
    "p1.pick3": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][2],
    "p1.pick4": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][3],
    "p1.pick5": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_PICKS][4],
    "p2.pick1": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][0],
    "p2.pick2": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][1],
    "p2.pick3": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][2],
    "p2.pick4": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][3],
    "p2.pick5": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_PICKS][4],
    "p1.league": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_LEAGUE],
    "p2.league": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_LEAGUE],
    "p1.server": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_SERVER],
    "p2.server": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_SERVER],
    "p1.id": (battle) => Number(battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_ID]),
    "p2.id": (battle) => Number(battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_ID]),
    "p1.mvp": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P1_MVP],
    "p2.mvp": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.P2_MVP],
    "is-first-turn": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_TURN],
    "first-turn-hero": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_TURN_HERO],
    "turns": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.TURNS],
    "seconds": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.SECONDS],
    "point-gain": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.POINT_GAIN],
};


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts":
/*!***********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-parse-references.ts ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACCEPTED_CHARS: () => (/* binding */ ACCEPTED_CHARS),
/* harmony export */   EQUIPMENT_LOWERCASE_STRINGS_MAP: () => (/* binding */ EQUIPMENT_LOWERCASE_STRINGS_MAP),
/* harmony export */   PRINT_PREFIX: () => (/* binding */ PRINT_PREFIX)
/* harmony export */ });
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../references.ts */ "./static/assets/js/e7/references.ts");

const ACCEPTED_CHARS = new Set(`'"(),_-.=; ><!1234567890{}~` +
    `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`);
const PRINT_PREFIX = "   ";
const EQUIPMENT_LOWERCASE_STRINGS_MAP = Object.fromEntries(Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_0__.EQUIPMENT_SET_MAP).map((v) => [v.toLowerCase(), v]));


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-parser.ts":
/*!*************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-parser.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FilterParser: () => (/* binding */ FilterParser)
/* harmony export */ });
/* harmony import */ var _artifact_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../artifact-manager */ "./static/assets/js/e7/artifact-manager.ts");
/* harmony import */ var _hero_manager__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../hero-manager */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _regex_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../regex.ts */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _season_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../season-manager */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _functions_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./filter-utils.ts */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");








function validateChars(str, charSet, objName) {
    for (let char of str) {
        if (!charSet.has(char)) {
            throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Invalid character within <${objName}> ; ' ${char} ' is not allowed; got string: '${str}'`);
        }
    }
}
function preParse(str) {
    str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
    validateChars(str, _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__.ACCEPTED_CHARS, "Main Filter String");
    str = str.toLowerCase();
    return str;
}
function getEmptyFilters() {
    return [];
}
function validateClauseBody(filters, str) {
    for (const f of filters) {
        if (f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.GlobalFilter) {
            throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Global filters not allowed in clause functions; got: ${f.asString()} from string: "${str}"`);
        }
    }
    return filters.filter((f) => f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.StandardFilter);
}
function sortFilters(filters) {
    const globalFilters = [];
    const standardFilters = [];
    for (const f of filters) {
        if (f instanceof _functions_ts__WEBPACK_IMPORTED_MODULE_4__.GlobalFilter) {
            globalFilters.push(f);
        }
        else {
            standardFilters.push(f);
        }
    }
    return [...globalFilters, ...standardFilters];
}
class FilterParser {
    _filters;
    rawString;
    preParsedString;
    references;
    constructor() {
        this._filters = getEmptyFilters();
        this.rawString = "";
        this.preParsedString = "";
        this.references = {
            HeroDicts: null,
            ARTIFACT_LOWERCASE_STRINGS_MAP: {},
            SEASON_DETAILS: [],
        };
    }
    async addReferences(HeroDicts = null) {
        HeroDicts = HeroDicts || (await _hero_manager__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroDicts());
        if (HeroDicts === null)
            throw new Error("Hero Manager could not be retrieved to parse filters.");
        const seasonDetails = await _season_manager__WEBPACK_IMPORTED_MODULE_3__["default"].getSeasonDetails();
        if (seasonDetails === null)
            throw new Error("Season Details could not be retrieved to parse filters.");
        const ARTIFACT_LOWERCASE_STRINGS_MAP = await _artifact_manager__WEBPACK_IMPORTED_MODULE_0__["default"].getArtifactLowercaseNameMap();
        this.references = {
            HeroDicts: HeroDicts,
            ARTIFACT_LOWERCASE_STRINGS_MAP: ARTIFACT_LOWERCASE_STRINGS_MAP,
            SEASON_DETAILS: seasonDetails,
        };
    }
    getFilters() {
        return sortFilters(this._filters);
    }
    asString() {
        const prefix = _filter_parse_references__WEBPACK_IMPORTED_MODULE_5__.PRINT_PREFIX;
        return `[\n${this._filters.map((f) => f.asString(prefix)).join(";\n")};\n]`;
    }
    static async getFiltersFromCache(HeroDicts = null) {
        const filterStr = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].Keys.FILTER_STR);
        if (filterStr === null)
            return [];
        let parser = await this.fromFilterStr(filterStr, HeroDicts);
        return parser.getFilters();
    }
    static async fromFilterStr(filterStr, HeroDicts = null) {
        const parser = new FilterParser();
        parser.rawString = filterStr;
        await parser.addReferences(HeroDicts);
        parser.preParsedString = preParse(filterStr);
        parser._filters = parser.parse(parser.preParsedString);
        return parser;
    }
    parseList(filterStrs) {
        return filterStrs.reduce((acc, str) => {
            acc.push(...this.parse(str));
            return acc;
        }, getEmptyFilters());
    }
    parse(str) {
        str = str.trim();
        if (str === "")
            return getEmptyFilters();
        if (str.includes(";")) {
            const filterStrs = str.split(";");
            return this.parseList(filterStrs);
        }
        const fnStr = str.split("(")[0].replace(/p[1-2]\./i, ""); // 
        const args = _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        switch (fnStr) {
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.AND:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.OR:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.NOT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.XOR:
                const filters = validateClauseBody(this.parseList(args), str);
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FN_STR_MAP[fnStr](...filters)];
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.LAST_N:
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FNS.LAST_N(str)];
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.EQUIPMENT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.ARTIFACT:
            case _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FUNCTION_STRS.CR:
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FN_STR_MAP[fnStr](str, this.references)];
            default:
                if (_regex_ts__WEBPACK_IMPORTED_MODULE_2__.RegExps.FUNCTION_CALL_RE.test(str)) {
                    throw new _filter_utils_ts__WEBPACK_IMPORTED_MODULE_6__["default"].SyntaxException(`Filter String is not a valid function call but a parenthese block was detected; got: ${str}`);
                }
                return [new _functions_ts__WEBPACK_IMPORTED_MODULE_4__.FNS.BASE_FILTER(str, this.references)];
        }
    }
}



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-utils.ts":
/*!************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-utils.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../regex.ts */ "./static/assets/js/e7/regex.ts");

class SyntaxException extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Syntax Exception"; // Set error name
    }
}
class TypeException extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Type Exception"; // Set error name
    }
}
class ValidationError extends Error {
    constructor(message) {
        super(message); // Pass message to base Error
        this.name = "Filter Validation Error"; // Set error name
    }
}
const ENCLOSURE_MAP = {
    "(": ")",
    "{": "}",
    '"': '"',
    "'": "'",
};
const ENCLOSURE_IGNORE = {
    // if we are in a string enclosure, don't look for other quotes
    "'": '"',
    '"': "'",
};
const REVERSE_ENCLOSURE_MAP = Object.fromEntries(Object.entries(ENCLOSURE_MAP)
    .filter(([k, v]) => k !== v)
    .map(([k, v]) => [v, k]));
/**
 * Tokenize a string into an array of strings, ignoring any enclosures up to a given level.
 * @param {string} input - The string to tokenize.
 * @param {string} [splitChars=" "] - The characters to split on.
 * @param {number} [enclosureLevel=0] - The level of enclosure to ignore.
 * @param {boolean} [trim=true] - Whether to trim the tokens.
 * @returns {string[]} An array of strings, each representing a token in the input string.
 * @throws {SyntaxException} If there is an unbalanced closing character in the input string.
 * @throws {Error} If there are any unresolved characters from the enclosure stack after tokenizing.
 */
function tokenizeWithNestedEnclosures(input, splitChars = " ", enclosureLevel = 0, trim = true) {
    const tokens = [];
    let current = "";
    let stack = [];
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        //console.log(`Processing char ${char} at position ${i}; current string: ${current}; tokens: ${tokens}`);
        if (splitChars.includes(char) && stack.length === enclosureLevel) {
            if (current) {
                tokens.push(trim ? current.trim() : current);
                current = "";
            }
        }
        else {
            if (REVERSE_ENCLOSURE_MAP[char]) {
                // found a closing brace or parenthesis
                const expected = REVERSE_ENCLOSURE_MAP[char];
                if (stack.length > enclosureLevel) {
                    current += char;
                }
                if (stack[stack.length - 1] === expected) {
                    stack.pop();
                }
                else {
                    const charCounts = getCharCounts(input);
                    if ((charCounts["'"] || 0) % 2 !== 0 ||
                        (charCounts['"'] || 0) % 2 !== 0) {
                        throw new SyntaxException(`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}' ; if a str type has quote characters in it, wrap it in the opposite quote character.`);
                    }
                    else {
                        throw new SyntaxException(`Error tokenizing: Unbalanced closing character at position ${i}; got string: '${input}'`);
                    }
                }
            }
            else {
                if (stack.length >= enclosureLevel) {
                    // we are beyond the level of enclosure we are ignoring so add to current string
                    current += char;
                }
                if (ENCLOSURE_MAP[char] &&
                    (!ENCLOSURE_IGNORE[char] ||
                        stack[stack.length - 1] !== ENCLOSURE_IGNORE[char])) {
                    if (stack[stack.length - 1] === ENCLOSURE_MAP[char] && // matching quote to end the enclosure
                        char === ENCLOSURE_MAP[char]) {
                        stack.pop();
                    }
                    else {
                        stack.push(char); // add new enclosure level
                    }
                }
            }
        }
    }
    if (stack.length > 0) {
        throw new Error(`Unbalanced enclosures in input string; unresolved characters from enclosure stack: [ ${stack.join(", ")} ]`);
    }
    if (current) {
        tokens.push(trim ? current.trim() : current);
    }
    return tokens;
}
function getCharCounts(str) {
    const counts = {};
    for (const char of str) {
        counts[char] = (counts[char] || 0) + 1;
    }
    return counts;
}
function parseDate(dateStr) {
    if (!_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.test(dateStr)) {
        throw new SyntaxException(`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.source} ); got: '${dateStr}'`);
    }
    const isoDateStr = dateStr.split(" ")[0];
    const date = new Date(`${isoDateStr}T00:00:00`);
    // Check if valid date
    if (isNaN(date.getTime())) {
        throw new SyntaxException(`Invalid date; could not be parsed as a valid date; got: '${dateStr}'`);
    }
    // Check if parsed date matches passed in string
    const dateString = date.toISOString().split("T")[0];
    const [year, month, day] = dateString.split("-").map(Number);
    if (date.getFullYear() !== year ||
        date.getMonth() + 1 !== month ||
        date.getDate() !== day) {
        throw new SyntaxException(`Invalid date; parsed date: ${date.toISOString()} does not match passed in string: ${isoDateStr}`);
    }
    console.log(`Parsed date: ${date.toISOString()} ; ${date.constructor.name}`);
    return date;
}
function tryConvert(convertFnc, typeName, value, errMSG = null) {
    if (errMSG === null) {
        errMSG = `Could not convert ${value} to ${typeName}`;
    }
    try {
        return convertFnc(value);
    }
    catch (err) {
        throw new TypeException(`${errMSG}: ${err.message}`);
    }
}
function trimSurroundingQuotes(str) {
    return str.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}
let Futils = {
    SyntaxException: SyntaxException,
    TypeException: TypeException,
    ValidationError: ValidationError,
    getCharCounts: getCharCounts,
    tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
    parseDate: parseDate,
    tryConvert: tryConvert,
    trimSurroundingQuotes: trimSurroundingQuotes,
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Futils);


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/functions.ts":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/functions.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FNS: () => (/* binding */ FNS),
/* harmony export */   FN_STR_MAP: () => (/* binding */ FN_STR_MAP),
/* harmony export */   FUNCTION_STRS: () => (/* binding */ FUNCTION_STRS),
/* harmony export */   GlobalFilter: () => (/* binding */ GlobalFilter),
/* harmony export */   StandardFilter: () => (/* binding */ StandardFilter)
/* harmony export */ });
/* harmony import */ var _str_functions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../str-functions */ "./static/assets/js/str-functions.ts");
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _base_elements__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./base-elements */ "./static/assets/js/e7/filter-parsing/base-elements.ts");
/* harmony import */ var _operators__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./operators */ "./static/assets/js/e7/filter-parsing/operators.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _filter_utils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./filter-utils */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");
/* harmony import */ var _string_literal_parse__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./string-literal-parse */ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts");







const FUNCTION_STRS = {
    AND: "and",
    OR: "or",
    XOR: "xor",
    NOT: "not",
    LAST_N: "last-n",
    EQUIPMENT: "equipment",
    ARTIFACT: "artifact",
    CR: "cr",
    BASE_FILTER: "base-filter",
};
const FN_TYPES = {
    CLAUSE_FN: "CLAUSE_FN",
    HERO_LIST_FN: "HERO_LIST_FN",
    GLOBAL_FN: "GLOBAL_FN",
    BASE_FILTER: "BASE_FILTER",
};
class Fn {
}
class StandardFilter extends Fn {
}
class ClauseFn extends StandardFilter {
    fnType = FN_TYPES.CLAUSE_FN;
    fns = [];
    constructor(...fns) {
        super();
        this.fns = fns;
    }
    asString(prefix = "") {
        let strBody = "";
        const newPrefix = prefix + _filter_parse_references__WEBPACK_IMPORTED_MODULE_4__.PRINT_PREFIX;
        this.fns.forEach((fn) => (strBody += `${fn.asString(newPrefix)},\n`));
        console.log("Clause Fn asString got strBody:", strBody);
        return `${prefix}${this.fnName}(\n${strBody.trimEnd()}\n${prefix})`;
    }
}
class AND extends ClauseFn {
    fnName = FUNCTION_STRS.AND;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        return this.fns.every((fn) => fn.call(battle));
    }
}
class OR extends ClauseFn {
    fnName = FUNCTION_STRS.OR;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        return this.fns.some((fn) => fn.call(battle));
    }
}
class XOR extends ClauseFn {
    fnName = FUNCTION_STRS.XOR;
    fnType = FN_TYPES.CLAUSE_FN;
    call(battle) {
        let result = false;
        for (let fn of this.fns) {
            result = (!result && fn.call(battle)) || (result && !fn.call(battle));
        }
        return result;
    }
}
class NOT extends ClauseFn {
    fnName = FUNCTION_STRS.NOT;
    fnType = FN_TYPES.CLAUSE_FN;
    constructor(...fns) {
        super(...fns);
        if (this.fns.length !== 1) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid NOT function call ; accepts exactly 1 argument ; got: [${this.fns}]`);
        }
    }
    call(battle) {
        return !this.fns[0].call(battle);
    }
}
class HeroListFn extends StandardFilter {
    fnType = FN_TYPES.HERO_LIST_FN;
    getHeroes(battle) {
        return this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS];
    }
    asString(prefix = "") {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}
class CRFn extends HeroListFn {
    fnName = FUNCTION_STRS.CR;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    crThreshold = 0;
    operator;
    targetField;
    isPlayer1 = false;
    argFmtString;
    constructor(str, REFS) {
        super();
        const splitChar = str.includes(",") ? "," : " ";
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, splitChar, 1, true);
        if (args.length !== 3) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid CR function call ; accepts exactly 3 arguments ; got: [${args}] from str: ${str}`);
        }
        const threshold = parseInt(args[2]);
        if (isNaN(threshold)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].TypeException(`Invalid CR function call ; third argument must be a valid integer literal ; got: '${args[2]}' from str: ${str}`);
        }
        const operator = (0,_operators__WEBPACK_IMPORTED_MODULE_3__.parseOperator)(args[1]);
        if (!(operator instanceof _operators__WEBPACK_IMPORTED_MODULE_3__.CompareOperator)) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].TypeException(`Invalid CR function call ; second argument must be a valid comparison operator ; got: '${args[1]}' from str: ${str}`);
        }
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.crThreshold = threshold;
        this.operator = operator;
        this.isPlayer1 = str.includes("p1.");
        this.targetField = (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR];
        this.argFmtString = `${this.heroName} ${this.operator.opStr} ${this.crThreshold}`;
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const crBar = this.targetField(battle);
        const heroCr = crBar.find((entry) => entry[0] === this.heroName);
        if (!heroCr) {
            return false;
        }
        else if (!heroes.includes(this.heroName)) {
            return false;
        }
        return this.operator.call(heroCr, this.crThreshold);
    }
}
/**
 * Returns true if all the equipment counts in target are matched or exceeded in the instance.
 * In other words, target is a subset of instance.
 * If a hero has additional equipment, the function will still return true
 * @param target the target object to check against
 * @param instance the object to check
 * @returns boolean indicating if all the equipment counts in target are present in instance
 */
function validateEquipmentCounts(target, instance) {
    for (const key in target) {
        if (target[key] > (instance[key] || 0)) {
            return false;
        }
    }
    return true;
}
// TODO: consolidate code with ArtifactFn where possible to reduce duplication
class EquipmentFn extends HeroListFn {
    fnName = FUNCTION_STRS.EQUIPMENT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    targetEquipCounts;
    isPlayer1 = false;
    argFmtString;
    targetField;
    constructor(str, REFS) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid equipment function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`);
        }
        const equipmentSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let equipmentList = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(equipmentSetStr, ",", 1, true);
        equipmentList = equipmentList.map((equip) => new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(equip, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Equipment]).data);
        this.targetEquipCounts = (0,_str_functions__WEBPACK_IMPORTED_MODULE_0__.strArrToCountMap)(equipmentList);
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${equipmentList.join(",")}}`;
        this.targetField = (battle) => this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_EQUIPMENT] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_EQUIPMENT];
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const heroEq = this.targetField(battle);
        for (let i = 0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                const counts = (0,_str_functions__WEBPACK_IMPORTED_MODULE_0__.strArrToCountMap)(heroEq[i]);
                return validateEquipmentCounts(this.targetEquipCounts, counts);
            }
        }
        return false;
    }
}
class ArtifactFn extends HeroListFn {
    fnName = FUNCTION_STRS.ARTIFACT;
    fnType = FN_TYPES.HERO_LIST_FN;
    heroName;
    targetArtifacts;
    isPlayer1 = false;
    argFmtString;
    targetField;
    constructor(str, REFS) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 2) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid artifact function call ; accepts exactly 2 arguments ; got: [${args}] from str: ${str}`);
        }
        const artifactSetStr = args[1].includes("{") ? args[1] : `{${args[1]}}`;
        let artifactList = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(artifactSetStr, ",", 1, true);
        artifactList = artifactList.map((artifact) => new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(artifact, REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Artifact]).data);
        this.targetArtifacts = artifactList;
        this.heroName = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.StringLiteral(args[0], REFS, [_string_literal_parse__WEBPACK_IMPORTED_MODULE_6__.STRING_LITERAL_PARSERS.Hero]).data;
        this.isPlayer1 = str.includes("p1.");
        this.argFmtString = `${this.heroName}, {${artifactList.join(", ")}}`;
        this.targetField = (battle) => this.isPlayer1 ? battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_ARTIFACTS] : battle[_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_ARTIFACTS];
    }
    call(battle) {
        const heroes = this.getHeroes(battle);
        const heroArtifacts = this.targetField(battle);
        for (let i = 0; i < heroes.length; i++) {
            if (heroes[i] === this.heroName) {
                return this.targetArtifacts.some((artifact) => heroArtifacts[i].includes(artifact));
            }
        }
        return false;
    }
}
class GlobalFilter extends Fn {
    fnType = FN_TYPES.GLOBAL_FN;
    asString(prefix = "") {
        return `${prefix}${this.fnName}(${this.argFmtString})`;
    }
}
class LastNFn extends GlobalFilter {
    fnName = FUNCTION_STRS.LAST_N;
    fnType = FN_TYPES.GLOBAL_FN;
    argFmtString;
    n;
    constructor(str) {
        super();
        const args = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        if (args.length !== 1) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid last-n function call ; accepts exactly 1 argument ; got: [${args}] from str: ${str}`);
        }
        this.n = new _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.IntLiteral(args[0]).data;
        this.argFmtString = `${this.n}`;
    }
    call(battles) {
        return battles.slice(-this.n);
    }
}
function isCollection(baseElt) {
    return _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.COLLECTION_FIELDS_SET.has(baseElt.rawString);
}
function validateBaseFilterTypes(left, op, right) {
    const str = `${left.asString()} ${op.opStr} ${right.asString()}`;
    if (left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field && right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; fields cannot be compared with other fields ; got string: [${str}]`);
    }
    else if (!(left.type === _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.BaseEltTypes.FIELD) && !(right.type === _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.BaseEltTypes.FIELD)) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; every base filter must have at least one field ; got string: [${str}]`);
    }
    else if (op instanceof _operators__WEBPACK_IMPORTED_MODULE_3__.InOperator && !(isCollection(right) || right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.RangeLiteral || right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.SetLiteral)) {
        throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError(`Invalid base filter; 'in' operators can only be used with Ranges, Sets, or Fields that correspond to sets like 'p1.picks' ; got string: [${str}]`);
    }
    return true;
}
class BaseFilter extends StandardFilter {
    fnType = FN_TYPES.BASE_FILTER;
    fnName = FUNCTION_STRS.BASE_FILTER;
    fmtString;
    fn;
    constructor(str, REFS) {
        super();
        const tokens = _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].tokenizeWithNestedEnclosures(str, " ", 0, true);
        if (tokens.length !== 3) {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid base filter; filters must have 3 tokens and be of the form: ['X', operator, 'Y']; got: [${tokens}] tokens from str: ${str}`);
        }
        let [leftStr, opStr, rightStr] = tokens;
        console.log(`PARSING BASE FILTER: Left: ${leftStr}, Op: ${opStr}, Right: ${rightStr}`);
        const operator = (0,_operators__WEBPACK_IMPORTED_MODULE_3__.parseOperator)(opStr);
        const left = _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.parseBaseElement(leftStr, REFS);
        const right = _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.parseBaseElement(rightStr, REFS);
        console.log(`PARSED BASE FILTER: Left: ${left.asString()}, Op: ${opStr}, Right: ${right.asString()}`);
        validateBaseFilterTypes(left, operator, right);
        if (left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field && !(right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field)) {
            this.fn = (battle) => operator.call(left.extractData(battle), right.getData());
        }
        else if (!(left instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) && right instanceof _base_elements__WEBPACK_IMPORTED_MODULE_2__.BaseElements.Field) {
            this.fn = (battle) => operator.call(left.getData(), right.extractData(battle));
        }
        else {
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].ValidationError("Invalid base filter; filters must contain a Field and a Literal; got: " + str);
        }
        this.fmtString = `${left.asString()} ${opStr} ${right.asString()}`;
    }
    call(b) {
        return this.fn(b);
    }
    asString(prefix = "") {
        return `${prefix}${this.fmtString}`;
    }
}
const FN_STR_MAP = {
    [FUNCTION_STRS.BASE_FILTER]: BaseFilter,
    [FUNCTION_STRS.AND]: AND,
    [FUNCTION_STRS.OR]: OR,
    [FUNCTION_STRS.NOT]: NOT,
    [FUNCTION_STRS.XOR]: XOR,
    [FUNCTION_STRS.LAST_N]: LastNFn,
    [FUNCTION_STRS.EQUIPMENT]: EquipmentFn,
    [FUNCTION_STRS.ARTIFACT]: ArtifactFn,
    [FUNCTION_STRS.CR]: CRFn,
};
const FNS = {
    AND: AND,
    OR: OR,
    NOT: NOT,
    XOR: XOR,
    LAST_N: LastNFn,
    EQUIPMENT: EquipmentFn,
    ARTIFACT: ArtifactFn,
    CR: CRFn,
    BASE_FILTER: BaseFilter,
};



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/operators.ts":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/operators.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COMPARISON_OPERATORS: () => (/* binding */ COMPARISON_OPERATORS),
/* harmony export */   CompareOperator: () => (/* binding */ CompareOperator),
/* harmony export */   InOperator: () => (/* binding */ InOperator),
/* harmony export */   Operator: () => (/* binding */ Operator),
/* harmony export */   parseOperator: () => (/* binding */ parseOperator)
/* harmony export */ });
const COMPARISON_OPERATORS = {
    ">": (a, b) => a > b,
    "<": (a, b) => a < b,
    "=": (a, b) => a === b,
    ">=": (a, b) => a >= b,
    "<=": (a, b) => a <= b,
    "!=": (a, b) => a !== b,
};
const OPERATOR_TYPES = {
    IN: "in",
    COMPARE: "compare",
};
class Operator {
}
class InOperator extends Operator {
    type = OPERATOR_TYPES.IN;
    opStr;
    negate = false;
    constructor(negate = false) {
        super();
        this.negate = negate;
        this.opStr = this.negate ? "!in" : "in";
    }
    call(a, b) {
        const contains = Array.isArray(b) ? b.includes(a) : b.has(a);
        return this.negate ? !contains : contains;
    }
}
class CompareOperator extends Operator {
    type = OPERATOR_TYPES.COMPARE;
    opStr;
    compareFn;
    constructor(opStr) {
        super();
        this.opStr = opStr;
        this.compareFn = COMPARISON_OPERATORS[opStr];
        if (!this.compareFn) {
            throw new Error(`Unknown operator: ${opStr}`);
        }
    }
    call(a, b) {
        return this.compareFn(a, b);
    }
}
function parseOperator(opStr) {
    switch (opStr) {
        case "in": return new InOperator();
        case "!in": return new InOperator(true);
        default: return new CompareOperator(opStr);
    }
}



/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/string-literal-parse.ts":
/*!********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/string-literal-parse.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   STRING_LITERAL_PARSERS: () => (/* binding */ STRING_LITERAL_PARSERS),
/* harmony export */   StringLiteralParser: () => (/* binding */ StringLiteralParser),
/* harmony export */   parseStringLiteral: () => (/* binding */ parseStringLiteral)
/* harmony export */ });
/* harmony import */ var _hero_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../hero-manager */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _filter_parse_references__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./filter-parse-references */ "./static/assets/js/e7/filter-parsing/filter-parse-references.ts");
/* harmony import */ var _regex__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../regex */ "./static/assets/js/e7/regex.ts");




class StringLiteralParser {
}
class HeroParser extends StringLiteralParser {
    parse(str, REFS) {
        return _hero_manager__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(str, REFS.HeroDicts)?.name ?? null;
    }
    parserType = "Hero";
}
class LeagueParser extends StringLiteralParser {
    parse(str) {
        console.log(`Parsing str: ${str} using map:`, _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR);
        return _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR[str];
    }
    parserType = "League";
}
class ServerParser extends StringLiteralParser {
    parse(str) {
        return _references__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_LOWERCASE_TO_CLEAN_STR[str];
    }
    parserType = "Server";
}
class EquipmentParser extends StringLiteralParser {
    parse(str) {
        return _filter_parse_references__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Equipment";
}
class ArtifactParser extends StringLiteralParser {
    parse(str, REFS) {
        return REFS.ARTIFACT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Artifact";
}
class SeasonCodeParser extends StringLiteralParser {
    parse(str, REFS) {
        console.log(`Parsing season code: ${str}`);
        let seasonNum;
        if (str === "current-season") {
            return REFS.SEASON_DETAILS[0].Code;
        }
        else if (str === "last-season") {
            return REFS.SEASON_DETAILS[1].Code;
        }
        else if (_regex__WEBPACK_IMPORTED_MODULE_3__.RegExps.SEASON_LITERAL_RE.test(str)) {
            console.log(`Parsing season literal: ${str}`);
            seasonNum = str.split("-").at(-1);
        }
        else if (_regex__WEBPACK_IMPORTED_MODULE_3__.RegExps.SEASON_CODE_LITERAL_RE.test(str)) {
            console.log(`Parsing season code literal: ${str}`);
            seasonNum = str.split("_ss").at(-1);
        }
        else {
            return null;
        }
        console.log(`Season num: ${seasonNum}`);
        const seasonNums = REFS.SEASON_DETAILS.map((season) => season.Code.split("_").at(-1));
        console.log(`Season nums: ${seasonNums}`);
        return REFS.SEASON_DETAILS.find((season) => season.Code.split("_ss").at(-1) === seasonNum)?.Code;
    }
    parserType = "Season Code";
}
function parseStringLiteral(str, REFS, parsers) {
    for (const parser of parsers) {
        const parsed = parser.parse(str, REFS);
        console.log(`Parsed string literal: ${str} with ${parser.parserType} as ${parsed}`);
        if (parsed)
            return parsed;
    }
    return null;
}
const STRING_LITERAL_PARSERS = {
    Hero: new HeroParser(),
    League: new LeagueParser(),
    Server: new ServerParser(),
    Equipment: new EquipmentParser(),
    Artifact: new ArtifactParser(),
    Season: new SeasonCodeParser(),
};


/***/ }),

/***/ "./static/assets/js/e7/hero-manager.ts":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/hero-manager.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/e7-API.ts */ "./static/assets/js/apis/e7-API.ts");




const FODDER_NAME = "~Fodder";
const EMPTY_NAME = "~Empty";
function getEmptyHero() {
    return {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "N/A",
        job_cd: "N/A",
        name: "N/A",
        prime: 1,
    };
}
function getEmptyHeroManager() {
    return {
        heroes: [],
        Empty: getEmptyHero(),
        Fodder: getEmptyHero(),
        name_lookup: {},
        code_lookup: {},
        prime_lookup: {},
        prime_pair_lookup: {},
    };
}
// This function adds two heroes to the Hero Manager to account for fodder champions and empty picks/prebans
function addNonHeroes(HeroDicts) {
    const next_index = HeroDicts.heroes.length;
    const Empty = {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "N/A",
        job_cd: "N/A",
        name: EMPTY_NAME,
        prime: 1,
    };
    const Fodder = {
        attribute_cd: "N/A",
        code: "N/A",
        grade: "2/3",
        job_cd: "N/A",
        name: FODDER_NAME,
        prime: _references_ts__WEBPACK_IMPORTED_MODULE_1__.PRIMES[next_index],
    };
    HeroDicts.heroes.push(Empty);
    HeroDicts.heroes.push(Fodder);
    HeroDicts.Fodder = Fodder;
    HeroDicts.Empty = Empty;
    return HeroDicts;
}
// add lookup dicts to the hero manager so that we can perform efficient lookups
function addDicts(HeroDicts) {
    console.log("Adding Lookup Dicts");
    console.log("\tAdding name lookup");
    HeroDicts.name_lookup = HeroDicts.heroes.reduce((acc, hero) => {
        acc[hero.name.toLowerCase().replace(/\s+/g, "")] = hero;
        return acc;
    }, {});
    console.log("\tAdding prime lookup");
    HeroDicts.prime_lookup = HeroDicts.heroes.reduce((acc, hero) => {
        acc[hero.prime] = hero;
        return acc;
    }, {});
    console.log("\tAdding code lookup");
    HeroDicts.code_lookup = HeroDicts.heroes.reduce((acc, hero) => {
        acc[hero.code] = hero;
        return acc;
    }, {});
    console.log("\tAdding prime pair lookup");
    let prime_pair_lookup = HeroDicts.heroes.reduce((acc, hero) => {
        acc[hero.prime] = hero.name;
        return acc;
    }, {});
    const numKeys = Object.keys(HeroDicts.prime_lookup).length - 1; // subtract 1 since we don't consider Empty hero
    console.log("\tAdding prime pair lookup; primes to process", numKeys);
    for (let i = 0; i < numKeys - 1; i++) {
        const prime = _references_ts__WEBPACK_IMPORTED_MODULE_1__.PRIMES[i];
        for (let j = i + 1; j < numKeys; j++) {
            const prime2 = _references_ts__WEBPACK_IMPORTED_MODULE_1__.PRIMES[j];
            const product = prime * prime2;
            const name1 = HeroDicts.prime_lookup[prime].name;
            const name2 = HeroDicts.prime_lookup[prime2].name;
            prime_pair_lookup[product] = [name1, name2].sort().join(", ");
        }
    }
    //capture case where two fodder heroes
    prime_pair_lookup[HeroDicts.Fodder.prime * HeroDicts.Fodder.prime] = [
        HeroDicts.Fodder.name,
        HeroDicts.Fodder.name,
    ].join(", ");
    //set prime pair lookup dict in HeroDicts and return
    HeroDicts.prime_pair_lookup = prime_pair_lookup;
    return HeroDicts;
}
let HeroManager = {
    getHeroDicts: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN) {
        const cachedHeroManager = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
        if (cachedHeroManager) {
            return cachedHeroManager;
        }
        return this.fetchAndCacheHeroManager(lang);
    },
    createHeroManager: function (rawHeroList) {
        // add prime identifier to each hero so that we can represent a set as a product of primes
        for (let [index, heroData] of rawHeroList.entries()) {
            const prime = _references_ts__WEBPACK_IMPORTED_MODULE_1__.PRIMES[index];
            heroData.prime = prime;
        }
        let HeroDicts = getEmptyHeroManager();
        HeroDicts.heroes = rawHeroList;
        HeroDicts = addNonHeroes(HeroDicts); //should not be called again
        HeroDicts = addDicts(HeroDicts); // Must come after addNonHeroes so that empty/fodder are added to the dicts
        return HeroDicts;
    },
    fetchHeroManager: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN) {
        const heroJSON = (await _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_3__["default"].fetchHeroJSON()) ?? (await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__["default"].fetchHeroData());
        const heroList = heroJSON[lang]; //get english hero list
        const HeroDicts = this.createHeroManager(heroList);
        console.log(`Created HeroManager of language ${lang} using raw data received from server`);
        return HeroDicts;
    },
    fetchAndCacheHeroManager: async function (lang = _references_ts__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN) {
        console.log("HeroManager not found in cache, fetching from server and caching it");
        const HeroDicts = await this.fetchHeroManager(lang);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER, HeroDicts);
        console.log("Cached HeroManager using raw data recieved from server");
        console.log(HeroDicts);
        return HeroDicts;
    },
    deleteHeroManager: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
        console.log("Removed hero manager from cache");
    },
    getHeroByName: function (name, HeroDicts) {
        if (!HeroDicts) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        else if (!name) {
            return HeroDicts.Empty;
        }
        const normalizedName = name.toLowerCase().replace(/\s+/g, "");
        return HeroDicts.name_lookup[normalizedName] ?? null;
    },
    getHeroByPrime: function (prime, HeroDicts) {
        if (!HeroDicts) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        return HeroDicts.prime_lookup[prime];
    },
    getHeroByCode: function (code, HeroDicts) {
        if (!HeroDicts) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        else if (!code) {
            return HeroDicts.Empty;
        }
        return HeroDicts.code_lookup[code] ?? null;
    },
    getPairNamesByProduct: function (product, HeroDicts) {
        if (!HeroDicts) {
            throw new Error("HeroManager instance must be passed to lookup functions");
        }
        return HeroDicts.prime_pair_lookup[product];
    },
    EMPTY_NAME: EMPTY_NAME,
    FODDER_NAME: FODDER_NAME,
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HeroManager);


/***/ }),

/***/ "./static/assets/js/e7/references.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/e7/references.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ARRAY_COLUMNS: () => (/* binding */ ARRAY_COLUMNS),
/* harmony export */   BOOLS_COLS: () => (/* binding */ BOOLS_COLS),
/* harmony export */   CLEAN_STR_TO_WORLD_CODE: () => (/* binding */ CLEAN_STR_TO_WORLD_CODE),
/* harmony export */   COLUMNS_MAP: () => (/* binding */ COLUMNS_MAP),
/* harmony export */   CSVHeaders: () => (/* binding */ CSVHeaders),
/* harmony export */   E7_GG_HOME_URL: () => (/* binding */ E7_GG_HOME_URL),
/* harmony export */   E7_STOVE_HOME_URL: () => (/* binding */ E7_STOVE_HOME_URL),
/* harmony export */   EQUIPMENT_SET_MAP: () => (/* binding */ EQUIPMENT_SET_MAP),
/* harmony export */   HERO_STATS_COLUMN_MAP: () => (/* binding */ HERO_STATS_COLUMN_MAP),
/* harmony export */   INT_COLUMNS: () => (/* binding */ INT_COLUMNS),
/* harmony export */   LANGUAGES: () => (/* binding */ LANGUAGES),
/* harmony export */   LEAGUE_MAP: () => (/* binding */ LEAGUE_MAP),
/* harmony export */   LEAGUE_TO_CLEAN_STR: () => (/* binding */ LEAGUE_TO_CLEAN_STR),
/* harmony export */   ONE_DAY: () => (/* binding */ ONE_DAY),
/* harmony export */   PRIMES: () => (/* binding */ PRIMES),
/* harmony export */   TITLE_CASE_COLUMNS: () => (/* binding */ TITLE_CASE_COLUMNS),
/* harmony export */   WORLD_CODES: () => (/* binding */ WORLD_CODES),
/* harmony export */   WORLD_CODE_ENUM: () => (/* binding */ WORLD_CODE_ENUM),
/* harmony export */   WORLD_CODE_LOWERCASE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_LOWERCASE_TO_CLEAN_STR),
/* harmony export */   WORLD_CODE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_TO_CLEAN_STR)
/* harmony export */ });
/* harmony import */ var _str_functions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../str-functions */ "./static/assets/js/str-functions.ts");

const LANGUAGES = {
    CODES: {
        DE: "de",
        KO: "ko",
        PT: "pt",
        TH: "th",
        ZH_TW: "zh-TW",
        JA: "ja",
        EN: "en",
        FR: "fr",
        ZH_CN: "zh-CN",
        ES: "es",
    },
    NAMES: {
        DE: "German",
        KO: "Korean",
        PT: "Portuguese",
        TH: "Thai",
        ZH_TW: "Chinese (Traditional, Taiwan)",
        JA: "Japanese",
        EN: "English",
        FR: "French",
        ZH_CN: "Chinese (Simplified, China)",
        ES: "Spanish",
    }
};
const WORLD_CODES = new Set([
    "world_kor",
    "world_global",
    "world_jpn",
    "world_asia",
    "world_eu",
]);
const WORLD_CODE_ENUM = {
    GLOBAL: "world_global",
    KOR: "world_kor",
    JPN: "world_jpn",
    ASIA: "world_asia",
    EU: "world_eu",
};
const WORLD_CODE_TO_CLEAN_STR = {
    [WORLD_CODE_ENUM.GLOBAL]: "Global",
    [WORLD_CODE_ENUM.KOR]: "Korea",
    [WORLD_CODE_ENUM.JPN]: "Japan",
    [WORLD_CODE_ENUM.ASIA]: "Asia",
    [WORLD_CODE_ENUM.EU]: "Europe",
};
const CLEAN_STR_TO_WORLD_CODE = {
    [WORLD_CODE_TO_CLEAN_STR.world_global]: WORLD_CODE_ENUM.GLOBAL,
    [WORLD_CODE_TO_CLEAN_STR.world_kor]: WORLD_CODE_ENUM.KOR,
    [WORLD_CODE_TO_CLEAN_STR.world_jpn]: WORLD_CODE_ENUM.JPN,
    [WORLD_CODE_TO_CLEAN_STR.world_asia]: WORLD_CODE_ENUM.ASIA,
    [WORLD_CODE_TO_CLEAN_STR.world_eu]: WORLD_CODE_ENUM.EU,
};
const WORLD_CODE_LOWERCASE_TO_CLEAN_STR = Object.fromEntries(Object.values(WORLD_CODE_TO_CLEAN_STR).map((v) => [v.toLowerCase(), v]));
const EQUIPMENT_SET_MAP = {
    set_speed: "Speed",
    set_acc: "Hit",
    set_cri: "Critical",
    set_res: "Resist",
    set_def: "Defense",
    set_att: "Attack",
    set_max_hp: "Health",
    set_cri_dmg: "Destruction",
    set_coop: "Unity",
    set_immune: "Immunity",
    set_rage: "Rage",
    set_vampire: "Lifesteal",
    set_shield: "Protection",
    set_revenge: "Revenge",
    set_penetrate: "Penetration",
    set_torrent: "Torrent",
    set_counter: "Counter",
    set_scar: "Injury",
};
const ONE_DAY = 1000 * 60 * 60 * 24;
const LEAGUE_MAP = {
    bronze: 0,
    silver: 1,
    gold: 2,
    master: 3,
    challenger: 4,
    champion: 5,
    warlord: 6,
    emperor: 7,
    legend: 8,
};
const LEAGUE_TO_CLEAN_STR = Object.fromEntries(Object.keys(LEAGUE_MAP).sort((a, b) => LEAGUE_MAP[a] - LEAGUE_MAP[b]).map((k) => [k, (0,_str_functions__WEBPACK_IMPORTED_MODULE_0__.toTitleCase)(k)]));
const COLUMNS_MAP = {
    SEASON: "Season",
    SEASON_CODE: "Season Code",
    DATE_TIME: "Date/Time",
    SECONDS: "Seconds",
    TURNS: "Turns",
    SEQ_NUM: "Seq Num",
    P1_ID: "P1 ID",
    P1_SERVER: "P1 Server",
    P2_ID: "P2 ID",
    P2_SERVER: "P2 Server",
    P1_LEAGUE: "P1 League",
    P2_LEAGUE: "P2 League",
    P1_POINTS: "P1 Points",
    POINT_GAIN: "Point Gain",
    WIN: "Win",
    FIRST_PICK: "First Pick",
    FIRST_TURN: "First Turn",
    FIRST_TURN_HERO: "First Turn Hero",
    CR_BAR: "CR Bar",
    P1_PREBANS: "P1 Prebans",
    P2_PREBANS: "P2 Prebans",
    P1_PICKS: "P1 Picks",
    P2_PICKS: "P2 Picks",
    P1_POSTBAN: "P1 Postban",
    P2_POSTBAN: "P2 Postban",
    P1_EQUIPMENT: "P1 Equipment",
    P2_EQUIPMENT: "P2 Equipment",
    P1_ARTIFACTS: "P1 Artifacts",
    P2_ARTIFACTS: "P2 Artifacts",
    P1_MVP: "P1 MVP",
    P2_MVP: "P2 MVP",
    P1_PICKS_PRIMES: "P1 Picks Primes",
    P1_PICKS_PRIME_PRODUCT: "P1 Picks Prime Product",
    P2_PICKS_PRIMES: "P2 Picks Primes",
    P2_PICKS_PRIME_PRODUCT: "P2 Picks Prime Product",
    P1_PREBANS_PRIMES: "P1 Prebans Primes",
    P1_PREBANS_PRIME_PRODUCT: "P1 Prebans Prime Product",
    P2_PREBANS_PRIMES: "P2 Prebans Primes",
    P2_PREBANS_PRIME_PRODUCT: "P2 Prebans Prime Product",
};
const CSVHeaders = Object.values(COLUMNS_MAP).filter(h => !h.toLowerCase().includes("prime"));
const ARRAY_COLUMNS = [
    COLUMNS_MAP.P1_EQUIPMENT,
    COLUMNS_MAP.P2_EQUIPMENT,
    COLUMNS_MAP.P1_ARTIFACTS,
    COLUMNS_MAP.P2_ARTIFACTS,
    COLUMNS_MAP.CR_BAR,
    COLUMNS_MAP.P1_PREBANS,
    COLUMNS_MAP.P2_PREBANS,
    COLUMNS_MAP.P1_PICKS,
    COLUMNS_MAP.P2_PICKS,
];
const BOOLS_COLS = [
    COLUMNS_MAP.FIRST_PICK,
    COLUMNS_MAP.FIRST_TURN,
    COLUMNS_MAP.WIN,
];
const INT_COLUMNS = [
    COLUMNS_MAP.SECONDS,
    COLUMNS_MAP.TURNS,
    COLUMNS_MAP.P1_POINTS,
    COLUMNS_MAP.POINT_GAIN,
];
const TITLE_CASE_COLUMNS = [
    COLUMNS_MAP.P1_LEAGUE,
    COLUMNS_MAP.P2_LEAGUE,
];
const HERO_STATS_COLUMN_MAP = {
    HERO_NAME: "Hero Name",
    BATTLES: "Battles",
    PICK_RATE: "Pick Rate",
    WINS: "Wins",
    WIN_RATE: "Win rate",
    POSTBANS: "Postbans",
    POSTBAN_RATE: "Postban Rate",
    SUCCESS_RATE: "Success Rate", // success rate indicates a win or a postban
    PLUS_MINUS: "+/-",
    POINT_GAIN: "Point Gain",
    AVG_CR: "Avg CR",
    FIRST_TURNS: "First Turns",
    FIRST_TURN_RATE: "First Turn Rate",
};
const E7_STOVE_HOME_URL = "https://epic7.onstove.com";
const E7_GG_HOME_URL = E7_STOVE_HOME_URL + "/gg";
/**
 * Generates a list of all prime numbers up to and including the given limit.
 *
 * Uses the Sieve of Eratosthenes algorithm to generate the list.
 *
 * Primes are used to represent as prime identifier allowing us to represent a set as a product of primes
 *
 * @param {number} limit - The upper limit of the prime numbers to generate. Must be a positive integer.
 * @returns {number[]} - A list of all prime numbers up to and including the given limit.
 */
function getPrimes(limit) {
    const sieve = new Uint8Array(limit + 1);
    const primes = [];
    for (let i = 2; i <= limit; i++) {
        if (!sieve[i]) {
            primes.push(i);
            for (let j = i * i; j <= limit; j += i) {
                sieve[j] = 1;
            }
        }
    }
    return primes;
}
const PRIMES = getPrimes(30000);


/***/ }),

/***/ "./static/assets/js/e7/regex.ts":
/*!**************************************!*\
  !*** ./static/assets/js/e7/regex.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RegExps: () => (/* binding */ RegExps)
/* harmony export */ });
/* harmony import */ var _filter_parsing_field_extract_map__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter-parsing/field-extract-map */ "./static/assets/js/e7/filter-parsing/field-extract-map.ts");

/**
 * Returns a new RegExp object that matches if the input pattern matches the beginning of a string
 * and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 *
 * Used for syntax highlighting in CodeMirror
 *
 * @param {RegExp} pattern - Pattern to pad with the above requirements.
 * @param {string} [flags="i"] - Flags to use in the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if the input pattern matches the beginning of a string
 *                   and is followed by either a comma, closing parenthesis, whitespace, or the end of the string.
 */
function padRegex(pattern, flags = "i") {
    return new RegExp(`^(?:${pattern.source})(?=[,)\\s;]|$)`, flags);
}
function anchorExp(pattern, flags = "i") {
    return new RegExp(`^(?:${pattern.source})$`, flags);
}
/**
 * Combines multiple regex patterns into a single regex that matches any of the given patterns.
 *
 * @param {RegExp[]} patterns - An array of regular expression objects to combine.
 * @param {string} [flags="i"] - The flags for the resulting RegExp object. Defaults to case-insensitive matching.
 * @returns {RegExp} A new RegExp object that matches if any of the supplied patterns match.
 * @throws {Error} If no patterns are provided.
 */
function orRegex(patterns, flags = "i") {
    if (patterns.length < 1)
        throw new Error("orRegex must have at least one pattern");
    let regExStr = `(?:${patterns[0].source})`;
    for (let i = 1; i < patterns.length; i++) {
        regExStr += `|(?:${patterns[i].source})`;
    }
    return new RegExp(regExStr, flags);
}
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FIELD_WORDS = Object.keys(_filter_parsing_field_extract_map__WEBPACK_IMPORTED_MODULE_0__.FIELD_EXTRACT_FN_MAP);
const FIELD_WORD_RE = new RegExp(`^(?:${FIELD_WORDS.map(escapeRegex).join("|")})`, "i");
const CLAUSE_FUNCTIONS = ["and", "or", "xor", "not"];
const GLOBAL_FUNCTIONS = ["last-n"];
const DIRECT_FUNCTIONS = [
    "p1.equipment",
    "p2.equipment",
    "p1.artifact",
    "p2.artifact",
    "p1.cr",
    "p2.cr",
];
const CLAUSE_FUNCTIONS_RE = new RegExp(`(?:${CLAUSE_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const GLOBAL_FUNCTIONS_RE = new RegExp(`(?:${GLOBAL_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const DIRECT_FUNCTIONS_RE = new RegExp(`(?:${DIRECT_FUNCTIONS.map(escapeRegex).join("|")})(?=\\()`, "i");
const FUNCTIONS_RE = orRegex([
    CLAUSE_FUNCTIONS_RE,
    GLOBAL_FUNCTIONS_RE,
    DIRECT_FUNCTIONS_RE,
]);
const STRING_RE = /.*/i; // matches any string
const DATE_RE = /\d{4}-\d{2}-\d{2}/;
const EMPTY_SET_RE = /\{\s*\}/;
const INT_RE = /-?\d+/;
const SEASON_RE = /season-[1-9]+[0-9]*f?|current-season|last-season/i;
const SEASON_CODE_RE = /pvp_rta_ss[1-9]+[0-9]*f?/i;
const GLOBAL_FILTER_RE = /last-n\(\d+\)/i;
const DATE_LITERAL_RE = new RegExp(`^${DATE_RE.source}$`, "i");
const INT_LITERAL_RE = /^-?\d+$/;
const BOOL_LITERAL_RE = /^(true|false)$/i;
const DATA_WORD_RE = new RegExp(`(?:${SEASON_RE.source})`, "i");
//consts without RE are used for injecting into regex patterns
const STR = STRING_RE.source;
const INT = INT_RE.source;
const DATE = DATE_RE.source;
const FIELD_WORD = FIELD_WORD_RE.source;
const DATA_WORD = DATA_WORD_RE.source;
const QUOTED_STRING_RE = new RegExp(`(["'])(${STR})\\1`, "i");
const STRING_LITERAL_RE = anchorExp(QUOTED_STRING_RE);
const QUOTED_STR = QUOTED_STRING_RE.source;
const SET_ELEMENT_RE = new RegExp(`(?:${QUOTED_STR}|${STR}|${DATE})`, "i");
const DATAFIELD_RE = new RegExp(`(?:${FIELD_WORD}|${DATA_WORD})`, "i");
const SETELT = SET_ELEMENT_RE.source;
const SET_RE = new RegExp(`\\{\\s*(?:${SETELT}\\s*)(?:,\\s*${SETELT}\\s*)*,?\\s*\\}|${EMPTY_SET_RE.source}`, "i");
const RANGE_RE = new RegExp(`${INT}\\.\\.\\.=?${INT}|${DATE}\\.\\.\\.=?${DATE}`);
const RANGE_LITERAL_RE = new RegExp(`^${RANGE_RE.source}$`);
const FUNCTION_CALL_RE = /\(.*\)/i;
// used by CodeMirror for syntax highlighting
function tokenMatch(stream) {
    if (stream.match(FUNCTIONS_RE)) {
        console.log("Matched stream as clause:", stream);
        return "keyword";
    }
    if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
        console.log("Matched stream as operator:", stream);
        return "operator";
    }
    if (stream.match(new RegExp(`[a-z0-9."'}=)-]${DATAFIELD_RE.source}(?=[,)\\s;]|$)`, "i"))) {
        console.log("Matched stream as field with preceding fragment:", stream);
        return null;
    }
    if (stream.match(padRegex(FIELD_WORD_RE))) {
        console.log("Matched stream as Data Field:", stream);
        return "field";
    }
    if (stream.match(padRegex(DATA_WORD_RE))) {
        console.log("Matched stream as Data Field:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(QUOTED_STRING_RE))) {
        console.log("Matched stream as string:", stream);
        return "string";
    }
    if (stream.match(padRegex(SET_RE))) {
        console.log("Matched stream as set:", stream);
        return "set";
    }
    if (stream.match(padRegex(RANGE_RE))) {
        console.log("Matched stream as range:", stream);
        return "range";
    }
    if (stream.match(/[^(,\s;.=0-9\-]+\d+/i)) {
        console.log("Matched stream as non-num null", stream);
        return null;
    }
    if (stream.match(padRegex(INT_RE))) {
        console.log("Matched stream as number:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(DATE_RE))) {
        console.log("Matched stream as date:", stream);
        return "declared-data";
    }
    if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
        console.log("Matched stream as bool:", stream);
        return "declared-data";
    }
    if (stream.match(/[\(\)\{\}\;\,]/)) {
        console.log("Matched stream as bracket:", stream);
        return "bracket";
    }
    stream.next();
    console.log("Matched stream as null:", stream);
    return null;
}
let RegExps = {
    STRING_RE: STRING_RE,
    DATE_RE: DATE_RE,
    INT_RE: INT_RE,
    EMPTY_SET_RE: EMPTY_SET_RE,
    SET_ELEMENT_RE: SET_ELEMENT_RE,
    SET_RE: SET_RE,
    SET_LITERAL_RE: anchorExp(SET_RE),
    STRING_LITERAL_RE: STRING_LITERAL_RE,
    DATE_LITERAL_RE: DATE_LITERAL_RE,
    INT_LITERAL_RE: INT_LITERAL_RE,
    BOOL_LITERAL_RE: BOOL_LITERAL_RE,
    RANGE_RE: RANGE_RE,
    RANGE_LITERAL_RE: RANGE_LITERAL_RE,
    SEASON_RE: SEASON_RE,
    SEASON_LITERAL_RE: anchorExp(SEASON_RE),
    SEASON_CODE_RE: SEASON_CODE_RE,
    SEASON_CODE_LITERAL_RE: anchorExp(SEASON_CODE_RE),
    DATA_WORD_RE: DATA_WORD_RE,
    DATA_WORD_LITERAL_RE: anchorExp(DATA_WORD_RE),
    FIELD_WORD_RE: FIELD_WORD_RE,
    FIELD_WORD_LITERAL_RE: anchorExp(FIELD_WORD_RE),
    DATAFIELD_RE: DATAFIELD_RE,
    GLOBAL_FILTER_RE: GLOBAL_FILTER_RE,
    ANCHORED_STR_LITERAL_RE: anchorExp(STRING_LITERAL_RE),
    CLAUSE_FUNCTIONS_RE: CLAUSE_FUNCTIONS_RE,
    DIRECT_FUNCTIONS_RE: DIRECT_FUNCTIONS_RE,
    GLOBAL_FUNCTIONS_RE: GLOBAL_FUNCTIONS_RE,
    FUNCTIONS_RE: FUNCTIONS_RE,
    FUNCTION_CALL_RE: FUNCTION_CALL_RE,
    padRegex: padRegex,
    anchorExp: anchorExp,
    tokenMatch: tokenMatch,
    orRegex: orRegex,
    escapeRegex: escapeRegex,
};



/***/ }),

/***/ "./static/assets/js/e7/season-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/season-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

var SeasonManager = {
  fetchAndCacheSeasonDetails: function () {
    var _fetchAndCacheSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var result, seasonDetails, preSeasonFilled, lastSeason, start, seasonNumStr, preSeason;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].fetchSeasonDetails();
          case 1:
            result = _context.v;
            if (!result.error) {
              _context.n = 2;
              break;
            }
            throw new Error("Could not fetch season details: ".concat(result.error));
          case 2:
            seasonDetails = result.seasonDetails;
            seasonDetails.forEach(function (season) {
              season.range = [season["Start"], season["End"]].map(function (d) {
                return new Date("".concat(d.split(" ")[0], "T00:00:00"));
              });
              season["Season Number"] = String(season["Season Number"]);
            });
            seasonDetails.sort(function (a, b) {
              return parseInt(a["Season Number"]) - parseInt(b["Season Number"]);
            });

            // add pre seasons
            preSeasonFilled = [seasonDetails[0]];
            lastSeason = seasonDetails[0];
            seasonDetails.slice(1).forEach(function (season) {
              var start = new Date(+lastSeason.range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY),
                end = new Date(+season.range[0] - _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              var seasonNumStr = lastSeason["Season Number"] + "f";
              var preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: "Pre ".concat(season["Season"]),
                Start: start.toISOString().slice(0, 10),
                End: end.toISOString().slice(0, 10),
                Status: "Complete",
                range: [start, end]
              };
              preSeasonFilled.push(preSeason);
              preSeasonFilled.push(season);
              lastSeason = season;
            });

            // add another pre season if current season is complete
            if (lastSeason.range[1] < new Date()) {
              start = new Date(+preSeasonFilled.at(-1).range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              seasonNumStr = lastSeason["Season Number"] + "f";
              preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: "Active Pre-Season",
                Start: start.toISOString().slice(0, 10),
                End: "N/A",
                Status: "Active",
                range: [start, new Date()]
              };
              preSeasonFilled.push(preSeason);
            }
            preSeasonFilled.reverse();
            _context.n = 3;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS, preSeasonFilled);
          case 3:
            return _context.a(2, preSeasonFilled);
        }
      }, _callee);
    }));
    function fetchAndCacheSeasonDetails() {
      return _fetchAndCacheSeasonDetails.apply(this, arguments);
    }
    return fetchAndCacheSeasonDetails;
  }(),
  getSeasonDetails: function () {
    var _getSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var cached, _t;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
          case 1:
            cached = _context2.v;
            if (!(cached !== null && cached !== void 0)) {
              _context2.n = 2;
              break;
            }
            _t = cached;
            _context2.n = 4;
            break;
          case 2:
            _context2.n = 3;
            return SeasonManager.fetchAndCacheSeasonDetails();
          case 3:
            _t = _context2.v;
          case 4:
            return _context2.a(2, _t);
        }
      }, _callee2);
    }));
    function getSeasonDetails() {
      return _getSeasonDetails.apply(this, arguments);
    }
    return getSeasonDetails;
  }(),
  clearSeasonDetails: function () {
    var _clearSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
          case 1:
            console.log("Season details cleared from data cache");
          case 2:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function clearSeasonDetails() {
      return _clearSeasonDetails.apply(this, arguments);
    }
    return clearSeasonDetails;
  }(),
  getSeasonNumFromCode: function getSeasonNumFromCode(seasonCode) {
    return seasonCode.split("_")[-1];
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SeasonManager);

/***/ }),

/***/ "./static/assets/js/e7/stats-builder.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/stats-builder.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


var getWins = function getWins(battleList) {
  return battleList.filter(function (b) {
    return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
  });
};
var getFirstPickSubset = function getFirstPickSubset(battleList) {
  return battleList.filter(function (b) {
    return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var getSecondPickSubset = function getSecondPickSubset(battleList) {
  return battleList.filter(function (b) {
    return !b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var isIncomplete = function isIncomplete(b) {
  return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.TURNS] === 0;
};
function toPercent(value) {
  return (value * 100).toFixed(2) + "%";
}
function divideToPercentString(a, b) {
  return b !== 0 ? toPercent(a / b) : toPercent(0);
}
function getCR(battle, heroName) {
  var entry = battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR].find(function (entry) {
    return entry[0] === heroName;
  });
  return entry ? entry[1] : null;
}
function queryStats(battleList, totalBattles, heroName) {
  var _ref;
  var gamesWon = getWins(battleList).length;
  var gamesAppeared = battleList.length;
  var appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
  var winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;
  var postBanned = battleList.reduce(function (acc, b) {
    return acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName);
  }, 0);
  var successes = battleList.reduce(function (acc, b) {
    return acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN] || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName);
  }, 0);
  var pointGain = battleList.reduce(function (acc, b) {
    return acc + b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.POINT_GAIN];
  }, 0);
  var gamesConsidered = 0;
  var crTotal = 0;
  var firstTurns = 0;
  var _iterator = _createForOfIteratorHelper(battleList),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var battle = _step.value;
      var cr = getCR(battle, heroName);
      if (cr !== null && cr !== 0) {
        gamesConsidered += 1;
        crTotal += cr;
        if (cr === 100) {
          firstTurns += 1;
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var avgCR = divideToPercentString(crTotal / 100, gamesConsidered);
  return _ref = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_ref, _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME, heroName), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.BATTLES, gamesAppeared), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PICK_RATE, toPercent(appearanceRate)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WINS, gamesWon), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WIN_RATE, toPercent(winRate)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBANS, postBanned), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE, divideToPercentString(postBanned, gamesAppeared)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE, divideToPercentString(successes, gamesAppeared)), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PLUS_MINUS, 2 * gamesWon - gamesAppeared), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POINT_GAIN, pointGain), _defineProperty(_defineProperty(_defineProperty(_ref, _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.AVG_CR, avgCR), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURNS, firstTurns), _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE, divideToPercentString(firstTurns, gamesConsidered));
}
function getPrimes(battleList) {
  var isP1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var primeSet = new Set();
  for (var _i = 0, _Object$values = Object.values(battleList); _i < _Object$values.length; _i++) {
    var battle = _Object$values[_i];
    var picks = isP1 ? battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES] : battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIMES];
    picks.forEach(function (element) {
      primeSet.add(element);
    });
  }
  return primeSet;
}
function getHeroStats(battleList, HeroDicts) {
  if (battleList.length === 0) {
    return {
      playerHeroStats: [],
      enemyHeroStats: []
    };
  }
  var totalBattles = battleList.length;
  var playerPrimes = getPrimes(battleList, true);
  var enemyPrimes = getPrimes(battleList, false);
  var playerHeroStats = [];
  var enemyHeroStats = [];
  var _iterator2 = _createForOfIteratorHelper(playerPrimes),
    _step2;
  try {
    var _loop = function _loop() {
      var prime = _step2.value;
      var hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts);
      var playerSubset = battleList.filter(function (b) {
        return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (playerSubset.length > 0) {
        playerHeroStats.push(queryStats(playerSubset, totalBattles, hero.name));
      }
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  var _iterator3 = _createForOfIteratorHelper(enemyPrimes),
    _step3;
  try {
    var _loop2 = function _loop2() {
      var prime = _step3.value;
      var hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts);
      var enemySubset = battleList.filter(function (b) {
        return b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (enemySubset.length > 0) {
        enemyHeroStats.push(queryStats(enemySubset, totalBattles, hero.name));
      }
    };
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      _loop2();
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var nameCol = _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME;
  return {
    playerHeroStats: playerHeroStats.sort(function (b1, b2) {
      return b1[nameCol].localeCompare(b2[nameCol]);
    }),
    enemyHeroStats: enemyHeroStats.sort(function (b1, b2) {
      return b1[nameCol].localeCompare(b2[nameCol]);
    })
  };
}
function getFirstPickStats(battleList, HeroDicts) {
  battleList = getFirstPickSubset(Object.values(battleList));
  if (battleList.length === 0) {
    return [];
  }
  var totalBattles = battleList.length;
  var grouped = {};
  var _iterator4 = _createForOfIteratorHelper(battleList),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var b = _step4.value;
      if (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES].length === 0) continue; // skip any battle where player didn't get to pick a first unit
      var hero = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES][0];
      if (!(hero in grouped)) grouped[hero] = {
        wins: 0,
        appearances: 0
      };
      grouped[hero].wins += b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
      grouped[hero].appearances += 1;
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var result = Object.entries(grouped).map(function (_ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
      prime = _ref3[0],
      stats = _ref3[1];
    var name = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts).name;
    return {
      hero: name,
      wins: stats.wins,
      appearances: stats.appearances,
      win_rate: toPercent(stats.wins / stats.appearances),
      appearance_rate: toPercent(stats.appearances / totalBattles),
      "+/-": 2 * stats.wins - stats.appearances
    };
  });
  result.sort(function (a, b) {
    return b.appearances - a.appearances;
  });
  return result;
}
function getPrebanStats(battleList, HeroDicts) {
  //console.log(`Got HeroDicts: ${HeroDicts}`);

  var emptyPrime = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].EMPTY_NAME, HeroDicts).prime;
  if (battleList.length === 0) {
    return [];
  }
  var getValidPrimes = function getValidPrimes(col, index) {
    return _toConsumableArray(new Set(battleList.map(function (b) {
      return b[col][index];
    }).filter(function (p) {
      return p && p !== emptyPrime;
    })));
  };
  var preban1Set = getValidPrimes(_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 0);
  var preban2Set = getValidPrimes(_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 1);
  var prebanSet = new Set([].concat(_toConsumableArray(preban1Set), _toConsumableArray(preban2Set)));
  var prebans = [];
  var _iterator5 = _createForOfIteratorHelper(prebanSet),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var prime = _step5.value;
      prebans.push(prime);
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  var _iterator6 = _createForOfIteratorHelper(prebanSet),
    _step6;
  try {
    for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
      var a = _step6.value;
      var _iterator7 = _createForOfIteratorHelper(prebanSet),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var b = _step7.value;
          if (a < b) prebans.push(a * b);
        }
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
    }
  } catch (err) {
    _iterator6.e(err);
  } finally {
    _iterator6.f();
  }
  console.log("Prebans:", prebans);
  var totalBattles = battleList.length;
  var output = [];
  var _loop3 = function _loop3() {
    var preban = _prebans[_i2];
    var filtered = battleList.filter(function (b) {
      return b["P1 Prebans Prime Product"] % preban === 0;
    });
    var appearances = filtered.length;
    if (appearances < 1) {
      return 1; // continue
    }
    var wins = filtered.reduce(function (acc, b) {
      return acc + b.Win;
    }, 0);
    var appearanceRate = totalBattles > 0 ? appearances / totalBattles : 0;
    var winRate = appearances > 0 ? wins / appearances : 0;
    var plusMinus = 2 * wins - appearances;
    output.push({
      preban: HeroDicts.prime_pair_lookup[preban],
      wins: wins,
      appearances: appearances,
      appearance_rate: toPercent(appearanceRate),
      win_rate: toPercent(winRate),
      "+/-": plusMinus
    });
  };
  for (var _i2 = 0, _prebans = prebans; _i2 < _prebans.length; _i2++) {
    if (_loop3()) continue;
  }
  output.sort(function (a, b) {
    return b.appearances - a.appearances;
  });
  return output;
}
function secondsToTimeStr(inputSeconds) {
  var timeStr;
  var mins = Math.floor(inputSeconds / 60);
  var secs = (inputSeconds % 60).toFixed(1);
  if (mins === 0) {
    timeStr = "".concat(secs, " secs");
  } else {
    timeStr = "".concat(mins, " : ").concat(secs, "s");
  }
  return timeStr;
}
function getGeneralStats(battleList, HeroDicts) {
  battleList.sort(function (b1, b2) {
    return new Date(b1["Date/Time"]) - new Date(b2["Date/Time"]);
  });
  var totalBattles = battleList.length;
  var totalGain = battleList.reduce(function (acc, b) {
    return acc + b["Point Gain"];
  }, 0);
  var avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;
  var totalTurns = battleList.reduce(function (acc, b) {
    return acc + b["Turns"];
  }, 0);
  var avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
  var maxTurns = battleList.length > 0 ? Math.max.apply(Math, _toConsumableArray(battleList.map(function (b) {
    return b["Turns"];
  }))) : 0;
  var totalSeconds = battleList.reduce(function (acc, b) {
    return acc + b["Seconds"];
  }, 0);
  var avgSeconds = totalBattles > 0 ? totalSeconds / totalBattles : 0;
  var maxSeconds = battleList.length > 0 ? Math.max.apply(Math, _toConsumableArray(battleList.map(function (b) {
    return b["Seconds"];
  }))) : 0;
  var avgTimeStr = secondsToTimeStr(avgSeconds);
  var maxTimeStr = secondsToTimeStr(maxSeconds);
  var totalFirstTurnGames = battleList.reduce(function (acc, b) {
    return acc + b["First Turn"];
  }, 0);

  // create subsets for first pick and second pick battles
  var fpBattles = getFirstPickSubset(battleList);
  var spBattles = getSecondPickSubset(battleList);

  // get counts for first pick and second pick battles
  var fpCount = fpBattles.length;
  var spCount = spBattles.length;

  // calculate wins for first pick and second pick battles
  var fpWins = fpBattles.reduce(function (acc, b) {
    return acc + b.Win;
  }, 0);
  var spWins = spBattles.reduce(function (acc, b) {
    return acc + b.Win;
  }, 0);

  // calculate rate of occurrence for first pick and second pick battles
  var fpR = totalBattles ? fpCount / totalBattles : 0;
  var spR = totalBattles ? spCount / totalBattles : 0;

  // calculate win rate for first pick and second pick battles
  var fpWR = fpCount ? fpWins / fpCount : 0;
  var spWR = spCount ? spWins / spCount : 0;

  // calculate total win rate
  var winRate = totalBattles ? (fpWins + spWins) / totalBattles : 0;

  // iterate through battles and calculate longest win/loss streaks
  var maxWinStreak = 0,
    maxLossStreak = 0,
    winStreak = 0,
    lossStreak = 0;
  var _iterator8 = _createForOfIteratorHelper(battleList),
    _step8;
  try {
    for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
      var b = _step8.value;
      if (b.Win) {
        winStreak += 1;
        maxWinStreak = Math.max(maxWinStreak, winStreak);
        lossStreak = 0;
      } else {
        winStreak = 0;
        lossStreak += 1;
        maxLossStreak = Math.max(maxLossStreak, lossStreak);
      }
    }
  } catch (err) {
    _iterator8.e(err);
  } finally {
    _iterator8.f();
  }
  var NA = "N/A";
  return {
    first_pick_count: fpCount,
    second_pick_count: spCount,
    first_pick_rate: fpCount ? toPercent(fpR) : NA,
    second_pick_rate: spCount ? toPercent(spR) : NA,
    first_pick_winrate: fpCount ? toPercent(fpWR) : NA,
    second_pick_winrate: spCount ? toPercent(spWR) : NA,
    total_winrate: totalBattles ? toPercent(winRate) : NA,
    total_battles: totalBattles,
    total_wins: fpWins + spWins,
    max_win_streak: maxWinStreak,
    max_loss_streak: maxLossStreak,
    avg_ppg: avgPPG.toFixed(2),
    avg_turns: avgTurns.toFixed(2),
    avg_time: avgTimeStr,
    max_turns: maxTurns,
    max_time: maxTimeStr,
    first_turn_games: totalFirstTurnGames,
    first_turn_rate: totalBattles ? toPercent(totalFirstTurnGames / totalBattles) : NA
  };
}
function getPerformanceStats(battlesList) {
  var perfStatsContainer = {
    servers: [],
    leagues: []
  };
  var totalBattles = battlesList.length;
  var servers = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR);
  var leagues = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR);
  var subsetFilters = [].concat(_toConsumableArray(servers.map(function (server) {
    return ["Server: ".concat(server), function (b) {
      return b["P2 Server"] === server;
    }];
  })), _toConsumableArray(leagues.map(function (league) {
    return ["League: ".concat(league), function (b) {
      return b["P2 League"] === league;
    }];
  })));
  var _iterator9 = _createForOfIteratorHelper(subsetFilters),
    _step9;
  try {
    for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
      var _step9$value = _slicedToArray(_step9.value, 2),
        label = _step9$value[0],
        subsetFilter = _step9$value[1];
      var subset = battlesList.filter(subsetFilter);
      if (subset.length === 0) continue;
      var count = subset.length;
      var wins = subset.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var winRate = count > 0 ? wins / count : "N/A";
      var frequency = totalBattles > 0 ? count / totalBattles : "N/A";
      var firstPickGames = subset.filter(function (b) {
        return b["First Pick"];
      });
      var fpWins = firstPickGames.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var secondPickGames = subset.filter(function (b) {
        return !b["First Pick"];
      });
      var spWins = secondPickGames.reduce(function (acc, b) {
        return acc + b.Win;
      }, 0);
      var targetList = label.toLowerCase().includes("server") ? perfStatsContainer.servers : perfStatsContainer.leagues;
      targetList.push({
        label: label,
        count: count,
        wins: wins,
        win_rate: winRate === "N/A" ? "N/A" : toPercent(winRate),
        frequency: toPercent(frequency),
        "+/-": 2 * wins - count,
        fp_games: firstPickGames.length,
        sp_games: secondPickGames.length,
        fp_wr: firstPickGames.length > 0 ? toPercent(fpWins / firstPickGames.length) : "N/A",
        sp_wr: secondPickGames.length > 0 ? toPercent(spWins / secondPickGames.length) : "N/A"
      });
    }
  } catch (err) {
    _iterator9.e(err);
  } finally {
    _iterator9.f();
  }
  return [].concat(_toConsumableArray(perfStatsContainer.servers), _toConsumableArray(perfStatsContainer.leagues.slice(-4)));
}
var StatsBuilder = {
  getHeroStats: getHeroStats,
  getFirstPickStats: getFirstPickStats,
  getPrebanStats: getPrebanStats,
  getPerformanceStats: getPerformanceStats,
  getGeneralStats: getGeneralStats
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (StatsBuilder);

/***/ }),

/***/ "./static/assets/js/e7/user-manager.ts":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/user-manager.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/e7-API.ts */ "./static/assets/js/apis/e7-API.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");




const userMapCacheKeyMap = {
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.GLOBAL]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.GLOBAL_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.EU]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.EU_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.ASIA]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.ASIA_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.JPN]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.JPN_USERS,
    [_references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_ENUM.KOR]: _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.KOR_USERS,
};
function createUser(userJSON, world_code) {
    return {
        id: userJSON.nick_no,
        name: userJSON.nick_nm,
        code: userJSON.code,
        rank: userJSON.rank,
        world_code: world_code,
    };
}
async function getUserMapFromE7Server(world_code) {
    console.log(`Getting user map for world code from E7 server: ${world_code}`);
    const rawUserJSON = await _apis_e7_API_ts__WEBPACK_IMPORTED_MODULE_2__["default"].fetchUserJSON(world_code);
    if (!rawUserJSON || (typeof rawUserJSON === "object" && !("users" in rawUserJSON))) {
        console.log(`Could not get user map from E7 server for world code: ${world_code}`);
        return null;
    }
    console.log(`Got user map from E7 server for world code: ${world_code}`);
    const rawUserMap = rawUserJSON;
    return Object.fromEntries(rawUserMap.users.map((user) => [
        user.nick_no,
        createUser(user, world_code),
    ]));
}
/**
 * Gets a user map from the E7 server for the given world code.
 * The user map is a map of user IDs to user objects.
 * If the user map is cached, it will be returned from the cache.
 * Otherwise, it will be fetched from the E7 server and cached.
 * @param {string} world_code - The world code to get the user map for.
 * @returns {Promise<Object.<string, User>>} - The user map for the given world code.
 */
async function getUserMap(world_code) {
    console.log(`Getting user map for world code: ${world_code}`);
    const cachedUserMap = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(userMapCacheKeyMap[world_code]);
    if (cachedUserMap !== null) {
        console.log("Got user map from cache");
        return cachedUserMap;
    }
    const fetchedUserMap = await getUserMapFromE7Server(world_code);
    await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].cache(userMapCacheKeyMap[world_code], fetchedUserMap);
    return fetchedUserMap;
}
const cleanStr = (world_code) => _references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_TO_CLEAN_STR[world_code];
function findUser(userData, users, dataExtractFn) {
    const user = users.find((user) => dataExtractFn(user) === userData);
    if (user) {
        console.log(`Found user: ${JSON.stringify(user)}`);
        return { user, ok: true };
    }
    return { user: null, ok: true };
}
async function findUserClientSide(user, userWorldCode) {
    const userMap = await getUserMap(userWorldCode);
    const users = userMap ? Object.values(userMap) : [];
    if (users.length === 0) {
        console.log(`User map had no users, falling back to flask server for world code: ${cleanStr(userWorldCode)}`);
        return { user: null, ok: false };
    }
    let userData, dataExtractFn;
    if (user.id) {
        userData = user.id;
        dataExtractFn = (user) => user.id;
    }
    else if (user.name) {
        userData = user.name.toLowerCase();
        dataExtractFn = (user) => user.name.toLowerCase();
    }
    else {
        throw new Error("Must pass a user object with either user.name or user.id to find user");
    }
    return findUser(userData, users, dataExtractFn);
}
let UserManager = {
    getUserMap: getUserMap,
    /**
     * Finds a user in the user map for the given world code using either user ID or name
     * The world code is required
     * If the user maps api call fails, will try to find the user by calling flask server
     *
     * @param {Object} searchUser - Object with either user ID or name, and world code
     * @returns {Object} - Found user object
     * @throws {Error} - If user is not found with given identifier in given world code
     */
    findUser: async function (searchUser) {
        console.log(`Attempting to find user: ${JSON.stringify(searchUser)}`);
        if (!(searchUser.name || searchUser.id) || !searchUser.world_code) {
            throw new Error("Must pass a user object with either user.name or user.id, and user.world_code to find user");
        }
        let identifier = searchUser.id
            ? `Numeric ID: ${searchUser.id}`
            : `Name: '${searchUser.name}'`;
        let result = null;
        result = await findUserClientSide(searchUser, searchUser.world_code);
        // if issue, try to fetch from flask
        if (!result.ok) {
            result = await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__["default"].fetchUser(searchUser);
        }
        // result should now be guaranteed to be ok otherwise error would have been thrown
        if (result.ok) {
            const user = result.user;
            if (user === null) {
                throw new Error(`Could not find user with ${identifier} in Server: ${cleanStr(searchUser.world_code)}`);
            }
            return user;
        }
        throw new Error(`Function did not properly terminate: ${JSON.stringify(result)}`);
    },
    setUser: async function (user) {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER, user);
    },
    getUser: async function () {
        return await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
    },
    clearUserData: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].clearUserData();
    },
    clearUserDataLists: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].clearUserLists();
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserManager);


/***/ }),

/***/ "./static/assets/js/html-safe.ts":
/*!***************************************!*\
  !*** ./static/assets/js/html-safe.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Safe: () => (/* binding */ Safe)
/* harmony export */ });
const Safe = {
    unwrapHtmlElt: function (eltID) {
        const elt = document.getElementById(eltID);
        if (elt === null) {
            throw new Error(`Could not find element with ID ${eltID}`);
        }
        return elt;
    },
    setText: function (eltID, text) {
        const elt = this.unwrapHtmlElt(eltID);
        elt.textContent = text;
    },
};


/***/ }),

/***/ "./static/assets/js/lang-manager.ts":
/*!******************************************!*\
  !*** ./static/assets/js/lang-manager.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LangManager: () => (/* binding */ LangManager)
/* harmony export */ });
/* harmony import */ var _content_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./content-manager */ "./static/assets/js/content-manager.ts");

const LangManager = {
    changeLang: async function (lang) {
        await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.ClientCache.setLang(lang);
        await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.HeroManager.fetchAndCacheHeroManager(lang);
        window.location.reload();
    },
    getLang: async function () {
        return await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.ClientCache.getLang();
    },
};



/***/ }),

/***/ "./static/assets/js/pages/default.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/pages/default.ts ***!
  \*******************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./page-utilities/nav-bar-utils.ts */ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts");

async function main() {
    await _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_0__.NavBarUtils.initialize();
}
await main();

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ "./static/assets/js/pages/orchestration/inter-page-manager.ts":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/inter-page-manager.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");

const ACTIONS = {
    CLEAR_USER: "CLEAR_USER",
    SHOW_NO_USER_MSG: "SHOW_NO_USER_MSG",
    SHOW_DATA_ALREADY_CLEARED_MSG: "SHOW_DATA_ALREADY_CLEARED_MSG",
    QUERY_USER: "QUERY_USER",
};
let InterPageManager = {
    ACTIONS: ACTIONS,
    getState: async function () {
        return ((await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER)) ?? {
            actions: [],
            messages: [],
        });
    },
    setState: async function (state) {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER, state);
    },
    pushActions: async function (actions) {
        let state = await this.getState();
        state.actions.push(...actions);
        await this.setState(state);
    },
    pushMessages: async function (messages) {
        let state = await this.getState();
        state.messages.push(...messages);
        await this.setState(state);
    },
    pushState: async function (state) {
        let currentState = await this.getState();
        currentState.actions.push(...state.actions);
        currentState.messages.push(...state.messages);
        await this.setState(currentState);
    },
    flushState: async function () {
        const state = await this.getState();
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.INTER_PAGE_MANAGER);
        return state;
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (InterPageManager);


/***/ }),

/***/ "./static/assets/js/pages/orchestration/page-state-manager.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/page-state-manager.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOME_PAGE_FNS: () => (/* binding */ HOME_PAGE_FNS),
/* harmony export */   HOME_PAGE_STATES: () => (/* reexport safe */ _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES),
/* harmony export */   PageStateManager: () => (/* binding */ PageStateManager),
/* harmony export */   validateState: () => (/* binding */ validateState)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../page-utilities/page-state-references.js */ "./static/assets/js/pages/page-utilities/page-state-references.js");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }






var VALIDATION_SET = new Set(Object.values(_page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES));
function validateState(state) {
  if (!VALIDATION_SET.has(state)) {
    console.error("Invalid page state: ".concat(state));
    return false;
  }
  return true;
}
function getContentBody(state) {
  switch (state) {
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SELECT_DATA_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SHOW_STATS:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SHOW_STATS_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.LOAD_DATA:
      return _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.LOAD_DATA_BODY;
    default:
      console.error("Invalid page state: ".concat(state));
  }
}
var PageStateManager = {
  getState: function () {
    var _getState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
          case 1:
            _t2 = _yield$ClientCache$ge = _context.v;
            _t = _t2 !== null;
            if (!_t) {
              _context.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context.n = 4;
            break;
          case 3:
            _t3 = _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA;
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee);
    }));
    function getState() {
      return _getState.apply(this, arguments);
    }
    return getState;
  }(),
  setState: function () {
    var _setState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(state) {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            if (validateState(state)) {
              _context2.n = 1;
              break;
            }
            return _context2.a(2);
          case 1:
            _context2.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE, state);
          case 2:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function setState(_x) {
      return _setState.apply(this, arguments);
    }
    return setState;
  }(),
  resetState: function () {
    var _resetState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
          case 1:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function resetState() {
      return _resetState.apply(this, arguments);
    }
    return resetState;
  }()
};
function homePageSetView(state) {
  if (!validateState(state)) return;
  for (var _i = 0, _Object$values = Object.values(_page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES); _i < _Object$values.length; _i++) {
    var otherState = _Object$values[_i];
    if (state === otherState) continue;
    var otherStateBody = getContentBody(otherState);
    console.log("Hiding ".concat(otherStateBody.id));
    _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(otherStateBody, false);
  }
  var contentBody = getContentBody(state);
  console.log("Showing ".concat(contentBody.id));
  _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(contentBody, true);
}
function homePageDrawUserInfo(user) {
  if (user) {
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = user.name;
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = user.id;
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = _e7_references_ts__WEBPACK_IMPORTED_MODULE_5__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
  } else {
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = "(None)";
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = "(None)";
    _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = "(None)";
  }
}
function homePageSetUser(_x2) {
  return _homePageSetUser.apply(this, arguments);
}
function _homePageSetUser() {
  _homePageSetUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(user) {
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          _context4.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].clearUserData();
        case 1:
          // clear any existing data
          homePageDrawUserInfo(user);
          if (!user) {
            _context4.n = 2;
            break;
          }
          _context4.n = 2;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].setUser(user);
        case 2:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return _homePageSetUser.apply(this, arguments);
}
function homePageClearUserData() {
  return _homePageClearUserData.apply(this, arguments);
}
function _homePageClearUserData() {
  _homePageClearUserData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _context5.n = 1;
          return homePageSetUser(null);
        case 1:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _homePageClearUserData.apply(this, arguments);
}
var HOME_PAGE_FNS = {
  homePageSetView: homePageSetView,
  homePageSetUser: homePageSetUser,
  homePageDrawUserInfo: homePageDrawUserInfo,
  homePageClearUserData: homePageClearUserData
};


/***/ }),

/***/ "./static/assets/js/pages/orchestration/text-controller.js":
/*!*****************************************************************!*\
  !*** ./static/assets/js/pages/orchestration/text-controller.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TextController: () => (/* binding */ TextController),
/* harmony export */   TextPacket: () => (/* binding */ TextPacket),
/* harmony export */   TextUtils: () => (/* binding */ TextUtils)
/* harmony export */ });
/* harmony import */ var _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../page-utilities/doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }

var STYLES = {
  RED: "text-danger",
  GREEN: "text-safe"
};
var TextPacket = /*#__PURE__*/_createClass(function TextPacket(text, docElement, classList) {
  _classCallCheck(this, TextPacket);
  this.text = text;
  this.docElement = docElement;
  this.classList = classList;
});
function assertTextPacket(textPacket) {
  if (!textPacket instanceof TextPacket) {
    throw new Error("Only instances of TextPacket can be passed to this function");
  }
}
var TextController = {
  queue: [],
  autoClearElements: [],
  TextPacket: TextPacket,
  STYLES: STYLES,
  clearStyles: function clearStyles(docElement) {
    for (var _i = 0, _Object$values = Object.values(STYLES); _i < _Object$values.length; _i++) {
      var style = _Object$values[_i];
      docElement.classList.remove(style);
    }
  },
  write: function write(TextPacket) {
    assertTextPacket(TextPacket);
    TextPacket.docElement.textContent = TextPacket.text;
    this.clearStyles(TextPacket.docElement);
    TextPacket.classList.forEach(function (className) {
      TextPacket.docElement.classList.add(className);
    });
  },
  push: function push(TextPacket) {
    assertTextPacket(TextPacket);
    this.queue.push(TextPacket);
  },
  pushFromObj: function pushFromObj(_ref) {
    var text = _ref.text,
      docElement = _ref.docElement,
      classList = _ref.classList;
    this.push(new TextPacket(text, docElement, classList));
  },
  bindAutoClear: function bindAutoClear(elementList) {
    // Only used to clear messages automatically when swiching page states
    var _iterator = _createForOfIteratorHelper(elementList),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var element = _step.value;
        this.autoClearElements.push(element);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  },
  processQueue: function processQueue() {
    var _this = this;
    this.queue.forEach(function (TextPacket) {
      _this.write(TextPacket);
    });
    this.queue = [];
  },
  clearMessages: function clearMessages() {
    var _iterator2 = _createForOfIteratorHelper(this.autoClearElements),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var element = _step2.value;
        element.textContent = "";
        this.clearStyles(element);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
};
function queueSelectDataMsgGreen(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.GREEN]));
}
function queueSelectDataMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.RED]));
}
function queueFilterMsgGreen(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.GREEN]));
}
function queueFilterMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_js__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.RED]));
}
var TextUtils = {
  queueSelectDataMsgGreen: queueSelectDataMsgGreen,
  queueSelectDataMsgRed: queueSelectDataMsgRed,
  queueFilterMsgGreen: queueFilterMsgGreen,
  queueFilterMsgRed: queueFilterMsgRed
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/doc-element-references.js":
/*!*************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/doc-element-references.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../html-safe.ts */ "./static/assets/js/html-safe.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var HomePageElements = /*#__PURE__*/function () {
  function HomePageElements() {
    _classCallCheck(this, HomePageElements);
  }
  return _createClass(HomePageElements, [{
    key: "SELECT_DATA_MSG",
    get: function get() {
      return this._SELECT_DATA_MSG || (this._SELECT_DATA_MSG = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-msg"));
    }
  }, {
    key: "FILTER_MSG",
    get: function get() {
      return this._FILTER_MSG || (this._FILTER_MSG = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filterMSG"));
    }
  }, {
    key: "SELECT_DATA_BODY",
    get: function get() {
      return this._SELECT_DATA_BODY || (this._SELECT_DATA_BODY = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-body"));
    }
  }, {
    key: "SHOW_STATS_BODY",
    get: function get() {
      return this._SHOW_STATS_BODY || (this._SHOW_STATS_BODY = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("show-stats-body"));
    }
  }, {
    key: "LOAD_DATA_BODY",
    get: function get() {
      return this._LOAD_DATA_BODY || (this._LOAD_DATA_BODY = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("load-data-body"));
    }
  }, {
    key: "CLEAR_DATA_BTN",
    get: function get() {
      return this._CLEAR_DATA_BTN || (this._CLEAR_DATA_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("clear-data-btn"));
    }
  }, {
    key: "UPLOAD_FORM",
    get: function get() {
      return this._UPLOAD_FORM || (this._UPLOAD_FORM = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("uploadForm"));
    }
  }, {
    key: "CSV_FILE",
    get: function get() {
      return this._CSV_FILE || (this._CSV_FILE = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("csvFile"));
    }
  }, {
    key: "USER_QUERY_FORM_NAME",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_NAME || (this._USER_QUERY_FORM_NAME = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-name"));
    }
  }, {
    key: "USER_QUERY_FORM_SERVER",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_SERVER || (this._USER_QUERY_FORM_SERVER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-server"));
    }
  }, {
    key: "AUTO_ZOOM_FLAG",
    get: function get() {
      return this._AUTO_ZOOM_FLAG || (this._AUTO_ZOOM_FLAG = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("auto-zoom-flag"));
    }
  }, {
    key: "FOOTER_BODY",
    get: function get() {
      return this._FOOTER || (this._FOOTER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("footer-body"));
    }
  }, {
    key: "USER_NAME",
    get: function get() {
      return this._USER_NAME || (this._USER_NAME = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name"));
    }
  }, {
    key: "USER_ID",
    get: function get() {
      return this._USER_ID || (this._USER_ID = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id"));
    }
  }, {
    key: "USER_SERVER",
    get: function get() {
      return this._USER_SERVER || (this._USER_SERVER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server"));
    }
  }, {
    key: "BATTLE_FILTER_TOGGLE",
    get: function get() {
      return this._BATTLE_FILTER_TOGGLER || (this._BATTLE_FILTER_TOGGLER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-battle-table"));
    }
  }, {
    key: "ID_SEARCH_FLAG",
    get: function get() {
      return this._ID_SEARCH_FLAG || (this._ID_SEARCH_FLAG = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("id-search-flag"));
    }
  }, {
    key: "SEASON_DETAILS_TBL",
    get: function get() {
      return this._SEASON_DETAILS_TBL || (this._SEASON_DETAILS_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("season-details-tbl"));
    }
  }, {
    key: "PERFORMANCE_STATS_TBL",
    get: function get() {
      return this._PERFORMANCE_STATS_TBL || (this._PERFORMANCE_STATS_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("performance-stats-tbl"));
    }
  }, {
    key: "FIRST_PICK_STATS_TBL",
    get: function get() {
      return this._FIRST_PICK_STATS_TBL || (this._FIRST_PICK_STATS_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("first-pick-stats-tbl"));
    }
  }, {
    key: "PREBAN_STATS_TBL",
    get: function get() {
      return this._PREBAN_STATS_TBL || (this._PREBAN_STATS_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("preban-stats-tbl"));
    }
  }, {
    key: "PLAYER_TBL",
    get: function get() {
      return this._PLAYER_TBL || (this._PLAYER_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("player-tbl"));
    }
  }, {
    key: "OPPONENT_TBL",
    get: function get() {
      return this._OPPONENT_TBL || (this._OPPONENT_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("opponent-tbl"));
    }
  }, {
    key: "BATTLES_TBL",
    get: function get() {
      return this._BATTLE_TBL || (this._BATTLE_TBL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("battles-tbl"));
    }
  }, {
    key: "RANK_PLOT",
    get: function get() {
      return this._RANK_PLOT || (this._RANK_PLOT = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("rank-plot"));
    }
  }, {
    key: "MESSAGE_ELEMENTS_LIST",
    get: function get() {
      return [this.SELECT_DATA_MSG, this.FILTER_MSG];
    }
  }]);
}();
var NavBarElements = /*#__PURE__*/function () {
  function NavBarElements() {
    _classCallCheck(this, NavBarElements);
  }
  return _createClass(NavBarElements, [{
    key: "SIDEBAR_HIDE_BTN",
    get: function get() {
      return this._SIDEBAR_HIDE_BTN || (this._SIDEBAR_HIDE_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-hide"));
    }
  }, {
    key: "CLEAR_DATA_BTN",
    get: function get() {
      return this._CLEAR_DATA_BTN || (this._CLEAR_DATA_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("clear-data-btn"));
    }
  }, {
    key: "EXPORT_CSV_BTN",
    get: function get() {
      return this._EXPORT_CSV_BTN || (this._EXPORT_CSV_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("export-csv-btn"));
    }
  }, {
    key: "OFFICIAL_SITE_BTN",
    get: function get() {
      return this._OFFICIAL_SITE_BTN || (this._OFFICIAL_SITE_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("official-site-btn"));
    }
  }, {
    key: "USER_NAME",
    get: function get() {
      return this._USER_NAME || (this._USER_NAME = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name"));
    }
  }, {
    key: "USER_ID",
    get: function get() {
      return this._USER_ID || (this._USER_ID = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id"));
    }
  }, {
    key: "USER_SERVER",
    get: function get() {
      return this._USER_SERVER || (this._USER_SERVER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server"));
    }
  }, {
    key: "SIDEBAR_CONTROL",
    get: function get() {
      return this._SIDEBAR_CONTROL || (this._SIDEBAR_CONTROL = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-control"));
    }
  }]);
}();
var SEARCH_PAGE_ELEMENTS = /*#__PURE__*/function () {
  function SEARCH_PAGE_ELEMENTS() {
    _classCallCheck(this, SEARCH_PAGE_ELEMENTS);
  }
  return _createClass(SEARCH_PAGE_ELEMENTS, [{
    key: "SEARCH_DOMAINS",
    get: function get() {
      return this._SEARCH_DOMAINS || (this._SEARCH_DOMAINS = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-domains"));
    }
  }, {
    key: "SEARCH_SUBMIT_BTN",
    get: function get() {
      return this._SEARCH_SUBMIT_BTN || (this._SEARCH_SUBMIT_BTN = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-submit-btn"));
    }
  }, {
    key: "SEARCH_FORM",
    get: function get() {
      return this._SEARCH_FORM || (this._SEARCH_FORM = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("searchForm"));
    }
  }, {
    key: "SEARCH_TABLE_CONTAINER",
    get: function get() {
      return this._SEARCH_TABLE_CONTAINER || (this._SEARCH_TABLE_CONTAINER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-table-container"));
    }
  }]);
}();
var FILTER_SYNTAX_PAGE_ELEMENTS = /*#__PURE__*/function () {
  function FILTER_SYNTAX_PAGE_ELEMENTS() {
    _classCallCheck(this, FILTER_SYNTAX_PAGE_ELEMENTS);
  }
  return _createClass(FILTER_SYNTAX_PAGE_ELEMENTS, [{
    key: "FILTER_SYNTAX_RULES_CONTAINER",
    get: function get() {
      return this._FILTER_SYNTAX_RULES || (this._FILTER_SYNTAX_RULES = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-syntax-rules-container"));
    }
  }, {
    key: "ALL_CONTENT_CONTAINER",
    get: function get() {
      return this._ALL_CONTENT_CONTAINER || (this._ALL_CONTENT_CONTAINER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("all-content-container"));
    }
  }]);
}();
var DOC_ELEMENTS = {
  HOME_PAGE: new HomePageElements(),
  NAV_BAR: new NavBarElements(),
  SEARCH_PAGE: new SEARCH_PAGE_ELEMENTS(),
  FILTER_SYNTAX_PAGE: new FILTER_SYNTAX_PAGE_ELEMENTS(),
  get BODY_FOOTER_CONTAINER() {
    return this._BODY_FOOTER_CONTAINER || (this._BODY_FOOTER_CONTAINER = _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("body-footer-container"));
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DOC_ELEMENTS);

/***/ }),

/***/ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts":
/*!****************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/nav-bar-utils.ts ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NavBarUtils: () => (/* binding */ NavBarUtils),
/* harmony export */   convertBattlesToCSV: () => (/* binding */ convertBattlesToCSV),
/* harmony export */   downloadCSV: () => (/* binding */ downloadCSV)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../orchestration/inter-page-manager.ts */ "./static/assets/js/pages/orchestration/inter-page-manager.ts");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../content-manager.ts */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../lang-manager.ts */ "./static/assets/js/lang-manager.ts");







function navToHome() {
    // @ts-ignore
    window.location.href = URL_UTILS.HOME_PAGE_URL;
}
// used for pages outside of home page to handle nav bar (will always switch pages)
function addNavListeners() {
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", async function (event) {
            if (!("dataset" in link) || !(link.dataset && typeof link.dataset === "object" && "nav" in link.dataset))
                return;
            const navType = link.dataset.nav;
            console.log("Clicked nav item:", navType);
            if (Object.values(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES).includes(navType)) {
                if (navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA) {
                    await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
                    navToHome();
                }
                else if (navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS) {
                    const user = await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
                    // Stats will not show if there is no active user ; will redirect to select data view with error
                    if (!user) {
                        await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
                        await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushState({
                            messages: [
                                "Active user not found; you must either query a valid user or upload battles to view hero stats.",
                            ],
                            actions: [_orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_NO_USER_MSG],
                        });
                        navToHome();
                    }
                    else {
                        await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS);
                        navToHome();
                    }
                }
            }
        });
    });
}
function addClearDataBtnListener() {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.CLEAR_DATA_BTN.addEventListener("click", async function () {
        const user = await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
        if (user) {
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushActions([_orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.CLEAR_USER]);
        }
        else {
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushActions([_orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG]);
        }
        navToHome();
    });
}
function addBraceButtonListeners() {
    const braceButtons = [
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.CLEAR_DATA_BTN,
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.EXPORT_CSV_BTN,
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN
    ];
    console.log("Adding brace button listeners");
    braceButtons.forEach((btn) => {
        // Simulate hover on mobile
        btn.addEventListener("touchstart", () => {
            btn.classList.add("touch-hover");
            // Auto-expire hover
            setTimeout(() => btn.classList.remove("touch-hover"), 150);
        });
    });
}
function writeUserInfo(user, lang = "en") {
    if (user) {
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = user.name;
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = user.id;
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText =
            _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
            window.open(generateGGLink(user, lang), "_blank", "noopener,noreferrer");
        };
    }
    else {
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = "(None)";
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = "(None)";
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText = "(None)";
        _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
            window.open(_e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.E7_GG_HOME_URL, "_blank", "noopener,noreferrer");
        };
    }
}
function convertBattlesToCSV(arr) {
    const headers = _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.CSVHeaders;
    const csvRows = [];
    // add headers
    csvRows.push(headers.map(h => `"${h}"`).join(","));
    // add rows
    for (const obj of arr) {
        const values = headers.map(h => {
            let v = obj[h] ?? "";
            if (Array.isArray(v))
                v = JSON.stringify(v).replace(/"/g, '""');
            return `"${v}"`;
        });
        csvRows.push(values.join(","));
    }
    return csvRows.join("\n");
}
function downloadCSV(csv, filename) {
    const BOM = "\uFEFF";
    const csvFile = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
function addExportCSVBtnListener() {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.EXPORT_CSV_BTN.addEventListener("click", async function () {
        const user = await _content_manager_ts__WEBPACK_IMPORTED_MODULE_5__.ContentManager.UserManager.getUser();
        if (!user) {
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushState({
                messages: [
                    "User not found; cannot export data without an active user",
                ],
                actions: [_orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_NO_USER_MSG],
            });
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            navToHome();
            return;
        }
        const timestamp = new Date().toISOString().split("T")[0] || "";
        const fileName = `${user.name} (${user.id}) ${timestamp}.csv`;
        let battles = await _content_manager_ts__WEBPACK_IMPORTED_MODULE_5__.ContentManager.BattleManager.getBattles();
        const battlesList = Object.values(battles);
        const csvStr = convertBattlesToCSV(battlesList);
        downloadCSV(csvStr, fileName);
    });
}
async function eraseUserFromPage() {
    await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].clearUserData();
    writeUserInfo(null);
}
async function setUserOnPage(user) {
    await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].setUser(user);
    const lang = await _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__.LangManager.getLang();
    writeUserInfo(user, lang);
}
function generateGGLink(user, lang) {
    const url = `${_e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.E7_STOVE_HOME_URL}/${lang}/gg/battlerecord/${user.world_code}/${user.id}`;
    return url;
}
async function initialize() {
    const user = await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
    writeUserInfo(user);
    addNavListeners();
    addClearDataBtnListener();
    addExportCSVBtnListener();
    addBraceButtonListeners();
}
let NavBarUtils = {
    addNavListeners: addNavListeners,
    addClearDataBtnListener: addClearDataBtnListener,
    writeUserInfo: writeUserInfo,
    initialize: initialize,
    navToHome: navToHome,
    addExportCSVBtnListener: addExportCSVBtnListener,
    addBraceButtonListeners: addBraceButtonListeners,
    eraseUserFromPage: eraseUserFromPage,
    setUserOnPage: setUserOnPage,
};



/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-state-references.js":
/*!************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-state-references.js ***!
  \************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOME_PAGE_STATES: () => (/* binding */ HOME_PAGE_STATES)
/* harmony export */ });
var HOME_PAGE_STATES = {
  SELECT_DATA: "select-data",
  SHOW_STATS: "show-stats",
  LOAD_DATA: "load-data"
};

/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-utils.js":
/*!*************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-utils.js ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../e7/hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../e7/filter-parsing/filter-parser.ts */ "./static/assets/js/e7/filter-parsing/filter-parser.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



var PageUtils = {
  validateFilterSyntax: function () {
    var _validateFilterSyntax = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(str) {
      var HeroDicts, filterMSG, parser, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroDicts();
          case 1:
            HeroDicts = _context.v;
            filterMSG = document.getElementById("filterMSG");
            _context.p = 2;
            _context.n = 3;
            return _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_1__.FilterParser.fromFilterStr(str, HeroDicts);
          case 3:
            parser = _context.v;
            console.log(parser.asString());
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextPacket("Validation Passed", filterMSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.STYLES.GREEN]));
            return _context.a(2, true);
          case 4:
            _context.p = 4;
            _t = _context.v;
            console.error(_t);
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextPacket("Validation Failed: ".concat(_t.message), filterMSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.STYLES.RED]));
            return _context.a(2, false);
        }
      }, _callee, null, [[2, 4]]);
    }));
    function validateFilterSyntax(_x) {
      return _validateFilterSyntax.apply(this, arguments);
    }
    return validateFilterSyntax;
  }(),
  setScrollPercent: function setScrollPercent(percent) {
    console.log("Scrolling to ".concat(percent, "%"));
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var targetScroll = percent / 100 * maxScroll;
    // Temporarily disable CSS smooth scrolling
    var html = document.documentElement;
    var prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({
      top: targetScroll
    });

    // Restore previous behavior
    html.style.scrollBehavior = prevScrollBehavior;
  },
  getScrollPercent: function getScrollPercent() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight;
    var clientHeight = window.innerHeight;
    var maxScroll = scrollHeight - clientHeight;
    if (maxScroll === 0) return 0; // avoid division by zero

    return scrollTop / maxScroll * 100;
  },
  setVisibility: function setVisibility(element, visible) {
    if (visible) {
      element.classList.remove("d-none");
    } else {
      element.classList.add("d-none");
    }
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PageUtils);

/***/ }),

/***/ "./static/assets/js/str-functions.ts":
/*!*******************************************!*\
  !*** ./static/assets/js/str-functions.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   strArrToCountMap: () => (/* binding */ strArrToCountMap),
/* harmony export */   toTitleCase: () => (/* binding */ toTitleCase)
/* harmony export */ });
function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
function strArrToCountMap(strArr) {
    let acc = {};
    return strArr.reduce((acc, elt) => {
        acc[elt] = (acc[elt] || 0) + 1;
        return acc;
    }, acc);
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var hasSymbol = typeof Symbol === "function";
/******/ 		var webpackQueues = hasSymbol ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = hasSymbol ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = hasSymbol ? Symbol("webpack error") : "__webpack_error__";
/******/ 		
/******/ 		
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 		
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 		
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			var handle = (deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 		
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}
/******/ 			var done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 			body(handle, done);
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./static/assets/js/pages/default.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=default.7ecfc818440e30c00932.bundle.js.map