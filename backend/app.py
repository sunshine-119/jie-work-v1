"""
我们的小厨房 - 情侣干饭点餐后端
================================================================================
技术栈:Flask + SQLite
数据库:SQLite,文件存储,自动建表

API 设计(全部 RESTful,JSON 交互):
- POST   /api/couple/bind          生成邀请码 / 输入邀请码绑定
- POST   /api/couple/unbind        解绑
- GET    /api/couple/profile       获取情侣双方资料
- PUT    /api/couple/profile       更新自己昵称/头像

- GET    /api/dishes               获取菜品列表(支持 categoryId 过滤)
- GET    /api/dishes/:id           获取单道菜详情

- GET    /api/orders               获取订单列表(?status=active/history/cancelled/rejected/all)
- POST   /api/orders               创建订单(女友下单)
- GET    /api/orders/:id           获取订单详情
- PUT    /api/orders/:id/accept    男友接单
- PUT    /api/orders/:id/later     稍后再做
- PUT    /api/orders/:id/reject    男友拒绝(必须传 reason)
- PUT    /api/orders/:id/complete  制作完成
- PUT    /api/orders/:id/finish    女友确认吃完
- PUT    /api/orders/:id/cancel    取消订单
- POST   /api/orders/:id/urge      女友催餐
- PUT    /api/orders/:id/rate      女友评分

- GET    /api/preferences          获取饮食偏好
- PUT    /api/preferences          更新饮食偏好(过敏原/不吃/口味)
- GET    /api/preferences/favorites 获取想吃收藏
- POST   /api/preferences/favorites/:dishId  切换收藏

- GET    /api/stats/monthly        男友端月度统计
- GET    /api/stats/top-dishes     女友最爱菜品排行
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sqlite3
import os
import time
import json
import random
import string
import hashlib
import secrets
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 允许跨域(前端 H5 端口不同)

# ──────────────────────────────────────────────
# 公开路径(无需 Token 即可访问)
# 精确匹配: {path: allowed_methods}  methods=None 表示所有方法公开
# 前缀匹配: {path_prefix: 'prefix'}  仅用于 /uploads/ 等子路径
# ──────────────────────────────────────────────
_PUBLIC_PATHS = {
    '/api/user/register': None,
    '/api/user/login': None,
    '/api/categories': None,
    '/api/sweet/daily': None,
    '/': None,
    '/api/dishes': ['GET'],
}
_PUBLIC_PREFIXES = ['/uploads/']


@app.after_request
def add_charset(response):
    """统一 JSON 响应标注 UTF-8 编码,避免中文/emoji 乱码"""
    if response.content_type and response.content_type.startswith('application/json'):
        response.content_type = 'application/json; charset=utf-8'
    return response


DB_PATH = os.path.join(os.path.dirname(__file__), 'kitchen.db')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 最大 5MB
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ──────────────────────────────────────────────
# 菜品标签选项（硬编码，前后端同步）
# ──────────────────────────────────────────────
TAG_OPTIONS = [
    '招牌', '经典', '她爱', '必点', '硬菜', '下饭', '快手',
    '暖胃', '养生', '健康', '清爽', '嫩滑', '浓香',
    '深夜', '儿童', '家常', '灵魂', '甜点', '下午茶',
    '治愈', '甜蜜', 'Q弹', '冰爽', '追剧', '快乐'
]

DIET_TAG_OPTIONS = [
    '少油', '少盐', '少糖', '不要葱', '不要蒜', '不要姜',
    '清淡', '低脂', '高蛋白', '低卡', '养胃', '温补',
    '温热', '去冰', '加冰', '不要太甜', '多加点辣', '多加点醋',
    '煮软点', '不要太咸', '微辣', '重辣', '辣', '甜', '酸', '素食'
]


# ──────────────────────────────────────────────
# 数据库初始化
# ──────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # 情侣表(一对一绑定)
    c.execute('''CREATE TABLE IF NOT EXISTS couples (
        id TEXT PRIMARY KEY,
        invite_code TEXT UNIQUE NOT NULL,
        bound_at INTEGER NOT NULL,
        girl_id TEXT,
        boy_id TEXT,
        use_default_dishes INTEGER DEFAULT 1
    )''')

    # 用户表(女朋友/男朋友)
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        couple_id TEXT,
        role TEXT NOT NULL,           -- 'girlfriend' | 'boyfriend'
        nickname TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password_hash TEXT DEFAULT '',
        allergens TEXT DEFAULT '[]',  -- JSON 数组:过敏原
        dislikes TEXT DEFAULT '[]',   -- JSON 数组:不吃食材
        taste_prefs TEXT DEFAULT '[]',-- JSON 数组:口味偏好
        favorites TEXT DEFAULT '[]',  -- JSON 数组:收藏菜品 id
        theme_color TEXT DEFAULT '',
        partner_call_name TEXT DEFAULT '',
        font_family TEXT DEFAULT '',
        page_config TEXT DEFAULT '',
        expand_config TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 菜品表(预制家常菜库)
    c.execute('''CREATE TABLE IF NOT EXISTS dishes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        desc TEXT DEFAULT '',
        price INTEGER DEFAULT 0,
        category_id TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        spicy INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        emoji TEXT DEFAULT '🍽️',
        bg_color TEXT DEFAULT 'linear-gradient(135deg,#FFF8F2,#F5E6D3)',
        recommend INTEGER DEFAULT 0,
        allergens TEXT DEFAULT '[]',
        dislike_tags TEXT DEFAULT '[]',
        diet_tags TEXT DEFAULT '[]',
        image TEXT DEFAULT '',
        couple_id TEXT DEFAULT '',
        created_by TEXT DEFAULT ''
    )''')

    # 订单表
    c.execute('''CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        no INTEGER NOT NULL,
        couple_id TEXT NOT NULL,
        girl_id TEXT NOT NULL,
        type TEXT NOT NULL,           -- 'dine' | 'takeout'
        dine_mode TEXT DEFAULT 'now',
        reserve_time TEXT DEFAULT '',
        table_info TEXT DEFAULT '{}', -- JSON:桌台信息
        address_info TEXT DEFAULT '{}',-- JSON:收货地址
        remark TEXT DEFAULT '',
        sweet_note TEXT DEFAULT '',
        people INTEGER DEFAULT 2,
        status INTEGER DEFAULT 0,     -- 0待接单/1制作中/2做好啦/3已完成/4已取消/5已拒绝
        reject_reason TEXT DEFAULT '',
        rating INTEGER DEFAULT 0,
        rating_comment TEXT DEFAULT '',
        rated_at INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        timeline TEXT DEFAULT '[]',   -- JSON 数组:状态时间线
        urges TEXT DEFAULT '[]',      -- JSON 数组:催餐记录
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 订单菜品表(一个订单多道菜)
    c.execute('''CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '🍽️',
        bg_color TEXT DEFAULT '',
        image TEXT DEFAULT '',
        price INTEGER DEFAULT 0,
        qty INTEGER DEFAULT 1,
        spicy INTEGER DEFAULT 0,
        diet_note TEXT DEFAULT '',
        is_custom INTEGER DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )''')

    # 收货地址表
    c.execute('''CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        couple_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        tag TEXT DEFAULT '',
        province TEXT DEFAULT '',
        city TEXT DEFAULT '',
        district TEXT DEFAULT '',
        street TEXT DEFAULT '',
        detail TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 桌台表(堂食可选)
    c.execute('''CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        desc TEXT DEFAULT '',
        seats INTEGER DEFAULT 2,
        area TEXT DEFAULT '大厅',
        sort INTEGER DEFAULT 0
    )''')

    # 个性化弹窗表(男友端配置,女友端接收)
    c.execute('''CREATE TABLE IF NOT EXISTS surprise_messages (
        id TEXT PRIMARY KEY,
        couple_id TEXT NOT NULL,
        title TEXT,
        content TEXT,
        emoji TEXT DEFAULT '💝',
        effect TEXT DEFAULT 'heart',
        bg_color TEXT DEFAULT '',
        created_at TEXT,
        read_at TEXT,
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 自定义标签选项表(按情侣/菜品类别区分)
    c.execute('''CREATE TABLE IF NOT EXISTS custom_tag_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id TEXT NOT NULL,
        tag_type TEXT NOT NULL,   -- 'tags' | 'dietTags'
        tag_value TEXT NOT NULL,
        UNIQUE(couple_id, tag_type, tag_value)
    )''')

    # 情侣分类表(每个情侣独立拥有一份分类副本,含默认分类和自定义分类)
    # 复合主键 (id, couple_id): 同一分类ID可被不同情侣独立拥有
    c.execute('''CREATE TABLE IF NOT EXISTS custom_categories (
        id TEXT NOT NULL,
        couple_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '🍽️',
        `desc` TEXT DEFAULT '',
        is_default INTEGER DEFAULT 0,
        sort INTEGER DEFAULT 0,
        created_at TEXT,
        PRIMARY KEY (id, couple_id)
    )''')

    # 被删除的默认分类表(情侣维度)
    c.execute('''CREATE TABLE IF NOT EXISTS deleted_default_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        deleted_at TEXT,
        UNIQUE(couple_id, category_id)
    )''')

    # 隐藏默认标签表(按情侣存储被移除的默认选项)
    c.execute('''CREATE TABLE IF NOT EXISTS hidden_tag_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id TEXT NOT NULL,
        tag_type TEXT NOT NULL,   -- 'tags' | 'dietTags'
        tag_value TEXT NOT NULL,
        UNIQUE(couple_id, tag_type, tag_value)
    )''')

    # 想念点击表(女友端点击,男友端接收)
    c.execute('''CREATE TABLE IF NOT EXISTS miss_taps (
        id TEXT PRIMARY KEY,
        couple_id TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        created_at TEXT,
        read_at TEXT,
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 心愿单表(女友端创建 / 男友端查看并标记完成)
    c.execute('''CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        couple_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        link TEXT DEFAULT '',
        emoji TEXT DEFAULT '💝',
        sort INTEGER DEFAULT 0,
        is_done INTEGER DEFAULT 0,
        done_by TEXT DEFAULT '',
        done_at TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 购物车表(女友端想吃清单,按 coupleId 持久化)
    c.execute('''CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        line_key TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER DEFAULT 0,
        emoji TEXT DEFAULT '🍽️',
        bg_color TEXT DEFAULT '',
        image TEXT DEFAULT '',
        qty INTEGER DEFAULT 1,
        spicy INTEGER DEFAULT 0,
        diet_note TEXT DEFAULT '',
        is_custom INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(couple_id, line_key),
        FOREIGN KEY (couple_id) REFERENCES couples(id)
    )''')

    # 菜品技能表(男友标注会做/不会做,per-couple per-dish)
    c.execute('''CREATE TABLE IF NOT EXISTS dish_skills (
        dish_id TEXT NOT NULL,
        couple_id TEXT NOT NULL,
        can_cook INTEGER DEFAULT -1,
        PRIMARY KEY (dish_id, couple_id)
    )''')

    # Token 表(用户登录态)
    c.execute('''CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # ── 表结构迁移(兼容旧数据库,必须在插入种子数据前执行)──
    # 先迁移旧表结构,避免 seed_dishes/seed_tables 因缺列而失败,
    # 进而导致 _migrate 未执行、后续所有接口 500
    _migrate(c)

    # 初始化种子数据(菜品库)
    c.execute("SELECT COUNT(*) as cnt FROM dishes")
    if c.fetchone()['cnt'] == 0:
        seed_dishes(c)

    # 初始化桌台数据
    c.execute("SELECT COUNT(*) as cnt FROM tables")
    if c.fetchone()['cnt'] == 0:
        seed_tables(c)

    # 初始化演示情侣(保证前端默认 demo 账号的外键可用)
    seed_demo_couple(c)

    conn.commit()
    conn.close()


def _migrate(c):
    """为旧表追加新列(SQLite 不支持 IF NOT EXISTS,用 try-except)
    必须在 seed_dishes / seed_tables 之前执行,否则旧表缺列会导致 INSERT 失败,
    进而 _migrate 无法执行,所有接口 500。
    为每个表补齐所有有默认值的非主键列,确保旧数据库能兼容新代码。
    """
    def add_col(table, col, decl):
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")
        except sqlite3.OperationalError:
            pass

    # ── couples 表:补齐可能缺失的列 ──
    for col, decl in [
        ('girl_id', "TEXT"),
        ('boy_id', "TEXT"),
        ('use_default_dishes', "INTEGER DEFAULT 1"),
    ]:
        add_col('couples', col, decl)

    # ── users 表:补齐所有可能缺失的列 ──
    for col, decl in [
        ('avatar', "TEXT DEFAULT ''"),
        ('username', "TEXT DEFAULT ''"),
        ('password_hash', "TEXT DEFAULT ''"),
        ('allergens', "TEXT DEFAULT '[]'"),
        ('dislikes', "TEXT DEFAULT '[]'"),
        ('taste_prefs', "TEXT DEFAULT '[]'"),
        ('favorites', "TEXT DEFAULT '[]'"),
        ('theme_color', "TEXT DEFAULT ''"),
        ('partner_call_name', "TEXT DEFAULT ''"),
        ('font_family', "TEXT DEFAULT ''"),
        ('page_config', "TEXT DEFAULT ''"),
        ('expand_config', "TEXT DEFAULT ''"),
    ]:
        add_col('users', col, decl)

    # ── dishes 表:补齐所有可能缺失的列(含基础字段)──
    for col, decl in [
        ('desc', "TEXT DEFAULT ''"),
        ('price', "INTEGER DEFAULT 0"),
        ('tags', "TEXT DEFAULT '[]'"),
        ('spicy', "INTEGER DEFAULT 0"),
        ('sales', "INTEGER DEFAULT 0"),
        ('emoji', "TEXT DEFAULT '🍽️'"),
        ('bg_color', "TEXT DEFAULT 'linear-gradient(135deg,#FFF8F2,#F5E6D3)'"),
        ('recommend', "INTEGER DEFAULT 0"),
        ('allergens', "TEXT DEFAULT '[]'"),
        ('dislike_tags', "TEXT DEFAULT '[]'"),
        ('diet_tags', "TEXT DEFAULT '[]'"),
        ('image', "TEXT DEFAULT ''"),
        ('couple_id', "TEXT DEFAULT ''"),
        ('created_by', "TEXT DEFAULT ''"),
    ]:
        add_col('dishes', col, decl)

    # ── orders 表:补齐所有可能缺失的列(含基础字段)──
    for col, decl in [
        ('dine_mode', "TEXT DEFAULT 'now'"),
        ('reserve_time', "TEXT DEFAULT ''"),
        ('table_info', "TEXT DEFAULT '{}'"),
        ('address_info', "TEXT DEFAULT '{}'"),
        ('remark', "TEXT DEFAULT ''"),
        ('sweet_note', "TEXT DEFAULT ''"),
        ('people', "INTEGER DEFAULT 2"),
        ('status', "INTEGER DEFAULT 0"),
        ('reject_reason', "TEXT DEFAULT ''"),
        ('rating', "INTEGER DEFAULT 0"),
        ('rating_comment', "TEXT DEFAULT ''"),
        ('rated_at', "INTEGER DEFAULT 0"),
        ('timeline', "TEXT DEFAULT '[]'"),
        ('urges', "TEXT DEFAULT '[]'"),
    ]:
        add_col('orders', col, decl)

    # ── order_items 表:补齐所有可能缺失的列(含基础字段)──
    for col, decl in [
        ('emoji', "TEXT DEFAULT '🍽️'"),
        ('bg_color', "TEXT DEFAULT ''"),
        ('image', "TEXT DEFAULT ''"),
        ('price', "INTEGER DEFAULT 0"),
        ('qty', "INTEGER DEFAULT 1"),
        ('spicy', "INTEGER DEFAULT 0"),
        ('diet_note', "TEXT DEFAULT ''"),
        ('is_custom', "INTEGER DEFAULT 0"),
    ]:
        add_col('order_items', col, decl)

    # ── addresses 表:补齐所有可能缺失的列 ──
    for col, decl in [
        ('tag', "TEXT DEFAULT ''"),
        ('province', "TEXT DEFAULT ''"),
        ('city', "TEXT DEFAULT ''"),
        ('district', "TEXT DEFAULT ''"),
        ('street', "TEXT DEFAULT ''"),
        ('is_default', "INTEGER DEFAULT 0"),
    ]:
        add_col('addresses', col, decl)

    # ── cart_items 表:补齐所有可能缺失的列 ──
    for col, decl in [
        ('emoji', "TEXT DEFAULT '🍽️'"),
        ('bg_color', "TEXT DEFAULT ''"),
        ('image', "TEXT DEFAULT ''"),
        ('spicy', "INTEGER DEFAULT 0"),
        ('diet_note', "TEXT DEFAULT ''"),
        ('is_custom', "INTEGER DEFAULT 0"),
    ]:
        add_col('cart_items', col, decl)

    # ── custom_categories 表:补齐 desc 和 is_default 列 ──
    for col, decl in [
        ('`desc`', "TEXT DEFAULT ''"),
        ('is_default', "INTEGER DEFAULT 0"),
    ]:
        add_col('custom_categories', col, decl)

    # ── custom_categories 表:迁移到复合主键 (id, couple_id) ──
    # 旧表使用 id TEXT PRIMARY KEY(单列主键),不支持同一分类ID跨情侣
    # 新表使用 PRIMARY KEY (id, couple_id),每个情侣独立拥有一份分类副本
    schema_row = c.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_categories'"
    ).fetchone()
    if schema_row:
        schema_sql = schema_row['sql'] or ''
        needs_migration = 'PRIMARY KEY (id, couple_id)' not in schema_sql
        if needs_migration:
            c.execute('''CREATE TABLE custom_categories_new (
                id TEXT NOT NULL,
                couple_id TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT DEFAULT '🍽️',
                `desc` TEXT DEFAULT '',
                is_default INTEGER DEFAULT 0,
                sort INTEGER DEFAULT 0,
                created_at TEXT,
                PRIMARY KEY (id, couple_id)
            )''')
            c.execute('INSERT OR IGNORE INTO custom_categories_new (id, couple_id, name, icon, `desc`, is_default, sort, created_at) SELECT id, couple_id, name, icon, `desc`, is_default, sort, created_at FROM custom_categories')
            c.execute('DROP TABLE custom_categories')
            c.execute('ALTER TABLE custom_categories_new RENAME TO custom_categories')


def seed_demo_couple(c):
    """初始化前端默认演示情侣,使地址/订单等外键校验可正常通过"""
    demo_id = 'couple_demo_001'
    demo_code = 'LOVE2024'
    demo_girl = 'gf_001'
    demo_boy = 'bf_001'
    exists = c.execute("SELECT id FROM couples WHERE id=?", (demo_id,)).fetchone()
    if not exists:
        ts = now()
        c.execute('''INSERT INTO couples (id, invite_code, bound_at, girl_id, boy_id)
                     VALUES (?,?,?,?,?)''', (demo_id, demo_code, ts, demo_girl, demo_boy))
        c.execute('''INSERT OR IGNORE INTO users (id,couple_id,role,nickname,created_at)
                     VALUES (?,?,?,?,?)''', (demo_girl, demo_id, 'girlfriend', '小馋猫', ts))
        c.execute('''INSERT OR IGNORE INTO users (id,couple_id,role,nickname,created_at)
                     VALUES (?,?,?,?,?)''', (demo_boy, demo_id, 'boyfriend', '大厨哥', ts))


def _seed_dish_tuples():
    """返回默认菜品元组列表(用于种子初始化和新账号默认数据,单一数据源)。
    每个元组:(id, name, desc, price, category_id, tags, spicy, sales, emoji, bg_color, recommend, allergens, diet_tags)
    """
    bg_pink = 'linear-gradient(135deg,#FFE8EE,#F5B6C1)'
    bg_cream = 'linear-gradient(135deg,#FFF8F2,#F5E6D3)'
    bg_taro = 'linear-gradient(135deg,#EDE4F3,#C8B6D9)'
    bg_mint = 'linear-gradient(135deg,#E8F5E9,#C8E6C9)'
    bg_peach = 'linear-gradient(135deg,#FFE5D9,#FFCDB2)'
    bg_lemon = 'linear-gradient(135deg,#FFF9C4,#FFF176)'

    return [
        # 早餐
        ('b001','豆浆油条','热腾腾豆浆配现炸油条,经典中式暖晨',8,'breakfast','[]',0,0,'🥛🥖',bg_cream,1,'["小麦","大豆"]','[]'),
        ('b002','皮蛋瘦肉粥','慢熬白粥配皮蛋瘦肉,暖胃好消化',12,'breakfast','[]',0,0,'🍚',bg_cream,1,'["蛋"]','[]'),
        ('b003','鸡蛋灌饼','现烤酥脆饼皮裹嫩滑鸡蛋,一口满足',10,'breakfast','[]',0,0,'🥞',bg_peach,0,'["蛋","小麦"]','[]'),
        ('b004','小笼包','薄皮多汁肉馅,咬一口汤汁四溢',15,'breakfast','[]',0,0,'🥟',bg_cream,0,'["小麦"]','[]'),
        ('b005','牛奶燕麦','温牛奶泡软燕麦,加点水果更健康',10,'breakfast','[]',0,0,'🥣',bg_mint,0,'["奶","小麦"]','[]'),
        ('b006','三明治','火腿蛋生菜夹吐司,快手又营养',14,'breakfast','[]',0,0,'🥪',bg_mint,0,'["蛋","小麦","奶"]','[]'),
        # 午餐
        ('l001','番茄炒蛋','酸甜开胃经典菜,拌米饭绝了',16,'lunch','[]',0,0,'🍳',bg_peach,1,'["蛋"]','[]'),
        ('l002','宫保鸡丁','花生鸡丁微辣甜口,经典川菜代表',28,'lunch','[]',2,0,'🍗',bg_pink,0,'["花生"]','[]'),
        ('l003','红烧肉','肥而不腻入口即化,下饭神器',32,'lunch','[]',0,0,'🥩',bg_peach,0,'[]','[]'),
        ('l004','鱼香肉丝','酸甜咸辣四味俱全,拌饭超好吃',26,'lunch','[]',1,0,'🥘',bg_pink,0,'["小麦"]','[]'),
        ('l005','麻婆豆腐','麻辣鲜香嫩豆腐,一勺一碗饭',18,'lunch','[]',2,0,'🍲',bg_pink,0,'["大豆"]','[]'),
        ('l006','糖醋排骨','外酥里嫩酸甜可口,她的最爱',35,'lunch','[]',0,0,'🍖',bg_peach,1,'["小麦"]','[]'),
        ('l007','清炒时蔬','当季青菜蒜蓉清炒,清爽解腻',14,'lunch','[]',0,0,'🥬',bg_mint,0,'[]','[]'),
        ('l008','可乐鸡翅','可乐上色焖煮鸡翅,甜嫩多汁',28,'lunch','[]',0,0,'🍗',bg_peach,0,'["小麦"]','[]'),
        # 晚餐
        ('d001','酸辣汤','胡椒酸辣开胃汤,冬天喝超暖',16,'dinner','[]',1,0,'🍜',bg_pink,0,'["蛋","大豆"]','[]'),
        ('d002','红烧鱼','整鱼红烧入味,年年有余好寓意',42,'dinner','[]',0,0,'🐟',bg_cream,0,'["海鲜"]','[]'),
        ('d003','蒜蓉西兰花','翠绿西兰花配蒜香,健康又好吃',16,'dinner','[]',0,0,'🥦',bg_mint,0,'[]','[]'),
        ('d004','紫菜蛋花汤','简简单单一碗汤,暖到心里',10,'dinner','[]',0,0,'🥣',bg_taro,1,'["蛋","海鲜"]','[]'),
        ('d005','土豆炖牛肉','软糯土豆吸满肉汁,牛肉酥烂',38,'dinner','[]',0,0,'🍖',bg_peach,0,'["小麦"]','[]'),
        ('d006','蒸蛋羹','滑嫩如布丁的蒸蛋,入口即化',12,'dinner','[]',0,0,'🍮',bg_cream,0,'["蛋"]','[]'),
        # 夜宵
        ('n001','泡面加蛋','深夜灵魂料理,加个蛋更满足',8,'lateNight','[]',1,0,'🍜',bg_lemon,1,'["蛋","小麦"]','[]'),
        ('n002','烤串','孜然辣椒烤羊肉串,深夜的快乐',30,'lateNight','[]',2,0,'🍢',bg_pink,0,'[]','[]'),
        ('n003','煎饺','底脆皮软汁多,配醋吃超香',18,'lateNight','[]',0,0,'🥟',bg_peach,0,'["小麦"]','[]'),
        ('n004','小馄饨','清汤小馄饨,深夜暖胃小确幸',14,'lateNight','[]',0,0,'🥟',bg_cream,0,'["小麦","蛋"]','[]'),
        ('n005','麻辣烫','想吃什么烫什么,麻辣鲜香',25,'lateNight','[]',3,0,'🍲',bg_pink,0,'["大豆","花生"]','[]'),
        # 甜品
        ('ds001','芒果布丁','香甜芒果配滑嫩布丁,超治愈',16,'dessert','[]',0,0,'🥭',bg_lemon,1,'["奶","芒果","蛋"]','[]'),
        ('ds002','草莓蛋糕','鲜奶油草莓蛋糕,甜到心里',28,'dessert','[]',0,0,'🍰',bg_pink,0,'["奶","蛋","小麦"]','[]'),
        ('ds003','芋圆烧仙草','Q弹芋圆配凉草,夏天来一碗',18,'dessert','[]',0,0,'🍨',bg_taro,0,'["奶"]','[]'),
        ('ds004','红豆双皮奶','滑嫩双皮奶配蜜红豆,港式经典',16,'dessert','[]',0,0,'🍮',bg_cream,0,'["奶"]','[]'),
        ('ds005','巧克力冰淇淋','浓郁巧克力味冰淇淋,开心加倍',14,'dessert','[]',0,0,'🍦',bg_cream,0,'["奶","坚果"]','[]'),
        ('ds006','水果拼盘','当季新鲜水果切好,不用洗',20,'dessert','[]',0,0,'🍓',bg_mint,0,'["芒果"]','[]'),
        # 零食
        ('s001','薯片','咔嚓咔嚓停不下来,追剧必备',8,'snack','[]',0,0,'🥔',bg_lemon,0,'[]','[]'),
        ('s002','坚果拼盘','核桃腰果杏仁,补脑又好吃',20,'snack','[]',0,0,'🥜',bg_peach,0,'["坚果","花生"]','[]'),
        ('s003','酸奶','浓稠酸奶助消化,冰镇更好喝',8,'snack','[]',0,0,'🥛',bg_mint,0,'["奶"]','[]'),
        ('s004','果冻','QQ弹弹果味果冻,童年味道',6,'snack','[]',0,0,'🍮',bg_pink,0,'["芒果"]','[]'),
        ('s005','辣条','偶尔来一包,快乐似神仙',5,'snack','[]',3,0,'🌶️',bg_pink,0,'["小麦","大豆"]','[]'),
        ('s006','巧克力','甜甜的巧克力,心情不好来一块',12,'snack','[]',0,0,'🍫',bg_cream,0,'["奶","坚果","大豆"]','[]'),
    ]


def seed_dishes(c):
    """初始化预制菜品库"""
    for d in _seed_dish_tuples():
        c.execute('''INSERT INTO dishes (id,name,desc,price,category_id,tags,spicy,sales,emoji,bg_color,recommend,allergens,diet_tags)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''', d)


# ──────────────────────────────────────────────
# 默认分类定义(每个新情侣首次访问时复制一份独立副本)
# ──────────────────────────────────────────────
DEFAULT_CATEGORIES = [
    {'id': 'breakfast', 'name': '早餐', 'icon': '🍳', 'desc': '元气满满开启一天', 'sort': 0},
    {'id': 'lunch', 'name': '午餐', 'icon': '🍱', 'desc': '正正经经吃顿好的', 'sort': 10},
    {'id': 'dinner', 'name': '晚餐', 'icon': '🍲', 'desc': '慢慢吃,不着急', 'sort': 20},
    {'id': 'lateNight', 'name': '夜宵', 'icon': '🍜', 'desc': '饿了就吃点暖的', 'sort': 30},
    {'id': 'dessert', 'name': '甜品', 'icon': '🍰', 'desc': '生活需要点甜', 'sort': 40},
    {'id': 'snack', 'name': '零食', 'icon': '🍿', 'desc': '解馋小可爱', 'sort': 50},
]

DEFAULT_CAT_IDS = {c['id'] for c in DEFAULT_CATEGORIES}


def ensure_couple_defaults(couple_id):
    """确保情侣拥有默认分类和菜品的独立副本(首次访问时懒初始化)。
    每个新账号都会获得一份默认数据,可独立增删改查排序,互不影响。
    若种子菜品(couple_id='')不存在(如本地数据库被污染),则直接写入硬编码默认菜品。
    若 couples.use_default_dishes = 0,则跳过默认数据注入(情侣选择空白启动)。
    """
    if not couple_id or couple_id == 'couple_demo_001':
        return
    conn = get_db()
    try:
        # 0. 检查情侣是否禁用默认菜品
        cp = conn.execute("SELECT use_default_dishes FROM couples WHERE id=?", (couple_id,)).fetchone()
        use_default = 1
        if cp:
            use_default = cp['use_default_dishes'] if cp['use_default_dishes'] is not None else 1
        if use_default == 0:
            return  # 情侣选择不使用默认菜品,跳过全部默认数据注入

        # 1. 检查是否已有分类,没有则插入默认分类
        existing_cats = conn.execute(
            "SELECT COUNT(*) as cnt FROM custom_categories WHERE couple_id=?",
            (couple_id,)
        ).fetchone()['cnt']
        if existing_cats == 0:
            ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            for cat in DEFAULT_CATEGORIES:
                conn.execute(
                    "INSERT OR IGNORE INTO custom_categories (id, couple_id, name, icon, `desc`, is_default, sort, created_at) VALUES (?,?,?,?,?,?,?,?)",
                    (cat['id'], couple_id, cat['name'], cat['icon'], cat['desc'], 1, cat['sort'], ts)
                )

        # 2. 检查是否已有菜品,没有则复制种子菜品
        existing_dishes = conn.execute(
            "SELECT COUNT(*) as cnt FROM dishes WHERE couple_id=?",
            (couple_id,)
        ).fetchone()['cnt']
        if existing_dishes == 0:
            seed_rows = conn.execute("SELECT * FROM dishes WHERE couple_id=''").fetchall()
            if seed_rows:
                # 正常路径:复制种子菜品
                for r in seed_rows:
                    new_id = gen_id('D')
                    conn.execute('''INSERT INTO dishes
                        (id, name, desc, price, category_id, tags, spicy, sales, emoji, bg_color,
                         recommend, allergens, dislike_tags, diet_tags, image, couple_id, created_by)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                        (new_id, r['name'], r['desc'], r['price'], r['category_id'], r['tags'],
                         r['spicy'], r['sales'], r['emoji'], r['bg_color'],
                         r['recommend'], r['allergens'], r['dislike_tags'], r['diet_tags'],
                         r['image'], couple_id, ''))
            else:
                # 降级路径:种子菜品不存在(数据库被污染/首次 init_db 被跳过),直接写入硬编码默认菜品
                for d in _seed_dish_tuples():
                    new_id = gen_id('D')
                    conn.execute('''INSERT INTO dishes
                        (id, name, desc, price, category_id, tags, spicy, sales, emoji, bg_color,
                         recommend, allergens, dislike_tags, diet_tags, image, couple_id, created_by)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                        (new_id, d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9],
                         d[10], d[11], '[]', d[12], '', couple_id, ''))  # 17 params
        conn.commit()
    finally:
        conn.close()


def seed_tables(c):
    """初始化堂食桌台数据"""
    tables = [
        ('T01', 'A01', '大厅双人位 · 明亮', 2, '大厅', 1),
        ('T02', 'A02', '大厅双人位 · 安静', 2, '大厅', 2),
        ('T03', 'A03', '大厅四人位 · 宽敞', 4, '大厅', 3),
        ('T04', 'A05', '靠窗双人位 · 安静', 2, '靠窗区', 4),
        ('T05', 'A06', '靠窗四人位 · 暖阳', 4, '靠窗区', 5),
        ('T06', 'B01', '卡座四人位 · 沙发', 4, '卡座区', 6),
        ('T07', 'B02', '卡座四人位 · 软包', 4, '卡座区', 7),
        ('T08', 'B03', '卡座六人位 · 聚会', 6, '卡座区', 8),
        ('T09', 'V1', '包厢四人位 · 私密', 4, '包厢区', 9),
        ('T10', 'V2', '包厢六人位 · 私密', 6, '包厢区', 10),
        ('T11', 'V3', '包厢八人位 · 宴请', 8, '包厢区', 11),
        ('T12', 'V5', '包厢十人位 · 团聚', 10, '包厢区', 12),
        ('T13', '露台 1 号', '露台双人位 · 观景', 2, '露台区', 13),
        ('T14', '露台 2 号', '露台四人位 · 晚风', 4, '露台区', 14),
        ('T15', '露台 3 号', '露台六人位 · 星空', 6, '露台区', 15),
    ]
    for t in tables:
        c.execute('''INSERT OR REPLACE INTO tables (id,name,desc,seats,area,sort)
                     VALUES (?,?,?,?,?,?)''', t)


# ──────────────────────────────────────────────
# 工具函数
# ──────────────────────────────────────────────
_id_counter = 0

def gen_id(prefix=''):
    global _id_counter
    _id_counter = (_id_counter + 1) % 10000
    return f"{prefix}{int(time.time()*1000)}{random.randint(100,999)}{_id_counter:04d}"

def gen_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def now():
    return int(time.time() * 1000)

def hash_password(password):
    """简单密码哈希(sha256 + 随机盐)"""
    salt = secrets.token_hex(8)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"

def verify_password(password, stored):
    if not stored or '$' not in stored:
        return False
    salt, h = stored.split('$', 1)
    return hashlib.sha256((salt + password).encode()).hexdigest() == h

# ──────────────────────────────────────────────
# 前端传输加密/解密（与前端 crypto.js 对应）
# ──────────────────────────────────────────────
_TRANSFER_KEY = 'X1a7b9c3d5e8f2g4'

def _hex_to_str(hex_str):
    """将 hex 编码解码为字符串"""
    result = ''
    for i in range(0, len(hex_str), 4):
        result += chr(int(hex_str[i:i+4], 16))
    return result

def _str_to_hex(s):
    """将字符串编码为 hex"""
    return ''.join(ord(c).to_bytes(2, 'big').hex() for c in s)

def decrypt_transfer_password(ciphertext):
    """
    解密前端传来的加密密码:
    - 若为 hex 格式(仅含 0-9a-f),尝试 XOR 解密
    - 否则原样返回(兼容旧版本)
    """
    if not ciphertext or not all(c in '0123456789abcdef' for c in ciphertext.lower()):
        return ciphertext
    try:
        decoded = _hex_to_str(ciphertext.lower())
        key = _TRANSFER_KEY
        decrypted = ''.join(chr(ord(decoded[i]) ^ ord(key[i % len(key)])) for i in range(len(decoded)))
        # 校验:解密结果应为可打印 ASCII 或含中文字符
        if decrypted and all(ord(c) >= 32 for c in decrypted):
            return decrypted
    except Exception:
        pass
    return ciphertext

# ──────────────────────────────────────────────
# Token 认证
# ──────────────────────────────────────────────
TOKEN_TTL = 7 * 24 * 3600 * 1000  # 7 天,毫秒

def generate_token(user_id):
    """为用户生成新 Token,返回 token 字符串"""
    token = secrets.token_hex(32)
    ts = now()
    conn = get_db()
    try:
        # 同一用户只保留最近 5 个 token
        old = conn.execute("SELECT token FROM tokens WHERE user_id=? ORDER BY created_at DESC LIMIT -1 OFFSET 5", (user_id,)).fetchall()
        for r in old:
            conn.execute("DELETE FROM tokens WHERE token=?", (r['token'],))
        conn.execute("INSERT INTO tokens (token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
                     (token, user_id, ts, ts + TOKEN_TTL))
        conn.commit()
        return token
    finally:
        conn.close()

def verify_token(token):
    """验证 Token,返回用户信息字典或 None"""
    if not token:
        return None
    conn = get_db()
    try:
        ts = now()
        r = conn.execute("SELECT * FROM tokens WHERE token=?", (token,)).fetchone()
        if not r or r['expires_at'] < ts:
            if r:
                conn.execute("DELETE FROM tokens WHERE token=?", (token,))
                conn.commit()
            return None
        user = conn.execute("SELECT * FROM users WHERE id=?", (r['user_id'],)).fetchone()
        if not user:
            return None
        return dict(user)
    finally:
        conn.close()

def revoke_token(token):
    """注销 Token (退出登录)"""
    if not token:
        return
    conn = get_db()
    try:
        conn.execute("DELETE FROM tokens WHERE token=?", (token,))
        conn.commit()
    finally:
        conn.close()

def safe_col(d, key, default=''):
    """安全读取列值(兼容迁移前旧表)"""
    return d.get(key, default) if isinstance(d, dict) else default

def json_loads(s, default=None):
    if not s:
        return default if default is not None else []
    try:
        return json.loads(s)
    except:
        return default if default is not None else []

def row_to_dict(row):
    if not row:
        return None
    d = dict(row)
    return d

def dish_to_dict(r):
    """菜品 Row → 前端 JSON(兼容迁移前旧表)"""
    d = dict(r)
    return {
        'id': d.get('id', ''), 'name': d.get('name', ''), 'desc': d.get('desc', ''),
        'price': d.get('price', 0), 'categoryId': d.get('category_id', ''),
        'tags': json_loads(d.get('tags', '[]')), 'spicy': d.get('spicy', 0),
        'sales': d.get('sales', 0), 'emoji': d.get('emoji', '🍽️'),
        'bgColor': d.get('bg_color', ''), 'recommend': bool(d.get('recommend', 0)),
        'allergens': json_loads(d.get('allergens', '[]')),
        'dislikeTags': json_loads(d.get('dislike_tags', '[]')),
        'dietTags': json_loads(d.get('diet_tags', '[]')),
        'image': d.get('image', ''), 'coupleId': d.get('couple_id', ''),
        'createdBy': d.get('created_by', ''),
        'isCustom': bool(d.get('created_by', ''))
    }

def order_to_dict(row, conn):
    d = row_to_dict(row)
    # JSON 字段反序列化
    d['table'] = json_loads(d.pop('table_info', '{}'), {})
    d['address'] = json_loads(d.pop('address_info', '{}'), {})
    d['timeline'] = json_loads(d.pop('timeline', '[]'))
    d['urges'] = json_loads(d.pop('urges', '[]'))
    d['sweetNote'] = d.pop('sweet_note', '')
    d['reserveTime'] = d.pop('reserve_time', '')
    d['rejectReason'] = d.pop('reject_reason', '')
    d['ratingComment'] = d.pop('rating_comment', '')
    d['ratedAt'] = d.pop('rated_at', 0)
    d['dineMode'] = d.pop('dine_mode', 'now')
    d['createdAt'] = d.pop('created_at', 0)
    # 查菜品明细
    items = conn.execute("SELECT * FROM order_items WHERE order_id=?", (d['id'],)).fetchall()
    d['items'] = []
    for it in items:
        item = row_to_dict(it)
        # 前端约定:id = 菜品 id；itemId = 订单菜品唯一 id(用于 key)
        item['id'] = item.pop('dish_id', '')
        item['itemId'] = item.pop('id', 0)
        item['isCustom'] = bool(item.pop('is_custom', 0))
        item['dietNote'] = item.pop('diet_note', '')
        item['bgColor'] = item.pop('bg_color', '')
        item['image'] = item.get('image', '')
        d['items'].append(item)
    return d


# ──────────────────────────────────────────────
# 用户注册 / 登录 API
# ──────────────────────────────────────────────
@app.route('/api/user/register', methods=['POST'])
def user_register():
    """
    注册:{ username, password, role, nickname }
    注册后角色固定不可改,返回 userId(尚未配对 coupleId 为空)
    """
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = decrypt_transfer_password(data.get('password') or '')
    role = data.get('role', '')
    nickname = (data.get('nickname') or '').strip()

    if not username or not password or role not in ('girlfriend', 'boyfriend'):
        return jsonify({'code': 400, 'msg': '请填写用户名、密码并选择角色'}), 400
    if len(username) < 2:
        return jsonify({'code': 400, 'msg': '用户名至少2个字符'}), 400
    if len(password) < 6:
        return jsonify({'code': 400, 'msg': '密码至少6位'}), 400
    if not nickname:
        nickname = '小馋猫' if role == 'girlfriend' else '大厨哥'

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
        if existing:
            return jsonify({'code': 409, 'msg': '用户名已存在'}), 409
        user_id = gen_id('U')
        conn.execute('''INSERT INTO users (id, role, nickname, username, password_hash, created_at)
                        VALUES (?,?,?,?,?,?)''',
                     (user_id, role, nickname, username, hash_password(password), now()))
        conn.commit()
        token = generate_token(user_id)
        return jsonify({'code': 0, 'data': {
            'userId': user_id, 'role': role, 'nickname': nickname,
            'avatar': '', 'coupleId': '', 'isBound': False, 'inviteCode': '',
            'token': token
        }})
    finally:
        conn.close()


@app.route('/api/user/login', methods=['POST'])
def user_login():
    """
    登录:{ username, password }
    返回 userId / role / nickname / coupleId / isBound / inviteCode
    """
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = decrypt_transfer_password(data.get('password') or '')
    if not username or not password:
        return jsonify({'code': 400, 'msg': '请输入用户名和密码'}), 400

    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        if not r or not verify_password(password, r['password_hash']):
            return jsonify({'code': 401, 'msg': '用户名或密码错误'}), 401
        couple_id = r['couple_id'] or ''
        is_bound = False
        invite_code = ''
        if couple_id:
            cp = conn.execute("SELECT * FROM couples WHERE id=?", (couple_id,)).fetchone()
            if cp:
                is_bound = bool(cp['girl_id'] and cp['boy_id'])
                invite_code = cp['invite_code'] or ''
        rd = dict(r)
        token = generate_token(rd['id'])
        return jsonify({'code': 0, 'data': {
            'userId': rd['id'], 'role': rd['role'], 'nickname': rd['nickname'],
            'avatar': rd['avatar'], 'themeColor': rd.get('theme_color', '') or '',
            'fontFamily': rd.get('font_family', '') or '',
            'partnerCallName': rd.get('partner_call_name', '') or '',
            'pageConfig': rd.get('page_config', '') or '',
            'expandConfig': rd.get('expand_config', '') or '',
            'coupleId': couple_id, 'isBound': is_bound, 'inviteCode': invite_code,
            'token': token
        }})
    finally:
        conn.close()


@app.route('/api/user/logout', methods=['POST'])
def user_logout():
    """退出登录,注销当前 Token"""
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        token = request.headers.get('token', '') or request.args.get('token', '')
    if token:
        revoke_token(token)
    return jsonify({'code': 0, 'msg': '已退出登录'})


# ──────────────────────────────────────────────
# 情侣绑定 API
# ──────────────────────────────────────────────
@app.route('/api/couple/bind', methods=['POST'])
def couple_bind():
    """
    配对流程(需先注册登录,传 userId):
    - 一方 POST {action:'generate', userId} -> 创建 couple,返回 inviteCode
    - 另一方 POST {action:'join', userId, inviteCode} -> 绑定成功
    """
    data = request.get_json() or {}
    action = data.get('action')
    user_id = data.get('userId')

    if not user_id:
        return jsonify({'code': 401, 'msg': '请先登录'}), 401

    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            return jsonify({'code': 404, 'msg': '用户不存在'}), 404
        role = user['role']

        if action == 'generate':
            # 已有 couple 则返回已有邀请码
            if user['couple_id']:
                cp = conn.execute("SELECT * FROM couples WHERE id=?", (user['couple_id'],)).fetchone()
                if cp:
                    return jsonify({'code': 0, 'data': {
                        'inviteCode': cp['invite_code'], 'coupleId': cp['id'], 'isBound': bool(cp['girl_id'] and cp['boy_id'])
                    }})
            invite_code = gen_invite_code()
            while conn.execute("SELECT id FROM couples WHERE invite_code=?", (invite_code,)).fetchone():
                invite_code = gen_invite_code()
            couple_id = gen_id('C')
            conn.execute("INSERT INTO couples (id, invite_code, bound_at) VALUES (?,?,?)",
                         (couple_id, invite_code, 0))
            conn.execute("UPDATE users SET couple_id=? WHERE id=?", (couple_id, user_id))
            if role == 'girlfriend':
                conn.execute("UPDATE couples SET girl_id=? WHERE id=?", (user_id, couple_id))
            else:
                conn.execute("UPDATE couples SET boy_id=? WHERE id=?", (user_id, couple_id))
            conn.commit()
            return jsonify({'code': 0, 'data': {
                'inviteCode': invite_code, 'coupleId': couple_id, 'isBound': False
            }})

        elif action == 'join':
            invite_code = data.get('inviteCode', '').strip().upper()
            row = conn.execute("SELECT * FROM couples WHERE invite_code=?", (invite_code,)).fetchone()
            if not row:
                return jsonify({'code': 404, 'msg': '邀请码不存在,请让对方重新生成'}), 404
            couple_id = row['id']
            if row['girl_id'] and row['boy_id']:
                return jsonify({'code': 400, 'msg': '这对情侣已经配对啦'}), 400
            existing_role = 'girlfriend' if row['girl_id'] else None
            if existing_role == role:
                return jsonify({'code': 400, 'msg': '这个角色已经有人啦,换一个角色试试'}), 400
            conn.execute("UPDATE users SET couple_id=? WHERE id=?", (couple_id, user_id))
            if role == 'girlfriend':
                conn.execute("UPDATE couples SET girl_id=?, bound_at=? WHERE id=?", (user_id, now(), couple_id))
            else:
                conn.execute("UPDATE couples SET boy_id=?, bound_at=? WHERE id=?", (user_id, now(), couple_id))
            conn.commit()
            return jsonify({'code': 0, 'data': {
                'coupleId': couple_id, 'isBound': True
            }})

        return jsonify({'code': 400, 'msg': '参数错误'}), 400
    finally:
        conn.close()


@app.route('/api/couple/unbind', methods=['POST'])
def couple_unbind():
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    conn.execute("UPDATE couples SET girl_id=NULL, boy_id=NULL WHERE id=?", (couple_id,))
    conn.execute("UPDATE users SET couple_id=NULL WHERE couple_id=?", (couple_id,))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '已解绑'})


@app.route('/api/couple/profile', methods=['GET'])
def couple_profile():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    cp = conn.execute("SELECT * FROM couples WHERE id=?", (couple_id,)).fetchone()
    if not cp:
        conn.close()
        return jsonify({'code': 404, 'msg': '情侣不存在'}), 404
    girl = conn.execute("SELECT * FROM users WHERE id=?", (cp['girl_id'],)).fetchone() if cp['girl_id'] else None
    boy = conn.execute("SELECT * FROM users WHERE id=?", (cp['boy_id'],)).fetchone() if cp['boy_id'] else None
    conn.close()
    def u2d(u):
        if not u: return None
        ud = dict(u)
        return {
            'id': ud['id'], 'role': ud['role'], 'nickname': ud['nickname'], 'avatar': ud['avatar'],
            'allergens': json_loads(ud['allergens']),
            'dislikes': json_loads(ud['dislikes']),
            'tastePrefs': json_loads(ud['taste_prefs']),
            'favorites': json_loads(ud['favorites']),
            'themeColor': ud.get('theme_color', '') or '',
            'fontFamily': ud.get('font_family', '') or '',
            'partnerCallName': ud.get('partner_call_name', '') or '',
            'pageConfig': ud.get('page_config', '') or '',
        }
    return jsonify({'code': 0, 'data': {
        'id': cp['id'], 'inviteCode': cp['invite_code'], 'boundAt': cp['bound_at'],
        'useDefaultDishes': bool(cp['use_default_dishes']) if cp['use_default_dishes'] is not None else True,
        'me': None,  # 前端根据 userId 自行判断
        'girlfriend': u2d(girl), 'boyfriend': u2d(boy)
    }})


@app.route('/api/couple/profile', methods=['PUT'])
def update_profile():
    data = request.get_json() or {}
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'code': 400, 'msg': '缺少userId'}), 400
    conn = get_db()
    try:
        updates = []
        params = []
        if 'nickname' in data:
            updates.append("nickname=?")
            params.append(data['nickname'])
        if 'avatar' in data:
            updates.append("avatar=?")
            params.append(data['avatar'])
        if 'allergens' in data:
            updates.append("allergens=?")
            params.append(json.dumps(data['allergens']))
        if 'dislikes' in data:
            updates.append("dislikes=?")
            params.append(json.dumps(data['dislikes']))
        if 'tastePrefs' in data:
            updates.append("taste_prefs=?")
            params.append(json.dumps(data['tastePrefs']))
        if 'themeColor' in data:
            updates.append("theme_color=?")
            params.append(data['themeColor'] or '')
        if 'fontFamily' in data:
            updates.append("font_family=?")
            params.append(data['fontFamily'] or '')
        if 'partnerCallName' in data:
            updates.append("partner_call_name=?")
            params.append(data['partnerCallName'] or '')
        if 'pageConfig' in data:
            updates.append("page_config=?")
            params.append(data['pageConfig'] or '')
        if 'expandConfig' in data:
            updates.append("expand_config=?")
            params.append(data['expandConfig'] or '')
        if updates:
            params.append(user_id)
            conn.execute(f"UPDATE users SET {','.join(updates)} WHERE id=?", params)
            conn.commit()
        r = conn.execute("SELECT id, role, nickname, avatar, theme_color, font_family, partner_call_name, page_config, expand_config FROM users WHERE id=?", (user_id,)).fetchone()
        rd = dict(r)
        return jsonify({'code': 0, 'data': {
            'id': rd['id'], 'role': rd['role'], 'nickname': rd['nickname'], 'avatar': rd['avatar'],
            'themeColor': rd.get('theme_color', '') or '',
            'fontFamily': rd.get('font_family', '') or '',
            'partnerCallName': rd.get('partner_call_name', '') or '',
            'pageConfig': rd.get('page_config', '') or '',
            'expandConfig': rd.get('expand_config', '') or ''
        }, 'msg': '已更新'})
    finally:
        conn.close()


@app.route('/api/couple/settings', methods=['PUT'])
def update_couple_settings():
    """更新情侣级别的设置(如是否使用默认菜品)"""
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        updates = []
        params = []
        if 'useDefaultDishes' in data:
            val = 1 if data['useDefaultDishes'] else 0
            updates.append("use_default_dishes=?")
            params.append(val)
        if updates:
            params.append(couple_id)
            conn.execute(f"UPDATE couples SET {','.join(updates)} WHERE id=?", params)
            conn.commit()
        cp = conn.execute("SELECT * FROM couples WHERE id=?", (couple_id,)).fetchone()
        return jsonify({'code': 0, 'data': {
            'coupleId': cp['id'],
            'useDefaultDishes': bool(cp['use_default_dishes']) if cp['use_default_dishes'] is not None else True,
        }, 'msg': '已更新'})
    finally:
        conn.close()


@app.route('/api/user/<user_id>', methods=['PUT'])
def update_user(user_id):
    """更新任意用户资料（用于女友端给男友换头像等跨用户更新）"""
    data = request.get_json() or {} 
    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            return jsonify({'code': 404, 'msg': '用户不存在'}), 404
        updates = []
        params = []
        if 'avatar' in data:
            updates.append("avatar=?")
            params.append(data['avatar'])
        if 'nickname' in data:
            updates.append("nickname=?")
            params.append(data['nickname'])
        if 'themeColor' in data:
            updates.append("theme_color=?")
            params.append(data['themeColor'] or '')
        if 'fontFamily' in data:
            updates.append("font_family=?")
            params.append(data['fontFamily'] or '')
        if 'partnerCallName' in data:
            updates.append("partner_call_name=?")
            params.append(data['partnerCallName'] or '')
        if 'pageConfig' in data:
            updates.append("page_config=?")
            params.append(data['pageConfig'] or '')
        if 'expandConfig' in data:
            updates.append("expand_config=?")
            params.append(data['expandConfig'] or '')
        if updates:
            params.append(user_id)
            conn.execute(f"UPDATE users SET {','.join(updates)} WHERE id=?", params)
            conn.commit()
        r = conn.execute("SELECT id, role, nickname, avatar, theme_color, font_family, partner_call_name, page_config, expand_config FROM users WHERE id=?", (user_id,)).fetchone()
        rd = dict(r)
        return jsonify({'code': 0, 'data': {
            'id': rd['id'], 'role': rd['role'], 'nickname': rd['nickname'], 'avatar': rd['avatar'],
            'themeColor': rd.get('theme_color', '') or '',
            'fontFamily': rd.get('font_family', '') or '',
            'partnerCallName': rd.get('partner_call_name', '') or '',
            'pageConfig': rd.get('page_config', '') or '',
            'expandConfig': rd.get('expand_config', '') or ''
        }, 'msg': '已更新'})
    finally:
        conn.close()


# ──────────────────────────────────────────────
# 菜品 API(含女友端上传的私有菜品库)
# ──────────────────────────────────────────────
@app.route('/api/dishes', methods=['GET'])
def list_dishes():
    """获取菜品列表:仅返回该情侣的私有菜品(数据隔离,每个账号独立拥有默认+自定义菜品)
    当 couples.use_default_dishes = 0 时,只返回用户自定义菜品(created_by != '')
    """
    category_id = request.args.get('categoryId', '')
    couple_id = request.args.get('coupleId', '')

    # 有 coupleId 时先确保默认数据已初始化
    use_default = True
    if couple_id:
        ensure_couple_defaults(couple_id)
        # 读取 couple 的 use_default_dishes 配置
        cp_conn = get_db()
        try:
            cp_row = cp_conn.execute("SELECT use_default_dishes FROM couples WHERE id=?", (couple_id,)).fetchone()
            use_default = (cp_row['use_default_dishes'] if cp_row and cp_row['use_default_dishes'] is not None else 1) == 1
        finally:
            cp_conn.close()

    conn = get_db()
    try:
        if couple_id:
            if category_id and category_id != 'all':
                if use_default:
                    rows = conn.execute(
                        "SELECT * FROM dishes WHERE category_id=? AND couple_id=? ORDER BY sales DESC",
                        (category_id, couple_id)
                    ).fetchall()
                else:
                    # 禁用默认菜品:只返回自定义菜品(created_by 不为空)
                    rows = conn.execute(
                        "SELECT * FROM dishes WHERE category_id=? AND couple_id=? AND created_by != '' ORDER BY sales DESC",
                        (category_id, couple_id)
                    ).fetchall()
            else:
                if use_default:
                    rows = conn.execute(
                        "SELECT * FROM dishes WHERE couple_id=? ORDER BY category_id, sales DESC",
                        (couple_id,)
                    ).fetchall()
                else:
                    # 禁用默认菜品:只返回自定义菜品
                    rows = conn.execute(
                        "SELECT * FROM dishes WHERE couple_id=? AND created_by != '' ORDER BY category_id, sales DESC",
                        (couple_id,)
                    ).fetchall()
        else:
            # 无 coupleId:返回共享种子菜品(供未登录/游客预览)
            if category_id and category_id != 'all':
                rows = conn.execute("SELECT * FROM dishes WHERE category_id=? AND couple_id='' ORDER BY sales DESC", (category_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM dishes WHERE couple_id='' ORDER BY category_id, sales DESC").fetchall()

        # 批量查 dish_skills(男友标注的会做/不会做)
        skills_map = {}
        if couple_id:
            sk_rows = conn.execute("SELECT dish_id, can_cook FROM dish_skills WHERE couple_id=?", (couple_id,)).fetchall()
            skills_map = {r['dish_id']: r['can_cook'] for r in sk_rows}

        result = []
        for r in rows:
            d = dish_to_dict(r)
            d['canCook'] = skills_map.get(d['id'], -1)
            result.append(d)
        return jsonify({'code': 0, 'data': result, 'useDefaultDishes': use_default})
    finally:
        conn.close()


@app.route('/api/dishes', methods=['POST'])
def create_dish():
    """女友端上传新菜品(私有菜品库)"""
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    user_id = data.get('userId')
    name = (data.get('name') or '').strip()
    if not name or not couple_id:
        return jsonify({'code': 400, 'msg': '请填写菜名'}), 400

    dish_id = gen_id('D')
    conn = get_db()
    try:
        conn.execute('''INSERT INTO dishes
            (id, name, desc, price, category_id, tags, spicy, sales, emoji, bg_color,
             recommend, allergens, dislike_tags, diet_tags, image, couple_id, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (dish_id, name, data.get('desc', ''), data.get('price', 0),
             data.get('categoryId', 'snack'), json.dumps(data.get('tags', [])),
             data.get('spicy', 0), 0, data.get('emoji', '🍽️'),
             data.get('bgColor', 'linear-gradient(135deg,#FFE8EE,#F5B6C1)'),
             0, json.dumps(data.get('allergens', [])),
             json.dumps(data.get('dislikeTags', [])),
             json.dumps(data.get('dietTags', [])),
             data.get('image', ''), couple_id, user_id or ''))
        conn.commit()
        r = conn.execute("SELECT * FROM dishes WHERE id=?", (dish_id,)).fetchone()
        return jsonify({'code': 0, 'data': dish_to_dict(r)})
    finally:
        conn.close()


@app.route('/api/dishes/<dish_id>', methods=['PUT'])
def update_dish(dish_id):
    """编辑菜品(仅创建者或男友标注 canCook)"""
    data = request.get_json() or {}
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM dishes WHERE id=?", (dish_id,)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '菜品不存在'}), 404

        # canCook 单独走 dish_skills 表(per-couple)
        if 'canCook' in data:
            couple_id = data.get('coupleId', '')
            if couple_id:
                conn.execute('''INSERT OR REPLACE INTO dish_skills (dish_id, couple_id, can_cook)
                                VALUES (?,?,?)''', (dish_id, couple_id, data['canCook']))
                conn.commit()
                return jsonify({'code': 0, 'data': {'canCook': data['canCook']}, 'msg': '已更新'})

        # 普通字段更新
        updates = []
        params = []
        field_map = {
            'name': 'name', 'desc': 'desc', 'price': 'price',
            'categoryId': 'category_id', 'spicy': 'spicy',
            'emoji': 'emoji', 'bgColor': 'bg_color', 'image': 'image'
        }
        for api_f, db_f in field_map.items():
            if api_f in data:
                updates.append(f"{db_f}=?")
                params.append(data[api_f])
        for api_f, db_f in [('tags', 'tags'), ('allergens', 'allergens'), ('dislikeTags', 'dislike_tags'), ('dietTags', 'diet_tags')]:
            if api_f in data:
                updates.append(f"{db_f}=?")
                params.append(json.dumps(data[api_f]))
        if updates:
            params.append(dish_id)
            conn.execute(f"UPDATE dishes SET {','.join(updates)} WHERE id=?", params)
            conn.commit()
        r = conn.execute("SELECT * FROM dishes WHERE id=?", (dish_id,)).fetchone()
        return jsonify({'code': 0, 'data': dish_to_dict(r)})
    finally:
        conn.close()


@app.route('/api/dishes/<dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    """删除菜品(仅该情侣的私有菜品)"""
    couple_id = request.args.get('coupleId', '')
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM dishes WHERE id=?", (dish_id,)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '菜品不存在'}), 404
        # 仅允许删除属于该情侣的菜品
        if r['couple_id'] != couple_id:
            return jsonify({'code': 403, 'msg': '无权删除该菜品'}), 403
        cur = conn.execute("DELETE FROM dishes WHERE id=? AND couple_id=?", (dish_id, couple_id))
        deleted = cur.rowcount
        if deleted == 0:
            return jsonify({'code': 404, 'msg': '菜品不存在或已被删除'}), 404
        conn.execute("DELETE FROM dish_skills WHERE dish_id=?", (dish_id,))
        conn.commit()
        return jsonify({'code': 0, 'msg': '已删除', 'data': {'deleted': deleted}})
    finally:
        conn.close()


@app.route('/api/categories', methods=['GET'])
def list_categories():
    """获取分类列表:每个情侣独立拥有一份分类副本(含默认分类和自定义分类)
    当 couples.use_default_dishes = 0 时,只返回自定义分类(is_default = 0)
    """
    couple_id = request.args.get('coupleId', '')
    if not couple_id:
        # 无 coupleId 时返回硬编码默认分类(供未登录/游客预览)
        return jsonify({'code': 0, 'data': [
            {**c, 'isDefault': True, 'isCustom': False} for c in DEFAULT_CATEGORIES
        ]})

    # 确保情侣拥有默认数据副本(首次访问懒初始化)
    ensure_couple_defaults(couple_id)

    # 读取 couple 的 use_default_dishes 配置
    use_default = True
    cp_conn = get_db()
    try:
        cp_row = cp_conn.execute("SELECT use_default_dishes FROM couples WHERE id=?", (couple_id,)).fetchone()
        use_default = (cp_row['use_default_dishes'] if cp_row and cp_row['use_default_dishes'] is not None else 1) == 1
    finally:
        cp_conn.close()

    conn = get_db()
    try:
        if use_default:
            rows = conn.execute(
                "SELECT id, name, icon, `desc`, is_default, sort FROM custom_categories WHERE couple_id=? ORDER BY sort",
                (couple_id,)
            ).fetchall()
        else:
            # 禁用默认菜品:只返回自定义分类(is_default = 0)
            rows = conn.execute(
                "SELECT id, name, icon, `desc`, is_default, sort FROM custom_categories WHERE couple_id=? AND is_default=0 ORDER BY sort",
                (couple_id,)
            ).fetchall()
        result = []
        for row in rows:
            result.append({
                'id': row['id'],
                'name': row['name'],
                'icon': row['icon'] or '🍽️',
                'desc': row['desc'] or '',
                'sort': row['sort'] if row['sort'] is not None else 100,
                'isCustom': True,
                'isDefault': bool(row['is_default'])
            })
    finally:
        conn.close()
    return jsonify({'code': 0, 'data': result})


@app.route('/api/categories', methods=['POST'])
def create_category():
    """创建自定义分类"""
    payload = request.get_json(force=True)
    couple_id = payload.get('coupleId', '') or payload.get('couple_id', '')
    name = (payload.get('name') or '').strip()
    icon = payload.get('icon') or '🍽️'
    desc = (payload.get('desc') or '').strip()
    sort = payload.get('sort', 100)
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 coupleId'}), 400
    if not name:
        return jsonify({'code': 400, 'msg': '分类名称不能为空'}), 400
    cat_id = payload.get('id') or ('custom_' + uuid.uuid4().hex[:12])
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO custom_categories (id, couple_id, name, icon, `desc`, is_default, sort, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (cat_id, couple_id, name, icon, desc, 0, sort, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'code': 409, 'msg': '分类名称已存在'}), 409
    finally:
        conn.close()
    return jsonify({'code': 0, 'data': {'id': cat_id, 'name': name, 'icon': icon, 'desc': desc, 'sort': sort, 'isCustom': True}})


@app.route('/api/categories/sort', methods=['PUT'])
def sort_categories():
    """批量更新分类排序(所有分类均在 custom_categories 中,直接 UPDATE)"""
    payload = request.get_json(force=True)
    couple_id = payload.get('coupleId', '')
    items = payload.get('items', []) or payload.get('list', [])
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 coupleId'}), 400
    conn = get_db()
    try:
        for item in items:
            cat_id = item.get('id')
            sort_val = item.get('sort', 0)
            if not cat_id:
                continue
            conn.execute(
                "UPDATE custom_categories SET sort=? WHERE id=? AND couple_id=?",
                (sort_val, cat_id, couple_id)
            )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'code': 0, 'data': {'updated': len(items)}})


@app.route('/api/categories/<cat_id>', methods=['PUT'])
def update_category(cat_id):
    """更新分类(所有分类均在 custom_categories 中,直接 UPDATE)"""
    payload = request.get_json(force=True)
    couple_id = payload.get('coupleId', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 coupleId'}), 400

    updates = []
    args = []
    if 'name' in payload:
        updates.append("name=?")
        args.append(payload['name'])
    if 'icon' in payload:
        updates.append("icon=?")
        args.append(payload['icon'])
    if 'desc' in payload:
        updates.append("`desc`=?")
        args.append(payload['desc'])
    if 'sort' in payload:
        updates.append("sort=?")
        args.append(payload['sort'])
    if not updates:
        return jsonify({'code': 400, 'msg': '无更新字段'}), 400

    conn = get_db()
    try:
        args.extend([cat_id, couple_id])
        conn.execute(
            f"UPDATE custom_categories SET {','.join(updates)} WHERE id=? AND couple_id=?",
            args
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'code': 409, 'msg': '分类名称已存在'}), 409
    finally:
        conn.close()
    return jsonify({'code': 0, 'data': {'id': cat_id}})


@app.route('/api/categories/<cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    """删除分类(所有分类均在 custom_categories 中,直接 DELETE)"""
    payload = request.get_json(silent=True) or {}
    couple_id = payload.get('coupleId', '') or request.args.get('coupleId', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 coupleId'}), 400

    conn = get_db()
    try:
        conn.execute(
            "DELETE FROM custom_categories WHERE id=? AND couple_id=?",
            (cat_id, couple_id)
        )
        # 删除该情侣此分类下的菜品
        conn.execute(
            "DELETE FROM dishes WHERE category_id=? AND couple_id=?",
            (cat_id, couple_id)
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'code': 0, 'data': {'deleted': True}})


@app.route('/api/tag-options', methods=['GET'])
def get_tag_options():
    """获取菜品标签选项（硬编码 - 隐藏默认 + 情侣自定义）"""
    couple_id = request.args.get('coupleId', '')
    data = {
        'tags': list(TAG_OPTIONS),
        'dietTags': list(DIET_TAG_OPTIONS)
    }
    if couple_id:
        conn = get_db()
        try:
            # 过滤被隐藏的默认标签
            hidden_rows = conn.execute(
                "SELECT tag_type, tag_value FROM hidden_tag_options WHERE couple_id=?",
                (couple_id,)
            ).fetchall()
            for r in hidden_rows:
                t, v = r['tag_type'], r['tag_value']
                if t in data and v in data[t]:
                    data[t].remove(v)
            # 追加自定义标签
            custom_rows = conn.execute(
                "SELECT tag_type, tag_value FROM custom_tag_options WHERE couple_id=?",
                (couple_id,)
            ).fetchall()
            for r in custom_rows:
                t, v = r['tag_type'], r['tag_value']
                if t in data and v not in data[t]:
                    data[t].append(v)
        finally:
            conn.close()
    return jsonify({'code': 0, 'data': data})


@app.route('/api/tag-options', methods=['POST'])
def add_tag_option():
    """添加自定义标签选项"""
    data = request.get_json() or {}
    couple_id = data.get('coupleId', '')
    tag_type = data.get('tagType', '')
    tag_value = (data.get('tagValue') or '').strip()
    if not couple_id or tag_type not in ('tags', 'dietTags') or not tag_value:
        return jsonify({'code': 400, 'msg': '参数错误'}), 400
    if tag_type == 'tags' and tag_value in TAG_OPTIONS:
        return jsonify({'code': 400, 'msg': '已存在的默认标签'}), 400
    if tag_type == 'dietTags' and tag_value in DIET_TAG_OPTIONS:
        return jsonify({'code': 400, 'msg': '已存在的默认标签'}), 400
    conn = get_db()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO custom_tag_options (couple_id, tag_type, tag_value) VALUES (?,?,?)",
            (couple_id, tag_type, tag_value)
        )
        # 如果之前被隐藏过，恢复它（从hidden中删除）
        conn.execute(
            "DELETE FROM hidden_tag_options WHERE couple_id=? AND tag_type=? AND tag_value=?",
            (couple_id, tag_type, tag_value)
        )
        conn.commit()
        return jsonify({'code': 0})
    finally:
        conn.close()


@app.route('/api/tag-options/hide', methods=['POST'])
def hide_default_tag():
    """隐藏默认标签（从可用选项中移除）"""
    data = request.get_json() or {}
    couple_id = data.get('coupleId', '')
    tag_type = data.get('tagType', '')
    tag_value = (data.get('tagValue') or '').strip()
    if not couple_id or tag_type not in ('tags', 'dietTags') or not tag_value:
        return jsonify({'code': 400, 'msg': '参数错误'}), 400
    # 只有默认标签可以被隐藏
    defaults = TAG_OPTIONS if tag_type == 'tags' else DIET_TAG_OPTIONS
    if tag_value not in defaults:
        return jsonify({'code': 400, 'msg': '非默认标签'}), 400
    conn = get_db()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO hidden_tag_options (couple_id, tag_type, tag_value) VALUES (?,?,?)",
            (couple_id, tag_type, tag_value)
        )
        # 同时删除同名自定义标签（如果存在）
        conn.execute(
            "DELETE FROM custom_tag_options WHERE couple_id=? AND tag_type=? AND tag_value=?",
            (couple_id, tag_type, tag_value)
        )
        conn.commit()
        return jsonify({'code': 0})
    finally:
        conn.close()


@app.route('/api/tag-options/restore', methods=['POST'])
def restore_default_tag():
    """恢复被隐藏的默认标签"""
    data = request.get_json() or {}
    couple_id = data.get('coupleId', '')
    tag_type = data.get('tagType', '')
    tag_value = (data.get('tagValue') or '').strip()
    if not couple_id or tag_type not in ('tags', 'dietTags') or not tag_value:
        return jsonify({'code': 400, 'msg': '参数错误'}), 400
    conn = get_db()
    try:
        conn.execute(
            "DELETE FROM hidden_tag_options WHERE couple_id=? AND tag_type=? AND tag_value=?",
            (couple_id, tag_type, tag_value)
        )
        conn.commit()
        return jsonify({'code': 0})
    finally:
        conn.close()


@app.route('/api/tag-options/hidden', methods=['GET'])
def list_hidden_tag_options():
    """获取被隐藏的默认标签"""
    couple_id = request.args.get('coupleId', '')
    tag_type = request.args.get('tagType', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        sql = "SELECT * FROM hidden_tag_options WHERE couple_id=?"
        params = [couple_id]
        if tag_type and tag_type in ('tags', 'dietTags'):
            sql += " AND tag_type=?"
            params.append(tag_type)
        rows = conn.execute(sql, params).fetchall()
        result = [{'id': r['id'], 'tagType': r['tag_type'], 'tagValue': r['tag_value']} for r in rows]
        return jsonify({'code': 0, 'data': result})
    finally:
        conn.close()


@app.route('/api/tag-options/<int:opt_id>', methods=['DELETE'])
def delete_tag_option(opt_id):
    """删除自定义标签选项"""
    conn = get_db()
    try:
        conn.execute("DELETE FROM custom_tag_options WHERE id=?", (opt_id,))
        conn.commit()
        return jsonify({'code': 0})
    finally:
        conn.close()


@app.route('/api/tag-options/custom', methods=['GET'])
def list_custom_tag_options():
    """获取自定义标签选项(带ID, 用于删除)"""
    couple_id = request.args.get('coupleId', '')
    tag_type = request.args.get('tagType', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        sql = "SELECT * FROM custom_tag_options WHERE couple_id=?"
        params = [couple_id]
        if tag_type and tag_type in ('tags', 'dietTags'):
            sql += " AND tag_type=?"
            params.append(tag_type)
        rows = conn.execute(sql, params).fetchall()
        result = [{'id': r['id'], 'tagType': r['tag_type'], 'tagValue': r['tag_value']} for r in rows]
        return jsonify({'code': 0, 'data': result})
    finally:
        conn.close()


# ──────────────────────────────────────────────
# 订单 API
# ──────────────────────────────────────────────
@app.route('/api/orders', methods=['GET'])
def list_orders():
    couple_id = request.args.get('coupleId')
    status_filter = request.args.get('status', 'all')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    rows = conn.execute("SELECT * FROM orders WHERE couple_id=? ORDER BY created_at DESC", (couple_id,)).fetchall()
    result = []
    for r in rows:
        o = order_to_dict(r, conn)
        status = o.get('status', 0)
        if status_filter == 'active' and status > 2:
            continue
        if status_filter == 'history' and status != 3:
            continue
        if status_filter == 'cancelled' and status != 4:
            continue
        if status_filter == 'rejected' and status != 5:
            continue
        result.append(o)
    conn.close()
    return jsonify({'code': 0, 'data': result})


@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    girl_id = data.get('girlId')
    if not couple_id or not girl_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId或girlId'}), 400

    conn = get_db()
    try:
        # 获取couple双方的昵称
        cp = conn.execute("SELECT * FROM couples WHERE id=?", (couple_id,)).fetchone()
        girl_nick = '小馋猫'
        boy_nick = '大厨哥'
        if cp and cp['girl_id']:
            girl_user = conn.execute("SELECT nickname FROM users WHERE id=?", (cp['girl_id'],)).fetchone()
            if girl_user and girl_user['nickname']:
                girl_nick = girl_user['nickname']
        if cp and cp['boy_id']:
            boy_user = conn.execute("SELECT nickname FROM users WHERE id=?", (cp['boy_id'],)).fetchone()
            if boy_user and boy_user['nickname']:
                boy_nick = boy_user['nickname']

        # 生成订单号
        max_no = conn.execute("SELECT MAX(no) as m FROM orders").fetchone()['m'] or 1000
        no = max_no + 1
        order_id = gen_id('O')
        ts = now()

        items = data.get('items', [])
        conn.execute('''INSERT INTO orders (id,no,couple_id,girl_id,type,dine_mode,reserve_time,table_info,address_info,
                      remark,sweet_note,people,status,created_at,timeline,urges)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                     (order_id, no, couple_id, girl_id,
                      data.get('type', 'dine'),
                      data.get('dineMode', 'now'),
                      data.get('reserveTime', ''),
                      json.dumps(data.get('table') or {}),
                      json.dumps(data.get('address') or {}),
                      data.get('remark', ''),
                      data.get('sweetNote', ''),
                      data.get('people', 2),
                      0, ts,
                      json.dumps([{'label': girl_nick + '下单啦', 'time': ts, 'done': True}]),
                      json.dumps([])))
        for it in items:
            conn.execute('''INSERT INTO order_items (order_id,dish_id,name,emoji,bg_color,image,price,qty,spicy,diet_note,is_custom)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
                         (order_id, it.get('id',''), it.get('name',''), it.get('emoji','🍽️'),
                          it.get('bgColor',''), it.get('image',''), it.get('price',0), it.get('qty',1),
                          it.get('spicy',0), it.get('dietNote',''), 1 if it.get('isCustom') else 0))
        conn.commit()
        o = order_to_dict(conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone(), conn)
        return jsonify({'code': 0, 'data': o})
    finally:
        conn.close()


@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    conn = get_db()
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not r:
        conn.close()
        return jsonify({'code': 404, 'msg': '订单不存在'}), 404
    o = order_to_dict(r, conn)
    conn.close()
    return jsonify({'code': 0, 'data': o})


def _advance_order(conn, order_id, label, new_status=None):
    """推进订单状态"""
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not r: return None
    timeline = json_loads(r['timeline'])
    ts = now()
    timeline.append({'label': label, 'time': ts, 'done': True})
    updates = ["timeline=?"]
    params = [json.dumps(timeline)]
    if new_status is not None:
        updates.append("status=?")
        params.append(new_status)
    params.append(order_id)
    conn.execute(f"UPDATE orders SET {','.join(updates)} WHERE id=?", params)
    conn.commit()
    return conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()


@app.route('/api/orders/<order_id>/accept', methods=['PUT'])
def accept_order(order_id):
    """男友接单"""
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not r:
            conn.close()
            return jsonify({'code': 404, 'msg': '订单不存在'}), 404
        # 获取男友昵称
        cp = conn.execute("SELECT boy_id FROM couples WHERE id=?", (r['couple_id'],)).fetchone()
        boy_nick = '大厨'
        if cp and cp['boy_id']:
            boy_user = conn.execute("SELECT nickname FROM users WHERE id=?", (cp['boy_id'],)).fetchone()
            if boy_user and boy_user['nickname']:
                boy_nick = boy_user['nickname']
        # 使用男友昵称生成标签
        timeline = json.loads(r['timeline'])
        ts = now()
        timeline.append({'label': boy_nick + '接单了', 'time': ts, 'done': True})
        conn.execute("UPDATE orders SET timeline=?, status=1 WHERE id=?", (json.dumps(timeline), order_id))
        conn.commit()
        updated = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        o = order_to_dict(updated, conn)
        return jsonify({'code': 0, 'data': o})
    finally:
        conn.close()


@app.route('/api/orders/<order_id>/complete', methods=['PUT'])
def complete_cooking(order_id):
    """男友制作完成"""
    conn = get_db()
    r = _advance_order(conn, order_id, '做好啦', 2)
    o = order_to_dict(r, conn) if r else None
    conn.close()
    return jsonify({'code': 0, 'data': o})


@app.route('/api/orders/<order_id>/finish', methods=['PUT'])
def finish_order(order_id):
    """女友确认吃完"""
    conn = get_db()
    r = _advance_order(conn, order_id, '吃光光啦', 3)
    o = order_to_dict(r, conn) if r else None
    # 订单完成后,对应菜品 sales +1
    if o and o.get('status') == 3:
        try:
            for it in o.get('items', []):
                dish_id = it.get('id') or it.get('itemId') or it.get('dishId')
                if dish_id:
                    conn.execute("UPDATE dishes SET sales = sales + 1 WHERE id = ?", (dish_id,))
            conn.commit()
        except Exception as e:
            print(f"sales update error: {e}")
    conn.close()
    return jsonify({'code': 0, 'data': o})


@app.route('/api/orders/<order_id>/later', methods=['PUT'])
def later_order(order_id):
    """稍后再做"""
    conn = get_db()
    conn.execute("UPDATE orders SET status=1 WHERE id=?", (order_id,))
    conn.commit()
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    o = order_to_dict(r, conn) if r else None
    conn.close()
    return jsonify({'code': 0, 'data': o})


@app.route('/api/orders/<order_id>/reject', methods=['PUT'])
def reject_order(order_id):
    """男友拒绝(必须填理由)"""
    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    if not reason:
        return jsonify({'code': 400, 'msg': '拒绝必须填写理由哦'}), 400
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '订单不存在'}), 404
        # 获取男友昵称
        cp = conn.execute("SELECT boy_id FROM couples WHERE id=?", (r['couple_id'],)).fetchone()
        boy_nick = '大厨'
        if cp and cp['boy_id']:
            boy_user = conn.execute("SELECT nickname FROM users WHERE id=?", (cp['boy_id'],)).fetchone()
            if boy_user and boy_user['nickname']:
                boy_nick = boy_user['nickname']
        timeline = json_loads(r['timeline'])
        ts = now()
        # 清除后续步骤
        for t in timeline[1:]:
            t['done'] = False
            t['time'] = None
        timeline.append({'label': boy_nick + '没法做', 'time': ts, 'done': True})
        conn.execute("UPDATE orders SET status=5, reject_reason=?, timeline=? WHERE id=?",
                     (reason, json.dumps(timeline), order_id))
        conn.commit()
        r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        o = order_to_dict(r, conn) if r else None
        return jsonify({'code': 0, 'data': o})
    finally:
        conn.close()


@app.route('/api/orders/<order_id>/cancel', methods=['PUT'])
def cancel_order(order_id):
    """取消订单"""
    conn = get_db()
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not r:
        conn.close()
        return jsonify({'code': 404, 'msg': '订单不存在'}), 404
    timeline = json_loads(r['timeline'])
    ts = now()
    for t in timeline[1:]:
        t['done'] = False
        t['time'] = None
    timeline.append({'label': '订单已取消', 'time': ts, 'done': True})
    conn.execute("UPDATE orders SET status=4, timeline=? WHERE id=?", (json.dumps(timeline), order_id))
    conn.commit()
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    o = order_to_dict(r, conn) if r else None
    conn.close()
    return jsonify({'code': 0, 'data': o})


@app.route('/api/orders/<order_id>/urge', methods=['POST'])
def urge_order(order_id):
    """女友催餐(返回催餐次数,前端判断是否弹安抚文案)"""
    conn = get_db()
    r = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not r:
        conn.close()
        return jsonify({'code': 404, 'msg': '订单不存在'}), 404
    urges = json_loads(r['urges'])
    urges.append({'time': now()})
    conn.execute("UPDATE orders SET urges=? WHERE id=?", (json.dumps(urges), order_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'count': len(urges)}})


@app.route('/api/orders/<order_id>/rate', methods=['PUT'])
def rate_order(order_id):
    """女友评分"""
    data = request.get_json() or {}
    rating = data.get('rating', 0)
    comment = data.get('comment', '')
    if not 1 <= rating <= 5:
        return jsonify({'code': 400, 'msg': '评分必须1-5星'}), 400
    conn = get_db()
    conn.execute("UPDATE orders SET rating=?, rating_comment=?, rated_at=? WHERE id=?",
                 (rating, comment, now(), order_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '评价已存进回忆相册'})


# ──────────────────────────────────────────────
# 饮食偏好 API
# ──────────────────────────────────────────────
@app.route('/api/preferences', methods=['GET'])
def get_preferences():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'code': 400, 'msg': '缺少userId'}), 400
    conn = get_db()
    r = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if not r:
        return jsonify({'code': 404, 'msg': '用户不存在'}), 404
    return jsonify({'code': 0, 'data': {
        'allergens': json_loads(r['allergens']),
        'dislikes': json_loads(r['dislikes']),
        'tastePrefs': json_loads(r['taste_prefs']),
        'favorites': json_loads(r['favorites']),
    }})


@app.route('/api/preferences', methods=['PUT'])
def update_preferences():
    data = request.get_json() or {}
    user_id = data.get('userId')
    if not user_id:
        return jsonify({'code': 400, 'msg': '缺少userId'}), 400
    conn = get_db()
    updates = []
    params = []
    if 'allergens' in data:
        updates.append("allergens=?"); params.append(json.dumps(data['allergens']))
    if 'dislikes' in data:
        updates.append("dislikes=?"); params.append(json.dumps(data['dislikes']))
    if 'tastePrefs' in data:
        updates.append("taste_prefs=?"); params.append(json.dumps(data['tastePrefs']))
    if updates:
        params.append(user_id)
        conn.execute(f"UPDATE users SET {','.join(updates)} WHERE id=?", params)
        conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '已更新'})


@app.route('/api/preferences/favorites', methods=['GET'])
def get_favorites():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'code': 400, 'msg': '缺少userId'}), 400
    conn = get_db()
    r = conn.execute("SELECT favorites FROM users WHERE id=?", (user_id,)).fetchone()
    fav_ids = json_loads(r['favorites']) if r else []
    # 查收藏的菜品详情
    placeholders = ','.join('?' * len(fav_ids)) if fav_ids else ''
    dishes = []
    if fav_ids:
        rows = conn.execute(f"SELECT * FROM dishes WHERE id IN ({placeholders})", fav_ids).fetchall()
        for row in rows:
            dishes.append({
                'id': row['id'], 'name': row['name'], 'emoji': row['emoji'], 'bgColor': row['bg_color'],
                'desc': row['desc'], 'categoryId': row['category_id']
            })
    conn.close()
    return jsonify({'code': 0, 'data': dishes})


@app.route('/api/preferences/favorites/<dish_id>', methods=['POST'])
def toggle_favorite(dish_id):
    user_id = request.get_json().get('userId') if request.is_json else request.args.get('userId')
    if not user_id:
        return jsonify({'code': 400, 'msg': '缺少userId'}), 400
    conn = get_db()
    r = conn.execute("SELECT favorites FROM users WHERE id=?", (user_id,)).fetchone()
    favs = json_loads(r['favorites']) if r else []
    if dish_id in favs:
        favs.remove(dish_id)
        favorited = False
    else:
        favs.append(dish_id)
        favorited = True
    conn.execute("UPDATE users SET favorites=? WHERE id=?", (json.dumps(favs), user_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'favorited': favorited, 'favorites': favs}})


# ──────────────────────────────────────────────
# 收货地址 API
# ──────────────────────────────────────────────
@app.route('/api/addresses', methods=['GET'])
def list_addresses():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    rows = conn.execute('''SELECT * FROM addresses WHERE couple_id=?
                           ORDER BY is_default DESC, created_at DESC''', (couple_id,)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        result.append({
            'id': d.get('id'), 'name': d.get('name'), 'phone': d.get('phone'),
            'tag': d.get('tag', ''), 'province': d.get('province', ''), 'city': d.get('city', ''),
            'district': d.get('district', ''), 'street': d.get('street', ''),
            'detail': d.get('detail', ''), 'isDefault': bool(d.get('is_default', 0))
        })
    conn.close()
    return jsonify({'code': 0, 'data': result})


@app.route('/api/addresses', methods=['POST'])
def create_address():
    data = request.get_json(silent=True) or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    name = (data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()
    detail = (data.get('detail') or '').strip()
    if not name or not phone or not detail:
        return jsonify({'code': 400, 'msg': '请填写姓名、电话和详细地址'}), 400
    conn = get_db()
    try:
        is_default = 1 if data.get('isDefault') else 0
        addr_id = gen_id('addr_')
        created_at = now()
        province = (data.get('province') or '').strip()
        city = (data.get('city') or '').strip()
        district = (data.get('district') or '').strip()
        street = (data.get('street') or '').strip()
        # 如果设为默认,取消其他默认
        if is_default:
            conn.execute("UPDATE addresses SET is_default=0 WHERE couple_id=?", (couple_id,))
        conn.execute('''INSERT INTO addresses (id,couple_id,name,phone,tag,province,city,district,street,detail,is_default,created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
                     (addr_id, couple_id, name, phone, data.get('tag', ''),
                      province, city, district, street, detail, is_default, created_at))
        conn.commit()
        return jsonify({'code': 0, 'data': {
            'id': addr_id, 'name': name, 'phone': phone,
            'tag': data.get('tag', ''), 'province': province, 'city': city,
            'district': district, 'street': street, 'detail': detail, 'isDefault': bool(is_default)
        }})
    finally:
        conn.close()


@app.route('/api/addresses/<addr_id>', methods=['PUT'])
def update_address(addr_id):
    data = request.get_json(silent=True) or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM addresses WHERE id=? AND couple_id=?", (addr_id, couple_id)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '地址不存在'}), 404
        rd = dict(r)
        name = (data.get('name') or rd.get('name', '')).strip()
        phone = (data.get('phone') or rd.get('phone', '')).strip()
        detail = (data.get('detail') or rd.get('detail', '')).strip()
        tag = data.get('tag') if data.get('tag') is not None else rd.get('tag', '')
        is_default = 1 if data.get('isDefault') else 0

        province = (data.get('province') if data.get('province') is not None else rd.get('province', '')) or ''
        city = (data.get('city') if data.get('city') is not None else rd.get('city', '')) or ''
        district = (data.get('district') if data.get('district') is not None else rd.get('district', '')) or ''
        street = (data.get('street') if data.get('street') is not None else rd.get('street', '')) or ''
        province = province.strip()
        city = city.strip()
        district = district.strip()
        street = street.strip()

        if is_default:
            conn.execute("UPDATE addresses SET is_default=0 WHERE couple_id=? AND id!=?", (couple_id, addr_id))
        conn.execute('''UPDATE addresses SET name=?, phone=?, tag=?, province=?, city=?, district=?, street=?, detail=?, is_default=?
                        WHERE id=?''', (name, phone, tag, province, city, district, street, detail, is_default, addr_id))
        conn.commit()
        return jsonify({'code': 0, 'data': {
            'id': addr_id, 'name': name, 'phone': phone,
            'tag': tag, 'province': province, 'city': city,
            'district': district, 'street': street, 'detail': detail, 'isDefault': bool(is_default)
        }})
    finally:
        conn.close()


@app.route('/api/addresses/<addr_id>', methods=['DELETE'])
def delete_address(addr_id):
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        conn.execute("DELETE FROM addresses WHERE id=? AND couple_id=?", (addr_id, couple_id))
        # 若删除的是默认地址,把第一条设成默认
        first = conn.execute("SELECT id FROM addresses WHERE couple_id=? ORDER BY created_at ASC LIMIT 1", (couple_id,)).fetchone()
        if first:
            conn.execute("UPDATE addresses SET is_default=1 WHERE id=?", (first['id'],))
        conn.commit()
        return jsonify({'code': 0, 'data': {'id': addr_id}})
    finally:
        conn.close()


# ──────────────────────────────────────────────
# 桌台 API(堂食可选)
# ──────────────────────────────────────────────
def _row_to_table_dict(r):
    return {
        'id': r['id'], 'name': r['name'], 'desc': r['desc'],
        'seats': r['seats'], 'area': r['area']
    }


@app.route('/api/tables', methods=['GET'])
def list_tables():
    conn = get_db()
    rows = conn.execute("SELECT * FROM tables ORDER BY sort ASC, id ASC").fetchall()
    result = [_row_to_table_dict(r) for r in rows]
    conn.close()
    return jsonify({'code': 0, 'data': result})


@app.route('/api/tables', methods=['POST'])
def create_table():
    """新增桌台:{ name, desc, seats, area, id(可选) }"""
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'code': 400, 'msg': '请输入桌台名称'}), 400
    area = (data.get('area') or '大厅').strip() or '大厅'
    seats = int(data.get('seats', 2) or 2)
    desc = (data.get('desc') or '').strip()
    table_id = (data.get('id') or gen_id('T')).strip()

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM tables WHERE id=?", (table_id,)).fetchone()
        if existing:
            table_id = gen_id('T')
        sort = (conn.execute("SELECT MAX(sort) as m FROM tables").fetchone()['m'] or 0) + 1
        conn.execute('''INSERT INTO tables (id, name, desc, seats, area, sort)
                        VALUES (?,?,?,?,?,?)''', (table_id, name, desc, seats, area, sort))
        conn.commit()
        r = conn.execute("SELECT * FROM tables WHERE id=?", (table_id,)).fetchone()
        return jsonify({'code': 0, 'data': _row_to_table_dict(r), 'msg': '新增成功'})
    finally:
        conn.close()


@app.route('/api/tables/<table_id>', methods=['PUT'])
def update_table(table_id):
    """更新桌台:{ name, desc, seats, area }"""
    data = request.get_json() or {}
    conn = get_db()
    try:
        r = conn.execute("SELECT * FROM tables WHERE id=?", (table_id,)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '桌台不存在'}), 404

        updates = []
        params = []
        if 'name' in data:
            name = (data['name'] or '').strip()
            if not name:
                return jsonify({'code': 400, 'msg': '桌台名称不能为空'}), 400
            updates.append("name=?")
            params.append(name)
        if 'desc' in data:
            updates.append("desc=?")
            params.append((data['desc'] or '').strip())
        if 'seats' in data:
            updates.append("seats=?")
            params.append(int(data['seats'] or 2))
        if 'area' in data:
            area = (data['area'] or '').strip()
            if not area:
                return jsonify({'code': 400, 'msg': '区域不能为空'}), 400
            updates.append("area=?")
            params.append(area)
        if not updates:
            return jsonify({'code': 400, 'msg': '没有要更新的字段'}), 400

        params.append(table_id)
        conn.execute(f"UPDATE tables SET {','.join(updates)} WHERE id=?", params)
        conn.commit()
        r = conn.execute("SELECT * FROM tables WHERE id=?", (table_id,)).fetchone()
        return jsonify({'code': 0, 'data': _row_to_table_dict(r), 'msg': '更新成功'})
    finally:
        conn.close()


@app.route('/api/tables/<table_id>', methods=['DELETE'])
def delete_table(table_id):
    """删除桌台"""
    conn = get_db()
    try:
        r = conn.execute("SELECT id FROM tables WHERE id=?", (table_id,)).fetchone()
        if not r:
            return jsonify({'code': 404, 'msg': '桌台不存在'}), 404
        conn.execute("DELETE FROM tables WHERE id=?", (table_id,))
        conn.commit()
        return jsonify({'code': 0, 'data': {'id': table_id}, 'msg': '删除成功'})
    finally:
        conn.close()


# ──────────────────────────────────────────────
# 数据统计 API(男友端)
# ──────────────────────────────────────────────
@app.route('/api/stats/monthly', methods=['GET'])
def monthly_stats():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    # 本月已完成订单数
    month_start = int(time.mktime(time.strptime(time.strftime('%Y-%m-01'), '%Y-%m-%d'))) * 1000
    rows = conn.execute("SELECT COUNT(*) as cnt FROM orders WHERE couple_id=? AND status=3 AND created_at>=?",
                        (couple_id, month_start)).fetchone()
    total_orders = rows['cnt']
    # 总餐费估算
    total_spent = 0
    ords = conn.execute("SELECT id FROM orders WHERE couple_id=? AND status=3", (couple_id,)).fetchall()
    for o in ords:
        items = conn.execute("SELECT price, qty FROM order_items WHERE order_id=?", (o['id'],)).fetchall()
        for it in items:
            total_spent += it['price'] * it['qty']
    conn.close()
    return jsonify({'code': 0, 'data': {
        'monthOrders': total_orders,
        'totalSpent': total_spent,
        'avgPerMeal': round(total_spent / max(total_orders, 1), 1)
    }})


@app.route('/api/stats/top-dishes', methods=['GET'])
def top_dishes():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    # 统计被点次数最多的菜
    rows = conn.execute('''SELECT oi.dish_id, oi.name, oi.emoji, oi.bg_color, SUM(oi.qty) as cnt
                           FROM order_items oi
                           JOIN orders o ON oi.order_id = o.id
                           WHERE o.couple_id=? AND o.status=3
                           GROUP BY oi.dish_id
                           ORDER BY cnt DESC
                           LIMIT 10''', (couple_id,)).fetchall()
    result = []
    for r in rows:
        result.append({
            'dishId': r['dish_id'], 'name': r['name'], 'emoji': r['emoji'],
            'bgColor': r['bg_color'], 'count': r['cnt']
        })
    conn.close()
    return jsonify({'code': 0, 'data': result})


# ──────────────────────────────────────────────
# 个性化弹窗 API(男友端配置 / 女友端接收)
# ──────────────────────────────────────────────
@app.route('/api/surprise', methods=['POST'])
def create_surprise():
    """男友端创建弹窗"""
    data = request.get_json() or {}
    couple_id = data.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id'}), 400
    sid = 'sm' + uuid.uuid4().hex[:14]
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn = get_db()
    conn.execute('''INSERT INTO surprise_messages (id, couple_id, title, content, emoji, effect, bg_color, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                 (sid, couple_id, data.get('title', ''), data.get('content', ''),
                  data.get('emoji', '💝'), data.get('effect', 'heart'),
                  data.get('bg_color', ''), now_str))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'id': sid, 'ok': True}})


@app.route('/api/surprise/latest', methods=['GET'])
def get_latest_surprise():
    """女友端获取最新未读弹窗"""
    couple_id = request.args.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 0, 'data': {'surprise': None}})
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM surprise_messages WHERE couple_id=? AND read_at IS NULL ORDER BY created_at DESC LIMIT 1",
        (couple_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({'code': 0, 'data': {'surprise': None}})
    return jsonify({'code': 0, 'data': {'surprise': row_to_dict(row)}})


@app.route('/api/surprise/<surprise_id>/read', methods=['POST'])
def mark_surprise_read(surprise_id):
    """女友端标记弹窗已读"""
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn = get_db()
    conn.execute("UPDATE surprise_messages SET read_at=? WHERE id=?", (now_str, surprise_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'ok': True}})


@app.route('/api/surprise/list', methods=['GET'])
def list_surprises():
    """男友端获取历史弹窗列表"""
    couple_id = request.args.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id'}), 400
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM surprise_messages WHERE couple_id=? ORDER BY created_at DESC",
        (couple_id,)
    ).fetchall()
    conn.close()
    result = [row_to_dict(r) for r in rows]
    return jsonify({'code': 0, 'data': result})


# ──────────────────────────────────────────────
# 想念点击 API(女友端点击 / 男友端接收)
# ──────────────────────────────────────────────
@app.route('/api/miss/tap', methods=['POST'])
def tap_miss():
    """女友端点击一次'想你了'，累加到最新未读记录或新建记录"""
    data = request.get_json() or {}
    couple_id = data.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id'}), 400
    conn = get_db()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    # 查找 5 分钟内最新的未读记录进行累加，避免短时间内疯狂新建记录
    row = conn.execute(
        "SELECT * FROM miss_taps WHERE couple_id=? AND read_at IS NULL ORDER BY created_at DESC LIMIT 1",
        (couple_id,)
    ).fetchone()
    if row:
        new_count = (row['count'] or 1) + 1
        conn.execute(
            "UPDATE miss_taps SET count=?, created_at=? WHERE id=?",
            (new_count, now_str, row['id'])
        )
        conn.commit()
        conn.close()
        return jsonify({'code': 0, 'data': {'id': row['id'], 'count': new_count}})
    sid = 'mt' + uuid.uuid4().hex[:14]
    conn.execute(
        "INSERT INTO miss_taps (id, couple_id, count, created_at) VALUES (?, ?, 1, ?)",
        (sid, couple_id, now_str)
    )
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'id': sid, 'count': 1}})


@app.route('/api/miss/latest', methods=['GET'])
def get_latest_miss():
    """男友端获取最新未读想念点击"""
    couple_id = request.args.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 0, 'data': {'miss': None}})
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM miss_taps WHERE couple_id=? AND read_at IS NULL ORDER BY created_at DESC LIMIT 1",
        (couple_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({'code': 0, 'data': {'miss': None}})
    return jsonify({'code': 0, 'data': {'miss': row_to_dict(row)}})


@app.route('/api/miss/<miss_id>/read', methods=['POST'])
def mark_miss_read(miss_id):
    """男友端标记想念点击已读"""
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn = get_db()
    conn.execute("UPDATE miss_taps SET read_at=? WHERE id=?", (now_str, miss_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'ok': True}})


# ──────────────────────────────────────────────
# 心愿单 API(女友端创建 / 男友端查看并标记完成)
# ──────────────────────────────────────────────
@app.route('/api/wishlist/list', methods=['GET'])
def list_wishlist():
    """获取情侣心愿单列表（双方都可读）"""
    couple_id = request.args.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id'}), 400
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM wishlist WHERE couple_id=? ORDER BY is_done ASC, sort ASC, created_at DESC",
        (couple_id,)
    ).fetchall()
    conn.close()
    result = [row_to_dict(r) for r in rows]
    return jsonify({'code': 0, 'data': result})


@app.route('/api/wishlist', methods=['POST'])
def create_wishlist():
    """创建心愿（女友端）"""
    data = request.get_json() or {}
    couple_id = data.get('couple_id', '')
    user_id = data.get('user_id', '')
    title = (data.get('title') or '').strip()
    if not couple_id or not user_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id / user_id'}), 400
    if not title:
        return jsonify({'code': 400, 'msg': '标题不能为空'}), 400
    wid = 'wl' + uuid.uuid4().hex[:14]
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn = get_db()
    conn.execute('''INSERT INTO wishlist
        (id, couple_id, user_id, title, description, image_url, link, emoji, sort, is_done, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)''',
        (wid, couple_id, user_id, title,
         data.get('description', ''), data.get('image_url', ''),
         data.get('link', ''), data.get('emoji', '💝'), now_str))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'id': wid, 'ok': True}})


@app.route('/api/wishlist/<wishlist_id>', methods=['PUT'])
def update_wishlist(wishlist_id):
    """更新心愿内容（女友端编辑）"""
    data = request.get_json() or {}
    conn = get_db()
    fields = []
    values = []
    for k in ('title', 'description', 'image_url', 'link', 'emoji'):
        if k in data:
            fields.append(f'{k}=?')
            values.append(data[k])
    if not fields:
        conn.close()
        return jsonify({'code': 400, 'msg': '没有要更新的字段'}), 400
    values.append(wishlist_id)
    conn.execute(f"UPDATE wishlist SET {', '.join(fields)} WHERE id=?", values)
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'ok': True}})


@app.route('/api/wishlist/<wishlist_id>', methods=['DELETE'])
def delete_wishlist(wishlist_id):
    """删除心愿（女友端）"""
    conn = get_db()
    conn.execute("DELETE FROM wishlist WHERE id=?", (wishlist_id,))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'ok': True}})


@app.route('/api/wishlist/<wishlist_id>/done', methods=['PUT'])
def toggle_wishlist_done(wishlist_id):
    """切换完成状态（男友端帮 TA 实现 / 女友端取消完成）"""
    data = request.get_json() or {}
    done = 1 if data.get('done') else 0
    done_by = data.get('done_by', '')
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S') if done else ''
    conn = get_db()
    conn.execute(
        "UPDATE wishlist SET is_done=?, done_by=?, done_at=? WHERE id=?",
        (done, done_by, now_str, wishlist_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'data': {'ok': True, 'is_done': done}})


@app.route('/api/wishlist/latest', methods=['GET'])
def latest_wishlist():
    """男友端获取女友最新的一条心愿（用于首页弹窗提醒）"""
    couple_id = request.args.get('couple_id', '')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少 couple_id'}), 400
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM wishlist WHERE couple_id=? ORDER BY created_at DESC LIMIT 1",
        (couple_id,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({'code': 0, 'data': None})
    return jsonify({'code': 0, 'data': row_to_dict(row)})


# ──────────────────────────────────────────────
# 情话 API
# ──────────────────────────────────────────────
SWEET_WORDS = [
    '你做的饭是全世界最好吃的',
    '吃饭不积极,思想有问题,所以我来了',
    '饿了想你,饱了也想你',
    '你就是我的菜,这辈子都点不够',
    '一口一口吃掉你做的忧愁',
    '有你做饭,连白米饭都是甜的',
    '厨房有你,就是全世界最幸福的地方',
    '你做的菜比外卖好吃一万倍',
    '愿每一餐都有你陪我吃',
    '你是我的专属大厨,我是你的专属馋猫',
]
SOOTHE_WORDS = [
    '别急别急,好饭不怕晚嘛,等你吃完就知道等得值',
    '知道你饿啦,他正在快马加鞭地给你做,再等等嘛',
    '催多了他会紧张做不好吃哦,相信他的手艺',
    '他肯定比你还着急,正在厨房手忙脚乱呢,耐心等一下下',
]
FINISH_WORDS = [
    '吃饱啦,谢谢大厨哥,爱你',
    '今天也好好吃,下次还要吃你做的',
    '胃和心都被你填满了',
    '这一餐满分,因为是你做的',
]
REJECT_SOOTHE = [
    '他这次忙不是你的错,等他空了会补给你做更好吃的',
    '不气不气,他也是身不由己,抱抱你',
    '没关系,这次点外卖,下次让他补双倍的',
]


# ── 购物车(想吃清单) ──
@app.route('/api/cart', methods=['GET'])
def get_cart():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM cart_items WHERE couple_id=? ORDER BY created_at ASC", (couple_id,)).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            items.append({
                'id': d.get('dish_id', ''),
                'lineKey': d.get('line_key', ''),
                'name': d.get('name', ''),
                'price': d.get('price', 0),
                'emoji': d.get('emoji', '🍽️'),
                'bgColor': d.get('bg_color', ''),
                'image': d.get('image', ''),
                'qty': d.get('qty', 1),
                'spicy': d.get('spicy', 0),
                'dietNote': d.get('diet_note', ''),
                'isCustom': bool(d.get('is_custom', 0))
            })
        return jsonify({'code': 0, 'data': items})
    except Exception as e:
        return jsonify({'code': 500, 'msg': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/cart', methods=['POST'])
def add_cart_item():
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    dish_id = data.get('id') or data.get('dishId')
    line_key = data.get('lineKey')
    if not dish_id or not line_key:
        return jsonify({'code': 400, 'msg': '缺少id或lineKey'}), 400
    conn = get_db()
    try:
        ts = int(time.time())
        existing = conn.execute("SELECT id, qty FROM cart_items WHERE couple_id=? AND line_key=?", (couple_id, line_key)).fetchone()
        if existing:
            new_qty = dict(existing)['qty'] + int(data.get('qty') or 1)
            conn.execute("UPDATE cart_items SET qty=? WHERE id=?", (new_qty, existing['id']))
        else:
            conn.execute('''INSERT INTO cart_items
                (couple_id, dish_id, line_key, name, price, emoji, bg_color, image, qty, spicy, diet_note, is_custom, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''', (
                couple_id, dish_id, line_key, data.get('name', ''), data.get('price', 0),
                data.get('emoji', '🍽️'), data.get('bgColor', ''), data.get('image', ''),
                int(data.get('qty') or 1),
                int(data.get('spicy') or 0), data.get('dietNote', ''), 1 if data.get('isCustom') else 0, ts
            ))
        conn.commit()
        return jsonify({'code': 0, 'data': {'ok': True}})
    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'msg': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/cart/<line_key>', methods=['PUT'])
def update_cart_item(line_key):
    data = request.get_json() or {}
    couple_id = data.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        row = conn.execute("SELECT id FROM cart_items WHERE couple_id=? AND line_key=?", (couple_id, line_key)).fetchone()
        if not row:
            return jsonify({'code': 404, 'msg': '购物车项不存在'}), 404
        qty = int(data.get('qty') or 0)
        if qty <= 0:
            conn.execute("DELETE FROM cart_items WHERE id=?", (row['id'],))
        else:
            conn.execute("UPDATE cart_items SET qty=? WHERE id=?", (qty, row['id']))
        conn.commit()
        return jsonify({'code': 0, 'data': {'ok': True}})
    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'msg': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/cart/<line_key>', methods=['DELETE'])
def delete_cart_item(line_key):
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        conn.execute("DELETE FROM cart_items WHERE couple_id=? AND line_key=?", (couple_id, line_key))
        conn.commit()
        return jsonify({'code': 0, 'data': {'ok': True}})
    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'msg': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/cart', methods=['DELETE'])
def clear_cart():
    couple_id = request.args.get('coupleId')
    if not couple_id:
        return jsonify({'code': 400, 'msg': '缺少coupleId'}), 400
    conn = get_db()
    try:
        conn.execute("DELETE FROM cart_items WHERE couple_id=?", (couple_id,))
        conn.commit()
        return jsonify({'code': 0, 'data': {'ok': True}})
    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'msg': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/sweet/daily', methods=['GET'])
def daily_sweet():
    return jsonify({'code': 0, 'data': {
        'word': random.choice(SWEET_WORDS),
        'sootheWords': SOOTHE_WORDS,
        'finishWords': FINISH_WORDS,
        'rejectSoothe': REJECT_SOOTHE,
        'urgeWords': ['哥哥好饿嘛~', '快点快点,馋虫都跑出来了', '人家等不及啦', '大厨加油！']
    }})


# ──────────────────────────────────────────────
# 文件上传
# ──────────────────────────────────────────────
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'code': 400, 'msg': '未选择文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'code': 400, 'msg': '未选择文件'}), 400
    if not allowed_file(file.filename):
        return jsonify({'code': 400, 'msg': '仅支持 png/jpg/gif/webp 图片'}), 400

    ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
    filename = f"{gen_id('img')}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    return jsonify({'code': 0, 'data': {'url': f'/uploads/{filename}'}})


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ──────────────────────────────────────────────
# 根路由:服务状态页
# ──────────────────────────────────────────────
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'code': 0,
        'service': '我们的小厨房 - 后端服务',
        'status': 'running',
        'endpoints': {
            'categories': '/api/categories',
            'dishes': '/api/dishes',
            'couple_bind': '/api/couple/bind',
            'orders': '/api/orders',
            'preferences': '/api/preferences',
            'tables': '/api/tables',
            'stats': '/api/stats/monthly',
            'sweet': '/api/sweet/daily'
        }
    })


# ──────────────────────────────────────────────
# 启动 / 初始化
# ──────────────────────────────────────────────
# 导入即自动建表,兼容本地开发、PythonAnywhere WSGI 等各种运行方式
# 注意：在生产环境中，数据库初始化应由部署脚本负责，这里仅用于本地开发。
try:
    init_db()
except Exception as e:
    print(f"[init_db] 初始化数据库失败: {e}")

# ──────────────────────────────────────────────
# Token 认证中间件(放在所有路由之后注册,确保覆盖全部接口)
# ──────────────────────────────────────────────
@app.before_request
def auth_check():
    """全局认证中间件:除公开路径外,所有请求需携带有效 Token"""
    path = request.path

    # CORS 预检请求直接放行
    if request.method == 'OPTIONS':
        return None

    # 1. 前缀匹配(如 /uploads/xxx 静态文件)
    for prefix in _PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return None

    # 2. 精确匹配
    if path in _PUBLIC_PATHS:
        methods = _PUBLIC_PATHS[path]
        if methods is None or request.method in methods:
            return None

    # 从请求中提取 Token
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        token = request.headers.get('token', '') or request.args.get('token', '')

    user = verify_token(token) if token else None
    if not user:
        return jsonify({'code': 401, 'msg': '登录已过期,请重新登录'}), 401
    request.current_user = user
    request.current_token = token

import socket
def get_local_ip():
    """获取本机局域网 IP，用于打印访问地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


if __name__ == '__main__':
    local_ip = get_local_ip()
    print("=" * 50)
    print("🍳 我们的小厨房 - 后端已启动")
    print(f"📡 本机访问: http://localhost:5000")
    print(f"📡 局域网访问: http://{local_ip}:5000")
    print("=" * 50)
    # 本地开发开启 debug,生产环境通过环境变量关闭
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug)
