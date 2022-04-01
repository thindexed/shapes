const mv = require('mv');
const fs = require('fs-extra')
const glob = require("glob")
const path = require('path')
const makeDir = require('make-dir');
const sanitize = require("./sanitize-filepath");
const { resolve } = require('path');

// Generic file operations for "brains" and "shapes"
//
module.exports = {

  listFiles: function (baseDir, subDir, res=null) {
    return new Promise((resolve, reject)=>{
      let listDir = path.join(baseDir, subDir)

      if (listDir !== sanitize(listDir)) {
        res?.status(403).send('Unable to read image')
        reject("'sanitize' directory name is different from original directory name")
        return
      }
  
      // a directory must always end with a trailing "/"
      if(!listDir.endsWith(path.sep))
        listDir = listDir+path.sep
  
      // a directory must always end with a trailing "/"
      if(!subDir.endsWith(path.sep))
        subDir = subDir+path.sep
  
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
      if (listDir !== path.normalize(listDir)) {
        res?.status(403).send('Unable to list file')
        reject("'listDir' path with dots")
        return
      }
  
      glob(listDir + "*", {}, (error, files) => {
        if(error) {
          reject(error)
        }
        else {
          res?.setHeader('Content-Type', 'application/json')
          res?.send(JSON.stringify({
            files: files.map(function (f) {
              let isDir = fs.lstatSync(f).isDirectory()
              return {
                name: path.basename(f),
                filePath: f.replace(baseDir, ""),
                folder: subDir,
                type: isDir ? "dir" : "file",
                dir: isDir
              }
            })
          }))
          resolve()
        }
      })
    })
  },

  getJSONFile: function (baseDir, subDir, res=null) {
    return new Promise((resolve, reject) => {
      let file = path.join(baseDir, subDir)
    
      if (file !== sanitize(file)) {
        res?.status(403).send('Unable to read file')
        reject("'sanitize' filepath is different from the original")
        return
      }
  
      if (file !== path.normalize(file)) {
        res?.status(403).send('Unable to read file')
        reject("'toDir' path with dots")
        return
      }
  
      file = path.normalize(file)
      if(!file.startsWith(baseDir)){
        res?.status(403).send('Unable to read file')
        reject("'subDir' isn't below baseDir")
        return
      }
  
      if (!fs.existsSync(file)) {
        res?.status(404).send('Not found')
        reject("not found")
        return
      }
  
      try {
        let readStream = fs.createReadStream(file)
        res?.setHeader('Content-Type', 'application/json')
        readStream.pipe(res)
        resolve()
      } catch (exc) {
        reject(exc)
        res?.status(404).send('Not found')
      }
    })
  },

  getBinaryFile: function (baseDir, subDir, res=null) {
    return new Promise(()=>{
      let file = path.join(baseDir, subDir)

      if (file !== sanitize(file)) {
        res?.status(403).send('Unable to read image')
        reject("'sanitize' filepath is different from the original")
        return
      }
  
      if (file !== path.normalize(file)) {
        res?.status(403).send('Unable to read image')
        reject("'toDir' path with dots")
        return
      }
  
      file = path.normalize(file)
      if(!file.startsWith(baseDir)){
        res?.status(403).send('Unable to read image')
        reject("'subDir' isn't below baseDir")
        return
      }
  
      if (!fs.existsSync(file)) {
        res?.status(404).send('Not found')
        reject()
        return
      }
      try {
         if(fs.existsSync(file)) {
          fs.readFile(file, (err, data) => {
            res?.writeHead(200, {'Content-Type': 'image/png'})
            res?.end(data)
          })
        }else {
          fs.readFile(file, (err, data) => {
            let json = JSON.parse(data)
            if (!json.image) {
              res?.status(404).send('Not found')
              reject()
              return
            }
            let base64data = json.image.replace(/^data:image\/png;base64,/, '')
            let img = Buffer.from(base64data, 'base64')
            res?.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': img.length
            })
            res?.end(img)
            resolve(img)
          })
        }
      } catch (exc) {
        res?.status(404).send('Not found')
        reject()
      }
    })
  },


  /**
   * Rename a file or directory.
   *
   * @param baseDir
   * @param from
   * @param to
   * @param res
   */
  renameFile: function (baseDir, from, to, res=null) {
    return new Promise( (resolve, reject) => {
      to = sanitize(to)

      let fromDir = path.join(baseDir, from)
      let toDir = path.join(baseDir, to)
      let fromDirParent = path.dirname(fromDir)
      let toDirParent = path.dirname(toDir)
  
      if (fromDir !== sanitize(fromDir)) {
        res?.status(403).send('Unable to rename image')
        reject("'sanitize' fromDir is different from the original")
        return
      }
  
      // "from" must be exists
      if (!fs.existsSync(fromDir)) {
        res?.status(403).send('Unable to rename file')
        reject("'from' didn't exists")
        return
      }
  
      // check that the normalize path is the same the concatenated. It is possible the these are not the same
      // if the "from" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
      if (fromDir !== path.normalize(fromDir)) {
        res?.status(403).send('Unable to rename file')
        reject("'fromDir' path with dots")
        return
      }
  
      if (toDir !== path.normalize(toDir)) {
        res?.status(403).send('Unable to rename file')
        reject("'toDir' path with dots")
        return
      }
  
      // "from" and "to" directory must have the same parent directory. It is not allowed to move a directory out
      // of the tree with a rename operation
      if (fromDirParent !== toDirParent) {
        res?.status(403).send('Unable to rename file')
        reject("moving files out of parent directory is not allowed")
        return
      }
  
      if (fs.existsSync(toDir)) {
        res?.status(403).send('Unable to rename file')
        reject("'toDir' already exists")
        return
      }
  
      mv(fromDir, toDir, err => {
        if (err) {
          reject(err)
        }
        else {
          let isDir = fs.lstatSync(toDir).isDirectory()
          res?.send({
            name: path.basename(to),
            filePath: to,
            folder:  path.dirname(to),
            type: isDir ? "dir" : "file",
            dir: isDir
          })
          resolve()
        }
      })
    })
  },


  /**
   * Delete a file or directory
   *
   * @param dataDirectory
   * @param fileRelativePath
   * @param res
   */
  deleteFile: function (dataDirectory, fileRelativePath, res=null) {
    return new Promise( (resolve, reject) => {
      let fileAbsolutePath = path.join(dataDirectory, fileRelativePath)
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
  
      if (fileAbsolutePath !== sanitize(fileAbsolutePath)) {
        res?.status(403).send('Unable to delete file')
        reject("'sanitize' file name is different from the original")
        return
      }
  
      if (fileAbsolutePath !== path.normalize(fileAbsolutePath)) {
        res?.status(403).send('Unable to delete file')
        reject("'file' path with dots")
        return
      }
  
      fileAbsolutePath = path.normalize(fileAbsolutePath)
      if(!fileAbsolutePath.startsWith(dataDirectory)){
        res?.status(403).send('Unable to delete image')
        reject("'subDir' isn't below baseDir")
        return
      }
  
      fs.unlink(fileAbsolutePath, err => {
        if (err) {
          // maybe a directory
          fs.removeSync(fileAbsolutePath)
        }
        resolve(fileRelativePath)
        res?.send('true')
      })
    })
  },



  createFolder: function (baseDir, subDir, res=null) {
    return new Promise((resolve, reject) => {
      let directory = path.join(baseDir, subDir)

      if (directory !== sanitize(directory)) {
        res?.status(403).send('Unable to create folder')
        reject("'sanitize' directory name is different from the original")
        return
      }
  
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
      if (directory !== path.normalize(directory)) {
        console.log()
        res?.status(403).send('Unable to create folder')
        reject("'directory' path with dots")
        return
      }
  
      directory = path.normalize(directory)
      if(!directory.startsWith(baseDir)){
        res?.status(403).send('Unable to delete image')
        reject("'subDir' isn't below baseDir")
        return
      }
  
      makeDir(directory)
        .then(() => {
          res?.send({
            name: path.basename(directory),
            filePath: directory,
            folder:  path.dirname(directory),
            type: "dir",
            dir: true
          })
          resolve()
        })
        .catch(() => {
          res?.status(403).send('Unable to create directory')
          reject('Unable to create directory')
        })
    })
  },


  writeFile: async function (baseDir, fileRelativePath, content, res=null) {
    return new Promise(async(resolve, reject) => {
      fileRelativePath =  sanitize(fileRelativePath)

      let fileAbsolutePath = path.join(baseDir, fileRelativePath)
      let fileDirectory = path.dirname(fileAbsolutePath)+path.sep
  
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
      if (fileAbsolutePath !== path.normalize(fileAbsolutePath)) {
        res?.status(403).send('Unable to write file')
        reject("'file' path with dots")
        return
      }
  
      // normalize path must be below the parent directory
      //
      fileDirectory = path.normalize(fileDirectory)
      if(!fileDirectory.startsWith(baseDir)){
        res?.status(403).send('Unable to write file')
        reject("'dir' path is out of baseDir")
        return
      }
  
      if (!fs.existsSync(fileDirectory)) {
        await makeDir(fileDirectory)
      }
  
      fs.writeFile(fileAbsolutePath, content, err => {
        if (err)  {
          reject(err)
          res?.status(403).send('Unable to write file')
        }
        else {
          resolve(fileRelativePath)
          res?.setHeader('Content-Type', 'application/json')
          res?.send({
            name: path.basename(fileRelativePath),
            filePath: fileRelativePath,
            folder:  path.dirname(fileRelativePath),
            type: "file",
            dir: false
          })
        }
      })
    })
  }
}

