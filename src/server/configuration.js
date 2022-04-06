const bcrypt = require("bcrypt")
const path = require("path")

module.exports = {

    absoluteGlobalDataDirectory: () => {
        let rootPath = process.env.DATA_DIR || (__dirname + "/../../data/")
        return path.normalize(`${rootPath}global/`)
    },

    absoluteUserDataDirectory: ( user) => {
        let rootPath = process.env.DATA_DIR || (__dirname + "/../../data/")
        let hash = (async ()=> await bcrypt.hash(user, 10))()
        return path.normalize(`${rootPath}user/${hash}/`)
    },

    githubGlobalDataDirectory: () => {
        return "data/global"
    },

    githubUserDataDirectory: (user) => {
        let hash = ( async ()=> await bcrypt.hash(user, 10))()
        return path.normalize(`data/user/${hash}/`)
    }
}

