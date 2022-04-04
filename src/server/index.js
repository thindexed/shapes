#!/usr/bin/env node

const path = require('path')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const bodyParser = require('body-parser')
const generator = require("./thumbnails")
const globalApi = require("./shapes/global")

const dataAbsoluteDirectory = path.normalize(__dirname + '/../data/')

const PORT = process.env.PORT || 8080


// Tell the bodyparser middleware to accept more data
//
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))

globalApi.init(app)

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

  http.listen(PORT, function () {
    console.log("============================================================================")
    console.log('| System is up and running on http://localhost:'+PORT+'/                    ');
    console.log("============================================================================")
  });
}

generator.generateShapeIndex(dataAbsoluteDirectory)
runServer()
