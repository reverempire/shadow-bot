import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { botConfig } from './bot-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = botConfig.database.path;
    }

    async connect() {
        try {
            this.db = new sqlite3.Database(this.dbPath);
            console.log(chalk.green('✅ تم الاتصال بقاعدة البيانات بنجاح'));
            return true;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الاتصال بقاعدة البيانات:'), error);
            throw error;
        }
    }

    async disconnect() {
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(chalk.blue('🔌 تم إغلاق الاتصال بقاعدة البيانات'));
                        resolve();
                    }
                });
            });
            this.db = null;
        }
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async healthCheck() {
        try {
            await this.get('SELECT 1');
            return true;
        } catch (error) {
            console.error(chalk.red('❌ فشل فحص صحة قاعدة البيانات:'), error);
            return false;
        }
    }

    async getInfo() {
        try {
            const tables = await this.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `);

            const tableInfo = [];
            for (const table of tables) {
                const count = await this.get(`SELECT COUNT(*) as count FROM ${table.name}`);
                tableInfo.push({
                    name: table.name,
                    records: count.count
                });
            }

            return {
                tables: tableInfo,
                dbPath: this.dbPath
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على معلومات قاعدة البيانات:'), error);
            throw error;
        }
    }

    async backup() {
        try {
            const backupDir = botConfig.paths.backups;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `shadow-backup-${timestamp}.db`);
            
            // نسخ ملف قاعدة البيانات
            const fs = await import('fs');
            await fs.promises.copyFile(this.dbPath, backupPath);
            
            console.log(chalk.green(`✅ تم إنشاء نسخة احتياطية: ${backupPath}`));
            
            // تنظيف النسخ القديمة
            await this.cleanOldBackups();
            
            return backupPath;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إنشاء النسخة الاحتياطية:'), error);
            throw error;
        }
    }

    async cleanOldBackups() {
        try {
            const fs = await import('fs');
            const backupDir = botConfig.paths.backups;
            const files = await fs.promises.readdir(backupDir);
            
            const backupFiles = files
                .filter(file => file.startsWith('shadow-backup-') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    stat: fs.statSync(path.join(backupDir, file))
                }))
                .sort((a, b) => b.stat.mtime - a.stat.mtime);

            // حذف النسخ الزائدة
            const maxFiles = botConfig.database.backup.maxFiles;
            if (backupFiles.length > maxFiles) {
                const filesToDelete = backupFiles.slice(maxFiles);
                for (const file of filesToDelete) {
                    await fs.promises.unlink(file.path);
                    console.log(chalk.yellow(`🗑️ تم حذف النسخة القديمة: ${file.name}`));
                }
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف النسخ القديمة:'), error);
        }
    }

    async getStats() {
        try {
            const stats = {};
            
            // إحصائيات المستخدمين
            stats.totalUsers = (await this.get('SELECT COUNT(*) as count FROM users')).count;
            stats.activeUsers = (await this.get('SELECT COUNT(*) as count FROM users WHERE last_activity > datetime("now", "-7 days")')).count;
            stats.blockedUsers = (await this.get('SELECT COUNT(*) as count FROM users WHERE is_blocked = 1')).count;
            
            // إحصائيات المجموعات
            stats.totalGroups = (await this.get('SELECT COUNT(*) as count FROM groups')).count;
            
            // إحصائيات الأوامر
            stats.totalCommands = (await this.get('SELECT COUNT(*) as count FROM commands')).count;
            stats.commandsToday = (await this.get('SELECT COUNT(*) as count FROM command_logs WHERE DATE(executed_at) = DATE("now")')).count;
            
            return stats;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على الإحصائيات:'), error);
            throw error;
        }
    }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
const dbManager = new DatabaseManager();

export default dbManager;

