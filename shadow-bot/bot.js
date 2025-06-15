import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import qrcode from 'qrcode-terminal';
import readline from 'readline';
import { existsSync, mkdirSync } from 'fs';
import { botConfig } from './config/bot-config.js';
import dbManager from './config/database.js';
import MessageHandler from './services/messageHandler.js';

export default class ShadowBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.messageHandler = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.startTime = Date.now();
        
        // إعداد مجلد الجلسة
        if (!existsSync(botConfig.whatsapp.sessionPath)) {
            mkdirSync(botConfig.whatsapp.sessionPath, { recursive: true });
        }
    }

    async start() {
        try {
            console.log(chalk.blue('🌑 بدء تشغيل شادو - الذي في حديقة الظل...'));
            
            // الحصول على أحدث إصدار من Baileys
            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(chalk.gray(`📦 إصدار Baileys: ${version.join('.')} ${isLatest ? '(أحدث)' : '(قديم)'}`));
            
            // إعداد حالة المصادقة
            const { state, saveCreds } = await useMultiFileAuthState(botConfig.whatsapp.sessionPath);
            
            // إنشاء اتصال WhatsApp
            this.sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                browser: ['Shadow Bot', 'Chrome', '110.0.0.0'],
                logger: { level: 'silent' },
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: true,
                syncFullHistory: false,
                defaultQueryTimeoutMs: 60000,
                getMessage: async (key) => {
                    return { conversation: 'Shadow Bot Message' };
                }
            });

            // إعداد معالج الرسائل
            this.messageHandler = new MessageHandler(this.sock);

            // إعداد معالجات الأحداث
            this.setupEventHandlers(saveCreds);
            
            // انتظار الاتصال
            await this.waitForConnection();
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في بدء البوت:'), error);
            throw error;
        }
    }

    setupEventHandlers(saveCreds) {
        // معالج تحديث الاتصال
        this.sock.ev.on('connection.update', async (update) => {
            await this.handleConnectionUpdate(update, saveCreds);
        });

        // معالج حفظ بيانات المصادقة
        this.sock.ev.on('creds.update', saveCreds);

        // معالج الرسائل الواردة
        this.sock.ev.on('messages.upsert', async (messageUpdate) => {
            await this.handleIncomingMessages(messageUpdate);
        });

        // معالج تحديث المجموعات
        this.sock.ev.on('groups.update', async (updates) => {
            await this.handleGroupUpdates(updates);
        });

        // معالج تحديث المشاركين في المجموعات
        this.sock.ev.on('group-participants.update', async (update) => {
            await this.handleGroupParticipantsUpdate(update);
        });

        // معالج حذف الرسائل
        this.sock.ev.on('message.delete', async (messageDelete) => {
            await this.handleMessageDelete(messageDelete);
        });

        // معالج تحديث الحالة
        this.sock.ev.on('presence.update', async (presenceUpdate) => {
            // يمكن إضافة معالجة لتحديثات الحالة هنا
        });
    }

    async handleConnectionUpdate(update, saveCreds) {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(chalk.yellow('🌑 امسح رمز QR للدخول إلى حديقة الظل:'));
            qrcode.generate(qr, { small: true });
            
            if (botConfig.whatsapp.phoneNumber && botConfig.whatsapp.pairingCode) {
                console.log(chalk.blue('\n💡 أو اكتب "code" لاستخدام كود الاقتران'));
                
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rl.question('اختر طريقة الاتصال (اتركها فارغة للـ QR أو اكتب "code"): ', async (answer) => {
                    if (answer.toLowerCase() === 'code') {
                        try {
                            const code = await this.sock.requestPairingCode(botConfig.whatsapp.phoneNumber);
                            console.log(chalk.red(`🔑 كود الاقتران: ${code}`));
                        } catch (error) {
                            console.error(chalk.red('❌ خطأ في طلب كود الاقتران:'), error);
                        }
                    }
                    rl.close();
                });
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red('🔌 انقطع الاتصال من حديقة الظل:'), lastDisconnect?.error);
            
            if (shouldReconnect) {
                this.connectionAttempts++;
                
                if (this.connectionAttempts <= this.maxConnectionAttempts) {
                    console.log(chalk.yellow(`🔄 محاولة العودة إلى الظل (${this.connectionAttempts}/${this.maxConnectionAttempts})...`));
                    
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await this.start();
                } else {
                    console.error(chalk.red('❌ فشل في العودة إلى حديقة الظل بعد عدة محاولات'));
                    process.exit(1);
                }
            } else {
                console.log(chalk.red('❌ تم طرد شادو من حديقة الظل، يرجى إعادة المصادقة'));
                process.exit(1);
            }
        } else if (connection === 'open') {
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log(chalk.green('✅ شادو دخل حديقة الظل بنجاح!'));
            
            const botInfo = this.sock.user;
            console.log(chalk.blue(`📱 رقم شادو: ${botInfo.id.split(':')[0]}`));
            console.log(chalk.blue(`👤 اسم شادو: ${botInfo.name || 'الذي في حديقة الظل'}`));
            
            await this.updateBotStatus();
        }
    }

    async handleIncomingMessages(messageUpdate) {
        try {
            const { messages, type } = messageUpdate;
            
            if (type !== 'notify') return;
            
            for (const message of messages) {
                if (!message.message || message.key.fromMe) continue;
                
                // معالجة الرسالة
                await this.messageHandler.handleMessage(message);
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة الرسائل الواردة:'), error);
        }
    }

    async handleGroupUpdates(updates) {
        try {
            for (const update of updates) {
                console.log(chalk.blue(`📝 تحديث في حديقة الظل: ${update.id}`));
                
                if (update.subject) {
                    console.log(chalk.gray(`  ├─ الاسم الجديد: ${update.subject}`));
                }
                
                if (update.desc) {
                    console.log(chalk.gray(`  ├─ الوصف الجديد: ${update.desc}`));
                }
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة تحديثات المجموعات:'), error);
        }
    }

    async handleGroupParticipantsUpdate(update) {
        try {
            const { id, participants, action } = update;
            
            console.log(chalk.blue(`👥 تحديث المشاركين في حديقة الظل: ${id}`));
            console.log(chalk.gray(`  ├─ الإجراء: ${action}`));
            console.log(chalk.gray(`  └─ المشاركون: ${participants.length}`));
            
            if (action === 'add') {
                await this.messageHandler.handleWelcome(id, participants);
            } else if (action === 'remove') {
                await this.messageHandler.handleGoodbye(id, participants);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة تحديثات المشاركين:'), error);
        }
    }

    async handleMessageDelete(messageDelete) {
        try {
            console.log(chalk.yellow('🗑️ تم حذف رسالة في حديقة الظل'));
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة حذف الرسائل:'), error);
        }
    }

    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('انتهت مهلة انتظار دخول حديقة الظل'));
            }, 60000);

            const checkConnection = () => {
                if (this.isConnected) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkConnection, 1000);
                }
            };

            checkConnection();
        });
    }

    async updateBotStatus() {
        try {
            const botInfo = this.sock.user;
            console.log(chalk.green('📊 شادو جاهز في حديقة الظل'));
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تحديث حالة شادو:'), error);
        }
    }

    async stop() {
        try {
            console.log(chalk.yellow('🔄 شادو يغادر حديقة الظل...'));
            
            if (this.sock) {
                await this.sock.logout();
                this.sock = null;
            }
            
            this.isConnected = false;
            console.log(chalk.green('✅ شادو غادر حديقة الظل بنجاح'));
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إيقاف شادو:'), error);
            throw error;
        }
    }

    getBotInfo() {
        return {
            isConnected: this.isConnected,
            user: this.sock?.user || null,
            connectionAttempts: this.connectionAttempts,
            uptime: Date.now() - this.startTime
        };
    }

    async sendMessage(jid, content, options = {}) {
        try {
            if (!this.isConnected) {
                throw new Error('شادو غير متصل بحديقة الظل');
            }
            
            return await this.sock.sendMessage(jid, content, options);
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إرسال الرسالة:'), error);
            throw error;
        }
    }

    async getGroupMetadata(jid) {
        try {
            return await this.sock.groupMetadata(jid);
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على معلومات المجموعة:'), error);
            return null;
        }
    }
}

