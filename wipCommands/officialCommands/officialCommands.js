// const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

// const Enmap = require('enmap');

// const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

// const { underscore, bold, italic } = require("discord.js");

// const officialCommands = require("../../officialCommandHelpers")


// const subordinatesCommand = new SlashCommandBuilder()
//   .setName('official')
//   .setDescription('Configure your or someone else\'s subordinates')
//   .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
//   .addSubcommand(subcommand =>
//     subcommand
//       .setName("new")
//       .setDescription("Creates a new official voyage"))
//   // .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages); this needs to be set for people with "Voyage Permissions" role.


// module.exports = {
//   data: newOfficial, 
//   async execute() {
//     // const subordinateDB = new SubordinateDBClass(interaction);

//     if (interaction.options.getSubcommand() === "set") {

//       await interaction.showModal(modal);
//     } else if (interaction.options.getSubcommand() === "clear") {
//       const targetMember = await interaction.guild.members.fetch(interaction.options.getUser("member").id);
//       let clearedMemberIds = subordinateDB.clearSubordinates(targetMember.id);
//       let clearedMemberUsernames = await helpers.getUsernamesFromIds(clearedMemberIds, interaction.guild);
//       await interaction.reply(clearedMemberUsernames.length > 0 ? `The following members no longer have a set CO:\n${clearedMemberUsernames.join("\n")}` : "No subordinates found for that member");
//     } else if (interaction.options.getSubcommand() === "set_acting") {
//       const modal = new ModalBuilder()
//         .setCustomId('setActing')
//         .setTitle('Set Acting Member');

//       const nameInput = new TextInputBuilder()
//         .setRequired(true)
//         .setCustomId('nameInput')
//         .setLabel("The member to take over your subordinates")
//         .setStyle(TextInputStyle.Short);

//       const firstActionRow = new ActionRowBuilder().addComponents(nameInput);

//       modal.addComponents(firstActionRow);

//       await interaction.showModal(modal);
//     } else if (interaction.options.getSubcommand() === "reclaim") {
//       const subordinateDB = new SubordinateDBClass(interaction);
//       subordinateDB.reclaimSubordinates(interaction.member.id);
//       interaction.reply("Successfully reclaimed subordinates.");
//     }
//   }
// }