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

// ================= COOLDOWN =================
const cooldowns = new Map();

// ================= READY =================
client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= PANEL =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!applypanel") {
    const embed = new EmbedBuilder()
      .setColor("#E6AF1E")
      .setTitle("Application Menu Apex")
      .setThumbnail("https://cdn.discordapp.com/attachments/1475250183951482880/1496921961555689684/skinmc-avatar.png")
      .setDescription(`
> Apply here to become a Builder, Partner or Staff member.

- 4 day cooldown
- Must be 14+
      `);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("apply_builder").setLabel("Builder Apply").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("apply_staff").setLabel("Staff Apply").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("apply_partner").setLabel("Partner Apply").setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  // ================= RESET CD =================
  if (message.content.startsWith("!resetcd")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("No permission.");
    }

    const args = message.content.split(" ");
    const user = message.mentions.users.first();
    const type = args[2];

    if (!user) return message.reply("Mention a user.");

    if (type) {
      cooldowns.delete(`${user.id}_${type}`);
      return message.reply(`Cooldown reset for ${type}`);
    }

    for (const key of cooldowns.keys()) {
      if (key.startsWith(user.id)) cooldowns.delete(key);
    }

    message.reply("All cooldowns removed.");
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
    "How many partners can you make weekly?",
    "Why should we choose you?"
  ]
};

// ================= APPLY =================
async function startApply(interaction, type) {
  const user = interaction.user;
  const key = `${user.id}_${type}`;
  const startTime = Date.now();

  // 🔥 FIX: meteen deferen
  await interaction.deferReply({ flags: 64 });

  if (cooldowns.has(key) && Date.now() - cooldowns.get(key) < 4 * 86400000) {
    return interaction.editReply({ content: "Wait 4 days before applying again." });
  }

  cooldowns.set(key, Date.now());

  await interaction.editReply({ content: "Check your DMs 📩" });

  const dm = await user.createDM();
  const answers = [];

  for (let i = 0; i < questions[type].length; i++) {
    await dm.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#E6AF1E")
          .setTitle(`${type.toUpperCase()} APPLICATION`)
          .setDescription(`**Q${i + 1}:** ${questions[type][i]}`)
      ]
    });

    const collected = await dm.awaitMessages({ max: 1, time: 300000 });

    if (!collected.first()) return;

    const msg = collected.first();
    let answerText = msg.content || "No text";

    if (msg.attachments.size > 0) {
      msg.attachments.forEach(att => {
        answerText += `\n[View attachment](${att.url})`;
      });
    }

    answers.push(answerText);
  }

  const guild = interaction.guild;
  const member = await guild.members.fetch(user.id);

  const duration = Math.floor((Date.now() - startTime) / 1000);

  const stats = `
**Submission Stats**
UserId: ${user.id}
Username: ${user.username}
User: <@${user.id}>
Duration: ${duration}s
Joined: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>
Submitted: <t:${Math.floor(Date.now() / 1000)}:R>
`;

  const embed = new EmbedBuilder()
    .setColor("#E6AF1E")
    .setTitle(`${type.toUpperCase()} APPLICATION`)
    .setDescription(`Applicant: <@${user.id}>\n\n${stats}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      answers.map((a, i) => ({
        name: questions[type][i],
        value: a
      }))
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${type}_${user.id}`).setLabel("Reject").setStyle(ButtonStyle.Danger)
  );

  const channel = client.channels.cache.get(config.channels[type]);
  channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });

  dm.send({
    embeds: [new EmbedBuilder().setColor("Green").setDescription("Application submitted!")]
  });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "apply_builder") return startApply(interaction, "builder");
  if (interaction.customId === "apply_staff") return startApply(interaction, "staff");
  if (interaction.customId === "apply_partner") return startApply(interaction, "partner");

  if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("reject_")) {
    const [action, type, userId] = interaction.customId.split("_");

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const user = await client.users.fetch(userId).catch(() => null);

    const accepted = action === "accept";

    if (accepted && member) {
      for (const role of config.roles[type]) {
        await member.roles.add(role).catch(() => {});
      }
    }

    if (user) {
      user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(accepted ? "Green" : "Red")
            .setDescription(
              accepted
                ? "✅ Your application was accepted!"
                : "❌ Your application was rejected."
            )
        ]
      });
    }

    const msg = interaction.message;
    const embed = EmbedBuilder.from(msg.embeds[0]).setColor(accepted ? "Green" : "Red");

    await interaction.update({
      content: `<@${userId}>'s submission has been ${
        accepted ? "accepted" : "rejected"
      } successfully by <@${interaction.user.id}>`,
      embeds: [embed],
      components: []
    });
  }
});

// ================= ERROR HANDLING =================
client.on("error", console.error);
process.on("unhandledRejection", console.error);

// ================= LOGIN =================
client.login(config.token);
