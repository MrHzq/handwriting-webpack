(function (modulesMap) {
  function require(path) {
    function absRequire(absPath) {
      return require(modulesMap[path].deps[absPath]);
    }

    var exports = {};

    (function (require, exports, code) {
      eval(code);
    })(absRequire, exports, modulesMap[path].code);

    return exports;
  }
  require("./src/index.js");
})({
  "./src/index.js": {
    path: "./src/index.js",
    deps: { "./add.js": "./src/add.js", "./minus.js": "./src/minus.js" },
    code: '"use strict";\n\nvar _add = _interopRequireDefault(require("./add.js"));\nvar _minus = require("./minus.js");\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }\nvar sum = (0, _add["default"])(1, 2);\nvar division = (0, _minus.minus)(2, 1);\nconsole.log("[ add(1, 2) ] >", sum);\nconsole.log("[ minus(2, 1) ] >", division);',
  },
  "./src/add.js": {
    path: "./src/add.js",
    deps: null,
    code: '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports["default"] = void 0;\nvar _default = exports["default"] = function _default(a, b) {\n  return a + b;\n};',
  },
  "./src/minus.js": {
    path: "./src/minus.js",
    deps: null,
    code: '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports.minus = void 0;\nvar minus = exports.minus = function minus(a, b) {\n  return a - b;\n};',
  },
});
