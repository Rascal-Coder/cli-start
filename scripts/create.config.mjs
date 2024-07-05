import path from "path";
import fs from "fs";
import { getPath, checkProjectName } from "../utils/index.mjs";
import chalk from "chalk";
const [, , ...args] = process.argv;

const packagesPath = getPath("../packages");
const templatePath = getPath("../template");
const buildConfigPath = getPath("../scripts/build.config.mjs");
const tsConfigPath = getPath("../tsconfig.json");

// 复制模板文件
const copyFileSync = ({ templatePath, projectPath, projectName }) => {
  const stats = fs.statSync(templatePath);

  // 判断是否是文件夹
  if (stats.isDirectory()) {
    // 递归创建 packagesPath 的子目录和文件
    fs.mkdirSync(projectPath, { recursive: true });
    for (const file of fs.readdirSync(templatePath)) {
      copyFileSync({
        templatePath: path.resolve(templatePath, file),
        projectPath: path.resolve(projectPath, file),
        projectName,
      });
    }
    return;
  }

  if (path.basename(templatePath) === "package.json") {
    const pkg = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
    pkg.name = `@ras-cli/${projectName}`;
    fs.writeFileSync(projectPath, JSON.stringify(pkg, null, 2) + "\n");
    return;
  }

  if (path.basename(templatePath) === "tsconfig.json") {
    const tsconfig = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
    tsconfig.extends = "../../tsconfig.json";
    fs.writeFileSync(projectPath, JSON.stringify(tsconfig, null, 2) + "\n");
    return;
  }

  fs.copyFileSync(templatePath, projectPath);
};

// 更新 build-config.mjs
const updateBuildConfig = (buildConfigPath, projectName) => {
  const config = fs.readFileSync(buildConfigPath, "utf-8");
  const aliasEntry = `{ find: '@', replacement: '../packages/${projectName}/src' }`;

  if (!config.includes(aliasEntry)) {
    const modifiedConfig = config.replace(
      /alias\(\{([\s\S]*?)entries:\s*\[([\s\S]*?)\]\s*\}\)/,
      (match, p1, p2) => {
        const entries = `\n            ${aliasEntry}, ${p2}`;
        return `alias({${p1}entries: [${entries}]})`;
      }
    );
    fs.writeFileSync(buildConfigPath, modifiedConfig);
  }
};

// 更新 rollup.config.js
const updateRollupConfig = (projectName) => {
  const rollupConfigPath = getPath(
    `../packages/${projectName}/rollup.config.js`
  );
  const config = fs.readFileSync(rollupConfigPath, "utf-8");
  const modifiedConfig = config.replace("demo", `@ras-cli/${projectName}`);
  fs.writeFileSync(rollupConfigPath, modifiedConfig);
};

// 更新 tsconfig.json
const updateTsConfig = (tsConfigPath, projectName) => {
  let config = fs.readFileSync(tsConfigPath, "utf-8");
  const aliasEntry = `"./packages/${projectName}/src/*"`;

  const includeRegex = /"include":\s*\[([\s\S]*?)\]/;
  const includeMatch = includeRegex.exec(config);
  if (includeMatch && !includeMatch[1].includes(aliasEntry)) {
    const includeValue = includeMatch[1];
    const modifiedIncludeValue = `${aliasEntry}, ${includeValue}`;
    config = config.replace(
      includeRegex,
      `"include": [${modifiedIncludeValue}]`
    );
  }
  const atPathsRegex = /"@\/\*": \[\s*(.*?)\]/s;
  const atPathsMatch = atPathsRegex.exec(config);
  if (atPathsMatch && !atPathsMatch[1].includes(aliasEntry)) {
    const atPathsValue = atPathsMatch[1];
    const modifiedAtPathsValue = `${aliasEntry}, ${atPathsValue}`;
    config = config.replace(atPathsRegex, `"@/*": [${modifiedAtPathsValue}]`);
  }

  fs.writeFileSync(tsConfigPath, config);
};

const create = async ({ templatePath, packagesPath, projectName }) => {
  const projectPath = getPath(`${packagesPath}/${projectName}`);
  if (!checkProjectName(projectName)) {
    console.log(chalk.red("项目名称存在非法字符，请重新输入"));
    return;
  }
  if (fs.existsSync(projectPath)) {
    console.log(chalk.yellow(`已有 ${projectName} 项目，请勿重复创建！`));
    return;
  }
  copyFileSync({ templatePath, projectPath, projectName });
  updateBuildConfig(buildConfigPath, projectName);
  updateTsConfig(tsConfigPath, projectName);
  updateRollupConfig(projectName);
  console.log(chalk.green(`创建 ${projectName} 项目成功！`));
};

create({ templatePath, packagesPath, projectName: args[0] });
