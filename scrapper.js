const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

// Ваш Telegram Bot API Token
const telegramToken = '7932034603:AAF5vqbyU8YSFNAKf8v9XD4cmDD9Ruuw8BM';
const chatId = '-1002269248013';

// Инициализация Telegram бота
const bot = new TelegramBot(telegramToken, { polling: true });

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });

    // Открываем страницу и логинимся
    await page.goto('https://admin.stan.store/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[placeholder="Email or Username"]');
    await page.type('input[placeholder="Email or Username"]', 'newhoraryastrol@outlook.com');
    await page.type('input[placeholder="Password"]', 'Olmo12345!');

    await Promise.all([
        page.click('button[name="login-submit-button"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    console.log("Успешный вход в систему!");

    // Переход на страницу с таблицей
    await page.click('a[href="/income/"]');
    await page.waitForSelector('table.para-2.overflow-visible');

    // Функция для извлечения данных
    async function getTableData() {
        return await page.evaluate(() => {
            const table = document.querySelector('table.para-2.overflow-visible');
            if (!table) return 'Таблица не найдена';

            const rows = table.querySelectorAll('tr');
            if (rows.length < 2) return 'Во второй строке данных нет';  // Убедимся, что есть хотя бы 2 строки

            const secondRow = rows[1];  // Вторая строка
            const targetTd = secondRow.querySelector('td.text-truncate');
            return targetTd ? targetTd.innerText.trim() : 'Ячейка не найдена';
        });
    }

    let temp = await getTableData();
    console.log("Начальные данные:", temp);

    async function checkForUpdates() {
        await page.reload({ waitUntil: 'networkidle2' });
        console.log("Страница обновлена");
        await page.click('a[href="/income/"]');

        // Дожидаемся загрузки таблицы после обновления
        await page.waitForSelector('table.para-2.overflow-visible');
        console.log("Таблица загружена");
        await page.click('a[href="/income/"]');

        const newData = await getTableData();
        console.log("Новые данные:", newData);

        const isChanged = newData !== temp;
        console.log("Изменилось ли значение?", isChanged);
        await page.click('a[href="/income/"]');

        if (!isChanged) {
            temp = newData;
            getDeposit();
        }
    }

    async function getDeposit() {
        console.log("Кликаем на элемент <td>");
        await page.click('td.text-truncate');

        // Дожидаемся загрузки страницы после клика
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Страница загружена после клика");

        const allData = []; // Массив для хранения всех данных

        // Шаг 1: Извлекаем данные из третьего div с классом cell.bl-grey
        const firstStep = await page.evaluate(() => {
            const firstDiv = document.querySelector('#main-container > div > div:nth-child(4) > div.transaction-details > div:nth-child(3) > div.d-flex.align-items-start.para-1 > div.cursor-pointer');
            return firstDiv ? firstDiv.textContent.trim() : null;
        });
        if (firstStep) {
            allData.push(`Step 1: ${firstStep}`);
        } else {
            allData.push('Spell: Не удалось извлечь данные');
        }

        // Шаг 2: Извлекаем данные из первого p в additional-details
        const secondStep = await page.evaluate(() => {
            const secondDiv = document.querySelector('#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(1) > p');
            return secondDiv ? secondDiv.textContent.trim() : null;
        });
        if (secondStep) {
            allData.push(`SP name: ${secondStep}`);
        } else {
            allData.push('Шаг 2: Не удалось извлечь данные');
        }

        // Шаг 3: Извлекаем данные из второго p в additional-details
        const thirdStep = await page.evaluate(() => {
            const thirdDiv = document.querySelector('#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(2) > p');
            return thirdDiv ? thirdDiv.textContent.trim() : null;
        });
        if (thirdStep) {
            allData.push(`intention: ${thirdStep}`);
        } else {
            allData.push('Шаг 3: Не удалось извлечь данные');
        }

        // Шаг 4: Извлекаем данные из третьего p в additional-details
        const fourthStep = await page.evaluate(() => {
            const fourthDiv = document.querySelector('#main-container > div > div:nth-child(6) > div.additional-details > div > div:nth-child(3) > p');
            return fourthDiv ? fourthDiv.textContent.trim() : null;
        });
        if (fourthStep) {
            allData.push(`Username: ${fourthStep}`);
        } else {
            allData.push('Шаг 4: Не удалось извлечь данные');
        }

        // Шаг 5: Извлекаем данные из para-1.text-bold
        const priceStep = await page.evaluate(() => {
            const priceDiv = document.querySelector('#main-container > div > div:nth-child(3) > div.transaction-details > div.d-flex.flex-grow-1.transaction-details-amount > div.cell.pl-0.flex-grow-1.net-revenue > div.para-1.text-bold');
            return priceDiv ? priceDiv.textContent.trim() : null;
        });
        if (priceStep) {
            allData.push(`Price: ${priceStep}`);
        } else {
            allData.push('Шаг 5: Не удалось извлечь цену');
        }

        // Отправляем собранные данные в Telegram
        const message = allData.join('\n');
        bot.sendMessage(chatId, message);

        await page.click('a[href="/income/"]');
        await page.waitForSelector('#main-container > div > div.mt-4 > div.row.d-none.d-lg-block > div > div > div > div > div.table-container > table > tr:nth-child(2)', { visible: true });
        console.log("Элемент стал видимым, продолжение работы");
    }

    await page.click('a[href="/income/"]');
    setInterval(checkForUpdates, 10000);

})();
