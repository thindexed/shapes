#!/usr/bin/env node
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const generator = require("./generator")
const persistence = require("./utils/file")

const documentBaseDir = path.normalize(__dirname + '/../shapes/')

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
  app.use('/shapes/global', express.static(documentBaseDir));


  // TODO: migrate to REST service API
  app.get('/shapes/global/list', (req, res) => persistence.listFiles(documentBaseDir, req.query.path, res))
  app.get('/shapes/global/get', (req, res) => persistence.getJSONFile(documentBaseDir, req.query.filePath, res))
  app.get('/shapes/global/image', (req, res) => {
    persistence.getBinaryFile(documentBaseDir, req.query.filePath, res)
  })

  app.post('/shapes/global/delete', ensureAdminLoggedIn(), (req, res) => {
    persistence.deleteFile(documentBaseDir, req.body.filePath)
    persistence.deleteFile(documentBaseDir, req.body.filePath.replace(".shape", ".js"))
    persistence.deleteFile(documentBaseDir, req.body.filePath.replace(".shape", ".md"))
    persistence.deleteFile(documentBaseDir, req.body.filePath.replace(".shape", ".custom"))
    persistence.deleteFile(documentBaseDir, req.body.filePath.replace(".shape", ".png"), res)
  })

  app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => persistence.renameFile(documentBaseDir, req.body.from, req.body.to, res))
  app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => persistence.createFolder(documentBaseDir, req.body.filePath, res))
  app.post('/shapes/global/save', ensureAdminLoggedIn(),  (req, res) => {
      let shapeRelativePath = req.body.filePath
      let content = req.body.content
      let reason = req.body.commitMessage || "-empty-"

      persistence.writeFile(documentBaseDir, shapeRelativePath, content, res, async (sanitizedRelativePath)=>{
          generator.thumbnail(documentBaseDir, sanitizedRelativePath, content, reason)
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
