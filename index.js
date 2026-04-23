const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Apex Bot Online"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// CONFIG
const config = {
  token: process.env.TOKEN,
  logChannel: "1496935940428664993",
  staffRole: "1474919810881290477"
};

// DATA
const userTickets = new Map();

let spawnerStock = {
  zombie: 5,
  skeleton: 5
};

// READY
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "Building with Apex Team" }],
    status: "online"
  });
});

// EMBED
function embed(title, desc, color = 0xF1C40F) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color);
}

// AI SIMPLE
function ai(msg) {
  msg = msg.toLowerCase();

  if (msg.includes("price")) return "Prices depend on the build size. Open a build ticket.";
  if (msg.includes("help")) return "Describe your issue and staff will help you.";
  if (msg.includes("hello")) return "Hello from Apex Building Service.";

  return "Staff will respond soon.";
}

// PANEL
function panel(message) {
  const e = embed(
    "Apex Building Service",
    "Select a category below to create a ticket"
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_menu")
    .setPlaceholder("Select category")
    .addOptions(
      { label: "Support", value: "support", emoji: "🎫" },
      { label: "Build Request", value: "build", emoji: "🏗️" },
      { label: "Commission", value: "commission", emoji: "💰" },
      { label: "Revision", value: "revision", emoji: "🔁" },
      { label: "Partner", value: "partner", emoji: "🤝" },
      { label: "Giveaway", value: "giveaway", emoji: "🎁" },
      { label: "Spawner Market", value: "spawner", emoji: "🛒" },
      { label: "Rank Request", value: "rank", emoji: "👑" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  message.channel.send({ embeds: [e], components: [row] });
}

// CREATE TICKET
async function createTicket(interaction, type) {
  const user = interaction.user.id;

  let count = userTickets.get(user) || 0;
  if (count >= 2)
    return interaction.reply({ content: "Max 2 tickets reached", flags: 64 });

  userTickets.set(user, count + 1);

  const channel = await interaction.guild.channels.create({
    name: `${type}-${interaction.user.username}`,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user,
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

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  channel.send({
    embeds: [embed("Ticket Created", type)],
    components: [row]
  });

  interaction.reply({ content: "Ticket created", flags: 64 });
}

// TRANSCRIPT
async function transcript(channel) {
  const msgs = await channel.messages.fetch({ limit: 50 });

  let html = "";

  msgs.reverse().forEach(m => {
    html += `${m.author.tag}: ${m.content}\n`;
  });

  return html;
}

// INTERACTIONS
client.on("interactionCreate", async i => {
  if (i.isStringSelectMenu()) {
    if (i.customId === "ticket_menu") {
      const type = i.values[0];
      return createTicket(i, type);
    }
  }

  if (i.isButton()) {
    if (i.customId === "close") {
      const ch = i.channel;

      const log = i.guild.channels.cache.get(config.logChannel);

      const file = await transcript(ch);

      if (log) {
        log.send({
          content: "Ticket transcript",
          files: [{ attachment: Buffer.from(file), name: "transcript.txt" }]
        });
      }

      i.reply({ content: "Closing", flags: 64 });

      setTimeout(() => ch.delete().catch(() => {}), 2000);
    }
  }
});

// MESSAGE
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!panel") {
    panel(message);
  }

  if (message.content === "!spawner") {
    message.channel.send(
      `Zombie: ${spawnerStock.zombie}\nSkeleton: ${spawnerStock.skeleton}`
    );
  }

  if (message.channel.name.includes("support") || message.channel.name.includes("build")) {
    message.channel.send(ai(message.content));
  }
});

// LOGIN
client.login(config.token);
