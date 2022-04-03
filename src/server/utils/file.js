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
        reject(`'sanitize' directory name (${listDir}) is different from original directory name`)
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
        reject(`'${listDir}' path with dots`)
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
        reject(`'sanitize' filepath (${file}) is different from the original`)
        return
      }
  
      if (file !== path.normalize(file)) {
        res?.status(403).send('Unable to read file')
        reject(`'${file}' path with dots`)
        return
      }
  
      file = path.normalize(file)
      if(!file.startsWith(baseDir)){
        res?.status(403).send('Unable to read file')
        reject(`'${file}' path is not below base dir`)
        return
      }
  
      if (!fs.existsSync(file)) {
        res?.status(404).send('Not found')
        reject(`'${file}' not found`)
        return
      }
  
      try {
        let readStream = fs.createReadStream(file)
        res?.setHeader('Content-Type', 'application/json')
        readStream.pipe(res)
        resolve()
      } catch (exc) {
        reject(exc)
        res?.status(404).send(`'${file}' not found`)
      }
    })
  },

  getBinaryFile: function (baseDir, subDir, res=null) {
    return new Promise((resolve, reject)=>{
      let file = path.join(baseDir, subDir)

      if (file !== sanitize(file)) {
        res?.status(403).send('Unable to read image')
        reject(`sanitized file path '${file}' is different thant original file path`)
        return
      }
  
      if (file !== path.normalize(file)) {
        res?.status(403).send('Unable to read image')
        reject(`normalized path of '${file}' is different than original`)
        return
      }
  
      file = path.normalize(file)
      if(!file.startsWith(baseDir)){
        res?.status(403).send('Unable to read image')
        reject(`'${file}' isn't below base directory`)
        return
      }
  
      if (!fs.existsSync(file)) {
        res?.status(404).send('Not found')
        reject(`'${file}' not found`)
        return
      }
      try {
        let pngFile = file.replace(".shape",".png").replace(".brain",".png")
        if(fs.existsSync(pngFile)) {
          res?.sendFile(pngFile)
          resolve()
        }else {
          fs.readFile(file, (err, data) => {
            let json = JSON.parse(data)
            if (!json.image) {
              res?.status(404).send('Not found')
              reject(`'${file}' not found`)
              return
            }
            let base64data = json.image.replace(/^data:image\/png;base64,/, '')
            let img = Buffer.from(base64data, 'base64')
            res?.writeHead(200, {
              'Content-Type': 'image/png',
              'Content-Length': img.length
            })
            res?.end(img)
            resolve()
          })
        }
      } catch (exc) {
        res?.status(404).send(`not found`)
        reject(`'${file}' not found`)
      }
    })
  },


  /**
   * Rename a file or directory.
   *
   * @param baseDir
   * @param fromRelativePath
   * @param toRelativePath
   * @param res
   */
  renameFile: function (baseDir, fromRelativePath, toRelativePath, res=null) {
    return new Promise( (resolve, reject) => {
      try {
        toRelativePath = sanitize(toRelativePath)

        let fromAbsolutePath = path.join(baseDir, fromRelativePath)
        let toAbsolutePath = path.join(baseDir, toRelativePath)
        let fromAbsoluteDir = path.dirname(fromAbsolutePath)
        let toAbsoluteDir = path.dirname(toAbsolutePath)
    
        if (fromAbsolutePath !== sanitize(fromAbsolutePath)) {
          res?.status(403).send('Unable to rename image')
          reject(`sanitized filepath '${fromAbsolutePath}' is different than the original file`)
          return
        }
    
        // "from" must be exists
        if (!fs.existsSync(fromAbsolutePath)) {
          res?.status(403).send('Unable to rename file')
          reject(`'${fromAbsolutePath}' not found`)
          return
        }
    
        // check that the normalize path is the same the concatenated. It is possible the these are not the same
        // if the "from" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
        if (fromAbsolutePath !== path.normalize(fromAbsolutePath)) {
          res?.status(403).send('Unable to rename file')
          reject(`normalized path of '${fromAbsolutePath}' is not equals to original filepath`)
          return
        }
    
        if (toAbsolutePath !== path.normalize(toAbsolutePath)) {
          res?.status(403).send('Unable to rename file')
          reject(`normalized path of '${toAbsolutePath}' is not equals to original filepath`)
          return
        }
    
        // "from" and "to" directory must have the same parent directory. It is not allowed to move a directory out
        // of the tree with a rename operation
        if (fromAbsoluteDir !== toAbsoluteDir) {
          res?.status(403).send('Unable to rename file')
          reject("moving files out of parent directory is not allowed")
          return
        }
    
        if (fs.existsSync(toAbsolutePath)) {
          res?.status(403).send('Unable to rename file')
          reject(`'${toAbsolutePath}' not found`)
          return
        }
    
        mv(fromAbsolutePath, toAbsolutePath, err => {
          if (err) {
            console.log(err)
            reject(err)
          }
          else {
            let isDir = fs.lstatSync(toAbsolutePath).isDirectory()
            res?.send({
              name: path.basename(toRelativePath),
              filePath: toRelativePath,
              folder:  path.dirname(toRelativePath),
              type: isDir ? "dir" : "file",
              dir: isDir
            })
            resolve({fromRelativePath, toRelativePath, isDir})
          }
        })
      }
      catch(error){
        reject(error)
      }
    })
  },


  /**
   * Delete a file or directory
   *
   * @param dataDirectory
   * @param fileRelativePath
   * @param res
   */
  delete: function (dataDirectory, fileRelativePath, res=null) {
    return new Promise( (resolve, reject) => {
      let fileAbsolutePath = path.join(dataDirectory, fileRelativePath)
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
  
      if (fileAbsolutePath !== sanitize(fileAbsolutePath)) {
        res?.status(403).send('Unable to delete file')
        reject(`sanitized filepath '${fileAbsolutePath}' is different than the original file`)
        return
      }
  
      if (fileAbsolutePath !== path.normalize(fileAbsolutePath)) {
        res?.status(403).send('Unable to delete file')
        reject(`normalized path of '${fileAbsolutePath}' is not equals to original filepath`)
        return
      }
  
      fileAbsolutePath = path.normalize(fileAbsolutePath)
      if(!fileAbsolutePath.startsWith(dataDirectory)){
        res?.status(403).send('Unable to delete image')
        reject(`'${fileAbsolutePath}' isn't below data directory`)
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
      let directoryRelativePath = path.join(baseDir, subDir)

      if (directoryRelativePath !== sanitize(directoryRelativePath)) {
        res?.status(403).send('Unable to create folder')
        reject(`sanitized filepath '${directoryRelativePath}' is different than the original file`)
        return
      }
  
      // check that the normalize path is the same as the concatenated. It is possible that these are not the same
      // if the "subDir" contains dots like "/dir1/dir2/../../". It is a file path attack via API calls
      if (directoryRelativePath !== path.normalize(directoryRelativePath)) {
        console.log()
        res?.status(403).send('Unable to create folder')
        reject(`normalized path of '${directoryRelativePath}' is not equals to original filepath`)
        return
      }
  
      directoryRelativePath = path.normalize(directoryRelativePath)
      if(!directoryRelativePath.startsWith(baseDir)){
        res?.status(403).send('Unable to delete image')
        reject(`'${directoryRelativePath}' isn't below data directory`)
        return
      }
  
      makeDir(directoryRelativePath)
        .then(() => {
          res?.send({
            name: path.basename(directoryRelativePath),
            filePath: directoryRelativePath,
            folder:  path.dirname(directoryRelativePath),
            type: "dir",
            dir: true
          })
          resolve(directoryRelativePath)
        })
        .catch(( error) => {
          res?.status(403).send('Unable to create directory')
          reject(error)
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
        reject(`normalized path of '${fileAbsolutePath}' is not equals to original filepath`)
        return
      }
  
      // normalize path must be below the parent directory
      //
      fileDirectory = path.normalize(fileDirectory)
      if(!fileDirectory.startsWith(baseDir)){
        res?.status(403).send('Unable to write file')
        reject(`'${fileDirectory}' isn't below data directory`)
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

