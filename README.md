# splay-webos
Stremo auto play

## Alder-inspired LG webOS developer preview

This is the GitHub home for a **prototype** Stremio-compatible TV application. It is based on an independent webOS implementation informed by the Alder Android project (https://github.com/aradhyas8/Alder); Android Kotlin/ExoPlayer code cannot run directly on webOS.

**Status:** The full application files still need importing from the prepared project ZIP. The repository is not an installable Homebrew source yet. The prototype has not been verified on physical TVs.

### Target TVs
- LG 65UR81006LJ (webOS 23 generation)
- LG 55UA8450PSA (webOS 25 generation)

### Import source

Extract the supplied `Splay_webOS_GitHub_Homebrew_Ready.zip` into the root of this repository, preserving these paths:

```
app/
scripts/prepare_release.py
tests/api.test.js
.github/workflows/release.yml
homebrew-repository.json
LICENSE
DEVELOPMENT.md
build.py
```

The ZIP's README contains detailed build and testing notes; keep this README or reconcile the two. Run `node tests/api.test.js` and `node --check app/app.js && node --check app/api.js` before publishing.

### GitHub Actions and Homebrew

The supplied GitHub Actions workflow uses LG's `@webos-tools/cli` to build an official `.ipk`, then produces a Homebrew manifest. On a **tagged** commit such as `v0.1.0` it publishes a versioned GitHub Release. The application ID `org.community.alder.webos` remains unchanged for upgrade compatibility.

After publishing a *publicly accessible* release, the Homebrew Channel external repository URL is:

```text
https://raw.githubusercontent.com/ravichahal84/splay-webos/main/homebrew-repository.json
```

**Important:** This repository was verified as **private**. The normal Homebrew Channel cannot download the raw catalogue or release assets without authentication; make the repository public only if you choose to expose the project and have checked it for secrets. Do not put Stremio keys, TV SSH credentials, personal data or IP addresses into the source.

### Feature limits

The prototype is intended to support account linking, add-on catalogues, episode browsing, remote controls and native webOS playback of compatible HTTPS streams. Authentication, CORS, playback support and updates have **not been confirmed on either LG TV**. Android ExoPlayer, FFmpeg, torrents, transcoding and other Android-specific features are not implemented.

Original project: https://github.com/aradhyas8/Alder

License for contributed port code: GPL-3.0 (see supplied LICENSE).
