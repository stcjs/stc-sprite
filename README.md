# stc-sprite

A css sprite bundler for stcjs

## Usage

```js
// stc.config.js
stc.workflow({
  sprite: {
    plugin: sprite,
    include: /\.css$/,
    options: {} // see below
  },
});
```

## Options

```
{
  spriteFolders: '' // can also be an array of folders.
  outputType: "png", // jpg or png.
  algorithm: "binary-tree", // "top-down" or "left-right" or "diagonal" or "alt-diagonal" or "binary-tree".
  background: "#FFFFFF", // Available when using jpg. For png files, we will only support transparent background.
  retina: ture, // Resolve "@2x" files and make "@1x" file automatically.
  margin: 4, // Margin between pictures. When displaying in retina mode, a larger margin can prevent bleeding.
}
```

For all layout algorithm, see explanations [here](https://github.com/twolfson/layout#algorithms).

## Roadmap

* [x] basic support
* [x] append background-position after all attribute set
* [x] margin support
* [x] jpg support
* [x] background color support
* [ ] retina support
