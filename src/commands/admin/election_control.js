const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder } = require('discord.js');
const { getDB } = require('../../database/db');

const THEME_COLOR = 0x2b2d31;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('election')
        .setDescription('System control mechanics and secure cryptography.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('open').setDescription('Authorize the system to accept incoming ballots.'))
        .addSubcommand(sub => sub.setName('close').setDescription('Lock the system and freeze the ballot intake pipeline.'))
        .addSubcommand(sub => sub.setName('reset').setDescription('Hard-reset ballot lines (Preserves Voter IDs and Candidates).'))
        .addSubcommand(sub => sub.setName('purge_ids').setDescription('Permanently revoke and delete ALL registered Voter IDs.'))
        .addSubcommand(sub => sub.setName('export').setDescription('Decrypt and view the final election results (Requires Closed Status).')),

    async execute(interaction) {
        const db = getDB();
        const sub = interaction.options.getSubcommand();

        if (sub === 'open') {
            await db.run('INSERT INTO election_settings (guild_id, is_open) VALUES (?, 1) ON CONFLICT(guild_id) DO UPDATE SET is_open=1', [interaction.guildId]);
            return interaction.reply({ content: 'Operational Status updated: Ballot processing loops are **ACTIVE**. Results are now cryptographically sealed.', ephemeral: true });
        }

        if (sub === 'close') {
            await db.run('UPDATE election_settings SET is_open = 0 WHERE guild_id = ?', [interaction.guildId]);
            return interaction.reply({ content: 'Operational Status updated: Ballot processing loops are **OFFLINE**. Election logic has concluded.', ephemeral: true });
        }

        if (sub === 'reset') {
            await db.run('DELETE FROM votes WHERE guild_id = ?', [interaction.guildId]);
            return interaction.reply({ content: 'Operational clean completed: Ballots purged. **Voter GOV-IDs and Candidate profiles remain intact.**', ephemeral: true });
        }

        if (sub === 'purge_ids') {
            await db.run('DELETE FROM voter_registry WHERE guild_id = ?', [interaction.guildId]);
            return interaction.reply({ content: 'Registry clean completed: All Voter IDs have been permanently revoked. Users must re-authenticate.', ephemeral: true });
        }

        if (sub === 'export') {
            const settings = await db.get('SELECT is_open FROM election_settings WHERE guild_id = ?', [interaction.guildId]);
            
            if (settings && settings.is_open === 1) {
                return interaction.reply({ 
                    content: '🔒 **Security Protocol Active:** The ballot matrix is currently OPEN. Results remain cryptographically sealed to prevent voter manipulation. Use `/election close` to end the cycle before exporting.', 
                    ephemeral: true 
                });
            }

            await interaction.deferReply({ ephemeral: true }); 

            const parties = await db.all('SELECT * FROM parties WHERE guild_id = ?', [interaction.guildId]);
            const votes = await db.all('SELECT party_id, COUNT(election_id) as count FROM votes WHERE guild_id = ? GROUP BY party_id', [interaction.guildId]);

            const voteMap = new Map(votes.map(v => [v.party_id, v.count]));
            const totalVotes = votes.reduce((acc, current) => acc + current.count, 0);

            let frontrunner = null;
            let maxVotes = -1;
            let tieBreak = false;

            const metricFields = parties.map(p => {
                const count = voteMap.get(p.party_id) || 0;
                
                if (count > maxVotes) {
                    maxVotes = count;
                    frontrunner = p;
                    tieBreak = false;
                } else if (count === maxVotes && count > 0) {
                    tieBreak = true;
                }

                const allocationPercentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
                const progressBlocks = Math.round((parseFloat(allocationPercentage) / 100) * 10);
                const visualMetricBar = '🟩'.repeat(progressBlocks) + '⬛'.repeat(10 - progressBlocks);

                return {
                    name: `${p.emoji} ${p.name} [ID: ${p.party_id}]`,
                    value: `${visualMetricBar} \`${allocationPercentage}%\` (${count} verified ballots)`
                };
            });

            const embed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Decrypted Electoral Final Matrix')
                .setDescription(`Total parsed secure ballots: \`${totalVotes}\``)
                .addFields(metricFields);

            const components = [];

            if (frontrunner && !tieBreak && maxVotes > 0) {
                embed.addFields({ name: 'Verified Victor', value: `${frontrunner.emoji} **${frontrunner.name}**` });
                embed.setImage(frontrunner.banner_url);

                // Safe implementation of the dropdown menu
                const row = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`announce_winner_${frontrunner.party_id}`)
                        .setPlaceholder('Select channel to announce the winner...')
                        .addChannelTypes(0, 5) // 0 = Guild Text, 5 = Guild Announcement
                );
                components.push(row);

                try {
                    const ownerUser = await interaction.client.users.fetch(frontrunner.owner_id);
                    if (ownerUser) {
                        const congratsEmbed = new EmbedBuilder()
                            .setColor(0x2ECC71)
                            .setTitle('Electoral Vector Notification')
                            .setDescription(`Congratulations. The final decrypted analysis confirms your party asset matrix, **${frontrunner.name}** (${frontrunner.party_id}), has officially won the election in **${interaction.guild.name}**.`);
                        await ownerUser.send({ embeds: [congratsEmbed] });
                    }
                } catch (err) {}
            } else if (tieBreak) {
                embed.addFields({ name: 'System Core Alert', value: 'Deadlock warning: Multivariant structural tie detected.' });
            }

            return interaction.editReply({ embeds: [embed], components });
        }
    }
};