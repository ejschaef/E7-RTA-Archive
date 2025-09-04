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
    HOME_PAGE_STATE: "home-page-state",
    INTER_PAGE_MANAGER: "inter-page-manager",
};
// time units in milliseconds
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const DEFAULT_TIMEOUT = DAY * 2;
const USER_DATA_TIMEOUT = WEEK;
const REFERENCE_DATA_TIMEOUT = DAY;
// Key list for creating custom timeouts
const REFERENCE_DATA_KEY_LIST = Object.values(REFERENCE_DATA_KEYS);
const USER_DATA_KEY_LIST = Object.values(USER_DATA_KEYS).filter((key) => key !== USER_DATA_KEYS.FILTER_STR);
function isTimeoutData(data) {
    return Array.isArray(data) && data.length === 2 && typeof data[0] === 'number' && typeof data[1] === 'number';
}
function getCacheTimeout(key) {
    if (REFERENCE_DATA_KEY_LIST.includes(key))
        return REFERENCE_DATA_TIMEOUT;
    if (USER_DATA_KEY_LIST.includes(key))
        return USER_DATA_TIMEOUT;
    return DEFAULT_TIMEOUT;
}
function makeTimeoutData(key) {
    return [Date.now(), getCacheTimeout(key)];
}
const DATA_STORE_NAME = 'DataStore';
const META_STORE_NAME = 'MetaStore';
let ClientCache = {
    consts: {
        DB_NAME: 'E7ArenaStatsClientDB',
        DB_VERSION: 1,
        STORE_NAME: DATA_STORE_NAME,
        META_STORE_NAME: META_STORE_NAME,
    },
    Keys: { ...Keys },
    MetaKeys: {
        TIMESTAMP: "timestamp",
    },
    loaded_UM: new Set(),
    openDB: async function () {
        const db = await (0,idb__WEBPACK_IMPORTED_MODULE_0__.openDB)(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
            upgrade(db) {
                if (db.objectStoreNames.contains(DATA_STORE_NAME)) {
                    db.deleteObjectStore(DATA_STORE_NAME); // 🧹 clear old store
                    console.log('Old store deleted');
                }
                if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
                    console.log('Created data store');
                    db.createObjectStore(DATA_STORE_NAME);
                }
                if (!db.objectStoreNames.contains(META_STORE_NAME)) {
                    console.log('Created meta data store');
                    db.createObjectStore(META_STORE_NAME);
                }
            }
        });
        return db;
    },
    get: async function (key) {
        const db = await this.openDB();
        const result = await db.get(DATA_STORE_NAME, key);
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
        await db.put(DATA_STORE_NAME, data, key);
        await this.setTimeoutDataNow(key);
    },
    delete: async function (key) {
        const db = await this.openDB();
        await db.delete(DATA_STORE_NAME, key);
        await this.deleteTimeoutData(key);
    },
    deleteDB: async function () {
        await indexedDB.deleteDatabase(this.consts.DB_NAME);
        console.log('Database deleted');
    },
    getTimeoutData: async function (key) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        const timeoutData = await db.get(META_STORE_NAME, metakey);
        return timeoutData || null;
    },
    setTimeoutData: async function (key, timeoutData) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        await db.put(META_STORE_NAME, timeoutData, metakey);
    },
    setTimeoutDataNow: async function (key) {
        const timeoutData = makeTimeoutData(key);
        await this.setTimeoutData(key, timeoutData);
    },
    deleteTimeoutData: async function (key) {
        const db = await this.openDB();
        const metakey = `${key + this.MetaKeys.TIMESTAMP}`;
        await db.delete(META_STORE_NAME, metakey);
        console.log(`Deleted ${key} from cache`);
    },
    clearData: async function () {
        const db = await this.openDB();
        await clearStore(db, DATA_STORE_NAME);
        await clearStore(db, META_STORE_NAME);
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
        const timeoutData = await this.getTimeoutData(key);
        const currentTime = Date.now();
        if (!timeoutData) {
            console.log("No timeout data found for " + key);
            return false;
        }
        else if (!isTimeoutData(timeoutData)) {
            console.log(`Invalid timeout data found for ${key}; Invalid Timeout Record: ${timeoutData}`);
            await this.delete(key);
            return false;
        }
        const [timestamp, timeout] = timeoutData;
        const timedelta = currentTime - timestamp;
        if (timedelta > timeout) {
            console.log(`Cache timeout for ${key}; Timeout Record: ${timeoutData}; currentTime: ${currentTime}`);
            await this.delete(key);
            return false;
        }
        console.log(`Cache ok for ${key}; Timeout Record: ${timeoutData}; currentTime: ${currentTime}; timeout: ${getCacheTimeout(key)}; diff: ${currentTime - timeoutData[0]}`);
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
/* harmony import */ var _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stats-builder.ts */ "./static/assets/js/e7/stats-builder.ts");
/* harmony import */ var _battle_transform_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./battle-transform.ts */ "./static/assets/js/e7/battle-transform.ts");
/* harmony import */ var _filter_parsing_functions_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./filter-parsing/functions.ts */ "./static/assets/js/e7/filter-parsing/functions.ts");
/* harmony import */ var _references_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./references.ts */ "./static/assets/js/e7/references.ts");





function applyFilters(battleList, filters) {
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
            // console.log(`Filtering battle:`, b);
            const result = filter.call(b);
            // console.log(`Result: ${result ? "included" : "excluded"}`);
            return result;
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
        _cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].setTimeoutDataNow(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
        return battles;
    },
    applyFilters: applyFilters,
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
        let battles = await this.extendBattles(cleanBattles);
        console.log("Ingested uploaded battle data into cache; modified [BATTLES]");
        return battles;
    },
    getStats: async function (battles, filters, HeroDicts) {
        console.log("Getting stats");
        const numFilters = filters.length;
        console.log(`Applying ${numFilters} filters`);
        const battlesList = Object.values(battles);
        const filteredBattlesList = applyFilters(battlesList, filters);
        const areFiltersApplied = numFilters > 0;
        console.log("Getting preban stats");
        const prebanStats = await _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getPrebanStats(filteredBattlesList, HeroDicts);
        console.log("Getting first pick stats");
        const firstPickStats = await _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getFirstPickStats(filteredBattlesList, HeroDicts);
        console.log("Getting general stats");
        const generalStats = await _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getGeneralStats(filteredBattlesList);
        console.log("Getting hero stats");
        const heroStats = await _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getHeroStats(filteredBattlesList, HeroDicts);
        console.log("Getting server stats");
        const performanceStats = await _stats_builder_ts__WEBPACK_IMPORTED_MODULE_1__["default"].getPerformanceStats(filteredBattlesList);
        console.log("Returning stats");
        return {
            battles: battlesList,
            filteredBattlesObj: Object.fromEntries(filteredBattlesList.map((b) => [b[_references_ts__WEBPACK_IMPORTED_MODULE_4__.COLUMNS_MAP.SEQ_NUM], b])),
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
        return _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].parseDate(str).getTime();
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
        if (typeof value === "number" && typeof this.start === "number" && typeof this.end === "number") {
            // number case
            if (value < this.start)
                return false;
            if (value > this.end)
                return false;
            return value === this.end ? this.endInclusive : true;
        }
        return false;
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
                console.log("Parsed Range literal:", parsedRangeData);
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
/* harmony import */ var _filter_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filter-utils */ "./static/assets/js/e7/filter-parsing/filter-utils.ts");


// FNS that take in a clean format battle and return the appropriate data
const FIELD_EXTRACT_FN_MAP = {
    "date": (battle) => battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME]
        ? _filter_utils__WEBPACK_IMPORTED_MODULE_1__["default"].castStringToUTCDate(battle[_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_MAP.DATE_TIME].split(" ")[0]).getTime()
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
function castStringToUTCDate(dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
}
function parseDate(dateStr) {
    if (!_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.test(dateStr)) {
        throw new SyntaxException(`Invalid date; must be in the format: YYYY-MM-DD ( regex: ${_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.DATE_LITERAL_RE.source} ); got: '${dateStr}'`);
    }
    const date = castStringToUTCDate(dateStr);
    // Check if valid date
    if (isNaN(date.getTime())) {
        throw new SyntaxException(`Invalid date; could not be parsed as a valid date; got: '${dateStr}'`);
    }
    // Check if parsed date matches passed in string
    const dateString = date.toISOString().split("T")[0];
    const [year, month, day] = dateString.split("-").map(Number);
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() + 1 !== month ||
        date.getUTCDate() !== day) {
        throw new SyntaxException(`Invalid date; parsed date: ${date.toISOString()} does not match passed in string: ${dateStr}`);
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
    castStringToUTCDate,
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
        const playerStr = this.isPlayer1 ? "p1." : "p2.";
        return `${prefix}${playerStr}${this.fnName}(${this.argFmtString})`;
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
        // console.log("Calling CR function on battle: ", battle);
        const heroes = this.getHeroes(battle);
        const crBar = this.targetField(battle);
        const heroCr = crBar.find((entry) => entry[0] === this.heroName);
        // console.log("Called CR function; Got: ", heroes, crBar, heroCr, "Filtering using operator: ", this.operator);
        if (!heroCr) {
            return false;
        }
        else if (!heroes.includes(this.heroName)) {
            return false;
        }
        // console.log("Returning value: ", this.operator.call(heroCr[1], this.crThreshold));
        return this.operator.call(heroCr[1], this.crThreshold);
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
        return `Range[ start: ${collection.start}, end: ${collection.end}, incl: ${collection.endInclusive} ]`;
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
        // console.log(`COMPARE OPER: Left: ${a}, Op: ${this.opStr}, Right: ${b}`);
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
        console.log(`Parsing str: ${str} using map:`, _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_MAP);
        return _references__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_MAP[str];
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
/* harmony export */   ONE_DAY_MILLISECONDS: () => (/* binding */ ONE_DAY_MILLISECONDS),
/* harmony export */   PRIMES: () => (/* binding */ PRIMES),
/* harmony export */   TITLE_CASE_COLUMNS: () => (/* binding */ TITLE_CASE_COLUMNS),
/* harmony export */   WORLD_CODES: () => (/* binding */ WORLD_CODES),
/* harmony export */   WORLD_CODE_ENUM: () => (/* binding */ WORLD_CODE_ENUM),
/* harmony export */   WORLD_CODE_LOWERCASE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_LOWERCASE_TO_CLEAN_STR),
/* harmony export */   WORLD_CODE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_TO_CLEAN_STR)
/* harmony export */ });
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
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    master: "Master",
    challenger: "Challenger",
    champion: "Champion",
    warlord: "Warlord",
    emperor: "Emperor",
    legend: "Legend",
};
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
const QUOTED_STRING_RE = /"[^"]*"|'[^']*'/i;
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
function tokenMatchInner(stream) {
    if (stream.match(FUNCTIONS_RE)) {
        // console.log("Matched stream as clause:", stream);
        return "keyword";
    }
    if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
        // console.log("Matched stream as operator:", stream);
        return "operator";
    }
    if (stream.match(new RegExp(`[a-z0-9."'}=)-]${DATAFIELD_RE.source}(?=[,)\\s;]|$)`, "i"))) {
        // console.log("Matched stream as field with preceding fragment:", stream);
        return null;
    }
    if (stream.match(padRegex(FIELD_WORD_RE))) {
        // console.log("Matched stream as Data Field:", stream);
        return "field";
    }
    if (stream.match(padRegex(DATA_WORD_RE))) {
        // console.log("Matched stream as Data Field:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(QUOTED_STRING_RE))) {
        // console.log("Matched stream as string:", stream);
        return "string";
    }
    if (stream.match(padRegex(SET_RE))) {
        // console.log("Matched stream as set:", stream);
        return "set";
    }
    if (stream.match(padRegex(RANGE_RE))) {
        // console.log("Matched stream as range:", stream);
        return "range";
    }
    if (stream.match(/[^(,\s;.=0-9\-]+\d+/i)) {
        // console.log("Matched stream as non-num null", stream);
        return null;
    }
    if (stream.match(padRegex(INT_RE))) {
        // console.log("Matched stream as number:", stream);
        return "declared-data";
    }
    if (stream.match(padRegex(DATE_RE))) {
        // console.log("Matched stream as date:", stream);
        return "declared-data";
    }
    if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
        // console.log("Matched stream as bool:", stream);
        return "declared-data";
    }
    if (stream.match(/[\(\)\{\}\;\,]/)) {
        // console.log("Matched stream as bracket:", stream);
        return "bracket";
    }
    stream.next();
    // console.log("Matched stream as null:", stream);
    return null;
}
function tokenMatch(stream) {
    const result = tokenMatchInner(stream);
    return result;
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
        console.log("Getting season details");
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

/***/ "./static/assets/js/e7/stats-builder.ts":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/stats-builder.ts ***!
  \**********************************************/
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
    if (b === 0)
        return NA;
    return toPercent(a / b);
}
function divideToString(a, b) {
    if (b === 0)
        return NA;
    return (a / b).toFixed(2);
}
function getCR(battle, heroName) {
    const entry = battle[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.CR_BAR].find((entry) => entry[0] === heroName);
    return entry ? entry[1] : null;
}
function computeCRStats(battleList, heroName) {
    const notPostbanned = battleList.filter((b) => {
        const picked = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS].includes(heroName) || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS].includes(heroName);
        const notBanned = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] !== heroName && b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] !== heroName;
        return picked && notBanned;
    });
    let gamesConsidered = notPostbanned.length;
    let crTotal = 0;
    let firstTurns = 0;
    for (const battle of notPostbanned) {
        const cr = getCR(battle, heroName);
        if (cr === null)
            continue;
        crTotal += cr;
        firstTurns += +(cr === 100);
    }
    const avgCR = divideToPercentString(crTotal / 100, gamesConsidered);
    return {
        avgCR,
        firstTurns,
        firstTurnRate: divideToPercentString(firstTurns, gamesConsidered),
    };
}
function computeGenericStats(subset, totalBattles) {
    const wins = getWins(subset).length;
    const subsetLength = subset.length;
    const firstTurns = subset.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_TURN]).length;
    const firstTurnRate = divideToPercentString(firstTurns, subset.length);
    const pointGain = subset.reduce((acc, b) => acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.POINT_GAIN] || 0), 0);
    return {
        wins,
        subsetLength,
        frequency: divideToPercentString(subset.length, totalBattles),
        winRate: divideToPercentString(wins, subset.length),
        plusMinus: 2 * wins - subsetLength,
        pointGain: subset.reduce((acc, b) => acc + (b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.POINT_GAIN] || 0), 0),
        avgPPG: divideToString(pointGain, subsetLength),
        firstTurns,
        firstTurnRate,
    };
}
;
function queryStats(battleList, totalBattles, heroName) {
    const genericStats = computeGenericStats(battleList, totalBattles);
    const postBanned = battleList.reduce((acc, b) => acc +
        +(b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName ||
            b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName), 0);
    const successes = battleList.reduce((acc, b) => acc +
        +(b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN]
            || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_POSTBAN] === heroName
            || b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_POSTBAN] === heroName), 0);
    const crStats = computeCRStats(battleList, heroName);
    return {
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.HERO_NAME]: heroName,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.BATTLES]: genericStats.subsetLength,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PICK_RATE]: genericStats.frequency,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WINS]: genericStats.wins,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.WIN_RATE]: genericStats.winRate,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBANS]: postBanned,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POSTBAN_RATE]: divideToPercentString(postBanned, genericStats.subsetLength),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.SUCCESS_RATE]: divideToPercentString(successes, genericStats.subsetLength),
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.PLUS_MINUS]: genericStats.plusMinus,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.POINT_GAIN]: genericStats.pointGain,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.AVG_CR]: crStats.avgCR,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURNS]: crStats.firstTurns,
        [_references_ts__WEBPACK_IMPORTED_MODULE_1__.HERO_STATS_COLUMN_MAP.FIRST_TURN_RATE]: crStats.firstTurnRate,
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
    if (battleList.length === 0) {
        return [];
    }
    const product = (numVec) => numVec.reduce((acc, n) => acc * n, 1);
    const prebanSet = new Set();
    for (const b of battleList) {
        const prebans = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES];
        if (prebans.length === 0)
            continue;
        for (const preban of prebans) {
            if (preban === HeroDicts.Empty.prime)
                continue;
            prebanSet.add(preban);
        }
        const prebanProduct = product(prebans);
        if (prebanProduct !== HeroDicts.Empty.prime)
            prebanSet.add(prebanProduct);
    }
    console.log("Got prebanSet:", prebanSet);
    const totalBattles = battleList.length;
    const output = [];
    for (const preban of prebanSet) {
        const filtered = battleList.filter((b) => {
            const prebans = b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES];
            return prebans.includes(preban) || product(prebans) === preban;
        });
        const genericStats = computeGenericStats(filtered, totalBattles);
        output.push({
            preban: HeroDicts.prime_pair_lookup[preban],
            wins: genericStats.wins,
            appearances: genericStats.subsetLength,
            appearance_rate: genericStats.frequency,
            win_rate: genericStats.winRate,
            "+/-": genericStats.plusMinus,
        });
    }
    output.sort((a, b) => b.appearances - a.appearances);
    console.log("Preban Stats:", output);
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
    const avgPPG = divideToString(totalGain, totalBattles);
    const totalTurns = battleList.reduce((acc, b) => acc + b["Turns"], 0);
    const avgTurns = divideToString(totalTurns, totalBattles);
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
    const fpStats = computeGenericStats(fpBattles, totalBattles);
    const spStats = computeGenericStats(spBattles, totalBattles);
    // calculate total win rate
    const winRate = divideToPercentString(fpStats.wins + spStats.wins, totalBattles);
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
        first_pick_count: fpStats.subsetLength,
        second_pick_count: spStats.subsetLength,
        first_pick_rate: fpStats.frequency,
        second_pick_rate: spStats.frequency,
        first_pick_winrate: fpStats.winRate,
        second_pick_winrate: spStats.winRate,
        total_winrate: winRate,
        total_battles: totalBattles,
        total_wins: fpStats.wins + spStats.wins,
        max_win_streak: maxWinStreak,
        max_loss_streak: maxLossStreak,
        avg_ppg: avgPPG,
        avg_turns: avgTurns,
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
    const leagues = Object.values(_references_ts__WEBPACK_IMPORTED_MODULE_1__.LEAGUE_MAP);
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
        const count = subset.length;
        if (count === 0)
            continue;
        const subsetStats = computeGenericStats(subset, totalBattles);
        const firstPickGames = subset.filter((b) => b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK]);
        const fpWins = firstPickGames.reduce((acc, b) => acc + +b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN], 0);
        const secondPickGames = subset.filter((b) => !b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK]);
        const spWins = secondPickGames.reduce((acc, b) => acc + +b[_references_ts__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN], 0);
        const targetList = label.toLowerCase().includes("server")
            ? perfStatsContainer.servers
            : perfStatsContainer.leagues;
        targetList.push({
            label,
            count,
            wins: subsetStats.wins,
            win_rate: subsetStats.winRate,
            frequency: subsetStats.frequency,
            "+/-": subsetStats.plusMinus,
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
        ...perfStatsContainer.leagues.slice(-4), // only show highest 4 leagues the player has played against
    ];
}
let StatsBuilder = {
    getHeroStats,
    getFirstPickStats,
    getPrebanStats,
    getPerformanceStats,
    getGeneralStats,
    computeGenericStats,
    queryStats,
    toPercent,
    divideToPercentString,
    divideToString,
    computeCRStats,
    secondsToTimeStr,
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
        await _cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].setTimeoutDataNow(_cache_manager_ts__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
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

/***/ "./static/assets/js/language-support/information-lang-blocks.ts":
/*!**********************************************************************!*\
  !*** ./static/assets/js/language-support/information-lang-blocks.ts ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ELEMENT_IDS: () => (/* binding */ ELEMENT_IDS),
/* harmony export */   FILTER_EXAMPLES_AND_TEST_BLOCK: () => (/* binding */ FILTER_EXAMPLES_AND_TEST_BLOCK),
/* harmony export */   LangBlocks: () => (/* binding */ LangBlocks),
/* harmony export */   WELCOME_BLOCK: () => (/* binding */ WELCOME_BLOCK)
/* harmony export */ });
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/references */ "./static/assets/js/e7/references.ts");
/* harmony import */ var _pages_page_utilities_doc_element_references__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../pages/page-utilities/doc-element-references */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");


const ELEMENT_IDS = _pages_page_utilities_doc_element_references__WEBPACK_IMPORTED_MODULE_1__["default"].INFO_PAGE.IDS;
const EN = _e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.EN;
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
        [EN]: `Filters are primarily used to adjust which battles the user wants to 
    include when calculating stats like win rate and pick rate. They can also be used to 
    automatically adjust the chart to the filtered subset if desired. Almost all columns 
    listed in the full table of battles at the bottom of the stats page can filtered on using 
    the custom syntax. The rest of this page will detail the exact syntax and rules for writing filters.`,
    },
    objectTypesTitle: {
        [EN]: "Object Types",
    },
    objectTypesDescription: {
        [EN]: "There are 5 main syntactic objects:",
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
};
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
        [EN]: "the season the battle occured (resolves to the internal season code, not the name or number)",
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
        [EN]: "set of all the prebanned heroes",
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
        [EN]: "accesses the set of the 2 heroes prebanned by the specified player",
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
};
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
        [EN]: `Must use semicolons to separate filters when multiple are used. Do not use semicolons in functions.`,
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
const FILTER_EXAMPLES_AND_TEST_BLOCK = {
    EX1_TITLE: {
        [EN]: "Filter Example 1",
    },
    EX1_DESCRIPTION: {
        [EN]: `This filter takes only battles in the current season and filters for first pick
              games where the player selected either ML Peira or New Moon Luna as their first pick and
              harsetti was prebanned.`,
    },
    EX2_TITLE: {
        [EN]: "Filter Example 2",
    },
    EX2_DESCRIPTION: {
        [EN]: `This filter first selects the most recent 500 battles, then filters
              those for second pick games that occurred between April 2025 and June 2025
              in which either the opponent is in Warlord, Emeperor, or Legend and picked Zio on 3, or games
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
        [EN]: `This filter selects only games in which ML Arunka and Rinak are prebanned,
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
};
const WELCOME_BLOCK = {
    TITLE: {
        [EN]: "Welcome to E7 RTA Archive",
    },
    DESCRIPTION_PART1: {
        [EN]: `This tool primarily enables E7 players to maintain their RTA history beyond 100 battles.`,
    },
    DESCRIPTION_PART2: {
        [EN]: `Users can query their most recent 100 battles just like the E7 website, then download the data and upload in the future to maintain a continuous history.`,
    },
    DESCRIPTION_PART3: {
        [EN]: `All uploads are handled exclusively by the client. No data from the upload is sent to the server.`,
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
const LangBlocks = {
    Welcome: WELCOME_BLOCK,
    FilterExamplesAndTest: FILTER_EXAMPLES_AND_TEST_BLOCK,
    FilterOverview: FilterOverview,
    Functions: Functions,
    DeclaredData: DeclaredData,
    Fields: Fields,
    Operators: Operators,
    Syntax: Syntax,
    WELCOME_BLOCK: WELCOME_BLOCK
};


/***/ }),

/***/ "./static/assets/js/language-support/lang-builder.ts":
/*!***********************************************************!*\
  !*** ./static/assets/js/language-support/lang-builder.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TextRetrieveFns: () => (/* binding */ TextRetrieveFns),
/* harmony export */   getText: () => (/* binding */ getText)
/* harmony export */ });
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/references */ "./static/assets/js/e7/references.ts");

function getText(lang, block) {
    return block[lang] ?? block[_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.EN];
}
const TextRetrieveFns = {
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.EN]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.EN, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.DE]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.DE, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.KO]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.KO, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.PT]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.PT, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.TH]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.TH, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ZH_TW]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ZH_TW, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.JA]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.JA, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.FR]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.FR, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ZH_CN]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ZH_CN, block); },
    [_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ES]: function (block) { return getText(_e7_references__WEBPACK_IMPORTED_MODULE_0__.LANGUAGES.CODES.ES, block); },
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

/***/ "./static/assets/js/pages/information.ts":
/*!***********************************************!*\
  !*** ./static/assets/js/pages/information.ts ***!
  \***********************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   makeExampleFilterCardHTMLStr: () => (/* binding */ makeExampleFilterCardHTMLStr)
/* harmony export */ });
/* harmony import */ var _e7_regex_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/regex.ts */ "./static/assets/js/e7/regex.ts");
/* harmony import */ var _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./page-utilities/nav-bar-utils.ts */ "./static/assets/js/pages/page-utilities/nav-bar-utils.ts");
/* harmony import */ var _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../language-support/information-lang-blocks.ts */ "./static/assets/js/language-support/information-lang-blocks.ts");
/* harmony import */ var _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./html-constructor/html-constructor.ts */ "./static/assets/js/pages/html-constructor/html-constructor.ts");
/* harmony import */ var _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./page-utilities/doc-element-references.ts */ "./static/assets/js/pages/page-utilities/doc-element-references.ts");
/* harmony import */ var _html_safe_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../html-safe.ts */ "./static/assets/js/html-safe.ts");
/* harmony import */ var _lang_manager_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../lang-manager.ts */ "./static/assets/js/lang-manager.ts");
/* harmony import */ var _language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../language-support/lang-builder.ts */ "./static/assets/js/language-support/lang-builder.ts");









const EDITORS = [];
let CURRENT_CARD = null;
const ELEMENT_IDS = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS;
function makeExampleFilterCardHTMLStr(title, description, exFilterTextAreaID) {
    return `
    <div class="col-sm-12 d-none", id="${exFilterTextAreaID}-card">
      <div class="card">
        <div class="card-header">
          <h5>${title}</h5>
          <p class="text-sm">${description}</p>
        </div>
        <div class="card-body pc-component text-sm" id="${exFilterTextAreaID}-wrapper">
          <textarea name="code" class="codemirror-hidden" id="${exFilterTextAreaID}"></textarea>
        </div>
      </div>
    </div>
  `; // height of codeMirror area is set by style applied to wrapper id in CSS file
}
function makeTestFilterHTMLStr(title, description) {
    return `
    <div class="col-sm-12 d-none" id="${ELEMENT_IDS.TEST_SYNTAX_CARD}">
      <div class="card">
        <div class="card-header text-center kpi-header tight-fit">
          <h3>${title}</h3>
          <h6 class="small-text">${description}</h6>
        </div>
        <div class="card-body text-center kpi-body tight-fit">
          <div class="row justify-content-center px-4">
            <span class="d-block mb-1 rel-width-80 scrollable-60px" id="${ELEMENT_IDS.TEST_FILTER_MESSAGE}">&nbsp;</span>
              <textarea id="codeArea" name="code" class="codemirror-hidden"></textarea>
              <div class="d-flex justify-content-center gap-3 mt-4">
                <button type="button" id="${ELEMENT_IDS.CHECK_SYNTAX_BTN}" name="check-syntax" value="check" class="btn shadow px-sm-1">Check
                  Syntax</button>
              </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function makeOverviewHTMLStr(languageCode) {
    const WELCOME_BLOCK = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.WELCOME_BLOCK;
    return `
		<div class="col-md-9 mb-3 d-none", id="${_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.OVERVIEW_CARD}">
			<div class="card">
				<div class="card-header text-center">
					<h3>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.TITLE)}</h3>
				</div>
				<div class="card-body text-start py-3 px-5">
					<ul>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART1)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART2)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART3)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART4)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART5)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART6)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART7)}</li>
						<li>${(0,_language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.getText)(languageCode, WELCOME_BLOCK.DESCRIPTION_PART8)}</li>
					</ul>
				</div>
			</div>
		</div>
  `;
}
function makeExampleAndTestHTMLStr(lang) {
    let exampleFilterStr = "";
    const getText = _language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.TextRetrieveFns[lang];
    const LANG_BLOCK = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.FilterExamplesAndTest;
    exampleFilterStr += makeExampleFilterCardHTMLStr(getText(LANG_BLOCK.EX1_TITLE), getText(LANG_BLOCK.EX1_DESCRIPTION), _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.EX_FILTER_1);
    exampleFilterStr += makeExampleFilterCardHTMLStr(getText(LANG_BLOCK.EX2_TITLE), getText(LANG_BLOCK.EX2_DESCRIPTION), _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.EX_FILTER_2);
    exampleFilterStr += makeExampleFilterCardHTMLStr(getText(LANG_BLOCK.EX3_TITLE), getText(LANG_BLOCK.EX3_DESCRIPTION), _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.EX_FILTER_3);
    exampleFilterStr += makeExampleFilterCardHTMLStr(getText(LANG_BLOCK.EX4_TITLE), getText(LANG_BLOCK.EX4_DESCRIPTION), _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.EX_FILTER_4);
    exampleFilterStr += makeExampleFilterCardHTMLStr(getText(LANG_BLOCK.EX5_TITLE), getText(LANG_BLOCK.EX5_DESCRIPTION), _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.EX_FILTER_5);
    exampleFilterStr += makeTestFilterHTMLStr(getText(LANG_BLOCK.TEST_TITLE), getText(LANG_BLOCK.TEST_DESCRIPTION));
    return exampleFilterStr;
}
function injectInCard(composeList, cardArgs) {
    const composeElt = {
        tag: "div",
        classes: ["col-sm-12", "d-none"],
        children: [
            {
                tag: "div",
                classes: ["card"],
                children: composeList
            },
        ],
        attributes: cardArgs?.attributes
    };
    return composeElt;
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
function cardHeader(title, hNum = 1, subheader) {
    const header = {
        tag: "div",
        classes: ["card-header"],
        children: [
            {
                tag: "h" + hNum,
                textContent: title
            }
        ]
    };
    if (subheader)
        header.children?.push(paragraph(subheader));
    return header;
}
function cardBody({ composeList, classes, option }) {
    return {
        tag: "div",
        classes: ["card-body", "pc-component"].concat(classes ?? []),
        option: option,
        children: composeList
    };
}
function hr() {
    return {
        tag: "hr"
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
function filterSyntaxTable(composeList) {
    return {
        tag: "table",
        style: "width: 100%;",
        classes: ["table", "filter-syntax-table"],
        children: [
            {
                tag: "tbody",
                children: composeList
            }
        ]
    };
}
function syntaxRulesTableRow({ leftText, rightText, leftClasses, rightClasses }) {
    return {
        tag: "tr",
        children: [
            {
                tag: "td",
                style: "white-space: nowrap;",
                classes: leftClasses ?? [],
                textContent: leftText
            },
            {
                tag: "td",
                classes: ["cm-def"],
                innerHtml: "&rarr;"
            },
            {
                tag: "td",
                classes: rightClasses ?? [],
                textContent: rightText
            }
        ]
    };
}
function SyntaxRulesTableRows({ entries, leftClasses, rightClasses }) {
    return entries.map(([leftText, rightText]) => syntaxRulesTableRow({ leftText, rightText, leftClasses, rightClasses }));
}
function makeComposeList(lang) {
    const text = _language_support_lang_builder_ts__WEBPACK_IMPORTED_MODULE_8__.TextRetrieveFns[lang];
    const FilterOverview = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.FilterOverview;
    let filterOverviewBody = [
        cardHeader(text(FilterOverview.generalOverviewTitle), 3, text(FilterOverview.generalOverviewDescription)),
        cardBody({ option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        header(text(FilterOverview.filterUsageTitle), 4),
        paragraph(text(FilterOverview.filterUsageDescription)),
        hr(),
        header(text(FilterOverview.objectTypesTitle), 4),
        paragraph(text(FilterOverview.objectTypesDescription)),
        listElement({
            outertag: "ol",
            outerclasses: ["text-sm"],
            textList: text(FilterOverview.objectTypesList)
        }),
        hr(),
        header(text(FilterOverview.highLevelRulesTitle), 4),
        listElement({
            outertag: "ol",
            outerclasses: ["text-sm"],
            textList: text(FilterOverview.highLevelRulesList)
        }),
    ];
    const filterOverviewCard = injectInCard(filterOverviewBody, { attributes: { id: ELEMENT_IDS.FILTER_OVERVIEW } });
    const Fields = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.Fields;
    let fieldBody = [
        cardHeader(text(Fields.title), 5),
        cardBody({ classes: ["text-sm"], option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["date", text(Fields.date)],
                ["season", text(Fields.season)],
                ["is-win", text(Fields.isWin)],
                ["is-first-pick", text(Fields.isFirstPick)],
                ["is-first-turn", text(Fields.isFirstTurn)],
                ["first-turn-hero", text(Fields.firstTurnHero)],
                ["victory-points", text(Fields.victoryPoints)],
                ["prebans", text(Fields.prebans)],
                ["postbans", text(Fields.postbans)],
                ["turns", text(Fields.turns)],
                ["seconds", text(Fields.seconds)],
                ["point-gain", text(Fields.pointGain)],
            ],
            leftClasses: ["cm-datafield"],
            rightClasses: ["cm-default"]
        })),
        paragraph(text(Fields.attributesTitle)),
        paragraph(text(Fields.attributesDescription), ["text-sm"]),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["pick[n]", text(Fields.pickN)],
                ["picks", text(Fields.picks)],
                ["league", text(Fields.league)],
                ["prebans", text(Fields.prebansAttribute)],
                ["postban", text(Fields.postban)],
                ["server", text(Fields.server)],
                ["id", text(Fields.id)],
                ["mvp", text(Fields.mvp)],
            ],
            leftClasses: ["cm-datafield"],
            rightClasses: ["cm-default"]
        }))
    ];
    const fieldCard = injectInCard(fieldBody, { attributes: { id: ELEMENT_IDS.FIELD_SYNTAX } });
    const DeclaredData = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.DeclaredData;
    const declaredDataBody = [
        cardHeader(text(DeclaredData.title), 5),
        cardBody({ classes: ["text-sm"], option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["Integer", text(DeclaredData.Integer)],
                ["Date", text(DeclaredData.Date)],
                ["String", text(DeclaredData.String)],
                ["Boolean", text(DeclaredData.Boolean)],
                ["Set", text(DeclaredData.Set)],
                ["Range", text(DeclaredData.Range)],
                ["Season", text(DeclaredData.Season)],
            ],
            leftClasses: ["cm-declared-data"],
            rightClasses: ["cm-default"]
        }))
    ];
    const declaredDataCard = injectInCard(declaredDataBody, { attributes: { id: ELEMENT_IDS.DATA_SYNTAX } });
    const Operators = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.Operators;
    const operatorsBody = [
        cardHeader(text(Operators.title), 5),
        cardBody({ classes: ["text-sm"], option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["=", text(Operators.equal)],
                ["!=", text(Operators.notEqual)],
                [">", text(Operators.gt)],
                [">=", text(Operators.gte)],
                ["<", text(Operators.lt)],
                ["<=", text(Operators.lte)],
                ["in", text(Operators.in)],
                ["!in", text(Operators.notIn)],
            ],
            leftClasses: ["cm-operator"],
            rightClasses: ["cm-default"]
        }))
    ];
    const operatorsCard = injectInCard(operatorsBody, { attributes: { id: ELEMENT_IDS.OPERATOR_SYNTAX } });
    const Functions = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.Functions;
    const functionsBody = [
        cardHeader(text(Functions.title), 5),
        cardBody({ classes: ["text-sm"], option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        paragraph(text(Functions.clauseFunctionsTitle)),
        paragraph(text(Functions.clauseFunctionsDescription), ["text-sm"]),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["AND", text(Functions.AND)],
                ["OR", text(Functions.OR)],
                ["XOR", text(Functions.XOR)],
                ["NOT", text(Functions.NOT)],
            ],
            leftClasses: ["cm-keyword"],
            rightClasses: ["cm-default"]
        })),
        paragraph(text(Functions.directFunctionsTitle)),
        paragraph(text(Functions.directFunctionsDescription), ["text-sm"]),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["[p1/p2].equipment(hero, str/set)", text(Functions.EQUIPMENT)],
                ["[p1/p2].artifact(hero, str/set)", text(Functions.ARTIFACT)],
                ["[p1/p2].CR(hero, operator, integer)", text(Functions.CR)],
            ],
            leftClasses: ["cm-keyword"],
            rightClasses: ["cm-default"]
        })),
        paragraph(text(Functions.globalFiltersTitle)),
        paragraph(text(Functions.globalFiltersDescription), ["text-sm"]),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                ["last-N", text(Functions.lastN)],
            ],
            leftClasses: ["cm-keyword"],
            rightClasses: ["cm-default"]
        })),
    ];
    const functionsCard = injectInCard(functionsBody, { attributes: { id: ELEMENT_IDS.FUNCTION_SYNTAX } });
    const Syntax = _language_support_information_lang_blocks_ts__WEBPACK_IMPORTED_MODULE_3__.LangBlocks.Syntax;
    const syntaxBody = [
        cardHeader(text(Syntax.title), 5),
        cardBody({ classes: ["text-sm"], option: _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.ComposeOption.NEST }),
        filterSyntaxTable(SyntaxRulesTableRows({
            entries: [
                [";", text(Syntax.semiColon)],
                [",", text(Syntax.comma)],
                ["(", text(Syntax.parentheses)],
                ["{", text(Syntax.braces)],
            ],
            leftClasses: ["cm-bracket"],
            rightClasses: ["cm-default"]
        }))
    ];
    const syntaxCard = injectInCard(syntaxBody, { attributes: { id: ELEMENT_IDS.STRUCTURAL_SYNTAX } });
    return [filterOverviewCard, fieldCard, declaredDataCard, operatorsCard, functionsCard, syntaxCard];
}
function makeExFilter(textAreaID, str) {
    const textArea = _html_safe_ts__WEBPACK_IMPORTED_MODULE_6__.Safe.unwrapHtmlElt(textAreaID);
    textArea.value = str.replace(/^\n/, "");
    // @ts-ignore
    const editor = CodeMirror.fromTextArea(textArea, {
        mode: "filterSyntax",
        lineNumbers: true,
        theme: "default",
        readOnly: true,
    });
    EDITORS.push(editor);
    textArea.classList.remove("codemirror-hidden");
}
function initializeCodeBlocksAndAddListeners() {
    // @ts-ignore
    CodeMirror.defineMode("filterSyntax", function () {
        return {
            token: function (stream, _state) {
                return _e7_regex_ts__WEBPACK_IMPORTED_MODULE_0__.RegExps.tokenMatch(stream);
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
p2.cr("New Moon Luna" > 100);
p2.server in {global, asia, Japan};`;
    makeExFilter("exFilter5", ex5Str);
    const textarea = _html_safe_ts__WEBPACK_IMPORTED_MODULE_6__.Safe.unwrapHtmlElt("codeArea");
    // @ts-ignore
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: "filterSyntax",
        lineNumbers: true,
        theme: "default",
    });
    EDITORS.push(editor);
    // Intercept form submission
    const checkSyntaxBtn = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.CHECK_SYNTAX_BTN);
    checkSyntaxBtn.addEventListener("click", async function (event) {
        event.preventDefault(); // Prevent actual form submission to server
        // Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
        // @ts-ignore
        _html_safe_ts__WEBPACK_IMPORTED_MODULE_6__.Safe.unwrapHtmlElt("codeArea").value = editor.getValue();
        const syntaxStr = editor.getValue();
        console.log("Checking Str", syntaxStr);
        await _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].validateFilterSyntax(syntaxStr);
    });
    // sync changes back to textarea if needed
    editor.on("change", () => {
        editor.save(); // Updates the hidden textarea for form submit
    });
    // Show the editor after it's initialized
    textarea.classList.remove("codemirror-hidden");
}
async function addText() {
    const rulesContainer = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.FILTER_SYNTAX_CONTAINER);
    const lang = await _lang_manager_ts__WEBPACK_IMPORTED_MODULE_7__.LangManager.getLang();
    const composeList = makeComposeList(lang);
    console.log("Compose List", composeList);
    const constructor = new _html_constructor_html_constructor_ts__WEBPACK_IMPORTED_MODULE_4__.HTMLConstructor(rulesContainer);
    constructor.compose(composeList);
    const exampleAndTestContainer = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.FILTER_EXAMPLES_AND_TEST_CONTAINER);
    const exampleAndTestHTMLStr = makeExampleAndTestHTMLStr(lang);
    exampleAndTestContainer.innerHTML = exampleAndTestHTMLStr;
    const overviewContainer = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.OVERVIEW_CONTAINER);
    const overviewHTMLStr = makeOverviewHTMLStr(lang);
    overviewContainer.innerHTML = overviewHTMLStr;
}
function addLinkClickListener() {
    const linkContainer = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.INFORMATION_CONTENT_LINKS_CONTAINER);
    linkContainer.addEventListener("click", function (event) {
        const target = event.target;
        if (target.name === "link-button") {
            const id = target.id;
            const cardTarget = id.replace("link", "card");
            const card = document.getElementById(cardTarget);
            CURRENT_CARD = card;
            card?.classList.remove("d-none");
            for (const editor of EDITORS) {
                editor.refresh();
            }
            _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.RETURN_CONTAINER).classList.remove("d-none");
            linkContainer.classList.add("d-none");
        }
    });
}
;
function addReturnBtnListener() {
    const returnBtn = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.RETURN_BTN);
    const linkContainer = _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.INFORMATION_CONTENT_LINKS_CONTAINER);
    returnBtn.addEventListener("click", function (event) {
        linkContainer.classList.remove("d-none");
        CURRENT_CARD?.classList.add("d-none");
        _page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.getFromId(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].INFO_PAGE.IDS.RETURN_CONTAINER).classList.add("d-none");
    });
}
async function main() {
    await addText();
    await _page_utilities_nav_bar_utils_ts__WEBPACK_IMPORTED_MODULE_2__.NavBarUtils.initialize();
    addLinkClickListener();
    addReturnBtnListener();
    _page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].setVisibility(_page_utilities_doc_element_references_ts__WEBPACK_IMPORTED_MODULE_5__["default"].BODY_FOOTER_CONTAINER, true);
    initializeCodeBlocksAndAddListeners();
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
/******/ 	var __webpack_exports__ = __webpack_require__("./static/assets/js/pages/information.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=information.5132b4b2ca45f7bebb7c.bundle.js.map