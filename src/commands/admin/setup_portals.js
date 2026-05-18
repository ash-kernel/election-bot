const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../database/db');

const THEME_COLOR = 0x2b2d31;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Deploy governance interface hubs.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('registration')
            .setDescription('Deploy the voter registration portal.')
            .addChannelOption(o => o.setName('channel').setDescription('Target deployment channel').setRequired(true)))
        .addSubcommand(sub => sub.setName('booth')
            .setDescription('Deploy the primary voting terminal booth.')
            .addChannelOption(o => o.setName('channel').setDescription('Target deployment channel').setRequired(true))),

    async execute(interaction) {
        const db = getDB();
        const sub = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        if (sub === 'registration') {
            const embed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Voter Registry Verification')
                .setDescription('To participate in council elections, you must bind your account to a unique voter identification key.\n\n**Security Requirements:**\n▫️ Discord account maturity must exceed 5 months.\n▫️ Server residency duration must exceed 2 months.')
                .setFooter({ text: 'Governer Identity Verification Engine' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('portal_register')
                    .setLabel('Initialize Identity Verification')
                    .setStyle(ButtonStyle.Primary)
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            await db.run(
                `INSERT INTO election_settings (guild_id, reg_channel_id, reg_message_id) 
                 VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET reg_channel_id=excluded.reg_channel_id, reg_message_id=excluded.reg_message_id`,
                [interaction.guildId, channel.id, message.id]
            );

            return interaction.editReply({ content: 'Registration portal has been deployed successfully.' });
        }

       if (sub === 'booth') {
            const parties = await db.all('SELECT * FROM parties WHERE guild_id = ?', [interaction.guildId]);
            if (parties.length === 0) {
                return interaction.editReply({ content: 'Error: Cannot establish voting terminal before registering candidate parties via `/party add`.' });
            }

            const embed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Council Election Terminal')
                .setDescription('The global ballot repository is accessible via the terminal loop below. Ensure identity verification keys have been acquired prior to entering.')
                .setFooter({ text: 'Governer Cryptographic Ballot System' });

            // ONLY ONE BUTTON NOW
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('portal_enter_terminal')
                    .setLabel('Access Voting Console')
                    .setStyle(ButtonStyle.Success)
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            await db.run(
                `INSERT INTO election_settings (guild_id, booth_channel_id, booth_message_id) 
                 VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET booth_channel_id=excluded.booth_channel_id, booth_message_id=excluded.booth_message_id`,
                [interaction.guildId, channel.id, message.id]
            );

            return interaction.editReply({ content: 'Voting terminal booth has been deployed successfully.' });
        }
    }
};