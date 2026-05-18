const { EmbedBuilder } = require('discord.js');

const NATIVE_DARK = 0x2b2d31; 
const ERROR_RED = 0xDA373C;
const SUCCESS_GREEN = 0x23A559;

module.exports = {
    baseEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(NATIVE_DARK)
            .setTitle(title)
            .setDescription(description);
    },

    successEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(SUCCESS_GREEN)
            .setTitle(title)
            .setDescription(description);
    },

    errorEmbed(description) {
        return new EmbedBuilder()
            .setColor(ERROR_RED)
            .setTitle('Authorization Failed')
            .setDescription(description);
    }
};