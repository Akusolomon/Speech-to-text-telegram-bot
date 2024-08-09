const { Telegraf,Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const util = require('util');
const express = require('express')
function async allin(){
// Replace 'YOUR_BOT_TOKEN' with your actual bot token from BotFather
const bot = new Telegraf('7129189640:AAEh7Vr0CaMHFdChHFiuaa6DrcC5PdJ7zPc');

// Replace 'YOUR_ASSEMBLYAI_API_KEY' with your actual AssemblyAI API key
const ASSEMBLYAI_API_KEY = '9f8f92a29210461a8d654f8e73bb1665';

// Start command
   const usersFile = 'users.json';

   // Function to read users from the file
   const readUsers = () => {
      if (fs.existsSync(usersFile)) {
         const data = fs.readFileSync(usersFile, 'utf8');
         return JSON.parse(data);
      }
      return [];
   };

   // Function to write users to the file
   const writeUsers = (users) => {
      const data = JSON.stringify(users, null, 2);
      fs.writeFileSync(usersFile, data, 'utf8');
   };

   // Start command
   bot.start((ctx) => {
      const user = {
         id: ctx.from.id,
         username: ctx.from.username,
         first_name: ctx.from.first_name,
         last_name: ctx.from.last_name,
      };

      // Read existing users
      const users = readUsers();

      // Check if user already exists
      const userExists = users.some((u) => u.id === user.id);
      if (!userExists) {
         // Add new user to the list
         users.push(user);
         writeUsers(users);
         console.log(`Added new user: ${user.username || user.first_name}`);
      } else {
         console.log(`User already exists: ${user.username || user.first_name}`);
      }
   ctx.reply(
      'Welcome! Please choose an option:',
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
      
      ctx.reply(`saying: ${transcription}`);
   } catch (error) {
      console.error('Error processing voice message:', error);
      ctx.reply('Sorry, an error occurred while processing your voice message.');
   }
});

// Handle text messages
bot.on('text', (ctx) => {
   ctx.reply(`You said: ${ctx.message.text}`);
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
}
const app = express();

app.get('/', (req, res) => {
   allin()
   res.send('Bot is running');
});

const PORT = 8080 || 3000;
app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
});
