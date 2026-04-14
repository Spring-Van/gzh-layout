var zt = Object.defineProperty;
var Xt = (t, e, n) => e in t ? zt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var $e = (t, e, n) => Xt(t, typeof e != "symbol" ? e + "" : e, n);
import { dialog as Qt, ipcMain as p, app as ye, BrowserWindow as dt } from "electron";
import { fileURLToPath as Zt } from "node:url";
import ee from "node:path";
import de from "fs";
import en from "constants";
import tn from "stream";
import nn from "util";
import rn from "assert";
import g from "path";
import on from "crypto";
import { Buffer as me } from "node:buffer";
import { webcrypto as Ge } from "node:crypto";
var Oe = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function an(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var J = {}, A = {};
A.fromCallback = function(t) {
  return Object.defineProperty(function(...e) {
    if (typeof e[e.length - 1] == "function") t.apply(this, e);
    else
      return new Promise((n, i) => {
        e.push((r, o) => r != null ? i(r) : n(o)), t.apply(this, e);
      });
  }, "name", { value: t.name });
};
A.fromPromise = function(t) {
  return Object.defineProperty(function(...e) {
    const n = e[e.length - 1];
    if (typeof n != "function") return t.apply(this, e);
    e.pop(), t.apply(this, e).then((i) => n(null, i), n);
  }, "name", { value: t.name });
};
var G = en, cn = process.cwd, _e = null, sn = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  return _e || (_e = cn.call(process)), _e;
};
try {
  process.cwd();
} catch {
}
if (typeof process.chdir == "function") {
  var Ke = process.chdir;
  process.chdir = function(t) {
    _e = null, Ke.call(process, t);
  }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, Ke);
}
var ln = un;
function un(t) {
  G.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && e(t), t.lutimes || n(t), t.chown = o(t.chown), t.fchown = o(t.fchown), t.lchown = o(t.lchown), t.chmod = i(t.chmod), t.fchmod = i(t.fchmod), t.lchmod = i(t.lchmod), t.chownSync = a(t.chownSync), t.fchownSync = a(t.fchownSync), t.lchownSync = a(t.lchownSync), t.chmodSync = r(t.chmodSync), t.fchmodSync = r(t.fchmodSync), t.lchmodSync = r(t.lchmodSync), t.stat = s(t.stat), t.fstat = s(t.fstat), t.lstat = s(t.lstat), t.statSync = m(t.statSync), t.fstatSync = m(t.fstatSync), t.lstatSync = m(t.lstatSync), t.chmod && !t.lchmod && (t.lchmod = function(c, l, u) {
    u && process.nextTick(u);
  }, t.lchmodSync = function() {
  }), t.chown && !t.lchown && (t.lchown = function(c, l, u, f) {
    f && process.nextTick(f);
  }, t.lchownSync = function() {
  }), sn === "win32" && (t.rename = typeof t.rename != "function" ? t.rename : function(c) {
    function l(u, f, h) {
      var w = Date.now(), S = 0;
      c(u, f, function k(E) {
        if (E && (E.code === "EACCES" || E.code === "EPERM" || E.code === "EBUSY") && Date.now() - w < 6e4) {
          setTimeout(function() {
            t.stat(f, function(x, te) {
              x && x.code === "ENOENT" ? c(u, f, k) : h(E);
            });
          }, S), S < 100 && (S += 10);
          return;
        }
        h && h(E);
      });
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(l, c), l;
  }(t.rename)), t.read = typeof t.read != "function" ? t.read : function(c) {
    function l(u, f, h, w, S, k) {
      var E;
      if (k && typeof k == "function") {
        var x = 0;
        E = function(te, He, Ye) {
          if (te && te.code === "EAGAIN" && x < 10)
            return x++, c.call(t, u, f, h, w, S, E);
          k.apply(this, arguments);
        };
      }
      return c.call(t, u, f, h, w, S, E);
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(l, c), l;
  }(t.read), t.readSync = typeof t.readSync != "function" ? t.readSync : /* @__PURE__ */ function(c) {
    return function(l, u, f, h, w) {
      for (var S = 0; ; )
        try {
          return c.call(t, l, u, f, h, w);
        } catch (k) {
          if (k.code === "EAGAIN" && S < 10) {
            S++;
            continue;
          }
          throw k;
        }
    };
  }(t.readSync);
  function e(c) {
    c.lchmod = function(l, u, f) {
      c.open(
        l,
        G.O_WRONLY | G.O_SYMLINK,
        u,
        function(h, w) {
          if (h) {
            f && f(h);
            return;
          }
          c.fchmod(w, u, function(S) {
            c.close(w, function(k) {
              f && f(S || k);
            });
          });
        }
      );
    }, c.lchmodSync = function(l, u) {
      var f = c.openSync(l, G.O_WRONLY | G.O_SYMLINK, u), h = !0, w;
      try {
        w = c.fchmodSync(f, u), h = !1;
      } finally {
        if (h)
          try {
            c.closeSync(f);
          } catch {
          }
        else
          c.closeSync(f);
      }
      return w;
    };
  }
  function n(c) {
    G.hasOwnProperty("O_SYMLINK") && c.futimes ? (c.lutimes = function(l, u, f, h) {
      c.open(l, G.O_SYMLINK, function(w, S) {
        if (w) {
          h && h(w);
          return;
        }
        c.futimes(S, u, f, function(k) {
          c.close(S, function(E) {
            h && h(k || E);
          });
        });
      });
    }, c.lutimesSync = function(l, u, f) {
      var h = c.openSync(l, G.O_SYMLINK), w, S = !0;
      try {
        w = c.futimesSync(h, u, f), S = !1;
      } finally {
        if (S)
          try {
            c.closeSync(h);
          } catch {
          }
        else
          c.closeSync(h);
      }
      return w;
    }) : c.futimes && (c.lutimes = function(l, u, f, h) {
      h && process.nextTick(h);
    }, c.lutimesSync = function() {
    });
  }
  function i(c) {
    return c && function(l, u, f) {
      return c.call(t, l, u, function(h) {
        d(h) && (h = null), f && f.apply(this, arguments);
      });
    };
  }
  function r(c) {
    return c && function(l, u) {
      try {
        return c.call(t, l, u);
      } catch (f) {
        if (!d(f)) throw f;
      }
    };
  }
  function o(c) {
    return c && function(l, u, f, h) {
      return c.call(t, l, u, f, function(w) {
        d(w) && (w = null), h && h.apply(this, arguments);
      });
    };
  }
  function a(c) {
    return c && function(l, u, f) {
      try {
        return c.call(t, l, u, f);
      } catch (h) {
        if (!d(h)) throw h;
      }
    };
  }
  function s(c) {
    return c && function(l, u, f) {
      typeof u == "function" && (f = u, u = null);
      function h(w, S) {
        S && (S.uid < 0 && (S.uid += 4294967296), S.gid < 0 && (S.gid += 4294967296)), f && f.apply(this, arguments);
      }
      return u ? c.call(t, l, u, h) : c.call(t, l, h);
    };
  }
  function m(c) {
    return c && function(l, u) {
      var f = u ? c.call(t, l, u) : c.call(t, l);
      return f && (f.uid < 0 && (f.uid += 4294967296), f.gid < 0 && (f.gid += 4294967296)), f;
    };
  }
  function d(c) {
    if (!c || c.code === "ENOSYS")
      return !0;
    var l = !process.getuid || process.getuid() !== 0;
    return !!(l && (c.code === "EINVAL" || c.code === "EPERM"));
  }
}
var ze = tn.Stream, fn = dn;
function dn(t) {
  return {
    ReadStream: e,
    WriteStream: n
  };
  function e(i, r) {
    if (!(this instanceof e)) return new e(i, r);
    ze.call(this);
    var o = this;
    this.path = i, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, r = r || {};
    for (var a = Object.keys(r), s = 0, m = a.length; s < m; s++) {
      var d = a[s];
      this[d] = r[d];
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
    t.open(this.path, this.flags, this.mode, function(c, l) {
      if (c) {
        o.emit("error", c), o.readable = !1;
        return;
      }
      o.fd = l, o.emit("open", l), o._read();
    });
  }
  function n(i, r) {
    if (!(this instanceof n)) return new n(i, r);
    ze.call(this), this.path = i, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, r = r || {};
    for (var o = Object.keys(r), a = 0, s = o.length; a < s; a++) {
      var m = o[a];
      this[m] = r[m];
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
var mn = yn, hn = Object.getPrototypeOf || function(t) {
  return t.__proto__;
};
function yn(t) {
  if (t === null || typeof t != "object")
    return t;
  if (t instanceof Object)
    var e = { __proto__: hn(t) };
  else
    var e = /* @__PURE__ */ Object.create(null);
  return Object.getOwnPropertyNames(t).forEach(function(n) {
    Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(t, n));
  }), e;
}
var T = de, pn = ln, wn = fn, vn = mn, ke = nn, W, Fe;
typeof Symbol == "function" && typeof Symbol.for == "function" ? (W = Symbol.for("graceful-fs.queue"), Fe = Symbol.for("graceful-fs.previous")) : (W = "___graceful-fs.queue", Fe = "___graceful-fs.previous");
function gn() {
}
function mt(t, e) {
  Object.defineProperty(t, W, {
    get: function() {
      return e;
    }
  });
}
var re = gn;
ke.debuglog ? re = ke.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (re = function() {
  var t = ke.format.apply(ke, arguments);
  t = "GFS4: " + t.split(/\n/).join(`
GFS4: `), console.error(t);
});
if (!T[W]) {
  var Sn = Oe[W] || [];
  mt(T, Sn), T.close = function(t) {
    function e(n, i) {
      return t.call(T, n, function(r) {
        r || Xe(), typeof i == "function" && i.apply(this, arguments);
      });
    }
    return Object.defineProperty(e, Fe, {
      value: t
    }), e;
  }(T.close), T.closeSync = function(t) {
    function e(n) {
      t.apply(T, arguments), Xe();
    }
    return Object.defineProperty(e, Fe, {
      value: t
    }), e;
  }(T.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
    re(T[W]), rn.equal(T[W].length, 0);
  });
}
Oe[W] || mt(Oe, T[W]);
var ue = Le(vn(T));
process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !T.__patched && (ue = Le(T), T.__patched = !0);
function Le(t) {
  pn(t), t.gracefulify = Le, t.createReadStream = He, t.createWriteStream = Ye;
  var e = t.readFile;
  t.readFile = n;
  function n(y, $, v) {
    return typeof $ == "function" && (v = $, $ = null), N(y, $, v);
    function N(R, C, F, P) {
      return e(R, C, function(b) {
        b && (b.code === "EMFILE" || b.code === "ENFILE") ? oe([N, [R, C, F], b, P || Date.now(), Date.now()]) : typeof F == "function" && F.apply(this, arguments);
      });
    }
  }
  var i = t.writeFile;
  t.writeFile = r;
  function r(y, $, v, N) {
    return typeof v == "function" && (N = v, v = null), R(y, $, v, N);
    function R(C, F, P, b, L) {
      return i(C, F, P, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? oe([R, [C, F, P, b], _, L || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var o = t.appendFile;
  o && (t.appendFile = a);
  function a(y, $, v, N) {
    return typeof v == "function" && (N = v, v = null), R(y, $, v, N);
    function R(C, F, P, b, L) {
      return o(C, F, P, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? oe([R, [C, F, P, b], _, L || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var s = t.copyFile;
  s && (t.copyFile = m);
  function m(y, $, v, N) {
    return typeof v == "function" && (N = v, v = 0), R(y, $, v, N);
    function R(C, F, P, b, L) {
      return s(C, F, P, function(_) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? oe([R, [C, F, P, b], _, L || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  var d = t.readdir;
  t.readdir = l;
  var c = /^v[0-5]\./;
  function l(y, $, v) {
    typeof $ == "function" && (v = $, $ = null);
    var N = c.test(process.version) ? function(F, P, b, L) {
      return d(F, R(
        F,
        P,
        b,
        L
      ));
    } : function(F, P, b, L) {
      return d(F, P, R(
        F,
        P,
        b,
        L
      ));
    };
    return N(y, $, v);
    function R(C, F, P, b) {
      return function(L, _) {
        L && (L.code === "EMFILE" || L.code === "ENFILE") ? oe([
          N,
          [C, F, P],
          L,
          b || Date.now(),
          Date.now()
        ]) : (_ && _.sort && _.sort(), typeof P == "function" && P.call(this, L, _));
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var u = wn(t);
    k = u.ReadStream, x = u.WriteStream;
  }
  var f = t.ReadStream;
  f && (k.prototype = Object.create(f.prototype), k.prototype.open = E);
  var h = t.WriteStream;
  h && (x.prototype = Object.create(h.prototype), x.prototype.open = te), Object.defineProperty(t, "ReadStream", {
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
      return x;
    },
    set: function(y) {
      x = y;
    },
    enumerable: !0,
    configurable: !0
  });
  var w = k;
  Object.defineProperty(t, "FileReadStream", {
    get: function() {
      return w;
    },
    set: function(y) {
      w = y;
    },
    enumerable: !0,
    configurable: !0
  });
  var S = x;
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
  function k(y, $) {
    return this instanceof k ? (f.apply(this, arguments), this) : k.apply(Object.create(k.prototype), arguments);
  }
  function E() {
    var y = this;
    Ae(y.path, y.flags, y.mode, function($, v) {
      $ ? (y.autoClose && y.destroy(), y.emit("error", $)) : (y.fd = v, y.emit("open", v), y.read());
    });
  }
  function x(y, $) {
    return this instanceof x ? (h.apply(this, arguments), this) : x.apply(Object.create(x.prototype), arguments);
  }
  function te() {
    var y = this;
    Ae(y.path, y.flags, y.mode, function($, v) {
      $ ? (y.destroy(), y.emit("error", $)) : (y.fd = v, y.emit("open", v));
    });
  }
  function He(y, $) {
    return new t.ReadStream(y, $);
  }
  function Ye(y, $) {
    return new t.WriteStream(y, $);
  }
  var Kt = t.open;
  t.open = Ae;
  function Ae(y, $, v, N) {
    return typeof v == "function" && (N = v, v = null), R(y, $, v, N);
    function R(C, F, P, b, L) {
      return Kt(C, F, P, function(_, Hi) {
        _ && (_.code === "EMFILE" || _.code === "ENFILE") ? oe([R, [C, F, P, b], _, L || Date.now(), Date.now()]) : typeof b == "function" && b.apply(this, arguments);
      });
    }
  }
  return t;
}
function oe(t) {
  re("ENQUEUE", t[0].name, t[1]), T[W].push(t), We();
}
var be;
function Xe() {
  for (var t = Date.now(), e = 0; e < T[W].length; ++e)
    T[W][e].length > 2 && (T[W][e][3] = t, T[W][e][4] = t);
  We();
}
function We() {
  if (clearTimeout(be), be = void 0, T[W].length !== 0) {
    var t = T[W].shift(), e = t[0], n = t[1], i = t[2], r = t[3], o = t[4];
    if (r === void 0)
      re("RETRY", e.name, n), e.apply(null, n);
    else if (Date.now() - r >= 6e4) {
      re("TIMEOUT", e.name, n);
      var a = n.pop();
      typeof a == "function" && a.call(null, i);
    } else {
      var s = Date.now() - o, m = Math.max(o - r, 1), d = Math.min(m * 1.2, 100);
      s >= d ? (re("RETRY", e.name, n), e.apply(null, n.concat([r]))) : T[W].push(t);
    }
    be === void 0 && (be = setTimeout(We, 0));
  }
}
(function(t) {
  const e = A.fromCallback, n = ue, i = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "cp",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "glob",
    "lchmod",
    "lchown",
    "lutimes",
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
    "statfs",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
  ].filter((r) => typeof n[r] == "function");
  Object.assign(t, n), i.forEach((r) => {
    t[r] = e(n[r]);
  }), t.exists = function(r, o) {
    return typeof o == "function" ? n.exists(r, o) : new Promise((a) => n.exists(r, a));
  }, t.read = function(r, o, a, s, m, d) {
    return typeof d == "function" ? n.read(r, o, a, s, m, d) : new Promise((c, l) => {
      n.read(r, o, a, s, m, (u, f, h) => {
        if (u) return l(u);
        c({ bytesRead: f, buffer: h });
      });
    });
  }, t.write = function(r, o, ...a) {
    return typeof a[a.length - 1] == "function" ? n.write(r, o, ...a) : new Promise((s, m) => {
      n.write(r, o, ...a, (d, c, l) => {
        if (d) return m(d);
        s({ bytesWritten: c, buffer: l });
      });
    });
  }, t.readv = function(r, o, ...a) {
    return typeof a[a.length - 1] == "function" ? n.readv(r, o, ...a) : new Promise((s, m) => {
      n.readv(r, o, ...a, (d, c, l) => {
        if (d) return m(d);
        s({ bytesRead: c, buffers: l });
      });
    });
  }, t.writev = function(r, o, ...a) {
    return typeof a[a.length - 1] == "function" ? n.writev(r, o, ...a) : new Promise((s, m) => {
      n.writev(r, o, ...a, (d, c, l) => {
        if (d) return m(d);
        s({ bytesWritten: c, buffers: l });
      });
    });
  }, typeof n.realpath.native == "function" ? t.realpath.native = e(n.realpath.native) : process.emitWarning(
    "fs.realpath.native is not a function. Is fs being monkey-patched?",
    "Warning",
    "fs-extra-WARN0003"
  );
})(J);
var Me = {}, ht = {};
const $n = g;
ht.checkPath = function(e) {
  if (process.platform === "win32" && /[<>:"|?*]/.test(e.replace($n.parse(e).root, ""))) {
    const i = new Error(`Path contains invalid characters: ${e}`);
    throw i.code = "EINVAL", i;
  }
};
const yt = J, { checkPath: pt } = ht, wt = (t) => {
  const e = { mode: 511 };
  return typeof t == "number" ? t : { ...e, ...t }.mode;
};
Me.makeDir = async (t, e) => (pt(t), yt.mkdir(t, {
  mode: wt(e),
  recursive: !0
}));
Me.makeDirSync = (t, e) => (pt(t), yt.mkdirSync(t, {
  mode: wt(e),
  recursive: !0
}));
const kn = A.fromPromise, { makeDir: bn, makeDirSync: Ce } = Me, De = kn(bn);
var V = {
  mkdirs: De,
  mkdirsSync: Ce,
  // alias
  mkdirp: De,
  mkdirpSync: Ce,
  ensureDir: De,
  ensureDirSync: Ce
};
const En = A.fromPromise, vt = J;
function _n(t) {
  return vt.access(t).then(() => !0).catch(() => !1);
}
var ie = {
  pathExists: En(_n),
  pathExistsSync: vt.existsSync
};
const ce = J, Fn = A.fromPromise;
async function Tn(t, e, n) {
  const i = await ce.open(t, "r+");
  let r = null;
  try {
    await ce.futimes(i, e, n);
  } finally {
    try {
      await ce.close(i);
    } catch (o) {
      r = o;
    }
  }
  if (r)
    throw r;
}
function Pn(t, e, n) {
  const i = ce.openSync(t, "r+");
  return ce.futimesSync(i, e, n), ce.closeSync(i);
}
var gt = {
  utimesMillis: Fn(Tn),
  utimesMillisSync: Pn
};
const se = J, O = g, Qe = A.fromPromise;
function In(t, e, n) {
  const i = n.dereference ? (r) => se.stat(r, { bigint: !0 }) : (r) => se.lstat(r, { bigint: !0 });
  return Promise.all([
    i(t),
    i(e).catch((r) => {
      if (r.code === "ENOENT") return null;
      throw r;
    })
  ]).then(([r, o]) => ({ srcStat: r, destStat: o }));
}
function An(t, e, n) {
  let i;
  const r = n.dereference ? (a) => se.statSync(a, { bigint: !0 }) : (a) => se.lstatSync(a, { bigint: !0 }), o = r(t);
  try {
    i = r(e);
  } catch (a) {
    if (a.code === "ENOENT") return { srcStat: o, destStat: null };
    throw a;
  }
  return { srcStat: o, destStat: i };
}
async function Cn(t, e, n, i) {
  const { srcStat: r, destStat: o } = await In(t, e, i);
  if (o) {
    if (Se(r, o)) {
      const a = O.basename(t), s = O.basename(e);
      if (n === "move" && a !== s && a.toLowerCase() === s.toLowerCase())
        return { srcStat: r, destStat: o, isChangingCase: !0 };
      throw new Error("Source and destination must not be the same.");
    }
    if (r.isDirectory() && !o.isDirectory())
      throw new Error(`Cannot overwrite non-directory '${e}' with directory '${t}'.`);
    if (!r.isDirectory() && o.isDirectory())
      throw new Error(`Cannot overwrite directory '${e}' with non-directory '${t}'.`);
  }
  if (r.isDirectory() && Ue(t, e))
    throw new Error(Te(t, e, n));
  return { srcStat: r, destStat: o };
}
function Dn(t, e, n, i) {
  const { srcStat: r, destStat: o } = An(t, e, i);
  if (o) {
    if (Se(r, o)) {
      const a = O.basename(t), s = O.basename(e);
      if (n === "move" && a !== s && a.toLowerCase() === s.toLowerCase())
        return { srcStat: r, destStat: o, isChangingCase: !0 };
      throw new Error("Source and destination must not be the same.");
    }
    if (r.isDirectory() && !o.isDirectory())
      throw new Error(`Cannot overwrite non-directory '${e}' with directory '${t}'.`);
    if (!r.isDirectory() && o.isDirectory())
      throw new Error(`Cannot overwrite directory '${e}' with non-directory '${t}'.`);
  }
  if (r.isDirectory() && Ue(t, e))
    throw new Error(Te(t, e, n));
  return { srcStat: r, destStat: o };
}
async function St(t, e, n, i) {
  const r = O.resolve(O.dirname(t)), o = O.resolve(O.dirname(n));
  if (o === r || o === O.parse(o).root) return;
  let a;
  try {
    a = await se.stat(o, { bigint: !0 });
  } catch (s) {
    if (s.code === "ENOENT") return;
    throw s;
  }
  if (Se(e, a))
    throw new Error(Te(t, n, i));
  return St(t, e, o, i);
}
function $t(t, e, n, i) {
  const r = O.resolve(O.dirname(t)), o = O.resolve(O.dirname(n));
  if (o === r || o === O.parse(o).root) return;
  let a;
  try {
    a = se.statSync(o, { bigint: !0 });
  } catch (s) {
    if (s.code === "ENOENT") return;
    throw s;
  }
  if (Se(e, a))
    throw new Error(Te(t, n, i));
  return $t(t, e, o, i);
}
function Se(t, e) {
  return e.ino !== void 0 && e.dev !== void 0 && e.ino === t.ino && e.dev === t.dev;
}
function Ue(t, e) {
  const n = O.resolve(t).split(O.sep).filter((r) => r), i = O.resolve(e).split(O.sep).filter((r) => r);
  return n.every((r, o) => i[o] === r);
}
function Te(t, e, n) {
  return `Cannot ${n} '${t}' to a subdirectory of itself, '${e}'.`;
}
var fe = {
  // checkPaths
  checkPaths: Qe(Cn),
  checkPathsSync: Dn,
  // checkParent
  checkParentPaths: Qe(St),
  checkParentPathsSync: $t,
  // Misc
  isSrcSubdir: Ue,
  areIdentical: Se
};
async function jn(t, e) {
  const n = [];
  for await (const i of t)
    n.push(
      e(i).then(
        () => null,
        (r) => r ?? new Error("unknown error")
      )
    );
  await Promise.all(
    n.map(
      (i) => i.then((r) => {
        if (r !== null) throw r;
      })
    )
  );
}
var On = {
  asyncIteratorConcurrentProcess: jn
};
const M = J, pe = g, { mkdirs: xn } = V, { pathExists: Nn } = ie, { utimesMillis: Rn } = gt, we = fe, { asyncIteratorConcurrentProcess: Ln } = On;
async function Wn(t, e, n = {}) {
  typeof n == "function" && (n = { filter: n }), n.clobber = "clobber" in n ? !!n.clobber : !0, n.overwrite = "overwrite" in n ? !!n.overwrite : n.clobber, n.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0001"
  );
  const { srcStat: i, destStat: r } = await we.checkPaths(t, e, "copy", n);
  if (await we.checkParentPaths(t, i, e, "copy"), !await kt(t, e, n)) return;
  const a = pe.dirname(e);
  await Nn(a) || await xn(a), await bt(r, t, e, n);
}
async function kt(t, e, n) {
  return n.filter ? n.filter(t, e) : !0;
}
async function bt(t, e, n, i) {
  const o = await (i.dereference ? M.stat : M.lstat)(e);
  if (o.isDirectory()) return Jn(o, t, e, n, i);
  if (o.isFile() || o.isCharacterDevice() || o.isBlockDevice()) return Mn(o, t, e, n, i);
  if (o.isSymbolicLink()) return qn(t, e, n, i);
  throw o.isSocket() ? new Error(`Cannot copy a socket file: ${e}`) : o.isFIFO() ? new Error(`Cannot copy a FIFO pipe: ${e}`) : new Error(`Unknown file: ${e}`);
}
async function Mn(t, e, n, i, r) {
  if (!e) return Ze(t, n, i, r);
  if (r.overwrite)
    return await M.unlink(i), Ze(t, n, i, r);
  if (r.errorOnExist)
    throw new Error(`'${i}' already exists`);
}
async function Ze(t, e, n, i) {
  if (await M.copyFile(e, n), i.preserveTimestamps) {
    Un(t.mode) && await Bn(n, t.mode);
    const r = await M.stat(e);
    await Rn(n, r.atime, r.mtime);
  }
  return M.chmod(n, t.mode);
}
function Un(t) {
  return (t & 128) === 0;
}
function Bn(t, e) {
  return M.chmod(t, e | 128);
}
async function Jn(t, e, n, i, r) {
  e || await M.mkdir(i), await Ln(await M.opendir(n), async (o) => {
    const a = pe.join(n, o.name), s = pe.join(i, o.name);
    if (await kt(a, s, r)) {
      const { destStat: d } = await we.checkPaths(a, s, "copy", r);
      await bt(d, a, s, r);
    }
  }), e || await M.chmod(i, t.mode);
}
async function qn(t, e, n, i) {
  let r = await M.readlink(e);
  if (i.dereference && (r = pe.resolve(process.cwd(), r)), !t)
    return M.symlink(r, n);
  let o = null;
  try {
    o = await M.readlink(n);
  } catch (a) {
    if (a.code === "EINVAL" || a.code === "UNKNOWN") return M.symlink(r, n);
    throw a;
  }
  if (i.dereference && (o = pe.resolve(process.cwd(), o)), r !== o) {
    if (we.isSrcSubdir(r, o))
      throw new Error(`Cannot copy '${r}' to a subdirectory of itself, '${o}'.`);
    if (we.isSrcSubdir(o, r))
      throw new Error(`Cannot overwrite '${o}' with '${r}'.`);
  }
  return await M.unlink(n), M.symlink(r, n);
}
var Vn = Wn;
const U = ue, ve = g, Hn = V.mkdirsSync, Yn = gt.utimesMillisSync, ge = fe;
function Gn(t, e, n) {
  typeof n == "function" && (n = { filter: n }), n = n || {}, n.clobber = "clobber" in n ? !!n.clobber : !0, n.overwrite = "overwrite" in n ? !!n.overwrite : n.clobber, n.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
    `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
    "Warning",
    "fs-extra-WARN0002"
  );
  const { srcStat: i, destStat: r } = ge.checkPathsSync(t, e, "copy", n);
  if (ge.checkParentPathsSync(t, i, e, "copy"), n.filter && !n.filter(t, e)) return;
  const o = ve.dirname(e);
  return U.existsSync(o) || Hn(o), Et(r, t, e, n);
}
function Et(t, e, n, i) {
  const o = (i.dereference ? U.statSync : U.lstatSync)(e);
  if (o.isDirectory()) return tr(o, t, e, n, i);
  if (o.isFile() || o.isCharacterDevice() || o.isBlockDevice()) return Kn(o, t, e, n, i);
  if (o.isSymbolicLink()) return ir(t, e, n, i);
  throw o.isSocket() ? new Error(`Cannot copy a socket file: ${e}`) : o.isFIFO() ? new Error(`Cannot copy a FIFO pipe: ${e}`) : new Error(`Unknown file: ${e}`);
}
function Kn(t, e, n, i, r) {
  return e ? zn(t, n, i, r) : _t(t, n, i, r);
}
function zn(t, e, n, i) {
  if (i.overwrite)
    return U.unlinkSync(n), _t(t, e, n, i);
  if (i.errorOnExist)
    throw new Error(`'${n}' already exists`);
}
function _t(t, e, n, i) {
  return U.copyFileSync(e, n), i.preserveTimestamps && Xn(t.mode, e, n), Be(n, t.mode);
}
function Xn(t, e, n) {
  return Qn(t) && Zn(n, t), er(e, n);
}
function Qn(t) {
  return (t & 128) === 0;
}
function Zn(t, e) {
  return Be(t, e | 128);
}
function Be(t, e) {
  return U.chmodSync(t, e);
}
function er(t, e) {
  const n = U.statSync(t);
  return Yn(e, n.atime, n.mtime);
}
function tr(t, e, n, i, r) {
  return e ? Ft(n, i, r) : nr(t.mode, n, i, r);
}
function nr(t, e, n, i) {
  return U.mkdirSync(n), Ft(e, n, i), Be(n, t);
}
function Ft(t, e, n) {
  const i = U.opendirSync(t);
  try {
    let r;
    for (; (r = i.readSync()) !== null; )
      rr(r.name, t, e, n);
  } finally {
    i.closeSync();
  }
}
function rr(t, e, n, i) {
  const r = ve.join(e, t), o = ve.join(n, t);
  if (i.filter && !i.filter(r, o)) return;
  const { destStat: a } = ge.checkPathsSync(r, o, "copy", i);
  return Et(a, r, o, i);
}
function ir(t, e, n, i) {
  let r = U.readlinkSync(e);
  if (i.dereference && (r = ve.resolve(process.cwd(), r)), t) {
    let o;
    try {
      o = U.readlinkSync(n);
    } catch (a) {
      if (a.code === "EINVAL" || a.code === "UNKNOWN") return U.symlinkSync(r, n);
      throw a;
    }
    if (i.dereference && (o = ve.resolve(process.cwd(), o)), r !== o) {
      if (ge.isSrcSubdir(r, o))
        throw new Error(`Cannot copy '${r}' to a subdirectory of itself, '${o}'.`);
      if (ge.isSrcSubdir(o, r))
        throw new Error(`Cannot overwrite '${o}' with '${r}'.`);
    }
    return or(r, n);
  } else
    return U.symlinkSync(r, n);
}
function or(t, e) {
  return U.unlinkSync(e), U.symlinkSync(t, e);
}
var ar = Gn;
const cr = A.fromPromise;
var Je = {
  copy: cr(Vn),
  copySync: ar
};
const Tt = ue, sr = A.fromCallback;
function lr(t, e) {
  Tt.rm(t, { recursive: !0, force: !0 }, e);
}
function ur(t) {
  Tt.rmSync(t, { recursive: !0, force: !0 });
}
var Pe = {
  remove: sr(lr),
  removeSync: ur
};
const fr = A.fromPromise, Pt = J, It = g, At = V, Ct = Pe, et = fr(async function(e) {
  let n;
  try {
    n = await Pt.readdir(e);
  } catch {
    return At.mkdirs(e);
  }
  return Promise.all(n.map((i) => Ct.remove(It.join(e, i))));
});
function tt(t) {
  let e;
  try {
    e = Pt.readdirSync(t);
  } catch {
    return At.mkdirsSync(t);
  }
  e.forEach((n) => {
    n = It.join(t, n), Ct.removeSync(n);
  });
}
var dr = {
  emptyDirSync: tt,
  emptydirSync: tt,
  emptyDir: et,
  emptydir: et
};
const mr = A.fromPromise, Dt = g, Y = J, jt = V;
async function hr(t) {
  let e;
  try {
    e = await Y.stat(t);
  } catch {
  }
  if (e && e.isFile()) return;
  const n = Dt.dirname(t);
  let i = null;
  try {
    i = await Y.stat(n);
  } catch (r) {
    if (r.code === "ENOENT") {
      await jt.mkdirs(n), await Y.writeFile(t, "");
      return;
    } else
      throw r;
  }
  i.isDirectory() ? await Y.writeFile(t, "") : await Y.readdir(n);
}
function yr(t) {
  let e;
  try {
    e = Y.statSync(t);
  } catch {
  }
  if (e && e.isFile()) return;
  const n = Dt.dirname(t);
  try {
    Y.statSync(n).isDirectory() || Y.readdirSync(n);
  } catch (i) {
    if (i && i.code === "ENOENT") jt.mkdirsSync(n);
    else throw i;
  }
  Y.writeFileSync(t, "");
}
var pr = {
  createFile: mr(hr),
  createFileSync: yr
};
const wr = A.fromPromise, Ot = g, X = J, xt = V, { pathExists: vr } = ie, { areIdentical: Nt } = fe;
async function gr(t, e) {
  let n;
  try {
    n = await X.lstat(e);
  } catch {
  }
  let i;
  try {
    i = await X.lstat(t);
  } catch (a) {
    throw a.message = a.message.replace("lstat", "ensureLink"), a;
  }
  if (n && Nt(i, n)) return;
  const r = Ot.dirname(e);
  await vr(r) || await xt.mkdirs(r), await X.link(t, e);
}
function Sr(t, e) {
  let n;
  try {
    n = X.lstatSync(e);
  } catch {
  }
  try {
    const o = X.lstatSync(t);
    if (n && Nt(o, n)) return;
  } catch (o) {
    throw o.message = o.message.replace("lstat", "ensureLink"), o;
  }
  const i = Ot.dirname(e);
  return X.existsSync(i) || xt.mkdirsSync(i), X.linkSync(t, e);
}
var $r = {
  createLink: wr(gr),
  createLinkSync: Sr
};
const Q = g, he = J, { pathExists: kr } = ie, br = A.fromPromise;
async function Er(t, e) {
  if (Q.isAbsolute(t)) {
    try {
      await he.lstat(t);
    } catch (o) {
      throw o.message = o.message.replace("lstat", "ensureSymlink"), o;
    }
    return {
      toCwd: t,
      toDst: t
    };
  }
  const n = Q.dirname(e), i = Q.join(n, t);
  if (await kr(i))
    return {
      toCwd: i,
      toDst: t
    };
  try {
    await he.lstat(t);
  } catch (o) {
    throw o.message = o.message.replace("lstat", "ensureSymlink"), o;
  }
  return {
    toCwd: t,
    toDst: Q.relative(n, t)
  };
}
function _r(t, e) {
  if (Q.isAbsolute(t)) {
    if (!he.existsSync(t)) throw new Error("absolute srcpath does not exist");
    return {
      toCwd: t,
      toDst: t
    };
  }
  const n = Q.dirname(e), i = Q.join(n, t);
  if (he.existsSync(i))
    return {
      toCwd: i,
      toDst: t
    };
  if (!he.existsSync(t)) throw new Error("relative srcpath does not exist");
  return {
    toCwd: t,
    toDst: Q.relative(n, t)
  };
}
var Fr = {
  symlinkPaths: br(Er),
  symlinkPathsSync: _r
};
const Rt = J, Tr = A.fromPromise;
async function Pr(t, e) {
  if (e) return e;
  let n;
  try {
    n = await Rt.lstat(t);
  } catch {
    return "file";
  }
  return n && n.isDirectory() ? "dir" : "file";
}
function Ir(t, e) {
  if (e) return e;
  let n;
  try {
    n = Rt.lstatSync(t);
  } catch {
    return "file";
  }
  return n && n.isDirectory() ? "dir" : "file";
}
var Ar = {
  symlinkType: Tr(Pr),
  symlinkTypeSync: Ir
};
const Cr = A.fromPromise, Z = g, q = J, { mkdirs: Dr, mkdirsSync: jr } = V, { symlinkPaths: Or, symlinkPathsSync: xr } = Fr, { symlinkType: Nr, symlinkTypeSync: Rr } = Ar, { pathExists: Lr } = ie, { areIdentical: Lt } = fe;
async function Wr(t, e, n) {
  let i;
  try {
    i = await q.lstat(e);
  } catch {
  }
  if (i && i.isSymbolicLink()) {
    let s;
    if (Z.isAbsolute(t))
      s = await q.stat(t);
    else {
      const d = Z.dirname(e), c = Z.join(d, t);
      try {
        s = await q.stat(c);
      } catch {
        s = await q.stat(t);
      }
    }
    const m = await q.stat(e);
    if (Lt(s, m)) return;
  }
  const r = await Or(t, e);
  t = r.toDst;
  const o = await Nr(r.toCwd, n), a = Z.dirname(e);
  return await Lr(a) || await Dr(a), q.symlink(t, e, o);
}
function Mr(t, e, n) {
  let i;
  try {
    i = q.lstatSync(e);
  } catch {
  }
  if (i && i.isSymbolicLink()) {
    let s;
    if (Z.isAbsolute(t))
      s = q.statSync(t);
    else {
      const d = Z.dirname(e), c = Z.join(d, t);
      try {
        s = q.statSync(c);
      } catch {
        s = q.statSync(t);
      }
    }
    const m = q.statSync(e);
    if (Lt(s, m)) return;
  }
  const r = xr(t, e);
  t = r.toDst, n = Rr(r.toCwd, n);
  const o = Z.dirname(e);
  return q.existsSync(o) || jr(o), q.symlinkSync(t, e, n);
}
var Ur = {
  createSymlink: Cr(Wr),
  createSymlinkSync: Mr
};
const { createFile: nt, createFileSync: rt } = pr, { createLink: it, createLinkSync: ot } = $r, { createSymlink: at, createSymlinkSync: ct } = Ur;
var Br = {
  // file
  createFile: nt,
  createFileSync: rt,
  ensureFile: nt,
  ensureFileSync: rt,
  // link
  createLink: it,
  createLinkSync: ot,
  ensureLink: it,
  ensureLinkSync: ot,
  // symlink
  createSymlink: at,
  createSymlinkSync: ct,
  ensureSymlink: at,
  ensureSymlinkSync: ct
};
function Jr(t, { EOL: e = `
`, finalEOL: n = !0, replacer: i = null, spaces: r } = {}) {
  const o = n ? e : "";
  return JSON.stringify(t, i, r).replace(/\n/g, e) + o;
}
function qr(t) {
  return Buffer.isBuffer(t) && (t = t.toString("utf8")), t.replace(/^\uFEFF/, "");
}
var qe = { stringify: Jr, stripBom: qr };
let le;
try {
  le = ue;
} catch {
  le = de;
}
const Ie = A, { stringify: Wt, stripBom: Mt } = qe;
async function Vr(t, e = {}) {
  typeof e == "string" && (e = { encoding: e });
  const n = e.fs || le, i = "throws" in e ? e.throws : !0;
  let r = await Ie.fromCallback(n.readFile)(t, e);
  r = Mt(r);
  let o;
  try {
    o = JSON.parse(r, e ? e.reviver : null);
  } catch (a) {
    if (i)
      throw a.message = `${t}: ${a.message}`, a;
    return null;
  }
  return o;
}
const Hr = Ie.fromPromise(Vr);
function Yr(t, e = {}) {
  typeof e == "string" && (e = { encoding: e });
  const n = e.fs || le, i = "throws" in e ? e.throws : !0;
  try {
    let r = n.readFileSync(t, e);
    return r = Mt(r), JSON.parse(r, e.reviver);
  } catch (r) {
    if (i)
      throw r.message = `${t}: ${r.message}`, r;
    return null;
  }
}
async function Gr(t, e, n = {}) {
  const i = n.fs || le, r = Wt(e, n);
  await Ie.fromCallback(i.writeFile)(t, r, n);
}
const Kr = Ie.fromPromise(Gr);
function zr(t, e, n = {}) {
  const i = n.fs || le, r = Wt(e, n);
  return i.writeFileSync(t, r, n);
}
var Xr = {
  readFile: Hr,
  readFileSync: Yr,
  writeFile: Kr,
  writeFileSync: zr
};
const Ee = Xr;
var Qr = {
  // jsonfile exports
  readJson: Ee.readFile,
  readJsonSync: Ee.readFileSync,
  writeJson: Ee.writeFile,
  writeJsonSync: Ee.writeFileSync
};
const Zr = A.fromPromise, xe = J, Ut = g, Bt = V, ei = ie.pathExists;
async function ti(t, e, n = "utf-8") {
  const i = Ut.dirname(t);
  return await ei(i) || await Bt.mkdirs(i), xe.writeFile(t, e, n);
}
function ni(t, ...e) {
  const n = Ut.dirname(t);
  xe.existsSync(n) || Bt.mkdirsSync(n), xe.writeFileSync(t, ...e);
}
var Ve = {
  outputFile: Zr(ti),
  outputFileSync: ni
};
const { stringify: ri } = qe, { outputFile: ii } = Ve;
async function oi(t, e, n = {}) {
  const i = ri(e, n);
  await ii(t, i, n);
}
var ai = oi;
const { stringify: ci } = qe, { outputFileSync: si } = Ve;
function li(t, e, n) {
  const i = ci(e, n);
  si(t, i, n);
}
var ui = li;
const fi = A.fromPromise, B = Qr;
B.outputJson = fi(ai);
B.outputJsonSync = ui;
B.outputJSON = B.outputJson;
B.outputJSONSync = B.outputJsonSync;
B.writeJSON = B.writeJson;
B.writeJSONSync = B.writeJsonSync;
B.readJSON = B.readJson;
B.readJSONSync = B.readJsonSync;
var di = B;
const mi = J, st = g, { copy: hi } = Je, { remove: Jt } = Pe, { mkdirp: yi } = V, { pathExists: pi } = ie, lt = fe;
async function wi(t, e, n = {}) {
  const i = n.overwrite || n.clobber || !1, { srcStat: r, isChangingCase: o = !1 } = await lt.checkPaths(t, e, "move", n);
  await lt.checkParentPaths(t, r, e, "move");
  const a = st.dirname(e);
  return st.parse(a).root !== a && await yi(a), vi(t, e, i, o);
}
async function vi(t, e, n, i) {
  if (!i) {
    if (n)
      await Jt(e);
    else if (await pi(e))
      throw new Error("dest already exists.");
  }
  try {
    await mi.rename(t, e);
  } catch (r) {
    if (r.code !== "EXDEV")
      throw r;
    await gi(t, e, n);
  }
}
async function gi(t, e, n) {
  return await hi(t, e, {
    overwrite: n,
    errorOnExist: !0,
    preserveTimestamps: !0
  }), Jt(t);
}
var Si = wi;
const qt = ue, Ne = g, $i = Je.copySync, Vt = Pe.removeSync, ki = V.mkdirpSync, ut = fe;
function bi(t, e, n) {
  n = n || {};
  const i = n.overwrite || n.clobber || !1, { srcStat: r, isChangingCase: o = !1 } = ut.checkPathsSync(t, e, "move", n);
  return ut.checkParentPathsSync(t, r, e, "move"), Ei(e) || ki(Ne.dirname(e)), _i(t, e, i, o);
}
function Ei(t) {
  const e = Ne.dirname(t);
  return Ne.parse(e).root === e;
}
function _i(t, e, n, i) {
  if (i) return je(t, e, n);
  if (n)
    return Vt(e), je(t, e, n);
  if (qt.existsSync(e)) throw new Error("dest already exists.");
  return je(t, e, n);
}
function je(t, e, n) {
  try {
    qt.renameSync(t, e);
  } catch (i) {
    if (i.code !== "EXDEV") throw i;
    return Fi(t, e, n);
  }
}
function Fi(t, e, n) {
  return $i(t, e, {
    overwrite: n,
    errorOnExist: !0,
    preserveTimestamps: !0
  }), Vt(t);
}
var Ti = bi;
const Pi = A.fromPromise;
var Ii = {
  move: Pi(Si),
  moveSync: Ti
}, Ai = {
  // Export promiseified graceful-fs:
  ...J,
  // Export extra methods:
  ...Je,
  ...dr,
  ...Br,
  ...di,
  ...V,
  ...Ii,
  ...Ve,
  ...ie,
  ...Pe
};
const j = /* @__PURE__ */ an(Ai);
class H {
  static async selectFolder() {
    const e = await Qt.showOpenDialog({
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
  }
  static async backupFolder(e) {
    const n = g.basename(e), i = g.join(g.dirname(e), `${n}-备份`);
    return await j.copy(e, i), i;
  }
  static async calculateMD5(e) {
    return new Promise((n, i) => {
      const r = on.createHash("md5"), o = j.createReadStream(e);
      o.on("error", i), o.on("data", (a) => r.update(a)), o.on("end", () => n(r.digest("hex")));
    });
  }
  static async splitIntoFolders(e, n, i, r) {
    const o = g.basename(e), a = g.join(g.dirname(e), `${o}-备份`);
    await j.ensureDir(a);
    const s = [], m = [];
    for (let d = 0; d < n.length; d += i)
      m.push(n.slice(d, d + i));
    for (let d = 0; d < m.length; d++) {
      const c = d + 1, l = `${r} - 第${c}组`, u = g.join(a, l);
      await j.ensureDir(u), s.push(u);
      for (const f of m[d]) {
        const h = g.join(u, f.name);
        await j.copy(f.path, h);
      }
    }
    return s;
  }
  static async saveBase64Image(e, n) {
    const i = g.join(process.env.APPDATA || process.env.HOME || "", "gzh-layout", "temp");
    await j.ensureDir(i);
    const r = g.join(i, n), o = e.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!o || o.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const a = me.from(o[2], "base64");
    return await j.writeFile(r, a), r;
  }
  static async createCoverFolder(e) {
    const n = g.join(e, "封面");
    return await j.ensureDir(n), n;
  }
  static async saveCoverImage(e, n, i) {
    await j.ensureDir(e);
    const r = g.join(e, i), o = n.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!o || o.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const a = me.from(o[2], "base64");
    return await j.writeFile(r, a), r;
  }
  static async deleteCoverFolder(e) {
    await j.pathExists(e) && await j.remove(e);
  }
  static async deleteCoverImage(e) {
    await j.pathExists(e) && await j.remove(e);
  }
}
function Ci() {
  p.handle("file:selectFolder", async () => H.selectFolder()), p.handle("file:backupFolder", async (t, e) => H.backupFolder(e)), p.handle("file:calculateMD5", async (t, e) => H.calculateMD5(e)), p.handle("file:splitIntoFolders", async (t, e, n, i, r) => H.splitIntoFolders(e, n, i, r)), p.handle("file:saveBase64Image", async (t, e, n) => H.saveBase64Image(e, n)), p.handle("file:createCoverFolder", async (t, e) => H.createCoverFolder(e)), p.handle("file:saveCoverImage", async (t, e, n, i) => H.saveCoverImage(e, n, i)), p.handle("file:deleteCoverFolder", async (t, e) => H.deleteCoverFolder(e)), p.handle("file:deleteCoverImage", async (t, e) => H.deleteCoverImage(e));
}
let Di = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const ji = 128;
let ne, ae;
function Oi(t) {
  !ne || ne.length < t ? (ne = Buffer.allocUnsafe(t * ji), Ge.getRandomValues(ne), ae = 0) : ae + t > ne.length && (Ge.getRandomValues(ne), ae = 0), ae += t;
}
function xi(t = 21) {
  Oi(t |= 0);
  let e = "";
  for (let n = ae - t; n < ae; n++)
    e += Di[ne[n] & 63];
  return e;
}
const Ni = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
class Ri {
  static async scanImagesInFolder(e) {
    const n = await j.readdir(e), i = [];
    let r = 0;
    for (const o of n) {
      const a = g.join(e, o), s = await j.stat(a);
      if (!s.isFile()) continue;
      const m = g.extname(o).toLowerCase();
      if (Ni.includes(m))
        try {
          i.push({
            id: xi(),
            name: o,
            path: a,
            size: s.size,
            width: 1920,
            height: 1080,
            format: m.replace(".", ""),
            enabled: !0,
            isCover: !1,
            order: r++
          });
        } catch (d) {
          console.error("图片解析失败:", a, d);
        }
    }
    return i;
  }
}
function Li() {
  p.handle("image:scanFolder", async (t, e) => e ? Ri.scanImagesInFolder(e) : []);
}
class Wi {
  constructor() {
    $e(this, "dbPath");
    $e(this, "data");
    const e = ye.getPath("userData");
    this.dbPath = g.join(e, "gzh-layout.json"), this.data = this.loadFromFile();
  }
  loadFromFile() {
    if (de.existsSync(this.dbPath))
      try {
        const e = de.readFileSync(this.dbPath, "utf-8"), n = JSON.parse(e);
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
      de.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
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
    const n = this.data.projects.findIndex((i) => i.projectId === e.projectId);
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
    const n = this.data.templates.findIndex((i) => i.id === e.id);
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
    const n = this.data.coverTemplates.findIndex((i) => i.id === e.id);
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
    const n = this.data.wechatAccounts.findIndex((i) => i.id === e.id);
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
const D = new Wi();
function Mi() {
  p.handle("db:init", async () => (await D.init(), { success: !0 })), p.handle("db:getAllProjects", () => D.getAllProjects()), p.handle("db:getProject", (t, e) => D.getProject(e)), p.handle("db:saveProject", (t, e) => (D.saveProject(e), { success: !0 })), p.handle("db:deleteProject", (t, e) => (D.deleteProject(e), { success: !0 })), p.handle("db:getAllTemplates", () => D.getAllTemplates()), p.handle("db:saveTemplate", (t, e) => (D.saveTemplate(e), { success: !0 })), p.handle("db:deleteTemplate", (t, e) => (D.deleteTemplate(e), { success: !0 })), p.handle("db:getAllCoverTemplates", () => D.getAllCoverTemplates()), p.handle("db:saveCoverTemplate", (t, e) => (D.saveCoverTemplate(e), { success: !0 })), p.handle("db:deleteCoverTemplate", (t, e) => (D.deleteCoverTemplate(e), { success: !0 })), p.handle("db:getAllWechatAccounts", () => D.getAllWechatAccounts()), p.handle("db:getWechatAccount", (t, e) => D.getWechatAccount(e)), p.handle("db:getActiveWechatAccount", () => D.getActiveWechatAccount()), p.handle("db:saveWechatAccount", (t, e) => (D.saveWechatAccount(e), { success: !0 })), p.handle("db:setActiveWechatAccount", (t, e) => (D.setActiveWechatAccount(e), { success: !0 })), p.handle("db:deleteWechatAccount", (t, e) => (D.deleteWechatAccount(e), { success: !0 }));
}
const K = "https://api.weixin.qq.com", Ui = 300, Bi = "----WechatFormBoundary";
function Ji() {
  return `${Bi}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function ft(t, e, n, i) {
  const r = Ji(), o = me.from(
    `--${r}\r
Content-Disposition: form-data; name="${t}"; filename="${e}"\r
Content-Type: ${i}\r
\r
`,
    "utf-8"
  ), a = me.from(`\r
--${r}--\r
`, "utf-8");
  return {
    body: me.concat([o, n, a]),
    contentType: `multipart/form-data; boundary=${r}`,
    boundary: r
  };
}
class qi {
  constructor() {
    $e(this, "tokenCache", null);
  }
  async getAccessToken(e, n) {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now())
      return this.tokenCache.accessToken;
    const i = `${K}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(e)}&secret=${encodeURIComponent(n)}`, o = await (await fetch(i)).json();
    if (o.errcode)
      throw new Error(`获取AccessToken失败 [${o.errcode}]: ${o.errmsg}`);
    return this.tokenCache = {
      accessToken: o.access_token,
      expiresAt: Date.now() + (o.expires_in - Ui) * 1e3
    }, o.access_token;
  }
  clearTokenCache() {
    this.tokenCache = null;
  }
  getTokenCacheInfo() {
    return this.tokenCache;
  }
  async getAccountInfo(e) {
    const n = `${K}/cgi-bin/getcallbackip?access_token=${e}`, r = await (await fetch(n)).json();
    if (r.errcode)
      throw new Error(`Token 校验失败 [${r.errcode}]: ${r.errmsg}`);
    const o = `${K}/cgi-bin/account/getaccountbasicinfo?access_token=${e}`, s = await (await fetch(o, { method: "POST" })).json();
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
    const i = await this.getAccessToken(e, n), r = this.tokenCache, o = Math.floor((r.expiresAt - Date.now()) / 1e3), a = await this.getAccountInfo(i);
    return {
      success: !0,
      accessToken: i,
      expiresIn: o,
      accountInfo: a
    };
  }
  async verifyToken(e) {
    const n = `${K}/cgi-bin/getcallbackip?access_token=${e}`;
    return !(await (await fetch(n)).json()).errcode;
  }
  async uploadCoverImage(e, n) {
    const i = await j.readFile(n), r = g.basename(n), o = g.extname(r).toLowerCase(), s = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" }[o] || "image/jpeg", { body: m, contentType: d } = ft("media", r, i, s), c = `${K}/cgi-bin/material/add_material?access_token=${e}&type=image`, u = await (await fetch(c, {
      method: "POST",
      headers: { "Content-Type": d },
      body: new Uint8Array(m)
    })).json();
    if (u.errcode)
      throw new Error(`上传封面图失败 [${u.errcode}]: ${u.errmsg}`);
    return { mediaId: u.media_id, url: u.url };
  }
  async uploadContentImage(e, n) {
    const i = await j.readFile(n), r = g.basename(n), o = g.extname(r).toLowerCase(), s = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" }[o] || "image/jpeg", { body: m, contentType: d } = ft("media", r, i, s), c = `${K}/cgi-bin/media/uploadimg?access_token=${e}`, u = await (await fetch(c, {
      method: "POST",
      headers: { "Content-Type": d },
      body: new Uint8Array(m)
    })).json();
    if (u.errcode)
      throw new Error(`上传正文图片失败 (${r}) [${u.errcode}]: ${u.errmsg}`);
    return { originalPath: n, url: u.url };
  }
  async batchUploadContentImages(e, n, i, r, o) {
    const a = [];
    for (let s = 0; s < n.length; s++) {
      i == null || i({
        currentArticleIndex: r ?? 0,
        totalArticles: o ?? 1,
        step: "images",
        message: `正在上传正文图片 ${s + 1}/${n.length}...`
      });
      const m = await this.uploadContentImage(e, n[s]);
      a.push(m), s < n.length - 1 && await this.delay(300);
    }
    return a;
  }
  async createDraft(e, n) {
    const i = {
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
    }, r = `${K}/cgi-bin/draft/add?access_token=${e}`, a = await (await fetch(r, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i)
    })).json();
    if (a.errcode)
      throw new Error(`创建草稿失败 [${a.errcode}]: ${a.errmsg}`);
    return a.media_id;
  }
  async publishDraft(e, n) {
    const i = { media_id: n }, r = `${K}/cgi-bin/freepublish/submit?access_token=${e}`, a = await (await fetch(r, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i)
    })).json();
    if (a.errcode)
      throw new Error(`发布草稿失败 [${a.errcode}]: ${a.errmsg}`);
    return a.publish_id;
  }
  buildArticleHtml(e, n) {
    const i = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(e)}</section>`, r = n.map((o) => `<p><img src="${o}" data-src="${o}" style="max-width:100%;display:block;margin:0 auto;"></p>`).join(`
`);
    return i + r;
  }
  calculateCropParams(e = 2.35) {
    const n = "0_0_1_1", r = (1 - 1 / e) / 2, o = r.toFixed(6), a = (1 - r).toFixed(6), s = `${o}_0_${a}_1`;
    return { pic_crop_235_1: n, pic_crop_1_1: s };
  }
  delay(e) {
    return new Promise((n) => setTimeout(n, e));
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const I = new qi();
function Vi() {
  p.handle("wechat:getAccessToken", async (t, e, n) => I.getAccessToken(e, n)), p.handle("wechat:clearTokenCache", async () => {
    I.clearTokenCache();
  }), p.handle("wechat:getAccountInfo", async (t, e) => I.getAccountInfo(e)), p.handle("wechat:authenticate", async (t, e, n) => I.authenticate(e, n)), p.handle("wechat:verifyToken", async (t, e) => I.verifyToken(e)), p.handle("wechat:getTokenCacheInfo", async () => I.getTokenCacheInfo()), p.handle("wechat:uploadCoverImage", async (t, e, n) => I.uploadCoverImage(e, n)), p.handle("wechat:uploadContentImage", async (t, e, n) => I.uploadContentImage(e, n)), p.handle("wechat:batchUploadContentImages", async (t, e, n) => I.batchUploadContentImages(e, n)), p.handle("wechat:createDraft", async (t, e, n) => I.createDraft(e, n)), p.handle("wechat:publishDraft", async (t, e, n) => I.publishDraft(e, n)), p.handle("wechat:buildArticleHtml", async (t, e, n) => I.buildArticleHtml(e, n)), p.handle("wechat:calculateCropParams", async (t, e) => I.calculateCropParams(e)), p.handle("wechat:batchUpload", async (t, e) => {
    const { appId: n, appSecret: i, articles: r, publish: o = !1 } = e, a = [], s = t.sender, m = (d) => {
      try {
        s.isDestroyed() || s.send("wechat:uploadProgress", d);
      } catch {
      }
    };
    try {
      m({
        currentArticleIndex: 0,
        totalArticles: r.length,
        step: "token",
        message: "正在获取 AccessToken..."
      });
      let d;
      if (i)
        d = await I.getAccessToken(n, i);
      else {
        const c = I.getTokenCacheInfo();
        if (c && c.expiresAt > Date.now())
          d = c.accessToken;
        else
          throw new Error("AccessToken 已过期，请重新鉴权");
      }
      for (let c = 0; c < r.length; c++) {
        const l = r[c];
        m({
          currentArticleIndex: c,
          totalArticles: r.length,
          step: "cover",
          message: `[${c + 1}/${r.length}] 正在上传封面图...`
        });
        const u = await I.uploadCoverImage(d, l.coverImagePath);
        m({
          currentArticleIndex: c,
          totalArticles: r.length,
          step: "images",
          message: `[${c + 1}/${r.length}] 正在上传正文图片 (${l.contentImagePaths.length} 张)...`
        });
        const f = await I.batchUploadContentImages(
          d,
          l.contentImagePaths,
          (E) => m({ ...E, currentArticleIndex: c, totalArticles: r.length }),
          c,
          r.length
        );
        m({
          currentArticleIndex: c,
          totalArticles: r.length,
          step: "draft",
          message: `[${c + 1}/${r.length}] 正在创建草稿...`
        });
        const h = f.map((E) => E.url);
        let w;
        if (l.contentHtml) {
          w = l.contentHtml;
          for (let E = 0; E < f.length; E++) {
            const x = f[E].originalPath, te = f[E].url;
            w = w.split(x).join(te);
          }
        } else
          w = I.buildArticleHtml(l.title, h);
        const S = await I.createDraft(d, {
          title: l.title,
          thumbMediaId: u.mediaId,
          author: l.author,
          digest: l.digest,
          content: w,
          picCrop2351: l.picCrop2351,
          picCrop11: l.picCrop11
        }), k = {
          title: l.title,
          draftMediaId: S,
          coverUrl: u.url
        };
        o && (m({
          currentArticleIndex: c,
          totalArticles: r.length,
          step: "publish",
          message: `[${c + 1}/${r.length}] 正在发布草稿...`
        }), k.publishId = await I.publishDraft(d, S)), a.push(k), c < r.length - 1 && await new Promise((E) => setTimeout(E, 500));
      }
      return m({
        currentArticleIndex: r.length,
        totalArticles: r.length,
        step: "done",
        message: `全部完成！共处理 ${r.length} 篇文章。`
      }), { success: !0, results: a };
    } catch (d) {
      const c = d instanceof Error ? d.message : String(d);
      return m({
        currentArticleIndex: a.length,
        totalArticles: r.length,
        step: "done",
        message: `上传失败: ${c}`
      }), { success: !1, error: c, results: a };
    }
  });
}
const Ht = ee.dirname(Zt(import.meta.url));
process.env.APP_ROOT = ee.join(Ht, "..");
const Re = process.env.VITE_DEV_SERVER_URL, ao = ee.join(process.env.APP_ROOT, "dist-electron"), Yt = ee.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Re ? ee.join(process.env.APP_ROOT, "public") : Yt;
let z;
function Gt() {
  z = new dt({
    width: 1400,
    height: 900,
    icon: ee.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: ee.join(Ht, "preload.mjs"),
      webSecurity: !1
    }
  }), z.webContents.on("did-finish-load", () => {
    z == null || z.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Re ? z.loadURL(Re) : z.loadFile(ee.join(Yt, "index.html"));
}
ye.on("window-all-closed", () => {
  process.platform !== "darwin" && (ye.quit(), z = null);
});
ye.on("activate", () => {
  dt.getAllWindows().length === 0 && Gt();
});
ye.whenReady().then(async () => {
  await D.init(), Gt(), Ci(), Li(), Mi(), Vi();
});
export {
  ao as MAIN_DIST,
  Yt as RENDERER_DIST,
  Re as VITE_DEV_SERVER_URL
};
