const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const logger = require("../logger")

const checkSquadsCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Pongs!')
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('The message to pong with')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

module.exports = {
  data: checkSquadsCommand, 
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    await interaction.followUp(interaction.options.getString("message") ? interaction.options.getString("message") : "Pong!");
  }
}