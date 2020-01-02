// 创建项目
const axios = require("axios");
const ora = require("ora");
const Inquirer = require("inquirer");
const { promisify } = require("util");
const path = require("path");
const MetalSmith = require("metalsmith"); // 遍历文件夹
let { render } = require("consolidate").ejs;
const fs = require("fs");
const config = require('../config');

let downLoadGit = require("download-git-repo");
let ncp = require("ncp");

render = promisify(render); // 包装渲染方法
ncp = promisify(ncp);
downLoadGit = promisify(downLoadGit); //node中已经帮你提供了一个现成的方法，将异步的api可以快速转化成promise的形式～


const repoUrl = config('getVal', 'repo');

//获取仓库列表
const fetchRepoList = async () => {
  // 获取当前组织中的所有仓库信息,这个仓库中存放的都是项目模板
  let reposUrl = `https://api.github.com/orgs/${repoUrl}/repos`;
  const { data } = await axios.get(reposUrl);
  return data;
};

const fetchTagList = async repo => {
  const { data } = await axios.get(
    `https://api.github.com/repos/${repoUrl}/${repo}/tags`

  );
  return data;
};

const wrapFetchAddLoding = (fn, message) => async (...args) => {
  const spinner = ora(message);
  spinner.start(); // 开始loading
  const r = await fn(...args);
  spinner.succeed(); // 结束loading
  return r;
};

// const download = async (repo, tag, downloadDirectory) => {
//   let api = `cxd-cli/${repo}`
//   if(tag) {
//     api += `#${tag}`
//   }
//   const dest = `${downloadDirectory}/${repo}`; // 将模板下载到对应的目录中
//   await downLoadGit(api, dest);

//   return dest; // 返回下载目录
// }

module.exports = async projectName => {
  let repos = await wrapFetchAddLoding(fetchRepoList, "fetching repo list")();
  const { repo } = await Inquirer.prompt({
    name: "repo",
    type: "list",
    message: "please choice repo template to create project",
    choices: repos // 选择模式
  });

  // 获取版本信息

  let tags = await wrapFetchAddLoding(fetchTagList, "fetching tag list")(repo);
  const { tag } = await Inquirer.prompt({
    name: "tag",
    type: "list",
    message: "please choice repo template to create project",
    choices: tags
  });

  console.log(tag);

  const downloadDirectory = `${
    process.env[process.platform === "darwin" ? "HOME" : "USERPROFILE"]
  }/.template`;

  // 由于系统的不同目录获取方式不一
  // 样, process.platform 在windows下获取的是 win32 我这里是mac 所有获取的值是 darwin ,在根据
  // 对应的环境变量获取到用户目录
  // download(repo, tag, downloadDirectory)

  const download = async (repo, tag) => {
    let api = `zhu-cli/${repo}`; // 下载项目
    if (tag) {
      api += `#${tag}`;
    }
    const dest = `${downloadDirectory}/${repo}`; // 将模板下载到对应的目录中
    await downLoadGit(api, dest);
    return dest; // 返回下载目录
  };

  // 下载项目
  const target = await wrapFetchAddLoding(download, "download template")(
    repo,
    tag
  );

  console.log("target===" + target);

  if (!fs.existsSync(path.join(target, "ask.js"))) {
    // 将下载的文件拷贝到当前执行命令的目录下
    await ncp(target, path.join(path.resolve(), projectName));
  } else {
    await new Promise((resolve, reject) => {
      MetalSmith(__dirname)
        .source(target) // 遍历下载的目录
        .destination(path.join(path.resolve(), projectName)) // 输出渲染后的结果
        .use(async (files, metal, done) => {
          // 弹框询问用户
          const result = await Inquirer.prompt(
            require(path.join(target, "ask.js"))
          );
          const data = metal.metadata();
          Object.assign(data, result); // 将询问的结果放到metadata中保证在下一个中间件中 可以获取到
          delete files["ask.js"];
          done();
        })
        .use((files, metal, done) => {
          Reflect.ownKeys(files).forEach(async file => {
            let content = files[file].contents.toString(); // 获取文件中的内容
            if (file.includes(".js") || file.includes(".json")) {
              // 如果是js或者 json才有可能是模板
              if (content.includes("<%")) {
                // 文件中用<% 我才需要编译
                content = await render(content, metal.metadata()); // 用数据渲染模板
                files[file].contents = Buffer.from(content); // 渲染好的结果替换即可
              }
            }
          });

          done();
        })
        .build(err => {
          // 执行中间件
          if (!err) {
            resolve();
          } else {
            reject();
          }
        });
    });
  }
};
