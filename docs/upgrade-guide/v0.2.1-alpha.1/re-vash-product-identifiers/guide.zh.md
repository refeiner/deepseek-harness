---
kind: upgrade-guide
description: "RE-VASH 产品环境变量、插件命名空间和会话 Cookie 替换原 OS-DASH 标识。"
---

# RE-VASH 产品标识

[English](guide.md) | 中文

## 变更

RE-VASH 产品组合使用 RE_VASH_* 环境变量、@re-vash/* 产品插件和 revash_session Cookie，不再读取 OS_DASH_* 或 osdash_session。普通 Harness profile 与 @deepseek-ai/* 包名不变。桌面已保存会话沿用原文件名、来源、token 和到期字段。

## 迁移

1. 将私有环境文件和部署设置中的 OS_DASH_* 键改为 RE_VASH_*，保留值。将产品插件导入及打包资源路径中的 @os-dash/* 改为 @re-vash/*，共同重建产品资源与桌面壳。
2. 保留已有数据库、角色和数据卷身份。本地 Compose 在私有环境文件中将 RE_VASH_COMPOSE_PROJECT、RE_VASH_POSTGRES_USER、RE_VASH_POSTGRES_DB 设为原名称，保留连接 URL 和密码。
3. 一起重启产品 API、Web Host 与桌面。浏览器只有旧 Cookie 时重新登录；桌面以新 Cookie 名恢复未过期的已保存会话。
4. 验证产品登录、任务读取、退出及桌面会话恢复，使用更名后的命令前确认本地数据库健康。
