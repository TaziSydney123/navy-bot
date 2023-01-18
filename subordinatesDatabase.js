const helpers = require("./helpers");
const logger = require("./logger");

class SubordinatesDB {
  constructor(interaction) {
    this.guild = interaction.guild;
    this.guildId = this.guild.id;
    this.client = interaction.client;
  }

  getActingFor(actingSuperior) {
    for (let [superior, actingSuperiorId] of this.client.actingSuperiors) {
      if (actingSuperiorId == actingSuperior) {
        return superior;
      }
    }

    return null;
  }

  memberHasActingSuperior(superiorId) {
    if (superiorId) {
        return this.client.actingSuperiors.has(superiorId);
    }
  }

  async setSubordinatesToSuperior(superiorId, subordinatesInput) {
    let nullIds = []; // Names that do not exist
    let takenIds = []; // Members with an existing CO

    try {

      let subordinateIds = [];
      
      for (let subordinateNameAndId of subordinatesInput) {
        const nameAndId = subordinateNameAndId.split(" -- ");
        const firstInput = nameAndId[0];

        if (firstInput.length > 0) {
          const id = nameAndId.length > 1 ? nameAndId[1] : (firstInput.match(/^\d*$/) ? firstInput : null);

          let memberFromId;
          
          if (await helpers.memberIdExists(this.guild, id)) {
            memberFromId = await this.guild.members.fetch(id);
          }
          
          const member =  memberFromId ? memberFromId : await helpers.getMemberFromUsername(this.guild, firstInput);
          if (!member) {
            nullIds.push(firstInput);
            continue;
          }
          
          if (!subordinateIds.includes(member.id)) {
            if (!member) {
              nullIds.push(firstInput);
              continue;
            }
    
            let existingSuperiorId = await this.getSuperior(member.id);
            if (existingSuperiorId != null && await this.getSuperior(member.id) != superiorId) {
              takenIds.push(firstInput);
              continue;
            }
    
            subordinateIds.push(member.id);
          }
        }        
      }

      this.client.subordinates.set(superiorId, subordinateIds);
    } catch (error) {
      logger.error("error setting subordiates:\n" + error);
    }

    return { "nullIds": nullIds, "takenIds": takenIds };
  }

  setActingSuperior(superior, actingSuperior) {
    // Do not allow someone to set themselves as acting
    if (actingSuperior == superior) {
      return {
        success: false,
        error: "set_to_self"
      };
    }

    // Do not allow someone to set someone as acting who someone else already set as acting
    // For loop: Check if someone is already set as someone's acting
    for (let actingId of this.client.actingSuperiors.values()) {
      if (actingId == actingSuperior) {
        return {
          success: false,
          error: "member_taken",
          info: this.getActingFor(actingId)
        }
      }
    }

    // Do not allow someone to set someone as acting after they have already set someone else as acting
    if (this.client.actingSuperiors.has(superior)) {
      return {
        success: false,
        error: "already_set"
      }
    }

    if (actingSuperior) {
      this.client.actingSuperiors.set(superior, actingSuperior);
    } else {
      this.client.actingSuperiors.delete(superior);
    }
    return { success: true };
  }

  // This tells a superior all of the subordinates they're currently responsible for,
  // including their own subordinates, and any subordinates of superiors who designated
  // them as an acting superior for their subordinates.
  getNonActingSubordinatesOfSuperior(superiorId) {
    if (!this.client.subordinates.has(superiorId)) {
      return [];
    }
    return this.client.subordinates.get(superiorId);
  }

  // This tells a superior all of the subordinates they're currently responsible for,
  // including their own subordinates, and any subordinates of superiors who designated
  // them as an acting superior for their subordinates.
  getAllSubordinatesOfSuperior(superiorId) {
    let subordinates = [];
    if (this.getActingFor(superiorId)) {
      let newSubordinates = this.getNonActingSubordinatesOfSuperior(this.getActingFor(superiorId));
      newSubordinates = newSubordinates.filter(subordinate => subordinate != superiorId);
      subordinates = newSubordinates;
    }
    if (this.client.actingSuperiors.has(superiorId)) {
      subordinates = subordinates.concat(this.client.actingSuperiors.get(superiorId))
    }
    if (subordinates.length == 0) {
      subordinates = this.getNonActingSubordinatesOfSuperior(superiorId);
    }
    logger.debug(subordinates);
    // let subordinates = this.client.subordinates.has(superiorId) ?
    //   this.client.subordinates.get(superiorId) : [];
    // for (let [nonActingSuperior, actingSuperior] of this.client.actingSuperiors) {
    //   if (superiorId == actingSuperior) {
    //     let actingSubordinates = this.client.subordinates.has(nonActingSuperior) ?
    //       this.client.subordinates.get(nonActingSuperior) : [];
    //     subordinates.concat(actingSubordinates);
    //   }
    // }
    // logger.debug(subordinates);
    return subordinates;
  }

  getNonActingSuperior(subordinateId) {
    for (let [superior, subordinateIds] of this.client.subordinates) {
      if (subordinateIds.includes(subordinateId)) {
        let superiorId = superior;
        return superiorId;
      }
    }
    
    return null;
  }

  removeSubordinateReference(subordinateId) {
    if (!subordinateId) {
      return;
    }

    if (!this.getNonActingSuperior(subordinateId)) {
      return;
    }
    
    if (!this.client.subordinates.has(this.getNonActingSuperior(subordinateId))) {
      return;
    }
    
    this.client.subordinates.remove(this.getNonActingSuperior(subordinateId), subordinateId);
  }
  
  /*
  // Gets superior, or acting superior if one was specified.
  // If there's a chain of acting superiors specified, this walks up that chain
  // until it reaches the first superior that hasn't designated an acting.
  async getSuperior(subordinate) {
    let nonActingSuperior = this.getNonActingSuperior(subordinate);
    let actingSuperior = nonActingSuperior;

    while (actingSuperior && this.client.actingSuperiors.has(this.getKeyFromSuperiorId(actingSuperior))) {
      actingSuperior = this.client.actingSuperiors.get(this.getKeyFromSuperiorId(actingSuperior));

      // Special case. If, through the designation of an acting superior, a subordinate
      // is made to report to themself, then they should report instead to their superior's
      // superior. If the designation of acting superiors later brings us *back* to the
      // subordinate reporting to themself, then they should instead report to the
      // superior one level up, and so on.
      if (actingSuperior == subordinate) {
        nonActingSuperior = this.getNonActingSuperior(subordinate);
        actingSuperior = nonActingSuperior;
      }
    }

    return actingSuperior;
  }*/

  async getSuperior(subordinateId) {
    if (this.memberHasActingSuperior(this.getNonActingSuperior(subordinateId))) {
      if (subordinateId == this.client.actingSuperiors.get(this.getNonActingSuperior(subordinateId))) {
        let currentCOStep = this.getNonActingSuperior(subordinateId);
        while ((await this.guild.members.fetch(currentCOStep)).displayName.match(/^ *\[ *LOA-\d *\] */gm)) {
          currentCOStep = this.getNonActingSuperior(currentCOStep);
        }
        return currentCOStep;
      } else {
        return this.client.actingSuperiors.get(this.getNonActingSuperior(subordinateId));
      }
    } else if (this.getNonActingSuperior(subordinateId)) {
      return this.getNonActingSuperior(subordinateId);
    } else {
      return null; 
    }
  }
  

  clearSubordinates(superiorId) {
    let clearedSubordinates = this.getNonActingSubordinatesOfSuperior(superiorId);
    this.client.subordinates.delete(superiorId);
    return clearedSubordinates;
  }

  reclaimSubordinates(superiorId) {
    if (this.client.actingSuperiors.has(superiorId)) {
      this.client.actingSuperiors.delete(superiorId);
      return true;
    }
  }

  transferSubordinates(from, to) {
    logger.debug("maybe: " + to);
    if (this.client.subordinates.has(from)) {
      if (this.client.subordinates.has(to)) {
        this.client.subordinates.push(to, this.getNonActingSubordinatesOfSuperior(from));
      } else {
        this.client.subordinates.set(to, this.getNonActingSubordinatesOfSuperior(from));
      }

      this.clearSubordinates(from);
      return {
        success: true,
      }
    } else {
      return {
        success: false,
        reason: "no_subordinates"
      }
    }
  }
}

module.exports = {
  SubordinatesDB: SubordinatesDB
};
