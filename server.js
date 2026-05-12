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
        const apiKey = process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'DashScope API key 未配置' });
        }

        // 使用阿里云DashScope API生成水墨画
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-DashScope-SSE': 'disable'
            },
            body: JSON.stringify({
                model: 'wanx-v1',
                input: {
                    prompt: `${prompt}，水墨画风格，传统中国水墨画，山水画，诗意`,
                    negative_prompt: 'low quality, blurry, distorted, ugly, poorly drawn, cartoon, anime, manga'
                },
                parameters: {
                    style: '<chinese painting>',
                    size: '1024*1024',
                    n: 1
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DashScope API error:', response.status, errorText);
            return res.status(response.status).json({ error: `API请求失败: ${response.status} ${errorText}` });
        }

        const data = await response.json();
        console.log('DashScope response:', JSON.stringify(data, null, 2));

        if (data.output && data.output.results && data.output.results.length > 0) {
            const imageUrl = data.output.results[0].url;
            // 获取图片数据
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                return res.status(500).json({ error: '无法获取生成的图片' });
            }

            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = imageResponse.headers.get('content-type') || 'image/png';

            return res.json({ imageData: `data:${contentType};base64,${base64}` });
        } else {
            return res.status(500).json({ error: 'API未返回图片结果' });
        }
    } catch (err) {
        console.error('生成图片时出错:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`服务器已启动: http://localhost:${port}`);
});