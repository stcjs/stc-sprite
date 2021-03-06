const SpriteMaker = require('../lib/sprite').default;
const glob = require('glob');
const fs = require('fs');
const promisify = require('stc-helper').promisify;

let sp = new SpriteMaker("binary-tree", "#FFFFFF");

glob("./img/*.png", function (err, files) {
	let promises = files.map(file => sp.addFile(file));

	Promise.all(promises)
		.then(() => console.log('All added.'))
		.then(() => sp.save('./output.jpg', "jpg"))
		.then(info => console.log(info))
		.then(() => console.log('Outputed `output.png`.'))
		.catch(err => console.log(err))
});

// sp.addBinary();
