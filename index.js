const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const express = require('express');

// ============= MONGODB CONNECTION =============
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('✅ Using cached MongoDB connection');
        return cachedDb;
    }

    try {
        console.log('🔄 Connecting to MongoDB...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 1,
            minPoolSize: 1,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            serverSelectionTimeoutMS: 30000,
        });
        
        cachedDb = conn;
        console.log('✅ MongoDB connected successfully');
        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

// ============= SCHEMA =============
const userSchema = new mongoose.Schema({
    telegramId: Number,
    username: String,
    firstName: String,
    lastName: String,
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// ============= BOT SETUP =============
const bot = new Telegraf(process.env.BOT_TOKEN);

// ============= LANGUAGE DATA =============
const supportedLanguages = [
    "Tigrigna", "Afrikaans", "Amharic", "Arabic", "Assamese", "Azerbaijani",
    "Bashkir", "Belarusian", "Bulgarian", "Bengali", "Bosnian", "Catalan",
    "Cebuano", "Corsican", "Czech", "Welsh", "Danish", "German", "Greek",
    "English", "Esperanto", "Spanish", "Estonian", "Basque", "Persian",
    "Finnish", "Fijian", "French", "West Frisian", "Irish", "Scottish Gaelic",
    "Galician", "Gujarati", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hmong",
    "Croatian", "Haitian Creole", "Hungarian", "Armenian", "Indonesian",
    "Igbo", "Ilocano", "Icelandic", "Italian", "Japanese", "Javanese",
    "Georgian", "Kazakh", "Khmer", "Kannada", "Korean", "Kurdish", "Kyrgyz",
    "Latin", "Luxembourgish", "Lao", "Lithuanian", "Latvian", "Malagasy",
    "Maori", "Macedonian", "Malayalam", "Mongolian", "Marathi", "Malay",
    "Maltese", "Burmese", "Nepali", "Dutch", "Norwegian", "Nyanja", "Punjabi",
    "Polish", "Pashto", "Portuguese", "Romanian", "Russian", "Kinyarwanda",
    "Sanskrit", "Sindhi", "Northern Sami", "Sinhala", "Slovak", "Slovenian",
    "Samoan", "Shona", "Somali", "Albanian", "Serbian", "Sesotho", "Sundanese",
    "Swedish", "Swahili", "Tamil", "Telugu", "Tajik", "Thai", "Turkmen",
    "Tagalog", "Turkish", "Tatar", "Uyghur", "Ukrainian", "Urdu", "Uzbek",
    "Vietnamese", "Xhosa", "Yiddish", "Yoruba", "Simplified Chinese",
    "Traditional Chinese", "Zulu"
];

const shortLanguages = [
    "ti", "af", "am", "ar", "as", "az", "ba", "be", "bg", "bn", "bs", "ca",
    "ceb", "co", "cs", "cy", "da", "de", "el", "en", "eo", "es", "et", "eu",
    "fa", "fi", "fj", "fr", "fy", "ga", "gd", "gl", "gu", "ha", "haw", "he",
    "hi", "hmn", "hr", "ht", "hu", "hy", "id", "ig", "ilo", "is", "it", "ja",
    "jv", "ka", "kk", "km", "kn", "ko", "ku", "ky", "la", "lb", "lo", "lt",
    "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my", "ne", "nl",
    "no", "ny", "pa", "pl", "ps", "pt", "ro", "ru", "rw", "sa", "sd", "se",
    "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "st", "su", "sv", "sw",
    "ta", "te", "tg", "th", "tk", "tl", "tr", "tt", "ug", "uk", "ur", "uz",
    "vi", "xh", "yi", "yo", "zh-CN", "zh-TW", "zu"
];

function getLanguageSelectionKeyboard() {
    const inlineKeyboard = [];
    const buttonsPerRow = 3;

    for (let i = 0; i < supportedLanguages.length; i++) {
        if (i % buttonsPerRow === 0) {
            inlineKeyboard.push([]);
        }
        inlineKeyboard[Math.floor(i / buttonsPerRow)].push({
            text: supportedLanguages[i],
            callback_data: `lang:${shortLanguages[i]}`,
        });
    }

    return Markup.inlineKeyboard(inlineKeyboard);
}

// ============= HELPERS =============
const translateText = async (text, targetLang) => {
    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
        );
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
};

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

// ============= BOT HANDLERS =============
bot.start(async (ctx) => {
    try {
        await connectToDatabase();
        const user = ctx.from;
        const existingUser = await User.findOne({ telegramId: user.id });
        
        if (!existingUser) {
            const newUser = new User({
                telegramId: user.id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name
            });
            await newUser.save();
            console.log("✅ New user added:", user.username);
        }
        
        ctx.reply(`Welcome${user.username ? ' ' + user.username : ''}! Send me a voice message and I'll convert it to text!`);
    } catch (error) {
        console.error('❌ Start error:', error);
        ctx.reply("Welcome! Please try again later if you experience issues.");
    }
});

bot.help((ctx) => {
    ctx.reply('Send me a voice message and I will convert it to text!');
});

bot.action('help', (ctx) => {
    ctx.reply("Send a voice message and I will convert it to text 📝");
});

bot.action('contact', (ctx) => {
    ctx.reply("👨‍💻 Developer: @akushady");
});

// Store transcriptions in memory (for this session only)
const transcriptions = new Map();

bot.on('voice', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const replyMessage = await ctx.reply("🎵 Converting voice to text...");

        const fileId = ctx.message.voice.file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        // Download voice
        const response = await axios.get(fileLink.href, { 
            responseType: 'arraybuffer',
            timeout: 60000 
        });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Upload to AssemblyAI
        const uploadResponse = await axios.post(
            'https://api.assemblyai.com/v2/upload',
            buffer,
            {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/octet-stream',
                },
                timeout: 60000,
            }
        );

        const audioUrl = uploadResponse.data.upload_url;

        // Start transcription
        const transcriptionResponse = await axios.post(
            'https://api.assemblyai.com/v2/transcript',
            { audio_url: audioUrl },
            {
                headers: {
                    authorization: ASSEMBLYAI_API_KEY,
                    'content-type': 'application/json',
                },
                timeout: 60000,
            }
        );

        const transcriptId = transcriptionResponse.data.id;

        // Poll for result
        let transcriptionResult;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            transcriptionResult = await axios.get(
                `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
                {
                    headers: { authorization: ASSEMBLYAI_API_KEY },
                }
            );
            
            if (transcriptionResult.data.status === 'completed') {
                break;
            } else if (transcriptionResult.data.status === 'error') {
                throw new Error('Transcription failed');
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('Transcription timeout');
        }

        const transcription = transcriptionResult.data.text;
        
        // Store in map with chat ID
        transcriptions.set(ctx.chat.id, transcription);
        
        await ctx.telegram.deleteMessage(ctx.chat.id, replyMessage.message_id);
        
        ctx.reply(`📝 "${transcription}"`);
        ctx.reply('🌍 Choose a language to translate to:', getLanguageSelectionKeyboard());

    } catch (error) {
        console.error('❌ Voice processing error:', error);
        ctx.reply('❌ Sorry, an error occurred. Please try again.');
    }
});

bot.action(/lang:(.+)/, async (ctx) => {
    try {
        const targetLang = ctx.match[1];
        const text = transcriptions.get(ctx.chat.id);
        
        if (!text) {
            ctx.reply("❌ No text found. Please send a voice message first.");
            return;
        }

        await ctx.reply("🔄 Translating...");
        const translation = await translateText(text, targetLang);
        
        ctx.reply(`🌍 Translation (${supportedLanguages[shortLanguages.indexOf(targetLang)] || targetLang}):\n\n${translation}`);
    } catch (error) {
        console.error('❌ Translation error:', error);
        ctx.reply("❌ Sorry, translation failed. Please try again.");
    }
});

bot.on('text', async (ctx) => {
    try {
        if (ctx.message.text === "akushadywantstostopthisbot07") {
            ctx.reply("ℹ️ Bot is running on Vercel and cannot be stopped this way.");
            return;
        }

        const translation = await translateText(ctx.message.text, "ti");
        ctx.reply(`🌍 Tigrigna Translation:\n\n${translation}`);
    } catch (error) {
        console.error('❌ Text translation error:', error);
        ctx.reply("❌ Sorry, translation failed.");
    }
});

// Catch all other messages
bot.on('message', (ctx) => {
    ctx.reply('📢 Send me a voice message and I will convert it to text!');
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`❌ Error for ${ctx.updateType}:`, err);
    ctx.reply('❌ An error occurred. Please try again later.');
});

// ============= EXPRESS SERVER =============
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
    try {
        await connectToDatabase();
        res.status(200).json({
            status: 'OK',
            dbConnected: mongoose.connection.readyState === 1,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        await connectToDatabase();
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).send('Error');
    }
});

app.get('/', (req, res) => {
    res.send('🤖 Bot is running on Vercel!');
});

// ============= EXPORT FOR VERCEL =============
module.exports = app;

// ============= LOCAL DEVELOPMENT =============
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        console.log(`🚀 Server running on port ${PORT}`);
        
        try {
            await connectToDatabase();
            console.log('✅ Database connected');
            
            // Set webhook for local ngrok testing
            if (process.env.VERCEL_URL) {
                const webhookUrl = `https://${process.env.VERCEL_URL}/webhook`;
                await bot.telegram.setWebhook(webhookUrl);
                console.log(`✅ Webhook set to: ${webhookUrl}`);
            }
        } catch (error) {
            console.error('❌ Startup error:', error);
        }
    });
}
