const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../database/db');

const THEME_COLOR = 0x2b2d31;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('party')
        .setDescription('Admin platform asset tracking.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('add')
            .setDescription('Enroll a new candidate structure into persistent storage.')
            .addStringOption(o => o.setName('name').setDescription('Official Party Designation').setRequired(true))
            .addStringOption(o => o.setName('emoji').setDescription('Graphic Symbol').setRequired(true))
            .addStringOption(o => o.setName('banner').setDescription('Direct Image URL Asset').setRequired(true))
            .addUserOption(o => o.setName('owner').setDescription('Designated Candidate/Party Lead Owner').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove')
            .setDescription('Revoke candidate asset profile.')
            .addStringOption(o => o.setName('id').setDescription('Target Party ID (e.g. PTY-XXXX)').setRequired(true)))
        .addSubcommand(sub => sub.setName('list')
            .setDescription('Securely route complete localized candidate rosters to admin DM channel.')),

    async execute(interaction) {
        const db = getDB();
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const name = interaction.options.getString('name');
            const emoji = interaction.options.getString('emoji');
            const banner = interaction.options.getString('banner');
            const owner = interaction.options.getUser('owner');

            const { default: cryptoRandomString } = await import('crypto-random-string');
            const partyId = `PTY-${cryptoRandomString({ length: 4, type: 'alphanumeric' }).toUpperCase()}`;

            try {
                await db.run(
                    'INSERT INTO parties (party_id, guild_id, name, emoji, banner_url, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [partyId, interaction.guildId, name, emoji, banner, owner.id]
                );

                const embed = new EmbedBuilder()
                    .setColor(THEME_COLOR)
                    .setTitle('Candidate Infrastructure Enrolled')
                    .setDescription(`**ID:** \`${partyId}\`\n**Party:** ${emoji} ${name}\n**Owner:** ${owner}`)
                    .setImage(banner);

                return interaction.reply({ embeds: [embed] });
            } catch (err) {
                return interaction.reply({ content: 'Execution halted: Candidate designation conflict detected within this server context.', ephemeral: true });
            }
        }

        if (sub === 'remove') {
            const id = interaction.options.getString('id').toUpperCase();
            const res = await db.run('DELETE FROM parties WHERE guild_id = ? AND party_id = ?', [interaction.guildId, id]);
            
            if (res.changes === 0) return interaction.reply({ content: 'Target operational key index returned null records.', ephemeral: true });
            return interaction.reply({ content: `Infrastructure parameters linked to ID \`${id}\` successfully expunged.` });
        }

        if (sub === 'list') {
            await interaction.deferReply({ ephemeral: true });
            const parties = await db.all('SELECT * FROM parties WHERE guild_id = ?', [interaction.guildId]);

            if (parties.length === 0) {
                return interaction.editReply({ content: 'No candidate infrastructure metrics stored.' });
            }

            const embed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Protected Administrative Roster Ledger')
                .setDescription(parties.map(p => `▫️ **${p.party_id}** | ${p.emoji} \`${p.name}\` — Owner Reference: <@${p.owner_id}>`).join('\n'));

            try {
                await interaction.user.send({ embeds: [embed] });
                return interaction.editReply({ content: 'Roster ledger securely delivered to your private communication terminal.' });
            } catch {
                return interaction.editReply({ content: 'Transmission failed: Ensure your account configuration permits incoming private messages.' });
            }
        }
    }
};