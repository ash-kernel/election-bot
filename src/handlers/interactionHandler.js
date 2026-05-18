const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { getDB } = require('../database/db');

const THEME_COLOR = 0x2b2d31;

module.exports = async function handleInteractions(interaction) {
    // Note: We now allow BOTH Buttons and Select Menus through the gate
    if (!interaction.isButton() && !interaction.isChannelSelectMenu()) return;
    
    const db = getDB();
    const { customId, guildId, user, member } = interaction;

    try {
        // --- PIPELINE 1: REGISTRATION ---
        if (interaction.isButton() && customId === 'portal_register') {
            await interaction.deferReply({ ephemeral: true });

            const existing = await db.get('SELECT election_id FROM voter_registry WHERE guild_id = ? AND user_id = ?', [guildId, user.id]);
            if (existing) return interaction.editReply({ content: `Identity authentication already linked. Your active GOV-ID key: \`${existing.election_id}\`` });

            const standardAccountAgeMs = 150 * 24 * 60 * 60 * 1000;
            const standardMembershipAgeMs = 60 * 24 * 60 * 60 * 1000;

            if ((Date.now() - user.createdTimestamp) < standardAccountAgeMs || (Date.now() - member.joinedTimestamp) < standardMembershipAgeMs) {
                return interaction.editReply({ content: 'Identity Validation Fault: Account profile structural maturity parameters insufficient. Access denied.' });
            }

            const electionId = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
            await db.run('INSERT INTO voter_registry (guild_id, user_id, election_id, registered_at) VALUES (?, ?, ?, ?)', [guildId, user.id, electionId, Date.now()]);

            return interaction.editReply({ content: `Verification completed. Cryptographic allocation terminal has generated your secure profile key:\n\n\`${electionId}\`` });
        }

        // --- PIPELINE 2: ENTER TERMINAL (WITH AUTO-REDIRECT) ---
        if (interaction.isButton() && customId === 'portal_enter_terminal') {
            await interaction.deferReply({ ephemeral: true });

            const settings = await db.get('SELECT * FROM election_settings WHERE guild_id = ?', [guildId]);
            if (!settings || !settings.is_open) return interaction.editReply({ content: 'Operational notice: The council ballot matrix is currently offline or locked.' });

            const identity = await db.get('SELECT election_id FROM voter_registry WHERE guild_id = ? AND user_id = ?', [guildId, user.id]);
            
            // THE MISSING ID REDIRECT LOGIC
            if (!identity) {
                if (settings.reg_channel_id) {
                    return interaction.editReply({ content: `➡️ **Authentication Required:** You must acquire a GOV-ID before casting a ballot. Please proceed to the <#${settings.reg_channel_id}> channel to initialize your identity verification.` });
                } else {
                    return interaction.editReply({ content: 'Access Denied: Missing cryptographic identity. Contact an administrator to deploy the registration portal.' });
                }
            }

            const checkBallot = await db.get('SELECT voted_at FROM votes WHERE guild_id = ? AND election_id = ?', [guildId, identity.election_id]);
            if (checkBallot) return interaction.editReply({ content: `Security Exception: The identity key linked to your account (\`${identity.election_id}\`) has already logged a confirmed ballot.` });

            const parties = await db.all('SELECT * FROM parties WHERE guild_id = ?', [guildId]);
            if (parties.length === 0) return interaction.editReply({ content: 'No active candidates mapped.' });

            const embed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Authorized Council Terminal Panel')
                .setDescription(`Select an option to permanently bind your choice to the ballot pool.\n\n**Authorized Key Token:** \`${identity.election_id}\``);

            const components = [];
            for (let i = 0; i < Math.min(parties.length, 25); i += 5) {
                const row = new ActionRowBuilder();
                parties.slice(i, i + 5).forEach(p => {
                    row.addComponents(new ButtonBuilder().setCustomId(`terminal_cast_${p.party_id}`).setLabel(p.name).setEmoji(p.emoji).setStyle(ButtonStyle.Secondary));
                });
                components.push(row);
            }

            return interaction.editReply({ embeds: [embed], components });
        }

        // --- PIPELINE 3: CAST BALLOT ---
        if (interaction.isButton() && customId.startsWith('terminal_cast_')) {
            const partyId = customId.replace('terminal_cast_', '');
            const identity = await db.get('SELECT election_id FROM voter_registry WHERE guild_id = ? AND user_id = ?', [guildId, user.id]);
            if (!identity) return interaction.update({ content: 'Security parameters corrupted.', components: [], embeds: [] });

            const checkBallot = await db.get('SELECT voted_at FROM votes WHERE guild_id = ? AND election_id = ?', [guildId, identity.election_id]);
            if (checkBallot) return interaction.update({ content: 'Transactional fault: Double compilation prevented.', components: [], embeds: [] });

            await db.run('INSERT INTO votes (guild_id, election_id, party_id, voted_at) VALUES (?, ?, ?, ?)', [guildId, identity.election_id, partyId, Date.now()]);

            const completionEmbed = new EmbedBuilder().setColor(0x2ECC71).setTitle('Ballot Transmission Confirmed').setDescription(`Your record was encrypted and committed to storage.\n\n**Key Offset Verification Code:** \`${identity.election_id}\``);
            return interaction.update({ embeds: [completionEmbed], components: [] });
        }

        // --- PIPELINE 4: GRAND ANNOUNCEMENT BROADCAST ---
        if (interaction.isChannelSelectMenu() && customId.startsWith('announce_winner_')) {
            // 1. Use deferUpdate() instead of deferReply()
            await interaction.deferUpdate();
            
            const partyId = customId.replace('announce_winner_', '');
            const targetChannelId = interaction.values[0];
            const channel = interaction.guild.channels.cache.get(targetChannelId);

            if (!channel) return interaction.editReply({ content: 'Target channel mapping failed.' });

            const party = await db.get('SELECT * FROM parties WHERE guild_id = ? AND party_id = ?', [guildId, partyId]);

            const announceEmbed = new EmbedBuilder()
                .setColor(THEME_COLOR)
                .setTitle('Official Electoral Declaration')
                .setDescription(`The cryptographic ballot matrix for **${interaction.guild.name}** has been fully processed, verified, and formally concluded.\n\nBy recorded majority consensus, the verified victor is:\n\n### ${party.emoji} ${party.name}\n\nCongratulations to the elected party. The system lines have now been officially sealed.`)
                .setImage(party.banner_url)
                .setFooter({ text: 'Governer • Verification Engine' })
                .setTimestamp();

            await channel.send({ embeds: [announceEmbed] });
            
            // 2. Use editReply() instead of update() to modify the original dashboard
            return interaction.editReply({ content: `✅ Official declaration securely broadcasted to <#${targetChannelId}>.`, components: [] });
        }
        
    } catch (error) {
        console.error(`[CRITICAL ERROR]`, error);
        if (!interaction.deferred && !interaction.replied) await interaction.reply({ content: 'Internal logic error.', ephemeral: true });
    }
};