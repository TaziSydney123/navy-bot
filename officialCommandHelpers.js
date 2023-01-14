class OfficialCommandHelper {
  constructor(interaction, guildId = "") {
    if (!guildId) {
      guildId = interaction.guild.id;
    }
    
    this.guildId = guildId;
    this.client = interaction.client;
  }

  getOfficialKeyFromId(id) {
    return `${this.guildId}/${id}`;
  }

  getGuildIdFromKey(key) {
    return key.split("/")[0];
  }
  
  getOfficialIdFromKey(key) {
    return key.split("/")[1];
  }

  getOfficialsList() {
    return this.client.settings.get(this.guildId, "officials").filter(officialKey => getGuildIdFromKey(officialKey) == this.guildId);
  }

  getOfficialFromId(officialId) {
    return this.client.settings.get(this.guildId, "officials").officialId;
  }

  setOfficialInformationFromId(officialId, valueName, value) {
    return getOfficialFromId(officialId)[valueName] = value;
  }
}

module.exports = {
  OfficialCommandHelper: OfficialCommandHelper
};