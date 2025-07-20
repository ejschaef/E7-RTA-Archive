/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/idb/build/index.js":
/*!*****************************************!*\
  !*** ./node_modules/idb/build/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
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

/***/ "./node_modules/papaparse/papaparse.min.js":
/*!*************************************************!*\
  !*** ./node_modules/papaparse/papaparse.min.js ***!
  \*************************************************/
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* @license
Papa Parse
v5.5.3
https://github.com/mholt/PapaParse
License: MIT
*/
((e,t)=>{ true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (t),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0})(this,function r(){var n="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==n?n:{};var d,s=!n.document&&!!n.postMessage,a=n.IS_PAPA_WORKER||!1,o={},h=0,v={};function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=b(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t}.call(this,e),this.parseChunk=function(t,e){var i=parseInt(this._config.skipFirstNLines)||0;if(this.isFirstChunk&&0<i){let e=this._config.newline;e||(r=this._config.quoteChar||'"',e=this._handle.guessLineEndings(t,r)),t=[...t.split(e).slice(i)].join(e)}this.isFirstChunk&&U(this._config.beforeFirstChunk)&&void 0!==(r=this._config.beforeFirstChunk(t))&&(t=r),this.isFirstChunk=!1,this._halted=!1;var i=this._partialLine+t,r=(this._partialLine="",this._handle.parse(i,this._baseIndex,!this._finished));if(!this._handle.paused()&&!this._handle.aborted()){t=r.meta.cursor,i=(this._finished||(this._partialLine=i.substring(t-this._baseIndex),this._baseIndex=t),r&&r.data&&(this._rowCount+=r.data.length),this._finished||this._config.preview&&this._rowCount>=this._config.preview);if(a)n.postMessage({results:r,workerId:v.WORKER_ID,finished:i});else if(U(this._config.chunk)&&!e){if(this._config.chunk(r,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);this._completeResults=r=void 0}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(r.data),this._completeResults.errors=this._completeResults.errors.concat(r.errors),this._completeResults.meta=r.meta),this._completed||!i||!U(this._config.complete)||r&&r.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),i||r&&r.meta.paused||this._nextChunk(),r}this._halted=!0},this._sendError=function(e){U(this._config.error)?this._config.error(e):a&&this._config.error&&n.postMessage({workerId:v.WORKER_ID,error:e,finished:!1})}}function f(e){var r;(e=e||{}).chunkSize||(e.chunkSize=v.RemoteChunkSize),u.call(this,e),this._nextChunk=s?function(){this._readChunk(),this._chunkLoaded()}:function(){this._readChunk()},this.stream=function(e){this._input=e,this._nextChunk()},this._readChunk=function(){if(this._finished)this._chunkLoaded();else{if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),s||(r.onload=y(this._chunkLoaded,this),r.onerror=y(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!s),this._config.downloadRequestHeaders){var e,t=this._config.downloadRequestHeaders;for(e in t)r.setRequestHeader(e,t[e])}var i;this._config.chunkSize&&(i=this._start+this._config.chunkSize-1,r.setRequestHeader("Range","bytes="+this._start+"-"+i));try{r.send(this._config.downloadRequestBody)}catch(e){this._chunkError(e.message)}s&&0===r.status&&this._chunkError()}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize||r.responseText.length,this._finished=!this._config.chunkSize||this._start>=(e=>null!==(e=e.getResponseHeader("Content-Range"))?parseInt(e.substring(e.lastIndexOf("/")+1)):-1)(r),this.parseChunk(r.responseText)))},this._chunkError=function(e){e=r.statusText||e;this._sendError(new Error(e))}}function l(e){(e=e||{}).chunkSize||(e.chunkSize=v.LocalChunkSize),u.call(this,e);var i,r,n="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,r=e.slice||e.webkitSlice||e.mozSlice,n?((i=new FileReader).onload=y(this._chunkLoaded,this),i.onerror=y(this._chunkError,this)):i=new FileReaderSync,this._nextChunk()},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk()},this._readChunk=function(){var e=this._input,t=(this._config.chunkSize&&(t=Math.min(this._start+this._config.chunkSize,this._input.size),e=r.call(e,this._start,t)),i.readAsText(e,this._config.encoding));n||this._chunkLoaded({target:{result:t}})},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result)},this._chunkError=function(){this._sendError(i.error)}}function c(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){var e,t;if(!this._finished)return e=this._config.chunkSize,i=e?(t=i.substring(0,e),i.substring(e)):(t=i,""),this._finished=!i,this.parseChunk(t)}}function p(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause()},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume()},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError)},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0)},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0},this._streamData=y(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()))}catch(e){this._streamError(e)}},this),this._streamError=y(function(e){this._streamCleanUp(),this._sendError(e)},this),this._streamEnd=y(function(){this._streamCleanUp(),r=!0,this._streamData("")},this),this._streamCleanUp=y(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError)},this)}function i(m){var n,s,a,t,o=Math.pow(2,53),h=-o,u=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,d=/^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/,i=this,r=0,f=0,l=!1,e=!1,c=[],p={data:[],errors:[],meta:{}};function y(e){return"greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(p&&a&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+v.DefaultDelimiter+"'"),a=!1),m.skipEmptyLines&&(p.data=p.data.filter(function(e){return!y(e)})),_()){if(p)if(Array.isArray(p.data[0])){for(var e=0;_()&&e<p.data.length;e++)p.data[e].forEach(t);p.data.splice(0,1)}else p.data.forEach(t);function t(e,t){U(m.transformHeader)&&(e=m.transformHeader(e,t)),c.push(e)}}function i(e,t){for(var i=m.header?{}:[],r=0;r<e.length;r++){var n=r,s=e[r],s=((e,t)=>(e=>(m.dynamicTypingFunction&&void 0===m.dynamicTyping[e]&&(m.dynamicTyping[e]=m.dynamicTypingFunction(e)),!0===(m.dynamicTyping[e]||m.dynamicTyping)))(e)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&((e=>{if(u.test(e)){e=parseFloat(e);if(h<e&&e<o)return 1}})(t)?parseFloat(t):d.test(t)?new Date(t):""===t?null:t):t)(n=m.header?r>=c.length?"__parsed_extra":c[r]:n,s=m.transform?m.transform(s,n):s);"__parsed_extra"===n?(i[n]=i[n]||[],i[n].push(s)):i[n]=s}return m.header&&(r>c.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+c.length+" fields but parsed "+r,f+t):r<c.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+c.length+" fields but parsed "+r,f+t)),i}var r;p&&(m.header||m.dynamicTyping||m.transform)&&(r=1,!p.data.length||Array.isArray(p.data[0])?(p.data=p.data.map(i),r=p.data.length):p.data=i(p.data,0),m.header&&p.meta&&(p.meta.fields=c),f+=r)}function _(){return m.header&&0===c.length}function k(e,t,i,r){e={type:e,code:t,message:i};void 0!==r&&(e.row=r),p.errors.push(e)}U(m.step)&&(t=m.step,m.step=function(e){p=e,_()?g():(g(),0!==p.data.length&&(r+=e.data.length,m.preview&&r>m.preview?s.abort():(p.data=p.data[0],t(p,i))))}),this.parse=function(e,t,i){var r=m.quoteChar||'"',r=(m.newline||(m.newline=this.guessLineEndings(e,r)),a=!1,m.delimiter?U(m.delimiter)&&(m.delimiter=m.delimiter(e),p.meta.delimiter=m.delimiter):((r=((e,t,i,r,n)=>{var s,a,o,h;n=n||[",","\t","|",";",v.RECORD_SEP,v.UNIT_SEP];for(var u=0;u<n.length;u++){for(var d,f=n[u],l=0,c=0,p=0,g=(o=void 0,new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e)),_=0;_<g.data.length;_++)i&&y(g.data[_])?p++:(d=g.data[_].length,c+=d,void 0===o?o=d:0<d&&(l+=Math.abs(d-o),o=d));0<g.data.length&&(c/=g.data.length-p),(void 0===a||l<=a)&&(void 0===h||h<c)&&1.99<c&&(a=l,s=f,h=c)}return{successful:!!(m.delimiter=s),bestDelimiter:s}})(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess)).successful?m.delimiter=r.bestDelimiter:(a=!0,m.delimiter=v.DefaultDelimiter),p.meta.delimiter=m.delimiter),b(m));return m.preview&&m.header&&r.preview++,n=e,s=new E(r),p=s.parse(n,t,i),g(),l?{meta:{paused:!0}}:p||{meta:{paused:!1}}},this.paused=function(){return l},this.pause=function(){l=!0,s.abort(),n=U(m.chunk)?"":n.substring(s.getCharIndex())},this.resume=function(){i.streamer._halted?(l=!1,i.streamer.parseChunk(n,!0)):setTimeout(i.resume,3)},this.aborted=function(){return e},this.abort=function(){e=!0,s.abort(),p.meta.aborted=!0,U(m.complete)&&m.complete(p),n=""},this.guessLineEndings=function(e,t){e=e.substring(0,1048576);var t=new RegExp(P(t)+"([^]*?)"+P(t),"gm"),i=(e=e.replace(t,"")).split("\r"),t=e.split("\n"),e=1<t.length&&t[0].length<i[0].length;if(1===i.length||e)return"\n";for(var r=0,n=0;n<i.length;n++)"\n"===i[n][0]&&r++;return r>=i.length/2?"\r\n":"\r"}}function P(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(C){var S=(C=C||{}).delimiter,O=C.newline,x=C.comments,I=C.step,A=C.preview,T=C.fastMode,D=null,L=!1,F=null==C.quoteChar?'"':C.quoteChar,j=F;if(void 0!==C.escapeChar&&(j=C.escapeChar),("string"!=typeof S||-1<v.BAD_DELIMITERS.indexOf(S))&&(S=","),x===S)throw new Error("Comment character same as delimiter");!0===x?x="#":("string"!=typeof x||-1<v.BAD_DELIMITERS.indexOf(x))&&(x=!1),"\n"!==O&&"\r"!==O&&"\r\n"!==O&&(O="\n");var z=0,M=!1;this.parse=function(i,t,r){if("string"!=typeof i)throw new Error("Input must be a string");var n=i.length,e=S.length,s=O.length,a=x.length,o=U(I),h=[],u=[],d=[],f=z=0;if(!i)return w();if(T||!1!==T&&-1===i.indexOf(F)){for(var l=i.split(O),c=0;c<l.length;c++){if(d=l[c],z+=d.length,c!==l.length-1)z+=O.length;else if(r)return w();if(!x||d.substring(0,a)!==x){if(o){if(h=[],k(d.split(S)),R(),M)return w()}else k(d.split(S));if(A&&A<=c)return h=h.slice(0,A),w(!0)}}return w()}for(var p=i.indexOf(S,z),g=i.indexOf(O,z),_=new RegExp(P(j)+P(F),"g"),m=i.indexOf(F,z);;)if(i[z]===F)for(m=z,z++;;){if(-1===(m=i.indexOf(F,m+1)))return r||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:z}),E();if(m===n-1)return E(i.substring(z,m).replace(_,F));if(F===j&&i[m+1]===j)m++;else if(F===j||0===m||i[m-1]!==j){-1!==p&&p<m+1&&(p=i.indexOf(S,m+1));var y=v(-1===(g=-1!==g&&g<m+1?i.indexOf(O,m+1):g)?p:Math.min(p,g));if(i.substr(m+1+y,e)===S){d.push(i.substring(z,m).replace(_,F)),i[z=m+1+y+e]!==F&&(m=i.indexOf(F,z)),p=i.indexOf(S,z),g=i.indexOf(O,z);break}y=v(g);if(i.substring(m+1+y,m+1+y+s)===O){if(d.push(i.substring(z,m).replace(_,F)),b(m+1+y+s),p=i.indexOf(S,z),m=i.indexOf(F,z),o&&(R(),M))return w();if(A&&h.length>=A)return w(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:z}),m++}}else if(x&&0===d.length&&i.substring(z,z+a)===x){if(-1===g)return w();z=g+s,g=i.indexOf(O,z),p=i.indexOf(S,z)}else if(-1!==p&&(p<g||-1===g))d.push(i.substring(z,p)),z=p+e,p=i.indexOf(S,z);else{if(-1===g)break;if(d.push(i.substring(z,g)),b(g+s),o&&(R(),M))return w();if(A&&h.length>=A)return w(!0)}return E();function k(e){h.push(e),f=z}function v(e){var t=0;return t=-1!==e&&(e=i.substring(m+1,e))&&""===e.trim()?e.length:t}function E(e){return r||(void 0===e&&(e=i.substring(z)),d.push(e),z=n,k(d),o&&R()),w()}function b(e){z=e,k(d),d=[],g=i.indexOf(O,z)}function w(e){if(C.header&&!t&&h.length&&!L){var s=h[0],a=Object.create(null),o=new Set(s);let n=!1;for(let r=0;r<s.length;r++){let i=s[r];if(a[i=U(C.transformHeader)?C.transformHeader(i,r):i]){let e,t=a[i];for(;e=i+"_"+t,t++,o.has(e););o.add(e),s[r]=e,a[i]++,n=!0,(D=null===D?{}:D)[e]=i}else a[i]=1,s[r]=i;o.add(i)}n&&console.warn("Duplicate headers found and renamed."),L=!0}return{data:h,errors:u,meta:{delimiter:S,linebreak:O,aborted:M,truncated:!!e,cursor:f+(t||0),renamedHeaders:D}}}function R(){I(w()),h=[],u=[]}},this.abort=function(){M=!0},this.getCharIndex=function(){return z}}function g(e){var t=e.data,i=o[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,_(t.workerId,{data:[],errors:[],meta:{aborted:!0}})},pause:m,resume:m};if(U(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results}else U(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results)}t.finished&&!r&&_(t.workerId,t.results)}function _(e,t){var i=o[e];U(i.userComplete)&&i.userComplete(t),i.terminate(),delete o[e]}function m(){throw new Error("Not implemented.")}function b(e){if("object"!=typeof e||null===e)return e;var t,i=Array.isArray(e)?[]:{};for(t in e)i[t]=b(e[t]);return i}function y(e,t){return function(){e.apply(t,arguments)}}function U(e){return"function"==typeof e}return v.parse=function(e,t){var i=(t=t||{}).dynamicTyping||!1;U(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!U(t.transform)&&t.transform,!t.worker||!v.WORKERS_SUPPORTED)return i=null,v.NODE_STREAM_INPUT,"string"==typeof e?(e=(e=>65279!==e.charCodeAt(0)?e:e.slice(1))(e),i=new(t.download?f:c)(t)):!0===e.readable&&U(e.read)&&U(e.on)?i=new p(t):(n.File&&e instanceof File||e instanceof Object)&&(i=new l(t)),i.stream(e);(i=(()=>{var e;return!!v.WORKERS_SUPPORTED&&(e=(()=>{var e=n.URL||n.webkitURL||null,t=r.toString();return v.BLOB_URL||(v.BLOB_URL=e.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ","(",t,")();"],{type:"text/javascript"})))})(),(e=new n.Worker(e)).onmessage=g,e.id=h++,o[e.id]=e)})()).userStep=t.step,i.userChunk=t.chunk,i.userComplete=t.complete,i.userError=t.error,t.step=U(t.step),t.chunk=U(t.chunk),t.complete=U(t.complete),t.error=U(t.error),delete t.worker,i.postMessage({input:e,config:t,workerId:i.id})},v.unparse=function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1,h=((()=>{if("object"==typeof t){if("string"!=typeof t.delimiter||v.BAD_DELIMITERS.filter(function(e){return-1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter),"boolean"!=typeof t.quotes&&"function"!=typeof t.quotes&&!Array.isArray(t.quotes)||(n=t.quotes),"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines),"string"==typeof t.newline&&(y=t.newline),"string"==typeof t.quoteChar&&(s=t.quoteChar),"boolean"==typeof t.header&&(_=t.header),Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns}void 0!==t.escapeChar&&(a=t.escapeChar+s),t.escapeFormulae instanceof RegExp?o=t.escapeFormulae:"boolean"==typeof t.escapeFormulae&&t.escapeFormulae&&(o=/^[=+\-@\t\r].*$/)}})(),new RegExp(P(s),"g"));"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return"string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields||r),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="",n=("string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t)),Array.isArray(e)&&0<e.length),s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=k(e[a],a);0<t.length&&(r+=y)}for(var o=0;o<t.length;o++){var h=(n?e:t[o]).length,u=!1,d=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var f=[],l=0;l<h;l++){var c=s?e[l]:l;f.push(t[o][c])}u=""===f.join("").trim()}if(!u){for(var p=0;p<h;p++){0<p&&!d&&(r+=m);var g=n&&s?e[p]:p;r+=k(t[o][g],p)}o<t.length-1&&(!i||0<h&&!d)&&(r+=y)}}return r}function k(e,t){var i,r;return null==e?"":e.constructor===Date?JSON.stringify(e).slice(1,25):(r=!1,o&&"string"==typeof e&&o.test(e)&&(e="'"+e,r=!0),i=e.toString().replace(h,a),(r=r||!0===n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||((e,t)=>{for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return!0;return!1})(i,v.BAD_DELIMITERS)||-1<i.indexOf(m)||" "===i.charAt(0)||" "===i.charAt(i.length-1))?s+i+s:i)}},v.RECORD_SEP=String.fromCharCode(30),v.UNIT_SEP=String.fromCharCode(31),v.BYTE_ORDER_MARK="\ufeff",v.BAD_DELIMITERS=["\r","\n",'"',v.BYTE_ORDER_MARK],v.WORKERS_SUPPORTED=!s&&!!n.Worker,v.NODE_STREAM_INPUT=1,v.LocalChunkSize=10485760,v.RemoteChunkSize=5242880,v.DefaultDelimiter=",",v.Parser=E,v.ParserHandle=i,v.NetworkStreamer=f,v.FileStreamer=l,v.StringStreamer=c,v.ReadableStreamStreamer=p,n.jQuery&&((d=n.jQuery).fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&n.FileReader)||!this.files||0===this.files.length)return!0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)})}),e(),this;function e(){if(0===h.length)U(o.complete)&&o.complete();else{var e,t,i,r,n=h[0];if(U(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(U(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config))}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){U(a)&&a(e,n.file,n.inputElem),u()},v.parse(n.file,n.instanceConfig)}}function u(){h.splice(0,1),e()}}),a&&(n.onmessage=function(e){e=e.data;void 0===v.WORKER_ID&&e&&(v.WORKER_ID=e.workerId);"string"==typeof e.input?n.postMessage({workerId:v.WORKER_ID,results:v.parse(e.input,e.config),finished:!0}):(n.File&&e.input instanceof File||e.input instanceof Object)&&(e=v.parse(e.input,e.config))&&n.postMessage({workerId:v.WORKER_ID,results:e,finished:!0})}),(f.prototype=Object.create(u.prototype)).constructor=f,(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(c.prototype)).constructor=c,(p.prototype=Object.create(u.prototype)).constructor=p,v});

/***/ }),

/***/ "./static/assets/js/apis/e7-API.js":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/e7-API.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../e7/references.js */ "./static/assets/js/e7/references.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

var HERO_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_hero.json";
var ARTIFACT_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_artifact.json";
function fetchE7Data(_x) {
  return _fetchE7Data.apply(this, arguments);
}
function _fetchE7Data() {
  _fetchE7Data = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    var response, data, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.p = 0;
          _context.n = 1;
          return fetch(url);
        case 1:
          response = _context.v;
          if (response.ok) {
            _context.n = 2;
            break;
          }
          throw new Error("HTTP error: status: ".concat(response.status));
        case 2:
          _context.n = 3;
          return response.json();
        case 3:
          data = _context.v;
          console.log("Fetched data from E7 Server; keys:", Object.keys(data));
          return _context.a(2, data);
        case 4:
          _context.p = 4;
          _t = _context.v;
          console.error("Error fetching global user data:", _t);
          return _context.a(2, null);
      }
    }, _callee, null, [[0, 4]]);
  }));
  return _fetchE7Data.apply(this, arguments);
}
function fetchHeroJSON() {
  return _fetchHeroJSON.apply(this, arguments);
}
function _fetchHeroJSON() {
  _fetchHeroJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var lang,
      data,
      _args2 = arguments;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          lang = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : null;
          console.log("Fetching hero data (lang=".concat(lang !== null && lang !== void 0 ? lang : "all", ") from E7 Server..."));
          _context2.n = 1;
          return fetchE7Data(HERO_URL);
        case 1:
          data = _context2.v;
          if (lang && data[lang]) {
            data = data[lang];
          } else if (lang && !data[lang]) {
            console.error("Could not find hero data for language:", lang);
            data = null;
          }
          return _context2.a(2, data);
      }
    }, _callee2);
  }));
  return _fetchHeroJSON.apply(this, arguments);
}
function fetchArtifactJSON() {
  return _fetchArtifactJSON.apply(this, arguments);
}
function _fetchArtifactJSON() {
  _fetchArtifactJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var lang,
      data,
      _args3 = arguments;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          lang = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : null;
          console.log("Fetching hero data (lang=".concat(lang !== null && lang !== void 0 ? lang : "all", ") from E7 Server..."));
          _context3.n = 1;
          return fetchE7Data(ARTIFACT_URL);
        case 1:
          data = _context3.v;
          if (lang && data[lang]) {
            data = data[lang];
          } else if (lang && !data[lang]) {
            console.error("Could not find artifact data for language:", lang);
            data = null;
          }
          return _context3.a(2, data);
      }
    }, _callee3);
  }));
  return _fetchArtifactJSON.apply(this, arguments);
}
function fetchUserJSON(_x2) {
  return _fetchUserJSON.apply(this, arguments);
}
function _fetchUserJSON() {
  _fetchUserJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(world_code) {
    var url, data;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          world_code = world_code.replace("world_", "");
          if (_toConsumableArray(_e7_references_js__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES).some(function (code) {
            return code.replace("world_", "") === world_code;
          })) {
            _context4.n = 1;
            break;
          }
          console.error("Could not find world code: ".concat(world_code));
          return _context4.a(2, null);
        case 1:
          console.log("Fetching users for world code: ".concat(world_code, " from E7 Server..."));
          url = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_".concat(world_code, ".json");
          _context4.n = 2;
          return fetchE7Data(url);
        case 2:
          data = _context4.v;
          if (data) {
            console.log("Got user data for world: ".concat(world_code, " ; Found ").concat(data.users.length, " users"));
          }
          return _context4.a(2, data);
      }
    }, _callee4);
  }));
  return _fetchUserJSON.apply(this, arguments);
}
var E7API = {
  fetchHeroJSON: fetchHeroJSON,
  fetchUserJSON: fetchUserJSON,
  fetchArtifactJSON: fetchArtifactJSON
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (E7API);

/***/ }),

/***/ "./static/assets/js/apis/py-API.js":
/*!*****************************************!*\
  !*** ./static/assets/js/apis/py-API.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var BATTLE_URL = '/api/get_battle_data';
var RS_BATTLE_URL = '/api/rs_get_battle_data';
var HERO_URL = '/api/get_hero_data';
var USER_URL = '/api/get_user_data';
var SEASON_URL = '/api/get_season_details';
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
  fetchBattleData: function () {
    var _fetchBattleData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(user) {
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
            return fetch(BATTLE_URL, {
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
    function fetchBattleData(_x2) {
      return _fetchBattleData.apply(this, arguments);
    }
    return fetchBattleData;
  }(),
  // uses the new API endpoint that utilizes Rust for fetching and processing the battles
  rsFetchBattleData: function () {
    var _rsFetchBattleData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(user) {
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            if (user) {
              _context4.n = 1;
              break;
            }
            throw new Error("Must pass user to fetch battles data");
          case 1:
            _context4.n = 2;
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
            return _context4.a(2, _context4.v);
        }
      }, _callee4);
    }));
    function rsFetchBattleData(_x3) {
      return _rsFetchBattleData.apply(this, arguments);
    }
    return rsFetchBattleData;
  }(),
  fetchSeasonDetails: function () {
    var _fetchSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var response, data, seasonDetails;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return fetch(SEASON_URL);
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
            seasonDetails = JSON.parse(data.seasonDetails);
            return _context5.a(2, {
              seasonDetails: seasonDetails,
              error: false
            });
          case 3:
            return _context5.a(2, {
              seasonDetails: null,
              error: data.error
            });
          case 4:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    function fetchSeasonDetails() {
      return _fetchSeasonDetails.apply(this, arguments);
    }
    return fetchSeasonDetails;
  }(),
  fetchUser: function () {
    var _fetchUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(userData) {
      var response, data, worldCodeStr, user, _t;
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
            _context6.p = 4;
            if (!response.ok) {
              _context6.n = 9;
              break;
            }
            if (data.foundUser) {
              _context6.n = 7;
              break;
            }
            if (!userData.name) {
              _context6.n = 5;
              break;
            }
            worldCodeStr = userData.world_code.replace("world_", "");
            return _context6.a(2, {
              user: null,
              error: "Could not find user: \"".concat(userData.name, "\" in world_code: ").concat(worldCodeStr)
            });
          case 5:
            if (!userData.id) {
              _context6.n = 6;
              break;
            }
            return _context6.a(2, {
              user: null,
              error: "Could not find user with ID: ".concat(userData.id)
            });
          case 6:
            _context6.n = 8;
            break;
          case 7:
            user = data.user;
            console.log("Server communication successful; received response data for user");
            console.log("Found user: ".concat(JSON.stringify(user)));
            return _context6.a(2, {
              user: user,
              error: false
            });
          case 8:
            _context6.n = 10;
            break;
          case 9:
            console.log("Server communication unsuccessful");
            return _context6.a(2, {
              user: null,
              error: data.error
            });
          case 10:
            ;
            _context6.n = 12;
            break;
          case 11:
            _context6.p = 11;
            _t = _context6.v;
            console.error("Error fetching and caching user: ".concat(_t));
            return _context6.a(2, {
              user: null,
              error: _t.message
            });
          case 12:
            return _context6.a(2);
        }
      }, _callee6, null, [[4, 11]]);
    }));
    function fetchUser(_x4) {
      return _fetchUser.apply(this, arguments);
    }
    return fetchUser;
  }(),
  //returns both user and battles
  fetchDataFromID: function () {
    var _fetchDataFromID = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(id) {
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            if (id) {
              _context7.n = 1;
              break;
            }
            throw new Error("Must pass ID to fetch user");
          case 1:
            _context7.n = 2;
            return fetch('/api/get_battle_data_from_id', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                id: id
              })
            });
          case 2:
            return _context7.a(2, _context7.v);
        }
      }, _callee7);
    }));
    function fetchDataFromID(_x5) {
      return _fetchDataFromID.apply(this, arguments);
    }
    return fetchDataFromID;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PYAPI);

/***/ }),

/***/ "./static/assets/js/cache-manager.js":
/*!*******************************************!*\
  !*** ./static/assets/js/cache-manager.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var idb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! idb */ "./node_modules/idb/build/index.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// static/app.js

function clearStore(_x, _x2) {
  return _clearStore.apply(this, arguments);
}
function _clearStore() {
  _clearStore = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee17(db, storeName) {
    var tx, store;
    return _regenerator().w(function (_context17) {
      while (1) switch (_context17.n) {
        case 0:
          tx = db.transaction(storeName, 'readwrite');
          store = tx.objectStore(storeName);
          store.clear();
          _context17.n = 1;
          return tx.done;
        case 1:
          return _context17.a(2);
      }
    }, _callee17);
  }));
  return _clearStore.apply(this, arguments);
}
;
var USER_DATA_KEYS = {
  USER: "current-user",
  BATTLES: "battles",
  RAW_UPLOAD: "raw-upload",
  UPLOADED_BATTLES: "uploaded-battles",
  FILTERED_BATTLES: "filtered-battles",
  STATS: "stats",
  FILTER_STR: "filter-str"
};
var Keys = _objectSpread(_objectSpread({}, USER_DATA_KEYS), {}, {
  HERO_MANAGER: "hero-manager",
  SEASON_DETAILS: "season-details",
  AUTO_ZOOM_FLAG: "auto-zoom",
  AUTO_QUERY_FLAG: "auto-query",
  GLOBAL_USERS: "global-users",
  EU_USERS: "eu-users",
  ASIA_USERS: "asia-users",
  JPN_USERS: "jpn-users",
  KOR_USERS: "kor-users",
  ARTIFACTS: "artifacts",
  // map of artifact codes to names
  ARTIFACTS_LOWERCASE_NAMES_SET: "artifacts-lowercase-names-set",
  // set of artifact lowercase names
  HOME_PAGE_STATE: "home-page-state"
});
var FlagsToKeys = {
  "autoZoom": Keys.AUTO_ZOOM_FLAG,
  "autoQuery": Keys.AUTO_QUERY_FLAG
};
var ClientCache = {
  consts: {
    DB_NAME: 'E7ArenaStatsClientDB',
    DB_VERSION: 1,
    STORE_NAME: 'DataStore',
    META_STORE_NAME: 'MetaStore',
    CACHE_TIMEOUT: 1000 * 60 * 60 * 24 * 2 // 2 day cache timeout
  },
  Keys: _objectSpread({}, Keys),
  MetaKeys: {
    TIMESTAMP: "timestamp"
  },
  loaded_UM: new Set(),
  openDB: function () {
    var _openDB2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            return _context.a(2, (0,idb__WEBPACK_IMPORTED_MODULE_0__.openDB)(ClientCache.consts.DB_NAME, ClientCache.consts.DB_VERSION, {
              upgrade: function upgrade(db) {
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
            }));
        }
      }, _callee);
    }));
    function openDB() {
      return _openDB2.apply(this, arguments);
    }
    return openDB;
  }(),
  get: function () {
    var _get = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(id) {
      var db, result, useCache;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return this.openDB();
          case 1:
            db = _context2.v;
            _context2.n = 2;
            return db.get(this.consts.STORE_NAME, id);
          case 2:
            result = _context2.v;
            if (!(result !== null)) {
              _context2.n = 3;
              break;
            }
            console.log("Found ".concat(id, " in cache"));
            _context2.n = 4;
            break;
          case 3:
            console.log("".concat(id, " not found in cache; returning null"));
            return _context2.a(2, null);
          case 4:
            _context2.n = 5;
            return this.checkCacheTimeout(id);
          case 5:
            useCache = _context2.v;
            if (!useCache) {
              _context2.n = 6;
              break;
            }
            return _context2.a(2, result);
          case 6:
            return _context2.a(2, null);
          case 7:
            return _context2.a(2);
        }
      }, _callee2, this);
    }));
    function get(_x3) {
      return _get.apply(this, arguments);
    }
    return get;
  }(),
  cache: function () {
    var _cache = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(id, data) {
      var db;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            console.log("Caching ".concat(id, " with data: ").concat(data));
            _context3.n = 1;
            return this.openDB();
          case 1:
            db = _context3.v;
            _context3.n = 2;
            return db.put(this.consts.STORE_NAME, data, id);
          case 2:
            _context3.n = 3;
            return this.setTimestamp(id, Date.now());
          case 3:
            return _context3.a(2);
        }
      }, _callee3, this);
    }));
    function cache(_x4, _x5) {
      return _cache.apply(this, arguments);
    }
    return cache;
  }(),
  "delete": function () {
    var _delete2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(id) {
      var db;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return this.openDB();
          case 1:
            db = _context4.v;
            _context4.n = 2;
            return db["delete"](this.consts.STORE_NAME, id);
          case 2:
            _context4.n = 3;
            return this.deleteTimestamp(id);
          case 3:
            return _context4.a(2);
        }
      }, _callee4, this);
    }));
    function _delete(_x6) {
      return _delete2.apply(this, arguments);
    }
    return _delete;
  }(),
  deleteDB: function () {
    var _deleteDB = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return indexedDB.deleteDatabase(this.consts.DB_NAME);
          case 1:
            console.log('Database deleted');
          case 2:
            return _context5.a(2);
        }
      }, _callee5, this);
    }));
    function deleteDB() {
      return _deleteDB.apply(this, arguments);
    }
    return deleteDB;
  }(),
  getTimestamp: function () {
    var _getTimestamp = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(id) {
      var db, key, timestamp;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return this.openDB();
          case 1:
            db = _context6.v;
            key = "".concat(id + this.MetaKeys.TIMESTAMP);
            _context6.n = 2;
            return db.get(this.consts.META_STORE_NAME, key);
          case 2:
            timestamp = _context6.v;
            return _context6.a(2, timestamp !== null && timestamp !== void 0 ? timestamp : null);
        }
      }, _callee6, this);
    }));
    function getTimestamp(_x7) {
      return _getTimestamp.apply(this, arguments);
    }
    return getTimestamp;
  }(),
  setTimestamp: function () {
    var _setTimestamp = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(id, timestamp) {
      var db, key, val;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            _context7.n = 1;
            return this.openDB();
          case 1:
            db = _context7.v;
            key = "".concat(id + this.MetaKeys.TIMESTAMP);
            _context7.n = 2;
            return db.put(this.consts.META_STORE_NAME, timestamp, key);
          case 2:
            _context7.n = 3;
            return db.get(this.consts.META_STORE_NAME, key);
          case 3:
            val = _context7.v;
          case 4:
            return _context7.a(2);
        }
      }, _callee7, this);
    }));
    function setTimestamp(_x8, _x9) {
      return _setTimestamp.apply(this, arguments);
    }
    return setTimestamp;
  }(),
  deleteTimestamp: function () {
    var _deleteTimestamp = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(id) {
      var db, key;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            _context8.n = 1;
            return this.openDB();
          case 1:
            db = _context8.v;
            key = "".concat(id + this.MetaKeys.TIMESTAMP);
            _context8.n = 2;
            return db["delete"](this.consts.META_STORE_NAME, key);
          case 2:
            return _context8.a(2);
        }
      }, _callee8, this);
    }));
    function deleteTimestamp(_x0) {
      return _deleteTimestamp.apply(this, arguments);
    }
    return deleteTimestamp;
  }(),
  clearData: function () {
    var _clearData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var db;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            _context9.n = 1;
            return this.openDB();
          case 1:
            db = _context9.v;
            _context9.n = 2;
            return clearStore(db, this.consts.STORE_NAME);
          case 2:
            _context9.n = 3;
            return clearStore(db, this.consts.META_STORE_NAME);
          case 3:
            console.log('All data cleared from data cache and meta data cache');
          case 4:
            return _context9.a(2);
        }
      }, _callee9, this);
    }));
    function clearData() {
      return _clearData.apply(this, arguments);
    }
    return clearData;
  }(),
  clearUserData: function () {
    var _clearUserData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var _this = this;
      var toDelete;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.n) {
          case 0:
            toDelete = Object.values(USER_DATA_KEYS);
            _context0.n = 1;
            return Promise.all(toDelete.map(function (key) {
              return _this["delete"](key);
            }));
          case 1:
            console.log("User data cleared from data cache");
          case 2:
            return _context0.a(2);
        }
      }, _callee0);
    }));
    function clearUserData() {
      return _clearUserData.apply(this, arguments);
    }
    return clearUserData;
  }(),
  clearSeasonData: function () {
    var _clearSeasonData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.n) {
          case 0:
            _context1.n = 1;
            return this["delete"](Keys.SEASON_DETAILS);
          case 1:
            console.log("Season data cleared from data cache");
          case 2:
            return _context1.a(2);
        }
      }, _callee1, this);
    }));
    function clearSeasonData() {
      return _clearSeasonData.apply(this, arguments);
    }
    return clearSeasonData;
  }(),
  checkCacheTimeout: function () {
    var _checkCacheTimeout = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(id) {
      var timestamp, currentTime;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.n) {
          case 0:
            _context10.n = 1;
            return this.getTimestamp(id);
          case 1:
            timestamp = _context10.v;
            currentTime = Date.now();
            if (!(!timestamp || currentTime - timestamp > ClientCache.consts.CACHE_TIMEOUT)) {
              _context10.n = 3;
              break;
            }
            console.log("Cache timeout for ".concat(id));
            _context10.n = 2;
            return this["delete"](id);
          case 2:
            return _context10.a(2, false);
          case 3:
            return _context10.a(2, true);
        }
      }, _callee10, this);
    }));
    function checkCacheTimeout(_x1) {
      return _checkCacheTimeout.apply(this, arguments);
    }
    return checkCacheTimeout;
  }(),
  getFilterStr: function () {
    var _getFilterStr = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.n) {
          case 0:
            _context11.n = 1;
            return this.get(ClientCache.Keys.FILTER_STR);
          case 1:
            return _context11.a(2, _context11.v);
        }
      }, _callee11, this);
    }));
    function getFilterStr() {
      return _getFilterStr.apply(this, arguments);
    }
    return getFilterStr;
  }(),
  setFilterStr: function () {
    var _setFilterStr = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12(filterStr) {
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.n) {
          case 0:
            _context12.n = 1;
            return this.cache(ClientCache.Keys.FILTER_STR, filterStr);
          case 1:
            return _context12.a(2);
        }
      }, _callee12, this);
    }));
    function setFilterStr(_x10) {
      return _setFilterStr.apply(this, arguments);
    }
    return setFilterStr;
  }(),
  getStats: function () {
    var _getStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
      return _regenerator().w(function (_context13) {
        while (1) switch (_context13.n) {
          case 0:
            _context13.n = 1;
            return this.get(ClientCache.Keys.STATS);
          case 1:
            return _context13.a(2, _context13.v);
        }
      }, _callee13, this);
    }));
    function getStats() {
      return _getStats.apply(this, arguments);
    }
    return getStats;
  }(),
  setStats: function () {
    var _setStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14(stats) {
      return _regenerator().w(function (_context14) {
        while (1) switch (_context14.n) {
          case 0:
            _context14.n = 1;
            return this.cache(Keys.STATS, stats);
          case 1:
            return _context14.a(2);
        }
      }, _callee14, this);
    }));
    function setStats(_x11) {
      return _setStats.apply(this, arguments);
    }
    return setStats;
  }(),
  getFlag: function () {
    var _getFlag = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15(flag) {
      var key;
      return _regenerator().w(function (_context15) {
        while (1) switch (_context15.n) {
          case 0:
            key = FlagsToKeys[flag];
            if (key) {
              _context15.n = 1;
              break;
            }
            throw new Error("No key found for flag <".concat(flag, ">"));
          case 1:
            _context15.n = 2;
            return this.get(key);
          case 2:
            return _context15.a(2, _context15.v);
        }
      }, _callee15, this);
    }));
    function getFlag(_x12) {
      return _getFlag.apply(this, arguments);
    }
    return getFlag;
  }(),
  setFlag: function () {
    var _setFlag = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16(flag, value) {
      var key;
      return _regenerator().w(function (_context16) {
        while (1) switch (_context16.n) {
          case 0:
            key = FlagsToKeys[flag];
            if (key) {
              _context16.n = 1;
              break;
            }
            throw new Error("No key found for flag <".concat(flag, ">"));
          case 1:
            _context16.n = 2;
            return this.cache(key, value);
          case 2:
            return _context16.a(2);
        }
      }, _callee16, this);
    }));
    function setFlag(_x13, _x14) {
      return _setFlag.apply(this, arguments);
    }
    return setFlag;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ClientCache);

/***/ }),

/***/ "./static/assets/js/content-manager.js":
/*!*********************************************!*\
  !*** ./static/assets/js/content-manager.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_hero_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/battle-manager.js */ "./static/assets/js/e7/battle-manager.js");
/* harmony import */ var _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./e7/season-manager.js */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _e7_filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./e7/filter-parsing/filter-syntax-parser.js */ "./static/assets/js/e7/filter-parsing/filter-syntax-parser.js");
/* harmony import */ var _e7_user_manager_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./e7/user-manager.js */ "./static/assets/js/e7/user-manager.js");
/* harmony import */ var _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./e7/artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }







var ContentManager = {
  HeroManager: _e7_hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"],
  BattleManager: _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"],
  SeasonManager: _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__["default"],
  UserManager: _e7_user_manager_js__WEBPACK_IMPORTED_MODULE_5__["default"],
  ClientCache: _cache_manager_js__WEBPACK_IMPORTED_MODULE_3__["default"],
  ArtifactManager: _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_6__["default"],
  getFilters: function () {
    var _getFilters = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(HM) {
      var filterStr, seasonDetails, parser;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_3__["default"].getFilterStr();
          case 1:
            filterStr = _context.v;
            if (filterStr) {
              _context.n = 2;
              break;
            }
            return _context.a(2, _e7_filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_4__["default"].getEmptyFilters());
          case 2:
            _context.n = 3;
            return _e7_season_manager_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSeasonDetails();
          case 3:
            seasonDetails = _context.v;
            _context.n = 4;
            return _e7_filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_4__["default"].createAndParse(filterStr, HM, seasonDetails);
          case 4:
            parser = _context.v;
            return _context.a(2, parser.filters);
        }
      }, _callee);
    }));
    function getFilters(_x) {
      return _getFilters.apply(this, arguments);
    }
    return getFilters;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ContentManager);

/***/ }),

/***/ "./static/assets/js/csv-parse.js":
/*!***************************************!*\
  !*** ./static/assets/js/csv-parse.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var papaparse__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! papaparse */ "./node_modules/papaparse/papaparse.min.js");
/* harmony import */ var papaparse__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(papaparse__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _e7_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7/references.js */ "./static/assets/js/e7/references.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }


var COLUMNS = Object.values(_e7_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP);
var CSVParse = {
  parseUpload: function () {
    var _parseUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(upload_file) {
      var csvString, result, parsedHeaders, error;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            this.validateCSV(upload_file);
            _context.n = 1;
            return upload_file.text();
          case 1:
            csvString = _context.v;
            // Parse with PapaParse
            result = papaparse__WEBPACK_IMPORTED_MODULE_0___default().parse(csvString, {
              header: true,
              skipEmptyLines: true,
              quoteChar: '"',
              dynamicTyping: false
            }); // Validate headers
            parsedHeaders = result.meta.fields;
            parsedHeaders.forEach(function (h, i) {
              var cleaned = h.trim().replace(/"/g, '');
              if (cleaned !== COLUMNS[i]) {
                throw new Error("Header ".concat(cleaned, " does not match expected column ").concat(COLUMNS[i], " at index ").concat(i));
              }
            });
            if (!(result.errors.length > 0)) {
              _context.n = 2;
              break;
            }
            error = result.errors[0];
            throw new Error("Failed to parse CSV: Row ".concat(error.row, ", ").concat(error.message));
          case 2:
            console.log("Parsed CSV");
            console.log(result.data);
            return _context.a(2, result.data);
        }
      }, _callee, this);
    }));
    function parseUpload(_x) {
      return _parseUpload.apply(this, arguments);
    }
    return parseUpload;
  }(),
  validateCSV: function validateCSV(upload_file) {
    if (!upload_file.name.endsWith(".csv")) {
      throw new Error("File must be .csv");
    }

    // Check file size (optional, e.g. <5MB)
    var maxMB = 10;
    var maxSize = maxMB * 1024 * 1024;
    if (upload_file.size > maxSize) {
      throw new Error("File must be smaller than ".concat(maxMB, "mb, got ").concat(upload_file.size / (1024 * 1024), "mb File."));
    }
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (CSVParse);

/***/ }),

/***/ "./static/assets/js/e7/artifact-manager.js":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/artifact-manager.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



function getArtifactMapFromE7Server() {
  return _getArtifactMapFromE7Server.apply(this, arguments);
}
function _getArtifactMapFromE7Server() {
  _getArtifactMapFromE7Server = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var rawJSON;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          console.log("Getting artifact map from E7 server...");
          _context5.n = 1;
          return _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].fetchArtifactJSON("en");
        case 1:
          rawJSON = _context5.v;
          if (rawJSON) {
            _context5.n = 2;
            break;
          }
          console.error("Could not get user map from E7 server for world code: ".concat(world_code));
          return _context5.a(2, null);
        case 2:
          console.log("Got artifact map from E7 server for language: 'en'");
          return _context5.a(2, Object.fromEntries(rawJSON.map(function (artifact) {
            return [artifact.code, artifact.name];
          })));
      }
    }, _callee5);
  }));
  return _getArtifactMapFromE7Server.apply(this, arguments);
}
var ArtifactManager = {
  getArtifacts: function () {
    var _getArtifacts = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
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
            _context.n = 5;
            break;
          case 3:
            _context.n = 4;
            return this.fetchAndCacheArtifacts();
          case 4:
            _t3 = _context.v;
          case 5:
            return _context.a(2, _t3);
        }
      }, _callee, this);
    }));
    function getArtifacts() {
      return _getArtifacts.apply(this, arguments);
    }
    return getArtifacts;
  }(),
  getArtifactLowercaseNameSet: function () {
    var _getArtifactLowercaseNameSet = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var artiSet, artifacts;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            artiSet = _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_SET);
            if (!artiSet) {
              _context2.n = 1;
              break;
            }
            return _context2.a(2, artiSet);
          case 1:
            _context2.n = 2;
            return this.getArtifacts();
          case 2:
            artifacts = _context2.v;
            artiSet = new Set(Object.values(artifacts).map(function (name) {
              return name.toLowerCase();
            }));
            _context2.n = 3;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS_LOWERCASE_NAMES_SET, artiSet);
          case 3:
            return _context2.a(2, artiSet);
        }
      }, _callee2, this);
    }));
    function getArtifactLowercaseNameSet() {
      return _getArtifactLowercaseNameSet.apply(this, arguments);
    }
    return getArtifactLowercaseNameSet;
  }(),
  fetchAndCacheArtifacts: function () {
    var _fetchAndCacheArtifacts = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var artifactMap;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            console.log("ArtifactManager not found in cache, fetching from server and caching it");
            _context3.n = 1;
            return getArtifactMapFromE7Server();
          case 1:
            artifactMap = _context3.v;
            _context3.n = 2;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS, artifactMap);
          case 2:
            console.log("Cached ArtifactManager using raw data recieved from server");
            return _context3.a(2, artifactMap);
        }
      }, _callee3);
    }));
    function fetchAndCacheArtifacts() {
      return _fetchAndCacheArtifacts.apply(this, arguments);
    }
    return fetchAndCacheArtifacts;
  }(),
  clearArtifactData: function () {
    var _clearArtifactData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.ARTIFACTS);
          case 1:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    function clearArtifactData() {
      return _clearArtifactData.apply(this, arguments);
    }
    return clearArtifactData;
  }(),
  // will fall back to the code if the name is not found
  convertCodeToName: function convertCodeToName(code, artifacts) {
    return artifacts[code] || code;
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ArtifactManager);

/***/ }),

/***/ "./static/assets/js/e7/battle-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/battle-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _plots_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./plots.js */ "./static/assets/js/e7/plots.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
/* harmony import */ var _filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./filter-parsing/filter-syntax-parser.js */ "./static/assets/js/e7/filter-parsing/filter-syntax-parser.js");
/* harmony import */ var _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./stats-builder.js */ "./static/assets/js/e7/stats-builder.js");
/* harmony import */ var _battle_transform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./battle-transform.js */ "./static/assets/js/e7/battle-transform.js");
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






var HERO_COLUMNS = _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS.filter(function (col) {
  return col.includes(" Pick ") || col.includes("ban ");
});
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
          case 1:
            _context2.n = 2;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES);
          case 2:
            _context2.n = 3;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES);
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
            localFilterList = filters.localFilters || [];
            globalFilterList = filters.globalFilters || []; // apply global filters (filters that require context of all battles); these are always applied before local filters in order of appearance
            battleList = Object.values(battles);
            _iterator = _createForOfIteratorHelper(globalFilterList);
            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                filter = _step.value;
                console.log("Applying global filter: ".concat(filter));
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
                    console.log("Applying local filter: ".concat(filter));
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.FILTERED_BATTLES, battles);
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES);
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
            newDict = _objectSpread(_objectSpread({}, oldDict), cleanBattleMap);
            _context6.n = 5;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.BATTLES, newDict);
          case 5:
            console.log("Extended user data in cache");
            return _context6.a(2, newDict);
        }
      }, _callee5);
    }));
    function extendBattles(_x2) {
      return _extendBattles.apply(this, arguments);
    }
    return extendBattles;
  }(),
  //Takes queried battles, clean format and extend in cache
  cacheQuery: function () {
    var _cacheQuery = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(battleList, HM, artifacts) {
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
            console.log("Caching queried battles: ".concat(battleList.length, " battles; modified [BATTLES]"));
            cleanBattleMap = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_5__.buildFormattedBattleMap)(battleList, HM, artifacts);
            _context7.n = 2;
            return this.extendBattles(cleanBattleMap);
          case 2:
            battles = _context7.v;
            console.log("Cached queried battles in cache; modified [BATTLES]");
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
    var _cacheUpload = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(rawParsedBattleList, HM) {
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
            cleanBattles = (0,_battle_transform_js__WEBPACK_IMPORTED_MODULE_5__.parsedCSVToFormattedBattleMap)(rawParsedBattleList, HM);
            _context8.n = 2;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.UPLOADED_BATTLES, cleanBattles);
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
    var _getStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(battles, user, filters, HM, autoZoom) {
      var numFilters, filteredBattles, battlesList, filteredBattlesList, plotContent, prebanStats, firstPickStats, generalStats, heroStats, serverStats;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            console.log("Getting stats");
            numFilters = filters.localFilters.length + filters.globalFilters.length;
            console.log("Applying ".concat(numFilters, " filters"));
            _context9.n = 1;
            return this.applyFilter(filters);
          case 1:
            filteredBattles = _context9.v;
            battlesList = Object.values(battles);
            filteredBattlesList = Object.values(filteredBattles);
            plotContent = (0,_plots_js__WEBPACK_IMPORTED_MODULE_1__.generateRankPlot)(battlesList, user, numFilters > 0 ? filteredBattles : null, autoZoom);
            console.log("Getting preban stats");
            _context9.n = 2;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__["default"].getPrebanStats(filteredBattles, HM);
          case 2:
            prebanStats = _context9.v;
            console.log("Getting first pick stats");
            _context9.n = 3;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__["default"].getFirstPickStats(filteredBattles, HM);
          case 3:
            firstPickStats = _context9.v;
            console.log("Getting general stats");
            _context9.n = 4;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__["default"].getGeneralStats(filteredBattles, HM);
          case 4:
            generalStats = _context9.v;
            console.log("Getting hero stats");
            _context9.n = 5;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__["default"].getHeroStats(filteredBattles, HM);
          case 5:
            heroStats = _context9.v;
            console.log("Getting server stats");
            _context9.n = 6;
            return _stats_builder_js__WEBPACK_IMPORTED_MODULE_4__["default"].getServerStats(filteredBattlesList);
          case 6:
            serverStats = _context9.v;
            console.log("Returning stats");
            return _context9.a(2, {
              battles: battlesList,
              filteredBattles: filteredBattlesList,
              plotContent: plotContent,
              prebanStats: prebanStats,
              generalStats: generalStats,
              firstPickStats: firstPickStats,
              playerHeroStats: heroStats.playerHeroStats,
              enemyHeroStats: heroStats.enemyHeroStats,
              serverStats: serverStats
            });
        }
      }, _callee8, this);
    }));
    function getStats(_x8, _x9, _x0, _x1, _x10) {
      return _getStats.apply(this, arguments);
    }
    return getStats;
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (BattleManager);

/***/ }),

/***/ "./static/assets/js/e7/battle-transform.js":
/*!*************************************************!*\
  !*** ./static/assets/js/e7/battle-transform.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   buildFormattedBattleMap: () => (/* binding */ buildFormattedBattleMap),
/* harmony export */   parsedCSVToFormattedBattleMap: () => (/* binding */ parsedCSVToFormattedBattleMap)
/* harmony export */ });
/* harmony import */ var _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.js */ "./static/assets/js/utils.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }





// takes in cleaned battle row (including from uploaded file or in formatBattleAsRow) 
// and adds fields representing sets heroes as prime products
function addPrimeFields(battle, HM) {
  var getChampPrime = function getChampPrime(name) {
    var _HeroManager$getHeroB, _HeroManager$getHeroB2;
    return (_HeroManager$getHeroB = (_HeroManager$getHeroB2 = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName(name, HM)) === null || _HeroManager$getHeroB2 === void 0 ? void 0 : _HeroManager$getHeroB2.prime) !== null && _HeroManager$getHeroB !== void 0 ? _HeroManager$getHeroB : HM.Fodder.prime;
  };
  var product = function product(acc, prime) {
    return acc * prime;
  };
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS].map(getChampPrime);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS].map(getChampPrime);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS_PRIMES].reduce(product, 1);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS_PRIMES].reduce(product, 1);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS].map(getChampPrime);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS].map(getChampPrime);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIME_PRODUCT] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS_PRIMES].reduce(product, 1);
  battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIME_PRODUCT] = battle[_references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS_PRIMES].reduce(product, 1);
}
var P1 = "p1";
var P2 = "p2";

// takes raw battle from array returned by rust battle array call to flask-server; formats into row to populate table
function formatBattleAsRow(raw, HM, artifacts) {
  var _battle;
  // Make functions used to convert the identifier strings in the E7 data into human readable names

  var getChampName = function getChampName(code) {
    var _HeroManager$getHeroB3, _HeroManager$getHeroB4;
    return (_HeroManager$getHeroB3 = (_HeroManager$getHeroB4 = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByCode(code, HM)) === null || _HeroManager$getHeroB4 === void 0 ? void 0 : _HeroManager$getHeroB4.name) !== null && _HeroManager$getHeroB3 !== void 0 ? _HeroManager$getHeroB3 : HM.Fodder.name;
  };
  var getArtifactName = function getArtifactName(code) {
    return _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].convertCodeToName(code, artifacts) || "None";
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
        return _references_js__WEBPACK_IMPORTED_MODULE_2__.EQUIPMENT_SET_MAP[equip] || equip;
      });
    });
  };
  var firstTurnHero = raw.cr_bar.find(function (entry) {
    return entry[1] === 100;
  });
  var p1TookFirstTurn = firstTurnHero ? raw.p1_picks.includes(firstTurnHero[0]) : false;
  var battle = (_battle = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEASON, raw.season_name || "None"), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.DATE_TIME, raw.date_time), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SECONDS, raw.seconds), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.TURNS, raw.turns), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.SEQ_NUM, raw.seq_num), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ID, raw.p1_id.toString()), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_SERVER, _references_js__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p1_server] || raw.p1_server || "None"), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ID, raw.p2_id.toString()), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_SERVER, _references_js__WEBPACK_IMPORTED_MODULE_2__.WORLD_CODE_TO_CLEAN_STR[raw.p2_server] || raw.p2_server || "None"), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_LEAGUE, (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p1_league) || "None"), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_LEAGUE, (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(raw.p2_league) || "None"), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POINTS, raw.p1_win_score || null), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.POINT_GAIN, raw.p1_point_delta || null), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.WIN, raw.win === 1 ? true : false), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_PICK, raw.first_pick === 1 ? true : false), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.CR_BAR, formatCRBar(raw.cr_bar)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN, p1TookFirstTurn ? true : false), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.FIRST_TURN_HERO, firstTurnHero ? getChampName(firstTurnHero[0]) : "n/a"), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PREBANS, raw.p1_prebans.map(getChampName)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PREBANS, raw.p2_prebans.map(getChampName)), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_battle, _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_PICKS, raw.p1_picks.map(getChampName)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_PICKS, raw.p2_picks.map(getChampName)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_POSTBAN, getChampName(raw.p1_postban)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_POSTBAN, getChampName(raw.p2_postban)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_EQUIPMENT, formatEquipment(raw.p1_equipment)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_EQUIPMENT, formatEquipment(raw.p2_equipment)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_ARTIFACTS, formatArtifacts(P1, raw.p1_artifacts)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_ARTIFACTS, formatArtifacts(P2, raw.p2_artifacts)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P1_MVP, getChampName(raw.p1_mvp)), _references_js__WEBPACK_IMPORTED_MODULE_2__.COLUMNS_MAP.P2_MVP, getChampName(raw.p2_mvp)));

  // finally take the array hero array fields and compute the prime products after converting; will be used to compute statistics more easily
  addPrimeFields(battle, HM);
  return battle;
}
function buildFormattedBattleMap(rawBattles, HeroManager, artifacts) {
  artifacts = artifacts !== null && artifacts !== void 0 ? artifacts : _artifact_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].getArtifacts();
  return Object.fromEntries(rawBattles.map(function (rawBattle) {
    var battle = formatBattleAsRow(rawBattle, HeroManager, artifacts);
    return [battle["Seq Num"], battle];
  }));
}

// takes output of CSV parse and parses the list rows and ensures types are correct
function parsedCSVToFormattedBattleMap(rawRowsArr, HM) {
  var rows = rawRowsArr.map(function (row) {
    var _iterator = _createForOfIteratorHelper(_references_js__WEBPACK_IMPORTED_MODULE_2__.ARRAY_COLUMNS),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var col = _step.value;
        row[col] = JSON.parse(row[col]);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    var _iterator2 = _createForOfIteratorHelper(_references_js__WEBPACK_IMPORTED_MODULE_2__.BOOLS_COLS),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _col = _step2.value;
        row[_col] = row[_col].toLowerCase() === "true";
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    var _iterator3 = _createForOfIteratorHelper(_references_js__WEBPACK_IMPORTED_MODULE_2__.INT_COLUMNS),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _col2 = _step3.value;
        row[_col2] = Number(row[_col2].replace("'", ""));
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
    var _iterator4 = _createForOfIteratorHelper(_references_js__WEBPACK_IMPORTED_MODULE_2__.TITLE_CASE_COLUMNS),
      _step4;
    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var _col3 = _step4.value;
        row[_col3] = (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.toTitleCase)(row[_col3]);
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }
    addPrimeFields(row, HM);
    return row;
  });
  return Object.fromEntries(rows.map(function (row) {
    return [row["Seq Num"], row];
  }));
}


/***/ }),

/***/ "./static/assets/js/e7/e7-utils.js":
/*!*****************************************!*\
  !*** ./static/assets/js/e7/e7-utils.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getJSON: () => (/* binding */ getJSON),
/* harmony export */   getUsers: () => (/* binding */ getUsers),
/* harmony export */   printObjStruct: () => (/* binding */ printObjStruct)
/* harmony export */ });
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

function getJSON(_x) {
  return _getJSON.apply(this, arguments);
}
function _getJSON() {
  _getJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          console.log("Fetching");
          return _context.a(2, fetch(url).then(function (response) {
            console.log("Got response");
            if (!response.ok) {
              // Handle HTTP error responses (404, 500, etc.)
              throw new Error("HTTP error! Status: ".concat(response.status));
            }
            return response.json(); // May also throw if not valid JSON
          })["catch"](function (error) {
            throw new E7APIError("Fetch error: ".concat(error.message));
          }));
      }
    }, _callee);
  }));
  return _getJSON.apply(this, arguments);
}
function createUser(userJSON, world_code) {
  return {
    id: userJSON.nick_no,
    name: userJSON.nick_nm.toLowerCase(),
    code: userJSON.code,
    rank: userJSON.rank,
    world_code: world_code
  };
}
function getUsers(_x2) {
  return _getUsers.apply(this, arguments);
}
function _getUsers() {
  _getUsers = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(world_code) {
    var url, data, users;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          if (_references_js__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES.has(world_code)) {
            _context2.n = 1;
            break;
          }
          console.log("No Data returned: code ".concat(world_code, " not in ").concat(refs.WORLD_CODES));
          return _context2.a(2);
        case 1:
          world_code = world_code.replace("world_", "");
          url = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_".concat(world_code, ".json");
          _context2.n = 2;
          return getJSON(url);
        case 2:
          data = _context2.v;
          users = new Object();
          data.users.forEach(function (user) {
            users[user.nick_nm] = createUser(user, world_code);
          });
          return _context2.a(2, users);
      }
    }, _callee2);
  }));
  return _getUsers.apply(this, arguments);
}
function printObjStruct(obj) {
  var newObj = {};
  for (var key in obj) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      newObj[key] = [obj[key][0], "Length: ".concat(obj[key].length)];
    } else {
      newObj[key] = obj[key];
    }
  }
  console.log(newObj);
}


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/declared-data-types.js":
/*!*******************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/declared-data-types.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DataType: () => (/* binding */ DataType),
/* harmony export */   TYPES: () => (/* binding */ TYPES),
/* harmony export */   parseDataType: () => (/* binding */ parseDataType)
/* harmony export */ });
/* harmony import */ var _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../filter-utils.js */ "./static/assets/js/e7/filter-utils.js");
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../regex.js */ "./static/assets/js/e7/regex.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../utils.js */ "./static/assets/js/utils.js");
/* harmony import */ var _hero_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./filter-parse-references.js */ "./static/assets/js/e7/filter-parsing/filter-parse-references.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../references.js */ "./static/assets/js/e7/references.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }






var DataType = /*#__PURE__*/function () {
  function DataType(str) {
    var REFS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var kwargs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    _classCallCheck(this, DataType);
    this.rawString = str;
    if (kwargs === null) {
      this.data = this.getData(str, REFS);
    } else {
      this.data = this.getData(str, REFS, kwargs); // kwargs will be an object with specific arguments for the specific datatype
    }
  }
  return _createClass(DataType, [{
    key: "toString",
    value: function toString() {
      return "".concat(this.data);
    }
  }]);
}(); // string type will always convert to titlecase
var StringType = /*#__PURE__*/function (_DataType) {
  function StringType() {
    _classCallCheck(this, StringType);
    return _callSuper(this, StringType, arguments);
  }
  _inherits(StringType, _DataType);
  return _createClass(StringType, [{
    key: "getData",
    value: function getData(str, REFS) {
      var kwargs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        types: ["hero", "league", "server", "equipment", "artifact"]
      };
      str = str.replace(/"|'/g, "");
      str = str.trim();
      if (!_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_STRING_RE.test(str)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid string; all string content must start with a letter followed by either num, hyphen or period ( case insensitive regex: ".concat(_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_STRING_LITERAL_RE.source, " ); got: '").concat(str, "'"));
      }
      function parseFn(type, str) {
        var _HeroManager$getHeroB;
        switch (type) {
          case "hero":
            return (_HeroManager$getHeroB = _hero_manager_js__WEBPACK_IMPORTED_MODULE_3__["default"].getHeroByName(str, REFS.HM)) === null || _HeroManager$getHeroB === void 0 ? void 0 : _HeroManager$getHeroB.name;
          case "league":
            return _references_js__WEBPACK_IMPORTED_MODULE_5__.LEAGUE_MAP[str] ? str : null;
          case "server":
            return Object.values(WORLD_CODE_TO_CLEAN_STR).find(function (server) {
              return server.toLowerCase() === str;
            });
          case "equipment":
            return _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_4__.EQUIPMENT_LOWERCASE_STRINGS_SET.has(str) ? str : null;
          case "artifact":
            return REFS.ARTIFACT_LOWERCASE_STRINGS_SET.has(str) ? str : null;
        }
      }
      var _iterator = _createForOfIteratorHelper(kwargs.types),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var type = _step.value;
          var parsed = parseFn(type, str);
          if (parsed) {
            console.log("Parsed string: '".concat(str, "' to '").concat(parsed, "'"));
            return (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.toTitleCase)(parsed);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid string; All strings must either be a valid [".concat(kwargs.types.join(", "), "]; got: '").concat(str, "'"));
    }
  }, {
    key: "toString",
    value: function toString() {
      return "\"".concat(this.data, "\"");
    }
  }]);
}(DataType);
var DateType = /*#__PURE__*/function (_DataType2) {
  function DateType() {
    _classCallCheck(this, DateType);
    return _callSuper(this, DateType, arguments);
  }
  _inherits(DateType, _DataType2);
  return _createClass(DateType, [{
    key: "getData",
    value: function getData(str) {
      var _REFS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      return _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].parseDate(str);
    }
  }, {
    key: "toString",
    value: function toString() {
      return "".concat(this.data);
    }
  }]);
}(DataType);
var IntType = /*#__PURE__*/function (_DataType3) {
  function IntType() {
    _classCallCheck(this, IntType);
    return _callSuper(this, IntType, arguments);
  }
  _inherits(IntType, _DataType3);
  return _createClass(IntType, [{
    key: "getData",
    value: function getData(str) {
      var _REFS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (!_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_INT_LITERAL_RE.test(str)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid integer; must be a number; got: '".concat(str, "'"));
      }
      var parsedInt = parseInt(str);
      if (isNaN(parsedInt)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid integer; must be a number; got: '".concat(str, "'"));
      }
      return parsedInt;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "".concat(this.data);
    }
  }]);
}(DataType);
var BoolType = /*#__PURE__*/function (_DataType4) {
  function BoolType() {
    _classCallCheck(this, BoolType);
    return _callSuper(this, BoolType, arguments);
  }
  _inherits(BoolType, _DataType4);
  return _createClass(BoolType, [{
    key: "getData",
    value: function getData(str) {
      var _REFS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (!_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid boolean; must be 'true' or 'false'; got: '".concat(str, "'"));
      }
      return str === "true" ? 1 : 0;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "".concat(this.data ? "true" : "false");
    }
  }]);
}(DataType);
var RangeType = /*#__PURE__*/function (_DataType5) {
  function RangeType() {
    _classCallCheck(this, RangeType);
    return _callSuper(this, RangeType, arguments);
  }
  _inherits(RangeType, _DataType5);
  return _createClass(RangeType, [{
    key: "getData",
    value: function getData(str) {
      var _REFS = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var split = str.split("...");
      if (split.length !== 2) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid range; ranges must be of the format x...y or x...=y ; got more than two values when splitting string: '".concat(str, "'"));
      }
      var _split = _slicedToArray(split, 2),
        start = _split[0],
        end = _split[1];
      var endInclusive = false;
      if (end.includes("=")) {
        end = end.replace("=", "");
        endInclusive = true;
      }
      var output = {
        start: null,
        end: null,
        endInclusive: endInclusive
      };
      if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_DATE_LITERAL_RE.test(start)) {
        output.start = _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].tryConvert(_filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].parseDate, "Date", start, "Could not convert '".concat(start, "' to Date in declared range: '").concat(str, "'"));
        output.end = _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].tryConvert(_filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].parseDate, "Date", end, "Could not convert '".concat(end, "' to Date in declared range: '").concat(str, "' ; Ranges must have homogenous types"));
        if (output.start > output.end) {
          throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid range; start date must be on or before end date; ".concat(output.start, " > ").concat(output.end));
        }
        output.type = "Date";
      } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_INT_LITERAL_RE.test(start)) {
        output.start = _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].tryConvert(function (i) {
          return new IntType(i);
        }, "Int", start, "Could not convert '".concat(start, "' to Int in declared range: '").concat(str, "'")).data;
        output.end = _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].tryConvert(function (i) {
          return new IntType(i);
        }, "Int", end, "Could not convert '".concat(end, "' to Int in declared range: '").concat(str, "' ; Ranges must have homogenous types")).data;
        if (output.start > output.end) {
          throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid range; start integer must be equal to or less than end integer; ".concat(output.start, " > ").concat(output.end));
        }
        output.type = "Int";
      } else {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid range; must be of the format x...y or x...=y ; got: '".concat(str, "'"));
      }
      console.log("Built Range: ".concat(JSON.stringify(output)));
      return output;
    }
  }, {
    key: "toString",
    value: function toString() {
      var rangeSymb = this.data.endInclusive ? "...=" : "...";
      if (this.data.type === "Date") {
        return "".concat(this.data.start.toISOString()).concat(rangeSymb).concat(this.data.end.toISOString(), ")");
      } else if (this.data.type === "Int") {
        return "".concat(this.data.start, "...").concat(rangeSymb).concat(this.data.end);
      } else {
        return "Error Converting Range to String => < ".concat(this.data.start, "...").concat(rangeSymb).concat(this.data.end, " >");
      }
    }
  }]);
}(DataType);
var SetType = /*#__PURE__*/function (_DataType6) {
  function SetType() {
    _classCallCheck(this, SetType);
    return _callSuper(this, SetType, arguments);
  }
  _inherits(SetType, _DataType6);
  return _createClass(SetType, [{
    key: "getData",
    value: function getData(str, REFS) {
      var kwargs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        types: ["hero", "league", "server", "equipment", "artifact"]
      };
      if (!_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_SET_RE.test(str)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid set; must be in the format: { element1, element2,... }, where elements have either string format or date format; ( case insensitive regex: ".concat(_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_SET_RE.source, " ) (Just chat gpt this one bro); got: '").concat(str, "'"));
      }
      var elements = str.replace(/^\{|\}$/g, "").split(",").map(function (e) {
        return e.trim();
      }).filter(function (e) {
        return e !== "";
      }).map(function (elt) {
        if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_STRING_RE.test(elt)) {
          return new StringType(elt, REFS, kwargs);
        } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_DATE_LITERAL_RE.test(elt)) {
          return new DateType(elt);
        } else {
          throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid set element; must be a string or date; got: '".concat(elt, "'"));
        }
      });
      console.log("GOT ELEMENTS: ", elements);
      var types = new Set();
      var _iterator2 = _createForOfIteratorHelper(elements),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var element = _step2.value;
          types.add(element.constructor.name);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      types = _toConsumableArray(types);
      console.log("GOT TYPES: ", types);
      if (types.size > 1) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid set; all set elements must have the same data type; \n                got: types: [".concat(types.join(", "), "]"));
      }
      this.type = types[0];
      return new Set(elements.map(function (data) {
        return data.data;
      }));
    }
  }, {
    key: "toString",
    value: function toString() {
      return "{".concat(_toConsumableArray(this.data).map(function (data) {
        return data.toString();
      }).join(", "), "}");
    }
  }]);
}(DataType);
function parseKeywordAsDataType(str, REFS) {
  if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_SEASON_LITERAL_RE.test(str)) {
    var toStr = function toStr(date) {
      return date.toISOString().slice(0, 10);
    };
    if (REFS.SeasonDetails.length < 1) {
      throw new Error("Did not recieve any season details; failed on: '".concat(str, "'"));
    } else if (str === "current-season") {
      var _REFS$SeasonDetails$f = _slicedToArray(REFS.SeasonDetails.find(function (season) {
          return season["Status"] === "Active";
        }).range, 2),
        start = _REFS$SeasonDetails$f[0],
        end = _REFS$SeasonDetails$f[1];
      return new RangeType("".concat(toStr(start), "...=").concat(toStr(end === "N/A" ? new Date() : end)));
    } else {
      var seasonNum = Number(str.split("-")[1]);
      var season = REFS.SeasonDetails.find(function (season) {
        return season["Season Number"] === seasonNum;
      });
      if (!season) {
        throw new Error("Invalid season specified; ".concat(seasonNum, " is not a valid season number; failed on str: '").concat(str, "'"));
      }
      var _season$range = _slicedToArray(season.range, 2),
        _start = _season$range[0],
        _end = _season$range[1];
      return new RangeType("".concat(toStr(_start), "...=").concat(toStr(_end)));
    }
  }
}
function parseDataType(str, REFS) {
  console.log("Trying to Parse DataType: ".concat(str));
  if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_STRING_LITERAL_RE.test(str)) {
    console.log("Parsing as StringType");
    return new StringType(str, REFS);
  } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_DATE_LITERAL_RE.test(str)) {
    console.log("Parsing as DateType");
    return new DateType(str);
  } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_INT_LITERAL_RE.test(str)) {
    console.log("Parsing as IntType");
    return new IntType(str);
  } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_BOOL_LITERAL_RE.test(str)) {
    console.log("Parsing as BoolType");
    return new BoolType(str);
  } else if (/\{.*\}/.test(str)) {
    console.log("Parsing as SetType");
    return new SetType(str, REFS);
  } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_RANGE_LITERAL_RE.test(str)) {
    console.log("Parsing as RangeType");
    return new RangeType(str);
  } else if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_DATA_WORD_LITERAL_RE.test(str)) {
    console.log("Parsing as DataWord");
    return parseKeywordAsDataType(str, REFS);
  } else {
    console.log("Failed to parse DataType");
    if (_regex_js__WEBPACK_IMPORTED_MODULE_1__.RegExps.VALID_STRING_LITERAL_RE.test("'".concat(str, "'"))) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid DataType declaration; got: '".concat(str, "'; did you forget to wrap string literals in double or single quotes?"));
    } else if (str.includes("'") && str.includes('"')) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid DataType declaration; got: '".concat(str, "'; did you encase in mismatching quote types?"));
    } else if (str.includes(".=") || str.includes("..")) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid DataType declaration; got: '".concat(str, "'; were you trying to use a range? Ranges must be of the format x...y or x...=y and may only be int-int or date-date"));
    }
    throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].SyntaxException("Invalid DataType declaration; could not parse to valid Field or Declared Data Type; got: '".concat(str, "'"));
  }
}
var TYPES = {
  Date: DateType,
  String: StringType,
  Int: IntType,
  Bool: BoolType,
  Set: SetType,
  Range: RangeType
};


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/field-type.js":
/*!**********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/field-type.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FieldType: () => (/* binding */ FieldType),
/* harmony export */   INT_FIELDS: () => (/* binding */ INT_FIELDS),
/* harmony export */   SET_FIELDS: () => (/* binding */ SET_FIELDS)
/* harmony export */ });
/* harmony import */ var _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../filter-utils.js */ "./static/assets/js/e7/filter-utils.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var INT_FIELDS = new Set(["victory-points"]);

// Fields that will extract arrays and can be used with the 'in' operators
var SET_FIELDS = new Set(["prebans", "p1.picks", "p2.picks", "p1.prebans", "p2.prebans"]);
var FieldType = /*#__PURE__*/function () {
  function FieldType(str) {
    _classCallCheck(this, FieldType);
    var fn = FieldType.FIELD_EXTRACT_FN_MAP[str];
    if (!fn) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"].ValidationError("Invalid field type: '".concat(str, "'; valid types are: ").concat(Object.keys(FieldType.FIELD_EXTRACT_FN_MAP).join(", ")));
    } else {
      console.log("Found valid field type: ", str);
    }
    this.str = str;
    this.extractData = fn;
  }
  return _createClass(FieldType, [{
    key: "toString",
    value: function toString() {
      return this.str;
    }
  }]);
}();
// FNS that take in a clean format battle and return the appropriate data
_defineProperty(FieldType, "FIELD_EXTRACT_FN_MAP", {
  date: function date(battle) {
    var _battle$DateTime;
    return battle["Date/Time"] ? new Date("".concat((_battle$DateTime = battle["Date/Time"]) === null || _battle$DateTime === void 0 ? void 0 : _battle$DateTime.slice(0, 10), "T00:00:00")) : "N/A";
  },
  "is-first-pick": function isFirstPick(battle) {
    return battle["First Pick"] ? 1 : 0;
  },
  "is-win": function isWin(battle) {
    return battle["Win"] ? 1 : 0;
  },
  "victory-points": function victoryPoints(battle) {
    return battle["P1 Points"];
  },
  "p1.picks": function p1Picks(battle) {
    return battle["P1 Picks"];
  },
  "p2.picks": function p2Picks(battle) {
    return battle["P2 Picks"];
  },
  "p1.prebans": function p1Prebans(battle) {
    return battle["P1 Prebans"];
  },
  "p2.prebans": function p2Prebans(battle) {
    return battle["P2 Prebans"];
  },
  "p1.postban": function p1Postban(battle) {
    return battle["P1 Postban"];
  },
  "p2.postban": function p2Postban(battle) {
    return battle["P2 Postban"];
  },
  "prebans": function prebans(battle) {
    return [].concat(_toConsumableArray(battle["P1 Prebans"]), _toConsumableArray(battle["P2 Prebans"]));
  },
  "p1.pick1": function p1Pick1(battle) {
    return battle["P1 Picks"][0];
  },
  "p1.pick2": function p1Pick2(battle) {
    return battle["P1 Picks"][1];
  },
  "p1.pick3": function p1Pick3(battle) {
    return battle["P1 Picks"][2];
  },
  "p1.pick4": function p1Pick4(battle) {
    return battle["P1 Picks"][3];
  },
  "p1.pick5": function p1Pick5(battle) {
    return battle["P1 Picks"][4];
  },
  "p2.pick1": function p2Pick1(battle) {
    return battle["P2 Picks"][0];
  },
  "p2.pick2": function p2Pick2(battle) {
    return battle["P2 Picks"][1];
  },
  "p2.pick3": function p2Pick3(battle) {
    return battle["P2 Picks"][2];
  },
  "p2.pick4": function p2Pick4(battle) {
    return battle["P2 Picks"][3];
  },
  "p2.pick5": function p2Pick5(battle) {
    return battle["P2 Picks"][4];
  },
  "p1.league": function p1League(battle) {
    return battle["P1 League"];
  },
  "p2.league": function p2League(battle) {
    return battle["P2 League"];
  },
  "p1.server": function p1Server(battle) {
    return battle["P1 Server"];
  },
  "p2.server": function p2Server(battle) {
    return battle["P2 Server"];
  },
  "p1.id": function p1Id(battle) {
    return Number(battle["P1 ID"]);
  },
  "p2.id": function p2Id(battle) {
    return Number(battle["P2 ID"]);
  },
  "p1.mvp": function p1Mvp(battle) {
    return battle["P1 MVP"];
  },
  "p2.mvp": function p2Mvp(battle) {
    return battle["P2 MVP"];
  },
  "is-first-turn": function isFirstTurn(battle) {
    return battle["First Turn"];
  },
  "first-turn-hero": function firstTurnHero(battle) {
    return battle["First Turn Hero"];
  },
  "turns": function turns(battle) {
    return battle["Turns"];
  },
  "seconds": function seconds(battle) {
    return battle["Seconds"];
  }
});


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-parse-references.js":
/*!***********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-parse-references.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACCEPTED_CHARS: () => (/* binding */ ACCEPTED_CHARS),
/* harmony export */   EQUIPMENT_LOWERCASE_STRINGS_SET: () => (/* binding */ EQUIPMENT_LOWERCASE_STRINGS_SET),
/* harmony export */   PRINT_PREFIX: () => (/* binding */ PRINT_PREFIX)
/* harmony export */ });
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../references.js */ "./static/assets/js/e7/references.js");

var ACCEPTED_CHARS = new Set("'\"(),-.=; ><!1234567890{}" + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
var PRINT_PREFIX = "   ";
var EQUIPMENT_LOWERCASE_STRINGS_SET = new Set(Object.values(_references_js__WEBPACK_IMPORTED_MODULE_0__.EQUIPMENT_SET_MAP).map(function (eq) {
  return eq.toLowerCase();
}));

/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/filter-syntax-parser.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/filter-syntax-parser.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../filter-utils.js */ "./static/assets/js/e7/filter-utils.js");
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../regex.js */ "./static/assets/js/e7/regex.js");
/* harmony import */ var _season_manager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../season-manager.js */ "./static/assets/js/e7/season-manager.js");
/* harmony import */ var _artifact_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");
/* harmony import */ var _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./filter-parse-references.js */ "./static/assets/js/e7/filter-parsing/filter-parse-references.js");
/* harmony import */ var _field_type_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./field-type.js */ "./static/assets/js/e7/filter-parsing/field-type.js");
/* harmony import */ var _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./declared-data-types.js */ "./static/assets/js/e7/filter-parsing/declared-data-types.js");
/* harmony import */ var _functions_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./functions.js */ "./static/assets/js/e7/filter-parsing/functions.js");
/* harmony import */ var _operators_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./operators.js */ "./static/assets/js/e7/filter-parsing/operators.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }










function validateChars(str, charSet, objName) {
  var _iterator = _createForOfIteratorHelper(str),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _char = _step.value;
      if (!charSet.has(_char)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Invalid character within <".concat(objName, "> ; ' ").concat(_char, " ' is not allowed; got string: '").concat(str, "'"));
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function preParse(str) {
  str = str.replace(/[\n\t\r]/g, " ").replace(/\s+/g, " "); // replace newlines with spaces and remove multiple spaces
  validateChars(str, _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_5__.ACCEPTED_CHARS, "Main Filter String");
  str = str.toLowerCase();
  return str;
}
var BaseFilter = /*#__PURE__*/function () {
  function BaseFilter(str, fn) {
    _classCallCheck(this, BaseFilter);
    this.str = str;
    this.fn = fn;
  }
  return _createClass(BaseFilter, [{
    key: "call",
    value: function call(battle) {
      return this.fn(battle);
    }
  }, {
    key: "toString",
    value: function toString() {
      var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return "".concat(prefix).concat(this.str);
    }
  }]);
}();
function tryParseFilterElement(leftOrRight, strValue, filterStr, REFS) {
  var parsedValue = null;
  try {
    if (strValue in _field_type_js__WEBPACK_IMPORTED_MODULE_6__.FieldType.FIELD_EXTRACT_FN_MAP) {
      parsedValue = new _field_type_js__WEBPACK_IMPORTED_MODULE_6__.FieldType(strValue);
    } else {
      parsedValue = (0,_declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.parseDataType)(strValue, REFS);
    }
  } catch (e) {
    for (var key in _field_type_js__WEBPACK_IMPORTED_MODULE_6__.FieldType.FIELD_EXTRACT_FN_MAP) {
      if (strValue.includes(key) || key.includes(strValue)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Could not parse ".concat(leftOrRight, " side of filter; got: \"").concat(strValue, "\" from filter: [").concat(filterStr, "], did you mean to use '").concat(key, "' as a field instead?"));
      }
    }
    console.error(e);
    throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Could not parse ".concat(leftOrRight, " side of filter; got: \"").concat(strValue, "\" from filter: [").concat(filterStr, "]; error: ").concat(e.message));
  }
  return parsedValue;
}
var FilterSyntaxParser = /*#__PURE__*/function () {
  function FilterSyntaxParser(key) {
    _classCallCheck(this, FilterSyntaxParser);
    if (key !== _INTERNAL_KEY._) {
      throw new Error("Cannot instantiate FilterSyntaxParser directly; use createAndParse method instead.");
    }
  }
  return _createClass(FilterSyntaxParser, [{
    key: "toString",
    value: function toString() {
      var filters = _toConsumableArray(this.filters.localFilters);
      filters.push.apply(filters, _toConsumableArray(this.filters.globalFilters));
      return "[\n".concat(filters.map(function (filter) {
        return filter.toString(_filter_parse_references_js__WEBPACK_IMPORTED_MODULE_5__.PRINT_PREFIX);
      }).join(";\n"), "\n]");
    }
  }, {
    key: "parseGlobalFilterFn",
    value: function parseGlobalFilterFn(globalFilterFn, str) {
      var pattern = _regex_js__WEBPACK_IMPORTED_MODULE_2__.RegExps.anchorExp(_regex_js__WEBPACK_IMPORTED_MODULE_2__.RegExps.VALID_GLOBAL_FILTER_RE);
      if (!pattern.test(str)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Invalid global filter format; must follow the case insensitive regex format \"".concat(pattern.source, "\" ; got: '").concat(str, "'"));
      }
      var delim = ",",
        enclosureLevel = 1;
      var args = _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].tokenizeWithNestedEnclosures(str, delim, enclosureLevel);
      if (globalFilterFn === _functions_js__WEBPACK_IMPORTED_MODULE_8__.lastN) {
        return {
          localFilters: [],
          globalFilters: [new _functions_js__WEBPACK_IMPORTED_MODULE_8__.lastN(args)]
        };
      } else {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Global filter function ".concat(globalFilterFn.str, " not mapped in parseGlobalFilterFn"));
      }
    }
  }, {
    key: "parseClauseFn",
    value: function parseClauseFn(clauseFn, str) {
      var _this = this;
      console.log("Parsing clause fn:", clauseFn.str, str);
      var delim = ",",
        enclosureLevel = 1;
      var argArr = _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].tokenizeWithNestedEnclosures(str, delim, enclosureLevel);
      console.log("Got argArr:", argArr);
      if (clauseFn === _functions_js__WEBPACK_IMPORTED_MODULE_8__.XOR && argArr.length < 2) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("XOR clause must have at least two arguments; got: ".concat(argArr.length, " arguments from string: \"").concat(str, "\""));
      } else if (clauseFn === _functions_js__WEBPACK_IMPORTED_MODULE_8__.NOT && argArr.length !== 1) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("NOT clause must have exactly one argument; got: ".concat(argArr.length, " arguments from string: \"").concat(str, "\""));
      }
      var fns = argArr.reduce(function (acc, arg) {
        var _acc$localFilters, _acc$globalFilters;
        (_acc$localFilters = acc.localFilters).push.apply(_acc$localFilters, _toConsumableArray(_this.parseFilters(arg).localFilters));
        (_acc$globalFilters = acc.globalFilters).push.apply(_acc$globalFilters, _toConsumableArray(_this.parseFilters(arg).globalFilters));
        return acc;
      }, FilterSyntaxParser.getEmptyFilters());
      if (fns.globalFilters.length > 0) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Global filters not allowed in clause functions; got: ".concat(fns.globalFilters, " from string: \"").concat(str, "\""));
      }
      if (clauseFn === _functions_js__WEBPACK_IMPORTED_MODULE_8__.NOT && fns.localFilters.length !== 1) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("NOT clause must have exactly one argument; got: ".concat(fns.length, " arguments from string: \"").concat(str, "\""));
      }
      return {
        localFilters: [new clauseFn(fns)],
        globalFilters: []
      };
    }
  }, {
    key: "parseDirectFn",
    value: function parseDirectFn(directFn, str) {
      return {
        localFilters: [directFn.fromFilterStr(str, this.REFS)],
        globalFilters: []
      };
    }
  }, {
    key: "parseBaseFilter",
    value: function parseBaseFilter(str) {
      console.log("Parsing base filter:", str);
      var delim = " ",
        enclosureLevel = 0,
        trim = true;
      var tokens = _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].tokenizeWithNestedEnclosures(str, delim, enclosureLevel, trim);
      console.log("Got tokens: ", tokens, "; Length: ".concat(tokens.length));

      // must be of form ['X', operator, 'Y']
      if (!(tokens.length === 3)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Invalid base filter format; all filters must be of the form: ['X', operator, 'Y']; got tokens: [".concat(tokens.join(", "), "]"));
      }
      var _tokens = _slicedToArray(tokens, 3),
        left = _tokens[0],
        operator = _tokens[1],
        right = _tokens[2];

      // Validate operator
      if (!_operators_js__WEBPACK_IMPORTED_MODULE_9__.OPERATOR_MAP[operator]) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Invalid operator in base filter; got: \"".concat(operator, "\" as the operator in filter: [").concat(str, "]"));
      }
      var opFn = _operators_js__WEBPACK_IMPORTED_MODULE_9__.OPERATOR_MAP[operator];

      // try to converty to field types and data types
      left = tryParseFilterElement("left", left, str, this.REFS, this.SeasonDetails);
      right = tryParseFilterElement("right", right, str, this.REFS, this.SeasonDetails);

      // validate filter
      if (operator === "in" || operator === "!in") {
        if (!(right instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.TYPES.Set || right instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.TYPES.Range)) {
          if (!(right instanceof _field_type_js__WEBPACK_IMPORTED_MODULE_6__.FieldType) || !_field_type_js__WEBPACK_IMPORTED_MODULE_6__.SET_FIELDS.has(right.str)) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].TypeException("When using any 'in' or '!in' operator, the right side of the operator must be a Set, Range, or a Field composed of a set (i.e. p1.picks, p2.prebans, etc.); error found in filter: '".concat(str, "'"));
          }
        }
      }
      if (right instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.TYPES.Range) {
        if (right.data.type === "Date") {
          if (!left.str.includes("date")) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].TypeException("When using a Date Range, the left side of the operator must be a date field; ".concat(left.str, " is not a date field; error found in filter: '").concat(str, "'"));
          }
        } else if (right.data.type === "Int") {
          if (!_field_type_js__WEBPACK_IMPORTED_MODULE_6__.INT_FIELDS.has(left.str)) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].TypeException("When using an Int Range, the left side of the operator must be an integer field; ".concat(left.str, " is not an integer field; error found in filter: '").concat(str, "'"));
          }
        }
      }
      if (right instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.DataType && left instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.DataType) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Either left or right side of filter must be a data field (a property of a battle); both ".concat(left, " and ").concat(right, " are user declared data types in filter: \"").concat(str, "\""));
      }

      // make filter
      var filterFn = null;
      if (left instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.DataType) {
        filterFn = function filterFn(battle) {
          return opFn(left.data, right.extractData(battle));
        };
      } else if (right instanceof _declared_data_types_js__WEBPACK_IMPORTED_MODULE_7__.DataType) {
        filterFn = function filterFn(battle) {
          return opFn(left.extractData(battle), right.data);
        };
      } else {
        filterFn = function filterFn(battle) {
          return opFn(left.extractData(battle), right.extractData(battle));
        };
      }
      console.log("Returning base local filter", [new BaseFilter(str, filterFn).toString()]);
      return {
        localFilters: [new BaseFilter(str, filterFn)],
        globalFilters: []
      };
    }
  }, {
    key: "parseFilters",
    value: function parseFilters(str) {
      var _this2 = this;
      console.log("Parsing filter string: \"".concat(str || this.preParsedString, "\""));
      if (str === "") {
        console.log("Empty filter string; Returning empty filters");
        return FilterSyntaxParser.getEmptyFilters();
      }
      str = str.trim();
      var split = str.split(";").filter(function (s) {
        return s.length > 0;
      });
      var _iterator2 = _createForOfIteratorHelper(split),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var splitStr = _step2.value;
          var charCounts = _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].getCharCounts(splitStr);
          if (charCounts["("] !== charCounts[")"]) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Imbalanced parentheses in following string: \"".concat(splitStr, "\""));
          } else if (charCounts["{"] !== charCounts["}"]) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Imbalanced braces ('{', '}') in following string: \"".concat(splitStr, "\""));
          } else if ((charCounts['"'] || 0) % 2 !== 0) {
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Imbalanced double quotes in following string: \"".concat(splitStr, "\""));
          } else if ((charCounts["'"] || 0) % 2 !== 0) {
            console.log("Imbalanced single quotes in following string:", splitStr, "; got:", charCounts["'"]);
            throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Imbalanced single quotes in following string: \"".concat(splitStr, "\""));
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      if (split.length > 1) {
        console.log("Processing <".concat(split.length, "> filters; filters: ").concat(split));
        return split.reduce(function (acc, arg) {
          var _acc$localFilters2, _acc$globalFilters2;
          (_acc$localFilters2 = acc.localFilters).push.apply(_acc$localFilters2, _toConsumableArray(_this2.parseFilters(arg).localFilters));
          (_acc$globalFilters2 = acc.globalFilters).push.apply(_acc$globalFilters2, _toConsumableArray(_this2.parseFilters(arg).globalFilters));
          return acc;
        }, FilterSyntaxParser.getEmptyFilters());
      }
      var filterString = split[0].trim();
      if (filterString.length < 4) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].SyntaxException("Filter string cannot be valid (less than 4 characters); got filter string: [".concat(filterString, "]"));
      }
      var splitFilterString = filterString.split("(");
      var fn = _functions_js__WEBPACK_IMPORTED_MODULE_8__.FN_MAP[splitFilterString[0]];
      console.log("Trying to look for Fn ; got string:", filterString);
      if (!fn) {
        console.log("Did not find Fn; dispatching to base filter parser");
        return this.parseBaseFilter(filterString);
      } else if (_regex_js__WEBPACK_IMPORTED_MODULE_2__.RegExps.VALID_CLAUSE_FUNCTIONS_RE.test(filterString)) {
        console.log("Found clause fn; dispatching to clause fn parser");
        return this.parseClauseFn(fn, filterString);
      } else if (_regex_js__WEBPACK_IMPORTED_MODULE_2__.RegExps.VALID_GLOBAL_FUNCTIONS_RE.test(filterString)) {
        console.log("Found global filter fn; dispatching to global filter fn parser");
        return this.parseGlobalFilterFn(fn, filterString);
      } else if (_regex_js__WEBPACK_IMPORTED_MODULE_2__.RegExps.VALID_DIRECT_FUNCTIONS_RE.test(filterString)) {
        return this.parseDirectFn(fn, filterString);
      } else {
        throw new Error("could not parse filter string as Fn: \"".concat(str, "\" ; did not map to any known function ; check filter-syntax page"));
      }
    }
  }], [{
    key: "getEmptyFilters",
    value: function getEmptyFilters() {
      return {
        localFilters: [],
        globalFilters: []
      };
    }
  }, {
    key: "createAndParse",
    value: function () {
      var _createAndParse = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(string) {
        var HM,
          SeasonDetails,
          parser,
          _args = arguments,
          _t,
          _t2;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              HM = _args.length > 1 && _args[1] !== undefined ? _args[1] : null;
              SeasonDetails = _args.length > 2 && _args[2] !== undefined ? _args[2] : null;
              console.log("Initialized parsing of string:", string);
              parser = new FilterSyntaxParser(_INTERNAL_KEY._);
              _t = HM;
              if (_t) {
                _context.n = 2;
                break;
              }
              _context.n = 1;
              return _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroManager();
            case 1:
              _t = _context.v;
            case 2:
              HM = _t;
              _t2 = SeasonDetails;
              if (_t2) {
                _context.n = 4;
                break;
              }
              _context.n = 3;
              return _season_manager_js__WEBPACK_IMPORTED_MODULE_3__["default"].getSeasonDetails();
            case 3:
              _t2 = _context.v;
            case 4:
              SeasonDetails = _t2;
              parser.rawString = string;
              parser.HM = HM;
              parser.ARTIFACT_LOWERCASE_STRINGS_SET = _artifact_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].getArtifactLowercaseNameSet();
              parser.SeasonDetails = SeasonDetails;
              parser.REFS = {
                HM: parser.HM,
                ARTIFACT_LOWERCASE_STRINGS_SET: parser.ARTIFACT_LOWERCASE_STRINGS_SET,
                SeasonDetails: parser.SeasonDetails
              };
              parser.preParsedString = preParse(string);
              parser.globalFilters = [];
              parser.filters = parser.parseFilters(parser.preParsedString);
              console.log("Got Filters\n");
              console.log(parser.toString());
              return _context.a(2, parser);
          }
        }, _callee);
      }));
      function createAndParse(_x) {
        return _createAndParse.apply(this, arguments);
      }
      return createAndParse;
    }()
  }]);
}();
var _INTERNAL_KEY = {
  _: Symbol("internal")
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (FilterSyntaxParser);

/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/functions.js":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/functions.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AND: () => (/* binding */ AND),
/* harmony export */   EquipmentFn: () => (/* binding */ EquipmentFn),
/* harmony export */   FN_MAP: () => (/* binding */ FN_MAP),
/* harmony export */   NOT: () => (/* binding */ NOT),
/* harmony export */   OR: () => (/* binding */ OR),
/* harmony export */   XOR: () => (/* binding */ XOR),
/* harmony export */   lastN: () => (/* binding */ lastN)
/* harmony export */ });
/* harmony import */ var _declared_data_types_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./declared-data-types.js */ "./static/assets/js/e7/filter-parsing/declared-data-types.js");
/* harmony import */ var _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filter-parse-references.js */ "./static/assets/js/e7/filter-parsing/filter-parse-references.js");
/* harmony import */ var _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../filter-utils.js */ "./static/assets/js/e7/filter-utils.js");
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../regex.js */ "./static/assets/js/e7/regex.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }




var Fn = /*#__PURE__*/function () {
  function Fn() {
    _classCallCheck(this, Fn);
  }
  return _createClass(Fn, [{
    key: "call",
    value: function call(battle) {
      throw new Error("Base class ".concat(this.constructor.name, " does not implement the 'call' method. Implement this method in a subclass."));
    }
  }]);
}();
var globalFilterFn = /*#__PURE__*/function (_Fn) {
  function globalFilterFn() {
    _classCallCheck(this, globalFilterFn);
    return _callSuper(this, globalFilterFn);
  }
  _inherits(globalFilterFn, _Fn);
  return _createClass(globalFilterFn, [{
    key: "toString",
    value: function toString() {
      var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return "".concat(prefix).concat(this.str);
    }
  }]);
}(Fn);
var lastN = /*#__PURE__*/function (_globalFilterFn) {
  function lastN(args) {
    var _this;
    _classCallCheck(this, lastN);
    _this = _callSuper(this, lastN);
    _this.name = "last-N";
    if (args.length !== 1) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].SyntaxException("".concat(_this.name, " expects 1 argument, got ").concat(args.length));
    }
    var num = Number(args[0]);
    if (!Number.isInteger(num)) {
      throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].TypeException("".concat(_this.name, " expects an integer argument, could not parse '").concat(args[0], "' as integer"));
    }
    _this.str = "".concat(_this.name, "(").concat(num, ")");
    _this.n = num;
    return _this;
  }
  _inherits(lastN, _globalFilterFn);
  return _createClass(lastN, [{
    key: "call",
    value: function call(battles) {
      battles.sort(function (b1, b2) {
        return b1["Seq Num"] - b2["Seq Num"];
      });
      return battles.slice(-this.n);
    }
  }]);
}(globalFilterFn);
var ClauseFn = /*#__PURE__*/function (_Fn2) {
  function ClauseFn(fns) {
    var _this2;
    _classCallCheck(this, ClauseFn);
    _this2 = _callSuper(this, ClauseFn);
    _this2.fns = fns;
    console.log("Clause Fn constructor got fns:", fns);
    return _this2;
  }
  _inherits(ClauseFn, _Fn2);
  return _createClass(ClauseFn, [{
    key: "toString",
    value: function toString() {
      var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var output = "";
      var newPrefix = prefix + _filter_parse_references_js__WEBPACK_IMPORTED_MODULE_1__.PRINT_PREFIX;
      this.fns.localFilters.forEach(function (fn) {
        return output += "".concat(fn.toString(newPrefix), ",\n");
      });
      console.log("Clause Fn toString got output:", output);
      return "".concat(prefix).concat(this.str, "(\n").concat(output.trimEnd(), "\n").concat(prefix, ")");
    }
  }]);
}(Fn);
var AND = /*#__PURE__*/function (_ClauseFn) {
  function AND(fns) {
    var _this3;
    _classCallCheck(this, AND);
    _this3 = _callSuper(this, AND, [fns]);
    _this3.str = "AND";
    return _this3;
  }
  _inherits(AND, _ClauseFn);
  return _createClass(AND, [{
    key: "call",
    value: function call(battle) {
      return this.fns.localFilters.every(function (fn) {
        return fn.call(battle);
      });
    }
  }]);
}(ClauseFn);
var OR = /*#__PURE__*/function (_ClauseFn2) {
  function OR(fns) {
    var _this4;
    _classCallCheck(this, OR);
    _this4 = _callSuper(this, OR, [fns]);
    _this4.str = "OR";
    return _this4;
  }
  _inherits(OR, _ClauseFn2);
  return _createClass(OR, [{
    key: "call",
    value: function call(battle) {
      return this.fns.localFilters.some(function (fn) {
        return fn.call(battle);
      });
    }
  }]);
}(ClauseFn);
var XOR = /*#__PURE__*/function (_ClauseFn3) {
  function XOR(fns) {
    var _this5;
    _classCallCheck(this, XOR);
    _this5 = _callSuper(this, XOR, [fns]);
    _this5.str = "XOR";
    return _this5;
  }
  _inherits(XOR, _ClauseFn3);
  return _createClass(XOR, [{
    key: "call",
    value: function call(battle) {
      var result = false;
      // Cascading XOR
      var _iterator = _createForOfIteratorHelper(this.fns.localFilters),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var fn = _step.value;
          result = !result && fn.call(battle) || result && !fn.call(battle);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return result;
    }
  }]);
}(ClauseFn);
var NOT = /*#__PURE__*/function (_ClauseFn4) {
  function NOT(fns) {
    var _this6;
    _classCallCheck(this, NOT);
    _this6 = _callSuper(this, NOT, [fns]);
    _this6.str = "NOT";
    return _this6;
  }
  _inherits(NOT, _ClauseFn4);
  return _createClass(NOT, [{
    key: "call",
    value: function call(battle) {
      return !this.fns.localFilters[0].call(battle);
    }
  }]);
}(ClauseFn);
function get_hero_equipment(heroName, picks, equipment) {
  // picks is either P1 Picks or P2 Picks and equipment is either P1 Equipment or P2 Equipment from a battle record
  for (var i = 0; i < picks.length; i++) {
    if (picks[i] === heroName) {
      return equipment[i];
    }
  }
  return null;
}

// Direct functions resolve to a single base filter ; they cannot contain nested filters
var DirectFn = /*#__PURE__*/function (_Fn3) {
  function DirectFn() {
    _classCallCheck(this, DirectFn);
    return _callSuper(this, DirectFn, arguments);
  }
  _inherits(DirectFn, _Fn3);
  return _createClass(DirectFn, [{
    key: "toString",
    value: function toString() {
      var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      return "".concat(prefix).concat(this.str);
    }
  }]);
}(Fn);
var EquipmentFn = /*#__PURE__*/function (_DirectFn) {
  function EquipmentFn(hero, equipmentSet, p1Flag) {
    var _this7;
    _classCallCheck(this, EquipmentFn);
    console.log("Received equipment fn args", hero, equipmentSet, p1Flag);
    _this7 = _callSuper(this, EquipmentFn);
    _this7.hero = hero.data;
    _this7.equipmentArr = _toConsumableArray(equipmentSet.data);
    _this7.str = (p1Flag ? "p1" : "p2") + ".equipment(".concat(hero, ", ").concat(equipmentSet.toString(), ")");
    _this7.isPlayer1 = p1Flag;
    return _this7;
  }
  _inherits(EquipmentFn, _DirectFn);
  return _createClass(EquipmentFn, [{
    key: "call",
    value: function call(battle) {
      var equipment = this.isPlayer1 ? battle["P1 Equipment"] : battle["P2 Equipment"];
      var picks = this.isPlayer1 ? battle["P1 Picks"] : battle["P2 Picks"];
      var equipped = get_hero_equipment(this.hero, picks, equipment);
      console.log("Got equipped: ".concat(equipped, ", hero: ").concat(this.hero.name, ", picks: ").concat(picks, ", equipment: ").concat(equipment));
      if (!equipped) {
        return false;
      }
      return this.equipmentArr.every(function (eq) {
        return equipped.includes(eq);
      });
    }
  }], [{
    key: "fromFilterStr",
    value: function fromFilterStr(str, REFS) {
      var args = _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].tokenizeWithNestedEnclosures(str, ",", 1, true);
      if (!(args.length === 2)) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].SyntaxException("Invalid equipment function call ; accepts exactly 2 arguments ; got: [".concat(args, "] from str: ").concat(str));
      }
      if (!_regex_js__WEBPACK_IMPORTED_MODULE_3__.RegExps.VALID_STRING_LITERAL_RE.test(args[0])) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].TypeException("Invalid equipment function call ; first argument must be a valid string literal ; got: '".concat(args[0], "' from str: ").concat(str));
      }
      var equipSetStr = /^\{[",'a-z\s]*\}$/i.test(args[1]) ? args[1] : "{".concat(args[1], "}");
      var hero = null,
        equipmentSet = null;
      try {
        hero = new _declared_data_types_js__WEBPACK_IMPORTED_MODULE_0__.TYPES.String(args[0], REFS, {
          types: ["hero"]
        });
        equipmentSet = new _declared_data_types_js__WEBPACK_IMPORTED_MODULE_0__.TYPES.Set(equipSetStr, REFS, {
          types: ["equipment"]
        });
      } catch (e) {
        throw new _filter_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].TypeException("Invalid type in equipment function call; got str: ".concat(str, " ; error: ").concat(e));
      }
      var p1Flag = str.split(".")[0] === "p1";
      console.log("Sending equipment fn args", hero, equipmentSet, p1Flag);
      return new EquipmentFn(hero, equipmentSet, p1Flag);
    }
  }]);
}(DirectFn);
var FN_MAP = {
  and: AND,
  or: OR,
  xor: XOR,
  not: NOT,
  "last-n": lastN,
  "p1.equipment": EquipmentFn,
  "p2.equipment": EquipmentFn
};


/***/ }),

/***/ "./static/assets/js/e7/filter-parsing/operators.js":
/*!*********************************************************!*\
  !*** ./static/assets/js/e7/filter-parsing/operators.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OPERATOR_MAP: () => (/* binding */ OPERATOR_MAP)
/* harmony export */ });
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
// must handle both regular sets and ranges
function inOperatorFn(a, b) {
  if (b instanceof Set) {
    return b.has(a);
  }
  // handle ranges
  else if (_typeof(b) === "object" && b !== null && !Array.isArray(b) && ["start", "end", "endInclusive", "type"].every(function (key) {
    return b.hasOwnProperty(key);
  })) {
    return a >= b.start && (b.endInclusive ? a <= b.end : a < b.end);
  }

  // handles fields that are arrays (ie p1.picks)
  else if (Array.isArray(b)) {
    return b.includes(a);
  } else {
    throw new Error("Invalid match pattern for 'in' operators; got: '".concat(a, "' and '").concat(JSON.stringify(b), "}' (").concat(b.constructor.name, ")"));
  }
}
var OPERATOR_MAP = {
  ">": function _(a, b) {
    return a > b;
  },
  "<": function _(a, b) {
    return a < b;
  },
  "=": function _(a, b) {
    return a === b;
  },
  "in": function _in(a, b) {
    return inOperatorFn(a, b);
  },
  ">=": function _(a, b) {
    return a >= b;
  },
  "<=": function _(a, b) {
    return a <= b;
  },
  "!=": function _(a, b) {
    return a !== b;
  },
  "!in": function _in(a, b) {
    return !inOperatorFn(a, b);
  }
};


/***/ }),

/***/ "./static/assets/js/e7/filter-utils.js":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/filter-utils.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./regex.js */ "./static/assets/js/e7/regex.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }

var SyntaxException = /*#__PURE__*/function (_Error) {
  function SyntaxException(message) {
    var _this;
    _classCallCheck(this, SyntaxException);
    _this = _callSuper(this, SyntaxException, [message]); // Pass message to base Error
    _this.name = "Filter Syntax Exception"; // Set error name
    return _this;
  }
  _inherits(SyntaxException, _Error);
  return _createClass(SyntaxException);
}(/*#__PURE__*/_wrapNativeSuper(Error));
var TypeException = /*#__PURE__*/function (_Error2) {
  function TypeException(message) {
    var _this2;
    _classCallCheck(this, TypeException);
    _this2 = _callSuper(this, TypeException, [message]); // Pass message to base Error
    _this2.name = "Filter Type Exception"; // Set error name
    return _this2;
  }
  _inherits(TypeException, _Error2);
  return _createClass(TypeException);
}(/*#__PURE__*/_wrapNativeSuper(Error));
var ValidationError = /*#__PURE__*/function (_Error3) {
  function ValidationError(message) {
    var _this3;
    _classCallCheck(this, ValidationError);
    _this3 = _callSuper(this, ValidationError, [message]); // Pass message to base Error
    _this3.name = "Filter Validation Error"; // Set error name
    return _this3;
  }
  _inherits(ValidationError, _Error3);
  return _createClass(ValidationError);
}(/*#__PURE__*/_wrapNativeSuper(Error)); //should only be called on strings of the form 'str(...)' or 'num(...)' etc. the string must end with the enclosure char, otherwise it will throw a SyntaxException.
function retrieveEnclosure(string) {
  var open_char = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '(';
  var close_char = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ')';
  if (open_char === close_char) {
    throw new Error("Enclosure characters must be different: ".concat(open_char, " = ").concat(close_char));
  }
  var started = false;
  var count = 0;
  var output = "";
  var _iterator = _createForOfIteratorHelper(_toConsumableArray(string).entries()),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _slicedToArray(_step.value, 2),
        index = _step$value[0],
        _char = _step$value[1];
      if (_char === open_char) {
        count += 1;
        if (!started) {
          started = true;
          continue;
        }
      } else if (_char === close_char) {
        count -= 1;
      }
      if (count === 0 && started) {
        if (index != string.length - 1) {
          throw new SyntaxException("Enclosure should not be resolved before end of string; resolved at index: ".concat(index, "; input string: ").concat(string));
        }
        return output;
      } else if (count < 0) {
        throw new SyntaxException("Unbalanced enclosure at index: ".concat(index, " of input string: ").concat(string, "; balance of \"").concat(open_char, "...").concat(close_char, "\" enclosures became negative."));
      } else if (started) {
        output += _char;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  ;
  if (!started) {
    throw new SyntaxException("Enclosure of type ".concat(open_char, "...").concat(close_char, " not found in string; input string: ").concat(string));
  } else if (count > 0) {
    throw new SyntaxException("Enclosure could not be resolved; too many '".concat(close_char, "'; balance = +{count}; input string {string}"));
  }
}

// retrieves comma separated arguments from a string; used for clause operators; input should be of the form 'fn(arg1, arg2,...)' where fn is a clause fn
function retrieveArgs(string) {
  var open_parenthese_count = 0;
  var args = [];
  var arg = "";
  var _iterator2 = _createForOfIteratorHelper(string),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var _char2 = _step2.value;
      if (_char2 === '(') {
        open_parenthese_count += 1;
        if (open_parenthese_count === 1) {
          continue;
        }
      } else if (_char2 === ')') {
        open_parenthese_count -= 1;
      }
      if (open_parenthese_count === 1 && _char2 === ',') {
        args.push(arg.trim());
        arg = "";
      } else if (open_parenthese_count >= 1) {
        arg += _char2;
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  if (arg.trim()) {
    args.push(arg.trim());
  }
  return args;
}
var ENCLOSURE_MAP = {
  '(': ')',
  '{': '}',
  '"': '"',
  "'": "'"
};
var REVERSE_ENCLOSURE_MAP = Object.fromEntries(Object.entries(ENCLOSURE_MAP).filter(function (_ref) {
  var _ref2 = _slicedToArray(_ref, 2),
    k = _ref2[0],
    v = _ref2[1];
  return k !== v;
}).map(function (_ref3) {
  var _ref4 = _slicedToArray(_ref3, 2),
    k = _ref4[0],
    v = _ref4[1];
  return [v, k];
}));
function tokenizeWithNestedEnclosures(input) {
  var splitChars = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : " ";
  var enclosureLevel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var trim = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
  var tokens = [];
  var current = '';
  var stack = [];
  for (var i = 0; i < input.length; i++) {
    var _char3 = input[i];

    //console.log(`Processing char ${char} at position ${i}; current string: ${current}; tokens: ${tokens}`);

    if (splitChars.includes(_char3) && stack.length === enclosureLevel) {
      if (current) {
        tokens.push(trim ? current.trim() : current);
        current = '';
      }
    } else {
      if (REVERSE_ENCLOSURE_MAP[_char3]) {
        var expected = REVERSE_ENCLOSURE_MAP[_char3];
        if (stack.length > enclosureLevel) {
          current += _char3;
        }
        if (stack[stack.length - 1] === expected) {
          stack.pop();
        } else {
          throw new Error("Unbalanced closing bracket at position ".concat(i));
        }
      } else {
        if (stack.length >= enclosureLevel) {
          current += _char3;
        }
        if (ENCLOSURE_MAP[_char3]) {
          if (stack[stack.length - 1] === ENCLOSURE_MAP[_char3] && _char3 === ENCLOSURE_MAP[_char3]) {
            stack.pop();
          } else {
            stack.push(_char3);
          }
        }
      }
    }
  }
  if (stack.length > 0) {
    throw new Error("Unbalanced enclosures in input string; unresolved characters from enclosure stack: ", stack);
  }
  if (current) {
    tokens.push(trim ? current.trim() : current);
  }
  return tokens;
}
function getCharCounts(str) {
  var counts = {};
  var _iterator3 = _createForOfIteratorHelper(str),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var _char4 = _step3.value;
      counts[_char4] = (counts[_char4] || 0) + 1;
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  return counts;
}
function parseDate(dateStr) {
  if (!_regex_js__WEBPACK_IMPORTED_MODULE_0__.RegExps.VALID_DATE_LITERAL_RE.test(dateStr)) {
    throw new SyntaxException("Invalid date; must be in the format: YYYY-MM-DD ( regex: ".concat(_regex_js__WEBPACK_IMPORTED_MODULE_0__.RegExps.VALID_DATE_LITERAL_RE.source, " ); got: '").concat(dateStr, "'"));
  }
  var isoDateStr = dateStr.split(" ")[0];
  var date = new Date("".concat(isoDateStr, "T00:00:00"));

  // Check if valid date
  if (isNaN(date.getTime())) {
    throw new SyntaxException("Invalid date; could not be parsed as a valid date; got: '".concat(dateStr, "'"));
  }

  // Check if parsed date matches passed in string
  var dateString = date.toISOString().split('T')[0];
  var _dateString$split$map = dateString.split('-').map(Number),
    _dateString$split$map2 = _slicedToArray(_dateString$split$map, 3),
    year = _dateString$split$map2[0],
    month = _dateString$split$map2[1],
    day = _dateString$split$map2[2];
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new SyntaxException("Invalid date; parsed date: ".concat(date.toISOString(), " does not match passed in string: ").concat(isoDateStr));
  }
  console.log("Parsed date: ".concat(date.toISOString(), " ; ").concat(date.constructor.name));
  return date;
}
function tryConvert(convertFnc, typeName, value) {
  var errMSG = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  if (errMSG === null) {
    errMSG = "Could not convert ".concat(value, " to ").concat(typeName);
  }
  try {
    return convertFnc(value);
  } catch (err) {
    throw new TypeException("".concat(errMSG, ": ").concat(err.message));
  }
}
var Futils = {
  SyntaxException: SyntaxException,
  TypeException: TypeException,
  ValidationError: ValidationError,
  retrieveEnclosure: retrieveEnclosure,
  retrieveArgs: retrieveArgs,
  getCharCounts: getCharCounts,
  tokenizeWithNestedEnclosures: tokenizeWithNestedEnclosures,
  parseDate: parseDate,
  tryConvert: tryConvert
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Futils);

/***/ }),

/***/ "./static/assets/js/e7/hero-manager.js":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/hero-manager.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _e7_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./e7-utils.js */ "./static/assets/js/e7/e7-utils.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");
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





var FODDER_NAME = "Fodder";
var EMPTY_NAME = "Empty";

// This function adds two heroes to the Hero Manager to account for fodder champions and empty picks/prebans
function addNonHeroes(HM) {
  var next_index = HM.heroes.length;
  var Empty = {
    attribute_cd: "N/A",
    code: "N/A",
    grade: "N/A",
    job_cd: "N/A",
    name: EMPTY_NAME,
    prime: 1
  };
  var Fodder = {
    attribute_cd: "N/A",
    code: "N/A",
    grade: "2/3",
    job_cd: "N/A",
    name: FODDER_NAME,
    prime: _references_js__WEBPACK_IMPORTED_MODULE_2__.PRIMES[next_index]
  };
  HM.heroes.push(Empty);
  HM.heroes.push(Fodder);
  HM.Fodder = Fodder;
  HM.Empty = Empty;
  return HM;
}

// add lookup dicts to the hero manager so that we can perform efficient lookups
function addDicts(HM) {
  console.log("Adding Lookup Dicts");
  console.log("\tAdding name lookup");
  HM.name_lookup = HM.heroes.reduce(function (acc, hero) {
    acc[hero.name.toLowerCase().replace(/\s+/g, "")] = hero;
    return acc;
  }, {});
  console.log("\tAdding prime lookup");
  HM.prime_lookup = HM.heroes.reduce(function (acc, hero) {
    acc[hero.prime] = hero;
    return acc;
  }, {});
  console.log("\tAdding code lookup");
  HM.code_lookup = HM.heroes.reduce(function (acc, hero) {
    acc[hero.code] = hero;
    return acc;
  }, {});
  console.log("\tAdding prime pair lookup");
  var prime_pair_lookup = HM.heroes.reduce(function (acc, hero) {
    acc[hero.prime] = hero.name;
    return acc;
  }, {});
  var numKeys = Object.keys(HM.prime_lookup).length - 1; // subtract 1 since we don't consider Empty hero
  console.log("\tAdding prime pair lookup; primes to process", numKeys);
  for (var i = 0; i < numKeys - 1; i++) {
    var prime = _references_js__WEBPACK_IMPORTED_MODULE_2__.PRIMES[i];
    for (var j = i + 1; j < numKeys; j++) {
      var prime2 = _references_js__WEBPACK_IMPORTED_MODULE_2__.PRIMES[j];
      var product = prime * prime2;
      var name1 = HM.prime_lookup[prime].name;
      var name2 = HM.prime_lookup[prime2].name;
      prime_pair_lookup[product] = [name1, name2].sort().join(", ");
    }
  }
  //capture case where two fodder heroes
  prime_pair_lookup[HM.Fodder.prime * HM.Fodder.prime] = [HM.Fodder.name, HM.Fodder.prime];

  //set prime pair lookup dict in HM and return
  HM.prime_pair_lookup = prime_pair_lookup;
  return HM;
}
var HeroManager = {
  getHeroManager: function () {
    var _getHeroManager = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
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
            _t3 = this.fetchAndCacheHeroManager();
          case 4:
            return _context.a(2, _t3);
        }
      }, _callee, this);
    }));
    function getHeroManager() {
      return _getHeroManager.apply(this, arguments);
    }
    return getHeroManager;
  }(),
  createHeroManager: function createHeroManager(rawHeroList) {
    // add prime identifier to each hero so that we can represent a set as a product of primes
    var _iterator = _createForOfIteratorHelper(rawHeroList.entries()),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _step$value = _slicedToArray(_step.value, 2),
          index = _step$value[0],
          heroData = _step$value[1];
        var prime = _references_js__WEBPACK_IMPORTED_MODULE_2__.PRIMES[index];
        heroData.prime = prime;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    var HM = {
      heroes: rawHeroList
    };
    HM = addNonHeroes(HM); //should not be called again
    HM = addDicts(HM); // Must come after addNonHeroes so that empty/fodder are added to the dicts
    return HM;
  },
  fetchHeroManager: function () {
    var _fetchHeroManager = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var _yield$E7API$fetchHer;
      var heroJSON, enHeroList, HM, _t4, _t5, _t6;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_4__["default"].fetchHeroJSON();
          case 1:
            _t5 = _yield$E7API$fetchHer = _context2.v;
            _t4 = _t5 !== null;
            if (!_t4) {
              _context2.n = 2;
              break;
            }
            _t4 = _yield$E7API$fetchHer !== void 0;
          case 2:
            if (!_t4) {
              _context2.n = 3;
              break;
            }
            _t6 = _yield$E7API$fetchHer;
            _context2.n = 5;
            break;
          case 3:
            _context2.n = 4;
            return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__["default"].fetchHeroData();
          case 4:
            _t6 = _context2.v;
          case 5:
            heroJSON = _t6;
            enHeroList = heroJSON.en; //get english hero list
            HM = this.createHeroManager(enHeroList);
            console.log("Created HeroManager using raw data received from server");
            return _context2.a(2, HM);
        }
      }, _callee2, this);
    }));
    function fetchHeroManager() {
      return _fetchHeroManager.apply(this, arguments);
    }
    return fetchHeroManager;
  }(),
  fetchAndCacheHeroManager: function () {
    var _fetchAndCacheHeroManager = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var HM;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            console.log("HeroManager not found in cache, fetching from server and caching it");
            _context3.n = 1;
            return this.fetchHeroManager();
          case 1:
            HM = _context3.v;
            _context3.n = 2;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER, HM);
          case 2:
            console.log("Cached HeroManager using raw data recieved from server");
            (0,_e7_utils_js__WEBPACK_IMPORTED_MODULE_1__.printObjStruct)(HM);
            return _context3.a(2, HM);
        }
      }, _callee3, this);
    }));
    function fetchAndCacheHeroManager() {
      return _fetchAndCacheHeroManager.apply(this, arguments);
    }
    return fetchAndCacheHeroManager;
  }(),
  deleteHeroManager: function () {
    var _deleteHeroManager = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HERO_MANAGER);
          case 1:
            console.log("Removed hero manager from cache");
          case 2:
            return _context4.a(2);
        }
      }, _callee4);
    }));
    function deleteHeroManager() {
      return _deleteHeroManager.apply(this, arguments);
    }
    return deleteHeroManager;
  }(),
  getHeroByName: function getHeroByName(name, HM) {
    var _HM$name_lookup$norma;
    if (!HM) {
      throw new Error("HeroManager instance must be passed to lookup functions");
    } else if (!name) {
      return HM.Empty;
    }
    var normalizedName = name.toLowerCase().replace(/\s+/g, "");
    return (_HM$name_lookup$norma = HM.name_lookup[normalizedName]) !== null && _HM$name_lookup$norma !== void 0 ? _HM$name_lookup$norma : null;
  },
  getHeroByPrime: function getHeroByPrime(prime, HM) {
    if (!HM) {
      throw new Error("HeroManager instance must be passed to lookup functions");
    }
    return HM.prime_lookup[prime];
  },
  getHeroByCode: function getHeroByCode(code, HM) {
    var _HM$code_lookup$code;
    if (!HM) {
      throw new Error("HeroManager instance must be passed to lookup functions");
    } else if (!code) {
      return HM.Empty;
    }
    return (_HM$code_lookup$code = HM.code_lookup[code]) !== null && _HM$code_lookup$code !== void 0 ? _HM$code_lookup$code : null;
  },
  getPairNamesByProduct: function getPairNamesByProduct(product, HM) {
    if (!HM) {
      throw new Error("HeroManager instance must be passed to lookup functions");
    }
    return HM.prime_pair_lookup[product];
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (HeroManager);

/***/ }),

/***/ "./static/assets/js/e7/plots.js":
/*!**************************************!*\
  !*** ./static/assets/js/e7/plots.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateRankPlot: () => (/* binding */ generateRankPlot)
/* harmony export */ });
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function generateRankPlot(battles, user) {
  var filteredBattles = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var zoomFiltered = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  // Sort battles chronologically by time
  // console.log("Creating plot HTML for:", JSON.stringify(battles));
  // console.log("received Filtered Battles:", JSON.stringify(filteredBattles));
  battles.sort(function (a, b) {
    return new Date(a["Date/Time"]) - new Date(b["Date/Time"]);
  });

  // if the user is not passed, default the username to the ID of the player
  if (!user) {
    user = {
      name: "UID: ".concat(battles[0]["P1 ID"])
    };
  }
  var markerDefaultColor = '#0df8fd';
  var markerFilteredColor = '#ff9900';
  var x = battles.map(function (_, i) {
    return i;
  });
  var y = battles.map(function (b) {
    return b["P1 Points"];
  });
  var markerMask = [];
  var zoom = {
    startX: null,
    endX: null,
    startY: null,
    endY: null
  };
  var zoomYPadding = 50;
  var zoomXPadding = 0.5;

  // iterate through battles and build list to color filtered battles distinctly 
  // and determine the area to zoom on if needed
  var _iterator = _createForOfIteratorHelper(battles.entries()),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _slicedToArray(_step.value, 2),
        idx = _step$value[0],
        battle = _step$value[1];
      if (filteredBattles && battle["Seq Num"] in filteredBattles) {
        if (zoomFiltered === true) {
          zoom.startX = idx < zoom.startX || zoom.startX === null ? idx - zoomXPadding : zoom.startX;
          zoom.startY = battle["P1 Points"] < zoom.startY + zoomYPadding || zoom.startY === null ? battle["P1 Points"] - zoomYPadding : zoom.startY;
          zoom.endX = idx > zoom.endX || zoom.endX === null ? idx + zoomXPadding : zoom.endX;
          zoom.endY = battle["P1 Points"] > zoom.endY - zoomYPadding || zoom.endY === null ? battle["P1 Points"] + zoomYPadding : zoom.endY;
        }
        markerMask.push(markerFilteredColor);
      } else {
        markerMask.push(markerDefaultColor);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  ;
  var customdata = battles.map(function (b) {
    return [b["Date/Time"].slice(0, 10),
    // date
    b["P1 League"] // league
    ];
  });
  var trace = {
    x: x,
    y: y,
    mode: 'lines+markers',
    line: {
      color: '#4f9293',
      width: 2
    },
    marker: {
      symbol: 'circle',
      size: 4,
      color: markerMask
    },
    customdata: customdata,
    hovertemplate: 'Points: %{y}<br>' + 'Date: %{customdata[0]}<br>' + 'League: %{customdata[1]}<extra></extra>'
  };
  var layout = {
    autosize: true,
    font: {
      family: 'Roboto, Open Sans'
    },
    title: {
      text: "".concat(user.name, "'s RTA Point Plot"),
      font: {
        size: 24,
        color: '#dddddd'
      },
      xanchor: 'center',
      yanchor: 'top',
      y: 0.95,
      x: 0.5
    },
    xaxis: {
      title: {
        text: 'Battle Number (Chronological)',
        font: {
          size: 18,
          color: '#dddddd'
        }
      },
      showgrid: true,
      gridcolor: '#8d8d8d',
      zeroline: false,
      tickfont: {
        size: 12,
        color: '#dddddd'
      },
      range: zoom.startX ? [zoom.startX, zoom.endX] : null
    },
    yaxis: {
      title: {
        text: 'Victory Points',
        font: {
          size: 18,
          color: '#dddddd'
        }
      },
      showgrid: true,
      gridcolor: '#8d8d8d',
      zeroline: true,
      zerolinecolor: '#dddddd',
      zerolinewidth: 2,
      tickfont: {
        size: 12,
        color: '#dddddd'
      },
      range: zoom.startY ? [zoom.startY, zoom.endY] : null
    },
    plot_bgcolor: '#1e222d',
    paper_bgcolor: '#1e222d'
  };
  var config = {
    responsive: true
  };

  // Generate HTML string
  var divId = "rank-plot-container";
  var containerDiv = "<div id=\"".concat(divId, "\"></div>");
  var plotScript = "\n<script>\n    Plotly.newPlot('".concat(divId, "', [").concat(JSON.stringify(trace), "], ").concat(JSON.stringify(layout), ", ").concat(JSON.stringify(config), ");\n</script>\n");
  return containerDiv + plotScript;
}

/***/ }),

/***/ "./static/assets/js/e7/references.js":
/*!*******************************************!*\
  !*** ./static/assets/js/e7/references.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ARRAY_COLUMNS: () => (/* binding */ ARRAY_COLUMNS),
/* harmony export */   BOOLS_COLS: () => (/* binding */ BOOLS_COLS),
/* harmony export */   COLUMNS: () => (/* binding */ COLUMNS),
/* harmony export */   COLUMNS_EXPANDED: () => (/* binding */ COLUMNS_EXPANDED),
/* harmony export */   COLUMNS_MAP: () => (/* binding */ COLUMNS_MAP),
/* harmony export */   EQUIPMENT_SET_MAP: () => (/* binding */ EQUIPMENT_SET_MAP),
/* harmony export */   INT_COLUMNS: () => (/* binding */ INT_COLUMNS),
/* harmony export */   LEAGUE_MAP: () => (/* binding */ LEAGUE_MAP),
/* harmony export */   ONE_DAY: () => (/* binding */ ONE_DAY),
/* harmony export */   PRIMES: () => (/* binding */ PRIMES),
/* harmony export */   TITLE_CASE_COLUMNS: () => (/* binding */ TITLE_CASE_COLUMNS),
/* harmony export */   WORLD_CODES: () => (/* binding */ WORLD_CODES),
/* harmony export */   WORLD_CODE_ENUM: () => (/* binding */ WORLD_CODE_ENUM),
/* harmony export */   WORLD_CODE_TO_CLEAN_STR: () => (/* binding */ WORLD_CODE_TO_CLEAN_STR)
/* harmony export */ });
var WORLD_CODES = new Set(["world_kor", "world_global", "world_jpn", "world_asia", "world_eu"]);
var WORLD_CODE_ENUM = {
  GLOBAL: "world_global",
  KOR: "world_kor",
  JPN: "world_jpn",
  ASIA: "world_asia",
  EU: "world_eu"
};
var WORLD_CODE_TO_CLEAN_STR = {
  "world_global": "Global",
  "world_kor": "Korea",
  "world_jpn": "Japan",
  "world_asia": "Asia",
  "world_eu": "Europe"
};
var EQUIPMENT_SET_MAP = {
  "set_speed": "Speed",
  "set_acc": "Hit",
  "set_cri": "Critical",
  "set_res": "Resist",
  "set_def": "Defense",
  "set_att": "Attack",
  "set_max_hp": "Health",
  "set_cri_dmg": "Destruction",
  "set_coop": "Unity",
  "set_immune": "Immunity",
  "set_rage": "Rage",
  "set_vampire": "Lifesteal",
  "set_shield": "Protection",
  "set_revenge": "Revenge",
  "set_penetrate": "Penetration",
  "set_torrent": "Torrent",
  "set_counter": "Counter",
  "set_scar": "Injury"
};
var ONE_DAY = 1000 * 60 * 60 * 24;
var LEAGUE_MAP = {
  "bronze": 0,
  "silver": 1,
  "gold": 2,
  "master": 3,
  "challenger": 4,
  "champion": 5,
  "warlord": 6,
  "emperor": 7,
  "legend": 8
};
var COLUMNS = ["Date/Time", "Seq Num", "P1 ID", "P1 Server", "P1 League", "P1 Points", "P2 ID", "P2 Server", "P2 League", "Win", "First Pick", "P1 Preban 1", "P1 Preban 2", "P2 Preban 1", "P2 Preban 2", "P1 Pick 1", "P1 Pick 2", "P1 Pick 3", "P1 Pick 4", "P1 Pick 5", "P2 Pick 1", "P2 Pick 2", "P2 Pick 3", "P2 Pick 4", "P2 Pick 5", "P1 Postban", "P2 Postban"];
var COLUMNS_EXPANDED = ["Season", "Date/Time", "Seconds", "Turns", "Seq Num", "P1 ID", "P1 Server", "P2 ID", "P2 Server", "P1 League", "P2 League", "P1 Points", "Point Gain", "Win", "First Pick", "CR Bar", "First Turn", "First Turn Hero", "P1 Prebans", "P2 Prebans", "P1 Picks", "P2 Picks", "P1 Postban", "P2 Postban", "P1 Equipment", "P2 Equipment", "P1 Artifacts", "P2 Artifacts", "P1 MVP", "P2 MVP"];
var COLUMNS_MAP = {
  SEASON: "Season",
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
  CR_BAR: "CR Bar",
  FIRST_TURN: "First Turn",
  FIRST_TURN_HERO: "First Turn Hero",
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
  P2_PREBANS_PRIME_PRODUCT: "P2 Prebans Prime Product"
};
var ARRAY_COLUMNS = [COLUMNS_MAP.P1_EQUIPMENT, COLUMNS_MAP.P2_EQUIPMENT, COLUMNS_MAP.P1_ARTIFACTS, COLUMNS_MAP.P2_ARTIFACTS, COLUMNS_MAP.CR_BAR, COLUMNS_MAP.P1_PREBANS, COLUMNS_MAP.P2_PREBANS, COLUMNS_MAP.P1_PICKS, COLUMNS_MAP.P2_PICKS];
var BOOLS_COLS = [COLUMNS_MAP.FIRST_PICK, COLUMNS_MAP.FIRST_TURN, COLUMNS_MAP.WIN];
var INT_COLUMNS = [COLUMNS_MAP.SECONDS, COLUMNS_MAP.TURNS, COLUMNS_MAP.P1_POINTS, COLUMNS_MAP.POINT_GAIN];
var TITLE_CASE_COLUMNS = [COLUMNS_MAP.P1_LEAGUE, COLUMNS_MAP.P2_LEAGUE];

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
  var sieve = new Uint8Array(limit + 1);
  var primes = [];
  for (var i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (var j = i * i; j <= limit; j += i) {
        sieve[j] = 1;
      }
    }
  }
  return primes;
}
var PRIMES = getPrimes(30000);

/***/ }),

/***/ "./static/assets/js/e7/regex.js":
/*!**************************************!*\
  !*** ./static/assets/js/e7/regex.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RegExps: () => (/* binding */ RegExps)
/* harmony export */ });
function padRegex(pattern) {
  var flags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "i";
  return new RegExp("^(?:".concat(pattern.source, ")(?=[,)\\s;]|$)"), flags);
}
function anchorExp(pattern) {
  var flags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "i";
  return new RegExp("^(?:".concat(pattern.source, ")$"), flags);
}
function orRegex(patterns) {
  var flags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "i";
  if (patterns.length < 1) throw new Error("orRegex must have at least one pattern");
  var regExStr = "(?:".concat(patterns[0].source, ")");
  for (var i = 1; i < patterns.length; i++) {
    regExStr += "|(?:".concat(patterns[i].source, ")");
  }
  return new RegExp(regExStr, flags);
}
var escapeRegex = function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
var VALID_FIELD_WORDS = ["date", "is-first-pick", "is-win", "victory-points", "p1.picks", "p2.picks", "p1.prebans", "p2.prebans", "p1.postban", "p2.postban", "prebans", "p1.id", "p2.id", "p1.league", "p2.league", "p1.server", "p2.server", "p1.pick1", "p1.pick2", "p1.pick3", "p1.pick4", "p1.pick5", "p2.pick1", "p2.pick2", "p2.pick3", "p2.pick4", "p2.pick5", "p1.mvp", "p2.mvp", "first-turn", "first-turn-hero", "turns", "seconds"];
var VALID_FIELD_WORD_RE = new RegExp("^(?:".concat(VALID_FIELD_WORDS.map(escapeRegex).join("|"), ")"), "i");
var VALID_CLAUSE_FUNCTIONS = ["and", "or", "xor", "not"];
var VALID_GLOBAL_FUNCTIONS = ["last-n"];
var VALID_DIRECT_FUNCTIONS = ["p1.equipment", "p2.equipment", "p1.artifacts", "p2.artifacts", "p1.cr-bar", "p2.cr-bar"];
var VALID_CLAUSE_FUNCTIONS_RE = new RegExp("(?:".concat(VALID_CLAUSE_FUNCTIONS.map(escapeRegex).join("|"), ")(?=\\()"), "i");
var VALID_GLOBAL_FUNCTIONS_RE = new RegExp("(?:".concat(VALID_GLOBAL_FUNCTIONS.map(escapeRegex).join("|"), ")(?=\\()"), "i");
var VALID_DIRECT_FUNCTIONS_RE = new RegExp("(?:".concat(VALID_DIRECT_FUNCTIONS.map(escapeRegex).join("|"), ")(?=\\()"), "i");
var VALID_FUNCTIONS_RE = orRegex([VALID_CLAUSE_FUNCTIONS_RE, VALID_GLOBAL_FUNCTIONS_RE, VALID_DIRECT_FUNCTIONS_RE]);
var VALID_STRING_RE = /[a-z][a-z0-9.\s]*/i;
var VALID_DATE_RE = /\d{4}-\d{2}-\d{2}/;
var EMPTY_SET_RE = /\{\s*\}/;
var VALID_INT_RE = /\d+/;
var VALID_SEASON_RE = /season-[1-9]+[0-9]*(\.[1-9]*)?|current-season/i;
var VALID_GLOBAL_FILTER_RE = /last-n\(\d+\)/i;
var VALID_DATE_LITERAL_RE = new RegExp("^".concat(VALID_DATE_RE.source, "$"), "i");
var VALID_INT_LITERAL_RE = /^\d+$/;
var VALID_BOOL_LITERAL_RE = /^(true|false)$/i;
var VALID_DATA_WORD_RE = new RegExp("(?:".concat(VALID_SEASON_RE.source, ")"), "i");

//consts without RE are used for injecting into regex patterns
var STR = VALID_STRING_RE.source;
var INT = VALID_INT_RE.source;
var DATE = VALID_DATE_RE.source;
var FIELD_WORD = VALID_FIELD_WORD_RE.source;
var DATA_WORD = VALID_DATA_WORD_RE.source;
var VALID_QUOTED_STRING_RE = new RegExp("\"(".concat(STR, ")\"|'(").concat(STR, ")'"), "i");
var VALID_STRING_LITERAL_RE = new RegExp(anchorExp(VALID_QUOTED_STRING_RE), "i");
var QUOTED_STR = VALID_QUOTED_STRING_RE.source;
var SET_ELEMENT_RE = new RegExp("(?:".concat(QUOTED_STR, "|").concat(STR, "|").concat(DATE, ")"), "i");
var VALID_DATAFIELD_RE = new RegExp("(?:".concat(FIELD_WORD, "|").concat(DATA_WORD, ")"), "i");
var SETELT = SET_ELEMENT_RE.source;
var VALID_SET_RE = new RegExp("\\{\\s*(?:".concat(SETELT, "\\s*)(?:,\\s*").concat(SETELT, "\\s*)*,?\\s*\\}|").concat(EMPTY_SET_RE.source), "i");
var VALID_RANGE_RE = new RegExp("".concat(INT, "\\.\\.\\.").concat(INT, "|").concat(DATE, "\\.\\.\\.").concat(DATE, "|").concat(INT, "\\.\\.\\.=").concat(INT, "|").concat(DATE, "\\.\\.\\.=").concat(DATE));
var VALID_RANGE_LITERAL_RE = new RegExp("^".concat(VALID_RANGE_RE.source, "$"));
function tokenMatch(stream) {
  if (stream.match(VALID_FUNCTIONS_RE)) {
    console.log("Matched stream as clause:", stream);
    return "keyword";
  }
  if (stream.match(/\s+(?:!=|<|>|=|>=|<=|in|!in)(?=\s+)/i)) {
    console.log("Matched stream as operator:", stream);
    return "operator";
  }
  if (stream.match(new RegExp("[a-z0-9.\"'}=)-]".concat(VALID_DATAFIELD_RE.source, "(?=[,)\\s;]|$)"), "i"))) {
    console.log("Matched stream as field with preceding fragment:", stream);
    return null;
  }
  if (stream.match(padRegex(VALID_DATAFIELD_RE))) {
    console.log("Matched stream as Data Field:", stream);
    return "datafield";
  }
  if (stream.match(/[^(,\s;.=0-9]+\d+/i)) {
    console.log("Matched stream as non-num null");
    return null;
  }
  if (stream.match(padRegex(VALID_RANGE_RE))) {
    console.log("Matched stream as range:", stream);
    return "range";
  }
  if (stream.match(padRegex(VALID_INT_RE))) {
    console.log("Matched stream as number:", stream);
    return "number";
  }
  if (stream.match(padRegex(VALID_DATE_RE))) {
    console.log("Matched stream as date:", stream);
    return "date";
  }
  if (stream.match(padRegex(VALID_SET_RE))) {
    console.log("Matched stream as set:", stream);
    return "set";
  }
  if (stream.match(/(?:^|\s)(?:true|false)(?=[,)\s;]|$)/i)) {
    console.log("Matched stream as bool:", stream);
    return "bool";
  }
  if (stream.match(padRegex(VALID_QUOTED_STRING_RE))) {
    console.log("Matched stream as string:", stream);
    return "string";
  }
  if (stream.match(/[\(\)\{\}\;\,]/)) {
    console.log("Matched stream as bracket:", stream);
    return "bracket";
  }
  stream.next();
  console.log("Matched stream as null:", stream);
  return null;
}
var RegExps = {
  VALID_STRING_RE: VALID_STRING_RE,
  VALID_DATE_RE: VALID_DATE_RE,
  VALID_INT_RE: VALID_INT_RE,
  EMPTY_SET_RE: EMPTY_SET_RE,
  SET_ELEMENT_RE: SET_ELEMENT_RE,
  VALID_SET_RE: VALID_SET_RE,
  VALID_STRING_LITERAL_RE: VALID_STRING_LITERAL_RE,
  VALID_DATE_LITERAL_RE: VALID_DATE_LITERAL_RE,
  VALID_INT_LITERAL_RE: VALID_INT_LITERAL_RE,
  VALID_BOOL_LITERAL_RE: VALID_BOOL_LITERAL_RE,
  VALID_RANGE_RE: VALID_RANGE_RE,
  VALID_RANGE_LITERAL_RE: VALID_RANGE_LITERAL_RE,
  VALID_SEASON_RE: VALID_SEASON_RE,
  VALID_SEASON_LITERAL_RE: anchorExp(VALID_SEASON_RE),
  VALID_DATA_WORD_RE: VALID_DATA_WORD_RE,
  VALID_DATA_WORD_LITERAL_RE: anchorExp(VALID_DATA_WORD_RE),
  VALID_FIELD_WORD_RE: VALID_FIELD_WORD_RE,
  VALID_DATAFIELD_RE: VALID_DATAFIELD_RE,
  VALID_GLOBAL_FILTER_RE: VALID_GLOBAL_FILTER_RE,
  ANCHORED_STR_LITERAL_RE: anchorExp(VALID_STRING_LITERAL_RE),
  VALID_CLAUSE_FUNCTIONS_RE: VALID_CLAUSE_FUNCTIONS_RE,
  VALID_DIRECT_FUNCTIONS_RE: VALID_DIRECT_FUNCTIONS_RE,
  VALID_GLOBAL_FUNCTIONS_RE: VALID_GLOBAL_FUNCTIONS_RE,
  VALID_FUNCTIONS_RE: VALID_FUNCTIONS_RE,
  padRegex: padRegex,
  anchorExp: anchorExp,
  tokenMatch: tokenMatch,
  orRegex: orRegex,
  escapeRegex: escapeRegex
};


/***/ }),

/***/ "./static/assets/js/e7/saved-filters.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/saved-filters.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var SavedFilters = {
  "Current Season": "date in current-season",
  "Wins": "is-win = true",
  "Losses": "is-win = false",
  "First Pick": "is-first-pick = true",
  "Second Pick": "is-first-pick = false",
  "Champion+ Opponent": "p2.league in {champion, warlord, emperor, legend}",
  "Warlord+ Opponent": "p2.league in {warlord, emperor, legend}",
  "Emperor+ Opponent": "p2.league in {emperor, legend}",
  "Legend Opponent": "p2.league = 'legend'",
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

/***/ "./static/assets/js/e7/season-manager.js":
/*!***********************************************!*\
  !*** ./static/assets/js/e7/season-manager.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




// a Season record has the following fields: "Season Number", "Code", "Season", "Start", "End", "Status"

var SeasonManager = {
  fetchAndCacheSeasonDetails: function () {
    var _fetchAndCacheSeasonDetails = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var result, seasonDetails, preSeasonFilled, lastSeason, start, preSeason;
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
            });
            seasonDetails.sort(function (a, b) {
              return a["Season Number"] - b["Season Number"];
            });

            // add pre seasons
            preSeasonFilled = [seasonDetails[0]];
            lastSeason = seasonDetails[0];
            seasonDetails.slice(1).forEach(function (season) {
              var start = new Date(+lastSeason.range[1] + _references_js__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY),
                end = new Date(+season.range[0] - _references_js__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              var preSeason = {
                "Season Number": lastSeason["Season Number"] + 0.5,
                Code: null,
                Season: "Pre-Season: ".concat(season["Season"]),
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
              start = new Date(+preSeasonFilled.at(-1).range[1] + _references_js__WEBPACK_IMPORTED_MODULE_2__.ONE_DAY);
              preSeason = {
                "Season Number": lastSeason["Season Number"] + 0.5,
                Code: null,
                Season: "Pre-Season: ".concat(season["Season"]),
                Start: start.toISOString().slice(0, 10),
                End: "N/A",
                Status: "Active",
                range: [start, new Date()]
              };
              preSeasonFilled.push(preSeason);
            }
            preSeasonFilled.reverse();
            _context.n = 3;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS, preSeasonFilled);
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
      var _yield$ClientCache$ge;
      var _t, _t2, _t3;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
          case 1:
            _t2 = _yield$ClientCache$ge = _context2.v;
            _t = _t2 !== null;
            if (!_t) {
              _context2.n = 2;
              break;
            }
            _t = _yield$ClientCache$ge !== void 0;
          case 2:
            if (!_t) {
              _context2.n = 3;
              break;
            }
            _t3 = _yield$ClientCache$ge;
            _context2.n = 5;
            break;
          case 3:
            _context2.n = 4;
            return SeasonManager.fetchAndCacheSeasonDetails();
          case 4:
            _t3 = _context2.v;
          case 5:
            return _context2.a(2, _t3);
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.SEASON_DETAILS);
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
  }()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (SeasonManager);

/***/ }),

/***/ "./static/assets/js/e7/stats-builder.js":
/*!**********************************************!*\
  !*** ./static/assets/js/e7/stats-builder.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


var getWins = function getWins(battleList) {
  return battleList.filter(function (b) {
    return b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
  });
};
var getFirstPickSubset = function getFirstPickSubset(battleList) {
  return battleList.filter(function (b) {
    return b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var getSecondPickSubset = function getSecondPickSubset(battleList) {
  return battleList.filter(function (b) {
    return !b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.FIRST_PICK];
  });
};
var isIncomplete = function isIncomplete(b) {
  return b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.TURNS] === 0;
};
function toPercent(value) {
  return (value * 100).toFixed(2) + '%';
}
function queryStats(battleList, totalBattles) {
  var gamesWon = getWins(battleList).length;
  var gamesAppeared = battleList.length;
  var appearanceRate = totalBattles !== 0 ? gamesAppeared / totalBattles : 0;
  var winRate = gamesAppeared !== 0 ? gamesWon / gamesAppeared : 0;
  return {
    games_won: gamesWon,
    games_appeared: gamesAppeared,
    total_games: totalBattles,
    appearance_rate: toPercent(appearanceRate),
    win_rate: toPercent(winRate),
    '+/-': 2 * gamesWon - gamesAppeared
  };
}
function getPrimes(battles) {
  var isP1 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var primeSet = new Set();
  for (var _i = 0, _Object$values = Object.values(battles); _i < _Object$values.length; _i++) {
    var battle = _Object$values[_i];
    var picks = isP1 ? battle[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES] : battle[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIMES];
    picks.forEach(function (element) {
      primeSet.add(element);
    });
  }
  return primeSet;
}
function getHeroStats(battles, HM) {
  var battleList = Object.values(battles);
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
  var _iterator = _createForOfIteratorHelper(playerPrimes),
    _step;
  try {
    var _loop = function _loop() {
      var prime = _step.value;
      var hero = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM);
      var playerSubset = battleList.filter(function (b) {
        return b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (playerSubset.length > 0) {
        playerHeroStats.push(_objectSpread(_objectSpread({}, queryStats(playerSubset, totalBattles)), {}, {
          hero: hero.name
        }));
      }
    };
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var _iterator2 = _createForOfIteratorHelper(enemyPrimes),
    _step2;
  try {
    var _loop2 = function _loop2() {
      var prime = _step2.value;
      var hero = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM);
      var enemySubset = battleList.filter(function (b) {
        return b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P2_PICKS_PRIME_PRODUCT] % prime === 0;
      });
      if (enemySubset.length > 0) {
        enemyHeroStats.push(_objectSpread(_objectSpread({}, queryStats(enemySubset, totalBattles)), {}, {
          hero: hero.name
        }));
      }
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      _loop2();
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return {
    playerHeroStats: playerHeroStats.sort(function (b1, b2) {
      return b1.hero.localeCompare(b2.hero);
    }),
    enemyHeroStats: enemyHeroStats.sort(function (b1, b2) {
      return b1.hero.localeCompare(b2.hero);
    })
  };
}
function getFirstPickStats(battles, HM) {
  var battleList = getFirstPickSubset(Object.values(battles));
  if (battleList.length === 0) {
    return [];
  }
  var totalBattles = battleList.length;
  var grouped = {};
  var _iterator3 = _createForOfIteratorHelper(battleList),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var b = _step3.value;
      if (b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES].length === 0) continue; // skip any battle where player didn't get to pick a first unit
      var hero = b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PICKS_PRIMES][0];
      if (!(hero in grouped)) grouped[hero] = {
        wins: 0,
        appearances: 0
      };
      grouped[hero].wins += b[_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.WIN];
      grouped[hero].appearances += 1;
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var result = Object.entries(grouped).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
      prime = _ref2[0],
      stats = _ref2[1];
    var name = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByPrime(prime, HM).name;
    return {
      hero: name,
      wins: stats.wins,
      appearances: stats.appearances,
      win_rate: toPercent(stats.wins / stats.appearances),
      appearance_rate: toPercent(stats.appearances / totalBattles),
      '+/-': 2 * stats.wins - stats.appearances
    };
  });
  result.sort(function (a, b) {
    return b.appearances - a.appearances;
  });
  return result;
}
function getPrebanStats(battles, HM) {
  //console.log(`Got HM: ${HM}`);

  var emptyPrime = _hero_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].getHeroByName('Empty', HM).prime;
  var battleList = Object.values(battles);
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
  var preban1Set = getValidPrimes(_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 0);
  var preban2Set = getValidPrimes(_references_js__WEBPACK_IMPORTED_MODULE_1__.COLUMNS_MAP.P1_PREBANS_PRIMES, 1);
  var prebanSet = new Set([].concat(_toConsumableArray(preban1Set), _toConsumableArray(preban2Set)));
  var prebans = [];
  var _iterator4 = _createForOfIteratorHelper(prebanSet),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var prime = _step4.value;
      prebans.push(prime);
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var _iterator5 = _createForOfIteratorHelper(prebanSet),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var a = _step5.value;
      var _iterator6 = _createForOfIteratorHelper(prebanSet),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var b = _step6.value;
          if (a < b) prebans.push(a * b);
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
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
      preban: HM.prime_pair_lookup[preban],
      wins: wins,
      appearances: appearances,
      appearance_rate: toPercent(appearanceRate),
      win_rate: toPercent(winRate),
      '+/-': plusMinus
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
function getGeneralStats(battles, HM) {
  var battleList = Object.values(battles);
  battleList.sort(function (b1, b2) {
    return new Date(b1["Date/Time"]) - new Date(b2["Date/Time"]);
  });
  var totalBattles = battleList.length;
  var totalGain = battleList.reduce(function (acc, b) {
    return acc + b["Point Gain"];
  }, 0);
  var avgPPG = totalBattles > 0 ? totalGain / totalBattles : 0;

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
  for (var _i3 = 0, _battleList = battleList; _i3 < _battleList.length; _i3++) {
    var b = _battleList[_i3];
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
  var NA = "N/A";
  return {
    "first_pick_count": fpCount,
    "second_pick_count": spCount,
    "first_pick_rate": fpCount ? toPercent(fpR) : NA,
    "second_pick_rate": spCount ? toPercent(spR) : NA,
    "first_pick_winrate": fpCount ? toPercent(fpWR) : NA,
    "second_pick_winrate": spCount ? toPercent(spWR) : NA,
    "total_winrate": totalBattles ? toPercent(winRate) : NA,
    "total_battles": totalBattles,
    "total_wins": fpWins + spWins,
    "max_win_streak": maxWinStreak,
    "max_loss_streak": maxLossStreak,
    "avg_ppg": avgPPG.toFixed(2)
  };
}
function getServerStats(battlesList) {
  var allServerStats = [];
  var totalBattles = battlesList.length;
  var _loop4 = function _loop4() {
    var server = _Object$values2[_i4];
    var subset = battlesList.filter(function (b) {
      return b["P2 Server"] === server;
    });
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
    allServerStats.push({
      server: server,
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
  };
  for (var _i4 = 0, _Object$values2 = Object.values(_references_js__WEBPACK_IMPORTED_MODULE_1__.WORLD_CODE_TO_CLEAN_STR); _i4 < _Object$values2.length; _i4++) {
    _loop4();
  }
  allServerStats.sort(function (a, b) {
    return a.server.localeCompare(b.server);
  });
  return allServerStats;
}
var StatsBuilder = {
  getHeroStats: getHeroStats,
  getFirstPickStats: getFirstPickStats,
  getPrebanStats: getPrebanStats,
  getServerStats: getServerStats,
  getGeneralStats: getGeneralStats
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (StatsBuilder);

/***/ }),

/***/ "./static/assets/js/e7/user-manager.js":
/*!*********************************************!*\
  !*** ./static/assets/js/e7/user-manager.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _references_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./references.js */ "./static/assets/js/e7/references.js");
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../apis/e7-API.js */ "./static/assets/js/apis/e7-API.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }




var userMapCacheKeyMap = {
  world_global: _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.GLOBAL_USERS,
  world_eu: _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.EU_USERS,
  world_asia: _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.ASIA_USERS,
  world_jpn: _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.JPN_USERS,
  world_kor: _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.KOR_USERS
};
function createUser(userJSON, world_code) {
  return {
    id: userJSON.nick_no,
    name: userJSON.nick_nm,
    code: userJSON.code,
    rank: userJSON.rank,
    world_code: world_code
  };
}
function getUserMapFromE7Server(_x) {
  return _getUserMapFromE7Server.apply(this, arguments);
}
function _getUserMapFromE7Server() {
  _getUserMapFromE7Server = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(world_code) {
    var rawUserJSON;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.n) {
        case 0:
          console.log("Getting user map for world code from E7 server: ".concat(world_code));
          _context7.n = 1;
          return _apis_e7_API_js__WEBPACK_IMPORTED_MODULE_2__["default"].fetchUserJSON(world_code);
        case 1:
          rawUserJSON = _context7.v;
          if (rawUserJSON) {
            _context7.n = 2;
            break;
          }
          console.log("Could not get user map from E7 server for world code: ".concat(world_code));
          return _context7.a(2, null);
        case 2:
          console.log("Got user map from E7 server for world code: ".concat(world_code));
          return _context7.a(2, Object.fromEntries(rawUserJSON.users.map(function (user) {
            return [user.nick_no, createUser(user, world_code)];
          })));
      }
    }, _callee7);
  }));
  return _getUserMapFromE7Server.apply(this, arguments);
}
var UserManager = {
  getUserMap: function () {
    var _getUserMap = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(world_code) {
      var cachedUserMap, fetchedUserMap;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            console.log("Getting user map for world code: ".concat(world_code));
            _context.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].get(userMapCacheKeyMap[world_code]);
          case 1:
            cachedUserMap = _context.v;
            if (!(cachedUserMap !== null)) {
              _context.n = 2;
              break;
            }
            console.log("Got user map from cache");
            return _context.a(2, cachedUserMap);
          case 2:
            _context.n = 3;
            return getUserMapFromE7Server(world_code);
          case 3:
            fetchedUserMap = _context.v;
            _context.n = 4;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].cache(userMapCacheKeyMap[world_code], fetchedUserMap);
          case 4:
            return _context.a(2, fetchedUserMap);
        }
      }, _callee);
    }));
    function getUserMap(_x2) {
      return _getUserMap.apply(this, arguments);
    }
    return getUserMap;
  }(),
  findUser: function () {
    var _findUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(userData) {
      var useFlaskServer, _iterator, _step, world_code, userMap, users, user, _ref, name, _world_code, _userMap, _users, lowerCaseName, _user, flaskServerResponse, _t;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            useFlaskServer = false; // attempt to find user through client-side means
            // try to find user by ID
            if (!userData.id) {
              _context2.n = 10;
              break;
            }
            _iterator = _createForOfIteratorHelper(_references_js__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODES);
            _context2.p = 1;
            _iterator.s();
          case 2:
            if ((_step = _iterator.n()).done) {
              _context2.n = 6;
              break;
            }
            world_code = _step.value;
            _context2.n = 3;
            return this.getUserMap(world_code);
          case 3:
            userMap = _context2.v;
            users = Object.values(userMap);
            if (!(users.length > 0)) {
              console.log("User map had no users, falling back to flask server for world code: ".concat(world_code));
              useFlaskServer = true;
            }
            user = users.find(function (user) {
              return user.id === userData.id;
            });
            if (!user) {
              _context2.n = 4;
              break;
            }
            console.log("Found user: ".concat(JSON.stringify(user), " in world code: ").concat(world_code));
            return _context2.a(2, {
              user: user,
              error: false
            });
          case 4:
            console.log("Could not find user with ID: ".concat(userData.id, " in world code: ").concat(world_code, " from client-side means"));
          case 5:
            _context2.n = 2;
            break;
          case 6:
            _context2.n = 8;
            break;
          case 7:
            _context2.p = 7;
            _t = _context2.v;
            _iterator.e(_t);
          case 8:
            _context2.p = 8;
            _iterator.f();
            return _context2.f(8);
          case 9:
            _context2.n = 15;
            break;
          case 10:
            if (!(userData.name && userData.world_code)) {
              _context2.n = 14;
              break;
            }
            _ref = [userData.name, userData.world_code], name = _ref[0], _world_code = _ref[1];
            _context2.n = 11;
            return this.getUserMap(_world_code);
          case 11:
            _userMap = _context2.v;
            _users = Object.values(_userMap);
            if (!(_users.length > 0)) {
              console.log("User map had no users, falling back to flask server for world code: ".concat(_world_code));
              useFlaskServer = true;
            }
            lowerCaseName = name.toLowerCase();
            _user = _users.find(function (user) {
              return lowerCaseName === user.name.toLowerCase();
            });
            if (!_user) {
              _context2.n = 12;
              break;
            }
            console.log("Found user: ".concat(JSON.stringify(_user), " in world code: ").concat(_world_code));
            return _context2.a(2, {
              user: _user,
              error: false
            });
          case 12:
            console.log("Could not find user with ID: ".concat(userData.id, " in world code: ").concat(_world_code, " from client-side means"));
          case 13:
            _context2.n = 15;
            break;
          case 14:
            console.error("Must pass a user object with either user.name and user.world_code or user.id to fetch user");
            return _context2.a(2, {
              user: null,
              error: "Must pass a user object with either user.name and user.world_code or user.id to fetch user"
            });
          case 15:
            if (!useFlaskServer) {
              _context2.n = 18;
              break;
            }
            console.log("Failed to find user through client-side means; falling back to flask server");
            // failed to find user through client-side means; make request to flask server
            _context2.n = 16;
            return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_3__["default"].fetchUser(userData);
          case 16:
            flaskServerResponse = _context2.v;
            if (!flaskServerResponse.error) {
              _context2.n = 17;
              break;
            }
            return _context2.a(2, {
              user: null,
              error: flaskServerResponse.error
            });
          case 17:
            return _context2.a(2, {
              user: flaskServerResponse.user,
              error: false
            });
          case 18:
            return _context2.a(2, {
              user: null,
              error: "Could not find user"
            });
          case 19:
            return _context2.a(2);
        }
      }, _callee2, this, [[1, 7, 8, 9]]);
    }));
    function findUser(_x3) {
      return _findUser.apply(this, arguments);
    }
    return findUser;
  }(),
  setUser: function () {
    var _setUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(userData) {
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER, userData);
          case 1:
            return _context3.a(2);
        }
      }, _callee3);
    }));
    function setUser(_x4) {
      return _setUser.apply(this, arguments);
    }
    return setUser;
  }(),
  getUser: function () {
    var _getUser = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.USER);
          case 1:
            return _context4.a(2, _context4.v);
        }
      }, _callee4);
    }));
    function getUser() {
      return _getUser.apply(this, arguments);
    }
    return getUser;
  }(),
  clearUserData: function () {
    var _clearUserData = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].clearUserData();
          case 1:
            return _context5.a(2);
        }
      }, _callee5);
    }));
    function clearUserData() {
      return _clearUserData.apply(this, arguments);
    }
    return clearUserData;
  }(),
  clearUserDataLists: function () {
    var _clearUserDataLists = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.GLOBAL_USERS);
          case 1:
            _context6.n = 2;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.EU_USERS);
          case 2:
            _context6.n = 3;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.ASIA_USERS);
          case 3:
            _context6.n = 4;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.JPN_USERS);
          case 4:
            _context6.n = 5;
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_1__["default"].Keys.KOR_USERS);
          case 5:
            return _context6.a(2);
        }
      }, _callee6);
    }));
    function clearUserDataLists() {
      return _clearUserDataLists.apply(this, arguments);
    }
    return clearUserDataLists;
  }(),
  convertServerStr: function convertServerStr(serverStr) {
    return _references_js__WEBPACK_IMPORTED_MODULE_0__.WORLD_CODE_TO_CLEAN_STR[serverStr];
  }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (UserManager);

/***/ }),

/***/ "./static/assets/js/exports.js":
/*!*************************************!*\
  !*** ./static/assets/js/exports.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CSVParse: () => (/* reexport safe */ _csv_parse_js__WEBPACK_IMPORTED_MODULE_2__["default"]),
/* harmony export */   CardContent: () => (/* reexport safe */ _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.CardContent),
/* harmony export */   ContentManager: () => (/* reexport safe */ _content_manager_js__WEBPACK_IMPORTED_MODULE_5__["default"]),
/* harmony export */   PYAPI: () => (/* reexport safe */ _apis_py_API_js__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   PageUtils: () => (/* reexport safe */ _pages_page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_3__["default"]),
/* harmony export */   RegExps: () => (/* reexport safe */ _e7_regex_js__WEBPACK_IMPORTED_MODULE_4__.RegExps),
/* harmony export */   SavedFilters: () => (/* reexport safe */ _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_6__["default"]),
/* harmony export */   Tables: () => (/* reexport safe */ _populate_content_js__WEBPACK_IMPORTED_MODULE_1__.Tables)
/* harmony export */ });
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _populate_content_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./populate_content.js */ "./static/assets/js/populate_content.js");
/* harmony import */ var _csv_parse_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./csv-parse.js */ "./static/assets/js/csv-parse.js");
/* harmony import */ var _pages_page_utilities_page_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./pages/page-utilities/page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _e7_regex_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./e7/regex.js */ "./static/assets/js/e7/regex.js");
/* harmony import */ var _content_manager_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./content-manager.js */ "./static/assets/js/content-manager.js");
/* harmony import */ var _e7_saved_filters_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./e7/saved-filters.js */ "./static/assets/js/e7/saved-filters.js");









/***/ }),

/***/ "./static/assets/js/pages/page-utilities/doc-element-references.js":
/*!*************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/doc-element-references.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
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
      return this._SELECT_DATA_MSG || (this._SELECT_DATA_MSG = document.getElementById("select-data-msg"));
    }
  }, {
    key: "FILTER_MSG",
    get: function get() {
      return this._FILTER_MSG || (this._FILTER_MSG = document.getElementById("filterMSG"));
    }
  }, {
    key: "SELECT_DATA_BODY",
    get: function get() {
      return this._SELECT_DATA_BODY || (this._SELECT_DATA_BODY = document.getElementById("select-data-body"));
    }
  }, {
    key: "SHOW_STATS_BODY",
    get: function get() {
      return this._SHOW_STATS_BODY || (this._SHOW_STATS_BODY = document.getElementById("show-stats-body"));
    }
  }, {
    key: "LOAD_DATA_BODY",
    get: function get() {
      return this._LOAD_DATA_BODY || (this._LOAD_DATA_BODY = document.getElementById("load-data-body"));
    }
  }, {
    key: "CLEAR_DATA_BTN",
    get: function get() {
      return this._CLEAR_DATA_BTN || (this._CLEAR_DATA_BTN = document.getElementById("clear-data-btn"));
    }
  }, {
    key: "UPLOAD_FORM",
    get: function get() {
      return this._UPLOAD_FORM || (this._UPLOAD_FORM = document.getElementById("uploadForm"));
    }
  }, {
    key: "CSV_FILE",
    get: function get() {
      return this._CSV_FILE || (this._CSV_FILE = document.getElementById("csvFile"));
    }
  }, {
    key: "USER_QUERY_FORM_NAME",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_NAME || (this._USER_QUERY_FORM_NAME = document.getElementById("user-query-form-name"));
    }
  }, {
    key: "USER_QUERY_FORM_SERVER",
    get: function get() {
      //needs to be kept in sync with id in forms.py of home folder in apps
      return this._USER_QUERY_FORM_SERVER || (this._USER_QUERY_FORM_SERVER = document.getElementById("user-query-form-server"));
    }
  }, {
    key: "BATTLES_TABLE",
    get: function get() {
      return this._BATTLES_TABLE || (this._BATTLES_TABLE = document.getElementById("BattlesTable"));
    }
  }, {
    key: "AUTO_ZOOM_FLAG",
    get: function get() {
      return this._AUTO_ZOOM_FLAG || (this._AUTO_ZOOM_FLAG = document.getElementById("auto-zoom-flag"));
    }
  }, {
    key: "FOOTER_BODY",
    get: function get() {
      return this._FOOTER || (this._FOOTER = document.getElementById("footer-body"));
    }
  }, {
    key: "USER_NAME",
    get: function get() {
      return this._USER_NAME || (this._USER_NAME = document.getElementById("user-name"));
    }
  }, {
    key: "USER_ID",
    get: function get() {
      return this._USER_ID || (this._USER_ID = document.getElementById("user-id"));
    }
  }, {
    key: "USER_SERVER",
    get: function get() {
      return this._USER_SERVER || (this._USER_SERVER = document.getElementById("user-server"));
    }
  }, {
    key: "BATTLE_FILTER_TOGGLE",
    get: function get() {
      return this._BATTLE_FILTER_TOGGLER || (this._BATTLE_FILTER_TOGGLER = document.getElementById("filter-battle-table"));
    }
  }]);
}();
var DOC_ELEMENTS = {
  HOME_PAGE: new HomePageElements()
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (DOC_ELEMENTS);

/***/ }),

/***/ "./static/assets/js/pages/page-utilities/home-page-context.js":
/*!********************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/home-page-context.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CONTEXT: () => (/* binding */ CONTEXT)
/* harmony export */ });
/* harmony import */ var _page_state_references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./page-state-references */ "./static/assets/js/pages/page-utilities/page-state-references.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
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
var SCROLL_PERCENTS = _defineProperty(_defineProperty(_defineProperty({}, _page_state_references__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SELECT_DATA, 0), _page_state_references__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.SHOW_STATS, 0), _page_state_references__WEBPACK_IMPORTED_MODULE_0__.HOME_PAGE_STATES.LOAD_DATA, 0);
var CONTEXT_KEYS = {
  SOURCE: "SOURCE",
  ERROR_MSG: "ERROR_MSG",
  AUTO_ZOOM: "AUTO_ZOOM",
  AUTO_QUERY: "AUTO_QUERY",
  STATS_POST_RENDER_COMPLETED: "STATS_POST_RENDER_COMPLETED",
  STATS_PRE_RENDER_COMPLETED: "STATS_PRE_RENDER_COMPLETED",
  HOME_PAGE_STATE: "STATE",
  SCROLL_PERCENTS: "SCROLL_PERCENTS"
};
var CONTEXT = {
  KEYS: CONTEXT_KEYS,
  VALUES: CONTEXT_VALUES,
  ERROR_MSG: null,
  SOURCE: null,
  AUTO_QUERY: null,
  AUTO_ZOOM: false,
  STATS_POST_RENDER_COMPLETED: false,
  STATS_PRE_RENDER_COMPLETED: false,
  HOME_PAGE_STATE: null,
  SCROLL_PERCENTS: SCROLL_PERCENTS,
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
      case CONTEXT_KEYS.ERROR_MSG:
        return null;
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
      default:
        return null;
    }
  }
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-state-manager.js":
/*!*********************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-state-manager.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HOME_PAGE_FNS: () => (/* binding */ HOME_PAGE_FNS),
/* harmony export */   HOME_PAGE_STATES: () => (/* reexport safe */ _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES),
/* harmony export */   PageStateManager: () => (/* binding */ PageStateManager),
/* harmony export */   validateState: () => (/* binding */ validateState)
/* harmony export */ });
/* harmony import */ var _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../cache-manager.js */ "./static/assets/js/cache-manager.js");
/* harmony import */ var _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./doc-element-references.js */ "./static/assets/js/pages/page-utilities/doc-element-references.js");
/* harmony import */ var _page_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./page-utils.js */ "./static/assets/js/pages/page-utilities/page-utils.js");
/* harmony import */ var _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./page-state-references.js */ "./static/assets/js/pages/page-utilities/page-state-references.js");
/* harmony import */ var _e7_user_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../e7/user-manager.js */ "./static/assets/js/e7/user-manager.js");
/* harmony import */ var _e7_references_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../e7/references.js */ "./static/assets/js/e7/references.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }






var VALIDATION_SET = new Set(Object.values(_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES));
function validateState(state) {
  if (!VALIDATION_SET.has(state)) {
    console.error("Invalid page state: ".concat(state));
    return false;
  }
  return true;
}
function getContentBody(state) {
  switch (state) {
    case _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA:
      return _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SELECT_DATA_BODY;
    case _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SHOW_STATS:
      return _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.SHOW_STATS_BODY;
    case _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.LOAD_DATA:
      return _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.LOAD_DATA_BODY;
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].get(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
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
            _t3 = _page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES.SELECT_DATA;
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cache(_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE, state);
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
            return _cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"]["delete"](_cache_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].Keys.HOME_PAGE_STATE);
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
  for (var _i = 0, _Object$values = Object.values(_page_state_references_js__WEBPACK_IMPORTED_MODULE_3__.HOME_PAGE_STATES); _i < _Object$values.length; _i++) {
    var otherState = _Object$values[_i];
    if (state === otherState) continue;
    var otherStateBody = getContentBody(otherState);
    console.log("Hiding ".concat(otherStateBody.id));
    _page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(otherStateBody, false);
  }
  var contentBody = getContentBody(state);
  console.log("Showing ".concat(contentBody.id));
  _page_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].setVisibility(contentBody, true);
}
function homePageDrawUserInfo(user) {
  if (user) {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = user.name;
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = user.id;
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = _e7_references_js__WEBPACK_IMPORTED_MODULE_5__.WORLD_CODE_TO_CLEAN_STR[user.world_code];
  } else {
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_NAME.innerText = "(None)";
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_ID.innerText = "(None)";
    _doc_element_references_js__WEBPACK_IMPORTED_MODULE_1__["default"].HOME_PAGE.USER_SERVER.innerText = "(None)";
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
          return _e7_user_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].clearUserData();
        case 1:
          // clear any existing data
          homePageDrawUserInfo(user);
          if (!user) {
            _context4.n = 2;
            break;
          }
          _context4.n = 2;
          return _e7_user_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].setUser(user);
        case 2:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return _homePageSetUser.apply(this, arguments);
}
var HOME_PAGE_FNS = {
  homePageSetView: homePageSetView,
  homePageSetUser: homePageSetUser,
  homePageDrawUserInfo: homePageDrawUserInfo
};


/***/ }),

/***/ "./static/assets/js/pages/page-utilities/page-state-references.js":
/*!************************************************************************!*\
  !*** ./static/assets/js/pages/page-utilities/page-state-references.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
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
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../e7/battle-manager.js */ "./static/assets/js/e7/battle-manager.js");
/* harmony import */ var _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../apis/py-API.js */ "./static/assets/js/apis/py-API.js");
/* harmony import */ var _e7_hero_manager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../e7/hero-manager.js */ "./static/assets/js/e7/hero-manager.js");
/* harmony import */ var _e7_filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../e7/filter-parsing/filter-syntax-parser.js */ "./static/assets/js/e7/filter-parsing/filter-syntax-parser.js");
/* harmony import */ var _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../e7/artifact-manager.js */ "./static/assets/js/e7/artifact-manager.js");
/* harmony import */ var _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./home-page-context.js */ "./static/assets/js/pages/page-utilities/home-page-context.js");
/* harmony import */ var _page_state_manager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./page-state-manager.js */ "./static/assets/js/pages/page-utilities/page-state-manager.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }







var PageUtils = {
  queryAndCacheBattles: function () {
    var _queryAndCacheBattles = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(user, stateDispatcher, HM) {
      var artifacts, response, error, errorMSG, data, rawBattles;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return _e7_artifact_manager_js__WEBPACK_IMPORTED_MODULE_4__["default"].getArtifacts();
          case 1:
            artifacts = _context.v;
            _context.n = 2;
            return _apis_py_API_js__WEBPACK_IMPORTED_MODULE_1__["default"].rsFetchBattleData(user);
          case 2:
            response = _context.v;
            if (response.ok) {
              _context.n = 4;
              break;
            }
            _context.n = 3;
            return response.json().error;
          case 3:
            error = _context.v;
            errorMSG = "Error while fetching data: ".concat(error);
            console.error("Error while fetching data: ".concat(error));
            _home_page_context_js__WEBPACK_IMPORTED_MODULE_5__.CONTEXT.ERROR_MSG = errorMSG;
            stateDispatcher(_page_state_manager_js__WEBPACK_IMPORTED_MODULE_6__.HOME_PAGE_STATES.SELECT_DATA);
            _context.n = 7;
            break;
          case 4:
            _context.n = 5;
            return response.json();
          case 5:
            data = _context.v;
            rawBattles = data.battles;
            _context.n = 6;
            return _e7_battle_manager_js__WEBPACK_IMPORTED_MODULE_0__["default"].cacheQuery(rawBattles, HM, artifacts);
          case 6:
            console.log("Cached queried battles");
          case 7:
            return _context.a(2);
        }
      }, _callee);
    }));
    function queryAndCacheBattles(_x, _x2, _x3) {
      return _queryAndCacheBattles.apply(this, arguments);
    }
    return queryAndCacheBattles;
  }(),
  addStrParam: function addStrParam(URL, key, val) {
    var encodedParam = encodeURIComponent(val);
    URL = "".concat(URL, "?").concat(key, "=").concat(encodedParam);
    return URL;
  },
  addStrParams: function addStrParams(URL, obj) {
    for (var key in obj) {
      URL = this.addStrParam(URL, key, obj[key]);
    }
    return URL;
  },
  validateFilterSyntax: function () {
    var _validateFilterSyntax = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(str) {
      var HM, filterMSG, _t;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return _e7_hero_manager_js__WEBPACK_IMPORTED_MODULE_2__["default"].getHeroManager();
          case 1:
            HM = _context2.v;
            filterMSG = document.getElementById("filterMSG");
            _context2.p = 2;
            _context2.n = 3;
            return _e7_filter_parsing_filter_syntax_parser_js__WEBPACK_IMPORTED_MODULE_3__["default"].createAndParse(str, HM);
          case 3:
            filterMSG.textContent = "Validation Passed";
            filterMSG.classList.remove("text-danger");
            filterMSG.classList.add("text-safe");
            return _context2.a(2, true);
          case 4:
            _context2.p = 4;
            _t = _context2.v;
            console.error(_t);
            filterMSG.textContent = "Validation Failed: ".concat(_t.message);
            filterMSG.classList.remove("text-safe");
            filterMSG.classList.add("text-danger");
            return _context2.a(2, false);
        }
      }, _callee2, null, [[2, 4]]);
    }));
    function validateFilterSyntax(_x4) {
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
  setTextGreen: function setTextGreen(element, text) {
    element.textContent = text;
    element.classList.remove("text-danger");
    element.classList.add("text-safe");
  },
  setTextRed: function setTextRed(element, text) {
    element.textContent = text;
    element.classList.remove("text-safe");
    element.classList.add("text-danger");
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

/***/ "./static/assets/js/populate_content.js":
/*!**********************************************!*\
  !*** ./static/assets/js/populate_content.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CardContent: () => (/* binding */ CardContent),
/* harmony export */   Tables: () => (/* binding */ Tables)
/* harmony export */ });
/* harmony import */ var _e7_references__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./e7/references */ "./static/assets/js/e7/references.js");
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
function getDataWithStringifiedArrayColumns(dataArr) {
  dataArr = structuredClone(dataArr);
  var _iterator = _createForOfIteratorHelper(dataArr),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var row = _step.value;
      var _iterator2 = _createForOfIteratorHelper(_e7_references__WEBPACK_IMPORTED_MODULE_0__.ARRAY_COLUMNS),
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
var Tables = {};
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
Tables.functions = {
  populateHeroStatsTable: function populateHeroStatsTable(tableid, data) {
    destroyDataTable(tableid);
    var tbody = document.getElementById("".concat(tableid, "Body"));
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item.hero, "</td>\n            <td>").concat(item.games_won, "</td>\n            <td>").concat(item.games_appeared, "</td>\n            <td>").concat(item.appearance_rate, "</td>\n            <td>").concat(item.win_rate, "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
    var person = tableid.includes("Player") ? "Player" : "Enemy";
    var tableSelector = $("#".concat(tableid));
    var table = tableSelector.DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[3, "desc"]],
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
      scrollCollapse: false
    });
  },
  populateSeasonDetailsTable: function populateSeasonDetailsTable(tableid, data) {
    var tbody = document.getElementById("".concat(tableid, "Body"));
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["Season Number"], "</td>\n            <td>").concat(item["Season"], "</td>\n            <td>").concat(item["Start"], "</td>\n            <td>").concat(item["End"], "</td>\n            <td>").concat(item["Status"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populateServerStatsTable: function populateServerStatsTable(tableid, data) {
    var tbody = document.getElementById("".concat(tableid, "-body"));
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["server"], "</td>\n            <td>").concat(item["count"], "</td>\n            <td>").concat(item["frequency"], "</td>\n            <td>").concat(item["wins"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["fp_wr"]), "\">").concat(item["fp_wr"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["sp_wr"]), "\">").concat(item["sp_wr"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerPrebansTable: function populatePlayerPrebansTable(tableid, data) {
    var tbody = document.getElementById("".concat(tableid, "Body"));
    tbody.innerHTML = ""; // Clear existing rows

    data.forEach(function (item) {
      var row = document.createElement("tr");

      // Populate each <td> in order
      row.innerHTML = "\n            <td>".concat(item["preban"], "</td>\n            <td>").concat(item["appearances"], "</td>\n            <td>").concat(item["appearance_rate"], "</td>\n            <td class=\"").concat(convertPercentToColorClass(item["win_rate"]), "\">").concat(item["win_rate"], "</td>\n            <td>").concat(item["+/-"], "</td>\n            ");
      tbody.appendChild(row);
    });
  },
  populatePlayerFirstPickTable: function populatePlayerFirstPickTable(tableid, data) {
    var tbody = document.getElementById("".concat(tableid, "Body"));
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
    var tbody = document.getElementById("".concat(tableid, "Body"));
    tbody.innerHTML = ""; // Clear existing rows

    var name;
    if (user) {
      name = user.name;
    } else {
      name = data.length === 0 ? "Empty" : "UID(".concat(data[0]["P1 ID"], ")");
    }
    var fname = "".concat(name, " Battle Data");
    var table = $("#BattlesTable").DataTable({
      layout: {
        topStart: "buttons"
      },
      language: {
        info: "Total rows: _TOTAL_"
      },
      order: [[0, "desc"]],
      // Sort by Date/Time desc by default
      columnDefs: [{
        targets: "_all",
        className: "nowrap"
      }],
      rowCallback: function rowCallback(row, data, dataIndex) {
        var winCell = row.cells[13];
        var firstPickCell = row.cells[14];
        if (data["Win"] === true) {
          winCell.style.color = "mediumspringgreen";
        } else if (data["Win"] === false) {
          winCell.style.color = "red";
        }
        if (data["First Pick"] === true) {
          firstPickCell.style.color = "deepskyblue";
        }
      },
      buttons: {
        name: "primary",
        buttons: ["copy", {
          extend: "csv",
          text: "CSV",
          filename: fname
        }, {
          extend: "excel",
          text: "Excel",
          filename: fname
        }]
      },
      pageLength: 50,
      scrollY: "300px",
      deferRender: true,
      scroller: true,
      scrollCollapse: false,
      columns: _e7_references__WEBPACK_IMPORTED_MODULE_0__.COLUMNS_EXPANDED.map(function (col) {
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
    this.replaceDatatableData("BattlesTable", data);
  }
};
var CardContent = {};
CardContent.functions = {
  populateGeneralStats: function populateGeneralStats(general_stats) {
    document.getElementById("total-battles").textContent = general_stats.total_battles;
    document.getElementById("first-pick-count").textContent = general_stats.first_pick_count;
    document.getElementById("first-pick-rate").textContent = " (".concat(general_stats.first_pick_rate, ")");
    document.getElementById("second-pick-count").textContent = general_stats.second_pick_count;
    document.getElementById("second-pick-rate").textContent = " (".concat(general_stats.second_pick_rate, ")");
    document.getElementById("total-winrate").textContent = general_stats.total_winrate;
    document.getElementById("first-pick-winrate").textContent = general_stats.first_pick_winrate;
    document.getElementById("second-pick-winrate").textContent = general_stats.second_pick_winrate;
    document.getElementById("total-wins").textContent = general_stats.total_wins;
    document.getElementById("max-win-streak").textContent = general_stats.max_win_streak;
    document.getElementById("max-loss-streak").textContent = general_stats.max_loss_streak;
    document.getElementById("avg-ppg").textContent = general_stats.avg_ppg;
  },
  populateRankPlot: function populateRankPlot(rank_plot_html) {
    var container = document.getElementById("rank-plot-container");
    container.innerHTML = rank_plot_html;

    // Extract and re-execute any <script> in the injected HTML
    var scripts = container.querySelectorAll("script");
    scripts.forEach(function (script) {
      var newScript = document.createElement("script");
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      document.body.appendChild(newScript); // or container.appendChild if it's inline
    });
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
    }, 10);
  }
};


/***/ }),

/***/ "./static/assets/js/utils.js":
/*!***********************************!*\
  !*** ./static/assets/js/utils.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   toTitleCase: () => (/* binding */ toTitleCase)
/* harmony export */ });
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!*************************************************!*\
  !*** ./static/assets/js/pages/filter-syntax.js ***!
  \*************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _exports_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../exports.js */ "./static/assets/js/exports.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

CodeMirror.defineMode("filterSyntax", function () {
  return {
    token: function token(stream, state) {
      return _exports_js__WEBPACK_IMPORTED_MODULE_0__.RegExps.tokenMatch(stream);
    }
  };
});
function makeExFilter(textAreaID, str) {
  var textArea = document.getElementById(textAreaID);
  textArea.value = str.replace(/^\n/, "");
  CodeMirror.fromTextArea(textArea, {
    mode: "filterSyntax",
    lineNumbers: true,
    theme: "default",
    readOnly: true
  });
  textArea.classList.remove("codemirror-hidden");
}
var ex1Str = "\ndate in current-season;\nis-first-pick = true;\np1.pick1 in {lone wolf peira, new moon luna};\nOR(\"harsetti\" in p1.prebans, \"harsetti\" in p2.prebans);";
makeExFilter("exFilter1", ex1Str);
var ex2Str = "\nlast-n(500);\ndate in 2025-04-01...2025-07-01;\nis-first-pick = false;\nOR(\n\tAND(\n\t\tp2.league in {warlord, emperor, legend},\n    \tp2.pick3 = \"zio\"\n    ),\n    victory-points >= 3000\n)";
makeExFilter("exFilter2", ex2Str);
var ex3Str = "\n\"Rinak\" in prebans;\n\"Boss Arunka\" in prebans;\n\"Harsetti\" in p1.picks;\nNOT(\"Harsetti\" = p2.postban);\nvictory-points in 2500...=3000;";
makeExFilter("exFilter3", ex3Str);
var ex4Str = "\ndate in season-16.5;\nis-win = true;";
makeExFilter("exFilter4", ex4Str);
var textarea = document.getElementById("codeArea");
var editor = CodeMirror.fromTextArea(textarea, {
  mode: "filterSyntax",
  lineNumbers: true,
  theme: "default"
});

// Intercept form submission
var filterForm = document.getElementById("filterForm");
filterForm.addEventListener("submit", /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
    var clickedButton, action, syntaxStr;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          event.preventDefault(); // Prevent actual form submission to server

          // Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
          document.getElementById("codeArea").value = editor.getValue();
          console.log("Processing Filter Action");
          clickedButton = event.submitter;
          action = clickedButton === null || clickedButton === void 0 ? void 0 : clickedButton.value;
          syntaxStr = editor.getValue();
          if (!(action === "check")) {
            _context.n = 1;
            break;
          }
          console.log("Checking Str", syntaxStr);
          _context.n = 1;
          return _exports_js__WEBPACK_IMPORTED_MODULE_0__.PageUtils.validateFilterSyntax(syntaxStr);
        case 1:
          return _context.a(2);
      }
    }, _callee);
  }));
  return function (_x) {
    return _ref.apply(this, arguments);
  };
}());

// sync changes back to textarea if needed
editor.on("change", function () {
  editor.save(); // Updates the hidden textarea for form submit
});

// Show the editor after it's initialized
textarea.classList.remove("codemirror-hidden");
})();

/******/ })()
;
//# sourceMappingURL=filter-syntax.bundle.js.map