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

```json
{
  sprite_folders: '' // can also be an array of folders
  output_type: "png", // jpg or png
  algorithm: "binary-tree", // "top-down" or "left-right" or "diagonal" or "alt-diagonal" or "binary-tree"
  background: "#FFFFFF", // Available when using jpg. For png files, we will only support transparent background
  retina: ture // Resolve "@2x" files and make @1x file automatically
}
```

For all layout algorithm, see explanations [here](https://github.com/twolfson/layout#algorithms).

## ROADMAP

- basic support
- jpg support
- retina support