const DEBUGGING = false

const puppeteer = require('puppeteer')
const path = require("path")
const fs = require("fs")
const glob = require("glob")
const github = require("./utils/github")
const thisDir = path.normalize(__dirname)
const shapeAppDir = path.normalize(__dirname + '/../shapes/')
const version =  process.env.VERSION || "local-version"
const DESIGNER_URL =  process.env.DESIGNER_URL || "http://localhost:3000"
const IN_K8S = process.env.KUBERNETES_SERVICE_HOST? true : false

function fileToPackage(file) {
  return file
    .replace(shapeAppDir, "")
    .replace(/\.shape$/g, "")
    .replace(/-/g, "_")
    .replace(/\//g, "_");
}

function concatFiles(dirname) {
  let indexFile = dirname + "index.js";
  let jsonFile = dirname + "index.json";
  try {fs.unlinkSync(indexFile);} catch (exc) {}
  try {fs.unlinkSync(jsonFile);} catch (exc) {}

  glob(dirname+"/**/*.js",  (er, files) => {
    let content = "";
    let list = [];
    files.forEach( (filename)=>  {
      let relativePath = filename.replace(dirname, "")
      let basenamePath = relativePath.replace(".js", "")
      let name = basenamePath.replace(/\//g , "_").replace(/-/g , "_")
      let basename = relativePath.split('/').pop()
      let displayName = basename.replace(".js", "")
      let tags = name.split("_")
      list.push({
        name: name,
        tags: tags,
        version: version,
        basename: basename,
        displayName: displayName,
        basedir: relativePath.substring(0, relativePath.lastIndexOf('/')),
        filePath: basenamePath + ".shape",
        image: basenamePath + ".png"
      });
      content += (fs.readFileSync(filename, 'utf8') + "\n\n\n")
    });

    fs.writeFileSync(jsonFile, JSON.stringify(list, undefined, 2))
    fs.writeFileSync(indexFile, content)
  })
}

module.exports = {

  generateShapeIndex: async () => {
    concatFiles(shapeAppDir)
  },

  thumbnail: async (shapesDir, shapeRelativePath, shapeCode, reason) => {

    let shapeAbsolutePath = path.normalize(shapesDir + shapeRelativePath)

    try {
      let json = JSON.parse(fs.readFileSync(shapeAbsolutePath,'utf8'));
      let pkg = fileToPackage(shapeAbsolutePath);

      json = json.draw2d
      json = JSON.stringify(json, undefined, 2)

      let code = fs.readFileSync(thisDir + "/template.js", 'utf8');
      let injectedCode =
        "console.log('test test... ');\n" +
        "let json=" + json + ";\n" +
        "let pkg='" + pkg + "';\n" +
        code;

      //console.log(injectedCode)
      let browser = null
      if (IN_K8S)
        browser = await puppeteer.launch({args:['--no-sandbox'], executablePath:'chromium-browser'})
      else
        browser = await puppeteer.launch( DEBUGGING ? { headless: false, devtools: true,slowMo: 250}: {})

      const page = await browser.newPage()
      page
        .on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
        .on('pageerror', ({ message }) => console.log(message))
        .on('response', response => console.log(`${response.status()} ${response.url()}`))
        .on('requestfailed', request =>  console.log(`${request.failure().errorText} ${request.url()}`))
          
      await page.goto(DESIGNER_URL)
      await page.setViewport({width: 1500, height: 2024})
      await page.waitForFunction(() => {
        return 'app' in window && app != null
      })
      await page.mainFrame().evaluate(injectedCode)
      await page.waitForFunction(() => {
        return img !== null
      })

      let img = await page.evaluate(() => { return img });
      let jsCode = await page.evaluate(() => { return code });
      let customCode = await page.evaluate(() => { return customCode });
      let markdown = await page.evaluate(() => { return markdown });

      let pngRelativePath = shapeRelativePath.replace(/\.shape$/, ".png");
      let jsRelativePath = shapeRelativePath.replace(/\.shape$/, ".js");
      let customRelativePath = shapeRelativePath.replace(/\.shape$/, ".custom");
      let markdownRelativePath = shapeRelativePath.replace(/\.shape$/, ".md");

      let pngAbsolutePath = shapeAbsolutePath.replace(/\.shape$/, ".png");
      let jsAbsolutePath = shapeAbsolutePath.replace(/\.shape$/, ".js");
      let customAbsolutePath = shapeAbsolutePath.replace(/\.shape$/, ".custom");
      let markdownAbsolutePath = shapeAbsolutePath.replace(/\.shape$/, ".md");

      // replace the generated "testShape" with the real figure name
      //
      jsCode = jsCode.replace(/testShape/g, pkg);
      jsCode = jsCode.replace(/\$\{VERSION\}/g, version);
      customCode = customCode.replace(/testShape/g, pkg);

      console.log("writing files to disc....", jsAbsolutePath)
      fs.writeFileSync(jsAbsolutePath, jsCode, 'utf8');

      console.log("writing files to disc....", customAbsolutePath)
      fs.writeFileSync(customAbsolutePath, customCode, 'utf8');

      console.log("writing files to disc....", markdownAbsolutePath)
      fs.writeFileSync(markdownAbsolutePath, markdown, 'utf8');

      console.log("writing files to disc....", pngAbsolutePath)
      fs.writeFileSync(pngAbsolutePath, Buffer.from(img, 'base64'), 'binary');

      github.commit([
        { path: shapeRelativePath, content: Buffer.from(shapeCode).toString("base64") },
        { path: jsRelativePath, content: Buffer.from(jsCode).toString("base64") },
        { path: jsRelativePath, content: Buffer.from(jsCode).toString("base64") },
        { path: customRelativePath,content: Buffer.from(customCode).toString("base64") },
        { path: markdownRelativePath,content: Buffer.from(markdown).toString("base64") },
        { path: pngRelativePath, content: img}
        ], reason)
      
      console.log("done")

      if(!DEBUGGING) {
        browser.close()
      }

      concatFiles(shapeAppDir)
    }
    catch(e){
      console.log(e)
    }
  }
}
