const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const logger = require("../logger");

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const subordinateDatabaseClass = require("../subordinatesDatabase.js").SubordinatesDB;

const modalColor = 0x0099FF;

const MAX_MEMBERS_BEFORE_NCO = 2;

const memberReportCommand = new SlashCommandBuilder()
  .setName('member_report')
  .setDescription('Make a full report on a member')
  .addMentionableOption(option =>
    option
      .setName('target')
      .setDescription('The member to get a report on')
      .setRequired(false));

async function getMemberReportEmbed(member, interaction, multipleIndex = null, lengthOfMultiple = null) {
    const timeInServer = helpers.millisecondsToDisplay((Date.now() - member.joinedTimestamp));
    let voyageStats = interaction.client.officialVoyageCountCache.get(member.guild.id, member.id);
    
  if (!voyageStats) {
      voyageStats = {
        totalOfficials: 0,
        weeklyOfficials: 0,
        lastOfficial: null,
        totalOfficialsLed: 0,
        weeklyOfficialsLed: 0,
        lastOfficialLed: null,
        
        hasLastOfficial: false,
        hasLastOfficialLed: false,
      };
    }
  
    const lastVoyage = voyageStats.hasLastOfficial ? helpers.millisecondsToDisplay(voyageStats.lastOfficial, true) : "None"
    const lastVoyageLed = voyageStats.hasLastOfficialLed ? helpers.millisecondsToDisplay(voyageStats.lastOfficialLed, true) : "None"
    const departments = await helpers.getDepartments(member);
    const subordinateDB = new subordinateDatabaseClass(interaction);
    const immediateSuperiorId = await subordinateDB.getSuperior(member.id);
    const subordinateList = subordinateDB.getAllSubordinatesOfSuperior(member.id);
    let nameChanges = interaction.client.nameUpdates.get(member.id);
    
    if (nameChanges) {
      nameChanges = nameChanges.map(update => "\"" + update.before + "\" to \"" + update.after + "\" (" + helpers.millisecondsToDisplay(Date.now() - update.date, true) + ")");
      nameChanges = helpers.getElementsUpToStringifiedLength(nameChanges.reverse(), 400);
    }
    
    let roleChanges = interaction.client.roleUpdates.get(member.id);
    
    if (roleChanges) {
      roleChanges = await Promise.all(roleChanges.map(async update => (
        update.change == "add" ? "Added " : "Removed ") +
        (!interaction.guild.roles.cache.get(update.role) ? "*Unknown Role*" : interaction.guild.roles.cache.get(update.role).name) +
        " (" +
        helpers.millisecondsToDisplay(Date.now() - update.date, true) +
        ")"));
      roleChanges = helpers.getElementsUpToStringifiedLength(roleChanges.reverse(), 400);
    }

    let fields = [
      { name: 'User ID', value: member.id },
      // { name: '\u200B', value: '\u200B' },
      { name: 'Time in server', value: timeInServer, inline: true },
      { name: 'Immediate CO', value: immediateSuperiorId ? userMention(immediateSuperiorId) : "No CO Found", inline: true },
      { name: 'SPD Departments', value: departments.length > 0 ? departments.join(", ") : "None", inline: true },
      { name: 'Last Ofcl. Voyage', value: lastVoyage, inline: true },
      { name: 'Weekly Ofcl. Voyages', value: voyageStats.weeklyOfficials.toString(), inline: true },
      { name: 'Total Ofcl. Voyages', value: voyageStats.totalOfficials.toString(), inline: true }
      // { name: 'Messages per Day', value: 'TODO' },
      // { name: 'Requirements for Next Promotion', value: 'TODO' },
      // { name: 'Available Awards', value: 'TODO' },
    ];
    if (helpers.memberHasRole(member, interaction.client.settings.get(interaction.guild.id, "voyagePermissionsRole"))) {
      fields.push(
        { name: 'Last Ofcl. Voyage Hosted', value: lastVoyageLed, inline: true },
        { name: 'Weekly Ofcl. Voyages Hosted', value: voyageStats.weeklyOfficialsLed.toString(), inline: true },
        { name: 'Total Ofcl. Voyages Hosted', value: voyageStats.totalOfficialsLed.toString(), inline: true }
      );
    }
    if (nameChanges) {
      fields.push(
        { name: 'Recent Name Changes', value: nameChanges.join("\n"), inline: false },
      );
    }
    if (roleChanges) {
      fields.push(
        { name: 'Recent Role Changes', value: roleChanges.join("\n"), inline: false },
      );
    }
    if (subordinateList.length > 0) {
      fields.push({
        name: 'Current Subordinates:',
        value: helpers.getMentionsFromIds(subordinateList).join(", "),
        inline: false
      });
    }
    
    // fields.push({
    //     name: 'Warning',
    //     value: 'We are still working on fixing some problems with the bot, so right now the total official voyages is not accurate',
    //     inline: false
    // });
    
    const memberEmbed = new EmbedBuilder()
      .setColor(modalColor)
      .setTitle(member.displayName)
      .setDescription(userMention(member.id))
      .setThumbnail(member.displayAvatarURL())
      .addFields(fields)
      .setTimestamp();

  if (multipleIndex) {
    memberEmbed.setFooter({ text: `${parseInt(multipleIndex) + 1} of ${lengthOfMultiple}` })
  }

  return memberEmbed;
}

module.exports = {
  data: memberReportCommand,
  async execute(interaction) {
    // TODO: (ancientbison) Get defer to work.
    await interaction.deferReply({ ephemeral: false });

    let members = [];

    let multiple = false;

    try {
      if (interaction.options.getMentionable("target")) {
        if (interaction.options.getMentionable("target").members) {
          if (interaction.options.getMentionable("target").members.size == 0) {
            interaction.followUp("There are no members in that role.");
            return;
          } else if (interaction.options.getMentionable("target").members.size >= MAX_MEMBERS_BEFORE_NCO && !interaction.member.permissions.has(PermissionFlagsBits.CreatePrivateThreads)) {
            interaction.followUp("Currently only NCO and up can run this command (this is subject to change)")
            return;
          }
          // if (interaction.options.getMentionable("target").members.length > interaction.client.settings.get("maximumMentionedMemberReport")) {
            
          // }
          
          members = Array.from(interaction.options.getMentionable("target").members.values());

          multiple = true;
        } else {
          members.push(await interaction.guild.members.fetch(interaction.options.getMentionable("target").id));
        }
      } else {
        members.push(interaction.member);
      }
    } catch {
      interaction.followUp(interaction.options.getMentionable("target") + " does not exist in the server");
      return;
    }

    for (index in members) {
      if (multiple) {
        await interaction.followUp({ embeds: [await getMemberReportEmbed(members[index], interaction, index, members.length)] });
      } else {
        await interaction.followUp({ embeds: [await getMemberReportEmbed(members[index], interaction)] });
      }
    }
  }    
}
