const { Telegraf,Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const util = require('util');
const express = require('express')
const mongoose = require('mongoose')
// Replace 'YOUR_BOT_TOKEN' with your actual bot token from BotFather
const uri = "mongodb+srv://melakusolomon94:0945787915f@cluster0.f5gi3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"






mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Example schema and model
const Schema = mongoose.Schema;
const userSchema = new mongoose.Schema({
  telegramId: Number,
  username: String,
  firstName: String,
  lastName: String,
});
const User = mongoose.model('User', userSchema);
const bot = new Telegraf('7129189640:AAEh7Vr0CaMHFdChHFiuaa6DrcC5PdJ7zPc');




let mydata;
const supportedLanguages = [
    "Tigrigna",
   "Afrikaans",
  "Amharic",
  "Arabic",
  "Assamese",
  "Azerbaijani",
  "Bashkir",
  "Belarusian",
  "Bulgarian",
  "Bengali",
  "Bosnian",
  "Catalan",
  "Cebuano",
  "Corsican",
  "Czech",
  "Welsh",
  "Danish",
  "German",
  "Greek",
  "English",
  "Esperanto",
  "Spanish",
  "Estonian",
  "Basque",
  "Persian",
  "Finnish",
  "Fijian",
  "French",
  "West Frisian",
  "Irish",
  "Scottish Gaelic",
  "Galician",
  "Gujarati",
  "Hausa",
  "Hawaiian",
  "Hebrew",
  "Hindi",
  "Hmong",
  "Croatian",
  "Haitian Creole",
  "Hungarian",
  "Armenian",
  "Indonesian",
  "Igbo",
  "Ilocano",
  "Icelandic",
  "Italian",
  "Japanese",
  "Javanese",
  "Georgian",
  "Kazakh",
  "Khmer",
  "Kannada",
  "Korean",
  "Kurdish",
  "Kyrgyz",
  "Latin",
  "Luxembourgish",
  "Lao",
  "Lithuanian",
  "Latvian",
  "Malagasy",
  "Maori",
  "Macedonian",
  "Malayalam",
  "Mongolian",
  "Marathi",
  "Malay",
  "Maltese",
  "Burmese",
  "Nepali",
  "Dutch",
  "Norwegian",
  "Nyanja",
  "Punjabi",
  "Polish",
  "Pashto",
  "Portuguese",
  "Romanian",
  "Russian",
  "Kinyarwanda",
  "Sanskrit",
  "Sindhi",
  "Northern Sami",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Samoan",
  "Shona",
  "Somali",
  "Albanian",
  "Serbian",
  "Sesotho",
  "Sundanese",
  "Swedish",
  "Swahili",
  "Tamil",
  "Telugu",
  "Tajik",
  "Thai",
  "Turkmen",
  "Tagalog",
  "Turkish",
  "Tatar",
  "Uyghur",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Vietnamese",
  "Xhosa",
  "Yiddish",
  "Yoruba",
  "Simplified Chinese",
  "Traditional Chinese",
  "Zulu"
];
const shortLanguages = [
   "ti",
   "af",
  "am",
  "ar",
  "as",
  "az",
  "ba",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "ceb",
  "co",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "eo",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fj",
  "fr",
  "fy",
  "ga",
  "gd",
  "gl",
  "gu",
  "ha",
  "haw",
  "he",
  "hi",
  "hmn",
  "hr",
  "ht",
  "hu",
  "hy",
  "id",
  "ig",
  "ilo",
  "is",
  "it",
  "ja",
  "jv",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "ku",
  "ky",
  "la",
  "lb",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "ne",
  "nl",
  "no",
  "ny",
  "pa",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "rw",
  "sa",
  "sd",
  "se",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "tk",
  "tl",
  "tr",
  "tt",
  "ug",
  "uk",
  "ur",
  "uz",
  "vi",
  "xh",
  "yi",
  "yo",
  "zh-CN",
  "zh-TW",
  "zu"
];
function getLanguageSelectionKeyboard() {
  const inlineKeyboard = [];
  const buttonsPerRow = 3; // Change this to adjust the number of buttons per row

  for (let i = 0; i < supportedLanguages.length; i++) {
    if (i % buttonsPerRow === 0) {
      inlineKeyboard.push([]); // Start a new row
    }
    inlineKeyboard[Math.floor(i / buttonsPerRow)].push({
      text: supportedLanguages[i],
      callback_data: `button_1:${shortLanguages[i]}`,
    });
  }

  return Markup.inlineKeyboard(inlineKeyboard);
}

 const translateText = async (text, targetLang) => {
     const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
     const data = await response.json();
     return data.responseData.translatedText;
 };

 
// Replace 'YOUR_ASSEMBLYAI_API_KEY' with your actual AssemblyAI API key
const ASSEMBLYAI_API_KEY = '9f8f92a29210461a8d654f8e73bb1665';

// Start command


   // Start command
   bot.start( async (ctx) => {
      const user = ctx.from;
  // Check if user exists in the database
  const existingUser = await User.findOne({ telegramId: user.id });
  if (existingUser) {
    console.log("User already exists in the database.");
    ctx.reply(`Welcome back, ${user.username}!`);
  } else {
    // Create a new user document
    const newUser = new User({
      telegramId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    });
     try {
      await newUser.save();
      console.log("New user added to the database.");
      ctx.reply(`Welcome, ${user.username}!`);
    } catch (error) {
      console.error("Error adding user to the database:", error);
      ctx.reply("Sorry, there was an error. Please try again later.");
    }
  }
   
   ctx.reply(
      'Please choose an option:',
      Markup.inlineKeyboard([
         Markup.button.callback('Help', 'help'),
         Markup.button.callback('Contact Developer', 'contact'),
      ])
   );
});

// Help command
bot.help((ctx) => {
   ctx.reply('Send me a voice message and I will convert it to text!');
});
bot.action('help',(ctx) => {
   ctx.reply("send a voice message and i will convert it to text  ")
});

bot.action('contact',(ctx) => {
   ctx.reply("you can find me @akushady")
})
// Handle voice messages
bot.on('voice', async (ctx) => {
   try {
     await ctx.sendChatAction('typing')
      const replyMessage = await ctx.reply("converting...")

      const fileId = ctx.message.voice.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      // Download the voice message
      const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const uploadResponse = await axios.post(
         'https://api.assemblyai.com/v2/upload',
         buffer,
         {
            headers: {
               'authorization': ASSEMBLYAI_API_KEY,
               'content-type': 'application/octet-stream',
            },
         }
      );

      const audioUrl = uploadResponse.data.upload_url;

      // Request transcription
      const transcriptionResponse = await axios.post(
         'https://api.assemblyai.com/v2/transcript',
         {
            audio_url: audioUrl,
         },
         {
            headers: {
               authorization: ASSEMBLYAI_API_KEY,
               'content-type': 'application/json',
            },
         }
      );

      const transcriptId = transcriptionResponse.data.id;

      // Wait for the transcription to complete
      let transcriptionResult;
      do {
         transcriptionResult = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            {
               headers: {
                  authorization: ASSEMBLYAI_API_KEY,
               },
            }
         );
         await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
      } while (transcriptionResult.data.status !== 'completed');

      const transcription = transcriptionResult.data.text;     ctx.telegram.deleteMessage(ctx.chat.id, replyMessage.message_id);
      mydata = transcription
      ctx.reply(`saying: ${transcription}`);
 
     ctx.reply('Choose an option:', getLanguageSelectionKeyboard()
   )
   } catch (error) {
      console.error('Error processing voice message:', error);
      ctx.reply('Sorry, an error occurred while processing your voice message.');
   }
});
bot.action(/(button_\d+):(.+)/, async (ctx) => {
   translateText(mydata, ctx.match[2]).then(async (dd)=>{
      ctx.reply(".....")
      await new Promise(resolve => setTimeout(resolve, 5000));
      if(!mydata){ctx.reply("sorry can't convert try again")}
ctx.reply(dd)
}).catch(err => {ctx.reply("try send again")
                console.log(err)})
                
})
// Handle text messages
bot.on('text', async (ctx) => {
  console.log(ctx.message.text)
   const data = await translateText(ctx.message.text, "ti")
   ctx.reply("........")
   await new Promise(resolve => setTimeout(resolve, 5000));
   console.log(data)
   if(!data){ctx.reply("sorry can't convert try again")}
   ctx.reply(data)
});

// Handle unknown commands
bot.on('message', (ctx) => {
   ctx.reply('Send me a voice message and I will convert it to text!');
});

bot.launch()
   .then(() => console.log('Bot is running'))
   .catch(err => console.error('Error starting the bot', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


const app = express();

// Use express.json() middleware to parse JSON bodies
app.use(express.json());

// Webhook handler
app.post('/webhook', async (req, res) => {
    try {
        await bot.handleUpdate(req.body); // Pass updates to the bot
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling update', error);
        res.status(500).send('Error');
    }
});

app.get('/', (req, res) => {
    res.send('Bot is running');
});

// Set the webhook for Telegram
const webhookUrl = "https://speech-to-text-telegram-bot.vercel.app/webhook";

bot.telegram.setWebhook(webhookUrl);

// Start the server
const PORT = 8080 || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
