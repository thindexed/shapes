const fs = require('fs-extra')
const path = require('path')
const glob = require("glob")

const dataRelativeDirectory = "src/data/"
const dataAbsoluteDirectory = path.normalize(__dirname + '/../../data/')

const filesystem = require("../utils/file")
const github = require('../utils/github')
const generator = require("../thumbnails")


function ensureAdminLoggedIn (options) {
    return function (req, res, next) {
        let role = req.get("x-role")
        if (role !== "admin") {
            res.status(401).send('string')
            return
        }
        next();
    }
}

module.exports = {
    init: function (app) {
        // TODO: migrate to REST service API
        app.get('/shapes/global/list', (req, res) => {
            filesystem.listFiles(dataAbsoluteDirectory, req.query.path, res)
                .catch(exception => {
                    console.log(exception)
                })
        })

        app.get('/shapes/global/get', (req, res) => {
            filesystem.getJSONFile(dataAbsoluteDirectory, req.query.filePath, res)
                .catch(exception => {
                    console.log(exception)
                })
        })

        app.get('/shapes/global/image', (req, res) => {
            filesystem.getBinaryFile(dataAbsoluteDirectory, req.query.filePath, res)
                .catch(error => {
                    console.log(error)
                })
        })


        app.post('/shapes/global/delete', ensureAdminLoggedIn(), (req, res) => {
            let fileRelativePath = req.body.filePath
            let isDir = fs.lstatSync(path.join(dataAbsoluteDirectory, fileRelativePath)).isDirectory()
            if (isDir) {
                filesystem.delete(dataAbsoluteDirectory, fileRelativePath)
                    .then((sanitizedRelativePath) => {
                        let githubPath = path.join(dataRelativeDirectory, sanitizedRelativePath)
                        return github.deleteDirectory(githubPath, "-delete directory-")
                    })
                    .then(() => {
                        res.send("ok")
                        return generator.generateShapeIndex(dataAbsoluteDirectory)
                    })
                    .catch((error) => {
                        console.log(error)
                        res.status(403).send("error")
                    })
            }
            else {
                let files = [fileRelativePath,
                    fileRelativePath.replace(".shape", ".js"),
                    fileRelativePath.replace(".shape", ".md"),
                    fileRelativePath.replace(".shape", ".custom"),
                    fileRelativePath.replace(".shape", ".png")
                ]
                let promisses = files.map(file => filesystem.delete(dataAbsoluteDirectory, file))
                Promise.allSettled(promisses)
                    .then((sanitizedRelativePaths) => {
                        console.log(sanitizedRelativePaths)
                        github.delete(files.map(file => { return { path: path.join(dataRelativeDirectory, file) } }), "-empty-")
                        res.send("ok")
                        generator.generateShapeIndex(dataAbsoluteDirectory)
                    })
                    .catch(() => {
                        res.status(403).send("error")
                    })
            }
        })

        app.post('/shapes/global/rename', ensureAdminLoggedIn(), (req, res) => {
            filesystem.rename(dataAbsoluteDirectory, req.body.from, req.body.to, res)
                .then(({ fromRelativePath, toRelativePath, isDir }) => {
                    repoFromRelativePath = path.join(dataRelativeDirectory, fromRelativePath)
                    repoToRelativePath = path.join(dataRelativeDirectory, toRelativePath)

                    if (isDir) {
                        // rename all files in github
                        github.renameDirectory(repoFromRelativePath, repoToRelativePath, "-rename-")
                        // find all affected "*.shapes* files to calculate the new JS code"
                        .then ( () => {
                            let absoluteDirectoryPath = path.join(dataAbsoluteDirectory, toRelativePath)
                            return glob.sync(absoluteDirectoryPath+"/**/*.shape")
                        })
                        // generate for each "*.shape" file the js, thumbnail and markdown content
                        .then((files) => {
                            let promisses = files.map( ( file => generator.thumbnail(dataAbsoluteDirectory, file.replace(dataAbsoluteDirectory, "")) ))
                            return Promise.all(promisses)
                        })
                        // commit this changes in one commit to github
                        .then( thumbnailFiles => {
                            thumbnailFiles = thumbnailFiles.flatMap( f => f)
                            thumbnailFiles = thumbnailFiles.map(file => { return { path: path.join(dataRelativeDirectory, file.path), content: file.content } })
                            return github.commit(thumbnailFiles, "folder rename")
                        })
                        // and rebuild the index.js file
                        .then( () => {
                            // and rebuild the shape index.js
                            return generator.generateShapeIndex(dataAbsoluteDirectory)
                        })
                        .catch(error => { 
                            console.log(error) 
                        })
                    }
                    else {
                        let fromFiles = [
                            repoFromRelativePath,
                            repoFromRelativePath.replace(".shape", ".js"),
                            repoFromRelativePath.replace(".shape", ".md"),
                            repoFromRelativePath.replace(".shape", ".custom"),
                            repoFromRelativePath.replace(".shape", ".png")
                        ]
                        let toFiles = [
                            repoToRelativePath,
                            repoToRelativePath.replace(".shape", ".js"),
                            repoToRelativePath.replace(".shape", ".md"),
                            repoToRelativePath.replace(".shape", ".custom"),
                            repoToRelativePath.replace(".shape", ".png")
                        ]
                        github.renameFiles(fromFiles, toFiles, "-rename-")
                        .then( () => {
                            // we must generate the JS code again because the file name is part of the generated part name.
                            return generator.thumbnail(dataAbsoluteDirectory, toRelativePath)
                        })
                        .then( (files) => {
                            // commit the new generated file content
                            return github.commit(files.map(file => { return { path: path.join(dataRelativeDirectory, file.path), content: file.content } }), reason)
                        })      
                        .then( () => {
                            // and rebuild the shape index.js
                            return generator.generateShapeIndex(dataAbsoluteDirectory)
                        })  
                        .catch( error => { 
                            console.log(error) 
                        })
                    }
                })
                .catch(reason => {
                    console.log(reason)
                })
        })

        app.post('/shapes/global/folder', ensureAdminLoggedIn(), (req, res) => {
            filesystem.createFolder(dataAbsoluteDirectory, req.body.filePath, res)
                .then((directoryRelativePath) => {
                    let fileRelativePath =  path.join(directoryRelativePath, "placeholder.txt")
                    let content =  "-placeholder for empty directories-"
                    // create file into empty directory. Otherwise the directory is not stored in github.
                    // (github prunes empty directories)
                    filesystem.writeFile(dataAbsoluteDirectory, fileRelativePath, content)
                    return github.commit([{ path: path.join(dataRelativeDirectory, fileRelativePath), content: content }], "folder creation")
                })
                .catch(error => {
                    console.log(error)
                })
        })

        app.post('/shapes/global/save', ensureAdminLoggedIn(), (req, res) => {
            let shapeRelativePath = req.body.filePath
            let content = req.body.content
            let reason = req.body.commitMessage || "-empty-"
            filesystem.writeFile(dataAbsoluteDirectory, shapeRelativePath, content, res)
                .then((sanitizedRelativePath) => {
                    return generator.thumbnail(dataAbsoluteDirectory, sanitizedRelativePath)
                })
                .then((files) => {
                    return github.commit(files.map(file => { return { path: path.join(dataRelativeDirectory, file.path), content: file.content } }), reason)
                })
                .catch(reason => {
                    console.log(reason)
                })
        })
    }
}
