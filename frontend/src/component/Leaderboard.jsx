import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const db = getFirestore(app);

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLeaderboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
    }
  };

  const addTestData = async () => {
    try {
      const testData = {
        playerName: `Player${Math.floor(Math.random() * 100)}`,
        score: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'leaderboard'), testData);
      fetchLeaderboard();
    } catch (error) {
      console.error('Error adding test data:', error);
    }
  };

  const getMedal = (position) => {
    switch (position) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${position + 1}`;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Main container with dark, semi-transparent background */}
      <div className="bg-gray-900/90 rounded-lg shadow-2xl overflow-hidden backdrop-blur">
        {/* Header section */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white tracking-wide">Leaderboard</h2>
            <button
              onClick={addTestData}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Add Test Score
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-300">Loading leaderboard...</div>
        ) : (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left py-3 text-gray-400 font-medium w-24">Rank</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Player</th>
                  <th className="text-right py-3 text-gray-400 font-medium w-32">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((entry, index) => (
                  <tr 
                    key={entry.id}
                    className={`border-b border-gray-800 transition-colors
                      ${index < 3 ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'}`}
                  >
                    <td className="py-4 pl-4">
                      <span className="inline-flex items-center justify-center text-xl">
                        {getMedal(index)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`text-gray-100 ${index < 3 ? 'font-semibold' : ''}`}>
                        {entry.playerName}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className={`inline-block px-3 py-1 rounded-full 
                        ${index < 3 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold' 
                          : 'bg-gray-800 text-gray-300'}`}
                      >
                        {entry.score}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaderboardData.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-gray-400">
                      No scores yet. Be the first to play!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;