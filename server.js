const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

app.use(cors({
    origin: [
        'http://localhost:8000', 
        'http://127.0.0.1:8000', 
        'http://[::]:8000',
        'http://[::1]:8000',
        'http://localhost:5500', 
        'http://127.0.0.1:5500',
        'http://[::]:5500',
        'http://[::1]:5500'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());

app.get('/api/deck/:deckId', async (req, res) => {
    let browser;
    try {
        const deckId = req.params.deckId;
        const targetUrl = `https://www.pokemon-card.com/deck/confirm.html/deckID/${deckId}`;
        
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        try {
            await page.waitForSelector('.deck_list-item', { timeout: 10000 });
        } catch (e) {
            console.log("Primary selector failed, trying alternative selectors");
            try {
                await page.waitForSelector('img[src*="/card_images/large/"]', { timeout: 5000 });
            } catch (e2) {
                console.log("No card images found, proceeding anyway");
            }
        }

        // ─────────────────────────────────────────────────────
        // ★ 修正箇所: 枚数取得を4パターンで試みる
        // ─────────────────────────────────────────────────────
        page.on('console', msg => console.log('BROWSER:', msg.text()));
    const result = await page.evaluate(() => {
            // ★ デバッグ用：ここから追加
    const allItems = document.querySelectorAll('.deck_list-item');
    const debugStructure = {
        totalItems: allItems.length,
        // セクション見出しの構造
        sections: [...document.querySelectorAll('[class*="deck_list"]')].map(el => ({
            tag: el.tagName,
            class: el.className,
            childCount: el.children.length,
            text: el.innerText.slice(0, 50)
        })),
        // 最初のitemのHTML全文
        firstItemHTML: allItems[0]?.outerHTML ?? 'なし',
        // 21枚目と22枚目のHTML（境界を確認）
        item20HTML: allItems[20]?.outerHTML ?? 'なし',
        item21HTML: allItems[21]?.outerHTML ?? 'なし',
    };
    console.log('DEBUG:', JSON.stringify(debugStructure, null, 2));
    // ★ ここまで追加
            const cardIds = [];
            const debugLines = [];
            const items = document.querySelectorAll('.deck_list-item');

            items.forEach(item => {
                const img = item.querySelector('img');
                if (!img || !img.src.includes('/card_images/large/')) return;

                const fullId = img.src.split('/large/')[1].split('.')[0];
                const cardName = img.alt || fullId;
                let qty = null;

                // パターン1: .cPos.nowrap の span（元のコード）
                const spanEl = item.querySelector('.cPos.nowrap span, .cPos span');
                if (spanEl) {
                    const n = parseInt(spanEl.innerText.replace(/[^0-9]/g, ''), 10);
                    if (n > 0) qty = n;
                }

                // パターン2: .cPos のテキストノード直接
                if (!qty) {
                    const cposEl = item.querySelector('.cPos');
                    if (cposEl) {
                        const n = parseInt(cposEl.innerText.replace(/[^0-9]/g, ''), 10);
                        if (n > 0) qty = n;
                    }
                }

                // パターン3: data属性
                if (!qty) {
                    const raw = item.dataset.qty || item.dataset.count
                              || img.dataset.qty  || img.dataset.count;
                    if (raw) {
                        const n = parseInt(raw, 10);
                        if (n > 0) qty = n;
                    }
                }

                // パターン4: item全体のHTMLから数字を拾う（最終手段）
                // ポケカは1枚～4枚なので、1桁数字で絞り込む
                if (!qty) {
                    const nums = item.innerText.match(/\b[1-4]\b/g);
                    if (nums && nums.length > 0) {
                        // 一番最後に出てくる1-4の数字を採用
                        qty = parseInt(nums[nums.length - 1], 10);
                    }
                }

                // ★ それでも取れなければ 0 にして警告（1にして誤魔化さない）
                if (!qty || qty < 1 || qty > 4) {
                    debugLines.push(`⚠️  枚数不明 [${cardName}] → 生HTML: ${item.innerHTML.slice(0, 300)}`);
                    qty = 1; // フォールバック
                } else {
                    debugLines.push(`✅ ${cardName}: ${qty}枚`);
                }

                for (let i = 0; i < qty; i++) {
                    cardIds.push(fullId);
                }
            });

            return { cardIds, debugLines, itemCount: items.length };
        });

        // サーバーコンソールにデバッグ情報を出力
        console.log(`\n=== デッキ ${deckId} ===`);
        console.log(`deck_list-item 要素数: ${result.itemCount}`);
        result.debugLines.forEach(l => console.log(l));
        console.log(`→ 合計: ${result.cardIds.length}枚\n`);

        if (result.cardIds.length === 0) {
            throw new Error("カードが見つかりませんでした。");
        }

        res.json({ success: true, cardIds: result.cardIds });

    } catch (e) {
        console.error("エラー詳細:", e.message);
        res.status(500).json({ success: false, error: "デッキ情報の読み込みに失敗しました。" });
    } finally {
        if (browser) await browser.close();
    }
});

// テスト用エンドポイント
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: "Server is working!" });
});

// 画像プロキシ
app.get('/api/image/:cardId(*)', async (req, res) => {
    try {
        const fullId = req.params.cardId;
        const imageUrl = `https://www.pokemon-card.com/assets/images/card_images/large/${fullId}.jpg`;

        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://www.pokemon-card.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.set('Content-Type', 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error(`画像取得失敗: ${req.params.cardId}`, error.message);
        res.status(404).send('Image not found');
    }
});

// カード裏面画像プロキシ
app.get('/api/image/back', async (req, res) => {
    try {
        const response = await axios({
            method: 'get',
            url: 'https://www.pokemon-card.com/assets/images/card_images/common/back.png',
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://www.pokemon-card.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.set('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error) {
        console.error('裏面画像取得失敗', error.message);
        res.status(404).send('Image not found');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
    console.log('Test endpoint: http://localhost:3000/api/test');
    console.log('Image proxy: http://localhost:3000/api/image/{cardId}');
});