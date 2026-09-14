const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = '1316737376789332079';
const YOUR_DISCORD_USER_ID = '1162102433032454254';

let activeAnswer = null;

// Helper function to load scores from a local file so they don't disappear if the bot restarts
function loadScores() {
    try {
        if (fs.existsSync('scores.json')) {
            return JSON.parse(fs.readFileSync('scores.json', 'utf8'));
        }
    } catch (err) {
        console.error('Error loading scores:', err);
    }
    return {};
}

// Helper function to save scores to a local file
function saveScores(scores) {
    fs.writeFileSync('scores.json', JSON.stringify(scores, null, 2));
}

// Helper function to load trivia questions from teagames.txt
function loadQuestions() {
    try {
        if (fs.existsSync('teagames.txt')) {
            const data = fs.readFileSync('teagames.txt', 'utf8');
            return data.split('\n')
                .map(line => line.trim())
                .filter(line => line.includes('|'))
                .map(line => {
                    const [question, answer] = line.split('|');
                    return { question: question.trim(), answer: answer.trim().toLowerCase() };
                });
        }
    } catch (err) {
        console.error('Error loading questions:', err);
    }
    return [];
}

client.once('ready', () => {
    console.log(`Cozy Tea Bot logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // 1. Handle !brew command (restricted to you and the designated channel)
    if (message.content === '!brew') {
        if (message.channel.id !== CHANNEL_ID) return;
        if (message.author.id !== YOUR_DISCORD_USER_ID) {
            return message.reply("Only the tavern keeper can brew a fresh round!");
        }

        const questions = loadQuestions();
        if (questions.length === 0) {
            return message.reply("The tea cupboard is empty! Make sure `teagames.txt` has questions formatted as `Question | Answer`.");
        }

        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        activeAnswer = randomQ.answer;

        return message.channel.id === CHANNEL_ID ? message.channel.send(`🍵 **Fresh Tea Trivia Brewed!**\n${randomQ.question}`) : null;
    }

    // 2. Handle !tea-score command
    if (message.content === '!tea-score') {
        const scores = loadScores();
        const userScore = scores[message.author.id] || 0;
        return message.reply(`Your current cozy tea score is: **${userScore}** points! 🍃`);
    }

    // 3. Check guesses from anyone in the designated channel
    if (activeAnswer && message.channel.id === CHANNEL_ID) {
        const userGuess = message.content.trim().toLowerCase();

        if (userGuess.includes(activeAnswer)) {
            let scores = loadScores();
            scores[message.author.id] = (scores[message.author.id] || 0) + 1;
            saveScores(scores);

            message.channel.send(`✨ Spot on, <@${message.author.id}>! You brewed it right. The answer was **${activeAnswer}**. (+1 point) 🍵`);
            activeAnswer = null; // Reset the riddle
        }
    }
});

client.login(TOKEN);