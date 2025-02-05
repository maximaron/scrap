const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

// Telegram Bot API Token
const telegramToken = '7932034603:AAF5vqbyU8YSFNAKf8v9XD4cmDD9Ruuw8BM';
const chatId = '-1002269248013';

// Инициализация Telegram бота
const bot = new TelegramBot(telegramToken, { polling: true });

async function startScraper() {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        bot.sendMessage(chatId, "Я готов к депозитам");
        setInterval(() => bot.sendMessage(chatId, "Я готов к депозитам"), 3600000);

        await page.goto('https://admin.stan.store/', { waitUntil: 'networkidle2' });

        await page.waitForSelector('input[placeholder="Email or Username"]');
        await page.type('input[placeholder="Email or Username"]', 'newhoraryastrol@outlook.com');
        await page.type('input[placeholder="Password"]', 'Olmo12345!');

        await Promise.all([
            page.click('button[name="login-submit-button"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        console.log("Успешный вход в систему!");

        await page.click('a[href="/income/"]');
        await page.waitForSelector('table.para-2.overflow-visible');

        async function getTableData() {
            try {
                return await page.evaluate(() => {
                    const table = document.querySelector('table.para-2.overflow-visible');
                    if (!table) return 'Таблица не найдена';

                    const rows = table.querySelectorAll('tr');
                    if (rows.length < 2) return 'Во второй строке данных нет';

                    const secondRow = rows[1];
                    const targetTd = secondRow.querySelector('td.text-truncate');
                    return targetTd ? targetTd.innerText.trim() : 'Ячейка не найдена';
                });
            } catch (error) {
                console.error("Ошибка при получении данных из таблицы:", error);
                return null;
            }
        }

        let temp = await getTableData();
        console.log("Начальные данные:", temp);

        async function checkForUpdates() {
            try {
                await page.reload({ waitUntil: 'networkidle2' });
                console.log("Страница обновлена");

                await page.click('a[href="/income/"]');
                await page.waitForSelector('table.para-2.overflow-visible');

                const newData = await getTableData();
                console.log("Новые данные:", newData);

                if (newData && newData !== temp) {
                    temp = newData;
                    await getDeposit();
                }
            } catch (error) {
                console.error("Ошибка в checkForUpdates:", error);
                restartScript();
            }
        }

        async function getDeposit() {
            try {
                await page.click('td.text-truncate');
                await page.waitForNavigation({ waitUntil: 'networkidle2' });

                const allData = [];

                async function extractData(selector1, selector2, label) {
                    try {
                        const data = await page.evaluate((s1, s2) => {
                            let el = document.querySelector(s1) || document.querySelector(s2);
                            return el ? el.textContent.trim() : null;
                        }, selector1, selector2);

                        allData.push(data ? `${label}: ${data}` : `${label}: Не удалось извлечь данные`);
                    } catch (error) {
                        console.error(`Ошибка при извлечении ${label}:`, error);
                        allData.push(`${label}: Ошибка извлечения`);
                    }
                }

                await extractData(
                    '#main-container > div > div:nth-child(5) > div.additional-details > div > div:nth-child(1) > p.mb-0.para-1',
                    '#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(1) > p.mb-0.para-1',
                    'SP name'
                );

                await extractData(
                    '#main-container > div > div:nth-child(5) > div.additional-details > div > div:nth-child(2) > p.mb-0.para-1',
                    '#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(2) > p.mb-0.para-1',
                    'Intention'
                );

                await extractData(
                    '#main-container > div > div:nth-child(5) > div.additional-details > div > div:nth-child(3) > p.mb-0.para-1',
                    '#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(3) > p.mb-0.para-1',
                    'Username'
                );

                await extractData(
                    '#main-container > div > div:nth-child(3) > div.transaction-details > div.d-flex.flex-grow-1.transaction-details-amount > div.cell.pl-0.flex-grow-1.net-revenue > div.para-1.text-bold',
                    '',
                    'Price'
                );

                bot.sendMessage(chatId, allData.join('\n'));

                await page.click('a[href="/income/"]');
                await page.waitForSelector('table.para-2.overflow-visible', { visible: true });
            } catch (error) {
                console.error("Ошибка в getDeposit:", error);
                restartScript();
            }
        }

        await page.click('a[href="/income/"]');
        setInterval(checkForUpdates, 10000);
    } catch (error) {
        console.error("Глобальная ошибка в скрипте:", error);
        restartScript();
    }
}

function restartScript() {
    console.log("Скрипт будет перезапущен через 10 секунд...");
    setTimeout(() => process.exit(1), 10000);
}

startScraper();
