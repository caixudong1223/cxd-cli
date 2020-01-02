const { name, version } = require('../../package.json')
const path = require('path')

// const configFile = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.cxdrc`; // 配置文件的存储位置 

const configFile = `${path.join(__dirname, '../../.cxdrc')}`

module.exports = {
    name,
    version,
    configFile
}