const { SlashCommandBuilder, PermissionFlagsBits, userMention, chatInputApplicationCommandMention } = require('discord.js');

const subordinateDBClass = require("./subordinatesDatabase").SubordinatesDB;

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("./helpers")

const logger = require("./logger")

async function execute(interaction) {
  if (interaction.customId == "shipOptions") {
    interaction.client.settings.set(interaction.guild.id, interaction.fields.getTextInputValue('shipOptionsInput').split("\n"), "shipOptions");
    await interaction.reply("Successfully changed ship options");
  } else if (interaction.customId == "channels") {
    let nullChannels = [];
    
    for (let component of interaction.components.map(component => component.components[0])) {
      interaction.client.settings.set(interaction.guild.id, component.value, component.customId.replace("Input", ""));
      
      if (!(await helpers.getChannel(interaction.guild, component.value))) {
        nullChannels.push(component.value);
        logger.debug("null channel")
      }
    }

    logger.debug(nullChannels);


    
    if (nullChannels.length == 0) {
      await interaction.reply("Successfully set channels");
    } else {
      await interaction.reply("**Successfully set channels with warning(s):**\n" +
        (nullChannels.length > 0 ? ("The following channel(s) could not be found:\n" + nullChannels.join("\n")) : ""));
    }
  } else if (interaction.customId.startsWith("setSubordinates")) {
    await interaction.deferReply({ ephemeral: false });
    const settingTo = interaction.customId.replace("setSubordinates-", "");
    let subordinateDB = new subordinateDBClass(interaction);

    
    
    let setSubordinates = await subordinateDB.setSubordinatesToSuperior(settingTo, interaction.fields.getTextInputValue('subordinatesInput').split("\n"));

    if (setSubordinates.nullIds.length + setSubordinates.takenIds.length == 0) {
      await interaction.followUp("Successfully set subordinates");
    } else {
      await interaction.followUp("**Successfully set subordinates with warning(s):**\n" +
        (setSubordinates.nullIds.length > 0 ? ("The following member(s) could not be found so their CO has not been set:\n" + setSubordinates.nullIds.join("\n")) : "") +
        (setSubordinates.nullIds.length > 0 ? "\n" : "") +
        (setSubordinates.takenIds.length > 0 ? ("The following member(s) already had a CO and have not been set:\n" + setSubordinates.takenIds.join("\n")) : ""))
    }
  } else if (interaction.customId == "voyagePermissionsRole") {
    interaction.client.settings.set(interaction.guild.id, interaction.fields.getTextInputValue('voyagePermissionsRoleInput'), "voyagePermissionsRole");
    await interaction.reply("Successfully set the voyage permissions role name");
  }
}

module.exports = {
  execute: execute
};
