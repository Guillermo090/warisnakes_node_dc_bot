import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

export default class TimerCommand extends BaseCommand {
  constructor() {
    super({
      name: 'timer',
      description: 'Establece un temporizador en minutos. Uso: !timer [minutos] [descripción]',
      category: 'utility',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const minutesArg = args[0];
    const description = args.slice(1).join(' ') || 'Sin descripción';

    if (!minutesArg || isNaN(parseInt(minutesArg, 10)) || parseInt(minutesArg, 10) <= 0) {
      const reply = await message.reply('Por favor, proporciona un número válido de minutos. Ejemplo: `!timer 10 Descansar`');
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      return;
    }

    const minutes = parseInt(minutesArg, 10);
    const milliseconds = minutes * 60 * 1000;

    const confirmationMsg = await message.reply(`✅ Temporizador de **${minutes} minuto(s)** establecido. Te avisaré por DM cuando termine.`);
    // setTimeout(() => {
    //     confirmationMsg.delete().catch(() => {});
    //     // message.delete().catch(() => {});
    // }, 5000);

    setTimeout(() => {
      const embed = new EmbedBuilder()
        .setColor('#ffA500')
        .setTitle('⏰ ¡Tu temporizador ha terminado!')
        .setDescription(`Recordatorio: **${description}**`)
        .setTimestamp();

      message.author.send({ embeds: [embed] }).catch(error => {
        console.error(`No se pudo enviar DM a ${message.author.tag}. Razón:`, error);
        if('send' in message.channel){
          message.channel.send({
            content: `${message.author}, no pude enviarte un DM (quizás los tienes desactivados), pero tu temporizador para **${description}** ha terminado.`,
          }).then((msg: Message) => {
            setTimeout(() => msg.delete().catch(() => {}), 15000);
          });
        }
       
      });
    }, milliseconds);
  }
}