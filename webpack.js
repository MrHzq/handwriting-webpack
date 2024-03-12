/**
 * 功能设计：
 * 1. 找到主入口，即 src/index.js 文件，然后加载进来(getFileInfo(path) -> fileContent)
 * 2. 解析主入口的内容(parseFile(fileContent))，找到所有依赖，形成依赖关系(createDependencyMap(AST) -> dependencyMap)
 * 3. 根据依赖关系，加载对应文件，复用 getFileInfo 方法
 */

// 主入口路径变量，目前写死
const entry = "./src/index.js";

// path 模块，获取文件路径
const path = require("path");

// fs 模块，读取文件内容
const fs = require("fs");

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

const entryFileContent = getFileInfo(entry);

// @babel/parser 解析文件内容
const parser = require("@babel/parser");

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

const entryFileContentAST = parseFile(entryFileContent);

const traverse = require("@babel/traverse").default;
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

  console.log("[ dependencyMap ] >", dependencyMap);

  return dependencyMap;
}

createDependencyMap(entryFileContentAST);
