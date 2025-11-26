// frontend/src/App.js
// This file contains the complete, self-contained React application.

// Dependency Note: This requires 'html2pdf.js', 'axios', and 'chart.js' to be installed via npm/yarn.
import html2pdf from 'html2pdf.js'; 

import React, { useState } from 'react';
import axios from 'axios';

// CHART IMPORTS 
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register all necessary Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// --- Global Utility Functions for Charts ---
/**
 * Prepares the data structure for the Annual Commit Activity Bar Chart.
 * @param {number[]} annualActivity - Array of commit counts for the last 52 weeks (Mock Data).
 * @returns {object} Chart.js data object.
 */
const getAnnualActivityChartData = (annualActivity) => {
    if (!annualActivity || annualActivity.length === 0) return null;

    // Create labels for 52 weeks
    const labels = Array.from({ length: 52 }, (_, i) => `Week ${52 - i}`);
    labels[0] = 'Current Week';
    labels[51] = 'Year Ago';

    return {
        labels: labels,
        datasets: [
            {
                label: 'Commits/Pushes (Mock Data)',
                data: annualActivity,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };
};

/**
 * Prepares the data structure for the Language Breakdown Doughnut Chart.
 * @param {object} result - The analysis result object containing languagesByBytes.
 * @returns {object} Chart.js data object.
 */
const getLanguageChartData = (result) => {
    if (!result || !result.languagesByBytes || Object.keys(result.languagesByBytes).length === 0) {
        return null;
    }

    const sortedLangs = Object.entries(result.languagesByBytes)
        .sort(([, a], [, b]) => b - a);

    // Limit to top 8 languages for clarity
    const labels = sortedLangs.map(([lang]) => lang).slice(0, 8); 
    const data = sortedLangs.map(([, bytes]) => bytes).slice(0, 8);
    const totalBytes = data.reduce((sum, bytes) => sum + bytes, 0);
    const percentages = data.map(bytes => ((bytes / totalBytes) * 100).toFixed(1) + '%');

    const colors = [
        'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 
        'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)', 
        'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)', 
    ];

    return {
        labels: labels.map((label, index) => `${label} (${percentages[index]})`),
        datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderColor: colors.slice(0, data.length).map(c => c.replace('0.8', '1')),
                borderWidth: 1,
            }],
    };
};
// --- End Global Utility Functions ---


// =========================================================
// 1. ANALYZE PAGE COMPONENTS
// =========================================================

/**
 * Renders the main analysis card with charts and repository list.
 */
function AnalysisCard({ result, showFilteredRepos }) {
    const languageChartData = getLanguageChartData(result);
    const annualActivityChartData = result?.annualActivity ? getAnnualActivityChartData(result.annualActivity) : null;
    
    return (
        <div id="analyzer-results" style={{ marginTop: 20, border: '1px solid #eee', padding: 20, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
            
            {/* HIREABILITY SCORE DISPLAY */}
            {result.hireabilityScore !== undefined && (
                <div style={{ 
                    border: '2px solid #007acc', 
                    padding: '16px', 
                    marginBottom: '20px', 
                    textAlign: 'center',
                    borderRadius: '8px',
                    backgroundColor: '#f4f9ff'
                }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#007acc' }}>Hireability Score</h3>
                    <p style={{ fontSize: '3em', fontWeight: 'bold', margin: 0, color: '#333' }}>
                        {result.hireabilityScore} / 100
                    </p>
                </div>
            )}

            {/* AI Review Feature Display */}
            {result.aiReview && (
                <div style={{ 
                    border: '1px solid #ddd', 
                    padding: '16px', 
                    marginBottom: '20px', 
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>🤖 AI Recruiter Review</h3>
                    <p style={{ margin: 0, lineHeight: '1.4em' }}>
                        {result.aiReview}
                    </p>
                </div>
            )}
            
            {/* PROFILE DETAILS */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 15, marginBottom: 15 }}>
                <img src={result.profile.avatar_url} alt="avatar" width="100" style={{ borderRadius: '50%', border: '3px solid #007acc' }}/>
                <div>
                    <h2>{result.profile.name || result.profile.login}</h2>
                    <p style={{ margin: 0, color: '#555' }}>@{result.profile.login}</p>
                    <p style={{ margin: '5px 0 0 0' }}>
                        Followers: **{result.profile.followers.toLocaleString()}** | 
                        Total Public Repos: **{result.profile.public_repos}**
                    </p>
                </div>
            </div>

            {/* ANNUAL ACTIVITY CHART */}
            {annualActivityChartData && (
                <div style={{ marginBottom: 30 }}>
                    <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5, marginBottom: 15 }}>Annual Commit Activity Trend</h3>
                    <div style={{ height: 250 }}>
                        <Bar 
                            data={annualActivityChartData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { x: { display: false } }
                            }}
                        />
                    </div>
                    <p style={{ fontSize: '0.8em', textAlign: 'center', marginTop: '10px', color: '#777' }}>
                        Weekly contribution frequency over the last year. (Data is currently mocked for demonstration).
                    </p>
                </div>
            )}


            <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>

                {/* LANGUAGES BY BYTES (CHART) */}
                {languageChartData && (
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5, marginBottom: 15 }}>Language Breakdown (by code size)</h3>
                        
                        <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                            <Doughnut data={languageChartData} />
                        </div>
                        <p style={{ fontSize: '0.8em', textAlign: 'center', marginTop: '10px', color: '#777' }}>
                            {showFilteredRepos ? 'Based on curated, high-value repositories.' : 'Based on ALL repositories (unfiltered).'}
                        </p>
                    </div>
                )}
                
                {/* TOP REPOSITORIES (FILTERED LIST) */}
                <div style={{ flex: 2, minWidth: '400px' }}>
                    <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5 }}>
                        Top Repositories ({result.repositories.length} shown)
                    </h3>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {result.repositories.slice(0, 10).map((r) => (
                            <li key={r.id} style={{ marginBottom: 10, padding: 10, borderLeft: '4px solid #3CB371', backgroundColor: '#f9fff9', borderRadius: 4 }}>
                                <a href={r.html_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#007acc', fontWeight: 'bold' }}>{r.name}</a> 
                                <span style={{ float: 'right', color: '#555', fontSize: '0.9em' }}>
                                    ⭐{r.stargazers_count.toLocaleString()} &nbsp; • &nbsp; **{r.language || 'N/A'}**
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

        </div>
    );
}

/**
 * Renders the main Analyzer page view.
 */
function AnalyzerPage({ 
    username, 
    setUsername, 
    result, 
    loading, 
    analyze, 
    handleDownloadPdf,
    showFilteredRepos,
    setShowFilteredRepos,
}) {
    return (
        <div style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 900, margin: '0 auto' }}>
            <h2>Analyze a GitHub Profile</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                    placeholder="Enter GitHub username (e.g., torvalds)..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ padding: 8, flex: 1, border: '1px solid #ccc', borderRadius: 4 }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') analyze();
                    }}
                />
                <button onClick={analyze} disabled={loading} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: 4, transition: 'background-color 0.3s' }}>
                    {loading ? 'Analyzing...' : 'Search'}
                </button>
                {result && (
                    <button 
                        onClick={handleDownloadPdf} 
                        style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#3CB371', color: 'white', border: 'none', borderRadius: 4, transition: 'background-color 0.3s' }}
                    >
                        Download PDF
                    </button>
                )}
            </div>
            
            {/* FILTER TOGGLE */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                    type="checkbox" 
                    id="filter-toggle"
                    checked={showFilteredRepos}
                    onChange={() => setShowFilteredRepos(!showFilteredRepos)}
                    disabled={loading}
                    style={{ transform: 'scale(1.2)' }}
                />
                <label htmlFor="filter-toggle" style={{ fontWeight: 500, color: '#555' }}>
                    Filter Low-Value Repos (Forks, Boilerplate) - **Re-search to apply**
                </label>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading profile data...</div>}

            {result && !result.error && <AnalysisCard result={result} showFilteredRepos={showFilteredRepos} />}
            {result?.error && <div style={{ color: 'red', textAlign: 'center', padding: 20 }}>Error: {result.error}</div>}
        </div>
    );
}


// =========================================================
// 2. COMPARISON PAGE COMPONENTS
// =========================================================

/**
 * Renders a compact card for a single user in the comparison view.
 */
const ComparisonResultCard = ({ title, result, showFilteredRepos }) => {
    if (result === null) {
        return <div style={{ padding: 20, border: '1px solid #eee', borderRadius: 8, backgroundColor: '#f4f4f4', textAlign: 'center' }}>No data for {title}</div>;
    }
    if (result.error) {
        return <div style={{ padding: 20, border: '1px solid #f00', borderRadius: 8, backgroundColor: '#ffe5e5', color: 'red' }}>Error: {result.error}</div>;
    }

    const languageChartData = getLanguageChartData(result);
    const annualActivityChartData = result?.annualActivity ? getAnnualActivityChartData(result.annualActivity) : null;
    
    return (
        <div style={{ flex: 1, padding: 15, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 15 }}>
                <img src={result.profile.avatar_url} alt="avatar" width="60" style={{ borderRadius: '50%', border: '2px solid #007acc' }}/>
                <div>
                    <h3 style={{ margin: 0, color: '#007acc' }}>{result.profile.name || result.profile.login}</h3>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>@{result.profile.login}</p>
                </div>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'center', marginBottom: 15 }}>
                <h4 style={{ margin: 0 }}>Hireability Score</h4>
                <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#3CB371', margin: 0 }}>{result.hireabilityScore} / 100</p>
            </div>
            
            {/* Stats */}
            <p style={{ fontSize: '0.9em', marginBottom: 15 }}>
                **Followers:** {result.profile.followers.toLocaleString()}
                <br />
                **Filtered Repos:** {result.repositories.length}
            </p>

            {/* Language Chart */}
            {languageChartData && (
                <div style={{ marginBottom: 15 }}>
                    <h5 style={{ margin: '0 0 10px 0', borderBottom: '1px dotted #ccc' }}>Top Languages</h5>
                    <div style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}>
                        <Doughnut data={languageChartData} options={{ plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            )}
            
            {/* Activity Chart */}
            {annualActivityChartData && (
                <div>
                    <h5 style={{ margin: '0 0 10px 0', borderBottom: '1px dotted #ccc' }}>Annual Activity</h5>
                    <div style={{ height: 100 }}>
                        <Bar 
                            data={annualActivityChartData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { x: { display: false }, y: { display: false } }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}


/**
 * Renders the Comparison page view.
 */
function ComparisonPage({ 
    compareUsername1, 
    setCompareUsername1, 
    compareResult1, 
    compareUsername2, 
    setCompareUsername2, 
    compareResult2, 
    isComparing, 
    compareProfiles,
    showFilteredRepos
}) {
    return (
        <div style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 900, margin: '0 auto' }}>
            <h2>🧑‍💻 Profile Comparison Tool</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                <input
                    placeholder="User 1 GitHub username..."
                    value={compareUsername1}
                    onChange={(e) => setCompareUsername1(e.target.value)}
                    style={{ padding: 8, flex: 1, border: '1px solid #ccc', borderRadius: 4 }}
                    disabled={isComparing}
                />
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#888' }}>vs.</span>
                <input
                    placeholder="User 2 GitHub username..."
                    value={compareUsername2}
                    onChange={(e) => setCompareUsername2(e.target.value)}
                    style={{ padding: 8, flex: 1, border: '1px solid #ccc', borderRadius: 4 }}
                    disabled={isComparing}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') compareProfiles();
                    }}
                />
                <button 
                    onClick={compareProfiles} 
                    disabled={isComparing || !compareUsername1 || !compareUsername2} 
                    style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: 4, transition: 'background-color 0.3s' }}
                >
                    {isComparing ? 'Comparing...' : 'Compare'}
                </button>
            </div>
            
            <p style={{ fontSize: '0.9em', color: '#777', textAlign: 'center' }}>
                Comparison uses the {showFilteredRepos ? '**Filtered**' : '**Unfiltered**'} repository mode.
            </p>

            {(isComparing) && <div style={{ textAlign: 'center', padding: 20 }}>Fetching and comparing profiles...</div>}
            
            {/* Results Display */}
            {(!isComparing && (compareResult1 || compareResult2)) && (
                <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
                    <ComparisonResultCard title="User 1" result={compareResult1} showFilteredRepos={showFilteredRepos} />
                    <ComparisonResultCard title="User 2" result={compareResult2} showFilteredRepos={showFilteredRepos} />
                </div>
            )}
            
            {/* Initial Placeholder */}
            {(!isComparing && !compareResult1 && !compareResult2) && (
                <div style={{ marginTop: 30, padding: 40, border: '1px dashed #ccc', borderRadius: 8, backgroundColor: '#fafafa', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.1em', color: '#555', margin: 0 }}>
                        Enter two usernames above to start a side-by-side comparison of their scores, language skills, and activity!
                    </p>
                </div>
            )}

        </div>
    );
}


// =========================================================
// 3. STUB PAGES
// =========================================================

const AboutPage = () => (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', maxWidth: 900, margin: '0 auto' }}>
        <h2>About & Methodology</h2>
        <p>This tool analyzes a public GitHub profile using the GitHub API to provide actionable data for recruiting and self-assessment.</p>
        
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 5 }}>Hireability Score Calculation</h3>
        <p>The **score (out of 100)** is a quick metric based on weighted factors:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: 20 }}>
            <li>**Followers:** Contributes to a maximum of 30 points (indicates community recognition).</li>
            <li>**Public Repos:** Contributes to a maximum of 30 points (indicates contribution volume).</li>
            <li>**Language Diversity:** Contributes to a maximum of 40 points (indicates versatility beyond primary language).</li>
        </ul>

        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 5 }}>The Repository Filter</h3>
        <p>By default, we filter out low-value repositories to focus on genuine code contributions:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: 20 }}>
            <li>**Forks:** Ignored, as they are copies of another project.</li>
            <li>**Boilerplate/Small Projects:** Ignored if the repository size is less than 100 lines of code.</li>
            <li>**Template Repos:** Ignored if the description contains keywords like "template."</li>
        </ul>
        <p style={{ fontStyle: 'italic', color: '#888' }}>You can toggle this filter on the Analyze page, which will affect the comparison tool as well.</p>
    </div>
);

const ContactPage = () => (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2>Get in Touch</h2>
        <p style={{ fontSize: '1.1em', color: '#555' }}>
            If you have questions, feedback, or suggestions for new features, we'd love to hear from you.
        </p>
        <div style={{ marginTop: 30 }}>
            <a href="#" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#007acc', color: 'white', textDecoration: 'none', borderRadius: 4 }}>
                Send Feedback (Mock Link)
            </a>
            <p style={{ marginTop: 20, color: '#888' }}>Version 1.3.0 (Comparison Tool Implemented)</p>
        </div>
    </div>
);


// =========================================================
// 4. MAIN APP COMPONENT (Handles Navigation and State)
// =========================================================

function App() {
    // State for the main Analyzer Page
    const [username, setUsername] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // State for the Comparison Page (NEW)
    const [compareUsername1, setCompareUsername1] = useState('');
    const [compareResult1, setCompareResult1] = useState(null);
    const [compareUsername2, setCompareUsername2] = useState('');
    const [compareResult2, setCompareResult2] = useState(null);
    const [isComparing, setIsComparing] = useState(false);

    // Global setting for filtering repos
    const [showFilteredRepos, setShowFilteredRepos] = useState(true); 
    // State for Page Navigation
    const [page, setPage] = useState('analyze'); 

    /**
     * Handles the single-user analysis request.
     */
    const analyze = async () => {
        if (!username) return alert('Enter username');
        setLoading(true);
        setResult(null); 
        try {
            // Note: Connecting to the Node.js backend on localhost:5000
            const res = await axios.get(`http://localhost:5000/api/analyze/${username}?filter=${showFilteredRepos}`); 
            setResult(res.data);
        } catch (err) {
            setResult({ error: err.response?.data?.error || err.message || 'An unknown error occurred.' });
        } finally {
            setLoading(false);
        }
    };
    
    /**
     * Handles the two-user comparison request.
     */
    const compareProfiles = async () => {
        if (!compareUsername1 || !compareUsername2) return alert('Enter both usernames to compare.');
        
        setIsComparing(true);
        setCompareResult1(null);
        setCompareResult2(null);

        // Function to fetch data for a single user
        const fetchUserData = async (name) => {
            try {
                const res = await axios.get(`http://localhost:5000/api/analyze/${name}?filter=${showFilteredRepos}`);
                return res.data;
            } catch (err) {
                return { error: err.response?.data?.error || err.message };
            }
        };

        const [data1, data2] = await Promise.all([
            fetchUserData(compareUsername1),
            fetchUserData(compareUsername2)
        ]);
        
        setCompareResult1(data1);
        setCompareResult2(data2);
        setIsComparing(false);
    };
    
    /**
     * Generates and downloads the analysis results as a PDF using html2pdf.js.
     */
    const handleDownloadPdf = () => {
        const element = document.getElementById('analyzer-results'); 
        
        if (!element) return alert('No analysis results to download.');

        const opt = {
            margin:       0.5,
            filename:     `${username}_GitHub_Analysis.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, logging: true, dpi: 192, letterRendering: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Note: html2pdf() is a global function provided by the imported library.
        html2pdf().from(element).set(opt).save();
    };
    
    /**
     * Renders the correct content page based on the navigation state.
     */
    const renderPage = () => {
        switch (page) {
            case 'analyze':
                return <AnalyzerPage 
                    username={username}
                    setUsername={setUsername}
                    result={result}
                    loading={loading}
                    analyze={analyze}
                    handleDownloadPdf={handleDownloadPdf}
                    showFilteredRepos={showFilteredRepos}
                    setShowFilteredRepos={setShowFilteredRepos}
                />;
            case 'compare':
                return <ComparisonPage 
                    compareUsername1={compareUsername1}
                    setCompareUsername1={setCompareUsername1}
                    compareResult1={compareResult1}
                    compareUsername2={compareUsername2}
                    setCompareUsername2={setCompareUsername2}
                    compareResult2={compareResult2}
                    isComparing={isComparing}
                    compareProfiles={compareProfiles}
                    showFilteredRepos={showFilteredRepos}
                />;
            case 'about':
                return <AboutPage />;
            case 'contact':
                return <ContactPage />;
            default:
                return <AnalyzerPage />;
        }
    };

    /**
     * Styles for the navigation buttons based on current page.
     */
    const navButtonStyle = (targetPage) => ({
        padding: '10px 15px',
        cursor: 'pointer',
        backgroundColor: page === targetPage ? '#007acc' : '#f4f4f4',
        color: page === targetPage ? 'white' : '#333',
        border: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        transition: 'all 0.3s'
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            {/* Navigation Bar */}
            <header style={{ backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '15px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto' }}>
                    <h1 style={{ margin: 0, color: '#007acc', fontSize: '1.8em' }}>📊 GitHub Analyzer</h1>
                    <nav style={{ display: 'flex', gap: 10 }}>
                        <button style={navButtonStyle('analyze')} onClick={() => setPage('analyze')}>Analyze</button>
                        <button style={navButtonStyle('compare')} onClick={() => setPage('compare')}>Compare</button>
                        <button style={navButtonStyle('about')} onClick={() => setPage('about')}>About</button>
                        <button style={navButtonStyle('contact')} onClick={() => setPage('contact')}>Contact</button>
                    </nav>
                </div>
            </header>
            
            {/* Page Content */}
            {renderPage()}

            {/* Footer */}
            <footer style={{ backgroundColor: '#333', color: '#fff', textAlign: 'center', padding: '15px 0', marginTop: 40 }}>
                <p style={{ margin: 0, fontSize: '0.9em' }}>
                    &copy; 2024 GitHub Profile Analyzer. Built with React and Node.js.
                </p>
            </footer>
        </div>
    );
}

export default App;