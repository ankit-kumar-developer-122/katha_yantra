
import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedText, VideoScript, GeneratedImages } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStoryAndLexicon = async (
  seedStory: string,
  filterPrompt: string,
  difficulty: 'Easy' | 'Medium' | 'Hard'
): Promise<GeneratedText> => {
    const prompt = `
    Difficulty Level: "${difficulty}"
    User's Seed Story: "${seedStory}"
    Indianization Filter: "${filterPrompt}"

    Based on the seed story, filter, and difficulty level, perform the following tasks and return the output as a single JSON object.
    1.  Create a detailed lexicon mapping original concepts to their Indianized versions. The lexicon should have four categories: 'cultivationStages', 'techniques', 'names' (for characters, locations, items), and 'system' (for game-like elements like EXP, Quests).
        - For 'Easy' difficulty: Use common, easily understandable Indianized terms.
        - For 'Medium' difficulty: Use a balanced mix of common and interesting terms.
        - For 'Hard' difficulty: Use more obscure, complex, and nuanced terms from deep Vedic/Puranic lore. The lexicon should be more extensive.
    2.  Rewrite the entire seed story using ONLY the Indianized terms from the lexicon you just created. Ensure the tone and style reflect Vedic mythology.
        - For 'Easy' difficulty: The story should be straightforward and direct.
        - For 'Medium' difficulty: The story should have a good narrative flow and moderate complexity.
        - For 'Hard' difficulty: The story should employ more sophisticated language, complex sentences, and deeper mythological allusions.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    lexicon: {
                        type: Type.OBJECT,
                        properties: {
                            cultivationStages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, indianized: { type: Type.STRING } } } },
                            techniques: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, indianized: { type: Type.STRING } } } },
                            names: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, indianized: { type: Type.STRING } } } },
                            system: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, indianized: { type: Type.STRING } } } },
                        }
                    },
                    rewrittenStory: { type: Type.STRING }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeneratedText;
};

export const generatePlotOptions = async (rewrittenStory: string, difficulty: 'Easy' | 'Medium' | 'Hard'): Promise<string[]> => {
    const prompt = `
    Difficulty Level: "${difficulty}"
    Here is the beginning of an Indianized story:
    "${rewrittenStory}"

    Based on this story and the specified difficulty level, generate 10 distinct, Indianized plot directions for how the story could proceed.
    - For 'Easy' difficulty: The plots should be simple, with clear goals and resolutions.
    - For 'Medium' difficulty: The plots should have some twists and moderate complexity.
    - For 'Hard' difficulty: The plots should be intricate, involving moral ambiguity, complex character motivations, and unexpected consequences.
    
    Each option must be a concise, one-paragraph summary. Return the output as a JSON array of strings.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    plotOptions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.plotOptions;
};

export const generateImages = async (rewrittenStory: string): Promise<GeneratedImages> => {
    const imagePromptsPrompt = `
    Based on the following story, create detailed image generation prompts.
    Story: "${rewrittenStory}"
    
    Generate prompts for:
    1.  One main character portrait. The prompt should be highly detailed, describing their appearance, attire in a culturally appropriate Indian mythological style, and expression.
    2.  Three prompts for key scene illustrations from the story. The prompts should describe the environment, action, and characters involved, referencing the main character's appearance for consistency.

    Return a JSON object with two keys: "character_prompts" (an array with one string) and "scene_prompts" (an array with three strings).
    `;
    
    const promptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: imagePromptsPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    character_prompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    scene_prompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
            }
        }
    });

    const promptsJson = JSON.parse(promptResponse.text.trim());
    const characterPrompts: string[] = promptsJson.character_prompts;
    const scenePrompts: string[] = promptsJson.scene_prompts;
    const allPrompts = [...characterPrompts, ...scenePrompts];
    
    const imageGenerationPromises = allPrompts.map(prompt => 
        ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `${prompt}, detailed, culturally appropriate attire, vedic mythology aesthetic, digital painting`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4',
            },
        })
    );

    const imageResponses = await Promise.all(imageGenerationPromises);
    const base64Images = imageResponses.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
    
    return {
        characterImages: base64Images.slice(0, 1),
        sceneImages: base64Images.slice(1),
        characterPrompts,
        scenePrompts,
    };
};

export const regenerateCharacterImage = async (originalPrompt: string, customization: string): Promise<string> => {
    const newPrompt = `${originalPrompt}, ${customization}, detailed, culturally appropriate attire, vedic mythology aesthetic, digital painting`;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: newPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '3:4',
        },
    });

    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
};

export const generateVideoScript = async (selectedPlot: string, storyContext: string): Promise<VideoScript> => {
    const prompt = `
    Story Context: "${storyContext}"
    Selected Plot Direction: "${selectedPlot}"

    Your task is to convert the selected plot direction into a YouTube-ready video script (approximately 3-5 minutes runtime).
    The output must be a JSON object containing:
    1. 'title': A catchy, Indianized title for the video.
    2. 'script': An array of objects, where each object represents a scene with 'scene' number, 'visual' description, and 'dialogue' or narration.
    3. 'veoPrompts': An array of objects, where each object has a 'scene' number and a 'prompt' for a video generation model like Veo, based on the visual description. The prompts should be concise and effective.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    script: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                scene: { type: Type.INTEGER },
                                visual: { type: Type.STRING },
                                dialogue: { type: Type.STRING },
                            }
                        } 
                    },
                    veoPrompts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene: { type: Type.INTEGER },
                                prompt: { type: Type.STRING },
                            }
                        }
                    }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as VideoScript;
};
