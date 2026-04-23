const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================
const config = {
  logChannel: "1496935940428664993",
  supportTicket: "1492640430137802883",
  buildTicket: "1492640633431523581",
  spawnerChannel: "1492641221070553178",

  staffRole: "1474919810881290477",

  roles: {
    owner: "1474919811325759634",
    manager: "1474919811325759631",
    admin: "1474919811304657036",
    mod: "1474919811304657033",
    helper: "1474919811304657028"
  }
};

// ================= DATA STORAGE (SIMPLE RAM) =================
const userTickets = new Map(); // userId -> count
let spawnerStock = {
  zombie: 5,
  skeleton: 5
};

// ================= BOT READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{
      name: "Building with the Apex Building Team.",
      type: 0
    }],
    status: "online"
  });
});

// ================= EMBED HELPER =================
function createEmbed(title, desc, color = 0x2b2d31) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setFooter({ text: "Apex Building Service :Apex:" });
}

// ================= TICKET SYSTEM =================
async function createTicket(interaction, type) {
  const userId = interaction.user.id;

  let count = userTickets.get(userId) || 0;
  if (count >= 2) {
    return interaction.reply({ content: "You can only have **2 open tickets** at a time.", ephemeral: true });
  }

  userTickets.set(userId, count + 1);

  const channel = await interaction.guild.channels.create({
    name: `${type}-ticket-${interaction.user.username}`,
    type: 0,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: config.staffRole,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  const embed = createEmbed(
    "New Ticket Created :Apex:",
    `Type: **${type}**\nUser: <@${interaction.user.id}>`
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });

  interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });

  const log = interaction.guild.channels.cache.get(config.logChannel);
  if (log) log.send(`🎫 Ticket created by <@${interaction.user.id}> (${type})`);
}

// ================= SPWAWNER SYSTEM =================
function updateSpawnerStatus(guild, item) {
  const channel = guild.channels.cache.get(config.spawnerChannel);
  if (!channel) return;

  let status = spawnerStock[item] <= 0 ? "OUT OF STOCK :Skeleton:" : `Stock: ${spawnerStock[item]}`;

  const embed = createEmbed(
    `${item.toUpperCase()} Spawner Shop`,
    `Status: **${status}**`
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_${item}`)
      .setLabel(`Buy ${item}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`sell_${item}`)
      .setLabel(`Sell ${item}`)
      .setStyle(ButtonStyle.Primary)
  );

  channel.send({ embeds: [embed], components: [row] });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  // TICKETS
  if (interaction.customId === "support_ticket") {
    return createTicket(interaction, "support");
  }

  if (interaction.customId === "build_ticket") {
    return createTicket(interaction, "build");
  }

  if (interaction.customId === "close_ticket") {
    const channel = interaction.channel;
    await interaction.reply("Closing ticket...");
    
    setTimeout(() => channel.delete().catch(() => {}), 2000);

    let count = userTickets.get(interaction.user.id) || 1;
    userTickets.set(interaction.user.id, Math.max(0, count - 1));
  }

  // SPAWNERS
  if (interaction.customId.startsWith("buy_")) {
    const item = interaction.customId.split("_")[1];

    if (spawnerStock[item] <= 0) {
      return interaction.reply({ content: "Out of stock!", ephemeral: true });
    }

    spawnerStock[item]--;
    interaction.reply({ content: `You bought a ${item} spawner! :Apex:` });

    if (spawnerStock[item] === 0) {
      const ch = interaction.guild.channels.cache.get(config.spawnerChannel);
      ch.send(`⚠️ ${item.toUpperCase()} is now OUT OF STOCK :Skeleton:`);
    }
  }

  if (interaction.customId.startsWith("sell_")) {
    const item = interaction.customId.split("_")[1];

    spawnerStock[item]++;
    interaction.reply({ content: `You sold a ${item} spawner!` });

    const ch = interaction.guild.channels.cache.get(config.spawnerChannel);
    ch.send(`📦 ${item.toUpperCase()} restocked! New stock: ${spawnerStock[item]}`);
  }
});

// ================= SIMPLE PANEL COMMAND (message trigger) =================
client.on("messageCreate", async message => {
  if (message.content === "!panel") {
    const embed = createEmbed(
      "Apex Building Service Panel :Apex:",
      "Choose an option below to open a ticket."
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_ticket")
        .setLabel("Support Ticket")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("build_ticket")
        .setLabel("Build Service Ticket")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === "!spawnerpanel") {
    updateSpawnerStatus(message.guild, "zombie");
    updateSpawnerStatus(message.guild, "skeleton");
  }
});

// ================= LOGIN =================
client.login("YOUR_BOT_TOKEN_HERE");
