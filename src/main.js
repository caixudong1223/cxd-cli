// 入口文件
const program = require("commander");
const path = require("path");
// 动态获取版本号
const { version } = require("./utils/constants");

// 根据我们想要实现的功能配置执行动作，遍历产生对应的命令
const actionsMap = {
  create: {
    //创建模板
    description: "create project",
    alias: "cr",
    examples: ["cxd-cli create <template-name>"]
  },
  config: {
    // 配置配置文件
    description: "config info",
    alias: "c",
    examples: ["cxd-cli config get <k>", "cxd-cli config set <k> <v>"]
  },
  "*": { description: "command not found" }
};

// 循环创建命令
Object.keys(actionsMap).forEach(action => {
  program
    .command(action)
    .alias(actionsMap[action].alias)
    .description(actionsMap[action].description)
    .action(() => {
      console.log(action);
      // 动作
      if (action === "*") {
        // 如果动作没匹配到说明输入有误
        console.log(acitonMap[action].description);
      } else {
        // 引用对应的动作文件 将参数传入
        require(path.resolve(__dirname, action))(...process.argv.slice(3));
      }
    });
});

program.on("--help", () => {
  console.log("Examples");
  Object.keys(actionsMap).forEach(action => {
    (actionsMap[action].examples || []).forEach(example => {
      console.log(` ${example}`);
    });
  });
});

program.version(version).parse(process.argv);
