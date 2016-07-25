let FolderMatcher = require('../lib/folder').default;
let retval = (new FolderMatcher("a/b/c")).match("/resource/img/a/b/c/xx.png");
let {folder, prefix, fullname, name, type} = retval;

console.log({folder, prefix, fullname, name, type});