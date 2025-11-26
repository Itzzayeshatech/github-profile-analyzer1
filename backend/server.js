import * as dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch'; // Correct ES Module import for node-fetch
import cors from 'cors'; 
import OpenAI from 'openai';

// Load environment variables immediately
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); 

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

const openai = new OpenAI({ 
    apiKey: OPENAI_API_KEY
});

// ... calculateHireabilityScore function (no changes) ...
function calculateHireabilityScore(profile, repos, langTotals) {
    let score = 0;
    
    const publicReposCount = repos.length; 

    // Score based on followers (up to 30)
    score += Math.min(30, Math.floor(profile.followers / 10));
    
    // Score based on meaningful repo count (up to 30)
    score += Math.min(30, Math.floor(publicReposCount / 5) * 2);

    // Score based on language diversity (up to 40)
    const languageCount = Object.keys(langTotals).length;
    score += Math.min(40, Math.max(0, (languageCount - 1) * 10));

    return Math.min(100, Math.max(0, score));
}

// ... filterLowValueRepos function (no changes) ...
function filterLowValueRepos(repos) {
    const minLinesOfCode = 100; 

    return repos.filter(repo => {
        // Exclude forks
        if (repo.fork) {
            return false;
        }
        // Exclude tiny repositories (less than 100 lines of code)
        if (repo.size < minLinesOfCode) {
             return false;
        }
        // Exclude repositories explicitly marked as templates
        if (repo.description && repo.description.toLowerCase().includes('template')) {
             return false;
        }
        return true;
    });
}

// AI Review Feature Logic (MOCK DATA FOR DEMO)
async function generateAIReview(profile, langTotals, hireabilityScore) {
    // --- MOCK DATA IMPLEMENTATION FOR DEMO ---
    const languageList = Object.keys(langTotals).join(', ') || 'No main languages detected.';
    
    // This is a placeholder response
    const review = `
        This profile showcases a strong focus on ${languageList.split(',')[0] || 'core technologies'}, backed by a Hireability Score of ${hireabilityScore}/100. The repository filter highlights ${profile.public_repos} public projects, demonstrating consistent activity. This candidate exhibits high potential for roles requiring deep expertise in ${languageList.split(',')[0]}. (This is a mock AI review to demonstrate UI functionality.)
    `;
    return review.trim();
}


app.get('/api/analyze/:username', async (req, res) => {
    const username = req.params.username;
    // Read the filter parameter from the frontend.
    const shouldFilter = req.query.filter === 'true'; 

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error: GitHub token missing.' });
    }
    
    const authHeaders = { Authorization: `Bearer ${GITHUB_TOKEN}` };

    try {
        // 1. Fetch Profile
        const r = await fetch(`https://api.github.com/users/${username}`, { headers: authHeaders });
        if (r.status === 404) return res.status(404).json({ error: 'User not found' });
        if (r.status === 401) return res.status(401).json({ error: 'GitHub Token is invalid or expired.' });
        const profile = await r.json();

        // 2. Fetch Repositories
        const rep = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: authHeaders });
        const fetchedRepos = await rep.json(); 

        // 3. Conditional Filtering: Only run filter if shouldFilter is true
        let finalRepos = Array.isArray(fetchedRepos) ? fetchedRepos : [];
        if (shouldFilter) {
             finalRepos = filterLowValueRepos(finalRepos);
        }
        
        // 4. Aggregate Languages (on finalRepos, filtered or not)
        const langTotals = {};
        if (Array.isArray(finalRepos)) {
            await Promise.all(finalRepos.map(async (repo) => {
                try {
                    const lg = await fetch(`https://api.github.com/repos/${username}/${repo.name}/languages`, { headers: authHeaders });
                    const langs = await lg.json();
                    
                    for (const [lang, bytes] of Object.entries(langs || {})) {
                        langTotals[lang] = (langTotals[lang] || 0) + bytes;
                    }
                } catch(e) { /* ignore single repo language failure */ }
            }));
        }

        // 5. Calculate Hireability Score (on final data)
        const hireabilityScore = calculateHireabilityScore(profile, finalRepos, langTotals);

        // 6. Generate AI Review (MOCK)
        const aiReview = await generateAIReview(profile, langTotals, hireabilityScore);
        
        // 7. Send Response
        res.json({ 
            profile, 
            repositories: finalRepos, // SEND THE FINAL (FILTERED OR UNFILTERED) LIST
            languagesByBytes: langTotals,
            hireabilityScore: hireabilityScore,
            aiReview: aiReview 
        });

    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ error: `Internal Server Error: ${err.message}` });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));