# 情侣点餐小系统（uni-app + Flask）

Vue3 多端点餐小系统（微信小程序 + H5）+ Flask 后端。

## 目录结构

```
.
├── src/                 # uni-app 前端源码
├── backend/             # Flask 后端（仅追踪以下两个文件）
│   ├── app.py           # 后端入口
│   └── requirements.txt # Python 依赖清单
├── package.json
└── vite.config.js
```

## 前端

```bash
# 安装依赖
npm install

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 构建
npm run build:h5
npm run build:mp-weixin
```

## 后端

> ⚠️ `backend/` 下 git 仅追踪 `app.py` 与 `requirements.txt`。
> 虚拟环境、上传图片、数据库等均为运行时数据，**不会进入版本库**，
> 全新环境 clone 后需按下面步骤自行准备。

### 首次部署

```bat
cd backend

:: 1. 创建虚拟环境
python -m venv venv

:: 2. 激活虚拟环境
venv\Scripts\activate

:: 3. 安装依赖
pip install -r requirements.txt
```

### 启动

```bat
:: 方式一：双击启动脚本（自动使用 venv，缺失时回退系统 Python）
start.bat

:: 方式二：手动
venv\Scripts\python.exe app.py
```

### 运行时数据说明（已 gitignore，不进版本库）

| 路径 | 说明 |
| --- | --- |
| `backend/venv/` | Python 虚拟环境，首次部署按上面步骤生成 |
| `backend/uploads/` | 用户上传的图片，运行时生成 |
| `backend/*.db` / `*.sqlite*` | SQLite 数据库，含运行数据 |
| `backend/instance/` | Flask 实例配置 |
| `backend/__pycache__/` | Python 字节码缓存 |

## .gitignore 说明（backend）

```gitignore
# 忽略 backend/ 下所有内容，仅放行以下两个文件
backend/*
!backend/app.py
!backend/requirements.txt
```

即 `backend/` 下默认忽略一切，仅放行 `app.py` 与 `requirements.txt`。
若将来需要追踪新的后端文件，请在 `.gitignore` 中显式追加 `!backend/xxx` 放行。
