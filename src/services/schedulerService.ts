import { BotClient } from '../structures/BotClient';
import cron from 'node-cron';
import { CheckHousesUseCase } from '../useCases/checkHousesUseCase';
import { CheckNewsUseCase } from '../useCases/checkNewsUseCase';
import { CheckDailyStatsUseCase } from '../useCases/checkDailyStatsUseCase';
import { CheckTrackedCharactersUseCase } from '../useCases/checkTrackedCharactersUseCase';
import { TibiaDataRepository } from '../repositories/tibiaDataRepository';

export class SchedulerService {
  private client: BotClient;
  
  private checkHousesUseCase: CheckHousesUseCase;
  private checkNewsUseCase: CheckNewsUseCase;
  private checkDailyStatsUseCase: CheckDailyStatsUseCase;
  private checkTrackedCharactersUseCase: CheckTrackedCharactersUseCase;

  constructor(client: BotClient) {
    this.client = client;
    const tibiaDataRepository = new TibiaDataRepository();
    
    // Inicialización de casos de uso
    this.checkHousesUseCase = new CheckHousesUseCase(client, tibiaDataRepository);
    this.checkNewsUseCase = new CheckNewsUseCase(client, tibiaDataRepository);
    this.checkDailyStatsUseCase = new CheckDailyStatsUseCase(client);
    this.checkTrackedCharactersUseCase = new CheckTrackedCharactersUseCase(client, tibiaDataRepository);
  }

  public init() {
    console.log('[SchedulerService] Iniciando servicios programados...');
    
    // Check news every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.checkNewsUseCase.execute();
    });

    // Check houses daily at 08:00 AM
    cron.schedule('0 8 * * *', () => {
      this.checkHousesUseCase.execute();
      this.checkDailyStatsUseCase.execute();
    });

    // Check tracked characters every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.checkTrackedCharactersUseCase.execute();
    });

    console.log('[SchedulerService] Ejecutando chequeo inicial...');
    // this.checkHousesUseCase.execute();
    // this.checkNewsUseCase.execute();
    // this.checkDailyStatsUseCase.execute();
    // this.checkTrackedCharactersUseCase.execute();
  }
}
