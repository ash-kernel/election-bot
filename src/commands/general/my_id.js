const { SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my_id')
        .setDescription('Retrieve your personal encrypted identity token.'),

    async execute(interaction) {
        const db = getDB();
        
        // Query the new voter_registry table
        const reg = await db.get('SELECT election_id FROM voter_registry WHERE guild_id = ? AND user_id = ?', [interaction.guildId, interaction.user.id]);
        
        if (!reg) {
            return interaction.reply({ content: 'Identity profile not found. You have not registered in the current cycle.', ephemeral: true });
        }
        
        return interaction.reply({ content: `🔒 **Your verified active GOV-ID:** \`${reg.election_id}\``, ephemeral: true });
    }
};