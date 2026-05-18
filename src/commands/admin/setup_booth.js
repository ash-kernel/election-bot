const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDB } = require('../../database/db');
const { baseEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_booth')
        .setDescription('Deploys the production election terminal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => option.setName('channel').setDescription('Target channel').setRequired(true)),

    async execute(interaction) {
        const db = getDB();
        const channel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        const embed = baseEmbed(
            'Election Terminal', 
            'Authentication is required. Please verify your identity before accessing the voting interface.'
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
    .setCustomId('portal_register') // <--- THIS MUST BE EXACT
    .setLabel('Authenticate Identity')
    .setStyle(ButtonStyle.Primary), // Or whatever color you chose
            new ButtonBuilder()
    .setCustomId('portal_enter_terminal') // <--- CHANGED TO MATCH HANDLER
    .setLabel('Access Voting Console')
    .setStyle(ButtonStyle.Success)
        );

        const message = await channel.send({ embeds: [embed], components: [row] });

        await db.run(
            `INSERT INTO election_settings (guild_id, booth_channel_id, booth_message_id) 
             VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET booth_channel_id=excluded.booth_channel_id, booth_message_id=excluded.booth_message_id`,
            [interaction.guildId, channel.id, message.id]
        );

        return interaction.editReply({ content: `Terminal deployed to ${channel}.` });
    }
};