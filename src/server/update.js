const path = require('path')

const { Octokit } = require("@octokit/rest")

let octo = null

const GITHUB_ORG = process.env.GITHUB_ORG || 'thindexed'
const GITHUB_REPO = process.env.GITHUB_REPO || 'shapes'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null

if(GITHUB_TOKEN === null) {
  console.log('Upload of Shapes to the Repo is not possible due of missing GITHUB_TOKEN environment variable.')
}
else {
  octo = new Octokit({
    auth: GITHUB_TOKEN,
  })
}

module.exports = {

  commitShape: function(githubPath, message, content){
    if(GITHUB_TOKEN === null) {
      console.log('Upload of Shapes to the Repo is not possible due of missing GITHUB_TOKEN environment variable.')
      return
    }

    message = message || "-empty-"
    content = Buffer.from(content).toString("base64")

    let repoData ={
      owner:GITHUB_ORG,
      repo:GITHUB_REPO,
      path: path.join('src', "shapes", githubPath)
    }

    console.log(repoData)
    octo.repos.getContent(repoData)
      .then( (res) => {
        octo.repos.createOrUpdateFileContents(Object.assign(repoData, {
          sha: res.data.sha,
          message: message,
          content: content
        }))
        .catch( error => {
          console.log(error)
        })
      })
      .catch( (error) => {
        console.log(error)
        octo.repos.createOrUpdateFileContents(Object.assign(repoData, {
          message: message,
          content: content
        }))
        .catch( error => {
          console.log(error)
        })
      })
  }
}
