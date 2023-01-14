const { userMention } = require('discord.js');
const dayjs = require('dayjs')
const logger = require("./logger");

var duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

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
  for (member of members.values()) {
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
  const duration = dayjs.duration(ms);
  
  let times = [];
  
  times.push({"name": duration.years() == 1 ? "year" : "years", "realDuration": duration.asYears(), "relativeDuration": duration.years()});
  times.push({"name": duration.months() == 1 ? "month" : "months", "realDuration": duration.asMonths(), "relativeDuration": duration.months()});
  times.push({"name": duration.weeks() == 1 ? "week" : "weeks", "realDuration": duration.asWeeks(), "relativeDuration": duration.weeks()});
  times.push({"name": duration.days() - duration.weeks() * 7 == 1 ? "day" : "days", "realDuration": duration.asDays(), "relativeDuration": duration.days() - duration.weeks() * 7});
  times.push({"name": duration.hours() == 1 ? "hour" : "hours", "realDuration": duration.asHours(), "relativeDuration": duration.hours()});
  times.push({"name": duration.minutes() == 1 ? "minute" : "minutes", "realDuration": duration.asMinutes(), "relativeDuration": duration.minutes()});
  times.push({"name": duration.seconds() == 1 ? "second" : "seconds", "realDuration": duration.asSeconds(), "relativeDuration": duration.seconds()});
  
  wholeTimes = times.filter((time) => time.realDuration >= 1 && time.relativeDuration != 0);
  
  if (wholeTimes.length < 1) {
    return "Just Now";
  } else if (wholeTimes.length < 2) {
    return wholeTimes[0].relativeDuration + " " + wholeTimes[0].name + (relative ? " ago" : "");
  } else {
    return wholeTimes[0].relativeDuration + " " + wholeTimes[0].name + ", " + wholeTimes[1].relativeDuration + " " + wholeTimes[1].name + (relative ? " ago" : "");
  }
}

async function getChannel(guild, name) {
  let channels = await guild.channels.fetch();

  for (let channel of channels.values()) {
    if (channel.name.toLowerCase().includes(name.toLowerCase())) {
      return channel;
    }
  }
}

async function countOfficialVoyages(channel, member) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let totalOfficials = 0;  
  let weeklyOfficials = 0;
  let lastOfficial = null
  let totalOfficialsLead = 0;
  let weeklyOfficialsLead = 0;
  let lastOfficialLead = null;
  
  let hasLastOfficial = false;
  let hasLastOfficialLead = false;

  let lastMessageId;
  if (!channel) {
    return {"totalOfficials": totalOfficials,
          "weeklyOfficials": weeklyOfficials,
          "lastOfficial": lastOfficial,
          "hasLastOfficial": hasLastOfficial,
          "totalOfficialsLead": totalOfficialsLead,
          "weeklyOfficialsLead": weeklyOfficialsLead,
          "lastOfficialLead": lastOfficialLead,
          "hasLastOfficialLead": hasLastOfficialLead}; 
  } 
  while (true) {
    const options = { limit: 100 };
    
    if (lastMessageId) {
      options.before = lastMessageId;
    }
    
    const messages = await channel.messages.fetch(options);

    const pingedMessages = messages.filter(message => message.mentions.has(member.id));

    let pingedMessagesList = [];
    let pingedMessagesSentList = [];

    if(!lastOfficial) {
      for (let message of pingedMessages) {

        message = message[1];
        
        pingedMessagesList.push(new Date(Date.now() - message.createdAt));
      }

      if(pingedMessagesList.length > 0) {
        lastOfficial = pingedMessagesList[0];
        hasLastOfficial = true;
      }
    }

    if(!lastOfficialLead) {
      for (let message of pingedMessages.filter(message => message.author.id == member.id)) {

        message = message[1];
        
        pingedMessagesSentList.push(new Date(Date.now() - message.createdAt));
      }

      if(pingedMessagesSentList.length > 0) {
        lastOfficialLead = pingedMessagesSentList[0];
        hasLastOfficialLead = true;
      }
    }

    totalOfficials += pingedMessages.size;
    let pingedMessagesSent = pingedMessages.filter(message => message.author.id == member.id)
    totalOfficialsLead += pingedMessagesSent.size;

    const pingedMessageMonth = pingedMessages.filter(message => message.createdAt > thirtyDaysAgo);
    weeklyOfficials += pingedMessageMonth.size;

    const pingedMessageSentMonth = pingedMessagesSent.filter(message => message.createdAt > thirtyDaysAgo);
    weeklyOfficialsLead += pingedMessageSentMonth.size;

    if (messages.size > 0) {
      lastMessageId = messages.last().id;
    } else {
      break;
    }
  }

  weeklyOfficials = weeklyOfficials / 4; // Average the Officials per week this month
  weeklyOfficialsLead = weeklyOfficialsLead / 4;
  
  return {"totalOfficials": totalOfficials,
          "weeklyOfficials": weeklyOfficials,
          "lastOfficial": lastOfficial,
          "hasLastOfficial": hasLastOfficial,
          "totalOfficialsLead": totalOfficialsLead,
          "weeklyOfficialsLead": weeklyOfficialsLead,
          "lastOfficialLead": lastOfficialLead,
          "hasLastOfficialLead": hasLastOfficialLead};
}

function arrayContainsRegex(array, regex) {
  for (element of array) {
    if (element.match(regex)) {
      return true;
    }
  }

  return false;
}

async function getLastPing(channel, member) {
  let lastMessageId;

  while (true) {
    const options = { limit: 1 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }
    const messages = await channel.messages.fetch(options);

    const pingedMessages = messages.filter(message => message.mentions.has(member.id));

    pingedMessageCount += pingedMessages.size;

    if (messages.size > 0) {
      lastMessageId = messages.last().id;
    } else {
      break;
    }
  }

  return pingedMessageCount;
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

async function getMentionsFromIds(ids, guild) {
  return await Promise.all(ids.map(async id => (userMention(id))));
}

function combineTwoArraysOfSameLengthIntoStringsWithSeparator(array1, array2, separator) {
  let result = [];
  
  for (index in array1) {
    result.push(array1[index] + separator + array2[index]);
  }
  
  return result;xz
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

module.exports = {
  getAllRoles: getAllRoles,
  getAllRolesOfMember: getAllRolesOfMember,
  memberHasRole: memberHasRole,
  roleExists: roleExists,
  memberIdExists: memberIdExists,
  getMemberFromUsername: getMemberFromUsername,
  millisecondsToDisplay: millisecondsToDisplay,
  getChannel: getChannel,
  countOfficialVoyagesget: countOfficialVoyages,
  arrayContainsRegex: arrayContainsRegex,
  getLastPing: getLastPing, 
  flipObjectKeyAndValues: flipObjectKeyAndValues, 
  countOfficialVoyages: countOfficialVoyages,
  getDepartments: getDepartments,
  getUsernamesFromIds: getUsernamesFromIds,
  getMentionsFromIds: getMentionsFromIds,
  combineTwoArraysOfSameLengthIntoStringsWithSeparator: combineTwoArraysOfSameLengthIntoStringsWithSeparator,
  getElementsUpToStringifiedLength: getElementsUpToStringifiedLength,
  getElementAddedOrRemovedFromTwoArrays: getElementAddedOrRemovedFromTwoArrays
};