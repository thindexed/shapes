#!/usr/bin/env node
const github = require('./utils/github')

let fromFiles = "src/data/circuit/digital333"
let toFiles = "src/data/circuit/digital3"
    
github.deleteDirectory( fromFiles, "blah")