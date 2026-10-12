---
kind: upgrade-guide
description: "RE-VASH product environment keys, plugin scope, and session cookie names replace the former OS-DASH identifiers."
---

# RE-VASH product identifiers

English | [中文](guide.zh.md)

## Change

The RE-VASH product composition uses RE_VASH_* environment keys, @re-vash/* product plugins, and the revash_session cookie. OS_DASH_* keys and the osdash_session cookie are no longer consumed. Ordinary Harness profiles and @deepseek-ai/* package names are unchanged. Saved desktop sessions retain their existing file name, origin, token and expiry fields.

## Migration

1. Rename OS_DASH_* keys to RE_VASH_* in private environment files and deployment settings, preserving their values. Update product plugin imports and packaged resource paths from @os-dash/* to @re-vash/*. Rebuild product resources and the desktop shell together.
2. Retain existing database, role and volume identities. For local Compose, set RE_VASH_COMPOSE_PROJECT, RE_VASH_POSTGRES_USER and RE_VASH_POSTGRES_DB to the existing names in the private environment file; preserve the connection URL and passwords.
3. Restart the product API, Web Host and desktop together. Sign in again in browsers that only hold the old cookie. The desktop restores unexpired saved sessions using the new cookie name.
4. Confirm product login, task reads, logout and desktop session restoration. Verify local database health before using the renamed commands.
