#!/usr/bin/env node
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const generator = require("./generator")
const github = require("./utils/github")
const {createFolder, renameFile, deleteFile, listFiles, writeFile, getJSONFile, getBase64Image } = require("./utils/file")
const shapesDir = path.normalize(__dirname + '/../shapes/')

const PORT = process.env.PORT || 8080
console.log(shapesDir)

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
  app.use('/shapes/global', express.static(shapesDir));


  // TODO: migrate to REST service API
  app.get('/shapes/global/list', (req, res) => listFiles(shapesDir, req.query.path, res))
  app.get('/shapes/global/get', (req, res) => getJSONFile(shapesDir, req.query.filePath, res))
  app.get('/shapes/global/image', (req, res) => getBase64Image(shapesDir, req.query.filePath, res))

  app.post('/shapes/global/delete', ensureAdminLoggedIn(), (req, res) => {
    deleteFile(shapesDir, req.body.filePath)
    deleteFile(shapesDir, req.body.filePath.replace(".shape", ".js"))
    deleteFile(shapesDir, req.body.filePath.replace(".shape", ".md"))
    deleteFile(shapesDir, req.body.filePath.replace(".shape", ".custom"))
    deleteFile(shapesDir, req.body.filePath.replace(".shape", ".png"), res)
  })

  app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => renameFile(shapesDir, req.body.from, req.body.to, res))
  app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => createFolder(shapesDir, req.body.filePath, res))
  app.post('/shapes/global/save', ensureAdminLoggedIn(),  (req, res) => {
      let shapeRelativePath = req.body.filePath
      let content = req.body.content
      let reason = req.body.commitMessage || "-empty-"

      writeFile(shapesDir, shapeRelativePath, content, res, async (sanitizedRelativePath)=>{
          generator.thumbnail(shapesDir, sanitizedRelativePath, content, reason)
      })
  })
  

  http.listen(PORT, function () {
    console.log("============================================================================")
    console.log('| System is up and running on http://localhost:'+PORT+'/                    ');
    console.log("============================================================================")
  });
}

generator.generateShapeIndex()
runServer()
