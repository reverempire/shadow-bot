import chalk from 'chalk';
import { botConfig } from '../config/bot-config.js';
import UserService from './userService.js';
import dbManager from '../config/database.js';

export default class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.commands = new Map();
        this.loadCommands();
    }

    async loadCommands() {
        try {
            // تحميل الأوامر الأساسية
            this.commands.set('اوامر', this.handleMenuCommand.bind(this));
            this.commands.set('معلوماتي', this.handleProfileCommand.bind(this));
            this.commands.set('الاحصائيات', this.handleStatsCommand.bind(this));
            this.commands.set('المساعدة', this.handleHelpCommand.bind(this));
            
            // أوامر المطور
            this.commands.set('حالة_البوت', this.handleBotStatusCommand.bind(this));
            this.commands.set('حظر', this.handleBlockCommand.bind(this));
            this.commands.set('الغاء_حظر', this.handleUnblockCommand.bind(this));
            this.commands.set('تحذير', this.handleWarnCommand.bind(this));
            
            console.log(chalk.green(`✅ شادو تعلم ${this.commands.size} أمر من الظل`));
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تحميل أوامر الظل:'), error);
        }
    }

    async handleMessage(message) {
        try {
            const messageInfo = this.extractMessageInfo(message);
            if (!messageInfo) return;

            const { sender, content, isGroup, groupId } = messageInfo;
            
            const user = await UserService.getOrCreateUser(sender, {
                displayName: message.pushName || '',
                username: message.verifiedBizName || ''
            });

            if (user.isBlocked) {
                console.log(chalk.yellow(`🚫 رسالة من مستخدم محظور: ${user.displayName}`));
                return;
            }

            if (content.startsWith('.') || content.startsWith('!') || content.startsWith('/')) {
                await this.handleCommand(message, messageInfo, user);
            } else {
                await this.handleRegularMessage(message, messageInfo, user);
            }

        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة الرسالة:'), error);
        }
    }

    extractMessageInfo(message) {
        try {
            const messageType = Object.keys(message.message)[0];
            let content = '';

            if (messageType === 'conversation') {
                content = message.message.conversation;
            } else if (messageType === 'extendedTextMessage') {
                content = message.message.extendedTextMessage.text;
            } else if (messageType === 'imageMessage' && message.message.imageMessage.caption) {
                content = message.message.imageMessage.caption;
            } else if (messageType === 'videoMessage' && message.message.videoMessage.caption) {
                content = message.message.videoMessage.caption;
            } else {
                return null;
            }

            const sender = message.key.remoteJid.includes('@g.us') ? 
                message.key.participant || message.participant : 
                message.key.remoteJid;

            const isGroup = message.key.remoteJid.includes('@g.us');
            const groupId = isGroup ? message.key.remoteJid : null;

            return {
                sender: sender.replace('@s.whatsapp.net', ''),
                content: content.trim(),
                isGroup,
                groupId,
                messageType,
                timestamp: message.messageTimestamp
            };

        } catch (error) {
            console.error(chalk.red('❌ خطأ في استخراج معلومات الرسالة:'), error);
            return null;
        }
    }

    async handleCommand(message, messageInfo, user) {
        try {
            const { content, sender, isGroup } = messageInfo;
            
            const args = content.slice(1).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            console.log(chalk.blue(`🌑 أمر من الظل بواسطة ${user.displayName}: ${commandName}`));

            const commandHandler = this.commands.get(commandName);
            
            if (commandHandler) {
                const startTime = Date.now();
                
                try {
                    await commandHandler(message, messageInfo, user, args);
                    
                    const responseTime = Date.now() - startTime;
                    
                    await UserService.handleCommandUsage(
                        messageInfo.sender,
                        commandName,
                        true,
                        responseTime
                    );
                    
                    await this.logCommand(user.id, commandName, content, true, responseTime, messageInfo.groupId);
                    
                } catch (commandError) {
                    console.error(chalk.red(`❌ خطأ في تنفيذ أمر الظل ${commandName}:`), commandError);
                    
                    await this.sendMessage(message.key.remoteJid, {
                        text: '🌑 حدث خطأ في الظل أثناء تنفيذ الأمر. حاول مرة أخرى.'
                    });
                    
                    await this.logCommand(user.id, commandName, content, false, 0, messageInfo.groupId, commandError.message);
                }
            } else {
                await this.sendMessage(message.key.remoteJid, {
                    text: `🌑 الأمر "${commandName}" غير موجود في حديقة الظل.\nاكتب ".اوامر" لرؤية أوامر الظل المتاحة.`
                });
            }

        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة أمر الظل:'), error);
        }
    }

    async handleRegularMessage(message, messageInfo, user) {
        try {
            await user.updateLastActivity();
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة الرسالة العادية:'), error);
        }
    }

    // أمر القائمة الرئيسية
    async handleMenuCommand(message, messageInfo, user, args) {
        const menuText = `
⊱⊹•─๋︩︪═╾═─•┈⧽┊🌑┊⧼┈•─═╼═─๋︩︪•⊹⊰
⌗› مـرحـبـا بـكـ فـي حـديـقـة الـظـل ˼@${messageInfo.sender}˹
⋄⊹•─๋︩︪╾─•┈ ⧼ شـادو ⧽ ┈•─╼─๋︩︪•⊹⋄

> ˼‏👤˹ مـعـلـومـاتـك فـي الـظـل╿↶  
╮─ׅ ─๋︩︪─┈ ─๋︩︪─═⊏═┈ ─๋︩︪─ ∙ ∙ ⊰ـ
┤─ׅ─ׅ┈ ─๋︩︪──ׅ─ׅ┈ ─๋︩︪─☇ـ
│┊🪪 الـاسـم: ˼‏${user.displayName || 'مجهول الظل'} ˹
│┊👤 الـرتـبـه: ˼‏${this.getUserRoleText(user.userType)} ˹ 
│┊🌟 قـوة الـظـل: ˼${user.experiencePoints}˹
│┊💎 جـواهـر الـظـل: ˼${user.diamonds}˹
│┊🏆 مـسـتـوى الـظـل: ˼${user.level}˹
┤└─ׅ─ׅ┈ ─๋︩︪──ׅ─ׅ┈ ─๋︩︪☇ـ

> ˼‏🌑˹ ╿ أوامـر حـديـقـة الـظـل╿˼‏🌑˹   
╮─ׅ ─๋︩︪─┈ ─๋︩︪─═⊏═┈ ─๋︩︪─ ∙ ∙ ⊰ـ
┤─ׅ─ׅ┈ ─๋︩︪──ׅ─ׅ┈ ─๋︩︪─☇ـ
│┊¹ ⌗ .معلوماتي
*⧉↢اكتشف قوتك في الظل ❯*
│┊² ⌗ .الاحصائيات  
*⧉↢إحصائيات حديقة الظل ❯*
│┊³ ⌗ .المساعدة
*⧉↢دليل الظل ❯*
┤└─ׅ─ׅ┈ ─๋︩︪──ׅ─ׅ┈ ─๋︩︪☇ـ

⊱⊹•─๋︩︪═╾═─•┈⧽┊🌑┊⧼┈•─═╼═─๋︩︪•⊹⊰
        `.trim();

        await this.sendMessage(message.key.remoteJid, {
            text: menuText,
            mentions: [messageInfo.sender + '@s.whatsapp.net']
        });
    }

    // أمر معلومات المستخدم
    async handleProfileCommand(message, messageInfo, user, args) {
        const xpInfo = user.getXPForNextLevel();
        const joinedDays = UserService.getDaysSinceJoined(user.registrationDate);
        
        const profileText = `
╭─────────────────────────
│ 🌑 *ملف الظل الشخصي*
├─────────────────────────
│ 📝 *الاسم:* ${user.displayName || 'مجهول الظل'}
│ 🆔 *هوية الظل:* @${messageInfo.sender}
│ 👑 *رتبة الظل:* ${this.getUserRoleText(user.userType)}
│ 🏆 *مستوى الظل:* ${user.level}
│ 🌟 *قوة الظل:* ${user.experiencePoints}
│ 💎 *جواهر الظل:* ${user.diamonds}
│ ⚠️ *تحذيرات الظل:* ${user.warnings}/3
│ 📊 *أوامر الظل المستخدمة:* ${user.totalCommandsUsed}
│ 📅 *دخول حديقة الظل:* ${new Date(user.registrationDate).toLocaleDateString('ar-EG')}
│ 🗓️ *أيام في الظل:* ${joinedDays} يوم
├─────────────────────────
│ 📈 *تقدم قوة الظل:*
│ ▓${'█'.repeat(Math.floor((xpInfo.current / xpInfo.required) * 10))}${'░'.repeat(10 - Math.floor((xpInfo.current / xpInfo.required) * 10))}▓
│ ${xpInfo.current}/${xpInfo.required} (${xpInfo.remaining} متبقي)
╰─────────────────────────
        `.trim();

        await this.sendMessage(message.key.remoteJid, {
            text: profileText,
            mentions: [messageInfo.sender + '@s.whatsapp.net']
        });
    }

    // أمر الإحصائيات
    async handleStatsCommand(message, messageInfo, user, args) {
        try {
            const stats = await UserService.getGeneralStats();
            const botUptime = process.uptime();
            
            const statsText = `
╭─────────────────────────
│ 🌑 *إحصائيات حديقة الظل*
├─────────────────────────
│ 👥 *سكان الظل:* ${stats.totalUsers}
│ 👑 *حراس الظل:* ${stats.admin_count || 0}
│ 🔧 *أسياد الظل:* ${stats.developer_count || 0}
│ 🚫 *المنفيون من الظل:* ${stats.blocked_count || 0}
│ 🟢 *النشطون اليوم:* ${stats.active_today || 0}
│ 📈 *متوسط قوة الظل:* ${Math.round(stats.avg_experience || 0)}
│ 🏆 *أعلى مستوى ظل:* ${stats.max_level || 1}
│ ⚡ *أوامر الظل المستخدمة:* ${stats.total_commands || 0}
├─────────────────────────
│ 🌑 *معلومات شادو:*
│ ⏱️ *وقت في الظل:* ${this.formatUptime(botUptime)}
│ 💾 *ذاكرة الظل:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
│ 🔢 *إصدار الظل:* ${process.version}
╰─────────────────────────
            `.trim();

            await this.sendMessage(message.key.remoteJid, {
                text: statsText
            });
        } catch (error) {
            console.error(chalk.red('❌ خطأ في أمر إحصائيات الظل:'), error);
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 حدث خطأ في الحصول على إحصائيات الظل'
            });
        }
    }

    // أمر المساعدة
    async handleHelpCommand(message, messageInfo, user, args) {
        const helpText = `
╭─────────────────────────
│ 🌑 *دليل حديقة الظل*
├─────────────────────────
│ 📋 *أوامر الظل الأساسية:*
│ • .اوامر - قائمة أوامر الظل
│ • .معلوماتي - ملفك في الظل
│ • .الاحصائيات - إحصائيات الظل
│ • .المساعدة - هذا الدليل
├─────────────────────────
│ 💡 *نصائح الظل:*
│ • استخدم النقطة (.) قبل كل أمر
│ • اكسب قوة الظل باستخدام الأوامر
│ • احصل على جواهر الظل مع كل أمر
│ • تجنب الإفراط في استخدام قوة الظل
├─────────────────────────
│ 🔧 *للدعم في الظل:*
│ تواصل مع أسياد الظل عند الحاجة
╰─────────────────────────
        `.trim();

        await this.sendMessage(message.key.remoteJid, {
            text: helpText
        });
    }

    // أمر حالة البوت (للمطورين)
    async handleBotStatusCommand(message, messageInfo, user, args) {
        if (!user.hasPermission('developer')) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 هذا الأمر متاح لأسياد الظل فقط'
            });
            return;
        }

        const uptime = process.uptime();
        const memUsage = process.memoryUsage();
        
        const statusText = `
╭─────────────────────────
│ 🌑 *حالة شادو في الظل*
├─────────────────────────
│ 🟢 *الحالة:* متصل بحديقة الظل
│ ⏱️ *وقت في الظل:* ${this.formatUptime(uptime)}
│ 💾 *ذاكرة الظل:*
│   • المستخدمة: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB
│   • المتاحة: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB
│ 🔢 *معرف الظل:* ${process.pid}
│ 📦 *إصدار الظل:* ${process.version}
│ 🏷️ *إصدار شادو:* ${botConfig.version}
╰─────────────────────────
        `.trim();

        await this.sendMessage(message.key.remoteJid, {
            text: statusText
        });
    }

    // أمر الحظر (للمطورين)
    async handleBlockCommand(message, messageInfo, user, args) {
        if (!user.hasPermission('developer')) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 هذا الأمر متاح لأسياد الظل فقط'
            });
            return;
        }

        if (args.length === 0) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 حدد هوية من تريد نفيه من الظل\nمثال: .حظر 1234567890'
            });
            return;
        }

        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const reason = args.slice(1).join(' ') || 'نفي من حديقة الظل';

        try {
            const result = await UserService.blockUser(targetNumber, reason, user.whatsappId);
            
            await this.sendMessage(message.key.remoteJid, {
                text: `✅ تم نفي المستخدم من حديقة الظل\n👤 المنفي: ${result.user.displayName}\n📝 السبب: ${reason}`
            });
        } catch (error) {
            await this.sendMessage(message.key.remoteJid, {
                text: `❌ فشل في نفي المستخدم من الظل: ${error.message}`
            });
        }
    }

    // أمر إلغاء الحظر (للمطورين)
    async handleUnblockCommand(message, messageInfo, user, args) {
        if (!user.hasPermission('developer')) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 هذا الأمر متاح لأسياد الظل فقط'
            });
            return;
        }

        if (args.length === 0) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 حدد هوية من تريد إعادته لحديقة الظل\nمثال: .الغاء_حظر 1234567890'
            });
            return;
        }

        const targetNumber = args[0].replace(/[^0-9]/g, '');

        try {
            const result = await UserService.unblockUser(targetNumber, user.whatsappId);
            
            await this.sendMessage(message.key.remoteJid, {
                text: `✅ تم إعادة المستخدم لحديقة الظل\n👤 العائد: ${result.user.displayName}`
            });
        } catch (error) {
            await this.sendMessage(message.key.remoteJid, {
                text: `❌ فشل في إعادة المستخدم للظل: ${error.message}`
            });
        }
    }

    // أمر التحذير (للمشرفين)
    async handleWarnCommand(message, messageInfo, user, args) {
        if (!user.hasPermission('admin')) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 هذا الأمر متاح لحراس الظل فقط'
            });
            return;
        }

        if (args.length === 0) {
            await this.sendMessage(message.key.remoteJid, {
                text: '🌑 حدد هوية من تريد تحذيره في الظل\nمثال: .تحذير 1234567890 السبب'
            });
            return;
        }

        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const reason = args.slice(1).join(' ') || 'مخالفة قوانين الظل';

        try {
            const result = await UserService.warnUser(targetNumber, reason, user.whatsappId);
            
            let responseText = `⚠️ تم تحذير المستخدم في حديقة الظل\n👤 المحذر: ${result.user.displayName}\n📝 السبب: ${reason}\n🔢 التحذيرات: ${result.warningsCount}/3`;
            
            if (result.isBlocked) {
                responseText += '\n🚫 تم نفي المستخدم من الظل لتجاوز الحد الأقصى للتحذيرات';
            }
            
            await this.sendMessage(message.key.remoteJid, {
                text: responseText
            });
        } catch (error) {
            await this.sendMessage(message.key.remoteJid, {
                text: `❌ فشل في تحذير المستخدم: ${error.message}`
            });
        }
    }

    // معالجة الترحيب
    async handleWelcome(groupId, participants) {
        try {
            if (!botConfig.features.welcomeMessage) return;

            for (const participant of participants) {
                const welcomeText = `
🌑 *مرحباً بك في حديقة الظل!*

👋 أهلاً وسهلاً @${participant.split('@')[0]}
🌑 أنا شادو، الذي في حديقة الظل
📝 اكتب ".اوامر" لاكتشاف أوامر الظل

مرحباً بك في عالم الظل! 🌟
                `.trim();

                await this.sendMessage(groupId, {
                    text: welcomeText,
                    mentions: [participant]
                });
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في رسالة ترحيب الظل:'), error);
        }
    }

    // معالجة الوداع
    async handleGoodbye(groupId, participants) {
        try {
            for (const participant of participants) {
                const goodbyeText = `
🌑 *وداعاً من حديقة الظل!*

@${participant.split('@')[0]} غادر حديقة الظل
نتمنى له رحلة آمنة! 🌟
                `.trim();

                await this.sendMessage(groupId, {
                    text: goodbyeText,
                    mentions: [participant]
                });
            }
        } catch (error) {
            console.error(chalk.red('❌ خطأ في رسالة وداع الظل:'), error);
        }
    }

    // تسجيل الأوامر
    async logCommand(userId, commandName, fullCommand, success, responseTime, groupId = null, errorMessage = null) {
        try {
            await dbManager.run(`
                INSERT INTO command_logs (
                    user_id, group_id, command_name, full_command, 
                    success, response_time_ms, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, groupId, commandName, fullCommand, success, responseTime, errorMessage]);
            
            await dbManager.run(`
                UPDATE commands 
                SET usage_count = usage_count + 1 
                WHERE command_name = ?
            `, [commandName]);
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تسجيل أمر الظل:'), error);
        }
    }

    async sendMessage(jid, content, options = {}) {
        try {
            return await this.sock.sendMessage(jid, content, options);
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إرسال رسالة الظل:'), error);
            throw error;
        }
    }

    // دوال مساعدة
    getUserRoleText(userType) {
        const roles = {
            'user': 'ساكن الظل',
            'admin': 'حارس الظل',
            'developer': 'سيد الظل'
        };
        return roles[userType] || 'مجهول الظل';
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts = [];
        if (days > 0) parts.push(`${days} يوم`);
        if (hours > 0) parts.push(`${hours} ساعة`);
        if (minutes > 0) parts.push(`${minutes} دقيقة`);
        if (secs > 0) parts.push(`${secs} ثانية`);

        return parts.join(', ') || '0 ثانية';
    }
}

