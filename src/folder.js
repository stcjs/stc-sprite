import {isString, isArray} from 'stc-helper';

export default class FolderMatcher {
	constructor(folders) {
		if (isString(folders)) {
			this.folders = [folders];
		} else if (!isArray(folders)) {
			this.folders = [];
		} else {
			this.folders = folders;
		}

		this.folders.forEach((folder, index) => {
			if (folder.lastIndexOf("/") !== folder.length - 1) {
				this.folders[index] += "/";
			}
		});

		this.matchers = new Map();

		this.folders.forEach(folder => {
			this.matchers.set(folder,
				new RegExp(`^(.*)${folder.replace(/\//g, "\\\/")}(([\\w\\-@_]+)\\.(png|jpg|jpeg))$`, 'i')
			);
		});
	}

	match(url) {
		for (let [folder, reg] of this.matchers) {
			if (!reg.test(url)) {
				continue;
			}
			reg.lastIndex = 0;
			let [, prefix, fullname, name, type] = reg.exec(url);
			return { url, folder, prefix, fullname, name, type };
		}
	}
}