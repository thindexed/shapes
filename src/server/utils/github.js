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

  commitFile: function(githubPath, message, base64Content){
    if(GITHUB_TOKEN === null) {
      console.log('Upload of Shapes to the Repo is not possible due of missing GITHUB_TOKEN environment variable.')
      return
    }

    let repoData ={
      owner:GITHUB_ORG,
      repo:GITHUB_REPO,
      path: path.join('src', "shapes", githubPath)
    }

    return new Promise((resolve, reject) => {
      octo.repos.getContent(repoData)
        .then( (res) => {
          octo.repos.createOrUpdateFileContents(Object.assign(repoData, {
            sha: res.data.sha,
            message: message,
            content: base64Content
          }))
          .then( res => { resolve(res) })
          .catch( error => {reject(error)})
        })
        .catch( (error) => {
          octo.repos.createOrUpdateFileContents(Object.assign(repoData, {
            message: message,
            content: base64Content
          }))
          .then( res => { resolve(res) })
          .catch( error => {reject(error) })
        })
    });
  }
}
