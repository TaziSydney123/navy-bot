const logger = require("./logger");

const { parsed, error } = require('dotenv').config({
  path: './process.env'
});

if (error) {
  throw error;
}

const { REST, Routes } = require('discord.js');

const { SlashCommandBuilder, PermissionFlagsBits, userMention } = require('discord.js');

const Enmap = require('enmap');

const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Events, TextInputBuilder, TextInputStyle, ModalBuilder, StringSelectMenuBuilder } = require('discord.js');

const { underscore, bold, italic } = require("discord.js");

const SubordinateDBClass = require("./subordinatesDatabase").SubordinatesDB;

const { Collection } = require("discord.js");

const helpers = require("./helpers.js")

const glob = require("glob");

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages], partials: [Partials.GUILD_MEMBER] });

const oneMonthMilliseconds = 1000 * 60 * 60 * 24 * 30;

// Prevent the bot from being rate limited and not starting -- DO NOT DELETE --
require("./replit.fix.js").fixReplBug(client);

client.settings = new Enmap({
  name: "settings",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  autoEnsure: {
    shipOptions: [
      'Albatross',
      'Constitution',
      'Thunderbolt',
      'Kearsarge',
      'Tennessee',
    ],
    voyageLogbookChannel: "official-voyage-logbook",
    voyagePermissionsRole: "Voyage Permissions",
    botWarningChannel: "bot-alerts"
  }
});

client.subordinates = new Enmap({
  name: "subordinates",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

client.actingSuperiors = new Enmap({
  name: "actingSuperiors",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

client.officials = new Enmap({
  name: "officials",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

client.nameUpdates = new Enmap({
  name: "nameUpdates",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

client.roleUpdates = new Enmap({
  name: "roleUpdates",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

client.officialVoyageCountCache = new Enmap({
  name: "officialVoyageCountCache",
  fetchAll: true,
  autoFetch: true,
  cloneLevel: 'deep',
  ensureProps: true,
});

let commands = [];

client.on(Events.ClientReady, (client) => {
  logger.info(`Logged in as ${client.user.tag}!`);

  const rest = new REST({ version: '10' }).setToken(parsed.TOKEN);

  client.commands = new Collection();

  // const commandsPath = path.join(__dirname, 'commands');
  // const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  var getDirectories = function(callback) {
    glob("./commands" + '/**/*.js', callback);
  };

  getDirectories(function(err, res) {
    if (err) {
      console.error('Error', err);
    } else {
      for (filePath of res) {

        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
          logger.info("Added command " + JSON.stringify(command.data.name));
        } else {
          console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
      }

      (async () => {
        try {
          logger.info(`Started refreshing ${commands.length} application (/) commands.`);

          // The put method is used to fully refresh all commands in the guild with the current set
          const data = await rest.put(
            Routes.applicationCommands(parsed.CLIENT_ID),
            { body: commands },
          );

          logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
          // And of course, make sure you catch and log any errors!
          console.error(error);
        }
      })();
    }
  });
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (member.id == client.id) {
    return;
  }
  
  logger.warn("Member left the server with ID: " + member.id);

  const subordinateDB = new SubordinateDBClass({ "guild": member.guild, "client": client });
  const superior = await subordinateDB.getSuperior(member.id);
  
  // Remove the member from all subordinates lists
  subordinateDB.removeSubordinateReference(member.id);

  // If they were acting for someone, make that person reclaim
  const actingFor = subordinateDB.getActingFor(member.id);
  
  if (actingFor) {
    subordinateDB.reclaimSubordinates(actingFor);
  }

  // If they had subordinates, clear them. If they had someone acting for them, reclaim and clear subordinates
  const reclaimedFromActing = subordinateDB.reclaimSubordinates(member.id);
  const clearedSubordinates = subordinateDB.clearSubordinates(member.id);

  const clearedSubordinatesNames = await helpers.getUsernamesFromIds(clearedSubordinates, member.guild);
  const clearedSubordinatesDisplay = helpers.combineTwoArraysOfSameLengthIntoStringsWithSeparator(clearedSubordinatesNames, clearedSubordinates, " -- "); 

  // Send an alert that the person left if they had subordinates or were acting 
  // logger.debug(client.settings);
  const channelName = client.settings.get(member.guild.id, "botWarningChannel");
  logger.debug(channelName)
  const channel = await helpers.getChannel(member.guild, channelName);
  
  if (channel && (clearedSubordinates.length > 0 || actingFor)) {
    await channel.send(
`-------------------------\n${userMention(member.id)} **has left the server!**
${(superior ? "CO: " + userMention(superior) + "\n" : "")}${((actingFor && actingFor != superior) ? "Acting For: " + userMention(actingFor) : "")}${(clearedSubordinates.length > 0 ? "**Subordinate IDs:**\n" + clearedSubordinatesDisplay.join("\n"): "")}` 
    )
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (oldMember.displayName != newMember.displayName) {
    client.nameUpdates.ensure(newMember.id, []);
    let oldNameUpdates = client.nameUpdates.get(newMember.id);
    oldNameUpdates = oldNameUpdates.filter(update => Date.now() - update.date <= (oneMonthMilliseconds));
    oldNameUpdates.push({ before: oldMember.displayName, after: newMember.displayName, date: Date.now() });
    client.nameUpdates.set(newMember.id, oldNameUpdates);
  }
  
  if (helpers.getAllRolesOfMember(oldMember).map(role => role.id).join("") != (helpers.getAllRolesOfMember(newMember).map(role => role.id).join(""))) {
    client.roleUpdates.ensure(newMember.id, []);
    let oldRoleUpdates = client.roleUpdates.get(newMember.id);
    oldRoleUpdates = oldRoleUpdates.filter(update => Date.now() - update.date <= (oneMonthMilliseconds));

    const roleChange = helpers.getElementAddedOrRemovedFromTwoArrays(helpers.getAllRolesOfMember(oldMember).map(role => role.id), helpers.getAllRolesOfMember(newMember).map(role => role.id))
    
    oldRoleUpdates.push({ role: roleChange.element, change: roleChange.change, memberId: newMember.id, date: Date.now() });
    client.roleUpdates.set(newMember.id, oldRoleUpdates);
  }
});

// client.on('interactionCreate', async interaction => {
//   if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

//   if (interaction.isAutocomplete()) {
//     let choices = [];

//     for (ship of client.settings.get(interaction.guild.id, "shipOptions")) {
//       choices.push({ name: ship, value: ship.toLowerCase() });
//     }

//     interaction.respond(require("./autocompletions/autocompleteForShips").getAutocompleteShipsForInteraction(interaction));

//     return; 
//   }

//   const command = interaction.client.commands.get(interaction.commandName);

// 	if (!command) {
// 		console.error(`No command matching ${interaction.commandName} was found.`);
// 		return;
// 	}

// 	try {
// 		await command.execute(interaction);
// 	} catch (error) {
// 		console.error(error);
// 		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
// 	}
// });

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    await require("./handleStringSelectMenuInteraction").execute(interaction);
  } else if (interaction.isModalSubmit()) {
    await require("./handleModalSubmitInteraction").execute(interaction);
  } else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(error);
    }
  }

  if (interaction.isButton()) {
    require("./handleButtonPress").execute(interaction);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (await helpers.getChannel(message.guild, client.settings.get(message.guild.id, "voyageLogbookChannel"))) {
    if (message.channel.name.includes(client.settings.get(message.guild.id, "voyageLogbookChannel"))) {
      await helpers.cacheAllOfficialVoyageCounts(await helpers.getChannel(message.guild, client.settings.get(message.guild.id, "voyageLogbookChannel")));
    }
  }
});

function loginBot() {
  logger.info("Signing in.")
  client.login(parsed.TOKEN);
}

module.exports = {
  client: client,
  loginBot: loginBot
}
