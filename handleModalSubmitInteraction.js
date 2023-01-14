const { SlashCommandBuilder, PermissionFlagsBits, userMention, chatInputApplicationCommandMention } = require('discord.js');

const subordinateDBClass = require("./subordinatesDatabase").SubordinatesDB;

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("./helpers")

const logger = require("./logger")

const SUBORDINATE_COMMAND_SUITE_ID = process.env.SUBORDINATE_COMMAND_SUITE_ID;

const getSubordinatesReclaimMessage = (personal = true, setActing = false) => {
  return setActing ?
    `You may not set someone as acting for ${personal ? "yourself" : "someone"} while someone is acting for you already. First run ${chatInputApplicationCommandMention("subordinates reclaim", SUBORDINATE_COMMAND_SUITE_ID)}.`
    : `You may not modify ${personal ? "your" : "someones"} subordinates while someone is acting for you. First run ${chatInputApplicationCommandMention("subordinates reclaim", SUBORDINATE_COMMAND_SUITE_ID)}.`;
}

async function execute(interaction) {
  if (interaction.customId == "shipOptions") {
    interaction.client.settings.set(interaction.guild.id, interaction.fields.getTextInputValue('shipOptionsInput').split("\n"), "shipOptions");
    await interaction.reply("Successfully changed ship options");
  } else if (interaction.customId == "channels") {
    for (let component of interaction.components.map(component => component.components[0])) {
      interaction.client.settings.set(interaction.guild.id, component.value, component.customId.replace("Input", ""));
    }
    
    await interaction.reply("Successfully set channel names");
  } else if (interaction.customId.startsWith("setSubordinates")) {
    await interaction.deferReply({ ephemeral: false });
    const settingTo = interaction.customId.replace("setSubordinates-", "");
    let subordinateDB = new subordinateDBClass(interaction);

    
    
    let setSubordinates = await subordinateDB.setSubordinatesToSuperior(settingTo, interaction.fields.getTextInputValue('subordinatesInput').split("\n"));

    if (setSubordinates.nullIds.length + setSubordinates.takenIds.length == 0) {
      await interaction.followUp("Successfully set subordinates");
    } else {
      await interaction.followUp("**Successfully set subordinates with warning(s):**\n" +
        (setSubordinates.nullIds.length > 0 ? ("The following members could not be found so their CO has not been set:\n" + setSubordinates.nullIds.join("\n")) : "") +
        (setSubordinates.nullIds.length > 0 ? "\n" : "") +
        (setSubordinates.takenIds.length > 0 ? ("The following members already had a CO and have not been set:\n" + setSubordinates.takenIds.join("\n")) : ""))
    }
  } else if (interaction.customId == "voyagePermissionsRole") {
    interaction.client.settings.set(interaction.guild.id, interaction.fields.getTextInputValue('voyagePermissionsRoleInput'), "voyagePermissionsRole");
    await interaction.reply("Successfully set the voyage permissions role name");
  }
}

module.exports = {
  execute: execute
};