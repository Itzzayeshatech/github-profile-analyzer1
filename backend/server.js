import * as dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch'; // Correct ES Module import
import cors from 'cors';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' })); 

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Calculate Hireability Score ---
function calculateHireabilityScore(profile, repos, langTotals) {
    let score = 0;

    const publicReposCount = repos.length;

    // Followers (max 30)
    score += Math.min(30, Math.floor(profile.followers / 10));

    // Meaningful repos (max 30)
    score += Math.min(30, Math.floor(publicReposCount / 5) * 2);

    // Language diversity (max 40)
    const languageCount = Object.keys(langTotals).length;
    score += Math.min(40, Math.max(0, (languageCount - 1) * 10));

    return Math.min(100, Math.max(0, score));
}

// --- Filter low-value repos ---
function filterLowValueRepos(repos) {
    const minLinesOfCode = 100;

    return repos.filter(repo => {
        if (repo.fork) return false;
        if (repo.size < minLinesOfCode) return false;
        if (repo.description && repo.description.toLowerCase().includes('template')) return false;
        return true;
    });
}

// --- AI Review Mock ---
async function generateAIReview(profile, langTotals, hireabilityScore) {
    const languageList = Object.keys(langTotals).join(', ') || 'No main languages detected.';
    const review = `
        This profile showcases a strong focus on ${languageList.split(',')[0] || 'core technologies'}, 
        backed by a Hireability Score of ${hireabilityScore}/100. 
        The repository filter highlights ${profile.public_repos} public projects, demonstrating consistent activity. 
        This candidate exhibits high potential for roles requiring expertise in ${languageList.split(',')[0]}. 
        (This is a mock AI review.)
    `;
    return review.trim();
}

// --- Analyze GitHub Profile ---
app.get('/api/analyze/:username', async (req, res) => {
    const username = req.params.username;
    const shouldFilter = req.query.filter === 'true';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error: GitHub token missing.' });
    }

    const authHeaders = { Authorization: `token ${GITHUB_TOKEN}` }; // <-- Correct format for GitHub API

    try {
        // 1. Fetch profile
        const r = await fetch(`https://api.github.com/users/${username}`, { headers: authHeaders });
        if (r.status === 404) return res.status(404).json({ error: 'User not found' });
        if (r.status === 401) return res.status(401).json({ error: 'GitHub Token is invalid or expired.' });
        const profile = await r.json();

        // 2. Fetch repositories
        const rep = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: authHeaders });
        const fetchedRepos = await rep.json();

        let finalRepos = Array.isArray(fetchedRepos) ? fetchedRepos : [];
        if (shouldFilter) finalRepos = filterLowValueRepos(finalRepos);

        // 3. Aggregate languages
        const langTotals = {};
        if (Array.isArray(finalRepos)) {
            await Promise.all(finalRepos.map(async (repo) => {
                try {
                    const lg = await fetch(`https://api.github.com/repos/${username}/${repo.name}/languages`, { headers: authHeaders });
                    const langs = await lg.json();
                    for (const [lang, bytes] of Object.entries(langs || {})) {
                        langTotals[lang] = (langTotals[lang] || 0) + bytes;
                    }
                } catch(e) { /* ignore */ }
            }));
        }

        // 4. Calculate hireability
        const hireabilityScore = calculateHireabilityScore(profile, finalRepos, langTotals);

        // 5. Generate AI review
        const aiReview = await generateAIReview(profile, langTotals, hireabilityScore);

        res.json({
            profile,
            repositories: finalRepos,
            languagesByBytes: langTotals,
            hireabilityScore,
            aiReview
        });

    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ error: `Internal Server Error: ${err.message}` });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
