import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, setLogLevel } from 'firebase/firestore';
import { ArrowLeft, Plus, Users, Calendar, Copy, Check, Trash2, X, Printer, Sun, Star, PartyPopper } from 'lucide-react';

// --- Firebase Configuration ---
// This version is configured for local development with Vite.
// It reads environment variables from your .env.local file.
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;

let firebaseConfig = {};
let configError = null;

if (!firebaseConfigString) {
    configError = "Firebase configuration is missing. Ensure you have a .env.local file with VITE_FIREBASE_CONFIG set, then restart the server.";
} else {
    try {
        firebaseConfig = JSON.parse(firebaseConfigString);
    } catch (e) {
        console.error("Failed to parse Firebase config:", e);
        configError = "Firebase configuration is not valid JSON. Please check the VITE_FIREBASE_CONFIG in your .env.local file.";
    }
}

const appId = import.meta.env.VITE_APP_ID || 'default-summer-camp-planner';


// --- Helper Components (defined outside App to prevent re-renders) ---

const HomeScreen = ({ handleCreateNewPlan, joinPlanIdInput, setJoinPlanIdInput, handleJoinPlan }) => (
    <div className="text-center p-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl max-w-md mx-auto border border-white/50">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">Summer Camp Planner</h2>
        <p className="text-gray-600 mb-8">Coordinate camp schedules with friends.</p>
        <div className="space-y-4">
            <button onClick={handleCreateNewPlan} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-300 flex items-center justify-center space-x-2">
                <Plus size={24} />
                <span>Create a New Plan</span>
            </button>
            <div className="relative flex items-center justify-center my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500 font-medium">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <div className="space-y-3">
                <input
                    type="text"
                    value={joinPlanIdInput}
                    onChange={(e) => setJoinPlanIdInput(e.target.value.toUpperCase())}
                    placeholder="Enter Plan ID to Join"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                />
                <button onClick={handleJoinPlan} className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-gray-400 flex items-center justify-center space-x-2">
                    <Users size={24} />
                    <span>Join Existing Plan</span>
                </button>
            </div>
        </div>
    </div>
);

const SetupScreen = ({ handleGoHome, planId, myKidName, setMyKidName, campNames, setCampNames, weekCount, setWeekCount, handleSaveSetup }) => (
    <div className="p-6 sm:p-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl max-w-2xl mx-auto border border-white/50">
        <button onClick={handleGoHome} className="text-blue-600 hover:text-blue-800 flex items-center mb-6 font-semibold">
            <ArrowLeft size={18} className="mr-1" /> Back to Home
        </button>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Create Your Plan</h2>
        <p className="text-gray-600 mb-6">Enter the details below. Week 1 starts June 22, 2026. Share the Plan ID with other parents: <strong className="text-blue-600 font-mono">{planId}</strong></p>
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Kid's Name</label>
                <input type="text" value={myKidName} onChange={(e) => setMyKidName(e.target.value)} placeholder="e.g., Alex" className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camp Names (comma-separated)</label>
                <input type="text" value={campNames} onChange={(e) => setCampNames(e.target.value)} placeholder="e.g., Art Camp, Soccer Stars, Nature Explorers" className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Weeks</label>
                <input type="number" value={weekCount} onChange={(e) => setWeekCount(e.target.value)} min="1" max="15" className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={handleSaveSetup} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-300 flex items-center justify-center space-x-2 mt-4">
                <Calendar size={24} />
                <span>Create Schedule</span>
            </button>
        </div>
    </div>
);

const ScheduleGrid = ({ planData, handleGoHome, planId, isCopied, handleCopyToClipboard, handleOpenModal, setKidsModalOpen, setCampsModalOpen, setSelectedKidForSummary, setIsPrintView }) => {
    const kidColors = useMemo(() => [
        'bg-blue-200 text-blue-800', 'bg-green-200 text-green-800', 'bg-yellow-200 text-yellow-800',
        'bg-purple-200 text-purple-800', 'bg-pink-200 text-pink-800', 'bg-indigo-200 text-indigo-800',
        'bg-red-200 text-red-800', 'bg-teal-200 text-teal-800'
    ], []);
    
    const getKidColor = (kidName) => {
        const index = planData.allKids.indexOf(kidName);
        return kidColors[index % kidColors.length];
    };

    const renderWeekHeader = (weekIndex) => {
        if (!planData.startDate) return `Week ${weekIndex + 1}`;
        try {
            const parts = planData.startDate.split('-');
            const baseDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            const weekStartDate = new Date(baseDate);
            weekStartDate.setUTCDate(baseDate.getUTCDate() + weekIndex * 7);
            const monthName = weekStartDate.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
            const dateNum = weekStartDate.getUTCDate();
            return (
                <div className="text-center">
                    <div className="font-semibold text-gray-700">Week {weekIndex + 1}</div>
                    <div className="text-xs text-gray-500 font-normal">{monthName} {dateNum}</div>
                </div>
            );
        } catch (e) {
            console.error("Date parsing error:", e);
            return `Week ${weekIndex + 1}`;
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-2xl w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <button onClick={handleGoHome} className="text-blue-600 hover:text-blue-800 flex items-center mb-2 font-semibold">
                        <ArrowLeft size={18} className="mr-1" /> Back to Home
                    </button>
                    <h2 className="text-3xl font-bold text-gray-800">Camp Schedule</h2>
                    <p className="text-gray-500">Click a cell to add or remove kids.</p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg p-3 text-center w-full sm:w-auto">
                    <label className="text-sm font-semibold text-blue-800">Share this Plan ID:</label>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-2xl font-mono font-bold text-blue-600 tracking-widest">{planId}</span>
                        <button onClick={handleCopyToClipboard} className="p-2 rounded-md bg-blue-100 hover:bg-blue-200 transition">
                            {isCopied ? <Check className="text-green-600" size={20} /> : <Copy className="text-blue-700" size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 border-t border-gray-200 pt-4">
                <button onClick={() => setKidsModalOpen(true)} className="bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 transition flex items-center gap-2 shadow-sm"><Users size={16}/>Manage Kids</button>
                <button onClick={() => setCampsModalOpen(true)} className="bg-orange-100 text-orange-700 font-semibold py-2 px-4 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 shadow-sm"><Calendar size={16}/>Manage Camps</button>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg mb-6 border">
                <h3 className="font-bold text-lg text-gray-700 mb-2">Printable Summary</h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select onChange={e => setSelectedKidForSummary(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full sm:w-auto shadow-sm">
                        <option value="">-- Select a Kid --</option>
                        {[...planData.allKids].sort((a, b) => a.localeCompare(b)).map(kid => <option key={kid} value={kid}>{kid}</option>)}
                    </select>
                    <button onClick={() => setIsPrintView(true)} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm">
                        <Printer size={16}/> View Summary
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-gray-100 p-3 text-sm font-semibold text-gray-800 text-left border-b-2 border-gray-300 z-10 rounded-tl-lg">Camp</th>
                            {Array.from({ length: planData.weekCount }, (_, i) => (
                                <th key={i} className="p-3 text-sm border-b-2 border-gray-300">{renderWeekHeader(i)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {planData.camps.map((camp, campIndex) => (
                            <tr key={campIndex} className="even:bg-gray-50/70">
                                <td className="sticky left-0 bg-white even:bg-gray-50/70 p-3 font-bold text-gray-800 border-b border-gray-200 z-10 shadow-sm">{camp}</td>
                                {Array.from({ length: planData.weekCount }, (_, weekIndex) => {
                                    const key = `${campIndex}-${weekIndex}`;
                                    const attendees = planData.schedule[key] || [];
                                    return (
                                        <td key={weekIndex} onClick={() => handleOpenModal(campIndex, weekIndex)} className="p-2 border-b border-gray-200 text-center cursor-pointer hover:bg-blue-100/50 transition min-w-[140px]">
                                            <div className="flex flex-wrap justify-center items-center gap-1 min-h-[48px]">
                                                {attendees.map(kid => <span key={kid} className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${getKidColor(kid)}`}>{kid}</span>)}
                                                {attendees.length === 0 && <Plus size={16} className="text-gray-400" />}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PrintableSummary = ({ planData, selectedKid, setIsPrintView }) => {
    const renderWeekHeader = (weekIndex) => {
        if (!planData.startDate) return `Week ${weekIndex + 1}`;
        try {
            const parts = planData.startDate.split('-');
            const baseDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            const weekStartDate = new Date(baseDate);
            weekStartDate.setUTCDate(baseDate.getUTCDate() + weekIndex * 7);
            const monthName = weekStartDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
            const dateNum = weekStartDate.getUTCDate();
            return `Week of ${monthName} ${dateNum}`;
        } catch (e) {
            return `Week ${weekIndex + 1}`;
        }
    };

    return (
        <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto printable-area">
            <div className="no-print flex justify-between items-center mb-8">
                <button onClick={() => setIsPrintView(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition flex items-center gap-2">
                    <ArrowLeft size={18} /> Back to Grid
                </button>
                <button onClick={() => window.print()} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                    <Printer size={18} /> Print
                </button>
            </div>
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-blue-600 flex items-center justify-center gap-3"><PartyPopper size={40}/>{selectedKid}'s Summer Camp Plan!</h1>
            </div>
            <div className="space-y-6">
                {Array.from({ length: planData.weekCount }, (_, weekIndex) => {
                    let kidCamp = "No camp this week!";
                    let friends = [];
                    for (let campIndex = 0; campIndex < planData.camps.length; campIndex++) {
                        const key = `${campIndex}-${weekIndex}`;
                        const attendees = planData.schedule[key] || [];
                        if (attendees.includes(selectedKid)) {
                            kidCamp = planData.camps[campIndex];
                            friends = attendees.filter(name => name !== selectedKid);
                            break;
                        }
                    }

                    return (
                        <div key={weekIndex} className="p-5 rounded-xl" style={{backgroundColor: weekIndex % 2 === 0 ? '#f0f9ff' : '#fefce8'}}>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><Sun className="text-yellow-500" /> {renderWeekHeader(weekIndex)}</h2>
                            <div className="mt-4 pl-10">
                                <p className="text-xl"><strong className="font-semibold text-gray-700">Camp:</strong> {kidCamp}</p>
                                {friends.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xl flex items-center gap-2"><Star className="text-green-500" /> <strong className="font-semibold text-gray-700">Friends you'll see:</strong></p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {friends.map(friend => <span key={friend} className="bg-green-200 text-green-800 font-medium px-3 py-1 rounded-full">{friend}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EditScheduleModal = ({ modal, planData, handleCloseModal, handleScheduleChange }) => {
    if (!modal.isOpen || !planData) return null;
    const allKids = planData.allKids || [];
    const key = `${modal.campIndex}-${modal.weekIndex}`;
    const currentAttendees = planData.schedule[key] || [];
    const [selectedKids, setSelectedKids] = useState(new Set(currentAttendees));
    const handleCheckboxChange = (kidName) => setSelectedKids(prev => { const newSet = new Set(prev); if (newSet.has(kidName)) newSet.delete(kidName); else newSet.add(kidName); return newSet; });
    const handleSave = () => handleScheduleChange(Array.from(selectedKids));
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100">
                <h3 className="text-xl font-bold mb-1">Edit Attendees</h3>
                <p className="text-gray-600 mb-4">For <span className="font-semibold">{planData.camps[modal.campIndex]}</span>, Week <span className="font-semibold">{modal.weekIndex + 1}</span></p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {allKids.map(kid => (
                        <label key={kid} className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedKids.has(kid)} onChange={() => handleCheckboxChange(kid)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-gray-800 font-medium">{kid}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold">Save</button>
                </div>
            </div>
        </div>
    );
};

const ManagementModal = ({ isOpen, onClose, title, items, onSave, placeholder }) => {
    if (!isOpen) return null;
    const [currentItems, setCurrentItems] = useState([...items].sort((a, b) => a.localeCompare(b)));
    const [newItem, setNewItem] = useState('');
    const handleAddItem = () => { if (newItem.trim() && !currentItems.includes(newItem.trim())) { setCurrentItems([...currentItems, newItem.trim()].sort((a, b) => a.localeCompare(b)));
 setNewItem(''); } };
    const handleRemoveItem = (itemToRemove) => setCurrentItems(currentItems.filter(item => item !== itemToRemove));
    const handleSave = () => { onSave(currentItems); onClose(); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                    {currentItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded-md">
                            <span className="text-gray-800 font-medium">{item}</span>
                            <button onClick={() => handleRemoveItem(item)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mb-6">
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={placeholder} className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm" />
                    <button onClick={handleAddItem} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 font-semibold">Add</button>
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    const [view, setView] = useState('home'); // 'home', 'setup', 'grid'
    const [planId, setPlanId] = useState('');
    const [joinPlanIdInput, setJoinPlanIdInput] = useState('');
    const [planData, setPlanData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(configError || '');
    const [isCopied, setIsCopied] = useState(false);

    // --- View State ---
    const [isPrintView, setIsPrintView] = useState(false);
    const [selectedKidForSummary, setSelectedKidForSummary] = useState('');

    // --- Modal State ---
    const [modal, setModal] = useState({ isOpen: false, campIndex: null, weekIndex: null });
    const [isKidsModalOpen, setKidsModalOpen] = useState(false);
    const [isCampsModalOpen, setCampsModalOpen] = useState(false);

    // --- Form Inputs for Setup ---
    const [myKidName, setMyKidName] = useState('');
    const [campNames, setCampNames] = useState('');
    const [weekCount, setWeekCount] = useState(8);
    const [startDate] = useState('2026-06-22');

    // --- Firebase Initialization ---
    useEffect(() => {
        if (configError) {
            setIsLoading(false);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const auth = getAuth(app);
            setDb(firestoreDb);
            setLogLevel('debug');
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setIsAuthReady(true);
                } else {
                    signInAnonymously(auth).catch(err => {
                        console.error("Sign in failed:", err);
                        setError("Could not sign in to the backend. Please check your Firebase Authentication settings.");
                    });
                }
                setIsLoading(false);
            });
        } catch (e) {
            console.error("Firebase init error:", e);
            setError("Initialization failed.");
            setIsLoading(false);
        }
    }, []);

    // --- Firestore Snapshot Listener ---
    useEffect(() => {
        if (!isAuthReady || !db || !planId || view !== 'grid') {
            if (planData) setPlanData(null); 
            return;
        }
        setIsLoading(true);
        const planDocRef = doc(db, `artifacts/${appId}/public/data/plans`, planId);
        const unsubscribe = onSnapshot(planDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPlanData(data);
                if (!selectedKidForSummary && data.allKids && data.allKids.length > 0) {
                    setSelectedKidForSummary(data.allKids[0]);
                }
                setError('');
            } else {
                setError(`Plan with ID "${planId}" was not found.`);
                setPlanId(''); 
                setView('home'); 
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Snapshot error:", err);
            setError("Failed to listen for updates.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [isAuthReady, db, planId, view, appId]);

    // --- Handlers ---
    const handleCreateNewPlan = () => {
        setPlanId(Math.random().toString(36).substring(2, 9).toUpperCase());
        setView('setup');
        setIsLoading(false);
    };

    const handleJoinPlan = async () => {
        const trimmedId = joinPlanIdInput.trim();
        if (!trimmedId) { setError("Please enter a Plan ID."); return; }
        setIsLoading(true);
        setError('');
        const planDocRef = doc(db, `artifacts/${appId}/public/data/plans`, trimmedId);
        try {
            const docSnap = await getDoc(planDocRef);
            if (docSnap.exists()) {
                setPlanData(docSnap.data());
                setPlanId(trimmedId);
                setView('grid');
            } else {
                setError(`Plan with ID "${trimmedId}" not found.`);
            }
        } catch(e) {
            console.error("Error joining plan:", e);
            setError("An error occurred while joining the plan.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSetup = async () => {
        if (!myKidName || !campNames || !weekCount) { setError("Please fill out all fields."); return; }
        setIsLoading(true);
        const newPlanData = {
            allKids: [myKidName.trim()],
            camps: campNames.split(',').map(c => c.trim()).filter(Boolean),
            weekCount: parseInt(weekCount, 10),
            startDate: startDate,
            schedule: {},
        };
        try {
            await setDoc(doc(db, `artifacts/${appId}/public/data/plans`, planId), newPlanData);
            setPlanData(newPlanData);
            setView('grid');
        } catch (e) {
            console.error("Error saving setup:", e);
            setError("Could not save the new plan.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUpdateList = async (listName, newList) => {
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/plans`, planId), { [listName]: newList });
        } catch (e) {
            console.error(`Error updating ${listName}:`, e);
            setError(`Failed to save changes to ${listName}.`);
        }
    };

    const handleOpenModal = (campIndex, weekIndex) => setModal({ isOpen: true, campIndex, weekIndex });
    const handleCloseModal = () => setModal({ isOpen: false, campIndex: null, weekIndex: null });

    const handleScheduleChange = async (updatedAttendees) => {
        if (!planData || modal.campIndex === null || modal.weekIndex === null) return;
        const key = `${modal.campIndex}-${modal.weekIndex}`;
        const newSchedule = { ...planData.schedule, [key]: updatedAttendees };
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/plans`, planId), { schedule: newSchedule });
            handleCloseModal();
        } catch (e) {
            console.error("Error updating schedule:", e);
            setError("Failed to save your changes.");
        }
    };
    
    const handleCopyToClipboard = () => {
        const tempInput = document.createElement('input');
        tempInput.value = planId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleGoHome = () => {
        setView('home');
        setPlanId('');
        setPlanData(null);
        setError('');
        setJoinPlanIdInput('');
        setIsPrintView(false);
    };

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        if (error) return <div className="p-4 sm:p-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl max-w-2xl mx-auto border border-white text-center"><h3 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h3><p className="text-red-800 bg-red-100 p-3 rounded-md">{error}</p></div>;
        if (view === 'grid' && isPrintView) {
            if (!selectedKidForSummary) {
                setIsPrintView(false);
                return null;
            }
            return <PrintableSummary planData={planData} selectedKid={selectedKidForSummary} setIsPrintView={setIsPrintView} />;
        }

        switch (view) {
            case 'setup': return <SetupScreen {...{ handleGoHome, planId, myKidName, setMyKidName, campNames, setCampNames, weekCount, setWeekCount, handleSaveSetup }} />;
            case 'grid': return planData ? <ScheduleGrid {...{ planData, handleGoHome, planId, isCopied, handleCopyToClipboard, handleOpenModal, setKidsModalOpen, setCampsModalOpen, setSelectedKidForSummary, setIsPrintView }} /> : null;
            default: return <HomeScreen {...{ handleCreateNewPlan, joinPlanIdInput, setJoinPlanIdInput, handleJoinPlan }} />;
        }
    };

    return (
        <>
            <style>{`
                @media print {
                    body, html {
                      margin: 0;
                      padding: 0;
                      background: white;
                    }

                    .printable-area {
                      width: 100%;
                      max-width: 7.5in;
                      padding: 0.5in;
                      margin: 0 auto;
                      box-shadow: none;
                      background: white;
                      page-break-inside: avoid;
                    }

                    .printable-area > * {
                      page-break-inside: avoid;
                      break-inside: avoid;
                    }

                    .no-print {
                      display: none !important;
                    }

                    @page {
                      size: 8.5in 11in;
                      margin: 0.5in;
                    }
              }
            `}</style>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen font-sans text-gray-900 flex items-center justify-center p-4">
                <div className="w-full">
                    {renderContent()}
                    {view === 'grid' && planData && !isPrintView && (
                        <>
                            <EditScheduleModal {...{ modal, planData, handleCloseModal, handleScheduleChange }} />
                            <ManagementModal isOpen={isKidsModalOpen} onClose={() => setKidsModalOpen(false)} title="Manage Kids" items={planData.allKids || []} onSave={(newList) => handleUpdateList('allKids', newList)} placeholder="Add new kid's name" />
                            <ManagementModal isOpen={isCampsModalOpen} onClose={() => setCampsModalOpen(false)} title="Manage Camps" items={planData.camps || []} onSave={(newList) => handleUpdateList('camps', newList)} placeholder="Add new camp name" />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
