-- إنشاء قاعدة البيانات الأولية لبوت شادو
-- تاريخ الإنشاء: 2024

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    whatsapp_id TEXT UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    user_type TEXT DEFAULT 'user' CHECK(user_type IN ('user', 'admin', 'developer')),
    experience_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    diamonds INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    blocked_by TEXT,
    blocked_at DATETIME,
    total_commands_used INTEGER DEFAULT 0,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المشرفين
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_level INTEGER DEFAULT 1,
    can_ban BOOLEAN DEFAULT FALSE,
    can_warn BOOLEAN DEFAULT TRUE,
    can_manage_groups BOOLEAN DEFAULT FALSE,
    can_view_logs BOOLEAN DEFAULT FALSE,
    appointed_by TEXT,
    appointed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول المجموعات
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    whatsapp_group_id TEXT UNIQUE NOT NULL,
    group_name TEXT,
    description TEXT,
    welcome_message_enabled BOOLEAN DEFAULT TRUE,
    anti_link_enabled BOOLEAN DEFAULT FALSE,
    auto_sticker_enabled BOOLEAN DEFAULT FALSE,
    commands_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول أعضاء المجموعات
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('member', 'admin', 'owner')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

-- جدول الأوامر
CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    required_permission TEXT DEFAULT 'user' CHECK(required_permission IN ('user', 'admin', 'developer')),
    usage_count INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجلات الأوامر
CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_id INTEGER,
    command_name TEXT NOT NULL,
    full_command TEXT,
    success BOOLEAN DEFAULT TRUE,
    response_time_ms INTEGER,
    error_message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

-- جدول إعدادات البوت
CREATE TABLE IF NOT EXISTS bot_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string' CHECK(setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الرسائل المحفوظة (اختياري)
CREATE TABLE IF NOT EXISTS saved_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    tags TEXT,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_groups_whatsapp_group_id ON groups(whatsapp_group_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_command_name ON command_logs(command_name);
CREATE INDEX IF NOT EXISTS idx_command_logs_executed_at ON command_logs(executed_at);

-- إدراج البيانات الأولية
INSERT OR IGNORE INTO bot_settings (setting_key, setting_value, setting_type, description) VALUES
('bot_status', 'active', 'string', 'حالة البوت العامة'),
('maintenance_mode', 'false', 'boolean', 'وضع الصيانة'),
('max_warnings', '3', 'number', 'الحد الأقصى للتحذيرات قبل الحظر'),
('default_experience_per_command', '10', 'number', 'نقاط الخبرة الافتراضية لكل أمر'),
('default_diamonds_per_command', '1', 'number', 'الألماس الافتراضي لكل أمر'),
('level_up_threshold', '100', 'number', 'نقاط الخبرة المطلوبة للمستوى التالي');

-- إدراج الأوامر الأساسية
INSERT OR IGNORE INTO commands (command_name, category, description, required_permission) VALUES
('اوامر', 'general', 'عرض قائمة الأوامر الرئيسية', 'user'),
('معلوماتي', 'general', 'عرض معلومات المستخدم الشخصية', 'user'),
('الاحصائيات', 'general', 'عرض إحصائيات البوت العامة', 'user'),
('المساعدة', 'general', 'الحصول على المساعدة والدعم', 'user'),
('حالة_البوت', 'developer', 'عرض حالة النظام والأداء', 'developer'),
('حظر', 'developer', 'حظر مستخدم من استخدام البوت', 'developer'),
('الغاء_حظر', 'developer', 'إلغاء حظر مستخدم', 'developer'),
('تحذير', 'admin', 'إعطاء تحذير لمستخدم', 'admin');

