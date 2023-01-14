const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("./helpers");

const logger = require("./logger");

async function execute(interaction) {
  if (interaction.customId.startsWith("showSubordinateIdsButton-")) {
    const subordinates = interaction.customId.replace("showSubordinateIdsButton-", "").split(";");
    await interaction.followUp({ephemeral: true, content: subordinates.join("\n")})
  }
}

module.exports = {
  execute: execute
};