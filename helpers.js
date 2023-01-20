const { userMention } = require('discord.js');
const logger = require("./logger");

const humanizeDuration = require("humanize-duration");

function getAllRoles(interaction) {
  const roles = interaction.guild.roles.cache.map(role => role);

  return roles;
}

function getAllRolesOfMember(member) {
  const roles = member.roles.cache.map(role => role);

  return roles;
}

function memberHasRole(member, role) {
  const roles = getAllRolesOfMember(member);
  if (roles.map(role => role.name).includes(role)) {
    return true;
  }
}


function roleExists(interaction, targetRole) {
  const roles = getAllRoles(interaction);

  for (role of roles) {
    if (role.name.toLowerCase().includes(targetRole)) {
      return true;
    }
  }
}

async function memberIdExists(guild, targetMemberId) {
  const members = await guild.members.fetch();
  for (let member of members.values()) {
    if (member.id == targetMemberId) {
      return true;
    }
  }
  return false;
}

async function getMemberFromUsername(guild, targetMember) {
  let members = await guild.members.fetch();

  for (let member of members.values()) {
    let name = member.displayName;
    if ((name.toLowerCase().endsWith(targetMember.toLowerCase())) || (userMention(member.id).toString() === targetMember)) {
      return member;
    }
  }
  
  return null;
}

function millisecondsToDisplay(ms, relative = false) {
  const durationDisplay = humanizeDuration(ms, { 
    largest: 2,
    round: true
  }); 
          
  if (ms < 1000) {
    return "Just Now";
  } else {
    return durationDisplay + (relative ? " ago" : "");
  }
}

async function getChannel(guild, name) {
  let channels = await guild.channels.fetch();
  for (let channel of channels.values()) {
    if (channel.name.includes(name)) {
      return channel;
    }
  }
}

async function cacheAllOfficialVoyageCounts(channel) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let lastMessageId
    
  if (!channel) {
    return;
  }

  let userVoyageStats = {};
  
  while (true) {
    const options = { limit: 100 };
    
    if (lastMessageId) {
      options.before = lastMessageId;
    }
    
    const messages = await channel.messages.fetch(options);
    if (!messages.size > 0) {
      break;
    }

    for (let data of messages.map(message => ({pingedMembers: message.mentions.members, message: message}))) {
      for (let pingedMember of data.pingedMembers) {
        pingedMember = pingedMember[0];
        if (userVoyageStats[pingedMember]) {
          const currentVoyageStats = userVoyageStats[pingedMember];
          userVoyageStats[pingedMember] = {
           totalOfficials: currentVoyageStats.totalOfficials + 1,
           weeklyOfficials: data.message.createdTimestamp >= thirtyDaysAgo ? currentVoyageStats.weeklyOfficials + 0.25 : currentVoyageStats.weeklyOfficials,
           lastOfficial: currentVoyageStats.lastOfficial,
           totalOfficialsLed: (data.message.author.id == pingedMember ? (currentVoyageStats.totalOfficialsLed + 1) : currentVoyageStats.totalOfficialsLed),
           weeklyOfficialsLed: data.message.createdTimestamp >= thirtyDaysAgo ? (data.message.author.id == pingedMember ? (currentVoyageStats.weeklyOfficialsLed + 0.25) : currentVoyageStats.weeklyOfficialsLed) : currentVoyageStats.weeklyOfficialsLed,
           lastOfficialLed: !currentVoyageStats.hasLastOfficialLed ? (data.message.author.id == pingedMember ? Date.now() - data.message.createdTimestamp : currentVoyageStats.lastOfficialLed) : currentVoyageStats.lastOfficialLed,
          
           hasLastOfficial: true,
           hasLastOfficialLed: !currentVoyageStats.hasLastOfficialLed ? (data.message.author.id == pingedMember ? true : currentVoyageStats.lastOfficialLed) : currentVoyageStats.lastOfficialLed
          };
        } else {
          userVoyageStats[pingedMember] = {
           totalOfficials: 1,
           weeklyOfficials: data.message.createdTimestamp >= thirtyDaysAgo ? 0.25 : 0,
           lastOfficial: Date.now() - data.message.createdTimestamp,
           totalOfficialsLed: (data.message.author.id == pingedMember ? 1 : 0),
           weeklyOfficialsLed: data.message.createdTimestamp >= thirtyDaysAgo ? (data.message.author.id == pingedMember ? 0.25 : 0) : 0,
           lastOfficialLed: (data.message.author.id == pingedMember) ? Date.now() - data.message.createdTimestamp : null,
          
           hasLastOfficial: true,
           hasLastOfficialLed: (data.message.author.id == pingedMember) ? true : false
          };
        }
      }
    }

    if (messages.size > 0) {
      lastMessageId = messages.last().id;
    } else {
      break;
    }
  }
  console.log("Stats: " + userVoyageStats)
  channel.client.officialVoyageCountCache.set(channel.guild.id, userVoyageStats);
  return true;
}

// async function cacheOfficialVoyageCountForUser(channel, member) {
//   //Warning: Do not use for more than a few members at a time. Instead use the cacheOfficialVoyageCountForUsers
//   const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

//   const memberCached = member.client.officialVoyageCountCache.has(member.id);

//   let totalOfficials = 0;  
//   let weeklyOfficials = 0;
//   let lastOfficial = null
//   let totalOfficialsLed = 0;
//   let weeklyOfficialsLed = 0;
//   let lastOfficialLed = null;
  
//   let hasLastOfficial = false;
//   let hasLastOfficialLed = false;

//   let lastMessageId;
//   if (!channel) {
//     return {
//       "totalOfficials": totalOfficials,
//       "weeklyOfficials": weeklyOfficials,
//       "lastOfficial": lastOfficial,
//       "hasLastOfficial": hasLastOfficial,
//       "totalOfficialsLed": totalOfficialsLed,
//       "weeklyOfficialsLed": weeklyOfficialsLed,
//       "lastOfficialLed": lastOfficialLed,
//       "hasLastOfficialLed": hasLastOfficialLed
//     } 
//   }

  
//   while (true) {
//     const options = { limit: 100 };
    
//     if (lastMessageId) {
//       options.before = lastMessageId;
//     }
    
//     if (memberCached) {
//       options.after = member.client.officialVoyageCountCache.get(member.id).cacheDate;
//     }
    
//     const messages = await channel.messages.fetch(options);
//     if (!messages.size > 0) {
//       break;
//     }
//     const pingedMessages = messages.filter(message => message.mentions.members.has(member.id));

//     let pingedMessagesList = [];
//     let pingedMessagesSentList = [];

//     if(!lastOfficial) {
//       for (let message of pingedMessages) {

//         message = message[1];
        
//         pingedMessagesList.push(new Date(Date.now() - message.createdTimestamp));
//       }

//       if (pingedMessagesList.length > 0) {
//         lastOfficial = pingedMessagesList[0];
//         hasLastOfficial = true;
//       }
//     }

//     if (!lastOfficialLed) {
//       for (let message of pingedMessages.filter(message => message.author.id == member.id)) {

//         message = message[1];
        
//         pingedMessagesSentList.push(new Date(Date.now() - message.createdTimestamp));
//       }

//       if (pingedMessagesSentList.length > 0) {
//         lastOfficialLed = pingedMessagesSentList[0];
//         hasLastOfficialLed = true;
//       }
//     }
    
//     totalOfficials += pingedMessages.size;
    
//     let pingedMessagesSent = pingedMessages.filter(message => message.author.id == member.id);
//     totalOfficialsLed += pingedMessagesSent.size;

//     const pingedMessageMonth = pingedMessages.filter(message => message.createdTimestamp > thirtyDaysAgo);
//     weeklyOfficials += pingedMessageMonth.size;

//     const pingedMessageSentMonth = pingedMessagesSent.filter(message => message.createdTimestamp > thirtyDaysAgo);
//     weeklyOfficialsLed += pingedMessageSentMonth.size;

//     if (messages.size > 0) {
//       lastMessageId = messages.last().id;
//     } else {
//       break;
//     }
//   }

//   weeklyOfficials = weeklyOfficials / 4; // Average the Officials per week this month
//   weeklyOfficialsLed = weeklyOfficialsLed / 4;
  
//   updatedVoyageStats = {
//     "totalOfficials": totalOfficials,
//     "weeklyOfficials": weeklyOfficials,
//     "lastOfficial": lastOfficial,
//     "hasLastOfficial": hasLastOfficial,
//     "totalOfficialsLed": totalOfficialsLed,
//     "weeklyOfficialsLed": weeklyOfficialsLed,
//     "lastOfficialLed": lastOfficialLed,
//     "hasLastOfficialLed": hasLastOfficialLed
//   }
  
//   logger.debug("Got here");
//   // cacheMemberValues(member, {voyageStats: updatedVoyageStats});
//   return updatedVoyageStats;
// }

function arrayContainsRegex(array, regex) {
  for (element of array) {
    if (element.match(regex)) {
      return true;
    }
  }

  return false;
}

async function getDepartments(member) {
  let rolesOfMember = member.roles.cache.map(role => role.name);

  let departments = [];
  for (role of rolesOfMember) {
    if (role.endsWith(" Department")) {
      departments.push(role.replace(" Department", ""));
    }
  }
  return departments
}

function flipObjectKeyAndValues(obj) {
  const flipped = Object
  .entries(obj)
  .map(([key, value]) => [value, key]);

  return flipped;
}

async function getUsernamesFromIds(ids, guild) {
  return await Promise.all(ids.map(async id => (await guild.members.fetch(id)).displayName));
}

function getMentionsFromIds(ids) {
  return ids.map(id => (userMention(id)));
}

function combineTwoArraysOfSameLengthIntoStringsWithSeparator(array1, array2, separator) {
  let result = [];

  if (!array1 || !array2) {
    return [];
  }
  
  for (index in array1) {
    result.push(array1[index] + separator + array2[index]);
  }
  
  return result;
}

function getElementsUpToStringifiedLength(array, maxLength, joiner = "\n") {
  let popped = 0;

  let wentOverMax = false;
  
  while (array.join(joiner).length + (" + " + popped.toString() + " more").length >= maxLength) {
    array.pop();
    popped += 1;
    wentOverMax = true;
  }

  if (wentOverMax) {
    array.push(" + " + popped.toString() + " more");
  }

  return array;
}

function getElementAddedOrRemovedFromTwoArrays(oldArray, newArray) {
  added = newArray.find(x => !oldArray.includes(x));
  removed = oldArray.find(x => !newArray.includes(x));

  return { element: added ? added : removed, change: added ? "add" : (removed ? "remove" : "none") };
}

function cacheOfficialVoyageCountValues(member, values, date = Date.now()) {
  member.client.officialVoyageCountCache.set(member.id, {voyageStats: values.voyageStats, cacheDate: date}, "members")
}

module.exports = {
  getAllRoles: getAllRoles,
  getAllRolesOfMember: getAllRolesOfMember,
  memberHasRole: memberHasRole,
  roleExists: roleExists,
  memberIdExists: memberIdExists,
  getMemberFromUsername: getMemberFromUsername,
  millisecondsToDisplay: millisecondsToDisplay,
  getChannel: getChannel,
  arrayContainsRegex: arrayContainsRegex,
  flipObjectKeyAndValues: flipObjectKeyAndValues, 
  cacheAllOfficialVoyageCounts: cacheAllOfficialVoyageCounts,
  getDepartments: getDepartments,
  getUsernamesFromIds: getUsernamesFromIds,
  getMentionsFromIds: getMentionsFromIds,
  combineTwoArraysOfSameLengthIntoStringsWithSeparator: combineTwoArraysOfSameLengthIntoStringsWithSeparator,
  getElementsUpToStringifiedLength: getElementsUpToStringifiedLength,
  getElementAddedOrRemovedFromTwoArrays: getElementAddedOrRemovedFromTwoArrays,
  cacheOfficialVoyageCountValues: cacheOfficialVoyageCountValues, 
  cacheAllOfficialVoyageCounts: cacheAllOfficialVoyageCounts
}
