const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const logger = require("../logger")

const forceCacheCommand = new SlashCommandBuilder()
  .setName('update_officials')
  .setDescription('Force an update of the official voyage counts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports = {
  data: forceCacheCommand, 
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const cachedOfficials = await helpers.cacheAllOfficialVoyageCounts(await helpers.getChannel(interaction.guild, client.settings.get(interaction.guild.id, "voyageLogbookChannel")));
    await interaction.followUp(cachedOfficials ? "Successfully updated official voyage counts" : {ephemeral: true, content: "Failed to update official voyage counts"})
  }
}
