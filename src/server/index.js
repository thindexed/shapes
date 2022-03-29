#!/usr/bin/env node
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const update = require("./update")
const {thumbnail} = require("./thumbnail")
const {listFiles, getJSONFile, getBase64Image } = require("./utils/file")
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
      res.send(401, 'string')
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
    module.exports.deleteFile(shapesDir, req.body.filePath)
    module.exports.deleteFile(shapesDir, req.body.filePath.replace(".shape", ".js"))
    module.exports.deleteFile(shapesDir, req.body.filePath.replace(".shape", ".md"))
    module.exports.deleteFile(shapesDir, req.body.filePath.replace(".shape", ".custom"))
    module.exports.deleteFile(shapesDir, req.body.filePath.replace(".shape", ".png"), res)
  })
  app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => module.exports.renameFile(shapesDir, req.body.from, req.body.to, res))
  app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => module.exports.createFolder(shapesDir, req.body.filePath, res))
  
  app.post('/shapes/global/save', (req, res) => {
      let githubPath = req.body.filePath
      let content = req.body.content
      let reason = req.body.commitMessage
      // create the js/png/md async to avoid a blocked UI
      //
      //thumbnail(baseDir, githubPath)

      // commit the shape to the connected github backend
      // (if configured)
      update.commitShape(githubPath, reason, content)
      res.status(200).send('ok');
  })
  

  http.listen(PORT, function () {
    console.log('| System is up and running on http://localhost:'+PORT+'/                                  ');
    console.log("============================================================================")
  });
}

runServer()
