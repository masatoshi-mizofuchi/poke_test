const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors());

app.use(express.static(__dirname));

app.get('/api/deck/:deckId(*)', async (req, res) => {
    let browser;
    try {
        const deckId = decodeURIComponent(req.params.deckId);
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
                await page.waitForSelector('img[src*=\"/card_images/large/\"]', { timeout: 5000 });
            } catch (e2) {
                console.log("No card images found, proceeding anyway");
            }
        }

        const pageHtml = await page.content();
        const preExtract = [];
        {
            const regex = /\/card_images\/large\/([^\"']+?)\.jpg/g;
            let m;
            while ((m = regex.exec(pageHtml)) !== null) {
                preExtract.push(m[1]);
            }
        }

        // ─────────────────────────────────────────────────────
        // ★ 修正箇所: 枚数取得を4パターンで試みる
        // ─────────────────────────────────────────────────────
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        const fullDeckIds = await page.evaluate(() => {
            // 4. ブラウザ内で情報を抽出
            const results = [];
            
            // 1. 各カードの親枠である "Grid_item" をすべて取得
            const items = document.querySelectorAll('.Grid_item');
            
            items.forEach(item => {
                const img = item.querySelector('img');
                // 2. 教えていただいた「.cPos.nowrap <span>」をピンポイントで取得
                const qtySpan = item.querySelector('.cPos.nowrap span');
                
                if (img && img.src.includes('/card_images/large/')) {
                    // ID抽出
                    const fullId = img.src.split('/large/')[1].split('.')[0];
                    
                    // 3. 枚数の取得を確実に実行
                    let qty = 1;
                    if (qtySpan) {
                        // <span>4</span> などのテキストから数字だけを抽出
                        const numText = qtySpan.innerText.replace(/[^0-9]/g, '');
                        const parsedQty = parseInt(numText, 10);
                        if (!isNaN(parsedQty)) {
                            qty = parsedQty;
                        }
                    }
    
                    // 4. 判明した枚数分(qty)だけIDを配列に追加
                    // これで「4枚なら4枚分」のIDが配列に入ります
                    for (let i = 0; i < qty; i++) {
                        results.push(fullId);
                    }
                }
            });
            
            return results;
        });

        console.log(`\n=== デッキ ${deckId} ===`);
        console.log(`→ 合計: ${fullDeckIds.length}枚\n`);

        if (fullDeckIds.length === 0 && preExtract.length > 0) {
            res.json({ success: true, cardIds: preExtract });
            return;
        }
        if (fullDeckIds.length === 0) {
            try {
                const htmlResp = await axios.get(targetUrl, {
                    headers: {
                        'Referer': 'https://www.pokemon-card.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });
                const $ = cheerio.load(htmlResp.data);
                const fallbackIds = [];
                $('img[src*="/card_images/large/"]').each((_, el) => {
                    const src = $(el).attr('src') || '';
                    const fullId = src.split('/large/')[1]?.split('.')[0];
                    if (fullId) fallbackIds.push(fullId);
                });
                if (fallbackIds.length === 0) {
                    const html = htmlResp.data;
                    const regex = /\/card_images\/large\/([^"']+?)\.jpg/g;
                    let m;
                    while ((m = regex.exec(html)) !== null) {
                        fallbackIds.push(m[1]);
                    }
                }
                if (fallbackIds.length > 0) {
                    res.json({ success: true, cardIds: fallbackIds });
                    return;
                }
                res.json({ success: false, message: "カードが見つかりませんでした" });
                return;
            } catch (fallbackErr) {
                console.error("フォールバック失敗:", fallbackErr.message);
                res.json({ success: false, message: "カードが見つかりませんでした" });
                return;
            }
        }

        res.json({ success: true, cardIds: fullDeckIds });

    } catch (e) {
        console.error("エラー詳細:", e.message);
        res.json({ success: false, message: "デッキ情報の読み込みに失敗しました" });
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
        const fullId = decodeURIComponent(req.params.cardId);
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
    console.log('Static site: http://localhost:3000/');
});
