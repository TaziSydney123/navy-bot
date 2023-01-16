const logger = require("../logger")

const { parsed, error } = require('dotenv').config({
  path: './process.env'
});

if (error) {
  throw error;
}

const { SlashCommandBuilder, PermissionFlagsBits, chatInputApplicationCommandMention } = require('discord.js');

const Enmap = require('enmap');

const SubordinateDBClass = require("../subordinatesDatabase").SubordinatesDB;
  
const { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');

const helpers = require("../helpers")

const getSubordinatesReclaimMessage = (personal = true, setActing = false) => {
  return setActing ?
    `You may not set someone as acting for ${personal ? "yourself" : "someone"} while someone is acting for you already. First run ${chatInputApplicationCommandMention("subordinates reclaim", parsed.SUBORDINATE_COMMAND_SUITE_ID)}.`
    : `You may not modify ${personal ? "your" : "someones"} subordinates while someone is acting for you. First run ${chatInputApplicationCommandMention("subordinates reclaim", parsed.SUBORDINATE_COMMAND_SUITE_ID)}.`;
}

const subordinatesCommand = new SlashCommandBuilder()
  .setName('subordinates')
  .setDescription('Configure your or someone else\'s subordinates')
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads)
  .addSubcommand(subcommand =>
    subcommand
      .setName("set")
      .setDescription("Sets your current subordinates")
      // .addUserOption(option =>
      //   option
      //     .setName('run_for')
      //     .setDescription('The member to run this command on the behalf of')
      //     .setRequired(false))
    )
  .addSubcommand(subcommand =>
    subcommand
      .setName("transfer")
      .setDescription("Permanently transfers your current subordinates to another member")
      .addUserOption(option =>
        option
          .setName('member')
          .setDescription('The member to transfer subordinates to')
          .setRequired(true))
      .addUserOption(option =>
        option
          .setName('run_for')
          .setDescription('The member to run this command on the behalf of')
          .setRequired(false)))
  .addSubcommand(subcommand =>
    subcommand
      .setName("set_acting")
      .setDescription("Temporarily gives a user your subordinates")
      .addUserOption(option =>
        option
          .setName('acting')
          .setDescription('The member to give subordinates to temporarily')
          .setRequired(true))
      .addUserOption(option =>
        option
          .setName('run_for')
          .setDescription('The member to run this command on the behalf of')
          .setRequired(false)))
  .addSubcommand(subcommand =>
    subcommand
      .setName("reclaim")
      .setDescription("Reclaims your subordinates after setting an acting member")
      .addUserOption(option =>
        option
          .setName('run_for')
          .setDescription('The member to run this command on the behalf of')
          .setRequired(false)))
  .addSubcommand(subcommand =>
    subcommand
      .setName("clear")
      .setDescription("Clears your current subordinates")
      .addUserOption(option =>
        option
          .setName('member')
          .setDescription('The member to clear subordinates from')
          .setRequired(true)));


module.exports = {
  data: subordinatesCommand,
  async execute(interaction) {
    const subordinateDB = new SubordinateDBClass(interaction);

    if (interaction.options.getSubcommand() === "set") {
      const actingSuperior = subordinateDB.getActingFor(interaction.member.id);
      if (subordinateDB.memberHasActingSuperior(interaction.member.id) && !actingSuperior) {
        await interaction.reply({ ephemeral: true, content: getSubordinatesReclaimMessage() });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId(`setSubordinates-${actingSuperior ? actingSuperior : interaction.member.id}`)
        .setTitle(!actingSuperior ? 'Your Subordinates' : (await interaction.guild.members.fetch(actingSuperior)).displayName + "\'s Subordinates");

      let currentSubordinates = !actingSuperior ? subordinateDB.getNonActingSubordinatesOfSuperior(interaction.member.id) : subordinateDB.getNonActingSubordinatesOfSuperior(actingSuperior);
      let currentSubordinatesNames = [];
      try {
        currentSubordinatesNames = await helpers.getUsernamesFromIds(currentSubordinates, interaction.guild);
      } catch (e) {
        currentSubordinatesNames = [];
      }

      const subordinatesInput = new TextInputBuilder()
        .setRequired(false)
        .setCustomId('subordinatesInput')
        .setLabel("Put one member's name on each line")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(currentSubordinates.length > 0 ? helpers.combineTwoArraysOfSameLengthIntoStringsWithSeparator(currentSubordinatesNames, currentSubordinates, " -- ").join("\n") : "");

      const firstActionRow = new ActionRowBuilder().addComponents(subordinatesInput);

      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    } else if (interaction.options.getSubcommand() === "clear") {
      if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const targetMember = await interaction.guild.members.fetch(interaction.options.getUser("member").id);
        subordinateDB.reclaimSubordinates(targetMember.id);
        let clearedMemberIds = subordinateDB.clearSubordinates(targetMember.id);
        let clearedMemberUsernames = await helpers.getUsernamesFromIds(clearedMemberIds, interaction.guild);
        await interaction.reply(clearedMemberUsernames.length > 0 ?
          `The following members no longer have a set CO:\n${clearedMemberUsernames.join("\n")}` : 
          {ephemeral: true, content: "No subordinates found for that member"}
        );
      } else {
        await interaction.reply({ ephemeral: true, content: "You do not have permission to use that command!" });
      }
    } else if (interaction.options.getSubcommand() === "set_acting") {
      const runForMember = interaction.options.getUser("run_for");
      const targetMember = interaction.options.getUser("acting");
      if (runForMember) {
        const runForMemberName = (await interaction.guild.members.fetch(runForMember.id)).displayName;
        if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const set_acting = subordinateDB.setActingSuperior(runForMember.id, targetMember.id);
          let info;
          if (set_acting.info) {
            info = (await interaction.guild.members.fetch(set_acting.info));
          }
          if (set_acting.success) {
            await interaction.reply(`Successfully set ${(await interaction.guild.members.fetch(targetMember.id)).displayName} as acting for ` + runForMemberName);
          } else if (set_acting.error === "set_to_self") {
            await interaction.reply({ ephemeral: true, content: "You may not set someone as acting for themselves" });
          } else if (set_acting.error === "member_taken") {
            await interaction.reply({ ephemeral: true, content: `The member you tried to set as acting is already acting for ${info.displayName} and has not been set` });
          } else if (set_acting.error === "already_set") {
            await interaction.reply({ ephemeral: true, content: getSubordinatesReclaimMessage(false, true) });
          }
        } else {
          await interaction.reply({ ephemeral: true, content: "You do not have permission to use that command for someone else!" });
        }
      } else {
        const set_acting = subordinateDB.setActingSuperior(interaction.user.id, targetMember.id);
        let info;
        if (set_acting.info) {
          info = (await interaction.guild.members.fetch(set_acting.info));
        }
        if (set_acting.success) {
          await interaction.reply(`Successfully set ${(await interaction.guild.members.fetch(targetMember.id)).displayName} as acting for you`);
        } else if (set_acting.error === "set_to_self") {
          await interaction.reply({ephemeral: true, content: `You may not set yourself as acting for yourself`});
        } else if (set_acting.error === "member_taken") {
          await interaction.reply({ephemeral: true, content: `That member is already acting for ${info.displayName} and has not been set`});
        } else if (set_acting.error === "already_set") {
          await interaction.reply({ ephemeral: true, content: getSubordinatesReclaimMessage(true, true) });
        }
      }
    } else if (interaction.options.getSubcommand() === "reclaim") {
      const runForMember = interaction.options.getUser("run_for");
      if (runForMember) {
        if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const reclaimed = subordinateDB.reclaimSubordinates(runForMember.id);
          interaction.reply(reclaimed ?
            "Successfully reclaimed subordinates" :
            {ephemeral: true, content: "That person has no one acting for them"}
          );
        } else {
          await interaction.reply({ephemeral: true, content: "You do not have permission to use that command for someone else!"})
        }
      } else {
        const reclaimed = subordinateDB.reclaimSubordinates(interaction.member.id);
        interaction.reply(reclaimed ?
          "Successfully reclaimed subordinates" :
          {ephemeral: true, content: "You have not set anyone as acting. Use " + chatInputApplicationCommandMention("subordinates set_acting", parsed.SUBORDINATE_COMMAND_SUITE_ID) + " first."}
        );
      }
    } else if (interaction.options.getSubcommand() === "transfer") {
      const actingSuperior = subordinateDB.getActingFor(interaction.member.id);
      const runForMember = interaction.options.getUser("run_for");
      const targetMember = interaction.options.getUser("member");
      if (runForMember) {
        if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          if (subordinateDB.memberHasActingSuperior(runForMember.id)) {
            await interaction.reply({ ephemeral: true, content: getSubordinatesReclaimMessage() });
            return;
          }
          let result = subordinateDB.transferSubordinates(runForMember.id, targetMember.id);
          if (result.success) {
            await interaction.reply("Successfully transferred subordinates");
          } else {
            if (result.reason == "no_subordinates") {
              await interaction.reply({ephemeral: true, content: "That user does not have any subordinates"});
            }
          }
        } else {
          await interaction.reply({ephemeral: true, content: "You do not have permission to use that command for someone else!"})
        }
      } else {
        if (subordinateDB.memberHasActingSuperior(interaction.member.id)) {
          await interaction.reply({ ephemeral: true, content: getSubordinatesReclaimMessage() });
          return;
        }
        let result = subordinateDB.transferSubordinates(interaction.member.id, targetMember.id);
        if (result.success) {
          await interaction.reply("Successfully transferred subordinates");
        } else {
          if (result.reason == "no_subordinates") {
            await interaction.reply({ephemeral: true, content: "You do not have any subordinates"});
          }
        }
      }
    }
  }
}
