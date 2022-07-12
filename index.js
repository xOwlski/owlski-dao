const config = require('./config.json');

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMessageReactions
    ]
});

const embedColor = '#00BFFF';

const Database = require('easy-json-database');
const { ButtonStyle, ChannelType } = require('discord.js');
const db = new Database();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {
        
        if (interaction.customId.endsWith('upvote')) {

            const channelName = interaction.customId.slice(0, -('-upvote'.length));
            console.log(`Upvote for ${channelName}`);
            const channelData = db.get(channelName);
            if (!channelData) {
                return interaction.reply({
                    content: 'Vote not found.',
                    ephemeral: true
                });
            }
            if (channelData.voters.includes(interaction.user.id)) {
                return interaction.reply({
                    content: 'You have already voted for this channel.',
                    ephemeral: true
                });
            }

            channelData.votes += 1;
            channelData.voters.push(interaction.user.id);
            db.set(channelName, channelData);

            const newEmbed = interaction.message.embeds[0];
            newEmbed.fields[1].value = channelData.votes.toLocaleString('en-US');
            interaction.message.edit({
                embeds: [newEmbed]
            });

            interaction.reply({
                content: 'Thanks for voting!',
                ephemeral: true
            });

            if (channelData.votes >= channelData.requiredVotes) {
                interaction.message.edit({
                    components: []
                });

                interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: config.daoCategoryId
                });
            }

        }

    }

});


client.on('messageCreate', (message) => {

    const args = message.content.slice(1).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'dao-channel') {
        const channelName = args.join(' ');
        if (!channelName) {
            return void message.reply('Please specify a channel name!');
        }

        const isAlphaNumeric = /^[a-zA-Z0-9-]+$/.test(channelName);
        if (!isAlphaNumeric) {
            return void message.reply('Channel name must be alphanumeric.');
        }

        if (db.get(channelName)) {
            return void message.reply('Channel vote already exists.');
        }

        const channelData = {
            votes: 0,
            voters: [],
            requiredVotes: Math.floor((message.guild.memberCount / 3) + 20),
            createdAt: new Date()
        };

        db.set(channelName, channelData);

        const embed = new Discord.EmbedBuilder()
            .setAuthor({
                name: `${message.author.tag} wants to create a channel`,
                iconURL: message.author.displayAvatarURL()
            })
            .addFields([
                { name: 'Channel name', value: channelName },
                { name: 'Votes', value: '0' },
                { name: 'Required votes', value: channelData.requiredVotes.toLocaleString('en-US') }
            ])
            .setTimestamp()
            .setColor(embedColor);
        
        const row = new Discord.ActionRowBuilder()
            .addComponents([
                new Discord.ButtonBuilder()
                    .setLabel('Upvote')
                    .setCustomId(`${channelName}-upvote`)
                    .setStyle(ButtonStyle.Success)
            ]);

        client.channels.cache.get(config.daoChannelId).send({
            embeds: [embed],
            components: [row]
        });
    }

});

client.login(config.token);
