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

// Helper function to load trivia questions from teagames.txt and split correctly at '|'
function loadTriviaQuestions() {
    try {
        if (fs.existsSync('teagames.txt')) {
            const data = fs.readFileSync('teagames.txt', 'utf8');
            const lines = data.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const questions = [];
            for (const line of lines) {
                if (line.includes('|')) {
                    const parts = line.split('|');
                    const question = parts[0].trim();
                    const answer = parts[1].trim().toLowerCase();
                    questions.push({ question, answer });
                }
            }
            return questions;
        }
    } catch (err) {
        console.error('Error loading trivia:', err);
    }
    return [];
}

client.once('ready', () => {
    console.log(`CozyTavernBot is online as ${client.user.tag}! 🍵`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // 1. Handle !toptea leaderboard command
    if (message.content === '!toptea') {
        const scores = loadScores();
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sortedScores.length === 0) {
            return message.reply('🌱 No tea scores recorded yet! Be the first to brew a correct answer.');
        }

        let leaderboardText = '🏆 **Cozy Tavern Tea Leaderboard** 🏆\n';
        sortedScores.forEach(([userId, pts], index) => {
            leaderboardText += `${index + 1}. <@${userId}> — **${pts}** points\n`;
        });

        return message.reply(leaderboardText);
    }

    // 2. Handle !tea-score command
    if (message.content === '!tea-score') {
        const scores = loadScores();
        const userScore = scores[message.author.id] || 0;
        return message.reply(`Your current cozy tea score is: **${userScore}** points! 🍵`);
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

    // 4. Admin command to trigger a trivia question (restricted to your user ID)
    if (message.content === '!starttea' && message.author.id === YOUR_DISCORD_USER_ID) {
        const questions = loadTriviaQuestions();
        if (questions.length === 0) {
            return message.reply('⚠️ No trivia questions found in `teagames.txt`!');
        }

        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        activeAnswer = randomQ.answer;

        return message.channel.send(`🫖 **Cozy Tea Trivia Time!**\n${randomQ.question}`);
    }
});

// Keep Render web service happy by listening on a port
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('CozyTavernBot is alive!\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

client.login(TOKEN);

// --- RENDER KEEP-ALIVE PING ---
const INTERVAL_MINUTES = 10;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

if (RENDER_URL) {
    setInterval(async () => {
        try {
            const response = await fetch(RENDER_URL);
            console.log(`[Keep-Alive] Pinged self successfully: ${response.status}`);
        } catch (error) {
            console.error('[Keep-Alive] Ping failed:', error.message);
        }
    }, INTERVAL_MINUTES * 60 * 1000);
}