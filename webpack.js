/**
 * 功能设计：
 * 1. 找到主入口，即 src/index.js 文件，然后加载进来(getFileInfo(path) -> fileContent)
 * 2. 解析主入口的内容(parseFile(fileContent))，找到所有依赖，形成依赖关系(createDependencyMap(AST) -> dependencyMap)
 * 3. 在将 AST 转换成低版本的 JS 代码，(generateCode(AST))
 * 4. 基于依赖关系图，去加载对应的所有文件(loadModules(dependencyMap))，然后转为对象结构(createModuleMap(dependencyMap))
 * 5. 处理上下文，注入 reqiure、exports 这两个变量的具体功能(handleContext(moduleMap))
 */

// 主入口路径变量，目前写死
const entry = "./src/index.js";
const output = { path: "_dist", filename: "bundle.js" };

// path 模块，获取文件路径
const path = require("path");

// fs 模块，读取文件内容
const fs = require("fs-extra");

// @babel/parser 解析文件内容
const parser = require("@babel/parser");

// @babel/traverse 遍历抽象语法树（AST）
const traverse = require("@babel/traverse").default;

// @babel/generator 将 AST 转换成代码字符串
const babelCore = require("@babel/core");

/**
 * 获取模块信息
 *
 * @param _path 文件路径
 * @returns 包含文件路径、依赖关系图和生成代码的对象
 */
function getModuleInfo(_path) {
  /**
   * 获取文件信息
   *
   * @param path 文件路径
   * @returns 返回文件内容
   */
  function getFileInfo(path) {
    // 使用 fs.readFileSync 方法同步读取文件内容
    return fs.readFileSync(path, "utf-8");
  }

  /**
   * 解析文件内容并返回抽象语法树（AST）
   *
   * @param fileContent 文件内容
   * @returns 抽象语法树（AST）
   */
  function parseFile(fileContent) {
    // 解析文件内容，生成抽象语法树（AST）
    const ast = parser.parse(fileContent, {
      sourceType: "module", // 要解析的模块是 ESM
    });
    // 返回抽象语法树（AST）
    return ast;
  }

  /**
   * 创建依赖关系图
   *
   * @param ast 抽象语法树
   * @returns 依赖关系图
   */
  function createDependencyMap(ast) {
    // 创建依赖关系图
    let dependencyMap = null;

    // 遍历抽象语法树（AST）
    traverse(ast, {
      ImportDeclaration({ node }) {
        const { value } = node.source; // 从 AST 中获取到导入的相对文件路径

        const dirname = path.dirname(entry); // 获取存放主入口文件的文件名

        const abspath = "./" + path.join(dirname, value); // 拼接出每个导入文件的绝对路径

        if (!dependencyMap) dependencyMap = {};

        dependencyMap[value] = abspath; // 添加到依赖关系图
      },
    });

    return dependencyMap;
  }

  /**
   * 生成代码
   *
   * @param ast AST 对象
   * @returns 返回生成的代码字符串
   */
  function generateCode(ast) {
    // 使用 Babel 将抽象语法树（AST）转换为可执行的 JavaScript 代码
    const { code } = babelCore.transformFromAst(ast, null, {
      presets: ["@babel/preset-env"], // 指定转译的语法
    });

    // 返回生成的代码
    return code;
  }

  const _pathFileContent = getFileInfo(_path);
  const _pathFileContentAST = parseFile(_pathFileContent);
  const _pathFileDepsMap = createDependencyMap(_pathFileContentAST);
  const _pathFileCode = generateCode(_pathFileContentAST);

  return { path: _path, deps: _pathFileDepsMap, code: _pathFileCode };
}

/**
 * 解析模块信息
 *
 * @param moduleInfo 模块信息
 * @returns 返回模块路径为键，模块对象为值的映射表
 */
function parseModules(moduleInfo) {
  /**
   * 加载模块
   *
   * @param dependencyMap 模块依赖映射表
   * @returns 返回加载的模块数组
   */
  function loadModules(dependencyMap) {
    const modules = [];

    // 如果dependencyMap为空，则返回一个空数组
    if (!dependencyMap) return [];

    // 遍历dependencyMap的每一个key
    for (let key in dependencyMap) {
      // 获取模块信息
      const _moduleInfo = getModuleInfo(dependencyMap[key]);
      // 将模块信息添加到modules数组中
      modules.push(_moduleInfo);
      // 如果模块信息中存在依赖，则递归加载依赖模块，并将加载的依赖模块添加到modules数组中
      if (_moduleInfo.deps) modules.push(...loadModules(_moduleInfo.deps));
    }

    // 返回加载的模块数组
    return modules;
  }

  /**
   * 创建模块映射表
   *
   * @param modules 模块数组
   * @returns 返回模块路径为键，模块对象为值的映射表
   */
  function createModuleMap(modules) {
    // 使用reduce方法遍历modules数组，并返回一个对象
    return modules.reduce((modulesMap, module) => {
      // 将module对象按照path属性作为键，module对象作为值存储到modulesMap对象中
      modulesMap[module.path] = module;
      // 返回更新后的modulesMap对象
      return modulesMap;
      // 初始值为一个空对象
    }, {});
  }

  // 加载入口模块，并递归加载依赖模块
  const modulesArray = [moduleInfo].concat(loadModules(moduleInfo.deps));
  return createModuleMap(modulesArray);
}

const entryModuleInfo = getModuleInfo(entry);

const allModulesMap = parseModules(entryModuleInfo);

/**
 * 处理上下文，生成一个函数，该函数接受一个模块映射对象作为参数，
 * 并返回一个立即执行函数表达式，该函数内部定义了一个 require 函数，
 * 用于根据模块路径加载模块并执行模块代码，最后返回模块的导出对象。
 *
 * @param modulesMap 模块映射对象，键为模块路径，值为模块对象，
 * 模块对象包含两个属性：deps（依赖数组）和 code（模块代码字符串）。
 * @returns 返回一个立即执行函数表达式的字符串形式。
 */
function handleContext(modulesMap) {
  const modulesMapString = JSON.stringify(modulesMap);
  return `(function (modulesMap) {
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
    require('${entry}');
  })(${modulesMapString});`;
}

/**
 * 创建输出文件
 *
 * @param _output 输出文件路径和文件名
 * @param codeString 要写入的代码字符串
 */
function createOutPutFiles(_output, codeString) {
  function createFolder(path) {
    // 判断目录是否存在，如果存在则删除
    const isExist = fs.existsSync(path);
    if (isExist) fs.removeSync(path);

    // 创建目录
    fs.mkdirSync(path);
  }

  /**
   * 创建HTML文件
   *
   * @param path 文件路径
   * @param scriptSrc 脚本源路径
   */
  function createHTML(path, scriptSrc) {
    const htmlName = "index.html";
    // HTML 内容的字符串
    const htmlContent = fs.readFileSync(htmlName, "utf-8");

    // 找到合适的插入点，这里假设在 body 结束前插入
    const insertPointPattern = /<\/body>/i;
    const insertionPoint = htmlContent.search(insertPointPattern);

    if (insertionPoint !== -1) {
      // 创建 script 标签列表
      const scriptTags = `<script src="./${scriptSrc}"></script>`;

      // 插入 script 标签到 HTML 内容中
      const newHtmlContent = `${htmlContent.slice(0, insertionPoint)}
  ${scriptTags}
${htmlContent.slice(insertionPoint)}`;

      // 创建 html 文件
      const htmlPath = path + "/" + htmlName;
      fs.writeFileSync(htmlPath, newHtmlContent);
    }
  }

  const { path, filename } = _output;
  // 创建 输出目录
  createFolder(path);
  // 创建 bundle.js 文件
  fs.writeFileSync(path + "/" + filename, codeString);
  // 创建 index.html 文件
  createHTML(path, filename);
}

// 最终生成的 bundle.js 的代码字符串
const bundle_js_code_string = handleContext(allModulesMap);
createOutPutFiles(output, bundle_js_code_string);
