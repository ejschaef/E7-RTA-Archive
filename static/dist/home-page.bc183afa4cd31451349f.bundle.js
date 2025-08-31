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
const REFERENCE_DATA_KEYS = {
    ...SERVER_USER_LISTS_KEYS,
    ARTIFACTS: "artifacts", // map of artifact codes to names
    ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map", // map of artifact lowercase names to original names
    ARTIFACT_OBJECT_LIST: "artifact-object-list", // list of artifact objects with id and name fields
    HERO_MANAGER: "hero-manager",
    SEASON_DETAILS: "season-details",
};
const Keys = {
    ...USER_DATA_KEYS,
    ...REFERENCE_DATA_KEYS,
    LANG: "lang",
    AUTO_ZOOM_FLAG: "auto-zoom",
    AUTO_QUERY_FLAG: "auto-query",
    ID_SEARCH_FLAG: "id-search",
    ARTIFACTS: "artifacts",
    ARTIFACTS_LOWERCASE_NAMES_MAP: "artifacts-lowercase-names-map",
    ARTIFACT_OBJECT_LIST: "artifact-object-list",
    HOME_PAGE_STATE: "home-page-state",
    INTER_PAGE_MANAGER: "inter-page-manager",
};
const DEFAULT_TIMEOUT = 1000 * 60 * 60 * 24 * 2; // 2 days
const REFERENCE_DATA_TIMEOUT = 1000 * 60 * 60 * 24; // 1 day
function getCacheTimeout(key) {
    return (key in REFERENCE_DATA_KEYS)
        ? REFERENCE_DATA_TIMEOUT
        : DEFAULT_TIMEOUT;
}
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
    get: async function (key) {
        const db = await this.openDB();
        const result = await db.get(this.consts.STORE_NAME, key);
        if (result) {
            console.log(`Found ${key} in cache`);
        }
        else {
            console.log(`${key} not found in cache; returning null`);
            return null;
        }
        const useCache = await this.checkCacheTimeout(key);
        if (useCache) {
            return result;
        }
        else {
            return null;
        }
    },
    cache: async function (key, data) {
        console.log(`Caching ${key}`);
        const db = await this.openDB();
        await db.put(this.consts.STORE_NAME, data, key);
        await this.setTimestamp(key, Date.now());
    },
    delete: async function (key) {
        const db = await this.openDB();
        await db.delete(this.consts.STORE_NAME, key);
        await this.deleteTimestamp(key);
    },
    deleteDB: async function () {
        await indexedDB.deleteDatabase(this.consts.DB_NAME);
        console.log('Database deleted');
    },
    getTimestamp: async function (key) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        const timestamp = await db.get(this.consts.META_STORE_NAME, metakey);
        return timestamp ?? 0;
    },
    setTimestamp: async function (key, timestamp) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        await db.put(this.consts.META_STORE_NAME, timestamp, metakey);
    },
    setTimestampNow: async function (key) {
        await this.setTimestamp(key, Date.now());
    },
    deleteTimestamp: async function (key) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        await db.delete(this.consts.META_STORE_NAME, metakey);
        console.log(`Deleted ${key} from cache`);
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
    clearReferenceData: async function () {
        const toDelete = Object.values(REFERENCE_DATA_KEYS);
        await Promise.all(toDelete.map(key => this.delete(key)));
        console.log("Reference data cleared from data cache");
    },
    checkCacheTimeout: async function (key) {
        const timestamp = await this.getTimestamp(key);
        const currentTime = Date.now();
        if (!timestamp || (currentTime - timestamp > getCacheTimeout(key))) {
            console.log(`Cache timeout for ${key}; timestamp: ${timestamp}; currentTime: ${currentTime}`);
            await this.delete(key);
            return false;
        }
        return true;
    },
    getFilterStr: async function () {
        return await this.get(Keys.FILTER_STR);
    },
    setFilterStr: async function (filterStr) {
        await this.cache(Keys.FILTER_STR, filterStr);
    },
    getLang: async function () {
        return await this.get(Keys.LANG) ?? _e7_references__WEBPACK_IMPORTED_MODULE_1__.LANGUAGES.CODES.EN;
    },
    setLang: async function (lang) {
        await this.cache(Keys.LANG, lang);
    },
    getStats: async function () {
        return await this.get(Keys.STATS);
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
/* harmony import */ var _e7_battle_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/battle-manager.ts */ "./static/assets/js/e7/battle-manager.ts");
/* harmony import */ var _e7_season_manager_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./e7/season-manager.ts */ "./static/assets/js/e7/season-manager.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _e7_artifact_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./e7/artifact-manager.ts */ "./static/assets/js/e7/artifact-manager.ts");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./lang-manager.ts */ "./static/assets/js/lang-manager.ts");







let ContentManager = {
    HeroManager: _e7_hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"],
    BattleManager: _e7_battle_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"],
    SeasonManager: _e7_season_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"],
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

/***/ "./static/assets/js/e7/battle-manager.ts":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/battle-manager.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   applyFilters: () => (/* binding */ applyFilters),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stats-builder -  old.ts */ "./static/assets/js/e7/stats-builder -  old.ts");
/* harmony import */ var _battle_transform_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./battle-transform.ts */ "./static/assets/js/e7/battle-transform.ts");
/* harmony import */ var _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./filter-parsing/functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");





async function applyFilters(battleList, filters) {
    const localFilterList = filters.filter((f) => f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.StandardFilter);
    const globalFilterList = filters.filter((f) => f instanceof _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__.GlobalFilter);
    // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
    for (let filter of globalFilterList) {
        console.log(`Applying global filter: ${filter.asString()}`);
        battleList = filter.call(battleList);
    }
    // apply local filters (filters that can be resolved on each battle without context of other battles)
    for (let filter of localFilterList) {
        console.log(`Applying local filter: ${filter.asString()}`);
        battleList = battleList.filter((b) => {
            // console.log(`Filtering battle: ${b["Seq Num"]}; ${filter.call(b) ? "included" : "excluded"}`);
            return filter.call(b);
        });
    }
    return battleList;
}
let BattleManager = {
    loaded_servers: new Set(),
    // gets battles (upload and/or queried) and returns as list in clean format; used directly to populate battles table
    getBattles: async function () {
        console.log("Getting battles");
        const battles = (await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES)) ?? null;
        _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].setTimestampNow(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
        return battles;
    },
    // Removes all user battle data from cache, should be called when user is switched out
    removeBattles: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
        console.log("Removed battle data from cache; cleared ['BATTLES', 'UPLOADED_BATTLES', 'FILTERED_BATTLES']");
    },
    removeFilteredBattles: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
        console.log("Removed filtered battle data from cache; cleared ['FILTERED_BATTLES']");
    },
    applyFilters: applyFilters,
    /* after battles are set in cache, applies filters to the battles and stores filtered arr in cache under filtered
  battle key all battles are stored in their clean format, not numerical format; convert after to compute metrics */
    applyFiltersToCachedBattles: async function (filters) {
        let battles = await this.getBattles() ?? {};
        const filteredBattles = await this.applyFilters(Object.values(battles), filters);
        console.log(`Caching filtered battles ; total = ${Object.keys(battles).length}`);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES, battles);
        console.log(`Filtered battles and stored in cache; modified ['FILTERED_BATTLES']; Applied total of <${filters.length}> filters`);
        return battles;
    },
    //takes in list of battles then converts to dict and then adds to cached battles
    extendBattles: async function (cleanBattleMap) {
        let oldDict = (await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES)) ?? {};
        // new battles automatically overwrite old ones if they share same seq_num
        const newDict = { ...oldDict, ...this.sortBattlesObj(cleanBattleMap) };
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES, newDict);
        console.log("Extended user data in cache");
        return newDict;
    },
    //Takes queried battles, clean format and extend in cache
    cacheQuery: async function (battleList, HeroDicts, artifacts) {
        if (!battleList) {
            console.log("No query battles provided to cacheQuery");
            return [];
        }
        console.log(`Caching queried battles: ${battleList.length} battles; modified [BATTLES];`, battleList);
        const cleanBattleMap = (0,_battle_transform_ts__WEBPACK_IMPORTED_MODULE_2__.buildFormattedBattleMap)(battleList, HeroDicts, artifacts);
        const battles = await this.extendBattles(cleanBattleMap);
        console.log("Cached queried battles in cache; modified [BATTLES];");
        return battles;
    },
    //Takes uploaded battles and sets as battles in cache, should be called before attempting to get battles if upload exists
    cacheUpload: async function (rawParsedBattleList, HeroDicts) {
        if (!rawParsedBattleList) {
            console.error("No uploaded battles provided to cacheUpload");
            return {};
        }
        const cleanBattles = (0,_battle_transform_ts__WEBPACK_IMPORTED_MODULE_2__.parsedCSVToFormattedBattleMap)(rawParsedBattleList, HeroDicts);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES, cleanBattles);
        let battles = await this.extendBattles(cleanBattles);
        console.log("Ingested uploaded battle data into cache; modified [BATTLES] and overwrote [UPLOADED_BATTLES]");
        return battles;
    },
    getStats: async function (battles, filters, HeroDicts) {
        console.log("Getting stats");
        const numFilters = filters.length;
        console.log(`Applying ${numFilters} filters`);
        const battlesList = Object.values(battles);
        const filteredBattles = await this.applyFiltersToCachedBattles(filters);
        const filteredBattlesList = Object.values(filteredBattles);
        const areFiltersApplied = numFilters > 0;
        console.log("Getting preban stats");
        const prebanStats = await _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getPrebanStats(filteredBattlesList, HeroDicts);
        console.log("Getting first pick stats");
        const firstPickStats = await _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getFirstPickStats(filteredBattlesList, HeroDicts);
        console.log("Getting general stats");
        const generalStats = await _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getGeneralStats(filteredBattlesList);
        console.log("Getting hero stats");
        const heroStats = await _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroStats(filteredBattlesList, HeroDicts);
        console.log("Getting server stats");
        const performanceStats = await _stats_builder_old_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getPerformanceStats(filteredBattlesList);
        console.log("Returning stats");
        return {
            battles: battlesList,
            filteredBattlesObj: filteredBattles,
            prebanStats: prebanStats,
            generalStats: generalStats,
            firstPickStats: firstPickStats,
            playerHeroStats: heroStats.playerHeroStats,
            enemyHeroStats: heroStats.enemyHeroStats,
            performanceStats: performanceStats,
            numFilters: numFilters,
            areFiltersApplied: areFiltersApplied,
        };
    },
    sortBattlesList: function (battlesList, asc = true) {
        const cmpCol = _references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.DATE_TIME;
        if (asc) {
            return battlesList.sort((a, b) => {
                return +new Date(a[cmpCol]) - +new Date(b[cmpCol]);
            });
        }
        else {
            return battlesList.sort((a, b) => {
                return +new Date(b[cmpCol]) - +new Date(a[cmpCol]);
            });
        }
    },
    sortBattlesObj: function (battlesObj, asc = true) {
        const cmpCol = _references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.DATE_TIME;
        if (asc) {
            let sorted = Object.values(battlesObj).sort((a, b) => {
                return +new Date(a[cmpCol]) - +new Date(b[cmpCol]);
            });
            return Object.fromEntries(sorted.map((b) => [b[_references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.SEQ_NUM], b]));
        }
        else {
            let sorted = Object.values(battlesObj).sort((a, b) => {
                return +new Date(b[cmpCol]) - +new Date(a[cmpCol]);
            });
            return Object.fromEntries(sorted.map((b) => [b[_references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.SEQ_NUM], b]));
        }
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BattleManager);


/***/ }),

/***/ "./static/assets/js/e7/battle-transform.ts":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/battle-transform.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildFormattedBattleMap: () => (/* binding */ buildFormattedBattleMap),
/* harmony export */   parsedCSVToFormattedBattleMap: () => (/* binding */ parsedCSVToFormattedBattleMap)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./artifact-manager.ts */ "./static/assets/js/e7/artifact-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _str_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../str-functions.ts */ "./static/assets/js/str-functions.ts");




// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow)
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle, HeroDicts) {
    const getChampPrime = (name) => _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(name, HeroDicts)?.prime ?? HeroDicts.Fodder.prime;
    battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES] =
        battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS].map(getChampPrime);
    battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES] =
        battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS].map(getChampPrime);
    battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES] =
        battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS].map(getChampPrime);
    battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES] =
        battle[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
}
const P1 = "p1";
const P2 = "p2";
// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw, HeroDicts, artifacts) {
    // Make functions used to convert the identifier strings in the E7 data into human readable names
    const getChampName = (code) => _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByCode(code, HeroDicts)?.name ?? HeroDicts.Fodder.name;
    const getArtifactName = (code) => _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].convertCodeToName(code, artifacts) || "None";
    const checkBanned = (player, index) => {
        // used to check if artifact is null because banned or because not equipped
        if (player === P1) {
            return raw.p2_postban === raw.p1_picks[index];
        }
        else {
            return raw.p1_postban === raw.p2_picks[index];
        }
    };
    const formatArtifacts = (player, artiArr) => artiArr.map((code, index) => code ? getArtifactName(code) : checkBanned(player, index) ? "n/a" : "None");
    function formatCRBar(crBar) {
        return crBar.map((entry) => entry && entry.length == 2
            ? [getChampName(entry[0]), entry[1]]
            : ["n/a", 0]);
    }
    // Fall back to the code if the equipment set is not defined in references
    const formatEquipment = (equipArr) => equipArr.map((heroEquipList) => heroEquipList.map((equip) => _references_ts__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_SET_MAP[equip] || equip));
    const firstTurnHero = raw.cr_bar.find((entry) => entry[1] === 100);
    const p1TookFirstTurn = firstTurnHero
        ? raw.p1_picks.includes(firstTurnHero[0])
        : false;
    const battle = {
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON]: raw.season_name || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON_CODE]: raw.season_code || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.DATE_TIME]: raw.date_time,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SECONDS]: raw.seconds,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.TURNS]: raw.turns,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEQ_NUM]: raw.seq_num,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ID]: raw.p1_id.toString(),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_SERVER]: _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ID]: raw.p2_id.toString(),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_SERVER]: _references_ts__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_LEAGUE]: (0,_str_functions_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p1_league) || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_LEAGUE]: (0,_str_functions_ts__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p2_league) || "None",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POINTS]: raw.p1_win_score,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.POINT_GAIN]: raw.p1_point_delta || null,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.WIN]: raw.win === 1 ? true : false,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_PICK]: raw.first_pick === 1 ? true : false,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN]: p1TookFirstTurn ? true : false,
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN_HERO]: firstTurnHero
            ? getChampName(firstTurnHero[0])
            : "n/a",
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.CR_BAR]: formatCRBar(raw.cr_bar),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS]: raw.p1_prebans.map(getChampName),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS]: raw.p2_prebans.map(getChampName),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS]: raw.p1_picks.map(getChampName),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS]: raw.p2_picks.map(getChampName),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POSTBAN]: getChampName(raw.p1_postban),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_POSTBAN]: getChampName(raw.p2_postban),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_EQUIPMENT]: formatEquipment(raw.p1_equipment),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_EQUIPMENT]: formatEquipment(raw.p2_equipment),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ARTIFACTS]: formatArtifacts(P1, raw.p1_artifacts),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ARTIFACTS]: formatArtifacts(P2, raw.p2_artifacts),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_MVP]: getChampName(raw.p1_mvp),
        [_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_MVP]: getChampName(raw.p2_mvp),
    };
    // finally take the array hero array fields and compute the prime products after converting; will be used to compute statistics more easily
    addPrimeFields(battle, HeroDicts);
    return battle;
}
function buildFormattedBattleMap(rawBattles, HeroDicts, artifacts) {
    artifacts = artifacts ?? _artifact_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getArtifactCodeToNameMap();
    let entries = [];
    for (const rawBattle of rawBattles) {
        let battle = formatBattleAsRow(rawBattle, HeroDicts, artifacts);
        entries.push([battle["Seq Num"], battle]);
    }
    return Object.fromEntries(entries);
}
function castRawUploadBattle(raw) {
    return Object.fromEntries(Object.entries(raw).map(([column, value]) => [
        column,
        JSON.parse(value),
    ]));
}
// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr, HeroDicts) {
    const rows = rawRowsArr.map((row) => {
        const formattedRow = castRawUploadBattle(row);
        console.log("Formatted Row: ", formattedRow);
        addPrimeFields(formattedRow, HeroDicts);
        return formattedRow;
    });
    return Object.fromEntries(rows.map((row) => [row[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEQ_NUM], row]));
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
        let args = _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
        args = args.filter((arg) => arg !== "");
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
    "is-first-pick": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_PICK] ? true : false,
    "is-win": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.WIN] ? true : false,
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
    "is-first-turn": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.FIRST_TURN] ? true : false,
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
/* harmony import */ var _season_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../season-manager */ "./static/assets/js/e7/season-manager.ts");
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
            throw new _filter_utils__WEBPACK_IMPORTED_MODULE_5__["default"].SyntaxException(`Invalid base filter; filters must have 3 tokens and be of the form: ['X', operator, 'Y']; got tokens: [${tokens}] from str: ${str}`);
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
/* harmony import */ var _base_elements__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./base-elements */ "./static/assets/js/e7/filter-parsing/base-elements.ts");

function collectionToString(collection) {
    if (collection instanceof Set) {
        return Array.from(collection).join(", ");
    }
    else if (collection instanceof _base_elements__WEBPACK_IMPORTED_MODULE_0__.RangeData) {
        return `[${collection.start}, ${collection.end})`;
    }
    else {
        return collection.join(", ");
    }
}
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
        // console.log(`IN OPER: Left: ${a}, Op: ${this.opStr}, Right: ${collectionToString(b)}; Result: ${contains}`);
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
        return HeroDicts.prime_lookup[prime] ?? null;
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

/***/ "./static/assets/js/e7/plots.ts":
/*!**************************************!*\
  !*** ./static/assets/js/e7/plots.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PLOT_REFS: () => (/* binding */ PLOT_REFS),
/* harmony export */   generateRankPlot: () => (/* binding */ generateRankPlot),
/* harmony export */   getSizes: () => (/* binding */ getSizes),
/* harmony export */   getZoom: () => (/* binding */ getZoom)
/* harmony export */ });
const PLOT_REFS = {
    markerMaxWidth: 16,
    lineMaxWidth: 8,
    minMarkerSize: 2,
    minLineWidth: 1
};
function getSizes(numBattles) {
    const length = numBattles;
    const markerSize = Math.max(PLOT_REFS.minMarkerSize, 6 - Math.log10(length) * 0.5);
    const lineWidth = Math.max(PLOT_REFS.minLineWidth, 3 - Math.log10(length) * 0.5);
    return { markerSize, lineWidth };
}
function getZoom(battlesList, filteredBattlesList) {
    const zoom = {
        startX: null,
        endX: null,
        startY: null,
        endY: null
    };
    const zoomYPadding = 50;
    const zoomXPadding = 0.5;
    for (const [idx, battle] of battlesList.entries()) {
        if (battle["Seq Num"] in filteredBattlesList) {
            zoom.startX = (zoom.startX === null || idx < zoom.startX) ? idx - zoomXPadding : zoom.startX;
            zoom.startY = (zoom.startY === null || battle["P1 Points"] < zoom.startY + zoomYPadding) ? battle["P1 Points"] - zoomYPadding : zoom.startY;
            zoom.endX = (zoom.endX === null || idx > zoom.endX) ? idx + zoomXPadding : zoom.endX;
            zoom.endY = (zoom.endY === null || battle["P1 Points"] > zoom.endY - zoomYPadding) ? battle["P1 Points"] + zoomYPadding : zoom.endY;
        }
    }
    return zoom;
}
function generateRankPlot(container, battles, user, filteredBattles = null) {
    // Sort battles chronologically by time
    battles.sort((a, b) => a["Date/Time"].localeCompare(b["Date/Time"]));
    // if the user is not passed, default the username to the ID of the player
    if (!user) {
        user = { name: `UID: ${battles[0]["P1 ID"]}` };
    }
    const markerDefaultColor = '#0df8fd';
    const markerFilteredColor = '#ff9900';
    const x = battles.map((_, i) => i);
    const y = battles.map(b => b["P1 Points"]);
    const markerMask = [];
    // iterate through battles and build list to color filtered battles distinctly 
    // and determine the area to zoom on if needed
    for (let [idx, battle] of battles.entries()) {
        if (filteredBattles && battle["Seq Num"] in filteredBattles) {
            markerMask.push(markerFilteredColor);
        }
        else {
            markerMask.push(markerDefaultColor);
        }
    }
    ;
    const customdata = battles.map(b => [
        b["Date/Time"].slice(0, 10), // date
        b["P1 League"] // league
    ]);
    const sizes = getSizes(battles.length);
    const trace = {
        x: x,
        y: y,
        mode: 'lines+markers',
        line: {
            color: '#4f9293',
            width: sizes.lineWidth
        },
        marker: {
            symbol: 'circle',
            size: sizes.markerSize,
            color: markerMask
        },
        customdata: customdata,
        hovertemplate: 'Points: %{y}<br>' +
            'Date: %{customdata[0]}<br>' +
            'League: %{customdata[1]}<extra></extra>'
    };
    const layout = {
        autosize: true,
        font: {
            family: 'Roboto, Open Sans'
        },
        title: {
            text: `${user.name}'s RTA Point Plot`,
            font: { size: 24, color: '#dddddd' },
            xanchor: 'center',
            yanchor: 'top',
            y: 0.95,
            x: 0.5
        },
        xaxis: {
            title: {
                text: 'Battle Number (Chronological)',
                font: { size: 18, color: '#dddddd' }
            },
            showgrid: true,
            gridcolor: '#8d8d8d',
            zeroline: false,
            tickfont: { size: 12, color: '#dddddd' },
            range: null
        },
        yaxis: {
            title: {
                text: 'Victory Points',
                font: { size: 18, color: '#dddddd' }
            },
            showgrid: true,
            gridcolor: '#8d8d8d',
            zeroline: true,
            zerolinecolor: '#dddddd',
            zerolinewidth: 2,
            tickfont: { size: 12, color: '#dddddd' },
            range: null
        },
        plot_bgcolor: '#1e222d',
        paper_bgcolor: '#1e222d'
    };
    const config = {
        responsive: true
    };
    let plotDiv;
    let plotDivExists = true;
    plotDiv = document.getElementById("rank-plot");
    if (!plotDiv) {
        plotDivExists = false;
        plotDiv = document.createElement("div");
        plotDiv.id = "rank-plot"; // or use a dynamic ID if needed
        container.appendChild(plotDiv);
    }
    plotDiv.style.width = "100%";
    plotDiv.style.height = "100%";
    if (plotDivExists) {
        console.log("updating plot");
        // @ts-ignore
        Plotly.react(plotDiv, [trace], layout, config);
    }
    else {
        console.log("creating plot");
        // @ts-ignore
        Plotly.newPlot(plotDiv, [trace], layout, config);
    }
    return plotDiv;
}


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
/* harmony export */   ExportColumns: () => (/* binding */ ExportColumns),
/* harmony export */   HERO_STATS_COLUMN_MAP: () => (/* binding */ HERO_STATS_COLUMN_MAP),
/* harmony export */   INT_COLUMNS: () => (/* binding */ INT_COLUMNS),
/* harmony export */   LANGUAGES: () => (/* binding */ LANGUAGES),
/* harmony export */   LEAGUE_MAP: () => (/* binding */ LEAGUE_MAP),
/* harmony export */   LEAGUE_TO_CLEAN_STR: () => (/* binding */ LEAGUE_TO_CLEAN_STR),
/* harmony export */   ONE_DAY_MILLISECONDS: () => (/* binding */ ONE_DAY_MILLISECONDS),
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
const ONE_DAY_MILLISECONDS = 1000 * 60 * 60 * 24; // milliseconds
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
    P2_PICKS_PRIMES: "P2 Picks Primes",
    P1_PREBANS_PRIMES: "P1 Prebans Primes",
    P2_PREBANS_PRIMES: "P2 Prebans Primes",
};
const CSVHeaders = Object.values(COLUMNS_MAP).filter(h => !h.toLowerCase().includes("prime"));
const ExportColumns = Object.values(COLUMNS_MAP).filter(h => !h.toLowerCase().includes("prime"));
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

/***/ "./static/assets/js/e7/saved-filters.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/saved-filters.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var SavedFilters = {
  // Filter Name Keys must match the text content in home.html
  "Current Season": "season = current-season",
  "Last Season": "season = last-season",
  "First Pick": "is-first-pick = true",
  "Second Pick": "is-first-pick = false",
  "Champion+ Opponent": "p2.league in {champion, warlord, emperor, legend}",
  "Warlord+ Opponent": "p2.league in {warlord, emperor, legend}",
  "Emperor+ Opponent": "p2.league in {emperor, legend}",
  "Legend Opponent": "p2.league = 'legend'",
  "Wins": "is-win = true",
  "Losses": "is-win = false",
  extendFilters: function extendFilters(currFilterStr, filterName) {
    var filter = SavedFilters[filterName];
    // trim whitespace only from end of str
    currFilterStr = currFilterStr.replace(/\s+$/, '');
    if (currFilterStr.slice(-1) !== ";" && currFilterStr.length > 0) {
      currFilterStr += ";\n";
    } else if (currFilterStr.slice(-1) === ";") {
      currFilterStr += "\n";
    }
    return "".concat(currFilterStr).concat(filter, ";");
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SavedFilters);

/***/ }),

/***/ "./static/assets/js/e7/season-manager.ts":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/season-manager.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _regex_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./regex.ts */ "./static/assets/js/e7/regex.ts");




let SeasonManager = {
    fetchAndCacheSeasonDetails: async function () {
        const result = await _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].fetchSeasonDetails();
        if (result.error) {
            throw new Error(`Could not fetch season details: ${result.error}`);
        }
        const seasonDetails = result.seasonDetails;
        seasonDetails.forEach((season) => {
            season.range = [season["Start"], season["End"]].map((d) => new Date(`${d.split(" ")[0]}T00:00:00`));
            season["Season Number"] = String(season["Season Number"]);
        });
        seasonDetails.sort((a, b) => parseInt(a["Season Number"]) - parseInt(b["Season Number"]));
        // add pre seasons
        const preSeasonFilled = [seasonDetails[0]];
        let lastSeason = seasonDetails[0];
        seasonDetails.slice(1).forEach((season) => {
            const [start, end] = [
                new Date(+lastSeason.range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY_MILLISECONDS),
                new Date(+season.range[0] - _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY_MILLISECONDS),
            ];
            const seasonNumStr = lastSeason["Season Number"] + "f";
            const preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: `Pre ${season["Season"]}`,
                Start: start.toISOString().slice(0, 10),
                End: end.toISOString().slice(0, 10),
                Status: "Complete",
                range: [start, end],
            };
            preSeasonFilled.push(preSeason);
            preSeasonFilled.push(season);
            lastSeason = season;
        });
        // add another pre season if current season is complete
        if (lastSeason.range[1] < new Date()) {
            const start = new Date(+lastSeason.range[1] + _references_ts__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY_MILLISECONDS);
            const seasonNumStr = lastSeason["Season Number"] + "f";
            const preSeason = {
                "Season Number": seasonNumStr,
                Code: "pvp_rta_ss" + seasonNumStr,
                Season: `Active Pre-Season`,
                Start: start.toISOString().slice(0, 10),
                End: "N/A",
                Status: "Active",
                range: [start, new Date()],
            };
            preSeasonFilled.push(preSeason);
        }
        preSeasonFilled.reverse();
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS, preSeasonFilled);
        return preSeasonFilled;
    },
    getSeasonDetails: async function () {
        const cached = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
        if (cached) {
            return cached;
        }
        return await SeasonManager.fetchAndCacheSeasonDetails();
    },
    clearSeasonDetails: async function () {
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].delete(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
        console.log("Season details cleared from data cache");
    },
    getSeasonNumFromCode: function (seasonCode) {
        return seasonCode.split("_")[-1];
    },
    reaquireIfNeeded: async function (battle) {
        const seasonDetails = await SeasonManager.getSeasonDetails();
        const seasonCodes = new Set(seasonDetails.map((s) => s.Code));
        battle.forEach((b) => {
            const seasonCode = b[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON_CODE];
            if (!_regex_ts__WEBPACK_IMPORTED_MODULE_3__.RegExps.SEASON_CODE_LITERAL_RE.test(seasonCode)) {
                console.error("Battle contains invalid season code:", seasonCode, b);
            }
            if (!seasonCodes.has(b[_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON_CODE])) {
                SeasonManager.fetchAndCacheSeasonDetails();
                console.log("Reacquired season details due to missing season code:", seasonCode);
                return;
            }
        });
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SeasonManager);


/***/ }),

/***/ "./static/assets/js/e7/stats-builder -  old.ts":
/*!*****************************************************!*\
  !*** ./static/assets/js/e7/stats-builder -  old.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.ts */ "./static/assets/js/e7/hero-manager.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");


const getWins = (battleList) => battleList.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN]);
const getFirstPickSubset = (battleList) => battleList.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK]);
const getSecondPickSubset = (battleList) => battleList.filter((b) => !b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK]);
const isIncomplete = (b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.TURNS] === 0;
const NA = "N/A";
function toPercent(value) {
    return (value * 100).toFixed(2) + "%";
}
function divideToPercentString(a, b) {
    return b !== 0 ? toPercent(a / b) : toPercent(0);
}
function getCR(battle, heroName) {
    const entry = battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR].find((entry) => entry[0] === heroName);
    return entry ? entry[1] : null;
}
function queryStats(battleList, totalBattles, heroName) {
    const gamesWon = getWins(battleList).length;
    const gamesAppeared = battleList.length;
    const appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
    const winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;
    const postBanned = battleList.reduce((acc, b) => acc +
        +(b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName ||
            b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName), 0);
    const successes = battleList.reduce((acc, b) => acc +
        +(b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN] ||
            b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName ||
            b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName), 0);
    const pointGain = battleList.reduce((acc, b) => acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.POINT_GAIN] || 0), 0);
    let gamesConsidered = 0;
    let crTotal = 0;
    let firstTurns = 0;
    for (const battle of battleList) {
        const cr = getCR(battle, heroName);
        if (cr !== null && cr !== 0) {
            gamesConsidered += 1;
            crTotal += cr;
            if (cr === 100) {
                firstTurns += 1;
            }
        }
    }
    const avgCR = divideToPercentString(crTotal / 100, gamesConsidered);
    return {
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME]: heroName,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.BATTLES]: gamesAppeared,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PICK_RATE]: toPercent(appearanceRate),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WINS]: gamesWon,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WIN_RATE]: toPercent(winRate),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBANS]: postBanned,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE]: divideToPercentString(postBanned, gamesAppeared),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE]: divideToPercentString(successes, gamesAppeared),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PLUS_MINUS]: 2 * gamesWon - gamesAppeared,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POINT_GAIN]: pointGain,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.AVG_CR]: avgCR,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURNS]: firstTurns,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE]: divideToPercentString(firstTurns, gamesConsidered),
    };
}
function getPrimes(battleList, isP1 = true) {
    const primeSet = new Set();
    for (const battle of Object.values(battleList)) {
        const picks = isP1
            ? battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES]
            : battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIMES];
        picks.forEach((element) => {
            primeSet.add(element);
        });
    }
    return primeSet;
}
function getHeroStats(battleList, HeroDicts) {
    if (battleList.length === 0) {
        return { playerHeroStats: [], enemyHeroStats: [] };
    }
    const totalBattles = battleList.length;
    const playerPrimes = getPrimes(battleList, true);
    const enemyPrimes = getPrimes(battleList, false);
    const playerHeroStats = [];
    const enemyHeroStats = [];
    for (const prime of playerPrimes) {
        const hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts);
        if (!hero)
            continue;
        const playerSubset = battleList.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES].includes(prime));
        if (playerSubset.length > 0) {
            playerHeroStats.push(queryStats(playerSubset, totalBattles, hero.name));
        }
    }
    for (const prime of enemyPrimes) {
        const hero = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts);
        if (!hero)
            continue;
        const enemySubset = battleList.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIMES].includes(prime));
        if (enemySubset.length > 0) {
            enemyHeroStats.push(queryStats(enemySubset, totalBattles, hero.name));
        }
    }
    const nameCol = _references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME;
    return {
        playerHeroStats: playerHeroStats.sort((b1, b2) => b1[nameCol].localeCompare(b2[nameCol])),
        enemyHeroStats: enemyHeroStats.sort((b1, b2) => b1[nameCol].localeCompare(b2[nameCol])),
    };
}
function getFirstPickStats(battleList, HeroDicts) {
    battleList = getFirstPickSubset(Object.values(battleList));
    if (battleList.length === 0) {
        return [];
    }
    const totalBattles = battleList.length;
    const grouped = {};
    for (const b of battleList) {
        if (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES].length === 0)
            continue; // skip any battle where player didn't get to pick a first unit
        const hero = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES][0];
        if (!(hero in grouped))
            grouped[hero] = { wins: 0, appearances: 0 };
        grouped[hero].wins += +b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
        grouped[hero].appearances += 1;
    }
    const result = Object.entries(grouped).map(([prime, stats]) => {
        const name = _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HeroDicts)?.name ?? _hero_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].EMPTY_NAME;
        return {
            hero: name,
            wins: stats.wins,
            appearances: stats.appearances,
            win_rate: toPercent(stats.wins / stats.appearances),
            appearance_rate: toPercent(stats.appearances / totalBattles),
            "+/-": 2 * stats.wins - stats.appearances,
        };
    });
    result.sort((a, b) => b.appearances - a.appearances);
    return result;
}
function getPrebanStats(battleList, HeroDicts) {
    //console.log(`Got HeroDicts: ${HeroDicts}`);
    const emptyPrime = HeroDicts.Empty.prime;
    if (battleList.length === 0) {
        return [];
    }
    function getValidPrimes(index) {
        const primes = battleList.map((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES][index]).filter((p) => p !== null);
        return new Set(primes);
    }
    const preban1Set = getValidPrimes(0);
    const preban2Set = getValidPrimes(1);
    const prebanSet = new Set([...preban1Set, ...preban2Set]);
    let prebans = [];
    for (const prime of prebanSet) {
        prebans.push(prime);
    }
    for (const a of prebanSet) {
        for (const b of prebanSet) {
            if (a < b)
                prebans.push(a * b);
        }
    }
    const totalBattles = battleList.length;
    const output = [];
    for (const preban of prebans) {
        const filtered = battleList.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES].includes(preban));
        const appearances = filtered.length;
        if (appearances < 1) {
            continue;
        }
        const wins = filtered.reduce((acc, b) => acc + +b.Win, 0);
        const appearanceRate = totalBattles > 0 ? appearances / totalBattles : 0;
        const winRate = appearances > 0 ? wins / appearances : 0;
        const plusMinus = 2 * wins - appearances;
        output.push({
            preban: HeroDicts.prime_pair_lookup[preban],
            wins: wins,
            appearances: appearances,
            appearance_rate: toPercent(appearanceRate),
            win_rate: toPercent(winRate),
            "+/-": plusMinus,
        });
    }
    output.sort((a, b) => b.appearances - a.appearances);
    return output;
}
function secondsToTimeStr(inputSeconds) {
    let timeStr;
    const mins = Math.floor(inputSeconds / 60);
    const secs = (inputSeconds % 60).toFixed(1);
    if (mins === 0) {
        timeStr = `${secs} secs`;
    }
    else {
        timeStr = `${mins} : ${secs}s`;
    }
    return timeStr;
}
function getGeneralStats(battleList) {
    battleList.sort((b1, b2) => new Date(b1["Date/Time"]).getTime() - new Date(b2["Date/Time"]).getTime());
    const totalBattles = battleList.length;
    const totalGain = battleList.reduce((acc, b) => acc + (b["Point Gain"] || 0), 0);
    const avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;
    const totalTurns = battleList.reduce((acc, b) => acc + b["Turns"], 0);
    const avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
    const maxTurns = battleList.length > 0 ? Math.max(...battleList.map((b) => b["Turns"])) : 0;
    const totalSeconds = battleList.reduce((acc, b) => acc + b["Seconds"], 0);
    const avgSeconds = totalBattles > 0 ? totalSeconds / totalBattles : 0;
    const maxSeconds = battleList.length > 0
        ? Math.max(...battleList.map((b) => b["Seconds"]))
        : 0;
    let avgTimeStr = secondsToTimeStr(avgSeconds);
    let maxTimeStr = secondsToTimeStr(maxSeconds);
    const totalFirstTurnGames = battleList.reduce((acc, b) => acc + +b["First Turn"], 0);
    // create subsets for first pick and second pick battles
    const fpBattles = getFirstPickSubset(battleList);
    const spBattles = getSecondPickSubset(battleList);
    // get counts for first pick and second pick battles
    const fpCount = fpBattles.length;
    const spCount = spBattles.length;
    // calculate wins for first pick and second pick battles
    const fpWins = fpBattles.reduce((acc, b) => acc + +b.Win, 0);
    const spWins = spBattles.reduce((acc, b) => acc + +b.Win, 0);
    // calculate rate of occurrence for first pick and second pick battles
    const fpR = totalBattles ? fpCount / totalBattles : 0;
    const spR = totalBattles ? spCount / totalBattles : 0;
    // calculate win rate for first pick and second pick battles
    const fpWR = fpCount ? fpWins / fpCount : 0;
    const spWR = spCount ? spWins / spCount : 0;
    // calculate total win rate
    const winRate = totalBattles ? (fpWins + spWins) / totalBattles : 0;
    // iterate through battles and calculate longest win/loss streaks
    let [maxWinStreak, maxLossStreak, winStreak, lossStreak] = [0, 0, 0, 0];
    for (let b of battleList) {
        if (b.Win) {
            winStreak += 1;
            maxWinStreak = Math.max(maxWinStreak, winStreak);
            lossStreak = 0;
        }
        else {
            winStreak = 0;
            lossStreak += 1;
            maxLossStreak = Math.max(maxLossStreak, lossStreak);
        }
    }
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
        first_turn_rate: totalBattles
            ? toPercent(totalFirstTurnGames / totalBattles)
            : NA,
    };
}
function getPerformanceStats(battlesList) {
    const perfStatsContainer = {
        servers: [],
        leagues: [],
    };
    const totalBattles = battlesList.length;
    const servers = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR);
    const leagues = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_TO_CLEAN_STR);
    const subsetFilters = [
        ...servers.map((server) => [
            `Server: ${server}`,
            (b) => b["P2 Server"] === server,
        ]),
        ...leagues.map((league) => [
            `League: ${league}`,
            (b) => b["P2 League"] === league,
        ]),
    ];
    for (const [label, subsetFilter] of subsetFilters) {
        const subset = battlesList.filter(subsetFilter);
        if (subset.length === 0)
            continue;
        const count = subset.length;
        const wins = subset.reduce((acc, b) => acc + +b.Win, 0);
        const winRate = count > 0 ? toPercent(wins / count) : NA;
        const frequency = totalBattles > 0 ? toPercent(count / totalBattles) : NA;
        const firstPickGames = subset.filter((b) => b["First Pick"]);
        const fpWins = firstPickGames.reduce((acc, b) => acc + +b.Win, 0);
        const secondPickGames = subset.filter((b) => !b["First Pick"]);
        const spWins = secondPickGames.reduce((acc, b) => acc + +b.Win, 0);
        const targetList = label.toLowerCase().includes("server")
            ? perfStatsContainer.servers
            : perfStatsContainer.leagues;
        targetList.push({
            label,
            count,
            wins,
            win_rate: winRate,
            frequency: frequency,
            "+/-": 2 * wins - count,
            fp_games: firstPickGames.length,
            sp_games: secondPickGames.length,
            fp_wr: firstPickGames.length > 0
                ? toPercent(fpWins / firstPickGames.length)
                : "N/A",
            sp_wr: secondPickGames.length > 0
                ? toPercent(spWins / secondPickGames.length)
                : "N/A",
        });
    }
    return [
        ...perfStatsContainer.servers,
        ...perfStatsContainer.leagues.slice(-4),
    ];
}
let StatsBuilder = {
    getHeroStats,
    getFirstPickStats,
    getPrebanStats,
    getPerformanceStats,
    getGeneralStats,
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
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   validateUserFormat: () => (/* binding */ validateUserFormat)
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
function validateUserFormat(user) {
    if (!user) {
        throw new Error("Invalid user; user is null or undefined");
    }
    if (!("id" in user) || typeof user.id !== "number") {
        throw new Error("Invalid user; user.id does not exist or is not a number");
    }
    if (!("name" in user) || typeof user.name !== "string") {
        throw new Error("Invalid user; user.name does not exist or is not a string");
    }
    if (!("code" in user) || typeof user.code !== "string") {
        throw new Error("Invalid user; user.code does not exist or is not a string");
    }
    if (!("rank" in user) || typeof user.rank !== "number") {
        throw new Error("Invalid user; user.rank does not exist or is not a number");
    }
    if (!("world_code" in user) || typeof user.world_code !== "string") {
        throw new Error("Invalid user; user.world_code does not exist or is not a string");
    }
    if (!(user.world_code in _references_ts__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_TO_CLEAN_STR)) {
        throw new Error("Invalid user; user.world_code is not a valid world code");
    }
    return true;
}
function createUser(userJSON, world_code) {
    return {
        id: Number(userJSON.nick_no),
        name: userJSON.nick_nm,
        code: userJSON.code,
        rank: Number(userJSON.rank),
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
        const user = await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].setTimestampNow(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
        return user;
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

/***/ "./static/assets/js/export-import-data-tools.ts":
/*!******************************************************!*\
  !*** ./static/assets/js/export-import-data-tools.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ExportImportFns: () => (/* binding */ ExportImportFns)
/* harmony export */ });
/* harmony import */ var _content_manager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./content-manager */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _e7_user_manager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./e7/user-manager */ "./static/assets/js/e7/user-manager.ts");
/*
This script is used to export the current data selected by user (without filters applied) as a JSON file.
Additional data like the user is also exported.

It also has functions to parse uploaded JSON files back into the original format.
*/




function convertBattlesToExportFormat(battles) {
    const headers = _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns;
    const rows = battles.map(battle => _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.map(key => JSON.stringify(battle[key])));
    return { headers, rows };
}
function constructJSON(user, battlesList, filterStr) {
    const exportData = {
        user,
        filterStr,
        battles: { headers: [], rows: [] },
    };
    exportData.battles = convertBattlesToExportFormat(Object.values(battlesList));
    return exportData;
}
function downloadExportJSON(filename, data) {
    const jsonStr = JSON.stringify(data);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
async function triggerDownload() {
    const user = await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.UserManager.getUser();
    if (!user) {
        throw new Error("User not found; cannot export data without an active user");
    }
    const stats = await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.ClientCache.getStats();
    const filterStr = await _content_manager__WEBPACK_IMPORTED_MODULE_0__.ContentManager.ClientCache.getFilterStr() || undefined;
    const filtersAppliedStr = stats.areFiltersApplied ? " Filtered" : "";
    let battlesList = stats.areFiltersApplied ? Object.values(stats.filteredBattlesObj) : stats.battles;
    battlesList = battlesList || [];
    const data = await constructJSON(user, battlesList, filterStr);
    const timestamp = new Date().toISOString().split("T")[0] || "";
    const fileName = `${user.name} (${user.id})${filtersAppliedStr} ${timestamp}`;
    downloadExportJSON(fileName, data);
}
function validateUploadedFile(file, extension = ".json", maxMB = 60) {
    if (!file.name.endsWith(".json")) {
        throw new Error("File must be .json");
    }
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new Error(`File must be smaller than ${maxMB}mb, got ${file.size / (1024 * 1024)}mb File.`);
    }
}
function validateUploadedBattles(data) {
    if (!data || typeof data !== "object") {
        return false;
    }
    if (!("headers" in data) || !Array.isArray(data.headers)) {
        throw new Error("Invalid upload: missing headers field");
    }
    if (data.headers.length !== _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.length) {
        throw new Error(`Invalid upload: expected ${_e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.length} headers, got ${data.headers.length}`);
    }
    for (let i = 0; i < _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.length; i++) {
        if (_e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns[i] !== data.headers[i]) {
            throw new Error(`Invalid upload: headers do not match at index ${i}; expected ${_e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns[i]}, got ${data.headers[i]}`);
        }
    }
    if (!("rows" in data) || !Array.isArray(data.rows)) {
        throw new Error("Invalid upload: missing rows field or rows is not an array");
    }
    if (data.rows.length === 0) {
        throw new Error("Invalid upload: uploaded data has no battles");
    }
    for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        if (row.length !== _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.length) {
            throw new Error(`Invalid upload: expected ${_e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.length} columns per row, got ${row.length} at index ${i}`);
        }
    }
    return true;
}
function validateFileContent(data) {
    if (!data || typeof data !== "object") {
        throw new Error("Invalid upload: data is null, undefined, or not an object");
    }
    if (!("user" in data)) {
        throw new Error("Invalid upload: missing 'user' field");
    }
    (0,_e7_user_manager__WEBPACK_IMPORTED_MODULE_2__.validateUserFormat)(data.user);
    if (!("battles" in data)) {
        throw new Error("Invalid upload: missing 'battles' field");
    }
    validateUploadedBattles(data.battles);
    return true;
}
async function parseJSON(file) {
    validateUploadedFile(file);
    const jsonStr = await file.text();
    const data = JSON.parse(jsonStr);
    console.log("Parsed JSON:", data);
    validateFileContent(data);
    return data;
}
function validateRawBattles(rawBattles) {
    const p1IdSet = new Set(rawBattles.map(battle => battle[_e7_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_ID]));
    const p1ServerSet = new Set(rawBattles.map(battle => battle[_e7_references__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_SERVER]));
    if (p1IdSet.size !== 1) {
        throw new Error(`Invalid upload: Multiple P1 IDs found in upload: {${Array.from(p1IdSet).join(", ")}}`);
    }
    if (p1ServerSet.size !== 1) {
        throw new Error(`Invalid upload: Multiple P1 Servers found in upload: {${Array.from(p1ServerSet).join(", ")}}`);
    }
    const server = p1ServerSet.values().next().value?.replace(/"|'/g, "");
    if (!server || !Object.values(_e7_references__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR).includes(server)) {
        throw new Error(`Invalid upload: Invalid P1 Server found in upload: '${server}'`);
    }
    return true;
}
function restructureParsedUploadBattles(battles) {
    const rawBattlesList = [];
    for (const battle of battles.rows) {
        const battleObj = {};
        _e7_references__WEBPACK_IMPORTED_MODULE_1__.ExportColumns.forEach((header, i) => {
            battleObj[header] = battle[i];
        });
        rawBattlesList.push(battleObj);
    }
    validateRawBattles(rawBattlesList);
    return rawBattlesList;
}
const ExportImportFns = {
    triggerDownload,
    parseJSON,
    restructureParsedUploadBattles
};


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

/***/ "./static/assets/js/pages/home-page/home-page-build-tables.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-build-tables.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildTables: () => (/* binding */ buildTables)
/* harmony export */ });
/* harmony import */ var _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../html-constructor/html-constructor.ts */ "./static/assets/js/pages/html-constructor/html-constructor.ts");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../e7/references.ts */ "./static/assets/js/e7/references.ts");



var HERO_TBL_COLS = ["Hero Name", "Battles", "Pick Rate", "Wins", "Win Rate", "Postban Rate", "Success Rate", "+/-", "Point Gain", "Avg CR", "First Turn Rate"];
var TO_BUILD = [{
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SEASON_DETAILS_TBL,
  cols: ["", "Season", "Start", "End", "Status"]
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PERFORMANCE_STATS_TBL,
  cols: ["", "Battles", "Freq", "Wins", "Win Rate", "+/-", "FP WR", "SP WR"]
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.FIRST_PICK_STATS_TBL,
  cols: ["Hero", "Battles", "Pick Rate", "Win Rate", "+/-"]
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PREBAN_STATS_TBL,
  cols: ["Preban", "Battles", "Ban Rate", "Win Rate", "+/-"]
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.PLAYER_TBL,
  cols: HERO_TBL_COLS
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.OPPONENT_TBL,
  cols: HERO_TBL_COLS.filter(function (col) {
    return !col.toLowerCase().includes("success");
  })
}, {
  tbl: _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.BATTLES_TBL,
  cols: Object.values(_e7_references_ts__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP).filter(function (col) {
    return !col.toLowerCase().includes("prime");
  })
}];
function buildTable(tableElt, cols) {
  var id = tableElt.id;
  var constructor = new _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_0__.TableConstructor(tableElt, id + "-head", id + "-body");
  constructor.addColumns(cols);
}
function buildTables() {
  TO_BUILD.forEach(function (entry) {
    buildTable(entry.tbl, entry.cols);
  });
}

/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-context.js":
/*!***************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-context.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CONTEXT: () => (/* binding */ CONTEXT)
/* harmony export */ });
/* harmony import */ var _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../page-utilities/page-state-references.js */ "./static/assets/js/pages/page-utilities/page-state-references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Reference for context flags that are used within single pages to communicate accross vies for the page


var SOURCE_CONTEXT_VALUES = {
  QUERY: "query",
  UPLOAD: "upload",
  STATS: "stats"
};
var CONTEXT_VALUES = {
  SOURCE: SOURCE_CONTEXT_VALUES
};
var SCROLL_PERCENTS = _defineProperty(_defineProperty(_defineProperty(_defineProperty({}, _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, 0), _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS, 0), _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA, 0), "toString", function toString() {
  return JSON.stringify(this, null, 2);
});
var CONTEXT_KEYS = {
  SOURCE: "SOURCE",
  AUTO_ZOOM: "AUTO_ZOOM",
  AUTO_QUERY: "AUTO_QUERY",
  STATS_POST_RENDER_COMPLETED: "STATS_POST_RENDER_COMPLETED",
  STATS_PRE_RENDER_COMPLETED: "STATS_PRE_RENDER_COMPLETED",
  HOME_PAGE_STATE: "STATE",
  SCROLL_PERCENTS: "SCROLL_PERCENTS",
  CODE_MIRROR_EDITOR: "CODE_MIRROR_EDITOR",
  TRY_SET_USER: "TRY_SET_USER",
  IGNORE_RELAYOUT: "IGNORE_RELAYOUT"
};
function getContext() {
  var CONTEXT = {
    KEYS: CONTEXT_KEYS,
    VALUES: CONTEXT_VALUES,
    SOURCE: null,
    AUTO_QUERY: null,
    AUTO_ZOOM: false,
    STATS_POST_RENDER_COMPLETED: false,
    STATS_PRE_RENDER_COMPLETED: false,
    HOME_PAGE_STATE: null,
    SCROLL_PERCENTS: _objectSpread({}, SCROLL_PERCENTS),
    CODE_MIRROR_EDITOR: null,
    TRY_SET_USER: null,
    IGNORE_RELAYOUT: false,
    popKey: function popKey(key) {
      var value = this[key];
      this[key] = this._getDefault(key);
      return value;
    },
    readKey: function readKey(key) {
      return this[key];
    },
    _getDefault: function _getDefault(key) {
      switch (key) {
        case CONTEXT_KEYS.AUTO_ZOOM:
          return false;
        case CONTEXT_KEYS.SOURCE:
          return null;
        case CONTEXT_KEYS.AUTO_QUERY:
          return null;
        case CONTEXT_KEYS.STATS_POST_RENDER_COMPLETED:
          return false;
        case CONTEXT_KEYS.STATS_PRE_RENDER_COMPLETED:
          return false;
        case CONTEXT_KEYS.HOME_PAGE_STATE:
          return null;
        case CONTEXT_KEYS.SCROLL_PERCENTS:
          return SCROLL_PERCENTS;
        case CONTEXT_KEYS.CODE_MIRROR_EDITOR:
          throw new Error("No default value for key: ".concat(key, " ; do not use popKey or _getDefault for this key"));
        case CONTEXT_KEYS.TRY_SET_USER:
          return null;
        case CONTEXT_KEYS.IGNORE_RELAYOUT:
          return false;
        default:
          return null;
      }
    },
    toString: function toString() {
      var str = "CONTEXT:\n";
      for (var key in CONTEXT_KEYS) {
        str += "\t".concat(key, ": ").concat(this[key], "\n");
      }
      return str;
    }
  };
  console.log("INITIALIZED CONTEXT: ", CONTEXT.toString());
  return CONTEXT;
}
var CONTEXT = getContext();


/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-dispatch.js":
/*!****************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-dispatch.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   resizeRankPlot: () => (/* binding */ resizeRankPlot),
/* harmony export */   stateDispatcher: () => (/* binding */ stateDispatcher)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./page-views/home-page/select-data/select-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js");
/* harmony import */ var _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./page-views/home-page/stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./page-views/home-page/load-data/load-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }







function resizeRankPlot() {
  if (!_home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_PRE_RENDER_COMPLETED) return;
  _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.IGNORE_RELAYOUT = true;
  setTimeout(function () {
    Plotly.Plots.resize(document.getElementById("rank-plot"));
  }, 20);
}

/**
 * If necessary, runs pre and post render logic for stats page.
 * This function is necessary because the stats page has elements that can
 * only be fully initialized when the page is visible.
 * The pre and post render logic for the stats view is only run once per accessing of the home page.
 * @param {function(HOME_PAGE_STATE)} stateDispatcher - function to dispatch to a new state
 */
function resolveShowStatsDispatch(_x) {
  return _resolveShowStatsDispatch.apply(this, arguments);
}
function _resolveShowStatsDispatch() {
  _resolveShowStatsDispatch = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(stateDispatcher) {
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          if (_home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_PRE_RENDER_COMPLETED) {
            _context.n = 2;
            break;
          }
          console.log("Running stats pre render logic");
          _context.n = 1;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.preFirstRenderLogic(stateDispatcher);
        case 1:
          // if stats page is accessed from outside home page, must populate content, otherwise load data logic will
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_PRE_RENDER_COMPLETED = true;
          console.log("Completed stats pre render logic");
        case 2:
          _context.n = 3;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.runLogic(stateDispatcher);
        case 3:
          _context.n = 4;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS);
        case 4:
          if (_home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_POST_RENDER_COMPLETED) {
            _context.n = 6;
            break;
          }
          console.log("Running stats post render logic");
          _context.n = 5;
          return _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_2__.StatsView.postFirstRenderLogic();
        case 5:
          // will resize code mirror appropriately
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.STATS_POST_RENDER_COMPLETED = true;
          console.log("Completed stats post render logic");
        case 6:
          resizeRankPlot();
        case 7:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _resolveShowStatsDispatch.apply(this, arguments);
}
function preDispatchLogic() {
  return _preDispatchLogic.apply(this, arguments);
} // switches among view states for the home page
function _preDispatchLogic() {
  _preDispatchLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var currentState;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
        case 1:
          currentState = _context2.v;
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.SCROLL_PERCENTS[currentState] = _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].getScrollPercent();
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__.TextController.clearMessages();
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_4__.TextController.processQueue();
        case 2:
          return _context2.a(2);
      }
    }, _callee2);
  }));
  return _preDispatchLogic.apply(this, arguments);
}
function stateDispatcher(_x2) {
  return _stateDispatcher.apply(this, arguments);
}
function _stateDispatcher() {
  _stateDispatcher = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(state) {
    var scrollPercent, _t;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          console.log("Switching to state: ".concat(state, ", with CONTEXT: "), _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.toString());
          if ((0,_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.validateState)(state)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          preDispatchLogic();
          _context3.n = 2;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(state);
        case 2:
          _t = state;
          _context3.n = _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA ? 3 : _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS ? 6 : _t === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA ? 8 : 11;
          break;
        case 3:
          _context3.n = 4;
          return _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_1__.SelectDataView.runLogic(stateDispatcher);
        case 4:
          _context3.n = 5;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(state);
        case 5:
          return _context3.a(3, 12);
        case 6:
          _context3.n = 7;
          return resolveShowStatsDispatch(stateDispatcher);
        case 7:
          return _context3.a(3, 12);
        case 8:
          _context3.n = 9;
          return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_FNS.homePageSetView(state);
        case 9:
          _context3.n = 10;
          return _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_3__.LoadDataView.runLogic(stateDispatcher);
        case 10:
          return _context3.a(3, 12);
        case 11:
          console.error("Invalid page state: ".concat(state));
        case 12:
          // persist scroll position between view state changes ; will reset after leaving page
          scrollPercent = _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.SCROLL_PERCENTS[state];
          setTimeout(function () {
            _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].setScrollPercent(scrollPercent);
          }, 0);
        case 13:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _stateDispatcher.apply(this, arguments);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/home-page-listeners.js":
/*!*****************************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page-listeners.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addHomePageListeners: () => (/* binding */ addHomePageListeners)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/nav-bar-utils.ts */ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./home-page-dispatch.js */ "./static/assets/js/pages/home-page/home-page-dispatch.js");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }








function addNavListener() {
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
        var navType, currentState, user;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              navType = this.dataset.nav;
              console.log("Clicked nav item:", navType);
              _context.n = 1;
              return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
            case 1:
              currentState = _context.v;
              if (!Object.values(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES).includes(navType)) {
                _context.n = 6;
                break;
              }
              if (!(currentState === navType)) {
                _context.n = 2;
                break;
              }
              console.log("Already in state: ".concat(currentState, " ; returning"));
              return _context.a(2);
            case 2:
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA)) {
                _context.n = 3;
                break;
              }
              (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              _context.n = 5;
              break;
            case 3:
              if (!(navType === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS)) {
                _context.n = 5;
                break;
              }
              _context.n = 4;
              return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"].getUser();
            case 4:
              user = _context.v;
              // Stats will not show if there is no active user ; will redirect to select data view with error
              if (!user) {
                _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgRed("User not found; Must either query a valid user or upload battles to view hero stats");
                (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              } else {
                (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS, _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT);
              }
            case 5:
              _context.n = 7;
              break;
            case 6:
              // Default behavior continues as normal
              console.log("Navigating to: ".concat(this.href));
            case 7:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
  });
}
function addClearDataBtnListener() {
  _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_4__["default"].NAV_BAR.CLEAR_DATA_BTN.addEventListener("click", /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(_event) {
      var user;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_5__["default"].getUser();
          case 1:
            user = _context2.v;
            if (!user) {
              _context2.n = 4;
              break;
            }
            _context2.n = 2;
            return _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.eraseUserFromPage();
          case 2:
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Cleared data of user ".concat(user.name, " (").concat(user.id, ")"));
            _context2.n = 3;
            return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 3:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SCROLL_PERCENTS[_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS] = 0; // reset scroll position of show stats page when user data cleared
            _context2.n = 5;
            break;
          case 4:
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Data already cleared");
            _context2.n = 5;
            return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          case 5:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }());
}
function addSideBarHideListener() {
  _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_4__["default"].NAV_BAR.SIDEBAR_HIDE_BTN.addEventListener("click", function (_event) {
    console.log("Triggered sidebar listener");
    (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.resizeRankPlot)();
  });
}
function addSideBarListener() {
  _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_4__["default"].NAV_BAR.SIDEBAR_CONTROL.addEventListener("click", function (_event) {
    console.log("Triggered sidebar listener");
    (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_6__.resizeRankPlot)();
  });
}
function addHomePageListeners() {
  addNavListener();
  addClearDataBtnListener();
  addSideBarHideListener();
  addSideBarListener();
}

/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js":
/*!************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addLoadDataListeners: () => (/* binding */ addLoadDataListeners)
/* harmony export */ });
function addLoadDataListeners(_) {}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js":
/*!********************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js ***!
  \********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LoadDataView: () => (/* binding */ LoadDataView)
/* harmony export */ });
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../e7/filter-parsing/filter-parser.ts */ "./static/assets/js/e7/filter-parsing/filter-parser.ts");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../content-manager.ts */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../page-utilities/nav-bar-utils.ts */ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts");
/* harmony import */ var _load_data_listeners_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./load-data-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-listeners.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../../../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _export_import_data_tools_ts__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../../../../export-import-data-tools.ts */ "./static/assets/js/export-import-data-tools.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }










function processUpload() {
  return _processUpload.apply(this, arguments);
}
function _processUpload() {
  _processUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var selectedFile, uploadedData, battleArr, uploadedUser, user;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.get(_content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.Keys.RAW_UPLOAD);
        case 1:
          selectedFile = _context.v;
          console.log("Retrieved Upload: ", selectedFile);
          _context.n = 2;
          return _export_import_data_tools_ts__WEBPACK_IMPORTED_MODULE_9__.ExportImportFns.parseJSON(selectedFile);
        case 2:
          uploadedData = _context.v;
          battleArr = _export_import_data_tools_ts__WEBPACK_IMPORTED_MODULE_9__.ExportImportFns.restructureParsedUploadBattles(uploadedData.battles);
          uploadedUser = uploadedData.user;
          _context.n = 3;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.UserManager.findUser(uploadedUser);
        case 3:
          user = _context.v;
          if (user) {
            _context.n = 4;
            break;
          }
          console.log("Failed to find user with ID during upload verification:", playerID);
          console.log("Setting Error Message:", "User not found");
          throw new Error("File Upload Error: User not found");
        case 4:
          return _context.a(2, {
            user: user,
            battleArr: battleArr
          });
      }
    }, _callee);
  }));
  return _processUpload.apply(this, arguments);
}
function handleBattleQuery(_x, _x2) {
  return _handleBattleQuery.apply(this, arguments);
}
function _handleBattleQuery() {
  _handleBattleQuery = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(user, HeroDicts) {
    var artifacts, response, data, _data, rawBattles;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          console.log("querying and caching user battles for user: ", JSON.stringify(user));
          _context2.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ArtifactManager.getArtifactCodeToNameMap();
        case 1:
          artifacts = _context2.v;
          _context2.n = 2;
          return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_8__["default"].rsFetchBattleData(user);
        case 2:
          response = _context2.v;
          console.log("Got response", response);
          if (response.ok) {
            _context2.n = 4;
            break;
          }
          _context2.n = 3;
          return response.json();
        case 3:
          data = _context2.v;
          throw new Error(data.error);
        case 4:
          _context2.n = 5;
          return response.json();
        case 5:
          _data = _context2.v;
          rawBattles = _data.battles;
          _context2.n = 6;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.BattleManager.cacheQuery(rawBattles, HeroDicts, artifacts);
        case 6:
          console.log("Cached queried battles");
        case 7:
          return _context2.a(2);
      }
    }, _callee2);
  }));
  return _handleBattleQuery.apply(this, arguments);
}
function redirectError(_x3, _x4, _x5) {
  return _redirectError.apply(this, arguments);
}
function _redirectError() {
  _redirectError = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(err, source, stateDispatcher) {
    var sourceState, _ref, QUERY, UPLOAD, STATS;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _ref = [_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY, _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.UPLOAD, _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.STATS], QUERY = _ref[0], UPLOAD = _ref[1], STATS = _ref[2];
          if (source === QUERY || source === UPLOAD) {
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_5__.TextUtils.queueSelectDataMsgRed("Failed to load data: ".concat(err.message));
          } else if (source === STATS) {
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SHOW_STATS;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_5__.TextUtils.queueFilterMsgRed("Failed to load data: ".concat(err.message));
          } else {
            console.error("Invalid source: ".concat(source, " ; redirecting to select data"));
            sourceState = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA;
            _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_5__.TextUtils.queueSelectDataMsgRed("Failed to load data: ".concat(err.message));
          }
          console.error(err);
          _context3.n = 1;
          return _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_6__.NavBarUtils.eraseUserFromPage();
        case 1:
          _context3.n = 2;
          return stateDispatcher(sourceState);
        case 2:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _redirectError.apply(this, arguments);
}
function try_find_user(_x6) {
  return _try_find_user.apply(this, arguments);
}
function _try_find_user() {
  _try_find_user = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(userObj) {
    var user;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          console.log("Finding User using:", userObj);
          _context4.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.UserManager.findUser(userObj);
        case 1:
          user = _context4.v;
          console.log("Got data:", JSON.stringify(user));
          if (!(user !== null)) {
            _context4.n = 2;
            break;
          }
          return _context4.a(2, user);
        case 2:
          return _context4.a(2, null);
      }
    }, _callee4);
  }));
  return _try_find_user.apply(this, arguments);
}
function replaceUser(_x7) {
  return _replaceUser.apply(this, arguments);
}
function _replaceUser() {
  _replaceUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(user) {
    var lang;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _context5.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.UserManager.clearUserData();
        case 1:
          _context5.n = 2;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.UserManager.setUser(user);
        case 2:
          _context5.n = 3;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.LangManager.getLang();
        case 3:
          lang = _context5.v;
          _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_6__.NavBarUtils.writeUserInfo(user, lang);
        case 4:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _replaceUser.apply(this, arguments);
}
function runLogic(_x8) {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var HeroDicts, SOURCE, autoQuery, user, result, userObj, battles, battlesList, filters, stats, _t, _t2, _t3;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          HeroDicts = null, SOURCE = null, autoQuery = null;
          _context6.p = 1;
          _context6.n = 2;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.HeroManager.getHeroDicts();
        case 2:
          HeroDicts = _context6.v;
          SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.SOURCE);
          autoQuery = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.AUTO_QUERY);
          _context6.n = 5;
          break;
        case 3:
          _context6.p = 3;
          _t = _context6.v;
          console.error("Could not load reference and context variables: ", _t);
          _context6.n = 4;
          return stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA);
        case 4:
          return _context6.a(2);
        case 5:
          _context6.p = 5;
          user = null;
          if (!(SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.UPLOAD)) {
            _context6.n = 9;
            break;
          }
          _context6.n = 6;
          return processUpload();
        case 6:
          result = _context6.v;
          user = result.user;
          _context6.n = 7;
          return replaceUser(user);
        case 7:
          _context6.n = 8;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.BattleManager.cacheUpload(result.battleArr, HeroDicts);
        case 8:
          _context6.n = 12;
          break;
        case 9:
          if (!(SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY)) {
            _context6.n = 12;
            break;
          }
          userObj = _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.KEYS.TRY_SET_USER);
          if (!(userObj === null)) {
            _context6.n = 10;
            break;
          }
          throw new Error("TRY_SET_USER User missing from CONTEXT");
        case 10:
          _context6.n = 11;
          return try_find_user(userObj);
        case 11:
          user = _context6.v;
          _context6.n = 12;
          return replaceUser(user);
        case 12:
          if (!(user === null)) {
            _context6.n = 14;
            break;
          }
          _context6.n = 13;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.UserManager.getUser();
        case 13:
          user = _context6.v;
        case 14:
          if (!(autoQuery || SOURCE === _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.VALUES.SOURCE.QUERY)) {
            _context6.n = 15;
            break;
          }
          _context6.n = 15;
          return handleBattleQuery(user, HeroDicts);
        case 15:
          // retrieve the battles from the cache (both uploaded and queried if applicable) and then apply any filters, then compute stats and plots
          console.log("Getting Battles From Cache");
          _context6.n = 16;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.BattleManager.getBattles();
        case 16:
          battles = _context6.v;
          battlesList = Object.values(battles);
          console.log("BATTLES DURING LOAD");
          console.log(battles);
          console.log("Checking if Reacquire of Seasons Details Needed");
          _context6.n = 17;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.SeasonManager.reaquireIfNeeded(battlesList);
        case 17:
          console.log("Getting Filters From Cache");
          _context6.n = 18;
          return _e7_filter_parsing_filter_parser_ts__WEBPACK_IMPORTED_MODULE_2__.FilterParser.getFiltersFromCache(HeroDicts);
        case 18:
          filters = _context6.v;
          console.log("Received Filters: ".concat(JSON.stringify(filters)));
          _context6.n = 19;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.BattleManager.getStats(battles, filters, HeroDicts);
        case 19:
          stats = _context6.v;
          console.log("Got Stats: ", stats);
          _context6.n = 20;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.setStats(stats);
        case 20:
          _context6.n = 21;
          return _stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_4__.StatsView.populateContent();
        case 21:
          // populates tables and plots in show stats view before showing
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_0__.CONTEXT.STATS_PRE_RENDER_COMPLETED = true; // flag that the stats page doesn't need to run populate content itself
          console.log("REACHED END OF LOAD DATA LOGIC");
          _context6.n = 22;
          return stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SHOW_STATS);
        case 22:
          return _context6.a(2);
        case 23:
          _context6.p = 23;
          _t2 = _context6.v;
          _context6.p = 24;
          _context6.n = 25;
          return redirectError(_t2, SOURCE, stateDispatcher);
        case 25:
          return _context6.a(2);
        case 26:
          _context6.p = 26;
          _t3 = _context6.v;
          console.error("Something went wrong ; redirecting to select data ; error:", _t3);
          _context6.n = 27;
          return _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_6__.NavBarUtils.eraseUserFromPage();
        case 27:
          _context6.n = 28;
          return stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_1__.HOME_PAGE_STATES.SELECT_DATA);
        case 28:
          return _context6.a(2);
      }
    }, _callee6, null, [[24, 26], [5, 23], [1, 3]]);
  }));
  return _runLogic.apply(this, arguments);
}
function initialize() {
  (0,_load_data_listeners_js__WEBPACK_IMPORTED_MODULE_7__.addLoadDataListeners)();
}
var LoadDataView = {
  runLogic: runLogic,
  initialize: initialize
};


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js":
/*!****************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js ***!
  \****************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addSelectDataListeners: () => (/* binding */ addSelectDataListeners)
/* harmony export */ });
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../../content-manager.ts */ "./static/assets/js/content-manager.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }





function writeMsgRed(msg) {
  _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextController.write(new _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextPacket(msg, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.SELECT_DATA_MSG, [_orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_3__.TextController.STYLES.RED]));
}
function addUserFormListener(_x) {
  return _addUserFormListener.apply(this, arguments);
}
function _addUserFormListener() {
  _addUserFormListener = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(stateDispatcher) {
    var checkbox, key, form;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          checkbox = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.ID_SEARCH_FLAG;
          key = _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.Keys.ID_SEARCH_FLAG;
          checkbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
            return _regenerator().w(function (_context) {
              while (1) switch (_context.n) {
                case 0:
                  _context.n = 1;
                  return _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.cache(key, checkbox.checked);
                case 1:
                  return _context.a(2);
              }
            }, _callee);
          })));
          form = document.getElementById("userForm"); // Intercept form submission
          form.addEventListener("submit", /*#__PURE__*/function () {
            var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(event) {
              var data, name, world_code, idSearchFlag, userObj, _t;
              return _regenerator().w(function (_context2) {
                while (1) switch (_context2.n) {
                  case 0:
                    console.log("Processing User Submission");
                    event.preventDefault(); // Prevent actual form submission to server
                    data = new FormData(form);
                    name = data.get("username");
                    world_code = data.get("server");
                    if (name) {
                      _context2.n = 1;
                      break;
                    }
                    writeMsgRed("Must enter username");
                    _context2.n = 4;
                    break;
                  case 1:
                    _context2.p = 1;
                    _context2.n = 2;
                    return _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.get(_content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.Keys.ID_SEARCH_FLAG);
                  case 2:
                    idSearchFlag = _context2.v;
                    userObj = idSearchFlag ? {
                      id: name,
                      world_code: world_code
                    } : {
                      name: name,
                      world_code: world_code
                    };
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.TRY_SET_USER = userObj;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.AUTO_QUERY = true;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.VALUES.SOURCE.QUERY;
                    stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
                    return _context2.a(2);
                  case 3:
                    _context2.p = 3;
                    _t = _context2.v;
                    console.error("Caught Error:", _t);
                    writeMsgRed(_t.message);
                  case 4:
                    return _context2.a(2);
                }
              }, _callee2, null, [[1, 3]]);
            }));
            return function (_x3) {
              return _ref2.apply(this, arguments);
            };
          }());
        case 1:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _addUserFormListener.apply(this, arguments);
}
function addUploadFormListener(_x2) {
  return _addUploadFormListener.apply(this, arguments);
}
function _addUploadFormListener() {
  _addUploadFormListener = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var checkbox, selectedFile;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          checkbox = document.getElementById("auto-query-flag");
          checkbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.n) {
                case 0:
                  _context4.n = 1;
                  return _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.cache(_content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.Keys.AUTO_QUERY_FLAG, checkbox.checked);
                case 1:
                  return _context4.a(2);
              }
            }, _callee4);
          })));
          selectedFile = null; // Capture file when selected
          _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.CSV_FILE.addEventListener("change", function (event) {
            selectedFile = event.target.files[0];
          });

          // Intercept form submission
          _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.UPLOAD_FORM.addEventListener("submit", /*#__PURE__*/function () {
            var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(event) {
              var autoQueryFlag, _t2;
              return _regenerator().w(function (_context5) {
                while (1) switch (_context5.n) {
                  case 0:
                    console.log("Processing File Submission");
                    event.preventDefault(); // Prevent actual form submission to server

                    // Get its state of auto-query checkbox
                    autoQueryFlag = checkbox.checked;
                    _context5.p = 1;
                    if (selectedFile) {
                      _context5.n = 2;
                      break;
                    }
                    writeMsgRed("Must upload a file");
                    return _context5.a(2);
                  case 2:
                    console.log("Selected File: ".concat(selectedFile.name, " ; content: ").concat(JSON.stringify(selectedFile)));
                    _context5.n = 3;
                    return _content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.cache(_content_manager_ts__WEBPACK_IMPORTED_MODULE_4__.ContentManager.ClientCache.Keys.RAW_UPLOAD, selectedFile);
                  case 3:
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.AUTO_QUERY = autoQueryFlag;
                    _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_1__.CONTEXT.VALUES.SOURCE.UPLOAD;
                    stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
                    return _context5.a(2);
                  case 4:
                    _context5.p = 4;
                    _t2 = _context5.v;
                    console.error("Caught Error:", _t2);
                    writeMsgRed(_t2.message);
                  case 5:
                    return _context5.a(2);
                }
              }, _callee5, null, [[1, 4]]);
            }));
            return function (_x4) {
              return _ref4.apply(this, arguments);
            };
          }());
        case 1:
          return _context6.a(2);
      }
    }, _callee6);
  }));
  return _addUploadFormListener.apply(this, arguments);
}
function addSelectDataListeners(stateDispatcher) {
  addUserFormListener(stateDispatcher);
  addUploadFormListener(stateDispatcher);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js":
/*!************************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SelectDataView: () => (/* binding */ SelectDataView)
/* harmony export */ });
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _select_data_listeners_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./select-data-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-listeners.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



function runLogic() {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var autoQueryFlag, idSearchFlag;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          autoQueryFlag = document.getElementById("auto-query-flag");
          _context.n = 1;
          return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.AUTO_QUERY_FLAG);
        case 1:
          autoQueryFlag.checked = _context.v;
          idSearchFlag = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.ID_SEARCH_FLAG;
          _context.n = 2;
          return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ID_SEARCH_FLAG);
        case 2:
          idSearchFlag.checked = _context.v;
        case 3:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _runLogic.apply(this, arguments);
}
function initialize(stateDispatcher) {
  (0,_select_data_listeners_js__WEBPACK_IMPORTED_MODULE_2__.addSelectDataListeners)(stateDispatcher);
}
var SelectDataView = {
  runLogic: runLogic,
  initialize: initialize
};


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js":
/*!****************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js ***!
  \****************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addPlotlyLineAndMarkWidthListener: () => (/* binding */ addPlotlyLineAndMarkWidthListener),
/* harmony export */   addStatsListeners: () => (/* binding */ addStatsListeners)
/* harmony export */ });
/* harmony import */ var _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../e7/saved-filters.js */ "./static/assets/js/e7/saved-filters.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _populate_content_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../populate-content.js */ "./static/assets/js/populate-content.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../../content-manager.ts */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _e7_plots_ts__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../../../e7/plots.ts */ "./static/assets/js/e7/plots.ts");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }









function addBattleTableFilterToggleListener() {
  console.log("Setting listener for filter-battle-table checkbox");
  var filterBattleTableCheckbox = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE;
  filterBattleTableCheckbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var stats;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          console.log("Toggling Filter Battle Table: ", filterBattleTableCheckbox.checked);
          _context.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.getStats();
        case 1:
          stats = _context.v;
          if (!filterBattleTableCheckbox.checked) {
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.replaceBattleData(stats.battles);
          } else {
            console.log("Replacing table with filtered data:", stats.filteredBattlesObj);
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.replaceBattleData(Object.values(stats.filteredBattlesObj));
          }
        case 2:
          return _context.a(2);
      }
    }, _callee);
  })));
}
function addAutoZoomListener() {
  var autoZoomCheckbox = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.AUTO_ZOOM_FLAG;
  autoZoomCheckbox.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          console.log("Toggling Auto Zoom: ", autoZoomCheckbox.checked);
          _context2.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.cache(_content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.Keys.AUTO_ZOOM_FLAG, autoZoomCheckbox.checked);
        case 1:
          return _context2.a(2);
      }
    }, _callee2);
  })));
}
function addLatestBattlesBtnListener(stateDispatcher) {
  var latestBattlesBtn = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.LATEST_BATTLES_BTN;
  latestBattlesBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          console.log("Clicking Latest Battles Button");
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = true;
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.VALUES.SOURCE.STATS;
          _context3.n = 1;
          return stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__.HOME_PAGE_STATES.LOAD_DATA);
        case 1:
          return _context3.a(2);
      }
    }, _callee3);
  })));
}
function addPremadeFilterButtonListener(editor) {
  // Logic for adding premade filters to filter pane
  document.getElementById("premade-filters").addEventListener("click", function (event) {
    console.log("Attempting to add a premade filter");
    event.preventDefault();
    var target = event.target.closest(".dropdown-item");
    if (!target) return;
    var filterName = target.textContent.trim();
    console.log("Target found:", filterName);
    var currStr = editor.getValue();
    var newStr = _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_0__["default"].extendFilters(currStr, filterName);
    editor.setValue(newStr);
  });
}
function addFilterButtonListeners(editor, stateDispatcher) {
  // Logic for submit buttons on filter pane
  var filterForm = document.getElementById("filterForm");
  filterForm.addEventListener("submit", /*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(event) {
      var clickedButton, action, syntaxStr, appliedFilter, validFilter;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            event.preventDefault(); // Prevent actual form submission to server

            // Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
            document.getElementById("codeArea").value = editor.getValue();
            console.log("Processing Filter Action");
            clickedButton = event.submitter;
            action = clickedButton === null || clickedButton === void 0 ? void 0 : clickedButton.value;
            syntaxStr = editor.getValue();
            _context4.n = 1;
            return _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.getFilterStr();
          case 1:
            appliedFilter = _context4.v;
            if (!(action === "apply")) {
              _context4.n = 5;
              break;
            }
            _context4.n = 2;
            return _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].validateFilterSyntax(syntaxStr);
          case 2:
            validFilter = _context4.v;
            if (!validFilter) {
              _context4.n = 4;
              break;
            }
            _context4.n = 3;
            return _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.setFilterStr(syntaxStr);
          case 3:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = false;
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.VALUES.SOURCE.STATS;
            stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__.HOME_PAGE_STATES.LOAD_DATA);
            return _context4.a(2);
          case 4:
            _context4.n = 9;
            break;
          case 5:
            if (!(action === "check")) {
              _context4.n = 7;
              break;
            }
            console.log("Checking Str", syntaxStr);
            _context4.n = 6;
            return _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].validateFilterSyntax(syntaxStr);
          case 6:
            return _context4.a(2);
          case 7:
            if (!(action === "clear")) {
              _context4.n = 9;
              break;
            }
            editor.setValue("");
            console.log("Found applied filter [", appliedFilter, "] when clearing");
            if (!appliedFilter) {
              _context4.n = 9;
              break;
            }
            console.log("Found filter str", appliedFilter);
            _context4.n = 8;
            return _content_manager_ts__WEBPACK_IMPORTED_MODULE_6__.ContentManager.ClientCache.setFilterStr("");
          case 8:
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = false;
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.SOURCE = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.VALUES.SOURCE.STATS;
            stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_4__.HOME_PAGE_STATES.LOAD_DATA);
            return _context4.a(2);
          case 9:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    return function (_x) {
      return _ref4.apply(this, arguments);
    };
  }());
}
function addPlotlyLineAndMarkWidthListener() {
  var plotDiv = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.RANK_PLOT;
  if (plotDiv.__zoomListenerAttached) return;
  plotDiv.__zoomListenerAttached = true;
  console.log("Attaching plotly relayout listener");
  plotDiv.on("plotly_relayout", /*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(e) {
      var ignore, stats, originalXRange, sizes, newRange, zoomFactor, newMarkerSize, newLineWidth;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            ignore = _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.popKey(_home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.KEYS.IGNORE_RELAYOUT);
            if (!ignore) {
              _context5.n = 1;
              break;
            }
            return _context5.a(2);
          case 1:
            console.log("TRIGGERED PLOTLY_RELAYOUT EVENT");
            _context5.n = 2;
            return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getStats();
          case 2:
            stats = _context5.v;
            originalXRange = Object.values(stats.battles).length;
            sizes = (0,_e7_plots_ts__WEBPACK_IMPORTED_MODULE_8__.getSizes)(originalXRange);
            if (e["xaxis.range[0]"] !== undefined) {
              console.log("Refitting marker and line sizes");
              newRange = [e["xaxis.range[0]"], e["xaxis.range[1]"]]; // Zoom ratio: smaller range = more zoom
              zoomFactor = originalXRange / (newRange[1] - newRange[0]); // Adjust sizes proportionally (with a min/max clamp)
              newMarkerSize = Math.min(Math.max(sizes.markerSize * zoomFactor, sizes.markerSize), _e7_plots_ts__WEBPACK_IMPORTED_MODULE_8__.PLOT_REFS.markerMaxWidth);
              newLineWidth = Math.min(Math.max(sizes.lineWidth * zoomFactor, sizes.lineWidth), _e7_plots_ts__WEBPACK_IMPORTED_MODULE_8__.PLOT_REFS.lineMaxWidth);
              Plotly.restyle(plotDiv, {
                "marker.size": [newMarkerSize],
                "line.width": [newLineWidth]
              });
            } else {
              console.log("Resetting marker and line sizes");
              Plotly.restyle(plotDiv, {
                "marker.size": [sizes.markerSize],
                "line.width": [sizes.lineWidth]
              });
            }
          case 3:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    return function (_x2) {
      return _ref5.apply(this, arguments);
    };
  }());
}
function addStatsListeners(editor, stateDispatcher) {
  addAutoZoomListener();
  addBattleTableFilterToggleListener();
  addPremadeFilterButtonListener(editor);
  addFilterButtonListeners(editor, stateDispatcher);
  addLatestBattlesBtnListener(stateDispatcher);
}


/***/ }),

/***/ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js":
/*!************************************************************************************!*\
  !*** ./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js ***!
  \************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StatsView: () => (/* binding */ StatsView)
/* harmony export */ });
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../../cache-manager.ts */ "./static/assets/js/cache-manager.ts");
/* harmony import */ var _populate_content_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../../populate-content.js */ "./static/assets/js/populate-content.js");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../../content-manager.ts */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _e7_regex_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../../e7/regex.ts */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _stats_listeners_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./stats-listeners.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-listeners.js");
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../../../../html-safe.ts */ "./static/assets/js/html-safe.ts");
/* harmony import */ var _e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../../../../e7/plots.ts */ "./static/assets/js/e7/plots.ts");
/* harmony import */ var _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../../../html-constructor/html-constructor.ts */ "./static/assets/js/pages/html-constructor/html-constructor.ts");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }












var filtersAreRelevant = function filtersAreRelevant(stats) {
  return stats.areFiltersApplied && stats.battlesList.length > Object.values(stats.filteredBattlesObj).length;
};
function populatePlot(_x) {
  return _populatePlot.apply(this, arguments);
}
function _populatePlot() {
  _populatePlot = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(stats) {
    var container, user, autoZoom, plotDiv, zoom, originalXRange, filteredXRange, sizes, zoomFactor, newMarkerSize, newLineWidth, relayoutConfig, markerConfig;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          container = _html_safe_ts__WEBPACK_IMPORTED_MODULE_9__.Safe.unwrapHtmlElt("rank-plot-container");
          _context.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getUser();
        case 1:
          user = _context.v;
          _context.n = 2;
          return _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].get(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.AUTO_ZOOM_FLAG);
        case 2:
          autoZoom = _context.v;
          plotDiv = (0,_e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__.generateRankPlot)(container, stats.battles, user, stats.numFilters > 0 ? stats.filteredBattlesObj : null);
          (0,_stats_listeners_js__WEBPACK_IMPORTED_MODULE_5__.addPlotlyLineAndMarkWidthListener)(plotDiv);
          if (autoZoom && filtersAreRelevant(stats)) {
            // compute the needed zoom level
            zoom = (0,_e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__.getZoom)(stats.battles, stats.filteredBattlesObj);
            console.log("Zooming to:", zoom);

            // compute the zoom factor to adjust markers and line width
            originalXRange = Object.values(stats.battles).length;
            filteredXRange = Object.values(stats.filteredBattlesObj).length;
            sizes = (0,_e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__.getSizes)(originalXRange);
            zoomFactor = originalXRange / filteredXRange;
            newMarkerSize = Math.min(Math.max(sizes.markerSize * zoomFactor, sizes.markerSize), _e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__.PLOT_REFS.markerMaxWidth);
            newLineWidth = Math.min(Math.max(sizes.lineWidth * zoomFactor, sizes.lineWidth), _e7_plots_ts__WEBPACK_IMPORTED_MODULE_10__.PLOT_REFS.lineMaxWidth);
            relayoutConfig = {
              "xaxis.range": [zoom.startX, zoom.endX],
              "yaxis.range": [zoom.startY, zoom.endY]
            };
            markerConfig = {
              "marker.size": [newMarkerSize],
              "line.width": [newLineWidth]
            };
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_8__.CONTEXT.IGNORE_RELAYOUT = true;
            Plotly.restyle(plotDiv, markerConfig);
            Plotly.relayout(plotDiv, relayoutConfig);
          }
        case 3:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _populatePlot.apply(this, arguments);
}
function populateContent() {
  return _populateContent.apply(this, arguments);
}
function _populateContent() {
  _populateContent = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var user, seasonDetails, stats, _t;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getUser();
        case 1:
          user = _context2.v;
          if (user) {
            _context2.n = 2;
            break;
          }
          console.log("Skipping populate tables: user not found");
          return _context2.a(2);
        case 2:
          console.log("POPULATING DATA PROCESS INITIATED");
          _context2.p = 3;
          console.log("Getting Season Details");
          _context2.n = 4;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.SeasonManager.getSeasonDetails();
        case 4:
          seasonDetails = _context2.v;
          console.log("Got season details:", seasonDetails, _typeof(seasonDetails));
          console.log("Getting Stats");
          _context2.n = 5;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.getStats();
        case 5:
          stats = _context2.v;
          //console.log("GOT STATS: ", JSON.stringify(stats));

          console.time("populateTables");
          console.log("POPULATING TABLES, CARD CONTENT, AND PLOTS");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateSeasonDetailsTable("season-details-tbl", seasonDetails);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateHeroStatsTable("player-tbl", stats.playerHeroStats);
          console.log("Populating opponent table");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateHeroStatsTable("opponent-tbl", stats.enemyHeroStats);
          console.log("Populating first pick table");
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populatePlayerFirstPickTable("first-pick-stats-tbl", stats.firstPickStats);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populatePlayerPrebansTable("preban-stats-tbl", stats.prebanStats);
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateServerStatsTable("performance-stats-tbl", stats.performanceStats);
          if (_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE.checked) {
            console.log("POPULATING AS FILTERED BATTLES TABLE");
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateFullBattlesTable("battles-tbl", Object.values(stats.filteredBattlesObj), user);
          } else {
            console.log("POPULATING AS FULL BATTLES TABLE");
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.populateFullBattlesTable("battles-tbl", stats.battles, user);
          }
          _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.CardContent.populateGeneralStats(stats.generalStats);
          _context2.n = 6;
          return populatePlot(stats);
        case 6:
          console.log("FINISHED POPULATING");
          console.timeEnd("populateTables");
          _context2.n = 8;
          break;
        case 7:
          _context2.p = 7;
          _t = _context2.v;
          console.error("Error loading data:", _t);
        case 8:
          return _context2.a(2);
      }
    }, _callee2, null, [[3, 7]]);
  }));
  return _populateContent.apply(this, arguments);
}
function addCodeMirror() {
  return _addCodeMirror.apply(this, arguments);
}
function _addCodeMirror() {
  _addCodeMirror = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var textarea, editor, appliedFilter;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          CodeMirror.defineMode("filterSyntax", function () {
            return {
              token: function token(stream, state) {
                return _e7_regex_ts__WEBPACK_IMPORTED_MODULE_4__.RegExps.tokenMatch(stream);
              }
            };
          });
          textarea = document.getElementById("codeArea");
          editor = CodeMirror.fromTextArea(textarea, {
            mode: "filterSyntax",
            lineNumbers: true,
            theme: "default"
          });
          editor.setSize(null, 185);
          _context3.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.getFilterStr();
        case 1:
          appliedFilter = _context3.v;
          if (appliedFilter) {
            editor.setValue(appliedFilter);
          }

          // Optional: sync changes back to textarea if needed
          editor.on("change", function () {
            editor.save(); // Updates the hidden textarea for form submit
          });

          // Show the editor after it's initialized
          textarea.classList.remove("codemirror-hidden");
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_8__.CONTEXT.CODE_MIRROR_EDITOR = editor;
          return _context3.a(2, editor);
      }
    }, _callee3);
  }));
  return _addCodeMirror.apply(this, arguments);
}
function preFirstRenderLogic() {
  return _preFirstRenderLogic.apply(this, arguments);
}
function _preFirstRenderLogic() {
  _preFirstRenderLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          _context4.n = 1;
          return populateContent();
        case 1:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return _preFirstRenderLogic.apply(this, arguments);
}
function postFirstRenderLogic() {
  return _postFirstRenderLogic.apply(this, arguments);
}
function _postFirstRenderLogic() {
  _postFirstRenderLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var editor;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          editor = _home_page_context_js__WEBPACK_IMPORTED_MODULE_8__.CONTEXT.CODE_MIRROR_EDITOR;
          if (editor) {
            _context5.n = 1;
            break;
          }
          console.error("Editor not found in CONTEXT");
          return _context5.a(2);
        case 1:
          console.log("Refreshing editor");
          editor.refresh();
        case 2:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _postFirstRenderLogic.apply(this, arguments);
}
function runLogic(_x2) {
  return _runLogic.apply(this, arguments);
}
function _runLogic() {
  _runLogic = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(stateDispatcher) {
    var autoZoomCheckbox, checked, stats, filterBattleTableCheckbox, user;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          autoZoomCheckbox = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.AUTO_ZOOM_FLAG;
          _context6.n = 1;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.get(_content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.Keys.AUTO_ZOOM_FLAG);
        case 1:
          checked = _context6.v;
          autoZoomCheckbox.checked = checked;
          _context6.n = 2;
          return _content_manager_ts__WEBPACK_IMPORTED_MODULE_3__.ContentManager.ClientCache.getStats();
        case 2:
          stats = _context6.v;
          filterBattleTableCheckbox = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.BATTLE_FILTER_TOGGLE;
          if (filterBattleTableCheckbox.checked) {
            _populate_content_js__WEBPACK_IMPORTED_MODULE_2__.Tables.replaceBattleData(Object.values(stats.filteredBattlesObj));
          }
          _context6.n = 3;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].getUser();
        case 3:
          user = _context6.v;
          if (user) {
            _context6.n = 4;
            break;
          }
          console.log("User not found sending to select data quitely");
          stateDispatcher(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_6__.HOME_PAGE_STATES.SELECT_DATA); // switch view with no error; should only happen if user is reloading and state cache did not expire while user info did
          return _context6.a(2);
        case 4:
          console.log("User found:", user);
        case 5:
          _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.CSV_FILE.value = "";
          _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.USER_QUERY_FORM_NAME.value = "";
        case 6:
          return _context6.a(2);
      }
    }, _callee6);
  }));
  return _runLogic.apply(this, arguments);
}
function addScrollTableOffsets() {
  var tables = [_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.FIRST_PICK_STATS_TBL, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.PREBAN_STATS_TBL, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_7__["default"].HOME_PAGE.SEASON_DETAILS_TBL];
  var scrollWidth = (0,_html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_11__.getScrollbarWidth)();
  for (var _i = 0, _tables = tables; _i < _tables.length; _i++) {
    var tbl = _tables[_i];
    var thead = tbl.querySelector("thead");
    if (!thead) {
      continue;
    }
    thead.style.setProperty("padding-right", "".concat(scrollWidth, "px"));
  }
}
function initialize(_x3) {
  return _initialize.apply(this, arguments);
}
function _initialize() {
  _initialize = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(stateDispatcher) {
    var editor;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.n) {
        case 0:
          addScrollTableOffsets();
          _context7.n = 1;
          return addCodeMirror();
        case 1:
          editor = _context7.v;
          _context7.n = 2;
          return (0,_stats_listeners_js__WEBPACK_IMPORTED_MODULE_5__.addStatsListeners)(editor, stateDispatcher);
        case 2:
          return _context7.a(2);
      }
    }, _callee7);
  }));
  return _initialize.apply(this, arguments);
}
var StatsView = {
  preFirstRenderLogic: preFirstRenderLogic,
  postFirstRenderLogic: postFirstRenderLogic,
  runLogic: runLogic,
  initialize: initialize,
  populateContent: populateContent
};


/***/ }),

/***/ "./static/assets/js/pages/html-constructor/html-constructor.ts":
/*!*********************************************************************!*\
  !*** ./static/assets/js/pages/html-constructor/html-constructor.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ComposeFns: () => (/* binding */ ComposeFns),
/* harmony export */   ComposeOption: () => (/* binding */ ComposeOption),
/* harmony export */   END_NEST: () => (/* binding */ END_NEST),
/* harmony export */   HTMLConstructor: () => (/* binding */ HTMLConstructor),
/* harmony export */   TableConstructor: () => (/* binding */ TableConstructor),
/* harmony export */   getScrollbarWidth: () => (/* binding */ getScrollbarWidth)
/* harmony export */ });
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../html-safe.ts */ "./static/assets/js/html-safe.ts");

let ID_COUNTER = 0;
function generateID() {
    ID_COUNTER += 1;
    return `id-${ID_COUNTER}`;
}
let _SCROLLBAR_WIDTH = null;
function getScrollbarWidth() {
    if (_SCROLLBAR_WIDTH)
        return _SCROLLBAR_WIDTH;
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll";
    document.body.appendChild(outer);
    const scrollbarWidth = outer.offsetWidth - outer.clientWidth;
    outer.remove();
    _SCROLLBAR_WIDTH = scrollbarWidth;
    return scrollbarWidth;
}
const ComposeOption = {
    NEST: "nest", // all subsequent compose elements will be children
    END_NEST: "end-nest", // exits the current nest if any otherwise ignore
    ADJ: "adj", // all subsequent compose elements will be siblings
};
const END_NEST_TAG = "~end-nest~";
const END_NEST = {
    tag: END_NEST_TAG,
    option: ComposeOption.END_NEST
};
class HTMLConstructor {
    htmlElt;
    children;
    childArr;
    constructor(htmlElt) {
        this.htmlElt = htmlElt;
        this.children = {};
        this.childArr = [];
    }
    static fromID(id) {
        return new HTMLConstructor(_html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt(id));
    }
    static fromElt(elt) {
        return new HTMLConstructor(elt);
    }
    get id() {
        return this.htmlElt.id;
    }
    set id(id) {
        this.htmlElt.id = id;
    }
    addClass(...classes) {
        this.htmlElt.classList.add(...classes);
    }
    addStyle(style) {
        this.htmlElt.setAttribute("style", style);
    }
    removeClass(...classes) {
        this.htmlElt.classList.remove(...classes);
    }
    addAttributes(attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            this.htmlElt.setAttribute(key, value);
        }
    }
    appendChild(child) {
        if (child instanceof HTMLConstructor) {
            this.htmlElt.appendChild(child.htmlElt);
            if (!child.id)
                child.id = generateID();
            this.children[child.id] = child;
            this.childArr.push(child);
            return child;
        }
        else if (child instanceof HTMLElement) {
            let wrapped = new HTMLConstructor(child);
            return this.appendChild(wrapped);
        }
        else {
            throw new Error("Only instances of HTMLConstructor or HTMLElement can be passed to this function");
        }
    }
    setInnerHtml(htmlStr) {
        this.htmlElt.innerHTML = htmlStr;
    }
    appendInnerHTML(htmlStr) {
        this.htmlElt.insertAdjacentHTML("beforeend", htmlStr);
    }
    constructChild(eltType, attributes = {}) {
        if (!attributes.id)
            attributes.id = generateID();
        let child = document.createElement(eltType);
        let constructor = new HTMLConstructor(child);
        constructor.addAttributes(attributes);
        this.appendChild(constructor);
        return constructor;
    }
    addTextContent(text) {
        this.htmlElt.textContent = text;
    }
    /**
     * Constructs a tree of HTMLConstructors from an array of HTMLComposeElements.
     *
     * @param {HTMLComposeElement[]} elements - An array of HTMLComposeElements
     * representing the structure and content of the HTML tree.
     */
    compose(elements) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.option === ComposeOption.NEST) { // all subsequent compose elements will be children
                const nestedChildren = [];
                for (let j = i + 1; j < elements.length; j++) {
                    const nestedChild = elements[j];
                    if (nestedChild.option === ComposeOption.END_NEST) {
                        break;
                    }
                    nestedChildren.push(nestedChild);
                }
                if (element.children) {
                    element.children = [...element.children, ...nestedChildren];
                }
                else {
                    element.children = nestedChildren;
                }
                element.option = ComposeOption.ADJ;
                this.compose([element]);
                i += nestedChildren.length;
                continue;
            }
            ;
            if (element.tag === END_NEST_TAG)
                continue;
            if (element.textContent instanceof Array) { // create adjacent copies of element using the different text
                const subElements = [];
                for (const text of element.textContent) {
                    const subElt = Object.assign({}, element);
                    subElt.textContent = text;
                    subElements.push(subElt);
                }
                this.compose(subElements);
                continue;
            }
            ;
            let child = this.constructChild(element.tag, element.attributes);
            if (element.classes)
                child.addClass(...element.classes);
            if (element.children)
                child.compose(element.children);
            if (element.textContent)
                child.addTextContent(element.textContent);
            if (element.style)
                child.addStyle(element.style);
            if (element.innerHtml)
                child.setInnerHtml(element.innerHtml);
        }
        ;
    }
}
class TableConstructor extends HTMLConstructor {
    thead;
    tbody;
    constructor(htmlElt, headID, bodyID) {
        super(htmlElt);
        this.constructChild("thead", { id: headID });
        this.constructChild("tbody", { id: bodyID });
        this.thead = this.children[headID];
        this.tbody = this.children[bodyID];
    }
    static createFromIDs(tableID, headID, bodyID) {
        const table = document.createElement("table");
        table.id = tableID;
        return new TableConstructor(table, headID, bodyID);
    }
    addColumns(colNameArr) {
        const thead = this.thead;
        const tr = thead.constructChild("tr");
        colNameArr.forEach((colName) => {
            const attributes = { scope: "col" };
            tr.constructChild("th", attributes).addTextContent(colName);
        });
    }
}
function cardNest({ content, classes } = {}) {
    return [
        {
            tag: "div",
            classes: ["col-sm-12"].concat(classes ?? []),
            option: ComposeOption.NEST
        },
        {
            tag: "div",
            classes: ["card"],
            children: content,
            option: ComposeOption.NEST
        },
    ];
}
function cardBody({ composeList, classes, option }) {
    return {
        tag: "div",
        classes: ["card-body", "pc-component"].concat(classes ?? []),
        option: option,
        children: composeList
    };
}
function paragraph(text, classes) {
    return {
        tag: "p",
        textContent: text,
        classes: classes
    };
}
function header(text, hNum = 1, classes) {
    return {
        tag: "h" + hNum,
        textContent: text,
        classes: classes
    };
}
function hr() {
    return {
        tag: "hr"
    };
}
function br() {
    return {
        tag: "br"
    };
}
function listElement({ outertag, outerclasses, innertag, innerclasses, textList }) {
    return {
        tag: outertag ?? "ul",
        classes: outerclasses ?? [],
        children: [
            {
                tag: innertag ?? "li",
                classes: innerclasses ?? [],
                textContent: textList
            }
        ]
    };
}
const ComposeFns = {
    cardNest,
    cardBody,
    paragraph,
    header,
    hr,
    br,
    listElement,
};



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
    REFRESH_REFERENCES: "REFRESH_REFERENCES",
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
    pushAction: async function (action) {
        let state = await this.getState();
        state.actions.push(action);
        await this.setState(state);
    },
    makeAction: function (action, message) {
        return { action: action, message: message };
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
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
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
      return _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SELECT_DATA_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SHOW_STATS:
      return _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SHOW_STATS_BODY;
    case _page_utilities_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.LOAD_DATA:
      return _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.LOAD_DATA_BODY;
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
  _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].BODY_FOOTER_CONTAINER, true);
}
function homePageDrawUserInfo(user) {
  if (user) {
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = user.name;
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = user.id;
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = _e7_references_ts__WEBPACK_IMPORTED_MODULE_5__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
  } else {
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = "(None)";
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = "(None)";
    _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = "(None)";
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
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
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
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.GREEN]));
}
function queueSelectDataMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.SELECT_DATA_MSG, [STYLES.RED]));
}
function queueFilterMsgGreen(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.GREEN]));
}
function queueFilterMsgRed(msg) {
  TextController.push(new TextPacket(msg, _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_0__["default"].HOME_PAGE.FILTER_MSG, [STYLES.RED]));
}
var TextUtils = {
  queueSelectDataMsgGreen: queueSelectDataMsgGreen,
  queueSelectDataMsgRed: queueSelectDataMsgRed,
  queueFilterMsgGreen: queueFilterMsgGreen,
  queueFilterMsgRed: queueFilterMsgRed
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/doc-element-references.ts":
/*!*************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/doc-element-references.ts ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../html-safe.ts */ "./static/assets/js/html-safe.ts");

class HomePageElements {
    _SELECT_DATA_MSG = null;
    _FILTER_MSG = null;
    _SELECT_DATA_BODY = null;
    _SHOW_STATS_BODY = null;
    _LOAD_DATA_BODY = null;
    _LATEST_BATTLES_BTN = null;
    _UPLOAD_FORM = null;
    _CSV_FILE = null;
    _USER_QUERY_FORM_NAME = null;
    _USER_QUERY_FORM_SERVER = null;
    _AUTO_ZOOM_FLAG = null;
    _FOOTER = null;
    _USER_NAME = null;
    _USER_ID = null;
    _USER_SERVER = null;
    _BATTLE_FILTER_TOGGLER = null;
    _ID_SEARCH_FLAG = null;
    _SEASON_DETAILS_TBL = null;
    _PERFORMANCE_STATS_TBL = null;
    _FIRST_PICK_STATS_TBL = null;
    _PREBAN_STATS_TBL = null;
    _PLAYER_TBL = null;
    _OPPONENT_TBL = null;
    _BATTLE_TBL = null;
    _RANK_PLOT = null;
    get SELECT_DATA_MSG() {
        return this._SELECT_DATA_MSG ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-msg");
    }
    get FILTER_MSG() {
        return this._FILTER_MSG ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filterMSG");
    }
    get SELECT_DATA_BODY() {
        return this._SELECT_DATA_BODY ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("select-data-body");
    }
    get SHOW_STATS_BODY() {
        return this._SHOW_STATS_BODY ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("show-stats-body");
    }
    get LOAD_DATA_BODY() {
        return this._LOAD_DATA_BODY ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("load-data-body");
    }
    get LATEST_BATTLES_BTN() {
        return this._LATEST_BATTLES_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("latest-battles-btn");
    }
    get UPLOAD_FORM() {
        return this._UPLOAD_FORM ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("uploadForm");
    }
    get CSV_FILE() {
        return this._CSV_FILE ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("csvFile");
    }
    get USER_QUERY_FORM_NAME() {
        return this._USER_QUERY_FORM_NAME ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-name");
    }
    get USER_QUERY_FORM_SERVER() {
        return this._USER_QUERY_FORM_SERVER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-query-form-server");
    }
    get AUTO_ZOOM_FLAG() {
        return this._AUTO_ZOOM_FLAG ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("auto-zoom-flag");
    }
    get USER_NAME() {
        return this._USER_NAME ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name");
    }
    get USER_ID() {
        return this._USER_ID ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id");
    }
    get USER_SERVER() {
        return this._USER_SERVER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server");
    }
    get BATTLE_FILTER_TOGGLE() {
        return this._BATTLE_FILTER_TOGGLER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-battle-table");
    }
    get ID_SEARCH_FLAG() {
        return this._ID_SEARCH_FLAG ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("id-search-flag");
    }
    get SEASON_DETAILS_TBL() {
        return this._SEASON_DETAILS_TBL ||=
            _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("season-details-tbl");
    }
    get PERFORMANCE_STATS_TBL() {
        return this._PERFORMANCE_STATS_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("performance-stats-tbl");
    }
    get FIRST_PICK_STATS_TBL() {
        return this._FIRST_PICK_STATS_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("first-pick-stats-tbl");
    }
    get PREBAN_STATS_TBL() {
        return this._PREBAN_STATS_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("preban-stats-tbl");
    }
    get PLAYER_TBL() {
        return this._PLAYER_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("player-tbl");
    }
    get OPPONENT_TBL() {
        return this._OPPONENT_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("opponent-tbl");
    }
    get BATTLES_TBL() {
        return this._BATTLE_TBL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("battles-tbl");
    }
    get RANK_PLOT() {
        return this._RANK_PLOT ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("rank-plot");
    }
    get MESSAGE_ELEMENTS_LIST() {
        return [this.SELECT_DATA_MSG, this.FILTER_MSG];
    }
}
class NavBarElements {
    _SIDEBAR_HIDE_BTN = null;
    get SIDEBAR_HIDE_BTN() {
        return (this._SIDEBAR_HIDE_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-hide"));
    }
    _CLEAR_DATA_BTN = null;
    get CLEAR_DATA_BTN() {
        return (this._CLEAR_DATA_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("clear-data-btn"));
    }
    _EXPORT_CSV_BTN = null;
    get EXPORT_DATA_BTN() {
        return (this._EXPORT_CSV_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("export-data-btn"));
    }
    _OFFICIAL_SITE_BTN = null;
    get OFFICIAL_SITE_BTN() {
        return (this._OFFICIAL_SITE_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("official-site-btn"));
    }
    _USER_NAME = null;
    get USER_NAME() {
        return (this._USER_NAME ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-name"));
    }
    _USER_ID = null;
    get USER_ID() {
        return (this._USER_ID ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-id"));
    }
    _USER_SERVER = null;
    get USER_SERVER() {
        return (this._USER_SERVER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("user-server"));
    }
    _SIDEBAR_CONTROL = null;
    get SIDEBAR_CONTROL() {
        return (this._SIDEBAR_CONTROL ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("sidebar-control"));
    }
    _REFRESH_REFERENCES_BTN = null;
    get REFRESH_REFERENCES_BTN() {
        return (this._REFRESH_REFERENCES_BTN ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("refresh-references-btn"));
    }
}
class SEARCH_PAGE_ELEMENTS {
    _SEARCH_DOMAINS = null;
    get SEARCH_DOMAINS() {
        return (this._SEARCH_DOMAINS ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-domains"));
    }
    _SEARCH_SUBMIT_BTN = null;
    get SEARCH_SUBMIT_BTN() {
        return (this._SEARCH_SUBMIT_BTN ||=
            _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-submit-btn"));
    }
    _SEARCH_FORM = null;
    get SEARCH_FORM() {
        return (this._SEARCH_FORM ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("searchForm"));
    }
    _SEARCH_TABLE_CONTAINER = null;
    get SEARCH_TABLE_CONTAINER() {
        return (this._SEARCH_TABLE_CONTAINER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("search-table-container"));
    }
}
class FILTER_SYNTAX_PAGE_ELEMENTS {
    _FILTER_SYNTAX_RULES_CONTAINER = null;
    get FILTER_SYNTAX_RULES_CONTAINER() {
        return (this._FILTER_SYNTAX_RULES_CONTAINER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("filter-syntax-rules-container"));
    }
    _ALL_CONTENT_CONTAINER = null;
    get ALL_CONTENT_CONTAINER() {
        return (this._ALL_CONTENT_CONTAINER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("all-content-container"));
    }
}
class INFO_PAGE_ELEMENTS {
    IDS = {
        OVERVIEW_CONTAINER: "overview-container",
        OVERVIEW_CARD: "overview-card",
        RETURN_BTN: "info-return-btn",
        RETURN_CONTAINER: "info-return-container",
        FILTER_SYNTAX_CONTAINER: "filter-syntax-rules-container",
        FILTER_EXAMPLES_AND_TEST_CONTAINER: "filter-syntax-examples-and-test-container",
        INFORMATION_CONTENT_LINKS_CONTAINER: "information-content-links-container",
        ALL_CONTENT_CONTAINER: "all-content-container",
        FILTER_OVERVIEW: "filter-rules-card",
        FIELD_SYNTAX: "fields-card",
        FUNCTION_SYNTAX: "functions-card",
        OPERATOR_SYNTAX: "operators-card",
        DATA_SYNTAX: "declared-data-card",
        STRUCTURAL_SYNTAX: "structural-syntax-card",
        EX_FILTER_1: "exFilter1",
        EX_FILTER_2: "exFilter2",
        EX_FILTER_3: "exFilter3",
        EX_FILTER_4: "exFilter4",
        EX_FILTER_5: "exFilter5",
        TEST_FILTER_FORM: "test-filter-form",
        TEST_FILTER_MESSAGE: "filterMSG",
        TEST_SYNTAX_CARD: "test-syntax-card",
        CHECK_SYNTAX_BTN: "check-syntax-btn",
    };
    _CACHE = {};
    constructor() {
        this._CACHE = {};
    }
    getFromId(id) {
        return this._CACHE[id] ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt(id);
    }
}
class DocElements {
    HOME_PAGE;
    NAV_BAR;
    SEARCH_PAGE;
    FILTER_SYNTAX_PAGE;
    INFO_PAGE;
    _BODY_FOOTER_CONTAINER = null;
    _FOOTER_WRAPPER = null;
    constructor() {
        this.HOME_PAGE = new HomePageElements();
        this.NAV_BAR = new NavBarElements();
        this.SEARCH_PAGE = new SEARCH_PAGE_ELEMENTS();
        this.FILTER_SYNTAX_PAGE = new FILTER_SYNTAX_PAGE_ELEMENTS();
        this.INFO_PAGE = new INFO_PAGE_ELEMENTS();
    }
    get BODY_FOOTER_CONTAINER() {
        return (this._BODY_FOOTER_CONTAINER ??=
            _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("body-footer-container"));
    }
    get FOOTER_WRAPPER() {
        return (this._FOOTER_WRAPPER ||= _html_safe_ts__WEBPACK_IMPORTED_MODULE_0__.Safe.unwrapHtmlElt("footer-wrapper"));
    }
}
const DOC_ELEMENTS = new DocElements();
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
/* harmony import */ var _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../orchestration/inter-page-manager.ts */ "./static/assets/js/pages/orchestration/inter-page-manager.ts");
/* harmony import */ var _content_manager_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../content-manager.ts */ "./static/assets/js/content-manager.ts");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../lang-manager.ts */ "./static/assets/js/lang-manager.ts");
/* harmony import */ var _export_import_data_tools_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../export-import-data-tools.ts */ "./static/assets/js/export-import-data-tools.ts");








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
                        await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushAction({
                            message: "Active user not found; you must either query a valid user or upload battles to view hero stats.",
                            action: _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_NO_USER_MSG
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
    _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.CLEAR_DATA_BTN.addEventListener("click", async function () {
        const user = await _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_2__["default"].getUser();
        if (user) {
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushAction({ action: _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.CLEAR_USER });
        }
        else {
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushAction({ action: _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG });
        }
        navToHome();
    });
}
/**
 * Simulates hover on mobile devices for "brace" buttons (buttons with a dashed
 * border). When a button is touched, it adds a class to simulate a hover effect.
 * The class is automatically removed after 150ms.
 */
function addBraceButtonListeners() {
    const braceButtons = [
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.CLEAR_DATA_BTN,
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.EXPORT_DATA_BTN,
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN
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
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = user.name;
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = `${user.id}`;
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText =
            _e7_references_ts__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
            window.open(generateGGLink(user, lang), "_blank", "noopener,noreferrer");
        };
    }
    else {
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_NAME.innerText = "(None)";
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_ID.innerText = "(None)";
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.USER_SERVER.innerText = "(None)";
        _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.OFFICIAL_SITE_BTN.onclick = () => {
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
function addExportDataBtnListener() {
    _doc_element_references_ts__WEBPACK_IMPORTED_MODULE_3__["default"].NAV_BAR.EXPORT_DATA_BTN.addEventListener("click", async function () {
        const user = await _content_manager_ts__WEBPACK_IMPORTED_MODULE_5__.ContentManager.UserManager.getUser();
        if (!user) {
            await _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].pushAction({
                message: "User not found; cannot export data without an active user",
                action: _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_4__["default"].ACTIONS.SHOW_NO_USER_MSG,
            });
            await _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
            navToHome();
            return;
        }
        await _export_import_data_tools_ts__WEBPACK_IMPORTED_MODULE_7__.ExportImportFns.triggerDownload();
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
    addExportDataBtnListener();
    addBraceButtonListeners();
}
let NavBarUtils = {
    addNavListeners: addNavListeners,
    addClearDataBtnListener: addClearDataBtnListener,
    writeUserInfo: writeUserInfo,
    initialize: initialize,
    navToHome: navToHome,
    addExportDataBtnListener: addExportDataBtnListener,
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

/***/ "./static/assets/js/populate-content.js":
/*!**********************************************!*\
  !*** ./static/assets/js/populate-content.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CardContent: () => (/* binding */ CardContent),
/* harmony export */   Tables: () => (/* binding */ Tables)
/* harmony export */ });
/* harmony import */ var _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/references.ts */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./html-safe.ts */ "./static/assets/js/html-safe.ts");
/* harmony import */ var _pages_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pages/page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }



function destroyDataTable(tableid) {
  var tableSelector = $("#".concat(tableid));
  if ($.fn.dataTable.isDataTable(tableSelector)) {
    console.log("Destroying DataTable: ", tableid);
    tableSelector.DataTable().clear().destroy();
  }
}

/**
 * Returns a copy of the dataArr with the array columns converted to strings
 * (using JSON.stringify). This is necessary for the DataTables library to
 * properly render the data.
 *
 * @param {Array<Object>} dataArr - The data array to modify.
 * @returns {Array<Object>} - The modified data array.
 */
function getDataWithStringifiedArrayColumns(dataArr) {
  dataArr = structuredClone(dataArr);
  var _iterator = _createForOfIteratorHelper(dataArr),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var row = _step.value;
      var _iterator2 = _createForOfIteratorHelper(_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.ARRAY_COLUMNS),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var col = _step2.value;
          row[col] = JSON.stringify(row[col]);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return dataArr;
}
function convertPercentToColorClass(str) {
  var num = Number(str.replace("%", ""));
  if (num > 50) {
    return "text-over50";
  } else if (num < 50) {
    return "text-below50";
  } else {
    return "";
  }
}
function getTbody(tableid) {
  var tbody = document.getElementById("".concat(tableid, "-body"));
  if (!tbody) {
    throw new Error("Could not find tbody with id ".concat(tableid, "-body"));
  }
  return tbody;
}
var Tables = {
  populateHeroStatsTable: function populateHeroStatsTable(tableid, data) {
    destroyDataTable(tableid);
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    var isP1 = tableid.toLowerCase().includes("player");
    var person = isP1 ? "Player" : "Enemy";
    var P1_COLUMNS = [_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.HERO_NAME, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.BATTLES, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.PICK_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.WINS, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.WIN_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.PLUS_MINUS, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.POINT_GAIN, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.AVG_CR, _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE];
    var P2_COLUMNS = P1_COLUMNS.filter(function (col) {
      return col !== _e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE;
    });
    var columns = isP1 ? P1_COLUMNS : P2_COLUMNS;
    console.log("Columns: ", columns);
    var tableSelector = $("#".concat(tableid));
    var table = tableSelector.DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[2, "desc"]],
      // order by pick rate desc
      buttons: {
        name: "primary",
        buttons: ["copy", {
          extend: "csv",
          text: "CSV",
          filename: person + " Hero Stats"
        }, {
          extend: "excel",
          text: "Excel",
          filename: person + " Hero Stats"
        }]
      },
      columnDefs: [{
        targets: "_all",
        className: "nowrap"
      }, {
        targets: 4,
        // "win_rate" column
        createdCell: function createdCell(td, cellData) {
          var num = Number(cellData.replace("%", ""));
          if (num < 50) {
            td.style.color = "red";
          } else if (num > 50) {
            td.style.color = "mediumspringgreen";
          }
        }
      }],
      pageLength: 50,
      scrollY: "300px",
      deferRender: true,
      scroller: true,
      scrollCollapse: false,
      columns: columns.map(function (col) {
        return {
          data: col
        };
      })
    });
    table.rows.add(data).draw();
    return table;
  },
  populateSeasonDetailsTable: function populateSeasonDetailsTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["Season Number"], "</td>\n            <td>").concat(item["Season"], "</td>\n            <td>").concat(item["Start"], "</td>\n            <td>").concat(item["End"], "</td>\n            <td>").concat(item["Status"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populateServerStatsTable: function populateServerStatsTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");
      var labelColorClass = item["label"].includes("Server") ? "cm-keyword" : "cm-declared-data";

      // Populate each <td> in order
      row.innerHTML = "\n            <td class=\"".concat(labelColorClass, "\">").concat(item["label"], "</td>\n            <td>").concat(item["count"], "</td>\n            <td>").concat(item["frequency"], "</td>\n            <td>").concat(item["wins"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["fp_wr"]), "\">").concat(item["fp_wr"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["sp_wr"]), "\">").concat(item["sp_wr"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerPrebansTable: function populatePlayerPrebansTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["preban"], "</td>\n            <td>").concat(item["appearances"], "</td>\n            <td>").concat(item["appearance_rate"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerFirstPickTable: function populatePlayerFirstPickTable(tableid, data) {
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["hero"], "</td>\n            <td>").concat(item["appearances"], "</td>\n            <td>").concat(item["appearance_rate"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populateFullBattlesTable: function populateFullBattlesTable(tableid, data, user) {
    destroyDataTable(tableid);
    data = getDataWithStringifiedArrayColumns(data);
    var tbody = getTbody(tableid);
    tbody.innerHTML = ""; // Clear existing rows

    var fileName;
    var timestamp = new Date().toISOString().split("T")[0] || "";
    if (user) {
      fileName = "".concat(user.name, " (").concat(user.id, ") ").concat(timestamp);
    } else {
      fileName = data.length === 0 ? "Empty" : "UID(".concat(data[0]["P1 ID"], ") ").concat(timestamp);
    }
    var table = $("#".concat(tableid)).DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[2, "desc"]],
      // Sort by Date/Time desc by default
      columnDefs: [{
        targets: "_all",
        className: "nowrap"
      }],
      rowCallback: function rowCallback(row, data, dataIndex) {
        var winCell = row.cells[14];
        var firstPickCell = row.cells[15];
        var firstTurnCell = row.cells[16];
        if (data["Win"] === true) {
          winCell.style.color = "mediumspringgreen";
        } else if (data["Win"] === false) {
          winCell.style.color = "red";
        }
        if (data["First Pick"] === true) {
          firstPickCell.style.color = "deepskyblue";
        }
        if (data["First Turn"] === true) {
          firstTurnCell.style.color = "deepskyblue";
        }
      },
      buttons: {
        name: "primary",
        buttons: ["copy", {
          extend: "csv",
          text: "CSV",
          filename: fileName
        }, {
          extend: "excel",
          text: "Excel",
          filename: fileName
        }]
      },
      pageLength: 50,
      scrollY: "300px",
      deferRender: true,
      scroller: true,
      scrollCollapse: false,
      columns: Object.values(_e7_references_ts__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP).filter(function (col) {
        return !col.toLowerCase().includes("prime");
      }).map(function (col) {
        return {
          data: col
        };
      })
    });
    table.rows.add(data).draw();
    return table;
  },
  replaceDatatableData: function replaceDatatableData(tableid, data) {
    var datatableReference = $("#".concat(tableid)).DataTable();
    datatableReference.clear().rows.add(data).draw();
  },
  replaceBattleData: function replaceBattleData(data) {
    data = getDataWithStringifiedArrayColumns(data);
    var id = _pages_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_2__["default"].HOME_PAGE.BATTLES_TBL.id;
    this.replaceDatatableData(id, data);
  }
};
var CardContent = {
  populateGeneralStats: function populateGeneralStats(general_stats) {
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("total-battles", general_stats.total_battles);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("first-pick-count", general_stats.first_pick_count);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("first-pick-rate", " (".concat(general_stats.first_pick_rate, ")"));
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("second-pick-count", general_stats.second_pick_count);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("second-pick-rate", " (".concat(general_stats.second_pick_rate, ")"));
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("total-winrate", general_stats.total_winrate);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("first-pick-winrate", general_stats.first_pick_winrate);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("second-pick-winrate", general_stats.second_pick_winrate);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("total-wins", general_stats.total_wins);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("max-win-streak", general_stats.max_win_streak);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("max-loss-streak", general_stats.max_loss_streak);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("avg-ppg", general_stats.avg_ppg);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("avg-turns", general_stats.avg_turns);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("avg-time", general_stats.avg_time);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("max-turns", general_stats.max_turns);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("max-time", general_stats.max_time);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("first-turn-games", general_stats.first_turn_games);
    _html_safe_ts__WEBPACK_IMPORTED_MODULE_1__.Safe.setText("first-turn-rate", general_stats.first_turn_rate);
  }
};


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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*******************************************************!*\
  !*** ./static/assets/js/pages/home-page/home-page.js ***!
  \*******************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../orchestration/page-state-manager.js */ "./static/assets/js/pages/orchestration/page-state-manager.js");
/* harmony import */ var _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../page-utilities/nav-bar-utils.ts */ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts");
/* harmony import */ var _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../orchestration/text-controller.js */ "./static/assets/js/pages/orchestration/text-controller.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/home-page/home-page-context.js");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../orchestration/inter-page-manager.ts */ "./static/assets/js/pages/orchestration/inter-page-manager.ts");
/* harmony import */ var _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../e7/user-manager.ts */ "./static/assets/js/e7/user-manager.ts");
/* harmony import */ var _home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./home-page-dispatch.js */ "./static/assets/js/pages/home-page/home-page-dispatch.js");
/* harmony import */ var _home_page_listeners_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./home-page-listeners.js */ "./static/assets/js/pages/home-page/home-page-listeners.js");
/* harmony import */ var _page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./page-views/home-page/select-data/select-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/select-data/select-data-logic.js");
/* harmony import */ var _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./page-views/home-page/stats/stats-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/stats/stats-logic.js");
/* harmony import */ var _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./page-views/home-page/load-data/load-data-logic.js */ "./static/assets/js/pages/home-page/page-views/home-page/load-data/load-data-logic.js");
/* harmony import */ var _home_page_build_tables_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./home-page-build-tables.js */ "./static/assets/js/pages/home-page/home-page-build-tables.js");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../../lang-manager.ts */ "./static/assets/js/lang-manager.ts");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
















/**
 * Handles actions sent from other pages to this page.
 * @param {Action} action - one of the actions defined in IPM.ACTIONS
 * @returns {Promise<boolean>} - true if the action caused a state dispatch to occur (we will skip the state dispatcher later if this is true)
 */
function handleAction(_x) {
  return _handleAction.apply(this, arguments);
}
function _handleAction() {
  _handleAction = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(actionObj) {
    var dispatchedToState, action, message, user, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          dispatchedToState = false;
          action = actionObj.action;
          message = actionObj.message;
          _t = action;
          _context.n = _t === _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.CLEAR_USER ? 1 : _t === _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.SHOW_DATA_ALREADY_CLEARED_MSG ? 5 : _t === _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.SHOW_NO_USER_MSG ? 6 : _t === _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.QUERY_USER ? 7 : _t === _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].ACTIONS.REFRESH_REFERENCES ? 8 : 9;
          break;
        case 1:
          _context.n = 2;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getUser();
        case 2:
          user = _context.v;
          _context.n = 3;
          return _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.eraseUserFromPage();
        case 3:
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Cleared data of user ".concat(user.name, " (").concat(user.id, ")"));
          _context.n = 4;
          return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
        case 4:
          dispatchedToState = true;
          return _context.a(3, 10);
        case 5:
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Data already cleared");
          return _context.a(3, 10);
        case 6:
          message = actionObj.message || "Cannot perform action; no active user found.";
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgRed(message);
          return _context.a(3, 10);
        case 7:
          _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.AUTO_QUERY = true;
          (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA);
          dispatchedToState = true;
          return _context.a(3, 10);
        case 8:
          (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(_orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA);
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextUtils.queueSelectDataMsgGreen("Refreshed Lookup Data");
          dispatchedToState = true;
          return _context.a(3, 10);
        case 9:
          console.error("Invalid action: ".concat(action));
          return _context.a(3, 10);
        case 10:
          return _context.a(2, dispatchedToState);
      }
    }, _callee);
  }));
  return _handleAction.apply(this, arguments);
}
function processIPMState() {
  return _processIPMState.apply(this, arguments);
}
function _processIPMState() {
  _processIPMState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var ipmState, dispatchedToState, _iterator, _step, actionObj, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return _orchestration_inter_page_manager_ts__WEBPACK_IMPORTED_MODULE_6__["default"].flushState();
        case 1:
          ipmState = _context2.v;
          dispatchedToState = false;
          _iterator = _createForOfIteratorHelper(ipmState.actions);
          _context2.p = 2;
          _iterator.s();
        case 3:
          if ((_step = _iterator.n()).done) {
            _context2.n = 6;
            break;
          }
          actionObj = _step.value;
          _context2.n = 4;
          return handleAction(actionObj);
        case 4:
          dispatchedToState = _context2.v;
        case 5:
          _context2.n = 3;
          break;
        case 6:
          _context2.n = 8;
          break;
        case 7:
          _context2.p = 7;
          _t2 = _context2.v;
          _iterator.e(_t2);
        case 8:
          _context2.p = 8;
          _iterator.f();
          return _context2.f(8);
        case 9:
          return _context2.a(2, dispatchedToState);
      }
    }, _callee2, null, [[2, 7, 8, 9]]);
  }));
  return _processIPMState.apply(this, arguments);
}
function initializeHomePage() {
  return _initializeHomePage.apply(this, arguments);
}
function _initializeHomePage() {
  _initializeHomePage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var VIEWS, _i, _VIEWS, view, user, lang;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          (0,_home_page_listeners_js__WEBPACK_IMPORTED_MODULE_9__.addHomePageListeners)();
          (0,_home_page_build_tables_js__WEBPACK_IMPORTED_MODULE_13__.buildTables)();
          VIEWS = [_page_views_home_page_select_data_select_data_logic_js__WEBPACK_IMPORTED_MODULE_10__.SelectDataView, _page_views_home_page_stats_stats_logic_js__WEBPACK_IMPORTED_MODULE_11__.StatsView, _page_views_home_page_load_data_load_data_logic_js__WEBPACK_IMPORTED_MODULE_12__.LoadDataView];
          _i = 0, _VIEWS = VIEWS;
        case 1:
          if (!(_i < _VIEWS.length)) {
            _context3.n = 3;
            break;
          }
          view = _VIEWS[_i];
          _context3.n = 2;
          return view.initialize(_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher);
        case 2:
          _i++;
          _context3.n = 1;
          break;
        case 3:
          _context3.n = 4;
          return _e7_user_manager_ts__WEBPACK_IMPORTED_MODULE_7__["default"].getUser();
        case 4:
          user = _context3.v;
          console.log("GOT USER", user);
          _context3.n = 5;
          return _lang_manager_ts__WEBPACK_IMPORTED_MODULE_14__.LangManager.getLang();
        case 5:
          lang = _context3.v;
          _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.writeUserInfo(user, lang);
          _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.addExportDataBtnListener();
          _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.addBraceButtonListeners();
          _orchestration_text_controller_js__WEBPACK_IMPORTED_MODULE_2__.TextController.bindAutoClear(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].HOME_PAGE.MESSAGE_ELEMENTS_LIST);
        case 6:
          return _context3.a(2);
      }
    }, _callee3);
  }));
  return _initializeHomePage.apply(this, arguments);
}
function main() {
  return _main.apply(this, arguments);
}
function _main() {
  _main = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          document.addEventListener("DOMContentLoaded", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
            var state, dispatchedToState;
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.n) {
                case 0:
                  initializeHomePage();
                  _context4.n = 1;
                  return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.getState();
                case 1:
                  state = _context4.v;
                  if (!(state === _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA)) {
                    _context4.n = 3;
                    break;
                  }
                  state = _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA; // don't trap user in load data page if something goes wrong
                  _context4.n = 2;
                  return _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_1__.NavBarUtils.eraseUserFromPage();
                case 2:
                  _context4.n = 3;
                  return _orchestration_page_state_manager_js__WEBPACK_IMPORTED_MODULE_0__.PageStateManager.setState(state);
                case 3:
                  _home_page_context_js__WEBPACK_IMPORTED_MODULE_3__.CONTEXT.HOME_PAGE_STATE = state;
                  _context4.n = 4;
                  return processIPMState();
                case 4:
                  dispatchedToState = _context4.v;
                  if (dispatchedToState) {
                    _context4.n = 5;
                    break;
                  }
                  _context4.n = 5;
                  return (0,_home_page_dispatch_js__WEBPACK_IMPORTED_MODULE_8__.stateDispatcher)(state);
                case 5:
                  return _context4.a(2);
              }
            }, _callee4);
          })));
        case 1:
          return _context5.a(2);
      }
    }, _callee5);
  }));
  return _main.apply(this, arguments);
}
main();
})();

/******/ })()
;
//# sourceMappingURL=home-page.bc183afa4cd31451349f.bundle.js.map