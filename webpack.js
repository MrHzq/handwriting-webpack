/**
 * 功能设计：
 * 1. 找到主入口，即 src/index.js 文件，然后加载进来(getFileInfo(path) -> fileContent)
 * 2. 解析主入口的内容(parseFile(fileContent))，找到所有依赖，形成依赖关系
 * 3. 根据依赖关系，加载对应文件，复用 getFileInfo 方法
 */

// fs 模块，读取文件内容
const fs = require("fs");

// 主入口路径变量，目前写死
const entry = "./src/index.js";

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

console.log("[ getFileInfo(entry) ] >", getFileInfo(entry));
