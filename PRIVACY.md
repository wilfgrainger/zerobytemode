# Privacy

ZeroByteMode is designed so image content does not leave the user's device.

## What the application processes

When a user selects an image, the browser reads it into memory and passes it to a local Web Worker. A local WebAssembly or browser codec produces an output Blob for preview and download.

The application does not send the selected image, filename, compression result or queue contents to an application server.

## What the application does not include

- user accounts or email collection;
- payment or subscription processing;
- analytics, advertising or behavioural telemetry;
- an application database or API;
- remote support forms;
- account cookies, local storage, session storage or IndexedDB for user identity.

The current queue is deliberately temporary and is cleared by reloading or closing the page.

## Static hosting

The static host receives normal network requests for the application itself, such as HTML, JavaScript, CSS, images and WASM files. The host may retain ordinary infrastructure logs according to its own configuration. Those requests do not contain the user's selected image files.

## External links

The interface includes links to the public GitHub repository. A third-party request occurs only when the user chooses to follow such a link.

## Verification

The repository contains Playwright checks that observe application requests and fail if the application contacts an external origin during normal use.
