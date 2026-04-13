// services/leaderboard.js

const NAMES = [
    "WolfOfWallSt", "ShepherdKing", "WoolTycoon", "FlockMaster", 
    "BaaBaaBlackSheep", "PasturePrime", "FleeceLighting", "MuttonChops",
    "LambChop", "HerderPro", "WoolStreetBet", "Sheepish", "TheShearing"
];

class LeaderboardService {
    constructor() {
        this.storageKey = 'sheepMarket_leaderboard_v1';
        this.ensureInitialized();
    }

    ensureInitialized() {
        if (!localStorage.getItem(this.storageKey)) {
            // Seed with fake high scores
            const initialData = this.generateFakeScores();
            this.save(initialData);
        }
    }

    generateFakeScores() {
        const scores = [];
        // Generate 15 fake scores
        for (let i = 0; i < 15; i++) {
            const name = NAMES[Math.floor(Math.random() * NAMES.length)] + Math.floor(Math.random() * 99);
            // Random score between 500 and 5000
            const score = Math.floor(Math.random() * 4500) + 500;
            scores.push({ name, score, isPlayer: false });
        }
        return scores.sort((a, b) => b.score - a.score);
    }

    getLeaderboard() {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        return data.sort((a, b) => b.score - a.score).slice(0, 20); // Top 20
    }

    submitScore(name, score, isGrandmaster = false) {
        let data = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        
        // Remove existing entry for this player if it exists (keep highest)
        const existingIndex = data.findIndex(p => p.isPlayer);
        
        if (existingIndex !== -1) {
            // Only update if new score is higher
            if (score > data[existingIndex].score) {
                data[existingIndex].score = score;
                data[existingIndex].name = name; // Update name just in case
                data[existingIndex].isGrandmaster = isGrandmaster || data[existingIndex].isGrandmaster; // Preserve GM status if already won
            } else if (isGrandmaster) {
                // If this is a Grandmaster win but score isn't higher, still record GM status
                data[existingIndex].isGrandmaster = true;
            }
        } else {
            // New player entry
            data.push({ name, score, isPlayer: true, isGrandmaster });
        }
        
        // Sort
        data.sort((a, b) => b.score - a.score);
        
        // Keep top 50 to prevent infinite growth
        if (data.length > 50) {
            data = data.slice(0, 50);
        }
        
        this.save(data);
        return this.getRank(score);
    }

    getRank(score) {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        // Count how many scores are higher
        return data.filter(s => s.score > score).length + 1;
    }

    save(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}

export const leaderboardService = new LeaderboardService();