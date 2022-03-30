const github = require("./utils/github")

github.commit([{
    path: "test.js",
    content: "test test"
}
], "test msg")
