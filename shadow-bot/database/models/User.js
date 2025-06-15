import dbManager from '../../config/database.js';
import chalk from 'chalk';

export default class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.whatsappId = data.whatsapp_id || data.whatsappId;
        this.username = data.username || '';
        this.displayName = data.display_name || data.displayName || '';
        this.userType = data.user_type || data.userType || 'user';
        this.experiencePoints = data.experience_points || data.experiencePoints || 0;
        this.level = data.level || 1;
        this.diamonds = data.diamonds || 0;
        this.warnings = data.warnings || 0;
        this.isBlocked = data.is_blocked || data.isBlocked || false;
        this.blockReason = data.block_reason || data.blockReason || null;
        this.blockedBy = data.blocked_by || data.blockedBy || null;
        this.blockedAt = data.blocked_at || data.blockedAt || null;
        this.totalCommandsUsed = data.total_commands_used || data.totalCommandsUsed || 0;
        this.lastActivity = data.last_activity || data.lastActivity || new Date();
        this.registrationDate = data.registration_date || data.registrationDate || new Date();
        this.updatedAt = data.updated_at || data.updatedAt || new Date();
    }

    // حفظ المستخدم في قاعدة البيانات
    async save() {
        try {
            if (this.id) {
                // تحديث مستخدم موجود
                const result = await dbManager.run(`
                    UPDATE users SET 
                        username = ?, display_name = ?, user_type = ?, 
                        experience_points = ?, level = ?, diamonds = ?, 
                        warnings = ?, is_blocked = ?, block_reason = ?, 
                        blocked_by = ?, blocked_at = ?, total_commands_used = ?, 
                        last_activity = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    this.username, this.displayName, this.userType,
                    this.experiencePoints, this.level, this.diamonds,
                    this.warnings, this.isBlocked, this.blockReason,
                    this.blockedBy, this.blockedAt, this.totalCommandsUsed,
                    this.lastActivity, this.id
                ]);
                return result;
            } else {
                // إنشاء مستخدم جديد
                const result = await dbManager.run(`
                    INSERT INTO users (
                        whatsapp_id, username, display_name, user_type,
                        experience_points, level, diamonds, warnings,
                        is_blocked, total_commands_used, last_activity
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    this.whatsappId, this.username, this.displayName, this.userType,
                    this.experiencePoints, this.level, this.diamonds, this.warnings,
                    this.isBlocked, this.totalCommandsUsed, this.lastActivity
                ]);
                this.id = result.id;
                return result;
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في حفظ المستخدم:'), error);
            throw error;
        }
    }

    // البحث عن مستخدم بواسطة WhatsApp ID
    static async findByWhatsappId(whatsappId) {
        try {
            const userData = await dbManager.get(
                'SELECT * FROM users WHERE whatsapp_id = ?',
                [whatsappId]
            );
            return userData ? new User(userData) : null;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في البحث عن المستخدم:'), error);
            throw error;
        }
    }

    // البحث عن مستخدم بواسطة ID
    static async findById(id) {
        try {
            const userData = await dbManager.get(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            return userData ? new User(userData) : null;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في البحث عن المستخدم:'), error);
            throw error;
        }
    }

    // إضافة خبرة للمستخدم
    async addExperience(points) {
        try {
            this.experiencePoints += points;
            
            // فحص إمكانية الترقية للمستوى التالي
            const levelUpThreshold = await this.getLevelUpThreshold();
            const currentLevelXP = this.level * levelUpThreshold;
            
            if (this.experiencePoints >= currentLevelXP) {
                this.level++;
                console.log(chalk.green(`🎉 ${this.displayName} ترقى للمستوى ${this.level}!`));
            }
            
            await this.save();
            return this.level;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إضافة الخبرة:'), error);
            throw error;
        }
    }

    // إضافة ألماس للمستخدم
    async addDiamonds(amount) {
        try {
            this.diamonds += amount;
            await this.save();
            return this.diamonds;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إضافة الألماس:'), error);
            throw error;
        }
    }

    // إضافة تحذير للمستخدم
    async addWarning(reason = 'لم يتم تحديد السبب') {
        try {
            this.warnings++;
            
            // فحص إذا وصل للحد الأقصى من التحذيرات
            const maxWarnings = await this.getMaxWarnings();
            if (this.warnings >= maxWarnings) {
                this.isBlocked = true;
                this.blockReason = `تم الحظر تلقائياً بعد ${maxWarnings} تحذيرات`;
                this.blockedAt = new Date().toISOString();
            }
            
            await this.save();
            return this.warnings;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إضافة التحذير:'), error);
            throw error;
        }
    }

    // حظر المستخدم
    async block(reason, blockedBy) {
        try {
            this.isBlocked = true;
            this.blockReason = reason;
            this.blockedBy = blockedBy;
            this.blockedAt = new Date().toISOString();
            await this.save();
            return true;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في حظر المستخدم:'), error);
            throw error;
        }
    }

    // إلغاء حظر المستخدم
    async unblock() {
        try {
            this.isBlocked = false;
            this.blockReason = null;
            this.blockedBy = null;
            this.blockedAt = null;
            await this.save();
            return true;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إلغاء حظر المستخدم:'), error);
            throw error;
        }
    }

    // تحديث آخر نشاط
    async updateLastActivity() {
        try {
            this.lastActivity = new Date().toISOString();
            await this.save();
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تحديث آخر نشاط:'), error);
        }
    }

    // زيادة عداد الأوامر المستخدمة
    async incrementCommandUsage() {
        try {
            this.totalCommandsUsed++;
            await this.save();
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تحديث عداد الأوامر:'), error);
        }
    }

    // فحص الصلاحيات
    hasPermission(requiredPermission) {
        const permissions = {
            'user': 1,
            'admin': 2,
            'developer': 3
        };
        
        const userLevel = permissions[this.userType] || 1;
        const requiredLevel = permissions[requiredPermission] || 1;
        
        return userLevel >= requiredLevel;
    }

    // الحصول على معلومات الخبرة للمستوى التالي
    getXPForNextLevel() {
        const levelUpThreshold = 100; // يمكن جعلها قابلة للتخصيص
        const currentLevelXP = this.level * levelUpThreshold;
        const nextLevelXP = (this.level + 1) * levelUpThreshold;
        
        return {
            current: this.experiencePoints - currentLevelXP,
            required: nextLevelXP - currentLevelXP,
            remaining: nextLevelXP - this.experiencePoints
        };
    }

    // دوال مساعدة للحصول على الإعدادات
    async getLevelUpThreshold() {
        try {
            const setting = await dbManager.get(
                'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
                ['level_up_threshold']
            );
            return parseInt(setting?.setting_value) || 100;
        } catch (error) {
            return 100;
        }
    }

    async getMaxWarnings() {
        try {
            const setting = await dbManager.get(
                'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
                ['max_warnings']
            );
            return parseInt(setting?.setting_value) || 3;
        } catch (error) {
            return 3;
        }
    }

    // تحويل إلى JSON
    toJSON() {
        return {
            id: this.id,
            whatsappId: this.whatsappId,
            username: this.username,
            displayName: this.displayName,
            userType: this.userType,
            experiencePoints: this.experiencePoints,
            level: this.level,
            diamonds: this.diamonds,
            warnings: this.warnings,
            isBlocked: this.isBlocked,
            blockReason: this.blockReason,
            blockedBy: this.blockedBy,
            blockedAt: this.blockedAt,
            totalCommandsUsed: this.totalCommandsUsed,
            lastActivity: this.lastActivity,
            registrationDate: this.registrationDate,
            updatedAt: this.updatedAt
        };
    }
}

