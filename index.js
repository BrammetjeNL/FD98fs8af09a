const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= CONFIG =================
const config = {
  token: process.env.TOKEN,

  channels: {
    builder: "1492285855317098617",
    staff: "1492285799142785124",
    partner: "1492285908547010652"
  },

  roles: {
    staff: ["1474919810881290477", "1474919811304657028"],
    partner: ["1474919811304657032"],
    builder: ["1497168316077183006", "1497017296512880770"]
  }
};

// cooldown per type
const cooldowns = new Map();

// ================= READY =================
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= PANEL =================
client.on("messageCreate", async message => {
  if (message.content === "!applypanel") {

    const embed = new EmbedBuilder()
      .setColor("#E6AF1E")
      .setTitle("Application Menu Apex")
      .setThumbnail("https://cdn.discordapp.com/attachments/1475250183951482880/1496921961555689684/skinmc-avatar.png")
      .setDescription(`
> Apply here to become a Builder or Staff member.

• 4 day cooldown per category  
• Must be 14+  
      `);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("apply_builder")
        .setLabel("Builder Apply")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("apply_staff")
        .setLabel("Staff Apply")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("apply_partner")
        .setLabel("Partner Apply")
        .setStyle(ButtonStyle.Danger) // 🔥 kleur toegevoegd
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ================= QUESTIONS =================
const questions = {
  builder: [
    "What is your age?",
    "How much building experience do you have?",
    "What is your best build style?",
    "Why do you want to join Apex Building Team?",
    "Show us screenshots or portfolio links."
  ],
  staff: [
    "What is your age?",
    "Do you have previous staff experience?",
    "How active are you daily?",
    "How would you handle a difficult user?",
    "Why should we choose you?"
  ],
  partner: [
    "What is your age?",
    "Do you have previous partner team experience?",
    "How much partners can you make in a week?",
    "Why should we choose you?",
  ]
};

// ================= APPLY =================
async function startApply(interaction, type) {
  const user = interaction.user;

  // cooldown per type
  const key = `${user.id}_${type}`;
  const last = cooldowns.get(key);

  if (last && Date.now() - last < 4 * 24 * 60 * 60 * 1000) {
    return interaction.reply({
      content: "You must wait 4 days before applying again for this category.",
      ephemeral: true
    });
  }

  cooldowns.set(key, Date.now());

  await interaction.reply({ content: "Check your DMs 📩", ephemeral: true });

  const dm = await user.createDM();
  const answers = [];

  for (let i = 0; i < questions[type].length; i++) {

    const qEmbed = new EmbedBuilder()
      .setColor("#E6AF1E")
      .setTitle(`${type.toUpperCase()} APPLICATION`)
      .setDescription(`**Question ${i + 1}:**\n${questions[type][i]}`)
      .setFooter({ text: "Reply below within 5 minutes" });

    await dm.send({ embeds: [qEmbed] });

    const collected = await dm.awaitMessages({
      max: 1,
      time: 300000
    });

    if (!collected.first()) {
      dm.send({ embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setDescription("Application cancelled (timeout).")
      ]});
      return;
    }

    answers.push(collected.first().content);
  }

  // RESULT EMBED
  const result = new EmbedBuilder()
    .setColor("#E6AF1E")
    .setTitle(`${type.toUpperCase()} APPLICATION`)
    .setDescription(`Applicant: <@${user.id}>`)
    .addFields(
      answers.map((a, i) => ({
        name: questions[type][i],
        value: a
      }))
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${type}_${user.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`reject_${type}_${user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );

  const channel = client.channels.cache.get(config.channels[type]);
  if (channel) channel.send({ embeds: [result], components: [row] });

  dm.send({
    embeds: [
      new EmbedBuilder()
        .setColor("Green")
        .setDescription("✅ Application submitted successfully!")
    ]
  });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  // APPLY BUTTONS
  if (interaction.customId === "apply_builder") return startApply(interaction, "builder");
  if (interaction.customId === "apply_staff") return startApply(interaction, "staff");
  if (interaction.customId === "apply_partner") return startApply(interaction, "partner");

  // ACCEPT
  if (interaction.customId.startsWith("accept_")) {
    const [, type, userId] = interaction.customId.split("_");

    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (member) {
      for (const role of config.roles[type]) {
        await member.roles.add(role).catch(() => {});
      }
    }

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      user.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription("✅ Your application has been accepted!")
        ]
      });
    }

    interaction.reply({ content: "Accepted.", ephemeral: true });
  }

  // REJECT
  if (interaction.customId.startsWith("reject_")) {
    const [, type, userId] = interaction.customId.split("_");

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      user.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("❌ Your application has been rejected.")
        ]
      });
    }

    interaction.reply({ content: "Rejected.", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(config.token);
