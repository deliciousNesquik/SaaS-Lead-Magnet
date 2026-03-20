// ============================================================
// NOTIFICATIONS — Уведомления менеджеру через Telegram
// Отправляются при регистрации нового лида
// ============================================================
import { config } from "../config/env";
/**
 * Отправить сообщение в Telegram через Bot API
 */
async function sendTelegramMessage(
    chatId: string,
    text: string,
    parseMode: "HTML" | "Markdown" = "HTML"
): Promise<void> {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: parseMode,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${response.status} ${error}`);
    }
}
/**
 * Уведомить менеджера о новом лиде (после регистрации)
 * Менеджер получает карточку лида в Telegram и должен перезвонить
 */
export async function notifyManagerNewLead(params: {
    userName: string;
    phone: string;
    tgUsername?: string;
}): Promise<void> {
    const { userName, phone, tgUsername } = params;
    const tgLink = tgUsername
        ? `<a href="https://t.me/${tgUsername}">@${tgUsername}</a>`
        : "не указан";
    const message = `
🆕 <b>Новый лид с лендинга!</b>
👤 <b>Имя:</b> ${userName}
📞 <b>Телефон:</b> <code>${phone}</code>
💬 <b>Telegram:</b> ${tgLink}
🕐 <b>Время:</b> ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)
<i>Позвоните в рабочее время для презентации платформы</i>
🎯 Действия:
• Позвонить: <code>${phone}</code>
• Предложить 14 дней бесплатного доступа
• Узнать размер компании → подобрать тариф
`.trim();
    await sendTelegramMessage(config.telegram.managerChatId, message);
    // Если настроен CRM чат — дублируем туда
    if (config.telegram.crmChatId) {
        await sendTelegramMessage(config.telegram.crmChatId, message);
    }
}
/**
 * Уведомить пользователя об успешной регистрации
 * (вызывается из бота, не из сервера)
 */
export function getRegistrationSuccessMessage(userName: string): string {
    return `
✅ <b>Регистрация успешна!</b>
Добро пожаловать, <b>${userName}</b>!
Вы зарегистрированы на платформе <b>Центр охраны труда</b>.
📱 Вернитесь на сайт — страница автоматически обновится и вы войдёте в аккаунт.
⏳ Наш менеджер свяжется с вами в ближайшее время для активации <b>14 дней бесплатного доступа</b> к полной платформе.
Если есть вопросы — напишите нам прямо здесь в бот.
`.trim();
}
/**
 * Сообщение об успешном входе
 */
export function getLoginSuccessMessage(userName: string): string {
    return `
✅ <b>Вход выполнен!</b>
С возвращением, <b>${userName}</b>!
📱 Вернитесь на сайт — вы автоматически войдёте в аккаунт.
`.trim();
}
/**
 * Сообщение об ошибке (истёкший токен)
 */
export function getExpiredTokenMessage(): string {
    return `
❌ <b>Ссылка устарела</b>
Эта ссылка уже недействительна (срок действия 10 минут).
Вернитесь на сайт и запросите новую ссылку для входа.
`.trim();
}
/**
 * Сообщение об уже использованном токене
 */
export function getUsedTokenMessage(): string {
    return `
ℹ️ <b>Ссылка уже использована</b>
Эта ссылка была использована ранее.
Вы уже вошли в аккаунт.
Вернитесь на сайт.
`.trim();
}