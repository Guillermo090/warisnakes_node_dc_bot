
export interface PlayerSession {
  name: string;
  isLeader: boolean;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  healing: number;
}

export interface SessionData {
  startTime: string;
  endTime: string;
  duration: string;
  lootType: string;
  totalLoot: number;
  totalSupplies: number;
  totalBalance: number;
  players: PlayerSession[];
}

export interface TransferInstruction {
  from: string;
  to: string;
  amount: number;
}

export interface SplitResult {
  sessionData: SessionData;
  individualBalance: number;
  transfers: TransferInstruction[];
}

export class TibiaLootParser {
  // Helper to parse localized numbers (e.g., "5,732,123" -> 5732123)
  private static parseNumber(str: string): number {
    return parseInt(str.replace(/,/g, ''), 10) || 0;
  }

  public static parse(text: string): SessionData {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Default / Initial values
    const data: SessionData = {
      startTime: '',
      endTime: '',
      duration: '',
      lootType: '',
      totalLoot: 0,
      totalSupplies: 0,
      totalBalance: 0,
      players: []
    };

    let currentPlayer: Partial<PlayerSession> | null = null;

    for (const line of lines) {
      // Header parsing
      if (line.startsWith('Session data:')) {
        const parts = line.replace('Session data: From ', '').split(' to ');
        if (parts.length === 2) {
          data.startTime = parts[0].trim();
          data.endTime = parts[1].trim();
        }
      } else if (line.startsWith('Session:')) {
        data.duration = line.replace('Session:', '').trim();
      } else if (line.startsWith('Loot Type:')) {
        data.lootType = line.replace('Loot Type:', '').trim();
      } else if (line.startsWith('Loot:')) {
        if (!currentPlayer) {
            data.totalLoot = this.parseNumber(line.replace('Loot:', ''));
        } else {
            currentPlayer.loot = this.parseNumber(line.replace('Loot:', ''));
        }
      } else if (line.startsWith('Supplies:')) {
        if (!currentPlayer) {
            data.totalSupplies = this.parseNumber(line.replace('Supplies:', ''));
        } else {
            currentPlayer.supplies = this.parseNumber(line.replace('Supplies:', ''));
        }
      } else if (line.startsWith('Balance:')) {
        if (!currentPlayer) {
            data.totalBalance = this.parseNumber(line.replace('Balance:', ''));
        } else {
            currentPlayer.balance = this.parseNumber(line.replace('Balance:', ''));
        }
      } else if (line.startsWith('Damage:')) {
        if (currentPlayer) currentPlayer.damage = this.parseNumber(line.replace('Damage:', ''));
      } else if (line.startsWith('Healing:')) {
        if (currentPlayer) currentPlayer.healing = this.parseNumber(line.replace('Healing:', ''));
      } else {
        // Assume it's a player name if it doesn't match keys and isn't indented (though trim removes indent)
        // In validity, the structure usually is Name then indented stats.
        // We detect "Name" by exclusion or pattern?
        // Let's assume lines not starting with keywords are names.
        // Names might have "(Leader)" suffix.
        if (!line.includes(':')) {
           if (currentPlayer) {
               data.players.push(currentPlayer as PlayerSession);
           }
           const isLeader = line.includes('(Leader)');
           const name = line.replace('(Leader)', '').trim();
           currentPlayer = {
               name,
               isLeader,
               loot: 0,
               supplies: 0,
               balance: 0,
               damage: 0,
               healing: 0
           };
        }
      }
    }
    // Push last player
    if (currentPlayer) {
        data.players.push(currentPlayer as PlayerSession);
    }

    return data;
  }

  public static calculateSplit(session: SessionData): SplitResult {
    const playerCount = session.players.length;
    if (playerCount === 0) {
        return { sessionData: session, individualBalance: 0, transfers: [] };
    }

    // Individual Balance target (Total Profit / N)
    const individualBalance = Math.floor(session.totalBalance / playerCount);

    // Calculate diffs
    // If player balance > individualBalance, they KEEP extra money, so they must PAY.
    // If player balance < individualBalance, they are OWED money, so they must RECEIVE.
    // Wait, the "Balance" in Tibia logs is (Loot - Supplies).
    // If I profited 100k, and fair share is 50k, I must pay 50k.
    // If I profited 0k (or negative), and fair share is 50k, I must receive.
    
    let payers: { name: string; amount: number }[] = [];
    let receivers: { name: string; amount: number }[] = [];

    session.players.forEach(p => {
        const diff = p.balance - individualBalance;
        if (diff > 0) {
            payers.push({ name: p.name, amount: diff });
        } else if (diff < 0) {
            receivers.push({ name: p.name, amount: Math.abs(diff) });
        }
    });

    // Greedy matching for settlements
    // Sort logic can vary, but usually largest to largest reduces transaction count?
    payers.sort((a, b) => b.amount - a.amount);
    receivers.sort((a, b) => b.amount - a.amount);

    const transfers: TransferInstruction[] = [];

    let pIndex = 0;
    let rIndex = 0;

    while (pIndex < payers.length && rIndex < receivers.length) {
        const payer = payers[pIndex];
        const receiver = receivers[rIndex];

        const amountToTransfer = Math.min(payer.amount, receiver.amount);
        
        if (amountToTransfer > 0) {
             transfers.push({
                from: payer.name,
                to: receiver.name,
                amount: amountToTransfer
             });
        }

        payer.amount -= amountToTransfer;
        receiver.amount -= amountToTransfer;

        if (payer.amount <= 1) pIndex++; // Tolerance for integer division dust
        if (receiver.amount <= 1) rIndex++;
    }

    return {
        sessionData: session,
        individualBalance,
        transfers
    };
  }
}
