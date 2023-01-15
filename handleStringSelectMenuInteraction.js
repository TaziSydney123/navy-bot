const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("./helpers")

const MIN_INPUT_LENGTH = 2;
const MAX_INPUT_LENGTH = 150;

async function execute(interaction) {
  if (interaction.customId == "settingSelect") {
    if (interaction.values[0] == "shipOptions") {
      const modal = new ModalBuilder()
        .setCustomId('shipOptions')
        .setTitle('Ship Options');

      const shipOptionsInput = new TextInputBuilder()
        .setCustomId('shipOptionsInput')
        .setLabel("Put one ship name on each line - without USS")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(interaction.client.settings.get(interaction.guild.id, "shipOptions").join("\n"));

      const firstActionRow = new ActionRowBuilder().addComponents(shipOptionsInput);

      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    } else if (interaction.values[0] == "channels") {
      const modal = new ModalBuilder()
        .setCustomId('channels')
        .setTitle('Important Channels');
      
      const logbookChannelInput = new TextInputBuilder()
        .setCustomId('voyageLogbookChannelInput')
        .setLabel("The name of the logbook channel - without #")
        .setStyle(TextInputStyle.Short)
        .setValue(interaction.client.settings.get(interaction.guild.id, "voyageLogbookChannel"))
        .setMaxLength(MAX_INPUT_LENGTH)
        .setMinLength(MIN_INPUT_LENGTH);
      const botWarningChannelInput = new TextInputBuilder()
        .setCustomId('botWarningChannelInput')
        .setLabel("The channel for alerts by the bot")
        .setStyle(TextInputStyle.Short)
        .setValue(interaction.client.settings.get(interaction.guild.id, "botWarningChannel"))
        .setMaxLength(MAX_INPUT_LENGTH)
        .setMinLength(MIN_INPUT_LENGTH);
      
      let inputs = [logbookChannelInput, botWarningChannelInput]

      let actionRows = inputs.map(input => new ActionRowBuilder().addComponents(input));

      modal.addComponents(...actionRows);
      await interaction.showModal(modal);
    } else if (interaction.values[0] == "voyagePermissionsRole") {
      const modal = new ModalBuilder()
        .setCustomId('voyagePermissionsRole')
        .setTitle('Voyage Permissions Role Name');

      const roleInput = new TextInputBuilder()
        .setCustomId('voyagePermissionsRoleInput')
        .setLabel("The name of the voyage permissions role")
        .setStyle(TextInputStyle.Short)
        .setValue(interaction.client.settings.get(interaction.guild.id, "voyagePermissionsRole"))
        .setMaxLength(MAX_INPUT_LENGTH)
        .setMinLength(MIN_INPUT_LENGTH);
      
      const firstActionRow = new ActionRowBuilder().addComponents(roleInput);

      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    }
  }
}

module.exports = {
  execute: execute
};
