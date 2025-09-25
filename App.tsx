
import React, { useState, useCallback, useEffect } from 'react';
import { DEFAULT_FILTER_PROMPT } from './constants';
import type { Lexicon, VideoScript, GeneratedImages } from './types';
import { 
    generateStoryAndLexicon, 
    generatePlotOptions, 
    generateImages, 
    generateVideoScript,
    regenerateCharacterImage
} from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';

const Header: React.FC = () => (
    <header className="text-center p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700">
        <h1 className="text-5xl font-bold text-amber-400">Katha-Yantra</h1>
        <p className="text-slate-300 mt-2 text-lg">The AI Indianization Novel Creation App</p>
    </header>
);

type Difficulty = 'Easy' | 'Medium' | 'Hard';

const UserInput: React.FC<{
    seedStory: string;
    setSeedStory: (value: string) => void;
    filterPrompt: string;
    setFilterPrompt: (value: string) => void;
    difficulty: Difficulty;
    setDifficulty: (value: Difficulty) => void;
    onSubmit: () => void;
    isLoading: boolean;
    onSave: () => void;
    onLoad: () => void;
    onClear: () => void;
}> = ({ seedStory, setSeedStory, filterPrompt, setFilterPrompt, difficulty, setDifficulty, onSubmit, isLoading, onSave, onLoad, onClear }) => {
    const [saveMessage, setSaveMessage] = useState('');

    const handleSaveClick = () => {
        onSave();
        setSaveMessage('Progress Saved!');
        setTimeout(() => setSaveMessage(''), 2000);
    };
    
    const handleClearClick = () => {
        if (window.confirm('Are you sure you want to clear saved progress and reset the app? This cannot be undone.')) {
            onClear();
        }
    };

    return (
        <div className="bg-slate-800/60 p-6 rounded-lg shadow-md border border-slate-700">
            <h2 className="text-2xl font-semibold text-amber-300 mb-4">1. Provide Your Story's Seed</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Difficulty</label>
                    <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-700 w-full">
                        {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`w-full py-2 text-sm font-bold rounded-md transition-colors duration-200 ease-in-out ${
                                    difficulty === level
                                        ? 'bg-amber-500 text-slate-900 shadow'
                                        : 'text-slate-300 hover:bg-slate-700/50'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
                <textarea
                    value={seedStory}
                    onChange={(e) => setSeedStory(e.target.value)}
                    placeholder="Enter a short plot summary, outline, or a few opening chapters..."
                    className="w-full h-40 p-3 bg-slate-900 text-slate-200 rounded-md border border-slate-600 focus:ring-2 focus:ring-amber-400 focus:outline-none transition"
                    rows={6}
                />
                <textarea
                    value={filterPrompt}
                    onChange={(e) => setFilterPrompt(e.target.value)}
                    className="w-full h-32 p-3 bg-slate-900 text-slate-200 rounded-md border border-slate-600 focus:ring-2 focus:ring-amber-400 focus:outline-none transition"
                    rows={4}
                />
                <button
                    onClick={onSubmit}
                    disabled={isLoading || !seedStory}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating...' : 'Weave the Tale'}
                </button>
                <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                    <div className="flex gap-2">
                        <button onClick={handleSaveClick} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg text-sm transition">Save Progress</button>
                        <button onClick={onLoad} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg text-sm transition">Load Progress</button>
                    </div>
                    {saveMessage && <span className="text-green-400 text-sm animate-pulse">{saveMessage}</span>}
                    <button onClick={handleClearClick} className="bg-red-900/80 hover:bg-red-800 text-red-200 font-bold py-2 px-4 rounded-lg text-sm transition">Clear & Reset</button>
                </div>
            </div>
        </div>
    );
};

const LexiconDisplay: React.FC<{ lexicon: Lexicon }> = ({ lexicon }) => (
    <details className="bg-slate-800/60 p-4 rounded-lg shadow-inner border border-slate-700 open:pb-4 transition-all">
        <summary className="text-xl font-semibold text-amber-300 cursor-pointer">View Generated Lexicon</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            {Object.entries(lexicon).map(([category, items]) => (
                <div key={category} className="bg-slate-900 p-3 rounded">
                    <h4 className="font-bold capitalize text-amber-400">{category.replace(/([A-Z])/g, ' $1')}</h4>
                    <ul className="list-disc list-inside mt-2 text-sm">
                        {Array.isArray(items) && items.map((item: any, index: number) => (
                            <li key={index}><strong>{item.original}</strong> &rarr; {item.indianized}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    </details>
);

const clothingColors = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'];

const App: React.FC = () => {
    const [seedStory, setSeedStory] = useState<string>('');
    const [filterPrompt, setFilterPrompt] = useState<string>(DEFAULT_FILTER_PROMPT);
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const [lexicon, setLexicon] = useState<Lexicon | null>(null);
    const [rewrittenStory, setRewrittenStory] = useState<string | null>(null);
    const [plotOptions, setPlotOptions] = useState<string[] | null>(null);
    const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
    const [images, setImages] = useState<GeneratedImages | null>(null);
    const [videoScript, setVideoScript] = useState<VideoScript | null>(null);
    
    const [hasSavedData, setHasSavedData] = useState<boolean>(false);
    const [characterCustomizationPrompt, setCharacterCustomizationPrompt] = useState<string>('');
    const [isRegeneratingCharacter, setIsRegeneratingCharacter] = useState<boolean>(false);
    