# Splay for webOS

An early Splay webOS launcher for a compatible self-hosted media server. It stores one server URL locally on each TV and opens it in the webOS browser context.

## Target TVs

- LG 65UR81006LJ (webOS 23 generation)
- LG 55UA8450PSA (webOS 25 generation)

## Local build and install

```sh
node tests/api.test.js
node --check app/api.js && node --check app/app.js
ares-package -o dist app
ares-install --device <tv-name> dist/org.community.alder.webos_0.1.0_all.ipk
ares-launch --device <tv-name> org.community.alder.webos
```

`org.community.alder.webos` is retained for upgrade compatibility. This is a clean webOS implementation, not a direct APK conversion; native playback and server compatibility must be tested on each TV.

## Homebrew distribution

The Homebrew catalogue and release assets need public, unauthenticated URLs. This repository is intentionally private, so its raw GitHub URLs and private release assets will not work as a Homebrew source. No tag or release has been made.

## Provenance and licence

The project was prepared alongside the upstream [Alder](https://github.com/aradhyas8/Alder) source. The upstream GPL-3.0 licence is retained in `LICENSE`; check licence obligations before porting Alder features.
