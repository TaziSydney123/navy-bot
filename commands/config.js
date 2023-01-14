const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const configCommand = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuration settings for the bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports = {
  data: configCommand, 
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const selectSettingRow = new ActionRowBuilder()
      .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('settingSelect')
        .setPlaceholder('Select a setting')
        .addOptions(
          {
            label: 'Ship Options',
            value: 'shipOptions',
          },
          {
            label: 'Channels',
            value: 'channels',
          },
          {
            label: 'Voyage Permissions Role',
            value: 'voyagePermissionsRole',
          },
        ),
    );
  
    await interaction.followUp({
      content: bold(underscore("Bot Configuration")) + "\n" +
        "Ship Options: " + "Set the ship options for the /check_squads command\n" +
        "Channels: " + "Set the important channels for the bot, such as the voyage logbook channel\n" +
        "Voyage Permissions Role: " + "Set the name of the role used to indicate voyage permissions",
      components: [selectSettingRow]
    });
  }
}