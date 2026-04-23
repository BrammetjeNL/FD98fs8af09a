const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Apex Bot Running"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================
const config = {
  token: process.env.TOKEN,

  logChannel: "1496935940428664993",
  staffRole: "1474919810881290477",

  spawnerChannel: "1492641221070553178"
};

// ================= MEMORY =================
const userTickets = new Map();
const ticketMessages = new Map();

let spawnerStock = {
  zombie: 5,
  skeleton: 5
};

// ================= READY =================
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "Building with Apex Team" }],
    status: "online"
  });
});

// ================= EMBED =================
function embed(title, desc, color = 0x00aaff) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color);
}

// ================= PANEL =================
async function sendPanel(channel) {
  const e = embed(
    "Apex Ticket Center <:Apex:1496924671680057434>",
    `Welcome!

🎫 Support  
🏗️ Build Service  

Max 2 tickets per user.`
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("support")
      .setLabel("Support Ticket")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("build")
      .setLabel("Build Ticket")
      .setStyle(ButtonStyle.Success)
  );

  channel.send({ embeds: [e], components: [row] });
}

// ================= AI (simple fallback) =================
function aiReply(msg) {
  const m = msg.toLowerCase();

  if (m.includes("price")) return "Our prices depend on the build size. Please open a build ticket.";
  if (m.includes("hello")) return "Hello! How can Apex Building Service help you?";
  if (m.includes("help")) return "Please describe your issue and our staff will assist you.";

  return "Apex AI: A staff member will respond shortly.";
}

// ================= TICKETS =================
async function createTicket(interaction, type) {
  const userId = interaction.user.id;

  let count = userTickets.get(userId) || 0;
  if (count >= 2)
    return interaction.reply({ content: "Max 2 tickets allowed.", flags: 64 });

  userTickets.set(userId, count + 1);

  const channel = await interaction.guild.channels.create({
    name: `${type}-${interaction.user.username}`,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      { id: config.staffRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ]
  });

  ticketMessages.set(channel.id, []);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  channel.send({
    embeds: [embed("Ticket Created", `Type: ${type}`)],
    components: [row]
  });

  interaction.reply({ content: `Ticket created: ${channel}`, flags: 64 });
}

// ================= TRANSCRIPT =================
async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 50 });

  let html = `<h1>Ticket Transcript - ${channel.name}</h1><br>`;

  messages.reverse().forEach(m => {
    html += `<p><b>${m.author.tag}:</b> ${m.content}</p>`;
  });

  return html;
}

// ================= EVENTS =================
client.on("interactionCreate", async i => {
  if (!i.isButton()) return;

  if (i.customId === "support") return createTicket(i, "support");
  if (i.customId === "build") return createTicket(i, "build");

  if (i.customId === "close") {
    const channel = i.channel;

    const transcript = await createTranscript(channel);

    const log = i.guild.channels.cache.get(config.logChannel);
    if (log) {
      log.send({
        content: "📄 Ticket Transcript",
        files: [{ attachment: Buffer.from(transcript), name: "transcript.html" }]
      });
    }

    await i.reply({ content: "Closing ticket...", flags: 64 });

    setTimeout(() => channel.delete().catch(() => {}), 2000);
  }
});

// ================= AI CHAT IN TICKETS =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.channel.name.includes("support") || message.channel.name.includes("build")) {
    const reply = aiReply(message.content);
    message.channel.send(reply);
  }

  if (message.content === "!panel") {
    sendPanel(message.channel);
  }

  if (message.content === "!spawner") {
    const e = embed(
      "Spawner Shop",
      `Zombie: ${spawnerStock.zombie}
Skeleton: ${spawnerStock.skeleton}`
    );

    message.channel.send({ embeds: [e] });
  }
});

// ================= LOGIN =================
client.login(config.token);
