#!/usr/bin/env node
const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const update = require("./update")
const {thumbnail} = require("./thumbnail")
const shapesDir = path.normalize(__dirname + '/../shapes/')

console.log(shapesDir)

// Tell the bodyparser middleware to accept more data
//
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))


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
  app.use('/', express.static(shapesDir));

  app.post('/', (req, res) => {
      let githubPath = req.body.filePath
      let content = req.body.content
      let reason = req.body.commitMessage
      // create the js/png/md async to avoid a blocked UI
      //
      thumbnail(baseDir, githubPath)

      // commit the shape to the connected github backend
      // (if configured)
      update.commitShape(githubPath, reason, content)
  })
  

  http.listen(8080, function () {
    console.log('| System is up and running. Copy the URL below and open this               |');
    console.log('| in your browser: http://localhost:8080/                                  ');
    console.log("============================================================================")
  });
}

runServer()
