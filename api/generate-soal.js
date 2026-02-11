export default async function handler(req, res) {
    // 1. Setup CORS (Agar frontend bisa akses)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Hanya terima method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 3. Ambil API Key dari Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key Server belum dikonfigurasi' });
    }

    try {
        const { minat } = req.body;

        // 4. Prompt Engineering untuk Gemini
        const prompt = `
            Buatkan 10 soal pilihan ganda (Multiple Choice) untuk tes masuk kelas menulis kreatif.
            Topik spesifik: "${minat}".
            
            Kriteria Soal:
            1. Fokus pada logika cerita, pemahaman karakter, "Show Don't Tell", dan penggunaan PUEBI (Ejaan).
            2. Soal harus menguji 'Critical Thinking', bukan sekadar definisi.
            3. Berikan studi kasus pendek di setiap soal.
            4. Tingkat kesulitan: Menengah ke Sulit.
            
            FORMAT OUTPUT WAJIB JSON ARRAY MURNI (Raw JSON), JANGAN PAKAI MARKDOWN CODE BLOCK.
            Strukturnya:
            [
                {
                    "question": "Teks pertanyaan studi kasus...",
                    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
                    "correct_answer": 0,
                    "category": "Logika Cerita"
                }
            ]
        `;

        // 5. Panggil Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // Cek error dari Google
        if (data.error) {
            throw new Error(data.error.message);
        }

        // 6. Parsing & Cleaning Response
        let rawText = data.candidates[0].content.parts[0].text;
        
        // Bersihkan jika AI masih bandel kasih markdown ```json
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const questions = JSON.parse(rawText);

        // 7. Kirim balik ke Frontend
        return res.status(200).json(questions);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: 'Gagal membuat soal: ' + error.message });
    }
}
