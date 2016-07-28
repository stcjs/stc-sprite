import Plugin from 'stc-plugin';
import {BackgroundURLMapper} from 'stc-helper';
import {resolve} from 'path';

import SpriteMaker from './sprite';
import FolderMatcher from './folder';

const REG_CSS_URL = /\s*url\(/;
const FILE_CACHE_KEY = "cache_file";
const PIC_CACHE_KEY = "cache_pic";

const LEGAL_TYPES = "jpg png";
const LEGAL_ALGORITHMS = "top-down left-right diagonal alt-diagonal binary-tree";

export default class SpritePlugin extends Plugin {
	/**
	 * run
	 */
	async run() {
		if (!this.options._parsed) {
			this.options._parsed = true;
			this.options.matcher = new FolderMatcher(this.options.spriteFolders);

			if (LEGAL_TYPES.indexOf(this.options.outputType) === -1) {
				this.options.outputType = "png";
			}

			if (LEGAL_ALGORITHMS.indexOf(this.options.algorithm) === -1) {
				this.options.algorithm = "binary-tree";
			}

			if (this.options.outputType !== "jpg") {
				this.options.background = undefined;
			}
		}

		let tokens = await this.getAst();
		await Promise.all(
			tokens.map((token, idx) => {
				if (token.type === this.TokenType.CSS_VALUE) {
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
	 * register sprites dependency and file updates
	 */
	async handleCSSTokenPromise(allToken, idx) {
		let bgMapper,
			token = allToken[idx];

		try {
			bgMapper = new BackgroundURLMapper(token.value);
		} catch (err) {
			console.log(err);
			return;
		}

		let relFile;
		try {
			relFile = await this.getFileByPath(bgMapper.url);
		} catch (err) {
			console.log(`file not found for ${bgMapper.url}`)
			return;
		}

		let retval = this.options.matcher.match(bgMapper.url);
		if (!retval) {
			return;
		}

		let {folder, prefix, fullname, name, type} = retval;
		bgMapper.url = `${prefix}${folder}sprite.${this.options.outputType}`;
		let outValue = bgMapper + "";

		this.registerPic(folder, relFile.path); // sprite files for each folder

		this.registerFile(this.file, // update functions for each stc-file
			this.getUpdateFn(token, folder, relFile.path, outValue) // token update
		);
	}

	// Update function to be called eventually
	// prev in CSS:
	// 		`.pc { background-image: url(${prefix}${folder}${fullname}) }`
	// post in CSS:
	// 		`.pc { background-image: url(${prefix}${folder}sprite.${this.options.outputType});
	// 		 background-position: ${tile.x}px ${tile.y}px; }`
	// matching file（in form of stc-file）:
	// 		`${folder}${fullname}`
	// and compile to（in form of stc-file）:
	//		`${folder}sprite.${this.options.outputType}`
	getUpdateFn(token, folder, inPath, outValue) {
		return (function (allToken, coordMap) {
			let coordInfo = coordMap.get(folder);
			if (!coordInfo) {
				return;
			}
			let tile = coordInfo.tileMap.get(inPath);
			if (!tile) {
				console.log(`Cannot find ${inPath}`);
				return;
			}

			let idx = 0;
			for (; idx < allToken.length; idx++) {
				if (allToken[idx] == token) {
					// todo figure a way of value equiv
					break;
				}
			}

			if (idx >= allToken.length) {
				return;
			}

			// set image
			allToken[idx].value = allToken[idx].ext.value = outValue;

			// set background-position
			let bgPositionToken = this.createRawToken('style', `background-position: -${tile.x}px -${tile.y}px;`); // width: ${tile.w}px; height: ${tile.h}px;
			allToken.splice(idx + 2, 0, bgPositionToken); // todo prevent using magic number 2

			// todo set background-size for @2x
		}).bind(this);
	}

	// set file mapping function
	// stc-file => [updaterFn1, updaterFn2 ..]
	registerFile(file, updateFn) {
		// todo check if registered stuff is consistent in memory
		let map = this[FILE_CACHE_KEY];
		if (!map) {
			map = new Map();
			this[FILE_CACHE_KEY] = map;
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
	// using Set in case there're duplicate files registered
	registerPic(folder, path) {
		let map = this[PIC_CACHE_KEY];
		if (!map) {
			map = new Map();
			this[PIC_CACHE_KEY] = map;
		}

		let pictures = map.get(folder);
		if (!pictures) {
			pictures = new Set();
			map.set(folder, pictures);
		}

		pictures.add(path);
	}

	update(data) { } // do nothing

	static async after(files, $this) {
		let fileMap = $this[FILE_CACHE_KEY],
			picMap = $this[PIC_CACHE_KEY],
			promises = [],
			coordMap = new Map();

		if (!fileMap || !picMap) {
			return;
		}

		// making sprites and getting coordinates out of it
		for (let [folder, pictures] of picMap) {
			let spriteMaker = new SpriteMaker(
				$this.options.algorithm,
				$this.options.background,
				$this.options.margin
			); // todo apply options

			let promises = Array.from(pictures).map(pic => spriteMaker.addFile(pic));
			await Promise.all(promises);

			let file = await $this.addFile(`${folder}sprite.${$this.options.outputType}`);
			// todo find a more subtle way of getting the output string
			let coords = await spriteMaker.save(
				file.path,
				$this.options.outputType
			);
			coordMap.set(folder, coords);
		}

		// update tokens and then update files
		for (let [dirtyFile, updateFns] of fileMap) {
			promises.push(
				dirtyFile.getAst()
					.then(tokens => {
						updateFns.forEach(fn => {
							fn.call($this, tokens, coordMap)
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
