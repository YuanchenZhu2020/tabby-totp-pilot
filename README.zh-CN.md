# Tabby TOTP Pilot

[English](README.md) | 中文

![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Tabby](https://img.shields.io/badge/Tabby-1.0.235-black)

一个 Tabby 终端插件：对用户保存的 SSH 连接，在服务器要求动态验证码时自动生成并提交标准 TOTP 验证码。

SSH 服务器开启多因素验证 (MFA) 后，每次登录都要打开认证器、阅读、手输验证码。本插件自动完成读码、填码、提交。密钥需要事先在设置中登记，插件不会自行获取密钥。

## 功能特性

- **自动提交**：SSH 连接命中规则，且服务器弹出验证码提示时，自动填入当前有效的验证码并提交，提交后键盘焦点自动回到终端。
- **通配符规则**：主机与用户名支持 OpenSSH 风格的 `*` 和 `?` 通配符，含通配符即按模式匹配。同一堡垒机下的资产编码在用户名中且共用同一密钥时，用户名填 `username@*` 一条规则即可覆盖全部资产。
- **TOTP 参数化**：每条规则支持 SHA1/SHA256/SHA512、6 或 8 位验证码、1 到 3600 秒周期，默认 SHA1、6 位、30 秒。粘贴 `otpauth://` URI 时自动提取密钥，URI 声明的算法、位数、周期回填到规则。
- **运行状态**：设置页的运行状态面板实时显示每个 SSH 标签页的规则匹配与处理结果，用于排查自动提交未发生的原因。
- **中英双语**：设置页全部文案、校验错误与状态说明跟随 Tabby 全局语言实时切换，内置中文与英文，其他语言回退英文。

## 兼容范围

- Tabby >= `1.0.238`。
- 标准 TOTP (RFC 6238)：Base32 密钥、SHA1/SHA256/SHA512、6 或 8 位数字、1 到 3600 秒周期。
- 支持三种形式密钥：纯 Base32 字符串、标准 `otpauth://totp/...?...secret=...` URI、`otpauth://secret=...` 简写。

## 安装

发布到 npm 后，可在 Tabby 的设置 → 插件中搜索 `tabby-totp-pilot` 安装。

使用本地 `.tgz` 安装：

1. 退出 Tabby（避免插件文件被运行中的进程占用）。
2. 将 `.tgz` 解压到插件目录。
3. 重启 Tabby，打开设置 → SSH TOTP。

不要在 Tabby 插件目录内执行单包 `npm install`，npm 可能把其他已安装插件识别为多余的包并清理；直接解包只写入本插件目录。

## 快速开始

对于连接 `username@example.com:22`：

```text
主机 / IP：example.com
端口：22
用户名：username
TOTP 密钥：认证器提供的 Base32 seed 或 otpauth:// URI
```

对于直连堡垒机（如 JumpServer）、目标资产编码在用户名中的场景（形如 `username@root@10.0.0.5`），用户名填通配符即可一条规则覆盖全部资产：

```text
主机 / IP：jump.example.com
端口：2222
用户名：username@*
TOTP 密钥：堡垒机账号的 Base32 seed 或 otpauth:// URI
```

密钥输入框留空并保存，表示保持已有密钥不变。删除规则时，插件在确认后同步删除安全存储中的密钥。

## 自动填充条件

以下条件全部满足时自动填充，任一不满足则保留手动输入：

1. 全局开关启用，且连接匹配一条启用的规则：主机与用户名按规则值匹配，可含 `*` / `?` 通配符（主机不区分大小写，用户名区分），端口精确一致。
2. 连接未配置跳板机。
3. 提示为验证码类提示（不含图形验证码），且只有一个验证码字段。
4. 该规则已登记有效密钥。
5. 提示中其余字段均已填写。
6. 当前时间步（按规则周期计算）内未对该连接和该规则提交过。

## 安全设计

- 普通 Tabby 配置只保存规则 ID、启用状态、主机、端口、用户名和 TOTP 参数，不保存密钥。
- 密钥通过 Tabby `PasswordStorageService` 保存：未启用 Tabby Vault 时保存在 Windows 凭据管理器；启用 Vault 时保存在加密 Vault 中。
- 设置页不回显已保存的密钥，日志不记录密钥或生成的验证码。
- Tabby 版本变化导致内部接口不兼容时，插件停用相关功能，不影响 Tabby 本身的 SSH 连接。

## 更新与回退

在设置 → SSH TOTP → 插件更新面板：

- 点击检查更新，查询 npm registry 上的最新版本，即 `npm install` 默认安装的版本。发现新版本时一键安装。
- 在版本回退表格中选择已发布的旧版本回退，列表来自 npm registry。

安装或回退完成后重启 Tabby 生效。版本信息以 npm registry 为单一来源，release 链接按 `package.json` 的 repository 字段拼出。

## 故障排查

- 设置页没有出现 SSH TOTP：确认插件位于 Tabby 插件目录的 `node_modules/tabby-totp-pilot` 下，然后完全重启 Tabby。
- 仍然要求手动输入：打开设置 → SSH TOTP 的运行状态面板，查看每个连接的规则匹配与处理结果；检查主机、端口和用户名是否与规则一致。
- 验证码被服务器拒绝：检查系统时间和时区是否准确，这是 TOTP 最常见的问题。
- 仍需定位：在 Tabby 开发者工具（`Ctrl+Shift+I`）控制台按 `totp-pilot` 过滤日志。日志包含订阅结果、提示到达、规则匹配与处理结果，不包含密钥或验证码。

## 卸载

删除规则可先清理对应的安全存储凭据。退出 Tabby 后，将插件目录移出 `node_modules`。

之后重启 Tabby 即可。确认无需恢复后，可删除 `.disabled` 备份目录。

## License

[MIT](LICENSE)
