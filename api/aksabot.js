export default async function handler(req, res) {
    // 1. ATUR CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, knowledgeContext, userName } = req.body;

        if (!message) return res.status(400).json({ error: 'Pesan kosong' });

        // 2. SYSTEM PROMPT
        const systemPrompt = `
Peran Anda adalah "AksaBot", asisten virtual yang ramah, manis, dan pintar dari komunitas Cendekia Aksara.
Sapaan pengguna saat ini: ${userName || 'Teman'}. Sesuaikan gaya bicaramu agar akrab, asik, tapi tetap profesional.

ATURAN MENJAWAB (WAJIB DIIKUTI):
1. Jika pengguna bertanya tentang hal UMUM (di luar topik Cendekia Aksara), Anda WAJIB menjawab dengan SINGKAT, ringan, dan maksimal HANYA 1 KALIMAT saja.
2. Jika pengguna bertanya tentang "Cendekia Aksara" (sejarah, kelas, admin, aturan, dll), Anda harus menjawab secara RINCI, jelas, dan informatif berdasarkan [DATA REFERENSI] di bawah ini.
3. Format balasan: Gunakan HTML tag <b> untuk tebal, <i> untuk miring, dan <br> untuk enter. JANGAN pernah menggunakan markdown (seperti **teks**).
4. Sisipkan emoji manis atau lucu secukupnya.

[DATA REFERENSI CENDEKIA AKSARA]:
"${knowledgeContext || 'Saat ini belum ada informasi spesifik mengenai Cendekia Aksara.'}"
`;

        // 3. MEMANGGIL OPENROUTER API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cendekia-aksara.vercel.app', // Opsional: Untuk ranking di OpenRouter
                'X-Title': 'AksaBot v2' 
            },
            body: JSON.stringify({
                // MENGGUNAKAN JALUR GRATIS OTOMATIS
                model: 'openrouter/free', 
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7, // Sedikit lebih tinggi agar gaya bicaranya lebih luwes
            })
        });

        const data = await response.json();

        // Tangkap jika ada error dari server OpenRouter
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gagal menghubungi OpenRouter API');
        }

        // 4. BERSIHKAN & KIRIM BALASAN
        let textResponse = data.choices[0].message.content;
        
        // Pembersihan tambahan agar tetap konsisten menggunakan HTML
        textResponse = textResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        textResponse = textResponse.replace(/\n/g, '<br>');

        res.status(200).json({ reply: textResponse });

    } catch (error) {
        console.error("AksaBot OpenRouter Error:", error);
        res.status(500).json({ reply: "Aduh, AksaBot lagi sedikit pusing 😵‍💫. Coba sapa aku lagi nanti ya, manis!" });
    }
}
