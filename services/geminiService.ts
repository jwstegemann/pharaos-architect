import { GoogleGenAI } from "@google/genai";
import { GameState, BuildingType } from "../types";

const SYSTEM_INSTRUCTION = `
You are the High Priest of the Pharaoh in Ancient Egypt. 
You speak in a mystical, archaic, yet helpful tone. 
Your job is to advise the Royal Architect (the player) on the progress of the Pyramid construction.
Analyze the provided JSON game state.
- If the Pyramid is complete (constructionProgress >= constructionTarget), congratulate the player immensely.
- If resources are low in the Pyramid inputs, urge for more logistics.
- If stone is piling up at quarries but not moving, suggest assigning more transport.
- Keep responses short (under 50 words).
`;

export const getOracleAdvice = async (gameState: GameState): Promise<string> => {
  if (!process.env.API_KEY) {
    return "The spirits are silent... (Missing API_KEY)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Simplify state for token efficiency
    const simpleState = {
      pyramidProgress: gameState.level.buildings.find(b => b.type === BuildingType.CONSTRUCTION_SITE)?.constructionProgress,
      pyramidTarget: gameState.level.buildings.find(b => b.type === BuildingType.CONSTRUCTION_SITE)?.constructionTarget,
      totalUnits: gameState.units.length,
      buildings: gameState.level.buildings.map(b => ({
        name: b.name,
        type: b.type,
        input: b.inputInventory,
        output: b.outputInventory
      }))
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Current Game State: ${JSON.stringify(simpleState)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "The stars are cloudy today.";
  } catch (error) {
    console.error("Oracle Error:", error);
    return "The gods are displeased with the connection.";
  }
};