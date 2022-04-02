#!/usr/bin/env node
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const generator = require("./thumbnails")
const persistence = require("./utils/file")
const github = require('./utils/github')

const dataDirectory = path.normalize(__dirname + '/../data/')

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
  app.use('/shapes/global', express.static(dataDirectory));


  // TODO: migrate to REST service API
  app.get('/shapes/global/list', (req, res) => persistence.listFiles(dataDirectory, req.query.path, res))
  app.get('/shapes/global/get', (req, res) => persistence.getJSONFile(dataDirectory, req.query.filePath, res))

  app.get('/shapes/global/image', (req, res) =>  { 
    persistence.getBinaryFile(dataDirectory, req.query.filePath, res)
    .catch( error => {
      console.log(error)
    })
  })


  app.post('/shapes/global/delete', ensureAdminLoggedIn(), (req, res) => {
    let files = [req.body.filePath,
      req.body.filePath.replace(".shape", ".js"),
      req.body.filePath.replace(".shape", ".md"),
      req.body.filePath.replace(".shape", ".custom"),
      req.body.filePath.replace(".shape", ".png")
    ]
    let promisses = files.map( file => persistence.deleteFile(dataDirectory, file))
    Promise.allSettled(promisses)
      .then( () => {
        github.delete( files.map( file => { return {path: path.join('src', "data", file)} }), "-empty-")
        res.send("ok")
        generator.generateShapeIndex(dataDirectory)
      })
      .catch( () => {
        res.status(403).send("error")
      })
  })

  app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => {
    persistence.renameFile(dataDirectory, req.body.from, req.body.to, res)
    .then( ( {fromRelativePath, toRelativePath, isDir}) => {
      fromRelativePath =  path.join('src', "data", fromRelativePath)
      toRelativePath =  path.join('src', "data", toRelativePath)

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
      generator.generateShapeIndex(dataDirectory)
    })
    .catch( reason => {
      console.log(reason)
    })
  })
  
  app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => persistence.createFolder(dataDirectory, req.body.filePath, res))
  app.post('/shapes/global/save', ensureAdminLoggedIn(),  (req, res) => {
    let shapeRelativePath = req.body.filePath
    let content = req.body.content
    let reason = req.body.commitMessage || "-empty-"
    persistence.writeFile(dataDirectory, shapeRelativePath, content, res)
      .then((sanitizedRelativePath)=>{
        return generator.thumbnail(dataDirectory, sanitizedRelativePath, content)
      })
      .then( (files) => {
        github.commit(files.map( file => { return {path: path.join('src', "data", file)} }), reason)
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

generator.generateShapeIndex(dataDirectory)
runServer()
