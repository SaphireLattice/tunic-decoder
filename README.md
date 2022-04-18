# Tunic Decoder

A tool to help with decoding of the writing system in the game TUNIC. Has a spoiler mode in case you want to skip the process of figuring it out yourself, but otherwise leaves you free to write in and figure out the meaning of each word.

It also renders glyphs fancily!

Keyboard input supported:
- `QWER` to toggle lines 1-2-3-4 out of the currently highlit with blue ones. There's no highlight until you first use the keyboard input!
- `F` and `Shift + F` for choosing next and previous 4 lines to input
- `A` and `Shift + A` to delete/pop, and to add a blank/push a glyph respectively. If the glyph is not empty, it will be saved into a temporary secondary buffer. This can be useful to copy a word! Note that the buffer is not saved between app reloads
- `C` to clear current glyph input
- `Shift + D` to push the current word into the list of words, including the text/descriping in the field under the input panel. The secondary buffer is *not* cleared
- `Esc` to hide the highlight and stop keyboard input session. The glyph, word and buffer are *not* cleared

## Development

This project was set up with the [Vue Quick Start](https://vuejs.org/guide/quick-start.html) guide and should be easy to get up and running for development purposes. Most of the info in here is from the init template's `README.md` file

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.vscode-typescript-vue-plugin) or [Volar Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471) (which is suggested to have better performance)

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
