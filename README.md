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
ares-install --device <tv-name> dist/org.community.alder.webos_0.2.8_all.ipk
ares-launch --device <tv-name> org.community.alder.webos
```

`org.community.alder.webos` is retained for upgrade compatibility. This is a clean webOS implementation, not a direct APK conversion; native playback and server compatibility must be tested on each TV.

## Homebrew distribution

The repository is public. Add the `homebrew-repository.json` URL to Homebrew Channel to use this custom catalogue. The catalogue and its package manifest are hosted in the repository; release IPKs are attached to GitHub Releases. Version 0.2.8 is an experimental preview; playback and add-on compatibility have not yet been verified on the target TVs. Series playback offers a 10-second next-episode countdown, and subtitle tracks are loaded from installed Stremio subtitle add-ons (WebVTT and SRT), with saved language filters. Subtitle availability and rendering depend on the add-on, stream, and TV. The Add-on health view reports recent catalogue, stream, and subtitle requests. Do not enter a Stremio password on the TV; account linking uses Stremio's one-time code flow.

## Publishing a Homebrew release

Bump `app/appinfo.json`, run the local checks above, and push a matching version tag (for example, `v0.2.9`) pointing to the release commit. The release workflow verifies the tag matches the app version, builds and attaches the IPK and manifest to the GitHub Release, then updates the catalogue manifest on `main`. The tag push requires a repository token or account permitted to push tags; the workflow's `GITHUB_TOKEN` must be allowed to write to `main`.

## Device testing

Before treating a model as supported, verify account linking, catalogue loading, remote-control focus between seasons, episodes, playback, and dialogs, per-episode resume, source fallback, playback error recovery, next-episode countdown/cancel, saved subtitle-language filtering/selection/rendering, and add-on health retries on the physical TV. Record the TV model, webOS version, stream format, and results below; do not mark a device verified based only on the emulator or package build.

| TV model | webOS | Link/catalogue | Playback/resume | Source fallback/errors |
| --- | --- | --- | --- | --- |
| LG 65UR81006LJ | 23 generation | Not tested | Not tested | Not tested |
| LG 55UA8450PSA | 25 generation | Not tested | Not tested | Not tested |

## Provenance and licence

The project was prepared alongside the upstream [Alder](https://github.com/aradhyas8/Alder) source. The upstream GPL-3.0 licence is retained in `LICENSE`; check licence obligations before porting Alder features.
