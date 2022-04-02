#!/usr/bin/env node
const github = require('./utils/github')

let fromFiles = "src/data/circuit/digital2"
let toFiles = "src/data/circuit/digital3"
    
github.renameDirectory( fromFiles, toFiles, "blah")