const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const subordinateDatabaseClass = require("../subordinatesDatabase.js").SubordinatesDB;

const toggleLOACommand = new SlashCommandBuilder()
  .setName('toggle_loa')
  .setDescription('Switch if someone is on LOA')
  .addUserOption(option =>
    option
      .setName('member')
      .setDescription('The member to switch')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

module.exports = {
  data: toggleLOACommand,
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let member = null;
    if (interaction.options.getUser("member")) {
      member = await interaction.guild.members.fetch(interaction.options.getUser("member").id);
    } else {
      member = interaction.member;
    }

    if(member.displayName.match(/^ *\[ *LOA\ *] */gm)) {
      member.setNickname(member.displayName.replace(/ *\[ *LOA\ *] */gm, ''));
    } else {
      member.setNickname('[LOA] ' + member.displayName);
    }
  }
}