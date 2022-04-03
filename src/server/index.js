#!/usr/bin/env node
const fs = require('fs-extra')

const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const generator = require("./thumbnails")
const persistence = require("./utils/file")
const github = require('./utils/github')

const dataAbsoluteDirectory = path.normalize(__dirname + '/../data/')
const dataRelativeDirectory = "src/data/"

const PORT = process.env.PORT || 8080


// Tell the bodyparser middleware to accept more data
//
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

function ensureAdminLoggedIn(options) {
  return function (req, res, next) {
    let role = req.get("x-role")
    if ( role !== "admin") {
      res.status(401).send('string')
      return
    }
    next();
  }
}

// =======================================================================
//
// The main HTTP Server and socket.io run loop. Serves the HTML files
// and the socket.io access point to change/read the GPIO pins if the server
// is running on an Raspberry Pi
//
// =======================================================================
async function  runServer() {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use('/shapes/global', express.static(dataAbsoluteDirectory));


  // TODO: migrate to REST service API
  app.get('/shapes/global/list', (req, res) => {
    persistence.listFiles(dataAbsoluteDirectory, req.query.path, res)
    .catch( exception => {
      console.log(exception)
    })
  })
  
  app.get('/shapes/global/get', (req, res) => {
    persistence.getJSONFile(dataAbsoluteDirectory, req.query.filePath, res)
    .catch( exception => {
      console.log(exception)
    }) 
  })

  app.get('/shapes/global/image', (req, res) =>  { 
    persistence.getBinaryFile(dataAbsoluteDirectory, req.query.filePath, res)
    .catch( error => {
      console.log(error)
    })
  })


  app.post('/shapes/global/delete', ensureAdminLoggedIn(), (req, res) => {
    let fileRelativePath = req.body.filePath
    let isDir = fs.lstatSync(path.join(dataAbsoluteDirectory,fileRelativePath)).isDirectory()
    if(isDir) {
      persistence.delete(dataAbsoluteDirectory, fileRelativePath)
        .then( (sanitizedRelativePath) => {
          let githubPath =  path.join(dataRelativeDirectory, sanitizedRelativePath)
          return github.deleteDirectory( githubPath , "-delete directory-")
        })
        .then( () => {
          res.send("ok")
          generator.generateShapeIndex(dataAbsoluteDirectory)
        })
        .catch( (error) => {
          console.log(error)
          res.status(403).send("error")
        })
    }
    else{
      let files = [fileRelativePath,
        fileRelativePath.replace(".shape", ".js"),
        fileRelativePath.replace(".shape", ".md"),
        fileRelativePath.replace(".shape", ".custom"),
        fileRelativePath.replace(".shape", ".png")
      ]
      let promisses = files.map( file => persistence.delete(dataAbsoluteDirectory, file))
      Promise.allSettled(promisses)
        .then( (sanitizedRelativePaths ) => {
          console.log(sanitizedRelativePaths)
          github.delete( files.map( file => { return {path: path.join(dataRelativeDirectory, file)} }), "-empty-")
          res.send("ok")
          generator.generateShapeIndex(dataAbsoluteDirectory)
        })
        .catch( () => {
          res.status(403).send("error")
        })
    }
  })

  app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => {
    persistence.renameFile(dataAbsoluteDirectory, req.body.from, req.body.to, res)
    .then( ( {fromRelativePath, toRelativePath, isDir}) => {
      fromRelativePath =  path.join(dataRelativeDirectory, fromRelativePath)
      toRelativePath =  path.join(dataRelativeDirectory, toRelativePath)

      if(isDir ){
        github.renameDirectory(fromRelativePath, toRelativePath, "-rename-").catch( error => { console.log(error)})
      }
      else {
        let fromFiles = [
          fromRelativePath,
          fromRelativePath.replace(".shape", ".js"),
          fromRelativePath.replace(".shape", ".md"),
          fromRelativePath.replace(".shape", ".custom"),
          fromRelativePath.replace(".shape", ".png")
        ]
        let toFiles = [
          toRelativePath,
          toRelativePath.replace(".shape", ".js"),
          toRelativePath.replace(".shape", ".md"),
          toRelativePath.replace(".shape", ".custom"),
          toRelativePath.replace(".shape", ".png")
        ]
        github.renameFiles(fromFiles, toFiles, "-rename-").catch( error => { console.log(error)})
      }
      generator.generateShapeIndex(dataAbsoluteDirectory)
    })
    .catch( reason => {
      console.log(reason)
    })
  })
  
  app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => {
    persistence.createFolder(dataAbsoluteDirectory, req.body.filePath, res)
    .then( (directoryRelativePath) => {
      console.log(directoryRelativePath)
      // create file into empty directory. Otherwise the directory is not stored in github.
      // (github prunes empty directories)
      return github.commit([ {path:path.join(directoryRelativePath, "placeholder.txt"), content:"-placeholder for empty directories-"} ], "folder creation")
    })
    .catch( error => {
      console.log(error)
    })
  })

  app.post('/shapes/global/save', ensureAdminLoggedIn(),  (req, res) => {
    let shapeRelativePath = req.body.filePath
    let content = req.body.content
    let reason = req.body.commitMessage || "-empty-"
    persistence.writeFile(dataAbsoluteDirectory, shapeRelativePath, content, res)
      .then((sanitizedRelativePath)=>{
        return generator.thumbnail(dataAbsoluteDirectory, sanitizedRelativePath, content)
      })
      .then( (files) => {
        github.commit(files.map( file => { return {path: path.join(dataRelativeDirectory, file)} }), reason)
      })
      .catch( reason => {
        console.log(reason)
      })
  })
  

  http.listen(PORT, function () {
    console.log("============================================================================")
    console.log('| System is up and running on http://localhost:'+PORT+'/                    ');
    console.log("============================================================================")
  });
}

generator.generateShapeIndex(dataAbsoluteDirectory)
runServer()
