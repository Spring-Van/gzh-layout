var En = Object.defineProperty;
var kn = (t, e, n) => e in t ? En(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var $e = (t, e, n) => kn(t, typeof e != "symbol" ? e + "" : e, n);
import { dialog as Tn, ipcMain as p, app as he, BrowserWindow as Ft } from "electron";
import { fileURLToPath as _n } from "node:url";
import Z from "node:path";
import fe from "fs";
import Fn from "constants";
import Pn from "stream";
import Pt from "util";
import It from "assert";
import v from "path";
import Be from "crypto";
import { Buffer as Re } from "node:buffer";
var Je = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function In(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var ne = {}, U = {};
U.fromCallback = function(t) {
  return Object.defineProperty(function(...e) {
    if (typeof e[e.length - 1] == "function") t.apply(this, e);
    else
      return new Promise((n, r) => {
        e.push((i, o) => i != null ? r(i) : n(o)), t.apply(this, e);
      });
  }, "name", { value: t.name });
};
U.fromPromise = function(t) {
  return Object.defineProperty(function(...e) {
    const n = e[e.length - 1];
    if (typeof n != "function") return t.apply(this, e);
    e.pop(), t.apply(this, e).then((r) => n(null, r), n);
  }, "name", { value: t.name });
};
var G = Fn, An = process.cwd, Fe = null, Dn = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  return Fe || (Fe = An.call(process)), Fe;
};
try {
  process.cwd();
} catch {
}
if (typeof process.chdir == "function") {
  var it = process.chdir;
  process.chdir = function(t) {
    Fe = null, it.call(process, t);
  }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, it);
}
var Cn = On;
function On(t) {
  G.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && e(t), t.lutimes || n(t), t.chown = o(t.chown), t.fchown = o(t.fchown), t.lchown = o(t.lchown), t.chmod = r(t.chmod), t.fchmod = r(t.fchmod), t.lchmod = r(t.lchmod), t.chownSync = c(t.chownSync), t.fchownSync = c(t.fchownSync), t.lchownSync = c(t.lchownSync), t.chmodSync = i(t.chmodSync), t.fchmodSync = i(t.fchmodSync), t.lchmodSync = i(t.lchmodSync), t.stat = s(t.stat), t.fstat = s(t.fstat), t.lstat = s(t.lstat), t.statSync = u(t.statSync), t.fstatSync = u(t.fstatSync), t.lstatSync = u(t.lstatSync), t.chmod && !t.lchmod && (t.lchmod = function(a, l, d) {
    d && process.nextTick(d);
  }, t.lchmodSync = function() {
  }), t.chown && !t.lchown && (t.lchown = function(a, l, d, m) {
    m && process.nextTick(m);
  }, t.lchownSync = function() {
  }), Dn === "win32" && (t.rename = typeof t.rename != "function" ? t.rename : function(a) {
    function l(d, m, h) {
      var $ = Date.now(), S = 0;
      a(d, m, function k(A) {
        if (A && (A.code === "EACCES" || A.code === "EPERM" || A.code === "EBUSY") && Date.now() - $ < 6e4) {
          setTimeout(function() {
            t.stat(m, function(W, le) {
              W && W.code === "ENOENT" ? a(d, m, k) : h(A);
            });
          }, S), S < 100 && (S += 10);
          return;
        }
        h && h(A);
      });
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(l, a), l;
  }(t.rename)), t.read = typeof t.read != "function" ? t.read : function(a) {
    function l(d, m, h, $, S, k) {
      var A;
      if (k && typeof k == "function") {
        var W = 0;
        A = function(le, nt, rt) {
          if (le && le.code === "EAGAIN" && W < 10)
            return W++, a.call(t, d, m, h, $, S, A);
          k.apply(this, arguments);
        };
      }
      return a.call(t, d, m, h, $, S, A);
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(l, a), l;
  }(t.read), t.readSync = typeof t.readSync != "function" ? t.readSync : /* @__PURE__ */ function(a) {
    return function(l, d, m, h, $) {
      for (var S = 0; ; )
        try {
          return a.call(t, l, d, m, h, $);
        } catch (k) {
          if (k.code === "EAGAIN" && S < 10) {
            S++;
            continue;
          }
          throw k;
        }
    };
  }(t.readSync);
  function e(a) {
    a.lchmod = function(l, d, m) {
      a.open(
        l,
        G.O_WRONLY | G.O_SYMLINK,
        d,
        function(h, $) {
          if (h) {
            m && m(h);
            return;
          }
          a.fchmod($, d, function(S) {
            a.close($, function(k) {
              m && m(S || k);
            });
          });
        }
      );
    }, a.lchmodSync = function(l, d) {
      var m = a.openSync(l, G.O_WRONLY | G.O_SYMLINK, d), h = !0, $;
      try {
        $ = a.fchmodSync(m, d), h = !1;
      } finally {
        if (h)
          try {
            a.closeSync(m);
          } catch {
          }
        else
          a.closeSync(m);
      }
      return $;
    };
  }
  function n(a) {
    G.hasOwnProperty("O_SYMLINK") && a.futimes ? (a.lutimes = function(l, d, m, h) {
      a.open(l, G.O_SYMLINK, function($, S) {
        if ($) {
          h && h($);
          return;
        }
        a.futimes(S, d, m, function(k) {
          a.close(S, function(A) {
            h && h(k || A);
          });
        });
      });
    }, a.lutimesSync = function(l, d, m) {
      var h = a.openSync(l, G.O_SYMLINK), $, S = !0;
      try {
        $ = a.futimesSync(h, d, m), S = !1;
      } finally {
        if (S)
          try {
            a.closeSync(h);
          } catch {
          }
        else
          a.closeSync(h);
      }
      return $;
    }) : a.futimes && (a.lutimes = function(l, d, m, h) {
      h && process.nextTick(h);
    }, a.lutimesSync = function() {
    });
  }
  function r(a) {
    return a && function(l, d, m) {
      return a.call(t, l, d, function(h) {
        f(h) && (h = null), m && m.apply(this, arguments);
      });
    };
  }
  function i(a) {
    return a && function(l, d) {
      try {
        return a.call(t, l, d);
      } catch (m) {
        if (!f(m)) throw m;
      }
    };
  }
  function o(a) {
    return a && function(l, d, m, h) {
      return a.call(t, l, d, m, function($) {
        f($) && ($ = null), h && h.apply(this, arguments);
      });
    };
  }
  function c(a) {
    return a && function(l, d, m) {
      try {
        return a.call(t, l, d, m);
      } catch (h) {
        if (!f(h)) throw h;
      }
    };
  }
  function s(a) {
    return a && function(l, d, m) {
      typeof d == "function" && (m = d, d = null);
      function h($, S) {
        S && (S.uid < 0 && (S.uid += 4294967296), S.gid < 0 && (S.gid += 4294967296)), m && m.apply(this, arguments);
      }
      return d ? a.call(t, l, d, h) : a.call(t, l, h);
    };
  }
  function u(a) {
    return a && function(l, d) {
      var m = d ? a.call(t, l, d) : a.call(t, l);
      return m && (m.uid < 0 && (m.uid += 4294967296), m.gid < 0 && (m.gid += 4294967296)), m;
    };
  }
  function f(a) {
    if (!a || a.code === "ENOSYS")
      return !0;
    var l = !process.getuid || process.getuid() !== 0;
    return !!(l && (a.code === "EINVAL" || a.code === "EPERM"));
  }
}
var ot = Pn.Stream, jn = Nn;
function Nn(t) {
  return {
    ReadStream: e,
    WriteStream: n
  };
  function e(r, i) {
    if (!(this instanceof e)) return new e(r, i);
    ot.call(this);
    var o = this;
    this.path = r, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, i = i || {};
    for (var c = Object.keys(i), s = 0, u = c.length; s < u; s++) {
      var f = c[s];
      this[f] = i[f];
    }
    if (this.encoding && this.setEncoding(this.encoding), this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.end === void 0)
        this.end = 1 / 0;
      else if (typeof this.end != "number")
        throw TypeError("end must be a Number");
      if (this.start > this.end)
        throw new Error("start must be <= end");
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick(function() {
        o._read();
      });
      return;
    }
    t.open(this.path, this.flags, this.mode, function(a, l) {
      if (a) {
        o.emit("error", a), o.readable = !1;
        return;
      }
      o.fd = l, o.emit("open", l), o._read();
    });
  }
  function n(r, i) {
    if (!(this instanceof n)) return new n(r, i);
    ot.call(this), this.path = r, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, i = i || {};
    for (var o = Object.keys(i), c = 0, s = o.length; c < s; c++) {
      var u = o[c];
      this[u] = i[u];
    }
    if (this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.start < 0)
        throw new Error("start must be >= zero");
      this.pos = this.start;
    }
    this.busy = !1, this._queue = [], this.fd === null && (this._open = t.open, this._queue.push([this._open, this.path, this.flags, this.mode, void 0]), this.flush());
  }
}
var xn = Rn, bn = Object.getPrototypeOf || function(t) {
  return t.__proto__;
};
function Rn(t) {
  if (t === null || typeof t != "object")
    return t;
  if (t instanceof Object)
    var e = { __proto__: bn(t) };
  else
    var e = /* @__PURE__ */ Object.create(null);
  return Object.getOwnPropertyNames(t).forEach(function(n) {
    Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(t, n));
  }), e;
}
var P = fe, Ln = Cn, Wn = jn, Mn = xn, Ee = Pt, R, Ae;
typeof Symbol == "function" && typeof Symbol.for == "function" ? (R = Symbol.for("graceful-fs.queue"), Ae = Symbol.for("graceful-fs.previous")) : (R = "___graceful-fs.queue", Ae = "___graceful-fs.previous");
function Un() {
}
function At(t, e) {
  Object.defineProperty(t, R, {
    get: function() {
      return e;
    }
  });
}
var te = Un;
Ee.debuglog ? te = Ee.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (te = function() {
  var t = Ee.format.apply(Ee, arguments);
  t = "GFS4: " + t.split(/\n/).join(`
GFS4: `), console.error(t);
});
if (!P[R]) {
  var Bn = Je[R] || [];
  At(P, Bn), P.close = function(t) {
    function e(n, r) {
      return t.call(P, n, function(i) {
        i || ct(), typeof r == "function" && r.apply(this, arguments);
      });
    }
    return Object.defineProperty(e, Ae, {
      value: t
    }), e;
  }(P.close), P.closeSync = function(t) {
    function e(n) {
      t.apply(P, arguments), ct();
    }
    return Object.defineProperty(e, Ae, {
      value: t
    }), e;
  }(P.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
    te(P[R]), It.equal(P[R].length, 0);
  });
}
Je[R] || At(Je, P[R]);
var B = Ge(Mn(P));
process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !P.__patched && (B = Ge(P), P.__patched = !0);
function Ge(t) {
  Ln(t), t.gracefulify = Ge, t.createReadStream = nt, t.createWriteStream = rt;
  var e = t.readFile;
  t.readFile = n;
  function n(y, g, w) {
    return typeof g == "function" && (w = g, g = null), N(y, g, w);
    function N(x, C, F, I) {
      return e(x, C, function(T) {
        T && (T.code === "EMFILE" || T.code === "ENFILE") ? ie([N, [x, C, F], T, I || Date.now(), Date.now()]) : typeof F == "function" && F.apply(this, arguments);
      });
    }
  }
  var r = t.writeFile;
  t.writeFile = i;
  function i(y, g, w, N) {
    return typeof w == "function" && (N = w, w = null), x(y, g, w, N);
    function x(C, F, I, T, b) {
      return r(C, F, I, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? ie([x, [C, F, I, T], _, b || Date.now(), Date.now()]) : typeof T == "function" && T.apply(this, arguments);
      });
    }
  }
  var o = t.appendFile;
  o && (t.appendFile = c);
  function c(y, g, w, N) {
    return typeof w == "function" && (N = w, w = null), x(y, g, w, N);
    function x(C, F, I, T, b) {
      return o(C, F, I, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? ie([x, [C, F, I, T], _, b || Date.now(), Date.now()]) : typeof T == "function" && T.apply(this, arguments);
      });
    }
  }
  var s = t.copyFile;
  s && (t.copyFile = u);
  function u(y, g, w, N) {
    return typeof w == "function" && (N = w, w = 0), x(y, g, w, N);
    function x(C, F, I, T, b) {
      return s(C, F, I, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? ie([x, [C, F, I, T], _, b || Date.now(), Date.now()]) : typeof T == "function" && T.apply(this, arguments);
      });
    }
  }
  var f = t.readdir;
  t.readdir = l;
  var a = /^v[0-5]\./;
  function l(y, g, w) {
    typeof g == "function" && (w = g, g = null);
    var N = a.test(process.version) ? function(F, I, T, b) {
      return f(F, x(
        F,
        I,
        T,
        b
      ));
    } : function(F, I, T, b) {
      return f(F, I, x(
        F,
        I,
        T,
        b
      ));
    };
    return N(y, g, w);
    function x(C, F, I, T) {
      return function(b, _) {
        b && (b.code === "EMFILE" || b.code === "ENFILE") ? ie([
          N,
          [C, F, I],
          b,
          T || Date.now(),
          Date.now()
        ]) : (_ && _.sort && _.sort(), typeof I == "function" && I.call(this, b, _));
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var d = Wn(t);
    k = d.ReadStream, W = d.WriteStream;
  }
  var m = t.ReadStream;
  m && (k.prototype = Object.create(m.prototype), k.prototype.open = A);
  var h = t.WriteStream;
  h && (W.prototype = Object.create(h.prototype), W.prototype.open = le), Object.defineProperty(t, "ReadStream", {
    get: function() {
      return k;
    },
    set: function(y) {
      k = y;
    },
    enumerable: !0,
    configurable: !0
  }), Object.defineProperty(t, "WriteStream", {
    get: function() {
      return W;
    },
    set: function(y) {
      W = y;
    },
    enumerable: !0,
    configurable: !0
  });
  var $ = k;
  Object.defineProperty(t, "FileReadStream", {
    get: function() {
      return $;
    },
    set: function(y) {
      $ = y;
    },
    enumerable: !0,
    configurable: !0
  });
  var S = W;
  Object.defineProperty(t, "FileWriteStream", {
    get: function() {
      return S;
    },
    set: function(y) {
      S = y;
    },
    enumerable: !0,
    configurable: !0
  });
  function k(y, g) {
    return this instanceof k ? (m.apply(this, arguments), this) : k.apply(Object.create(k.prototype), arguments);
  }
  function A() {
    var y = this;
    be(y.path, y.flags, y.mode, function(g, w) {
      g ? (y.autoClose && y.destroy(), y.emit("error", g)) : (y.fd = w, y.emit("open", w), y.read());
    });
  }
  function W(y, g) {
    return this instanceof W ? (h.apply(this, arguments), this) : W.apply(Object.create(W.prototype), arguments);
  }
  function le() {
    var y = this;
    be(y.path, y.flags, y.mode, function(g, w) {
      g ? (y.destroy(), y.emit("error", g)) : (y.fd = w, y.emit("open", w));
    });
  }
  function nt(y, g) {
    return new t.ReadStream(y, g);
  }
  function rt(y, g) {
    return new t.WriteStream(y, g);
  }
  var $n = t.open;
  t.open = be;
  function be(y, g, w, N) {
    return typeof w == "function" && (N = w, w = null), x(y, g, w, N);
    function x(C, F, I, T, b) {
      return $n(C, F, I, function(_, Eo) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? ie([x, [C, F, I, T], _, b || Date.now(), Date.now()]) : typeof T == "function" && T.apply(this, arguments);
      });
    }
  }
  return t;
}
function ie(t) {
  te("ENQUEUE", t[0].name, t[1]), P[R].push(t), He();
}
var ke;
function ct() {
  for (var t = Date.now(), e = 0; e < P[R].length; ++e)
    P[R][e].length > 2 && (P[R][e][3] = t, P[R][e][4] = t);
  He();
}
function He() {
  if (clearTimeout(ke), ke = void 0, P[R].length !== 0) {
    var t = P[R].shift(), e = t[0], n = t[1], r = t[2], i = t[3], o = t[4];
    if (i === void 0)
      te("RETRY", e.name, n), e.apply(null, n);
    else if (Date.now() - i >= 6e4) {
      te("TIMEOUT", e.name, n);
      var c = n.pop();
      typeof c == "function" && c.call(null, r);
    } else {
      var s = Date.now() - o, u = Math.max(o - i, 1), f = Math.min(u * 1.2, 100);
      s >= f ? (te("RETRY", e.name, n), e.apply(null, n.concat([i]))) : P[R].push(t);
    }
    ke === void 0 && (ke = setTimeout(He, 0));
  }
}
(function(t) {
  const e = U.fromCallback, n = B, r = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "lchmod",
    "lchown",
    "link",
    "lstat",
    "mkdir",
    "mkdtemp",
    "open",
    "opendir",
    "readdir",
    "readFile",
    "readlink",
    "realpath",
    "rename",
    "rm",
    "rmdir",
    "stat",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
  ].filter((i) => typeof n[i] == "function");
  Object.assign(t, n), r.forEach((i) => {
    t[i] = e(n[i]);
  }), t.exists = function(i, o) {
    return typeof o == "function" ? n.exists(i, o) : new Promise((c) => n.exists(i, c));
  }, t.read = function(i, o, c, s, u, f) {
    return typeof f == "function" ? n.read(i, o, c, s, u, f) : new Promise((a, l) => {
      n.read(i, o, c, s, u, (d, m, h) => {
        if (d) return l(d);
        a({ bytesRead: m, buffer: h });
      });
    });
  }, t.write = function(i, o, ...c) {
    return typeof c[c.length - 1] == "function" ? n.write(i, o, ...c) : new Promise((s, u) => {
      n.write(i, o, ...c, (f, a, l) => {
        if (f) return u(f);
        s({ bytesWritten: a, buffer: l });
      });
    });
  }, typeof n.writev == "function" && (t.writev = function(i, o, ...c) {
    return typeof c[c.length - 1] == "function" ? n.writev(i, o, ...c) : new Promise((s, u) => {
      n.writev(i, o, ...c, (f, a, l) => {
        if (f) return u(f);
        s({ bytesWritten: a, buffers: l });
      });
    });
  }), typeof n.realpath.native == "function" ? t.realpath.native = e(n.realpath.native) : process.emitWarning(
    "fs.realpath.native is not a function. Is fs being monkey-patched?",
    "Warning",
    "fs-extra-WARN0003"
  );
})(ne);
var Ke = {}, Dt = {};
const Jn = v;
Dt.checkPath = function(e) {
  if (process.platform === "win32" && /[<>:"|?*]/.test(e.replace(Jn.parse(e).root, ""))) {
    const r = new Error(`Path contains invalid characters: ${e}`);
    throw r.code = "EINVAL", r;
  }
};
const Ct = ne, { checkPath: Ot } = Dt, jt = (t) => {
  const e = { mode: 511 };
  return typeof t == "number" ? t : { ...e, ...t }.mode;
};
Ke.makeDir = async (t, e) => (Ot(t), Ct.mkdir(t, {
  mode: jt(e),
  recursive: !0
}));
Ke.makeDirSync = (t, e) => (Ot(t), Ct.mkdirSync(t, {
  mode: jt(e),
  recursive: !0
}));
const qn = U.fromPromise, { makeDir: Yn, makeDirSync: Le } = Ke, We = qn(Yn);
var Y = {
  mkdirs: We,
  mkdirsSync: Le,
  // alias
  mkdirp: We,
  mkdirpSync: Le,
  ensureDir: We,
  ensureDirSync: Le
};
const Vn = U.fromPromise, Nt = ne;
function Gn(t) {
  return Nt.access(t).then(() => !0).catch(() => !1);
}
var re = {
  pathExists: Vn(Gn),
  pathExistsSync: Nt.existsSync
};
const ce = B;
function Hn(t, e, n, r) {
  ce.open(t, "r+", (i, o) => {
    if (i) return r(i);
    ce.futimes(o, e, n, (c) => {
      ce.close(o, (s) => {
        r && r(c || s);
      });
    });
  });
}
function Kn(t, e, n) {
  const r = ce.openSync(t, "r+");
  return ce.futimesSync(r, e, n), ce.closeSync(r);
}
var xt = {
  utimesMillis: Hn,
  utimesMillisSync: Kn
};
const ae = ne, j = v, Xn = Pt;
function zn(t, e, n) {
  const r = n.dereference ? (i) => ae.stat(i, { bigint: !0 }) : (i) => ae.lstat(i, { bigint: !0 });
  return Promise.all([
    r(t),
    r(e).catch((i) => {
      if (i.code === "ENOENT") return null;
      throw i;
    })
  ]).then(([i, o]) => ({ srcStat: i, destStat: o }));
}
function Qn(t, e, n) {
  let r;
  const i = n.dereference ? (c) => ae.statSync(c, { bigint: !0 }) : (c) => ae.lstatSync(c, { bigint: !0 }), o = i(t);
  try {
    r = i(e);
  } catch (c) {
    if (c.code === "ENOENT") return { srcStat: o, destStat: null };
    throw c;
  }
  return { srcStat: o, destStat: r };
}
function Zn(t, e, n, r, i) {
  Xn.callbackify(zn)(t, e, r, (o, c) => {
    if (o) return i(o);
    const { srcStat: s, destStat: u } = c;
    if (u) {
      if (ve(s, u)) {
        const f = j.basename(t), a = j.basename(e);
        return n === "move" && f !== a && f.toLowerCase() === a.toLowerCase() ? i(null, { srcStat: s, destStat: u, isChangingCase: !0 }) : i(new Error("Source and destination must not be the same."));
      }
      if (s.isDirectory() && !u.isDirectory())
        return i(new Error(`Cannot overwrite non-directory '${e}' with directory '${t}'.`));
      if (!s.isDirectory() && u.isDirectory())
        return i(new Error(`Cannot overwrite directory '${e}' with non-directory '${t}'.`));
    }
    return s.isDirectory() && Xe(t, e) ? i(new Error(Oe(t, e, n))) : i(null, { srcStat: s, destStat: u });
  });
}
function er(t, e, n, r) {
  const { srcStat: i, destStat: o } = Qn(t, e, r);
  if (o) {
    if (ve(i, o)) {
      const c = j.basename(t), s = j.basename(e);
      if (n === "move" && c !== s && c.toLowerCase() === s.toLowerCase())
        return { srcStat: i, destStat: o, isChangingCase: !0 };
      throw new Error("Source and destination must not be the same.");
    }
    if (i.isDirectory() && !o.isDirectory())
      throw new Error(`Cannot overwrite non-directory '${e}' with directory '${t}'.`);
    if (!i.isDirectory() && o.isDirectory())
      throw new Error(`Cannot overwrite directory '${e}' with non-directory '${t}'.`);
  }
  if (i.isDirectory() && Xe(t, e))
    throw new Error(Oe(t, e, n));
  return { srcStat: i, destStat: o };
}
function bt(t, e, n, r, i) {
  const o = j.resolve(j.dirname(t)), c = j.resolve(j.dirname(n));
  if (c === o || c === j.parse(c).root) return i();
  ae.stat(c, { bigint: !0 }, (s, u) => s ? s.code === "ENOENT" ? i() : i(s) : ve(e, u) ? i(new Error(Oe(t, n, r))) : bt(t, e, c, r, i));
}
function Rt(t, e, n, r) {
  const i = j.resolve(j.dirname(t)), o = j.resolve(j.dirname(n));
  if (o === i || o === j.parse(o).root) return;
  let c;
  try {
    c = ae.statSync(o, { bigint: !0 });
  } catch (s) {
    if (s.code === "ENOENT") return;
    throw s;
  }
  if (ve(e, c))
    throw new Error(Oe(t, n, r));
  return Rt(t, e, o, r);
}
function ve(t, e) {
  return e.ino && e.dev && e.ino === t.ino && e.dev === t.dev;
}
function Xe(t, e) {
  const n = j.resolve(t).split(j.sep).filter((i) => i), r = j.resolve(e).split(j.sep).filter((i) => i);
  return n.reduce((i, o, c) => i && r[c] === o, !0);
}
function Oe(t, e, n) {
  return `Cannot ${n} '${t}' to a subdirectory of itself, '${e}'.`;
}
var ue = {
  checkPaths: Zn,
  checkPathsSync: er,
  checkParentPaths: bt,
  checkParentPathsSync: Rt,
  isSrcSubdir: Xe,
  areIdentical: ve
};
const J = B, ye = v, tr = Y.mkdirs, nr = re.pathExists, rr = xt.utimesMillis, pe = ue;
function ir(t, e, n, r) {
  typeof n == "function" && !r ? (r = n, n = {}) : typeof n == "function" && (n = { filter: n }), r = r || function() {
  }, n = n || {}, n.clobber = "clobber" in n ? !!n.clobber : !0, n.overwrite = "overwrite" in n ? !!n.overwrite : n.clobber, n.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0001"
  ), pe.checkPaths(t, e, "copy", n, (i, o) => {
    if (i) return r(i);
    const { srcStat: c, destStat: s } = o;
    pe.checkParentPaths(t, c, e, "copy", (u) => u ? r(u) : n.filter ? Lt(at, s, t, e, n, r) : at(s, t, e, n, r));
  });
}
function at(t, e, n, r, i) {
  const o = ye.dirname(n);
  nr(o, (c, s) => {
    if (c) return i(c);
    if (s) return De(t, e, n, r, i);
    tr(o, (u) => u ? i(u) : De(t, e, n, r, i));
  });
}
function Lt(t, e, n, r, i, o) {
  Promise.resolve(i.filter(n, r)).then((c) => c ? t(e, n, r, i, o) : o(), (c) => o(c));
}
function or(t, e, n, r, i) {
  return r.filter ? Lt(De, t, e, n, r, i) : De(t, e, n, r, i);
}
function De(t, e, n, r, i) {
  (r.dereference ? J.stat : J.lstat)(e, (c, s) => c ? i(c) : s.isDirectory() ? dr(s, t, e, n, r, i) : s.isFile() || s.isCharacterDevice() || s.isBlockDevice() ? cr(s, t, e, n, r, i) : s.isSymbolicLink() ? yr(t, e, n, r, i) : s.isSocket() ? i(new Error(`Cannot copy a socket file: ${e}`)) : s.isFIFO() ? i(new Error(`Cannot copy a FIFO pipe: ${e}`)) : i(new Error(`Unknown file: ${e}`)));
}
function cr(t, e, n, r, i, o) {
  return e ? ar(t, n, r, i, o) : Wt(t, n, r, i, o);
}
function ar(t, e, n, r, i) {
  if (r.overwrite)
    J.unlink(n, (o) => o ? i(o) : Wt(t, e, n, r, i));
  else return r.errorOnExist ? i(new Error(`'${n}' already exists`)) : i();
}
function Wt(t, e, n, r, i) {
  J.copyFile(e, n, (o) => o ? i(o) : r.preserveTimestamps ? sr(t.mode, e, n, i) : je(n, t.mode, i));
}
function sr(t, e, n, r) {
  return ur(t) ? lr(n, t, (i) => i ? r(i) : st(t, e, n, r)) : st(t, e, n, r);
}
function ur(t) {
  return (t & 128) === 0;
}
function lr(t, e, n) {
  return je(t, e | 128, n);
}
function st(t, e, n, r) {
  fr(e, n, (i) => i ? r(i) : je(n, t, r));
}
function je(t, e, n) {
  return J.chmod(t, e, n);
}
function fr(t, e, n) {
  J.stat(t, (r, i) => r ? n(r) : rr(e, i.atime, i.mtime, n));
}
function dr(t, e, n, r, i, o) {
  return e ? Mt(n, r, i, o) : mr(t.mode, n, r, i, o);
}
function mr(t, e, n, r, i) {
  J.mkdir(n, (o) => {
    if (o) return i(o);
    Mt(e, n, r, (c) => c ? i(c) : je(n, t, i));
  });
}
function Mt(t, e, n, r) {
  J.readdir(t, (i, o) => i ? r(i) : Ut(o, t, e, n, r));
}
function Ut(t, e, n, r, i) {
  const o = t.pop();
  return o ? hr(t, o, e, n, r, i) : i();
}
function hr(t, e, n, r, i, o) {
  const c = ye.join(n, e), s = ye.join(r, e);
  pe.checkPaths(c, s, "copy", i, (u, f) => {
    if (u) return o(u);
    const { destStat: a } = f;
    or(a, c, s, i, (l) => l ? o(l) : Ut(t, n, r, i, o));
  });
}
function yr(t, e, n, r, i) {
  J.readlink(e, (o, c) => {
    if (o) return i(o);
    if (r.dereference && (c = ye.resolve(process.cwd(), c)), t)
      J.readlink(n, (s, u) => s ? s.code === "EINVAL" || s.code === "UNKNOWN" ? J.symlink(c, n, i) : i(s) : (r.dereference && (u = ye.resolve(process.cwd(), u)), pe.isSrcSubdir(c, u) ? i(new Error(`Cannot copy '${c}' to a subdirectory of itself, '${u}'.`)) : t.isDirectory() && pe.isSrcSubdir(u, c) ? i(new Error(`Cannot overwrite '${u}' with '${c}'.`)) : pr(c, n, i)));
    else
      return J.symlink(c, n, i);
  });
}
function pr(t, e, n) {
  J.unlink(e, (r) => r ? n(r) : J.symlink(t, e, n));
}
var wr = ir;
const L = B, we = v, Sr = Y.mkdirsSync, gr = xt.utimesMillisSync, Se = ue;
function vr(t, e, n) {
  typeof n == "function" && (n = { filter: n }), n = n || {}, n.clobber = "clobber" in n ? !!n.clobber : !0, n.overwrite = "overwrite" in n ? !!n.overwrite : n.clobber, n.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0002"
  );
  const { srcStat: r, destStat: i } = Se.checkPathsSync(t, e, "copy", n);
  return Se.checkParentPathsSync(t, r, e, "copy"), $r(i, t, e, n);
}
function $r(t, e, n, r) {
  if (r.filter && !r.filter(e, n)) return;
  const i = we.dirname(n);
  return L.existsSync(i) || Sr(i), Bt(t, e, n, r);
}
function Er(t, e, n, r) {
  if (!(r.filter && !r.filter(e, n)))
    return Bt(t, e, n, r);
}
function Bt(t, e, n, r) {
  const o = (r.dereference ? L.statSync : L.lstatSync)(e);
  if (o.isDirectory()) return Ar(o, t, e, n, r);
  if (o.isFile() || o.isCharacterDevice() || o.isBlockDevice()) return kr(o, t, e, n, r);
  if (o.isSymbolicLink()) return Or(t, e, n, r);
  throw o.isSocket() ? new Error(`Cannot copy a socket file: ${e}`) : o.isFIFO() ? new Error(`Cannot copy a FIFO pipe: ${e}`) : new Error(`Unknown file: ${e}`);
}
function kr(t, e, n, r, i) {
  return e ? Tr(t, n, r, i) : Jt(t, n, r, i);
}
function Tr(t, e, n, r) {
  if (r.overwrite)
    return L.unlinkSync(n), Jt(t, e, n, r);
  if (r.errorOnExist)
    throw new Error(`'${n}' already exists`);
}
function Jt(t, e, n, r) {
  return L.copyFileSync(e, n), r.preserveTimestamps && _r(t.mode, e, n), ze(n, t.mode);
}
function _r(t, e, n) {
  return Fr(t) && Pr(n, t), Ir(e, n);
}
function Fr(t) {
  return (t & 128) === 0;
}
function Pr(t, e) {
  return ze(t, e | 128);
}
function ze(t, e) {
  return L.chmodSync(t, e);
}
function Ir(t, e) {
  const n = L.statSync(t);
  return gr(e, n.atime, n.mtime);
}
function Ar(t, e, n, r, i) {
  return e ? qt(n, r, i) : Dr(t.mode, n, r, i);
}
function Dr(t, e, n, r) {
  return L.mkdirSync(n), qt(e, n, r), ze(n, t);
}
function qt(t, e, n) {
  L.readdirSync(t).forEach((r) => Cr(r, t, e, n));
}
function Cr(t, e, n, r) {
  const i = we.join(e, t), o = we.join(n, t), { destStat: c } = Se.checkPathsSync(i, o, "copy", r);
  return Er(c, i, o, r);
}
function Or(t, e, n, r) {
  let i = L.readlinkSync(e);
  if (r.dereference && (i = we.resolve(process.cwd(), i)), t) {
    let o;
    try {
      o = L.readlinkSync(n);
    } catch (c) {
      if (c.code === "EINVAL" || c.code === "UNKNOWN") return L.symlinkSync(i, n);
      throw c;
    }
    if (r.dereference && (o = we.resolve(process.cwd(), o)), Se.isSrcSubdir(i, o))
      throw new Error(`Cannot copy '${i}' to a subdirectory of itself, '${o}'.`);
    if (L.statSync(n).isDirectory() && Se.isSrcSubdir(o, i))
      throw new Error(`Cannot overwrite '${o}' with '${i}'.`);
    return jr(i, n);
  } else
    return L.symlinkSync(i, n);
}
function jr(t, e) {
  return L.unlinkSync(e), L.symlinkSync(t, e);
}
var Nr = vr;
const xr = U.fromCallback;
var Qe = {
  copy: xr(wr),
  copySync: Nr
};
const ut = B, Yt = v, E = It, ge = process.platform === "win32";
function Vt(t) {
  [
    "unlink",
    "chmod",
    "stat",
    "lstat",
    "rmdir",
    "readdir"
  ].forEach((n) => {
    t[n] = t[n] || ut[n], n = n + "Sync", t[n] = t[n] || ut[n];
  }), t.maxBusyTries = t.maxBusyTries || 3;
}
function Ze(t, e, n) {
  let r = 0;
  typeof e == "function" && (n = e, e = {}), E(t, "rimraf: missing path"), E.strictEqual(typeof t, "string", "rimraf: path should be a string"), E.strictEqual(typeof n, "function", "rimraf: callback function required"), E(e, "rimraf: invalid options argument provided"), E.strictEqual(typeof e, "object", "rimraf: options should be object"), Vt(e), lt(t, e, function i(o) {
    if (o) {
      if ((o.code === "EBUSY" || o.code === "ENOTEMPTY" || o.code === "EPERM") && r < e.maxBusyTries) {
        r++;
        const c = r * 100;
        return setTimeout(() => lt(t, e, i), c);
      }
      o.code === "ENOENT" && (o = null);
    }
    n(o);
  });
}
function lt(t, e, n) {
  E(t), E(e), E(typeof n == "function"), e.lstat(t, (r, i) => {
    if (r && r.code === "ENOENT")
      return n(null);
    if (r && r.code === "EPERM" && ge)
      return ft(t, e, r, n);
    if (i && i.isDirectory())
      return Pe(t, e, r, n);
    e.unlink(t, (o) => {
      if (o) {
        if (o.code === "ENOENT")
          return n(null);
        if (o.code === "EPERM")
          return ge ? ft(t, e, o, n) : Pe(t, e, o, n);
        if (o.code === "EISDIR")
          return Pe(t, e, o, n);
      }
      return n(o);
    });
  });
}
function ft(t, e, n, r) {
  E(t), E(e), E(typeof r == "function"), e.chmod(t, 438, (i) => {
    i ? r(i.code === "ENOENT" ? null : n) : e.stat(t, (o, c) => {
      o ? r(o.code === "ENOENT" ? null : n) : c.isDirectory() ? Pe(t, e, n, r) : e.unlink(t, r);
    });
  });
}
function dt(t, e, n) {
  let r;
  E(t), E(e);
  try {
    e.chmodSync(t, 438);
  } catch (i) {
    if (i.code === "ENOENT")
      return;
    throw n;
  }
  try {
    r = e.statSync(t);
  } catch (i) {
    if (i.code === "ENOENT")
      return;
    throw n;
  }
  r.isDirectory() ? Ie(t, e, n) : e.unlinkSync(t);
}
function Pe(t, e, n, r) {
  E(t), E(e), E(typeof r == "function"), e.rmdir(t, (i) => {
    i && (i.code === "ENOTEMPTY" || i.code === "EEXIST" || i.code === "EPERM") ? br(t, e, r) : i && i.code === "ENOTDIR" ? r(n) : r(i);
  });
}
function br(t, e, n) {
  E(t), E(e), E(typeof n == "function"), e.readdir(t, (r, i) => {
    if (r) return n(r);
    let o = i.length, c;
    if (o === 0) return e.rmdir(t, n);
    i.forEach((s) => {
      Ze(Yt.join(t, s), e, (u) => {
        if (!c) {
          if (u) return n(c = u);
          --o === 0 && e.rmdir(t, n);
        }
      });
    });
  });
}
function Gt(t, e) {
  let n;
  e = e || {}, Vt(e), E(t, "rimraf: missing path"), E.strictEqual(typeof t, "string", "rimraf: path should be a string"), E(e, "rimraf: missing options"), E.strictEqual(typeof e, "object", "rimraf: options should be object");
  try {
    n = e.lstatSync(t);
  } catch (r) {
    if (r.code === "ENOENT")
      return;
    r.code === "EPERM" && ge && dt(t, e, r);
  }
  try {
    n && n.isDirectory() ? Ie(t, e, null) : e.unlinkSync(t);
  } catch (r) {
    if (r.code === "ENOENT")
      return;
    if (r.code === "EPERM")
      return ge ? dt(t, e, r) : Ie(t, e, r);
    if (r.code !== "EISDIR")
      throw r;
    Ie(t, e, r);
  }
}
function Ie(t, e, n) {
  E(t), E(e);
  try {
    e.rmdirSync(t);
  } catch (r) {
    if (r.code === "ENOTDIR")
      throw n;
    if (r.code === "ENOTEMPTY" || r.code === "EEXIST" || r.code === "EPERM")
      Rr(t, e);
    else if (r.code !== "ENOENT")
      throw r;
  }
}
function Rr(t, e) {
  if (E(t), E(e), e.readdirSync(t).forEach((n) => Gt(Yt.join(t, n), e)), ge) {
    const n = Date.now();
    do
      try {
        return e.rmdirSync(t, e);
      } catch {
      }
    while (Date.now() - n < 500);
  } else
    return e.rmdirSync(t, e);
}
var Lr = Ze;
Ze.sync = Gt;
const Ce = B, Wr = U.fromCallback, Ht = Lr;
function Mr(t, e) {
  if (Ce.rm) return Ce.rm(t, { recursive: !0, force: !0 }, e);
  Ht(t, e);
}
function Ur(t) {
  if (Ce.rmSync) return Ce.rmSync(t, { recursive: !0, force: !0 });
  Ht.sync(t);
}
var Ne = {
  remove: Wr(Mr),
  removeSync: Ur
};
const Br = U.fromPromise, Kt = ne, Xt = v, zt = Y, Qt = Ne, mt = Br(async function(e) {
  let n;
  try {
    n = await Kt.readdir(e);
  } catch {
    return zt.mkdirs(e);
  }
  return Promise.all(n.map((r) => Qt.remove(Xt.join(e, r))));
});
function ht(t) {
  let e;
  try {
    e = Kt.readdirSync(t);
  } catch {
    return zt.mkdirsSync(t);
  }
  e.forEach((n) => {
    n = Xt.join(t, n), Qt.removeSync(n);
  });
}
var Jr = {
  emptyDirSync: ht,
  emptydirSync: ht,
  emptyDir: mt,
  emptydir: mt
};
const qr = U.fromCallback, Zt = v, z = B, en = Y;
function Yr(t, e) {
  function n() {
    z.writeFile(t, "", (r) => {
      if (r) return e(r);
      e();
    });
  }
  z.stat(t, (r, i) => {
    if (!r && i.isFile()) return e();
    const o = Zt.dirname(t);
    z.stat(o, (c, s) => {
      if (c)
        return c.code === "ENOENT" ? en.mkdirs(o, (u) => {
          if (u) return e(u);
          n();
        }) : e(c);
      s.isDirectory() ? n() : z.readdir(o, (u) => {
        if (u) return e(u);
      });
    });
  });
}
function Vr(t) {
  let e;
  try {
    e = z.statSync(t);
  } catch {
  }
  if (e && e.isFile()) return;
  const n = Zt.dirname(t);
  try {
    z.statSync(n).isDirectory() || z.readdirSync(n);
  } catch (r) {
    if (r && r.code === "ENOENT") en.mkdirsSync(n);
    else throw r;
  }
  z.writeFileSync(t, "");
}
var Gr = {
  createFile: qr(Yr),
  createFileSync: Vr
};
const Hr = U.fromCallback, tn = v, X = B, nn = Y, Kr = re.pathExists, { areIdentical: rn } = ue;
function Xr(t, e, n) {
  function r(i, o) {
    X.link(i, o, (c) => {
      if (c) return n(c);
      n(null);
    });
  }
  X.lstat(e, (i, o) => {
    X.lstat(t, (c, s) => {
      if (c)
        return c.message = c.message.replace("lstat", "ensureLink"), n(c);
      if (o && rn(s, o)) return n(null);
      const u = tn.dirname(e);
      Kr(u, (f, a) => {
        if (f) return n(f);
        if (a) return r(t, e);
        nn.mkdirs(u, (l) => {
          if (l) return n(l);
          r(t, e);
        });
      });
    });
  });
}
function zr(t, e) {
  let n;
  try {
    n = X.lstatSync(e);
  } catch {
  }
  try {
    const o = X.lstatSync(t);
    if (n && rn(o, n)) return;
  } catch (o) {
    throw o.message = o.message.replace("lstat", "ensureLink"), o;
  }
  const r = tn.dirname(e);
  return X.existsSync(r) || nn.mkdirsSync(r), X.linkSync(t, e);
}
var Qr = {
  createLink: Hr(Xr),
  createLinkSync: zr
};
const Q = v, de = B, Zr = re.pathExists;
function ei(t, e, n) {
  if (Q.isAbsolute(t))
    return de.lstat(t, (r) => r ? (r.message = r.message.replace("lstat", "ensureSymlink"), n(r)) : n(null, {
      toCwd: t,
      toDst: t
    }));
  {
    const r = Q.dirname(e), i = Q.join(r, t);
    return Zr(i, (o, c) => o ? n(o) : c ? n(null, {
      toCwd: i,
      toDst: t
    }) : de.lstat(t, (s) => s ? (s.message = s.message.replace("lstat", "ensureSymlink"), n(s)) : n(null, {
      toCwd: t,
      toDst: Q.relative(r, t)
    })));
  }
}
function ti(t, e) {
  let n;
  if (Q.isAbsolute(t)) {
    if (n = de.existsSync(t), !n) throw new Error("absolute srcpath does not exist");
    return {
      toCwd: t,
      toDst: t
    };
  } else {
    const r = Q.dirname(e), i = Q.join(r, t);
    if (n = de.existsSync(i), n)
      return {
        toCwd: i,
        toDst: t
      };
    if (n = de.existsSync(t), !n) throw new Error("relative srcpath does not exist");
    return {
      toCwd: t,
      toDst: Q.relative(r, t)
    };
  }
}
var ni = {
  symlinkPaths: ei,
  symlinkPathsSync: ti
};
const on = B;
function ri(t, e, n) {
  if (n = typeof e == "function" ? e : n, e = typeof e == "function" ? !1 : e, e) return n(null, e);
  on.lstat(t, (r, i) => {
    if (r) return n(null, "file");
    e = i && i.isDirectory() ? "dir" : "file", n(null, e);
  });
}
function ii(t, e) {
  let n;
  if (e) return e;
  try {
    n = on.lstatSync(t);
  } catch {
    return "file";
  }
  return n && n.isDirectory() ? "dir" : "file";
}
var oi = {
  symlinkType: ri,
  symlinkTypeSync: ii
};
const ci = U.fromCallback, cn = v, q = ne, an = Y, ai = an.mkdirs, si = an.mkdirsSync, sn = ni, ui = sn.symlinkPaths, li = sn.symlinkPathsSync, un = oi, fi = un.symlinkType, di = un.symlinkTypeSync, mi = re.pathExists, { areIdentical: ln } = ue;
function hi(t, e, n, r) {
  r = typeof n == "function" ? n : r, n = typeof n == "function" ? !1 : n, q.lstat(e, (i, o) => {
    !i && o.isSymbolicLink() ? Promise.all([
      q.stat(t),
      q.stat(e)
    ]).then(([c, s]) => {
      if (ln(c, s)) return r(null);
      yt(t, e, n, r);
    }) : yt(t, e, n, r);
  });
}
function yt(t, e, n, r) {
  ui(t, e, (i, o) => {
    if (i) return r(i);
    t = o.toDst, fi(o.toCwd, n, (c, s) => {
      if (c) return r(c);
      const u = cn.dirname(e);
      mi(u, (f, a) => {
        if (f) return r(f);
        if (a) return q.symlink(t, e, s, r);
        ai(u, (l) => {
          if (l) return r(l);
          q.symlink(t, e, s, r);
        });
      });
    });
  });
}
function yi(t, e, n) {
  let r;
  try {
    r = q.lstatSync(e);
  } catch {
  }
  if (r && r.isSymbolicLink()) {
    const s = q.statSync(t), u = q.statSync(e);
    if (ln(s, u)) return;
  }
  const i = li(t, e);
  t = i.toDst, n = di(i.toCwd, n);
  const o = cn.dirname(e);
  return q.existsSync(o) || si(o), q.symlinkSync(t, e, n);
}
var pi = {
  createSymlink: ci(hi),
  createSymlinkSync: yi
};
const { createFile: pt, createFileSync: wt } = Gr, { createLink: St, createLinkSync: gt } = Qr, { createSymlink: vt, createSymlinkSync: $t } = pi;
var wi = {
  // file
  createFile: pt,
  createFileSync: wt,
  ensureFile: pt,
  ensureFileSync: wt,
  // link
  createLink: St,
  createLinkSync: gt,
  ensureLink: St,
  ensureLinkSync: gt,
  // symlink
  createSymlink: vt,
  createSymlinkSync: $t,
  ensureSymlink: vt,
  ensureSymlinkSync: $t
};
function Si(t, { EOL: e = `
`, finalEOL: n = !0, replacer: r = null, spaces: i } = {}) {
  const o = n ? e : "";
  return JSON.stringify(t, r, i).replace(/\n/g, e) + o;
}
function gi(t) {
  return Buffer.isBuffer(t) && (t = t.toString("utf8")), t.replace(/^\uFEFF/, "");
}
var et = { stringify: Si, stripBom: gi };
let se;
try {
  se = B;
} catch {
  se = fe;
}
const xe = U, { stringify: fn, stripBom: dn } = et;
async function vi(t, e = {}) {
  typeof e == "string" && (e = { encoding: e });
  const n = e.fs || se, r = "throws" in e ? e.throws : !0;
  let i = await xe.fromCallback(n.readFile)(t, e);
  i = dn(i);
  let o;
  try {
    o = JSON.parse(i, e ? e.reviver : null);
  } catch (c) {
    if (r)
      throw c.message = `${t}: ${c.message}`, c;
    return null;
  }
  return o;
}
const $i = xe.fromPromise(vi);
function Ei(t, e = {}) {
  typeof e == "string" && (e = { encoding: e });
  const n = e.fs || se, r = "throws" in e ? e.throws : !0;
  try {
    let i = n.readFileSync(t, e);
    return i = dn(i), JSON.parse(i, e.reviver);
  } catch (i) {
    if (r)
      throw i.message = `${t}: ${i.message}`, i;
    return null;
  }
}
async function ki(t, e, n = {}) {
  const r = n.fs || se, i = fn(e, n);
  await xe.fromCallback(r.writeFile)(t, i, n);
}
const Ti = xe.fromPromise(ki);
function _i(t, e, n = {}) {
  const r = n.fs || se, i = fn(e, n);
  return r.writeFileSync(t, i, n);
}
var Fi = {
  readFile: $i,
  readFileSync: Ei,
  writeFile: Ti,
  writeFileSync: _i
};
const Te = Fi;
var Pi = {
  // jsonfile exports
  readJson: Te.readFile,
  readJsonSync: Te.readFileSync,
  writeJson: Te.writeFile,
  writeJsonSync: Te.writeFileSync
};
const Ii = U.fromCallback, me = B, mn = v, hn = Y, Ai = re.pathExists;
function Di(t, e, n, r) {
  typeof n == "function" && (r = n, n = "utf8");
  const i = mn.dirname(t);
  Ai(i, (o, c) => {
    if (o) return r(o);
    if (c) return me.writeFile(t, e, n, r);
    hn.mkdirs(i, (s) => {
      if (s) return r(s);
      me.writeFile(t, e, n, r);
    });
  });
}
function Ci(t, ...e) {
  const n = mn.dirname(t);
  if (me.existsSync(n))
    return me.writeFileSync(t, ...e);
  hn.mkdirsSync(n), me.writeFileSync(t, ...e);
}
var tt = {
  outputFile: Ii(Di),
  outputFileSync: Ci
};
const { stringify: Oi } = et, { outputFile: ji } = tt;
async function Ni(t, e, n = {}) {
  const r = Oi(e, n);
  await ji(t, r, n);
}
var xi = Ni;
const { stringify: bi } = et, { outputFileSync: Ri } = tt;
function Li(t, e, n) {
  const r = bi(e, n);
  Ri(t, r, n);
}
var Wi = Li;
const Mi = U.fromPromise, M = Pi;
M.outputJson = Mi(xi);
M.outputJsonSync = Wi;
M.outputJSON = M.outputJson;
M.outputJSONSync = M.outputJsonSync;
M.writeJSON = M.writeJson;
M.writeJSONSync = M.writeJsonSync;
M.readJSON = M.readJson;
M.readJSONSync = M.readJsonSync;
var Ui = M;
const Bi = B, qe = v, Ji = Qe.copy, yn = Ne.remove, qi = Y.mkdirp, Yi = re.pathExists, Et = ue;
function Vi(t, e, n, r) {
  typeof n == "function" && (r = n, n = {}), n = n || {};
  const i = n.overwrite || n.clobber || !1;
  Et.checkPaths(t, e, "move", n, (o, c) => {
    if (o) return r(o);
    const { srcStat: s, isChangingCase: u = !1 } = c;
    Et.checkParentPaths(t, s, e, "move", (f) => {
      if (f) return r(f);
      if (Gi(e)) return kt(t, e, i, u, r);
      qi(qe.dirname(e), (a) => a ? r(a) : kt(t, e, i, u, r));
    });
  });
}
function Gi(t) {
  const e = qe.dirname(t);
  return qe.parse(e).root === e;
}
function kt(t, e, n, r, i) {
  if (r) return Me(t, e, n, i);
  if (n)
    return yn(e, (o) => o ? i(o) : Me(t, e, n, i));
  Yi(e, (o, c) => o ? i(o) : c ? i(new Error("dest already exists.")) : Me(t, e, n, i));
}
function Me(t, e, n, r) {
  Bi.rename(t, e, (i) => i ? i.code !== "EXDEV" ? r(i) : Hi(t, e, n, r) : r());
}
function Hi(t, e, n, r) {
  Ji(t, e, {
    overwrite: n,
    errorOnExist: !0
  }, (o) => o ? r(o) : yn(t, r));
}
var Ki = Vi;
const pn = B, Ye = v, Xi = Qe.copySync, wn = Ne.removeSync, zi = Y.mkdirpSync, Tt = ue;
function Qi(t, e, n) {
  n = n || {};
  const r = n.overwrite || n.clobber || !1, { srcStat: i, isChangingCase: o = !1 } = Tt.checkPathsSync(t, e, "move", n);
  return Tt.checkParentPathsSync(t, i, e, "move"), Zi(e) || zi(Ye.dirname(e)), eo(t, e, r, o);
}
function Zi(t) {
  const e = Ye.dirname(t);
  return Ye.parse(e).root === e;
}
function eo(t, e, n, r) {
  if (r) return Ue(t, e, n);
  if (n)
    return wn(e), Ue(t, e, n);
  if (pn.existsSync(e)) throw new Error("dest already exists.");
  return Ue(t, e, n);
}
function Ue(t, e, n) {
  try {
    pn.renameSync(t, e);
  } catch (r) {
    if (r.code !== "EXDEV") throw r;
    return to(t, e, n);
  }
}
function to(t, e, n) {
  return Xi(t, e, {
    overwrite: n,
    errorOnExist: !0
  }), wn(t);
}
var no = Qi;
const ro = U.fromCallback;
var io = {
  move: ro(Ki),
  moveSync: no
}, oo = {
  // Export promiseified graceful-fs:
  ...ne,
  // Export extra methods:
  ...Qe,
  ...Jr,
  ...wi,
  ...Ui,
  ...Y,
  ...io,
  ...tt,
  ...re,
  ...Ne
};
const V = /* @__PURE__ */ In(oo);
class _e {
  static async selectFolder() {
    const e = await Tn.showOpenDialog({
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
  }
  static async backupFolder(e) {
    const n = v.basename(e), r = v.join(v.dirname(e), `${n}-备份`);
    return await V.copy(e, r), r;
  }
  static async calculateMD5(e) {
    return new Promise((n, r) => {
      const i = Be.createHash("md5"), o = V.createReadStream(e);
      o.on("error", r), o.on("data", (c) => i.update(c)), o.on("end", () => n(i.digest("hex")));
    });
  }
  static async splitIntoFolders(e, n, r, i) {
    const o = v.basename(e), c = v.join(v.dirname(e), `${o}-备份`);
    await V.ensureDir(c);
    const s = [], u = [];
    for (let f = 0; f < n.length; f += r)
      u.push(n.slice(f, f + r));
    for (let f = 0; f < u.length; f++) {
      const a = f + 1, l = `${i} - 第${a}组`, d = v.join(c, l);
      await V.ensureDir(d), s.push(d);
      for (const m of u[f]) {
        const h = v.join(d, m.name);
        await V.copy(m.path, h);
      }
    }
    return s;
  }
}
function co() {
  p.handle("file:selectFolder", async () => _e.selectFolder()), p.handle("file:backupFolder", async (t, e) => _e.backupFolder(e)), p.handle("file:calculateMD5", async (t, e) => _e.calculateMD5(e)), p.handle("file:splitIntoFolders", async (t, e, n, r, i) => _e.splitIntoFolders(e, n, r, i));
}
let ao = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const so = 128;
let ee, oe, uo = (t) => {
  !ee || ee.length < t ? (ee = Buffer.allocUnsafe(t * so), Be.randomFillSync(ee), oe = 0) : oe + t > ee.length && (Be.randomFillSync(ee), oe = 0), oe += t;
}, lo = (t = 21) => {
  uo(t |= 0);
  let e = "";
  for (let n = oe - t; n < oe; n++)
    e += ao[ee[n] & 63];
  return e;
};
const fo = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
class mo {
  static async scanImagesInFolder(e) {
    const n = await V.readdir(e), r = [];
    let i = 0;
    for (const o of n) {
      const c = v.join(e, o), s = await V.stat(c);
      if (!s.isFile()) continue;
      const u = v.extname(o).toLowerCase();
      if (fo.includes(u))
        try {
          r.push({
            id: lo(),
            name: o,
            path: c,
            size: s.size,
            width: 1920,
            height: 1080,
            format: u.replace(".", ""),
            enabled: !0,
            isCover: !1,
            order: i++
          });
        } catch (f) {
          console.error("图片解析失败:", c, f);
        }
    }
    return r;
  }
}
function ho() {
  p.handle("image:scanFolder", async (t, e) => e ? mo.scanImagesInFolder(e) : []);
}
class yo {
  constructor() {
    $e(this, "dbPath");
    $e(this, "data");
    const e = he.getPath("userData");
    this.dbPath = v.join(e, "gzh-layout.json"), this.data = this.loadFromFile();
  }
  loadFromFile() {
    if (fe.existsSync(this.dbPath))
      try {
        const e = fe.readFileSync(this.dbPath, "utf-8"), n = JSON.parse(e);
        return {
          projects: n.projects || [],
          templates: n.templates || [],
          coverTemplates: n.coverTemplates || [],
          wechatAccounts: n.wechatAccounts || [],
          draftRecords: n.draftRecords || []
        };
      } catch (e) {
        console.error("读取数据库文件失败:", e);
      }
    return {
      projects: [],
      templates: [],
      coverTemplates: [],
      wechatAccounts: [],
      draftRecords: []
    };
  }
  saveToFile() {
    try {
      fe.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("保存数据库文件失败:", e);
    }
  }
  async init() {
  }
  // ========== Projects ==========
  getAllProjects() {
    return [...this.data.projects].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  getProject(e) {
    return this.data.projects.find((n) => n.projectId === e) || null;
  }
  saveProject(e) {
    const n = this.data.projects.findIndex((r) => r.projectId === e.projectId);
    n !== -1 ? this.data.projects[n] = e : this.data.projects.push(e), this.saveToFile();
  }
  deleteProject(e) {
    this.data.projects = this.data.projects.filter((n) => n.projectId !== e), this.saveToFile();
  }
  // ========== Templates ==========
  getAllTemplates() {
    return [...this.data.templates].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveTemplate(e) {
    const n = this.data.templates.findIndex((r) => r.id === e.id);
    n !== -1 ? this.data.templates[n] = e : this.data.templates.push(e), this.saveToFile();
  }
  deleteTemplate(e) {
    this.data.templates = this.data.templates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== Cover Templates ==========
  getAllCoverTemplates() {
    return [...this.data.coverTemplates].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveCoverTemplate(e) {
    const n = this.data.coverTemplates.findIndex((r) => r.id === e.id);
    n !== -1 ? this.data.coverTemplates[n] = e : this.data.coverTemplates.push(e), this.saveToFile();
  }
  deleteCoverTemplate(e) {
    this.data.coverTemplates = this.data.coverTemplates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== Wechat Accounts ==========
  getAllWechatAccounts() {
    return [...this.data.wechatAccounts];
  }
  getWechatAccount(e) {
    return this.data.wechatAccounts.find((n) => n.id === e) || null;
  }
  getActiveWechatAccount() {
    return this.data.wechatAccounts.find((e) => e.isActive) || null;
  }
  saveWechatAccount(e) {
    const n = this.data.wechatAccounts.findIndex((r) => r.id === e.id);
    n !== -1 ? this.data.wechatAccounts[n] = e : this.data.wechatAccounts.push(e), this.saveToFile();
  }
  setActiveWechatAccount(e) {
    this.data.wechatAccounts.forEach((n) => {
      n.isActive = n.id === e;
    }), this.saveToFile();
  }
  deleteWechatAccount(e) {
    this.data.wechatAccounts = this.data.wechatAccounts.filter((n) => n.id !== e), this.saveToFile();
  }
}
const O = new yo();
function po() {
  p.handle("db:init", async () => (await O.init(), { success: !0 })), p.handle("db:getAllProjects", () => O.getAllProjects()), p.handle("db:getProject", (t, e) => O.getProject(e)), p.handle("db:saveProject", (t, e) => (O.saveProject(e), { success: !0 })), p.handle("db:deleteProject", (t, e) => (O.deleteProject(e), { success: !0 })), p.handle("db:getAllTemplates", () => O.getAllTemplates()), p.handle("db:saveTemplate", (t, e) => (O.saveTemplate(e), { success: !0 })), p.handle("db:deleteTemplate", (t, e) => (O.deleteTemplate(e), { success: !0 })), p.handle("db:getAllCoverTemplates", () => O.getAllCoverTemplates()), p.handle("db:saveCoverTemplate", (t, e) => (O.saveCoverTemplate(e), { success: !0 })), p.handle("db:deleteCoverTemplate", (t, e) => (O.deleteCoverTemplate(e), { success: !0 })), p.handle("db:getAllWechatAccounts", () => O.getAllWechatAccounts()), p.handle("db:getWechatAccount", (t, e) => O.getWechatAccount(e)), p.handle("db:getActiveWechatAccount", () => O.getActiveWechatAccount()), p.handle("db:saveWechatAccount", (t, e) => (O.saveWechatAccount(e), { success: !0 })), p.handle("db:setActiveWechatAccount", (t, e) => (O.setActiveWechatAccount(e), { success: !0 })), p.handle("db:deleteWechatAccount", (t, e) => (O.deleteWechatAccount(e), { success: !0 }));
}
const H = "https://api.weixin.qq.com", wo = 300, So = "----WechatFormBoundary";
function go() {
  return `${So}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function _t(t, e, n, r) {
  const i = go(), o = Re.from(
    `--${i}\r
Content-Disposition: form-data; name="${t}"; filename="${e}"\r
Content-Type: ${r}\r
\r
`,
    "utf-8"
  ), c = Re.from(`\r
--${i}--\r
`, "utf-8");
  return {
    body: Re.concat([o, n, c]),
    contentType: `multipart/form-data; boundary=${i}`,
    boundary: i
  };
}
class vo {
  constructor() {
    $e(this, "tokenCache", null);
  }
  async getAccessToken(e, n) {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now())
      return this.tokenCache.accessToken;
    const r = `${H}/cgi-bin/token?grant_type=client_credential&appId=${encodeURIComponent(e)}&secret=${encodeURIComponent(n)}`, o = await (await fetch(r)).json();
    if (o.errcode)
      throw new Error(`获取AccessToken失败 [${o.errcode}]: ${o.errmsg}`);
    return this.tokenCache = {
      accessToken: o.access_token,
      expiresAt: Date.now() + (o.expires_in - wo) * 1e3
    }, o.access_token;
  }
  clearTokenCache() {
    this.tokenCache = null;
  }
  getTokenCacheInfo() {
    return this.tokenCache;
  }
  async getAccountInfo(e) {
    const n = `${H}/cgi-bin/getcallbackip?access_token=${e}`, i = await (await fetch(n)).json();
    if (i.errcode)
      throw new Error(`Token 校验失败 [${i.errcode}]: ${i.errmsg}`);
    const o = `${H}/cgi-bin/account/getaccountbasicinfo?access_token=${e}`, s = await (await fetch(o, { method: "POST" })).json();
    return s.errcode ? {
      nickname: "",
      headImg: "",
      serviceType: -1,
      verifyType: -1,
      userName: "",
      alias: "",
      qrcodeUrl: ""
    } : {
      nickname: s.nickname || "",
      headImg: s.head_img || "",
      serviceType: s.service_type ?? -1,
      verifyType: s.verify_type ?? -1,
      userName: s.user_name || "",
      alias: s.alias || "",
      qrcodeUrl: s.qrcode_url || ""
    };
  }
  async authenticate(e, n) {
    const r = await this.getAccessToken(e, n), i = this.tokenCache, o = Math.floor((i.expiresAt - Date.now()) / 1e3), c = await this.getAccountInfo(r);
    return {
      success: !0,
      accessToken: r,
      expiresIn: o,
      accountInfo: c
    };
  }
  async verifyToken(e) {
    const n = `${H}/cgi-bin/getcallbackip?access_token=${e}`;
    return !(await (await fetch(n)).json()).errcode;
  }
  async uploadCoverImage(e, n) {
    const r = await V.readFile(n), i = v.basename(n), o = v.extname(i).toLowerCase(), s = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" }[o] || "image/jpeg", { body: u, contentType: f } = _t("media", i, r, s), a = `${H}/cgi-bin/material/add_material?access_token=${e}&type=image`, d = await (await fetch(a, {
      method: "POST",
      headers: { "Content-Type": f },
      body: new Uint8Array(u)
    })).json();
    if (d.errcode)
      throw new Error(`上传封面图失败 [${d.errcode}]: ${d.errmsg}`);
    return { mediaId: d.media_id, url: d.url };
  }
  async uploadContentImage(e, n) {
    const r = await V.readFile(n), i = v.basename(n), o = v.extname(i).toLowerCase(), s = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" }[o] || "image/jpeg", { body: u, contentType: f } = _t("media", i, r, s), a = `${H}/cgi-bin/media/uploadimg?access_token=${e}`, d = await (await fetch(a, {
      method: "POST",
      headers: { "Content-Type": f },
      body: new Uint8Array(u)
    })).json();
    if (d.errcode)
      throw new Error(`上传正文图片失败 (${i}) [${d.errcode}]: ${d.errmsg}`);
    return { originalPath: n, url: d.url };
  }
  async batchUploadContentImages(e, n, r, i, o) {
    const c = [];
    for (let s = 0; s < n.length; s++) {
      r == null || r({
        currentArticleIndex: i ?? 0,
        totalArticles: o ?? 1,
        step: "images",
        message: `正在上传正文图片 ${s + 1}/${n.length}...`
      });
      const u = await this.uploadContentImage(e, n[s]);
      c.push(u), s < n.length - 1 && await this.delay(300);
    }
    return c;
  }
  async createDraft(e, n) {
    const r = {
      articles: [
        {
          title: n.title,
          thumb_media_id: n.thumbMediaId,
          author: n.author ?? "",
          digest: n.digest ?? n.title,
          content: n.content,
          content_source_url: n.contentSourceUrl ?? "",
          need_open_comment: n.needOpenComment ?? 1,
          only_fans_can_comment: n.onlyFansCanComment ?? 0,
          pic_crop_235_1: n.picCrop2351 ?? "0_0_1_1",
          pic_crop_1_1: n.picCrop11 ?? "0.287234_0_0.712766_1"
        }
      ]
    }, i = `${H}/cgi-bin/draft/add?access_token=${e}`, c = await (await fetch(i, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r)
    })).json();
    if (c.errcode)
      throw new Error(`创建草稿失败 [${c.errcode}]: ${c.errmsg}`);
    return c.media_id;
  }
  async publishDraft(e, n) {
    const r = { media_id: n }, i = `${H}/cgi-bin/freepublish/submit?access_token=${e}`, c = await (await fetch(i, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r)
    })).json();
    if (c.errcode)
      throw new Error(`发布草稿失败 [${c.errcode}]: ${c.errmsg}`);
    return c.publish_id;
  }
  buildArticleHtml(e, n) {
    const r = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(e)}</section>`, i = n.map((o) => `<p><img src="${o}" data-src="${o}" style="max-width:100%;display:block;margin:0 auto;"></p>`).join(`
`);
    return r + i;
  }
  calculateCropParams(e = 2.35) {
    const n = "0_0_1_1", i = (1 - 1 / e) / 2, o = i.toFixed(6), c = (1 - i).toFixed(6), s = `${o}_0_${c}_1`;
    return { pic_crop_235_1: n, pic_crop_1_1: s };
  }
  delay(e) {
    return new Promise((n) => setTimeout(n, e));
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const D = new vo();
function $o() {
  p.handle("wechat:getAccessToken", async (t, e, n) => D.getAccessToken(e, n)), p.handle("wechat:clearTokenCache", async () => {
    D.clearTokenCache();
  }), p.handle("wechat:getAccountInfo", async (t, e) => D.getAccountInfo(e)), p.handle("wechat:authenticate", async (t, e, n) => D.authenticate(e, n)), p.handle("wechat:verifyToken", async (t, e) => D.verifyToken(e)), p.handle("wechat:getTokenCacheInfo", async () => D.getTokenCacheInfo()), p.handle("wechat:uploadCoverImage", async (t, e, n) => D.uploadCoverImage(e, n)), p.handle("wechat:uploadContentImage", async (t, e, n) => D.uploadContentImage(e, n)), p.handle("wechat:batchUploadContentImages", async (t, e, n) => D.batchUploadContentImages(e, n)), p.handle("wechat:createDraft", async (t, e, n) => D.createDraft(e, n)), p.handle("wechat:publishDraft", async (t, e, n) => D.publishDraft(e, n)), p.handle("wechat:buildArticleHtml", async (t, e, n) => D.buildArticleHtml(e, n)), p.handle("wechat:calculateCropParams", async (t, e) => D.calculateCropParams(e)), p.handle("wechat:batchUpload", async (t, e) => {
    const { appId: n, appSecret: r, articles: i, publish: o = !1 } = e, c = [], s = t.sender, u = (f) => {
      try {
        s.isDestroyed() || s.send("wechat:uploadProgress", f);
      } catch {
      }
    };
    try {
      u({
        currentArticleIndex: 0,
        totalArticles: i.length,
        step: "token",
        message: "正在获取 AccessToken..."
      });
      let f;
      if (r)
        f = await D.getAccessToken(n, r);
      else {
        const a = D.getTokenCacheInfo();
        if (a && a.expiresAt > Date.now())
          f = a.accessToken;
        else
          throw new Error("AccessToken 已过期，请重新鉴权");
      }
      for (let a = 0; a < i.length; a++) {
        const l = i[a];
        u({
          currentArticleIndex: a,
          totalArticles: i.length,
          step: "cover",
          message: `[${a + 1}/${i.length}] 正在上传封面图...`
        });
        const d = await D.uploadCoverImage(f, l.coverImagePath);
        u({
          currentArticleIndex: a,
          totalArticles: i.length,
          step: "images",
          message: `[${a + 1}/${i.length}] 正在上传正文图片 (${l.contentImagePaths.length} 张)...`
        });
        const m = await D.batchUploadContentImages(
          f,
          l.contentImagePaths,
          (A) => u({ ...A, currentArticleIndex: a, totalArticles: i.length }),
          a,
          i.length
        );
        u({
          currentArticleIndex: a,
          totalArticles: i.length,
          step: "draft",
          message: `[${a + 1}/${i.length}] 正在创建草稿...`
        });
        const h = m.map((A) => A.url), $ = D.buildArticleHtml(l.title, h), S = await D.createDraft(f, {
          title: l.title,
          thumbMediaId: d.mediaId,
          author: l.author,
          digest: l.digest,
          content: $,
          picCrop2351: l.picCrop2351,
          picCrop11: l.picCrop11
        }), k = {
          title: l.title,
          draftMediaId: S,
          coverUrl: d.url
        };
        o && (u({
          currentArticleIndex: a,
          totalArticles: i.length,
          step: "publish",
          message: `[${a + 1}/${i.length}] 正在发布草稿...`
        }), k.publishId = await D.publishDraft(f, S)), c.push(k), a < i.length - 1 && await new Promise((A) => setTimeout(A, 500));
      }
      return u({
        currentArticleIndex: i.length,
        totalArticles: i.length,
        step: "done",
        message: `全部完成！共处理 ${i.length} 篇文章。`
      }), { success: !0, results: c };
    } catch (f) {
      const a = f instanceof Error ? f.message : String(f);
      return u({
        currentArticleIndex: c.length,
        totalArticles: i.length,
        step: "done",
        message: `上传失败: ${a}`
      }), { success: !1, error: a, results: c };
    }
  });
}
const Sn = Z.dirname(_n(import.meta.url));
process.env.APP_ROOT = Z.join(Sn, "..");
const Ve = process.env.VITE_DEV_SERVER_URL, xo = Z.join(process.env.APP_ROOT, "dist-electron"), gn = Z.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Ve ? Z.join(process.env.APP_ROOT, "public") : gn;
let K;
function vn() {
  K = new Ft({
    width: 1400,
    height: 900,
    icon: Z.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: Z.join(Sn, "preload.mjs"),
      webSecurity: !1
    }
  }), K.webContents.on("did-finish-load", () => {
    K == null || K.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Ve ? K.loadURL(Ve) : K.loadFile(Z.join(gn, "index.html"));
}
he.on("window-all-closed", () => {
  process.platform !== "darwin" && (he.quit(), K = null);
});
he.on("activate", () => {
  Ft.getAllWindows().length === 0 && vn();
});
he.whenReady().then(async () => {
  await O.init(), vn(), co(), ho(), po(), $o();
});
export {
  xo as MAIN_DIST,
  gn as RENDERER_DIST,
  Ve as VITE_DEV_SERVER_URL
};
