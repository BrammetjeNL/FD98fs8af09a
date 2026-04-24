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
    GatewayIntentBits.DirectMessages
  ]
});

// ================= CONFIG =================
const config = {
  token: process.env.TOKEN,

  builderChannel: "1492285855317098617",
  staffChannel: "1492285799142785124",
  partnerChannel: "1492285908547010652"
};

// cooldown (4 dagen)
const cooldown = new Map();

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
> Apply here to become a Builder or Staff member. Fill in the form and show us why you’re a great fit.

- 4 day cooldown
- Must be 14 years old
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
        .setStyle(ButtonStyle.Secondary)
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

// ================= APPLY SYSTEM =================
async function startApply(interaction, type) {
  const user = interaction.user;

  // cooldown check
  const last = cooldown.get(user.id);
  if (last && Date.now() - last < 4 * 24 * 60 * 60 * 1000) {
    return interaction.reply({ content: "You must wait 4 days before applying again.", ephemeral: true });
  }

  cooldown.set(user.id, Date.now());

  await interaction.reply({ content: "Check your DMs!", ephemeral: true });

  const dm = await user.createDM();

  const answers = [];

  for (let q of questions[type]) {
    await dm.send(`**${q}**`);

    const collected = await dm.awaitMessages({
      max: 1,
      time: 300000
    });

    if (!collected.first()) {
      dm.send("Application cancelled (timeout).");
      return;
    }

    answers.push(collected.first().content);
  }

  // SEND RESULT
  const embed = new EmbedBuilder()
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
      .setCustomId(`accept_${user.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`reject_${user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );

  let channelId =
    type === "builder"
      ? config.builderChannel
      : type === "staff"
      ? config.staffChannel
      : config.partnerChannel;

  const channel = client.channels.cache.get(channelId);
  if (channel) {
    channel.send({ embeds: [embed], components: [row] });
  }

  dm.send("Application submitted successfully!");
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  if (interaction.isButton()) {

    if (interaction.customId === "apply_builder") {
      return startApply(interaction, "builder");
    }

    if (interaction.customId === "apply_staff") {
      return startApply(interaction, "staff");
    }

    if (interaction.customId === "apply_partner") {
      return startApply(interaction, "partner");
    }

    // ACCEPT / REJECT
    if (interaction.customId.startsWith("accept_")) {
      const userId = interaction.customId.split("_")[1];

      interaction.reply({ content: "Application accepted.", ephemeral: true });

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) user.send("✅ Your application has been accepted!");
    }

    if (interaction.customId.startsWith("reject_")) {
      const userId = interaction.customId.split("_")[1];

      interaction.reply({ content: "Application rejected.", ephemeral: true });

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) user.send("❌ Your application has been rejected.");
    }
  }
});

// ================= LOGIN =================
client.login(config.token);
