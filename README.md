# Tabby TOTP Pilot

English | [中文](README.zh-CN.md)

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Tabby](https://img.shields.io/badge/Tabby-1.0.235-black)

A Tabby terminal plugin: for SSH connections the user has explicitly registered, it generates and submits standard TOTP codes when the server requests a dynamic verification code, and stays out of the way otherwise.

After a SSH server enables multi-factor authentication (MFA), every login requires opening an authenticator, reading the code and typing it in. This plugin performs the reading, filling and submitting. The secret must be registered in the settings beforehand; the plugin never discovers secrets on its own.

## Features

- **Auto-submit**: when a connection matches a rule and the server shows a verification-code prompt, the plugin fills in a valid TOTP code and submits it, then returns keyboard focus to the terminal.
- **Wildcard rules**: host and username accept OpenSSH-style `*` and `?` wildcards; values containing wildcards are matched as patterns. When assets behind a bastion encode the target in the username and share one secret, a single `username@*` rule covers all of them.
- **TOTP parameters**: each rule supports SHA1/SHA256/SHA512, 6 or 8 digit codes and a period between 1 and 3600 seconds, defaulting to SHA1, 6 digits, 30 seconds. Pasting an `otpauth://` URI extracts the secret and applies the algorithm, digits and period declared in the URI to the rule.
- **Run status**: the Status panel shows, in real time, the rule match and processing result of every SSH tab, so users can find out why a code was not auto-submitted.
- **Bilingual UI**: all settings text, validation errors and status descriptions follow the Tabby locale in real time. Chinese and English are built in; other languages fall back to English.

## Compatibility

- Tabby >= `1.0.238`.
- Standard TOTP (RFC 6238): Base32 secrets, SHA1/SHA256/SHA512, 6 or 8 digits, periods between 1 and 3600 seconds.
- Secrets can be entered as plain Base32, a standard `otpauth://totp/...?...secret=...` URI, or the `otpauth://secret=...` shorthand.

## Installation

Once published to npm, install from Tabby's Settings → Plugins by searching for `tabby-totp-pilot`.

To install from a local `.tgz` file:

1. Quit Tabby (so no running process holds the plugin files).
2. Extract the archive into the plugin directory.
3. Restart Tabby and open Settings → SSH TOTP.

Do not run a single-package `npm install` inside the Tabby plugin directory; npm may remove other installed plugins as extraneous packages. Extracting the archive writes only to this plugin's directory.

## Quick Start

For the connection `username@example.com:22`:

```text
Host / IP: example.com
Port: 22
Username: username
TOTP secret: the Base32 seed or otpauth:// URI from your authenticator
```

For direct bastion connections (such as JumpServer) where the target asset is encoded in the username (for example `username@root@10.0.0.5`), fill the username with a wildcard so one rule covers all assets:

```text
Host / IP: jump.example.com
Port: 2222
Username: username@*
TOTP secret: the bastion account's Base32 seed or otpauth:// URI
```

Leaving the secret input empty and saving keeps the existing secret unchanged. Deleting a rule also deletes its secret from secure storage after confirmation.

## Auto-fill Conditions

The plugin auto-fills when all of the following hold; otherwise the manual flow is kept:

1. The global switch is on and the connection matches an enabled rule: host and username follow the rule values, wildcards `*` / `?` allowed (host matching is case-insensitive, username matching is case-sensitive), the port is exact.
2. The connection has no jump host.
3. The prompt is a verification-code prompt (not a CAPTCHA) with exactly one code field.
4. A valid secret is registered for the rule.
5. All other fields in the prompt are already filled.
6. The current time step (per the rule's period) has not been used for this connection and rule.

## Security Design

- The regular Tabby config stores only rule IDs, enabled flags, hosts, ports, usernames and TOTP parameters. It never stores secrets.
- Secrets are stored through Tabby's `PasswordStorageService`: in Windows Credential Manager when Tabby Vault is disabled, in the encrypted Vault when it is enabled.
- The settings page never echoes stored secrets, and logs never contain secrets or generated codes.
- If a Tabby version change breaks the internal interfaces the plugin relies on, the plugin disables the affected functionality without affecting Tabby's SSH connections.

## Updates and Rollback

In Settings → SSH TOTP → Updates:

- Click Check for updates to query the latest version on the npm registry — the same version `npm install` installs by default. When a new version is found, install it in one click.
- Pick a published version in the rollback table to downgrade; the list comes from the npm registry.

A restart of Tabby applies installs and rollbacks. The npm registry is the single source of version information; release links are built from the `repository` field in `package.json`.

## Troubleshooting

- The SSH TOTP settings page does not appear: check that the plugin is at `node_modules/tabby-totp-pilot` inside the Tabby plugin directory, then fully restart Tabby.
- Codes are still requested manually: open the Status panel under Settings → SSH TOTP to see each connection's rule match and processing result, and verify host, port and username against the rule.
- The code is rejected by the server: check that the system time and time zone are accurate; this is the most common TOTP problem.
- Further diagnosis: filter the console by `totp-pilot` in Tabby's developer tools (`Ctrl+Shift+I`). Logs cover hook results, prompt arrival, rule matching and processing results, and never contain secrets or codes.

## Uninstall

Delete rules first if you want their secure-storage credentials removed as well. Quit Tabby, then move the plugin directory out of `node_modules`.

Restart Tabby. Delete the `.disabled` backup directory once you are sure it is no longer needed.

## License

[MIT](LICENSE)
