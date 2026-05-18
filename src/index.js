require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { initDB } = require('./database/db');
const handleInteractions = require('./handlers/interactionHandler');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load modules dynamically
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

client.once('clientReady', async () => {
    await initDB();
    console.log(`🚀 Governer engine operational, synced on profile client: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const msg = { content: 'There was an internal processing routine structural failure.', ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
            else await interaction.reply(msg);
        }
    } else {
        // Run standalone handlers for inputs like selections and buttons
        try {
            await handleInteractions(interaction);
        } catch (err) {
            console.error('Interaction loop exception structural break:', err);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);