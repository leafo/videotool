
# videotool

Tool for quickly cutting youtube videos. This tool is a frontend to
`youtube-dl` and `ffmpeg` for a specific workflow with heavy caching using
nginx.

Dependencies:

* ffmpeg
* youtube-dl
* OpenResty
* LuaRocks
* npm
* tup
* sassc

Setup:

```bash
npm install
luarocks --lua-version=5.1 build --only-deps
tup init
tup
```

Running server:

```bash
lapis server
```

Go to http://localhost:9090 (default port can be changed in `config.moon`).
Run `tup` after making any changes.

<img src="https://leafo.net/shotsnb/2021-02-24_11-57-54.png" alt="Screenshot">
