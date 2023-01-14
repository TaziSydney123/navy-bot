const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const helpers = require("../helpers")

const logger = require("../logger")

const checkSquadsCommand = new SlashCommandBuilder()
  .setName('check_squads')
  .setDescription('Checks that all JE are in a squad')
  .addStringOption(option =>
    option
      .setName('ship')
      .setDescription('The ship to check - leave blank for any ship or no ship')
      .setRequired(false)
      .setAutocomplete(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

module.exports = {
  data: checkSquadsCommand, 
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (interaction.options.getString("ship")) {
      if (!helpers.roleExists(interaction, interaction.options.getString("ship"))) {
        interaction.followUp({ephemeral: true, content: "Could not find a ship with that name"});
        return;
      }
    }

    let members = await interaction.guild.members.fetch();

    let usersNotInSquads = [];
    for (let member of members.values()) {
      let name = member.displayName;

      let userId = member.id;

      let rolesOfUser = member.roles.cache.map(role => role.name);
      if (name.includes("Seaman") && !name.includes("Seaman Recruit")) {
        let userInSquad = false;
        if (helpers.arrayContainsRegex(rolesOfUser, /Squad$/g)) {
          userInSquad = true;
        }

        if (!userInSquad) {
          let userOnShip = false;

          for (let roleOfUser of rolesOfUser) {

            if (roleOfUser.match(/^USS/g)) {
              const ship = roleOfUser.replace("USS ", "").toLowerCase();

              if (ship.toString() === interaction.options.getString("ship") || !interaction.options.getString("ship")) {
                userOnShip = true;
              };
            }
          }

          if (userOnShip) {
            usersNotInSquads.push(userId);
          }
        }
      }
    }

    if (usersNotInSquads.length != 0) {
      await interaction.followUp(bold(underscore("Users who do not have a squad")) + "\n"
        + usersNotInSquads.map(userId => userMention(userId)).join("\n"));
    } else {
      await interaction.followUp(bold("All users are in sqauds!"));
    }
  }, 
  async autocomplete(interaction) {
    let choices = [];
    
    for (let ship of interaction.client.settings.get(interaction.guild.id, "shipOptions")) {
      choices.push({ name: ship, value: ship.toLowerCase() });
    }

    interaction.respond(choices);
  }
}