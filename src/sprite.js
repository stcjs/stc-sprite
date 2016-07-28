import gm from 'gm';
import layout from 'layout';
import {promisify} from 'stc-helper';

export default class SpriteMaker {
	constructor(algorithm = "binary-tree", background = "transparent", margin = 4) {
		this.layer = layout(algorithm);
		this.tiles = [];
		this.background = background;
		this.margin = margin;
	}

	async addFile(path) {
		let pic = gm(path);
		let {width, height} = await promisify(pic.size, pic)();
		let tile = new Tile(path, width, height, this.margin);
		this.tiles.push(tile);

		this.layer.addItem({
			height: tile.h + this.margin,
			width: tile.w + this.margin,
			meta: tile.path,
		});
	}

	async save(outputPath, type) {
		let layers = this.layer.export();
		layers.items.forEach((item, index) => {
			this.tiles[index].item = item;
		});

		let prevGm = gm();
		prevGm._in = ['-background', this.background];

		this.tiles.forEach(tile => {
			prevGm.out('-page');
			prevGm.out(`+${tile.x}+${tile.y}`);
			prevGm.out(tile.path);
		});

		prevGm.mosaic();
		let buffers = await promisify(prevGm.toBuffer, prevGm)(type.toUpperCase());

		let nextGm = gm(buffers);
		let {width, height} = await promisify(nextGm.size, nextGm)();

		await promisify(nextGm.write, nextGm)(outputPath);

		let tileMap = new Map();
		for(let tile of this.tiles) {
			let {x,y,w,h} = tile;
			tileMap.set(tile.path, {x,y,w,h});
		}

		return { width, height, tileMap };
	}

	async scale() { } // todo
}

class Tile {
	constructor(path, width, height, margin) {
		this.w = width;
		this.h = height;
		this.path = path;
		this.margin = margin;
	}
	get x() {
		return this.item.x + this.margin;
	}
	get y() {
		return this.item.y + this.margin;
	}
}
