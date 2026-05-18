const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const THEME_COLOR = 0x2b2d31;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays the technical documentation for Governer commands.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(THEME_COLOR)
            .setAuthor({ name: 'Governer Documentation', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Governer is an enterprise-grade election management system. Below is the updated operational command infrastructure.')
            .addFields(
                { 
                    name: 'Voter Commands', 
                    value: `\` /govid [user] \` - Lookup the public Voter ID of any server member.\n\` /gov my_id   \` - Retrieve your personal encrypted identity token.` 
                },
                { 
                    name: 'Admin Setup & Party Management', 
                    value: `\` /setup registration \` - Deploy the voter registration portal (enforces age/residency limits).\n\` /setup booth        \` - Deploy the primary multi-candidate interactive voting grid.\n\` /party add          \` - Enroll a candidate with name, emoji, banner, and owner assignment.\n\` /party remove       \` - Revoke a candidate asset profile via its unique Party ID (\`PTY-XXXX\`).\n\` /party list         \` - Securely dispatch the complete candidate ledger directly to your DMs.` 
                },
                {
                    name: 'Electoral Control & Analytics',
                    value: `\` /election open   \` - Authorize the system to accept incoming terminal ballots.\n\` /election close  \` - Freeze the intake pipeline and lock the ballot matrix.\n\` /election export \` - Decrypt and view final results (Requires closed election status. Sends victor DM notice).\n\` /election reset  \` - Purge all votes and registrations while preserving candidate configurations.`
                }
            )
            .setFooter({ text: 'Governer Build v1.1.0 • Production' });

        return interaction.reply({ embeds: [embed] });
    }
};