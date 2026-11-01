# Splay for webOS

An early, experimental webOS client for Stremio. It links a Stremio account with a one-time code, reads the account's add-ons and catalogues, and asks webOS to play returned streams. Stream playback depends on the add-on and format being compatible with the TV.

## Target TVs

- LG 65UR81006LJ (webOS 23 generation)
- LG 55UA8450PSA (webOS 25 generation)

## Local build and install

```sh
node tests/api.test.js
node --check app/api.js && node --check app/app.js
ares-package -o dist app
ares-install --device <tv-name> dist/org.community.alder.webos_0.2.2_all.ipk
ares-launch --device <tv-name> org.community.alder.webos
```

`org.community.alder.webos` is retained for upgrade compatibility. This is a clean webOS implementation, not a direct APK conversion; native playback and server compatibility must be tested on each TV.

## Homebrew distribution

The repository is public. Add the `homebrew-repository.json` URL to Homebrew Channel to use this custom catalogue. Its package manifest and IPK are hosted under `homebrew/` as public raw GitHub files. Version 0.2.2 is an experimental preview; playback and add-on compatibility have not yet been verified on the target TVs. Do not enter a Stremio password on the TV; account linking uses Stremio's one-time code flow.

## Provenance and licence

The project was prepared alongside the upstream [Alder](https://github.com/aradhyas8/Alder) source. The upstream GPL-3.0 licence is retained in `LICENSE`; check licence obligations before porting Alder features.
