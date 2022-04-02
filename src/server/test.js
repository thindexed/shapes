#!/usr/bin/env node
const github = require('./utils/github')

let fromFiles = "src/data/hardware"
let toFiles = "src/data/hardware2"
    
github.renameDirectory( fromFiles, toFiles, "blah")