const { SlashCommandBuilder } = require('discord.js');
const { getDB } = require('../../database/db');
const { baseEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('govid')
        .setDescription('Look up the public Voter ID of any user in the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to look up').setRequired(true)),

    async execute(interaction) {
        const db = getDB();
        const target = interaction.options.getUser('user');

        const data = await db.get('SELECT election_id, registered_at FROM voter_registry WHERE guild_id = ? AND user_id = ?', 
            [interaction.guildId, target.id]);

        if (!data) {
            return interaction.reply({ 
                embeds: [errorEmbed(`**${target.username}** has not registered in the current election cycle.`)],
                ephemeral: false 
            });
        }

        // The 'null' here prevents the Discord API C.R.A.S.H. for empty descriptions
        const embed = baseEmbed('🔍 Voter Registry Lookup', null, interaction.guild)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Citizen', value: `${target}`, inline: true },
                { name: 'Public GOV-ID', value: `\`${data.election_id}\``, inline: true },
                { name: 'Registration Date', value: `<t:${Math.floor(data.registered_at / 1000)}:f>`, inline: false }
            );

        return interaction.reply({ embeds: [embed] });
    }
};