const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/generate-image', async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
        return res.status(400).json({ error: '缺少 prompt 参数' });
    }

    try {
        // 使用优化的pollinations.ai API生成水墨画风格图片
        const enhancedPrompt = `${prompt}，传统中国水墨画风格，山水画，诗意，淡墨渲染，氤氲云雾，古典美学，书法笔触`;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&style=watercolor&model=flux`;

        console.log('Generating image with prompt:', enhancedPrompt);

        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            console.error('Pollinations API error:', response.status, text);
            return res.status(response.status).json({ error: text });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            const text = await response.text();
            console.error('Unexpected response type:', contentType, text);
            return res.status(500).json({ error: 'Unexpected API response: ' + contentType + ' ' + text.substring(0, 200) });
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        console.log('Image generated successfully, size:', buffer.byteLength);
        return res.json({ imageData: `data:${contentType};base64,${base64}` });
    } catch (err) {
        console.error('Image generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`服务器已启动: http://localhost:${port}`);
});