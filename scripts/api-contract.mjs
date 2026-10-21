// The lowest woori_server API contract this commit's web and admin builds
// need: the server's contracts/openapi.json info.version, which production
// GET /healthz reports as "contract". Before each Pages deploy,
// `node scripts/pages-deploy.mjs gate` (.github/workflows/deploy.yml) refuses
// to publish while production reports no contract, a malformed one or a lower
// one, so a web build never goes live ahead of the API it calls (server
// first, then web).
//
// Update rule: a change that starts using an endpoint, field, error code or
// behaviour first added in server contract X.Y.Z raises this to X.Y.Z in the
// same PR (woori-api-change skill). Only raise it; a lower value lets a build
// reach an API without what it calls. Leave it when the server bumps its
// version for changes this client does not use.
//
// 0.29.0: profile photos (POST /v1/auth/profile/avatar/uploads and /complete,
// DELETE /v1/auth/profile/avatar, GET /v1/users/{userId}/avatar and the
// avatarVersion fields), on top of 0.27.0 nicknames.
export const MIN_API_CONTRACT = '0.29.0';
