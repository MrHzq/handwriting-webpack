/**
 * 功能设计：
 * 1. 找到主入口，即 src/index.js 文件，然后加载进来(getFileInfo(path) -> fileContent)
 * 2. 解析主入口的内容(parseFile(fileContent))，找到所有依赖，形成依赖关系(createDependencyMap(AST) -> dependencyMap)
 * 3. 在将 AST 转换成低版本的 JS 代码，(generateCode(AST))
 * 4. 基于依赖关系图，去加载对应的所有文件，(loadModules(dependencyMap))
 */

// 主入口路径变量，目前写死
const entry = "./src/index.js";

// path 模块，获取文件路径
const path = require("path");

// fs 模块，读取文件内容
const fs = require("fs");

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
    const dependencyMap = {};

    // 遍历抽象语法树（AST）
    traverse(ast, {
      ImportDeclaration({ node }) {
        const { value } = node.source; // 从 AST 中获取到导入的相对文件路径

        const dirname = path.dirname(entry); // 获取存放主入口文件的文件名

        const abspath = "./" + path.join(dirname, value); // 拼接出每个导入文件的绝对路径

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

const entryModuleInfo = getModuleInfo(entry);

function loadModules(dependencyMap) {
  const modules = [];
  for (let key in dependencyMap) {
    modules.push(getModuleInfo(dependencyMap[key]));
  }
  return modules;
}

const allModules = [entryModuleInfo].concat(loadModules(entryModuleInfo.deps));

console.log("[ allModules ] >", allModules);
