const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const axios = require('axios');
const express = require('express');
const mongoose = require('mongoose');

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const SERVER_URL = process.env.SERVER_URL;
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error('FATAL ERROR: BOT_TOKEN is missing in environment variables.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Database Configuration
// ---------------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
});

const User = mongoose.model('User', userSchema);

// ---------------------------------------------------------------------------
// 2. Languages & Keyboards
// ---------------------------------------------------------------------------
const supportedLanguages = [
  "Tigrigna", "Afrikaans", "Amharic", "Arabic", "Assamese", "Azerbaijani",
  "Bashkir", "Belarusian", "Bulgarian", "Bengali", "Bosnian", "Catalan",
  "Cebuano", "Corsican", "Czech", "Welsh", "Danish", "German", "Greek",
  "English", "Esperanto", "Spanish", "Estonian", "Basque", "Persian",
  "Finnish", "Fijian", "French", "West Frisian", "Irish", "Scottish Gaelic",
  "Galician", "Gujarati", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hmong",
  "Croatian", "Haitian Creole", "Hungarian", "Armenian", "Indonesian", "Igbo",
  "Ilocano", "Icelandic", "Italian", "Japanese", "Javanese", "Georgian",
  "Kazakh", "Khmer", "Kannada", "Korean", "Kurdish", "Kyrgyz", "Latin",
  "Luxembourgish", "Lao", "Lithuanian", "Latvian", "Malagasy", "Maori",
  "Macedonian", "Malayalam", "Mongolian", "Marathi", "Malay", "Maltese",
  "Burmese", "Nepali", "Dutch", "Norwegian", "Nyanja", "Punjabi", "Polish",
  "Pashto", "Portuguese", "Romanian", "Russian", "Kinyarwanda", "Sanskrit",
  "Sindhi", "Northern Sami", "Sinhala", "Slovak", "Slovenian", "Samoan",
  "Shona", "Somali", "Albanian", "Serbian", "Sesotho", "Sundanese",
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

// ---------------------------------------------------------------------------
// 3. Helper Functions
// ---------------------------------------------------------------------------
const translateText = async (text, targetLang) => {
  try {
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
    );
    return response.data?.responseData?.translatedText || null;
  } catch (error) {
    console.error("Translation API error:", error.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// 4. Bot Handlers
// ---------------------------------------------------------------------------
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  const user = ctx.from;
  try {
    const existingUser = await User.findOne({ telegramId: user.id });
    if (existingUser) {
      await ctx.reply(`Welcome back, ${user.username || user.first_name}!`);
    } else {
      const newUser = new User({
        telegramId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      });
      await newUser.save();
      await ctx.reply(`Welcome, ${user.username || user.first_name}!`);
    }
  } catch (error) {
    console.error("Error managing user in database:", error.message);
    await ctx.reply(`Welcome!`);
  }

  return ctx.reply(
    'Please choose an option:',
    Markup.inlineKeyboard([
      [Markup.button.callback('Help', 'help')],
      [Markup.button.callback('Contact Developer', 'contact')],
    ])
  );
});

bot.help((ctx) => ctx.reply('Send me a voice message and I will convert it to text!'));
bot.action('help', (ctx) => ctx.reply("Send a voice message and I will convert it to text."));
bot.action('contact', (ctx) => ctx.reply("You can find me @akushady"));

bot.on('voice', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const replyMessage = await ctx.reply("Converting voice to text...");

    const fileId = ctx.message.voice.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      buffer,
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
      }
    );

    const audioUrl = uploadResponse.data.upload_url;

    const transcriptionResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      { audio_url: audioUrl },
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    const transcriptId = transcriptionResponse.data.id;

    let transcriptionResult;
    do {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      transcriptionResult = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: { authorization: ASSEMBLYAI_API_KEY },
        }
      );
    } while (
      transcriptionResult.data.status !== 'completed' &&
      transcriptionResult.data.status !== 'error'
    );

    if (transcriptionResult.data.status === 'error') {
      throw new Error('AssemblyAI transcription failed.');
    }

    const transcription = transcriptionResult.data.text;

    await ctx.telegram.deleteMessage(ctx.chat.id, replyMessage.message_id).catch(() => {});

    await ctx.reply(`Transcribed: "${transcription}"`);
    await ctx.reply('Select a language to translate this text:', getLanguageSelectionKeyboard());
  } catch (error) {
    console.error('Error processing voice message:', error.message);
    await ctx.reply('Sorry, an error occurred while processing your voice message.');
  }
});

bot.action(/lang:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const targetLang = ctx.match[1];

  const originalMessage = ctx.callbackQuery?.message?.reply_to_message?.text || "";
  const matchText = originalMessage.replace(/^Transcribed:\s*"/, '').replace(/"$/, '');

  if (!matchText) {
    return ctx.reply("Could not retrieve original text for translation. Please send the voice message again.");
  }

  const translated = await translateText(matchText, targetLang);
  if (!translated) {
    return ctx.reply("Sorry, translation failed. Please try again.");
  }

  return ctx.reply(`Translation (${targetLang}):\n${translated}`);
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  if (text === "akushadywantstostopthisbot07") {
    await ctx.reply("Stopping bot server...");
    process.exit(0);
  }

  const data = await translateText(text, "ti");
  if (!data) {
    return ctx.reply("Sorry, translation failed. Please try again.");
  }
  return ctx.reply(data);
});

bot.catch((err, ctx) => {
  console.error(`Telegraf error for update type [${ctx.updateType}]:`, err);
  ctx.reply('An unexpected error occurred. Please try again.');
});

// ---------------------------------------------------------------------------
// 5. Express Webhook Server Initialization
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

app.get('/', (req, res) => {
  res.send('Telegram Voice Translation Bot is running!');
});

const startServer = async () => {
  // 1. Start Express FIRST so Render detects the open port immediately
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Express server running on port ${PORT}`);
  });

  // 2. Connect MongoDB safely
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB Atlas connected successfully');
    }
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }

  // 3. Register Telegram Webhook safely
  try {
    if (SERVER_URL) {
      const webhookUrl = `${SERVER_URL.replace(/\/$/, '')}/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook set successfully to: ${webhookUrl}`);
    } else {
      console.warn('⚠️ SERVER_URL variable missing. Skipping webhook registration.');
    }
  } catch (err) {
    console.error('❌ Telegram Webhook Registration Failed:', err.message);
    console.error('💡 Hint: Check if BOT_TOKEN in Render environment variables is valid.');
  }
};

startServer();
module.exports = app;
