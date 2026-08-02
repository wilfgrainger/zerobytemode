# Release provenance

ZeroByteMode publishes deployment identity directly on the website without adding a runtime API dependency.

Every GitHub Pages build embeds:

- the package version
- the exact Git commit
- the GitHub Actions run number and link
- the UTC build time
- the deployment channel
- the permanent local-only privacy assertions

The same record is available as JSON at [`https://zerobytemode.com/release.json`](https://zerobytemode.com/release.json).

## Why it is build-time only

The deployed site does not call the GitHub API, load a third-party status badge, add analytics, or weaken the Content Security Policy. A visitor can inspect the deployed version while image processing remains entirely local.

## Maintainer release check

A production release is complete only when:

1. the `main` validation job passes;
2. the GitHub Pages deployment job passes;
3. the website release panel reports the expected version, commit and workflow run;
4. `/release.json` reports `status: deployed` and the same exact commit;
5. the local-only assertions remain `imageUploads: false`, `analytics: false` and `accounts: false`.

The release panel links back to the immutable commit, workflow run, GitHub release history and issue tracker for public verification.
