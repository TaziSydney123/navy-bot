const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const logger = require("../logger");

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const subordinateDatabaseClass = require("../subordinatesDatabase.js").SubordinatesDB;

const memberReportCommand = new SlashCommandBuilder()
  .setName('member_report')
  .setDescription('Make a full report on a member')
  .addUserOption(option =>
    option
      .setName('member')
      .setDescription('The member to get a report on')
      .setRequired(false))

module.exports = {
  data: memberReportCommand,
  async execute(interaction) {
    // TODO: (ancientbison) Get defer to work.
    await interaction.deferReply({ ephemeral: false });

    let member = null;

    if (interaction.options.getUser("member")) {
      member = await interaction.guild.members.fetch(interaction.options.getUser("member").id);
    } else {
      member = interaction.member;
    }

    const timeInServer = helpers.millisecondsToDisplay((Date.now() - member.joinedTimestamp));
    const logbookChannel = await helpers.getChannel(interaction.guild, interaction.client.settings.get(interaction.guild.id, "voyageLogbookChannel"))
    const voyageStats = await helpers.countOfficialVoyages(logbookChannel, member)
    const lastVoyage = voyageStats.hasLastOfficial ? helpers.millisecondsToDisplay(voyageStats.lastOfficial.getTime(), true) : "None"
    const lastVoyageLead = voyageStats.hasLastOfficialLead ? helpers.millisecondsToDisplay(voyageStats.lastOfficialLead.getTime(), true) : "None"
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
      roleChanges = await Promise.all(roleChanges.map(async update => (update.change == "add" ? "Added role " : "Removed role ") +
        (!interaction.guild.roles.cache.get(update.role) ? "*Unknown Role*" : interaction.guild.roles.cache.get(update.role).name) +
        (update.change == "add" ? " to " : " from ") +
        (await interaction.guild.members.fetch(update.memberId)).displayName +
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
        { name: 'Last Ofcl. Voyage Hosted', value: lastVoyageLead, inline: true },
        { name: 'Weekly Ofcl. Voyages Hosted', value: voyageStats.weeklyOfficialsLead.toString(), inline: true },
        { name: 'Total Ofcl. Voyages Hosted', value: voyageStats.totalOfficialsLead.toString(), inline: true }
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
        value: (await helpers.getMentionsFromIds(subordinateList, interaction.guild)).join(", "),
        inline: false
      });
    }
    fields.push({
        name: 'Warning',
        value: 'We are still working on fixing some problems with the bot, so right now the total official voyages is not accurate',
        inline: false
    });
    const memberEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(member.displayName)
      .setDescription(userMention(member.id))
      .setThumbnail(member.displayAvatarURL())
      .addFields(fields)
      .setTimestamp();

    await interaction.followUp({ embeds: [memberEmbed] });
  }
}