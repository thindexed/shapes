#!/usr/bin/env node
const github = require('./utils/github')

let fromFiles = "data/circuit/digital333"
let toFiles = "data/circuit/digital3"
    
github.deleteDirectory( fromFiles, "blah")