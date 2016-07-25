import Plugin from 'stc-plugin';
import {BackgroundURLMapper} from 'stc-helper';
import SpriteMaker from './sprite';
import FolderMatcher from './folder';

const REG_CSS_URL = /\s*url\(/;
const FILE_CACHE_KEY = "file";
const PIC_CACHE_KEY = "pic";

export default class SpritePlugin extends Plugin {
	/**
	 * run
	 */
	async run() {
		if (!this.option._parsed) {
			this.option._parsed = true;
			this.option.matcher = new FolderMatcher(this.option.spriteFolders);
		}

		let tokens = await this.getAst();
		await Promise.all(
			tokens.map((token, idx) => {
				if (token.type === TokenType.CSS_VALUE) {
					if (REG_CSS_URL.test(token.value)) {
						return idx;
					}
				}
			}).filter(idx => typeof idx !== "undefined")
				.map(idx => this.handleCSSTokenPromise(tokens, idx))
		);
	}

	/**
	 * handleCSSTokenPromise()
	 * For each CSS_VALUE token containing `url()`,
	 * return a promise which
	 * register sprites dependency and file token relations
	 */
	handleCSSTokenPromise(allToken, idx) {
		let bgMapper;

		try {
			bgMapper = new BackgroundURLMapper(token.value);
		} catch (err) {
			return;
		}

		let retval = this.option.matcher.match(bgMapper.url);

		if (!retval) {
			return;
		}

		let {folder, prefix, fullname, name, type} = retval;

		return Promise.all([
			this.registerPicPromise(folder, fullname), // picture set
			this.registerFilePromise(this.file, // picture get
				this.getUpdateFn(bgMapper, idx, prefix, folder, fullname) // picture update
			)
		]);
	}

	// Update function to be called eventually
	// prev in CSS:
	// 		`.pc { background-image: url(${prefix}${folder}${fullname}) }`
	// post in CSS:
	// 		`.pc { background-image: url(${prefix}${folder}sprite.${this.option.output});
	// 		 background-position: ${tile.x}px ${tile.y}px; }`
	// matching file:
	// 		`${folder}${fullname}`
	getUpdateFn(bgMapper, idx, prefix, folder, fullname) {
		return function (allToken, coords) {
			let coordInfo = coords.get(folder);
			if (!coordInfo) {
				return;
			}
			let tile = coordInfo.tileMap.get(`${folder}${fullname}`);
			if (!tile) {
				return;
			}

			let token = allToken[idx];
			bgMapper.url = `${prefix}${folder}sprite.${this.option.output}`;
			token.value = token.ext.value = bgMapper + "";

			// todo set background-position
			console.log(tile.x, tile.y);
			// todo set background-size for @2x
		};
	}

	// set file mapping function
	// stc-file => [updaterFn1, updaterFn2 ..]
	async registerFilePromise(file, updateFn) {
		// todo check if registered stuff is consistent in memory
		let map = await this.cache(FILE_CACHE_KEY);
		if (!map) {
			map = new Map();
			await this.cache(FILE_CACHE_KEY, map);
		}

		let fileMapperArr = map.get(file);
		if (!fileMapperArr) {
			fileMapperArr = [];
			map.set(file, fileMapperArr);
		}

		fileMapperArr.push(updateFn);
	}

	// set folder mapping function
	// folder => ('a.png', 'b.png' ..)
	// using set in case there's duplicate file registered
	async registerPicPromise(folder, fullname) {
		let map = await this.cache(PIC_CACHE_KEY);
		if (!map) {
			map = new Map();
			await this.cache(PIC_CACHE_KEY, map);
		}

		let pictures = map.get(folder);
		if (!pictures) {
			pictures = new Set();
			map.set(folder, pictures);
		}

		pictures.add(`${folder}${fullname}`);
	}

	update(data) { } // do nothing

	async after(files, $this) {
		let fileMap = await this.cache(FILE_CACHE_KEY),
			picMap = await this.cache(PIC_CACHE_KEY),
			promises = [],
			coordMap = new Map();

		// making sprites and getting coordinates out of it
		for (let [folder, pictures] of picMap) {
			let sp = new SpriteMaker();
			await Promise.all(Array.from(pictures).map(pic => sp.addFile(pic)));
			let coords = await sp.save(`${folder}sprite.${this.option.output}`, this.option.output);
			coordMap.set(folder, coords);
		}

		// update tokens and then update files
		for (let [dirtyFile, updateFns] of fileMap) {
			promises.push(
				dirtyFile.getAst()
					.then(tokens => {
						updateFns.forEach(fn => {
							fn.call(this, tokens, coordMap)
						});
						return tokens;
					})
					.then(tokens => dirtyFile.setAst(tokens))
			);
		}

		await Promise.all(promises);
	}

	static cluster() {
		return false;
	}

	static cache() {
		return true;
	}

	static include() {
		return /\.css$/;
	}
}

