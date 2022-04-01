const path = require('path')
var Octokat = require('octokat');

let octokat = null
let repo = null

const GITHUB_ORG = process.env.GITHUB_ORG || 'thindexed'
const GITHUB_REPO = process.env.GITHUB_REPO || 'shapes'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'

if(GITHUB_TOKEN === null) {
  console.log('Upload of Shapes to the Repo is not possible due of missing GITHUB_TOKEN environment variable.')
}
else {
  octokat = new Octokat({ token: GITHUB_TOKEN});
  repo = octokat.repos(GITHUB_ORG, GITHUB_REPO);
}

function fetchHead() {
  return repo.git.refs.heads(GITHUB_BRANCH).fetch();
}

function fetchTree() {
  return fetchHead().then(function(commit) {
    head = commit;
    return repo.git.trees(commit.object.sha).fetch();
  });
}

module.exports = {

  commit: function(files, message) {
    return Promise.all(files.map(function(file) {
      return repo.git.blobs.create({
        content: file.content,
        encoding: 'base64'
      });
    })).then(function(blobs) {
      return fetchTree().then(function(tree) {
        return repo.git.trees.create({
          tree: files.map(function(file, index) {
            return {
              path: path.join('src', "data",file.path),
              mode: '100644',
              type: 'blob',
              sha: blobs[index].sha
            };
          }),
          base_tree: tree.sha
        });
      });
    }).then(function(tree) {
      return repo.git.commits.create({
        message: message,
        tree: tree.sha,
        parents: [ head.object.sha ]
      });
    }).then(function(commit) {
      return repo.git.refs.heads(GITHUB_BRANCH).update({
        sha: commit.sha
      });
    });
  },

  delete: function(files, message) {
    return fetchTree()
      .then((tree) => {
        console.log(tree)
        return repo.git.trees.create({
          tree: files.map(function(file) {
            return {
              path: path.join('src', "data",file.path),
              mode: '100644',
              type: 'blob',
              sha: null
            };
          }),
          base_tree: tree.sha
        });
      })
      .then((tree) => {
        return repo.git.commits.create({
          message: message,
          tree: tree.sha,
          parents: [ head.object.sha ]
        });
      })
      .then((commit) => {
        return repo.git.refs.heads(GITHUB_BRANCH).update({
          sha: commit.sha
        });
      })
  }

}
