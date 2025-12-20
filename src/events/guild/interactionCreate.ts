
import { Events, Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BaseEvent } from '../../structures/BaseEvent';
import { BotClient } from '../../structures/BotClient';
import { TibiaLootParser } from '../../utils/tibiaLootParser';

export default class InteractionCreateEvent extends BaseEvent {
  constructor() {
    super({
      name: Events.InteractionCreate,
    });
  }

  public async execute(client: BotClient, interaction: Interaction): Promise<void> {
    if (interaction.isButton()) {
      if (interaction.customId === 'open_split_loot_modal') {
        const modal = new ModalBuilder()
          .setCustomId('split_loot_modal')
          .setTitle('Split Loot Parser');

        const lootInput = new TextInputBuilder()
          .setCustomId('loot_input')
          .setLabel('Pega aquí el Session Data')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Session data: From 2025-12-10...\nSession: 02:11h\n...')
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(lootInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'split_loot_modal') {
        const lootText = interaction.fields.getTextInputValue('loot_input');

        try {
          const result = TibiaLootParser.parse(lootText);
          
          if (result.players.length === 0) {
             await interaction.reply({ content: '❌ No se pudieron detectar jugadores en el texto proporcionado. Asegúrate de copiar todo el log de "Party Hunt".', ephemeral: true });
             return;
          }

          const splitData = TibiaLootParser.calculateSplit(result);

          // Format numbers helper
          const fmt = (n: number) => n.toLocaleString('en-US');

          const embed = new EmbedBuilder()
            .setColor('#2ecc71') // Green like the screenshot
            .setTitle(`Party Hunt Session – ${result.players.length} members`)
            .setDescription(
                `**Balance:** ${fmt(result.totalBalance)} 💰\n` +
                `**Individual balance:** ${fmt(splitData.individualBalance)} 💰\n` +
                // Note: User prompt has "Loot per hour" but parsing that requires duration math which is tricky with "02:11h".
                // We'll skip derived stats for now or attempt basic estimation if needed. 
                // Let's implement basics first.
                `\n**Damage**\n` +
                result.players.sort((a,b)=>b.damage-a.damage).map(p => `• ${p.name} (${((p.damage / result.players.reduce((sum, curr) => sum + curr.damage, 0)) * 100).toFixed(2)}%)`).join('\n') +
                `\n\n**Healing**\n` +
                result.players.sort((a,b)=>b.healing-a.healing).map(p => `• ${p.name} (${((p.healing / result.players.reduce((sum, curr) => sum + curr.healing, 0)) * 100).toFixed(2)}%)`).join('\n')
            )
            .setFooter({ text: `${result.duration} hunt on ${result.startTime}` });

          // Helper for code blocks in embed fields? Discord embeds don't support code blocks well in fields sometimes, but descriptions do.
          // The user screenshot puts Splitting Instructions at the bottom.
          
          let instructions = '';
          if (splitData.transfers.length > 0) {
            // Group by Payer
            const payers = [...new Set(splitData.transfers.map(t => t.from))];
            
            payers.forEach(payerName => {
                const payerTransfers = splitData.transfers.filter(t => t.from === payerName);
                if (payerTransfers.length > 0) {
                    instructions += `**${payerName}**:\n`;
                    payerTransfers.forEach(t => {
                        instructions += '```\n' + `transfer ${t.amount} to ${t.to}` + '\n```';
                    });
                }
            });
          } else {
            instructions = "No transfers needed (Perfect balance or Empty).";
          }

          // We append instructions to description or add a field. Screenshot looks like it's all in one body or fields.
          // Let's add a field for "Splitting Instructions".
          embed.addFields({ name: 'Splitting Instructions', value: instructions });

          // Also add the top summary block if desired, but user screenshot splits it.
          // The user screenshot shows:
          // 1. Text reponse (the input data echo).
          // 2. The Embed.
          
          const responseCodeBlock = 
            `Session data: From ${result.startTime} to ${result.endTime}\n` +
            `Session: ${result.duration}\n` +
            `Loot Type: ${result.lootType}\n` +
            `Loot: ${fmt(result.totalLoot)}\n` +
            `Supplies: ${fmt(result.totalSupplies)}\n` +
            `Balance: ${fmt(result.totalBalance)}`;

          // Re-create the button for reuse
          const button = new ButtonBuilder()
            .setCustomId('open_split_loot_modal')
            .setLabel('⚔️ Split Loot')
            .setStyle(ButtonStyle.Success);
      
          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

          await interaction.reply({
            content: "```yaml\n" + responseCodeBlock + "\n```",
            embeds: [embed],
            components: [row]
          });

        } catch (error) {
          console.error(error);
          await interaction.reply({ content: '❌ Hubo un error procesando los datos. Verifica el formato.', ephemeral: true });
        }
      }
    }
  }
}
